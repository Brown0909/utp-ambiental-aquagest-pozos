// Spec 004 · T3 — rutas, lista blanca, permisos del rol, límites y flujo completo por HTTP (RF-86, 87, 89, 93, 97).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { arrancar, carpetaTemporal, fechaLocal, CORREOS } from './servidor-helpers.js';
import { archivo } from './helpers.js';
import { LABORATORIOS, CONDICION_OK } from '../docs/app/js/core/seed.js';

const OBS = 'Revisado: trazabilidad completa y forma de nitrato documentada.';
const punto = (extra = {}) => ({ tipo: 'Pozo', nombre: 'Pozo La Esperanza', comunidad: 'Cerro Punta', profundidad: '12', lat: '8.858', lng: '-82.573', ...extra });

test('RF-89 🔴 un Técnico que manda confirmarRevision por la API recibe {ok:false, sinPermiso:true} y nada cambia', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    await c.entrar('tecnico');
    const antes = (await c.estado()).datos.muestras.find((m) => m.folio === 'AG-2026-080');
    assert.equal(antes.revision, null, 'la muestra del ejemplo está pendiente de revisión');
    const r = await c.accion('confirmarRevision', 'AG-2026-080', { observaciones: OBS });
    assert.equal(r.ok, false);
    assert.equal(r.sinPermiso, true);
    assert.equal((await c.estado()).datos.muestras.find((m) => m.folio === 'AG-2026-080').revision, null, 'sigue sin confirmar');
    // y el Administrador, sí puede (la prueba no es vacía)
    const admin = s.cliente();
    await admin.entrar('admin');
    assert.equal((await admin.accion('confirmarRevision', 'AG-2026-080', { observaciones: OBS })).ok, true);
  } finally { await s.cerrar(); }
});

test('RF-89 cada rol solo hace lo de la matriz: se vuelve a comprobar en el servidor aunque la pantalla lo oculte', async () => {
  const s = await arrancar();
  try {
    const lab = s.cliente();
    await lab.entrar('laboratorio');
    assert.equal((await lab.accion('crearPunto', punto())).sinPermiso, true, 'Laboratorio no registra puntos');
    assert.equal((await lab.accion('invitarUsuario', { nombre: 'X Y Zeta', correo: 'x.y@miambiente.gob.pa', rol: 'Técnico', estado: 'Activo' })).sinPermiso, true);
    assert.equal((await lab.accion('cambiarRol', 'U1', 'Administrador')).sinPermiso, true, 'nadie se hace administrador solo');
    const tec = s.cliente();
    await tec.entrar('tecnico');
    assert.equal((await tec.accion('guardarResultados', 'AG-2026-007', { fechaAnalisis: '2026-10-02' })).sinPermiso, true, 'Técnico no carga resultados');
    assert.equal((await tec.accion('resolverSolicitud', 'S1', { decision: 'aprobar', rol: 'Administrador' })).sinPermiso, true);
    const permitida = await tec.accion('importarHistorico', 'PZ-018', 'periodo\n');
    assert.equal(permitida.sinPermiso, undefined, 'el Técnico sí puede registrar: la acción llega a las reglas (y estas rechazan el CSV por otra razón)');
    assert.equal(permitida.ok, false);
  } finally { await s.cerrar(); }
});

test('RF-97 una acción fuera de la lista blanca da 400 (también los nombres del prototipo de los objetos)', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    await c.entrar('admin');
    for (const accion of ['logout', 'login', 'reiniciar', 'exigir', 'enviarCorreo', 'constructor', '__proto__', 'toString', 'hasOwnProperty', 'estadoToken', '']) {
      const r = await c.post('/api/accion', { accion, args: [] });
      assert.equal(r.status, 400, `«${accion}» debe rechazarse`);
    }
    assert.equal((await c.post('/api/accion', { accion: 'crearPunto', args: 'no-es-lista' })).status, 400);
    assert.equal((await c.post('/api/accion', { accion: 'crearPunto', args: [] })).status, 400, 'argumentos de menos');
    assert.equal((await c.post('/api/accion', { accion: 'crearPunto', args: [null] })).status, 400, 'null en lugar de objeto');
    assert.equal((await c.post('/api/accion', { accion: 'cambiarRol', args: ['U1', { rol: 'x' }] })).status, 400, 'objeto en lugar de texto');
    assert.equal((await c.post('/api/accion', { args: [] })).status, 400);
    assert.equal((await c.post('/api/login', { correo: 5, password: 'x' })).status, 400);
  } finally { await s.cerrar(); }
});

test('RF-97 🔴 un cuerpo de 2 MB da 413; uno de 1 MB llega a las reglas; el servidor sigue vivo', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    await c.entrar('admin');
    const grande = await c.post('/api/accion', { accion: 'solicitarRecuperacion', args: ['a'.repeat(2 * 1024 * 1024)] });
    assert.equal(grande.status, 413);
    assert.equal(grande.json.ok, false);
    const mediano = await c.post('/api/accion', { accion: 'solicitarRecuperacion', args: ['a'.repeat(1024 * 1024)] });
    assert.equal(mediano.status, 200, 'bajo 1,5 MB el transporte lo acepta (no es 413)');
    assert.equal(mediano.json.resultado.ok, false, 'y las reglas rechazan ese «correo» por su contenido');
    assert.equal((await c.get('/api/salud')).status, 200);
  } finally { await s.cerrar(); }
});

test('RF-97 🔴 un Origin ajeno da 403 (también en GET); el propio origen y la ausencia de Origin pasan', async () => {
  const s = await arrancar();
  try {
    const ajeno = s.cliente({ origen: 'http://sitio-malo.example' });
    const post = await ajeno.post('/api/login', { correo: CORREOS.tecnico, password: 'Aqua2026!' });
    assert.equal(post.status, 403);
    assert.equal(ajeno.galleta.size, 0, 'no se crea sesión');
    assert.equal((await ajeno.get('/api/estado')).status, 403);
    assert.equal((await s.cliente({ origen: 'null' }).get('/api/estado')).status, 403);
    assert.equal(s.base.db.prepare('SELECT COUNT(*) AS n FROM sesiones').get().n, 0);
    const propio = s.cliente({ origen: s.url });
    assert.equal((await propio.login(CORREOS.tecnico)).status, 200);
    assert.equal((await s.cliente().login(CORREOS.laboratorio)).status, 200);
  } finally { await s.cerrar(); }
});

test('RF-97 solo se acepta JSON: otro tipo de contenido o un cuerpo roto da 400', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    assert.equal((await c.post('/api/login', 'correo=a&password=b', { 'Content-Type': 'application/x-www-form-urlencoded' })).status, 400);
    assert.equal((await c.post('/api/login', 'texto plano', { 'Content-Type': 'text/plain' })).status, 400);
    assert.equal((await c.post('/api/login', '{no es json')).status, 400);
    assert.equal((await c.post('/api/login', '[1,2]')).status, 400);
    assert.equal((await c.post('/api/login', 'null')).status, 400);
    // 🔴 el truco de un formulario de otro sitio: un JSON VÁLIDO pero declarado como texto plano o como formulario
    const valido = JSON.stringify({ correo: CORREOS.tecnico, password: 'Aqua2026!' });
    for (const tipo of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']) {
      assert.equal((await c.post('/api/login', valido, { 'Content-Type': tipo })).status, 400, tipo);
    }
    assert.equal((await c.post('/api/login', valido, { 'Content-Type': 'text/plain' })).status, 400);
    assert.equal(c.galleta.size, 0, 'no se creó sesión');
    assert.equal(s.base.db.prepare('SELECT COUNT(*) AS n FROM sesiones').get().n, 0);
    assert.equal((await c.post('/api/login', valido, { 'Content-Type': 'application/json; charset=utf-8' })).status, 200, 'JSON con charset sí');
  } finally { await s.cerrar(); }
});

test('RF-87 🔴 sin sesión no se ve ningún dato ni se ejecuta una acción privada; una cookie inventada tampoco vale', async () => {
  const s = await arrancar();
  try {
    const anonimo = s.cliente();
    const est = await anonimo.estado();
    assert.equal(est.usuario, null);
    for (const k of ['usuarios', 'puntos', 'muestras', 'solicitudes', 'correos', 'historico']) assert.deepEqual(est.datos[k], [], k);
    const r = await anonimo.post('/api/accion', { accion: 'crearPunto', args: [punto()] });
    assert.equal(r.status, 401);
    assert.equal(r.json.ok, false);
    assert.equal(s.almacen.store.data.puntos.length, 7, 'no se creó nada');
    const falso = s.cliente();
    falso.galleta.set('aquagest_sesion', 'x'.repeat(43));
    assert.equal((await falso.estado()).usuario, null);
    assert.equal((await falso.post('/api/accion', { accion: 'crearPunto', args: [punto()] })).status, 401);
    // solo las 3 públicas funcionan sin sesión
    assert.equal((await anonimo.post('/api/accion', { accion: 'solicitarRecuperacion', args: ['quien.sea@miambiente.gob.pa'] })).status, 200);
    const sol = await anonimo.accion('solicitarCuenta', { nombre: 'Pedro', apellido: 'Pérez', correo: 'pedro.perez@miambiente.gob.pa', unidad: 'Calidad Ambiental', provincia: 'Chiriquí', cargo: 'Técnico de campo' });
    assert.equal(sol.ok, true);
    assert.equal((await anonimo.post('/api/accion', { accion: 'resolverSolicitud', args: [sol.datos.id, { decision: 'aprobar', rol: 'Administrador' }] })).status, 401, 'aprobar exige sesión');
  } finally { await s.cerrar(); }
});

test('RF-87 los datos que ve cada rol: solicitudes y correos solo para quien administra usuarios', async () => {
  const s = await arrancar();
  try {
    await s.cliente().accion('solicitarRecuperacion', CORREOS.tecnico);
    const tec = s.cliente();
    await tec.entrar('tecnico');
    const e1 = await tec.estado();
    assert.deepEqual(e1.datos.correos, [], 'un Técnico no lee los correos (traen enlaces de recuperación de otros)');
    assert.deepEqual(e1.datos.solicitudes, []);
    const admin = s.cliente();
    await admin.entrar('admin');
    assert.equal((await admin.estado()).datos.correos.length, 1);
  } finally { await s.cerrar(); }
});

test('M-18 🔴 dos usuarios distintos, en sesiones distintas y a la vez, no se mezclan (cada acción se hace con SU rol)', async () => {
  const s = await arrancar();
  try {
    const tec = s.cliente();
    const adm = s.cliente();
    const lab = s.cliente();
    await Promise.all([tec.entrar('tecnico'), adm.entrar('admin'), lab.entrar('laboratorio')]);
    const hoy = fechaLocal(s.reloj() - 3 * 3600000);
    const muestra = (tecnicoId) => ({ puntoId: 'PZ-018', ...hoy, tecnicoId, tipoAgua: 'Subterránea/Pozo', objetivo: 'Solo monitoreo', clasificacion: 'referencia', referenciaFolio: '', solicitados: ['nitrato'] });
    const resultados = await Promise.all(Array.from({ length: 12 }, (_, i) => [
      tec.accion('crearMuestra', muestra('U1')),
      adm.accion('crearMuestra', muestra('U3')),
      lab.accion('crearMuestra', muestra('U1')),
      i % 3 === 0 ? tec.accion('confirmarRevision', 'AG-2026-080', { observaciones: OBS }) : adm.estado(),
    ]).flat());
    const creadas = resultados.filter((r) => r?.datos?.folio);
    assert.equal(creadas.filter((r) => r.datos.creadaPorId === 'U1').length, 12, 'las 12 del Técnico llevan su ID');
    assert.equal(creadas.filter((r) => r.datos.creadaPorId === 'U3').length, 12, 'las 12 del Administrador llevan el suyo');
    assert.equal(creadas.length, 24, 'las de Laboratorio fueron rechazadas');
    assert.ok(resultados.filter((r) => r?.sinPermiso).length >= 12 + 4, 'Laboratorio y las revisiones del Técnico, sin permiso');
    const folios = creadas.map((r) => r.datos.folio);
    assert.equal(new Set(folios).size, folios.length, '🔴 RF-93: ningún folio repetido aunque lleguen a la vez');
    assert.equal(s.almacen.store.data.sesion.userId, null, 'el almacén no se queda con el usuario de nadie');
  } finally { await s.cerrar(); }
});

test('RF-86 🔴 flujo completo por HTTP (pozo → muestra → envío → recepción → resultados → conversión → revisión) y sobrevive al reinicio', async () => {
  const tmp = carpetaTemporal();
  try {
    const s = await arrancar({ ruta: tmp.ruta });
    const tec = s.cliente();
    const lab = s.cliente();
    const adm = s.cliente();
    await Promise.all([tec.entrar('tecnico'), lab.entrar('laboratorio'), adm.entrar('admin')]);

    const p = await tec.accion('crearPunto', punto());
    assert.equal(p.ok, true, JSON.stringify(p));
    assert.match(p.datos.id, /^PZ-\d{3}$/);

    const t0 = s.reloj();
    const m = await tec.accion('crearMuestra', { puntoId: p.datos.id, ...fechaLocal(t0 - 120 * 60000), tecnicoId: 'U1', tipoAgua: 'Subterránea/Pozo', objetivo: 'Consumo humano', clasificacion: 'referencia', referenciaFolio: '', solicitados: ['nitrato', 'conductividad', 'coliformes_totales', 'e_coli'], ph: '7,2' });
    assert.equal(m.ok, true, JSON.stringify(m));
    const folio = m.datos.folio;
    assert.match(folio, /^AG-\d{4}-\d{3}$/);

    const env = await tec.accion('registrarEnvio', folio, { ...fechaLocal(t0 - 90 * 60000), destino: LABORATORIOS[0] });
    assert.equal(env.ok, true, JSON.stringify(env));
    assert.equal((await lab.accion('confirmarRecepcion', folio, { responsableId: 'U2', ...fechaLocal(t0 - 60 * 60000), condicion: CONDICION_OK, incidencias: '' })).ok, true);

    const hoy = fechaLocal(t0).fecha;
    const cert = { ...archivo.pdf(), url: 'javascript:alert(1)' };
    const res = await lab.accion('guardarResultados', folio, { nitrato: '50', nitratoForma: 'NO3', conductividad: '420', coliformes_totales: '0', e_coli: '0', fechaAnalisis: hoy, laboratorio: LABORATORIOS[0], certificado: cert });
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.datos.resultados.certificado.nombre, 'certificado.pdf');
    assert.equal(res.datos.resultados.certificado.url, null, '🔴 el servidor no acepta una URL mandada por el navegador');

    const bloqueada = await adm.accion('confirmarRevision', folio, { observaciones: OBS });
    assert.equal(bloqueada.ok, false, 'sin conversión documentada no se confirma (RF-57)');
    assert.equal(bloqueada.bloqueada, true);
    assert.equal((await adm.accion('documentarConversion', folio, { nota: 'Factor 4,43 (62/14) según criterio del analista.' })).ok, true);
    const rev = await adm.accion('confirmarRevision', folio, { observaciones: OBS });
    assert.equal(rev.ok, true, JSON.stringify(rev));
    assert.equal(rev.datos.revision.dictamen, 'No cumple');
    assert.equal(rev.datos.revision.analistaId, 'U3');
    await s.cerrar();

    // se apaga y se enciende sobre la MISMA base: todo sigue
    const s2 = await arrancar({ ruta: tmp.ruta });
    const adm2 = s2.cliente();
    await adm2.entrar('admin');
    const est = await adm2.estado();
    const guardada = est.datos.muestras.find((x) => x.folio === folio);
    assert.ok(guardada, 'la muestra sigue');
    assert.equal(guardada.revision.dictamen, 'No cumple');
    assert.equal(guardada.conversion.documentada, true);
    assert.equal(guardada.resultados.certificado.url, null);
    assert.ok(est.datos.puntos.some((x) => x.id === p.datos.id));
    const filaMuestra = s2.base.db.prepare('SELECT etapa, punto_id FROM muestras WHERE folio = ?').get(folio);
    assert.deepEqual({ ...filaMuestra }, { etapa: 'Revisión confirmada', punto_id: p.datos.id });
    // y el siguiente folio no repite
    const otra = await adm2.accion('crearMuestra', { puntoId: p.datos.id, ...fechaLocal(s2.reloj() - 30 * 60000), tecnicoId: 'U3', tipoAgua: 'Subterránea/Pozo', objetivo: 'Solo monitoreo', clasificacion: 'seguimiento', referenciaFolio: folio, solicitados: ['nitrato'] });
    assert.equal(otra.ok, true, JSON.stringify(otra));
    assert.notEqual(otra.datos.folio, folio);
    await s2.cerrar();
  } finally { await tmp.limpiar(); }
});

test('RF-96 el histórico: importar un CSV lo guarda y el límite de 1 MB también lo comprueba el servidor', async () => {
  const tmp = carpetaTemporal();
  try {
    const s = await arrancar({ ruta: tmp.ruta });
    const c = s.cliente();
    await c.entrar('tecnico');
    const csv = 'periodo,nitrato,forma_nitrato,fuente\n2020-01,3.5,NO3-N,Informe de laboratorio 2020\n2020-02,3.9,NO3-N,Informe de laboratorio 2020\n';
    const r = await c.accion('importarHistorico', 'PZ-018', csv);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.datos.importadas, 2);
    const repetido = await c.accion('importarHistorico', 'PZ-018', csv);
    assert.equal(repetido.ok, false, 'el mismo mes no se importa dos veces');
    const grande = await c.accion('importarHistorico', 'PZ-018', `periodo,nitrato,fuente\n${'x'.repeat(1048577)}`);
    assert.equal(grande.ok, false);
    assert.match(grande.errores._form, /1 MB/);
    await s.cerrar();
    const s2 = await arrancar({ ruta: tmp.ruta });
    const c2 = s2.cliente();
    await c2.entrar('tecnico');
    const h = (await c2.estado()).datos.historico.filter((x) => x.puntoId === 'PZ-018' && x.origen === 'importado');
    assert.equal(h.length, 2, 'lo importado sigue después de reiniciar');
    await s2.cerrar();
  } finally { await tmp.limpiar(); }
});

test('RF-97 un error interno da 500 SIN detalles y la memoria vuelve a lo guardado (nada a medias)', async () => {
  const s = await arrancar();
  const original = console.error;
  console.error = () => {};   // el detalle va a la consola del servidor; aquí no ensucia la salida
  try {
    const c = s.cliente();
    await c.entrar('tecnico');
    s.almacen.store.crearPunto = function falla() { this.data.puntos.push({ id: 'PZ-FALSO', tipo: 'Pozo', nombre: 'a medias' }); throw new Error('detalle-secreto-interno'); };
    const r = await c.post('/api/accion', { accion: 'crearPunto', args: [punto()] });
    assert.equal(r.status, 500);
    assert.ok(!r.texto.includes('detalle-secreto-interno'), 'el navegador no recibe el detalle');
    assert.ok(!r.texto.includes('at '), 'ni la traza');
    const est = await c.estado();
    assert.ok(!est.datos.puntos.some((x) => x.id === 'PZ-FALSO'), 'lo que quedó a medias se descartó');
  } finally { console.error = original; await s.cerrar(); }
});

test('RF-84 el servidor sirve la app en /app/ y NO sirve nada de fuera de docs/ (ni server/, ni data/, ni con ../)', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    const app = await c.get('/app/');
    assert.equal(app.status, 200);
    assert.match(app.headers.get('content-type'), /text\/html/);
    assert.match(app.texto, /id="app"/);
    assert.equal(app.headers.get('x-content-type-options'), 'nosniff');
    assert.match((await c.get('/app/js/main.js')).headers.get('content-type'), /javascript/);
    assert.equal((await c.get('/app')).status, 200, '/app redirige a /app/');
    for (const ruta of ['/server/db.js', '/server/index.js', '/data/aquagest.db', '/package.json', '/spec/004-backend-base-de-datos/spec.md', '/.git/config', '/app/../../server/db.js', '/app/%2e%2e/%2e%2e/server/db.js', '/..%2fserver%2fdb.js', '/app/js/%00']) {
      const r = await c.get(ruta);
      assert.ok([400, 404].includes(r.status), `${ruta} → ${r.status}`);
      assert.ok(!r.texto.includes('class Base'), `${ruta} no debe mostrar código del servidor`);
    }
    // sin normalizar: se manda la ruta tal cual, con ../ de verdad
    const cruda = await new Promise((ok, mal) => {
      const req = http.request({ host: '127.0.0.1', port: new URL(s.url).port, path: '/../server/db.js', method: 'GET' }, (res) => { let t = ''; res.on('data', (d) => { t += d; }); res.on('end', () => ok({ status: res.statusCode, t })); });
      req.on('error', mal);
      req.end();
    });
    assert.equal(cruda.status, 404);
    assert.ok(!cruda.t.includes('class Base'));
    assert.equal((await c.post('/app/', {})).status, 405, 'los archivos estáticos solo se leen');
  } finally { await s.cerrar(); }
});

test('RF-87 una persona desactivada pierde la sesión de inmediato y su rol no se puede cambiar a mano', async () => {
  const s = await arrancar();
  try {
    const tec = s.cliente();
    await tec.entrar('tecnico');
    const adm = s.cliente();
    await adm.entrar('admin');
    assert.equal((await adm.accion('cambiarEstado', 'U1', 'Inactivo')).ok, true);
    assert.equal((await tec.estado()).usuario, null, 'la sesión del Técnico dejó de valer');
    assert.equal((await tec.post('/api/accion', { accion: 'crearPunto', args: [punto()] })).status, 401);
    assert.equal((await s.cliente().login(CORREOS.tecnico)).json.ok, false, 'tampoco puede entrar de nuevo');
    const eventos = s.base.db.prepare("SELECT evento FROM accesos WHERE cuenta_id = 'U1'").all().map((f) => f.evento);
    assert.ok(eventos.includes('cuenta_inactiva'));
  } finally { await s.cerrar(); }
});
