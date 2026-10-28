// Spec 004 · T5 — la lógica del navegador (docs/app/js/ui/api.js) probada SIN navegador: corre en Node contra el servidor real.
// Lo que necesita un navegador de verdad (dibujar pantallas, CSP, foco, ver la app en el celular) NO se prueba aquí: eso
// lo hace el grupo con docs/GUIA-PRUEBA-EN-PAREJA.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arrancar, crearReloj, fechaLocal, CORREOS, CLAVE_DEMO } from './servidor-helpers.js';
import { archivo } from './helpers.js';
import { crearAlmacen, AlmacenRemoto, ACCIONES_REMOTAS } from '../docs/app/js/ui/api.js';
import { Store } from '../docs/app/js/core/store.js';
import { ACCIONES } from '../server/almacen.js';

/** `fetch` con su propia cookie jar: hace de «navegador» para AlmacenRemoto. */
function fetchConGalleta(espia = []) {
  const galleta = new Map();
  const f = async (url, init = {}) => {
    const headers = { ...(init.headers ?? {}), ...(galleta.size ? { Cookie: [...galleta].map(([k, v]) => `${k}=${v}`).join('; ') } : {}) };
    espia.push({ url: String(url), metodo: init.method ?? 'GET', cuerpo: init.body });
    const res = await fetch(url, { ...init, headers });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [par] = c.split(';');
      const i = par.indexOf('=');
      if (!par.slice(i + 1) || /Max-Age=0/i.test(c)) galleta.delete(par.slice(0, i)); else galleta.set(par.slice(0, i), par.slice(i + 1));
    }
    return res;
  };
  f.galleta = galleta;
  return f;
}

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseDe = (s) => `${s.url}/api/`;
const remoto = async (s, extra = {}) => {
  const avisos = [];
  const almacen = await crearAlmacen({ base: baseDe(s), fetchFn: fetchConGalleta(extra.espia), avisar: (m, t) => avisos.push([m, t]), alActualizar: extra.alActualizar });
  almacen.detenerSondeo?.();
  return { almacen, avisos };
};
const punto = (extra = {}) => ({ tipo: 'Pozo', nombre: 'Pozo La Esperanza', comunidad: 'Cerro Punta', profundidad: '12', lat: '8.858', lng: '-82.573', ...extra });

test('M-30 🔴 en GitHub Pages (la ruta ../api/ da 404) la app entra en modo demostración, sin avisar ningún error', async () => {
  const avisos = [];
  const respuestas = [new Response('Not found', { status: 404 }), new Response('<html>index</html>', { status: 200 })];
  for (const respuesta of respuestas) {
    const a = await crearAlmacen({ base: 'https://brown0909.github.io/repo/api/', fetchFn: async () => respuesta.clone(), avisar: (m) => avisos.push(m) });
    assert.ok(a instanceof Store && !(a instanceof AlmacenRemoto), 'sigue siendo el Store en memoria de siempre');
    assert.equal(a.data.usuarios.length, 4, 'con los datos de ejemplo');
    assert.equal(a.login(CORREOS.tecnico, CLAVE_DEMO).ok, true, 'síncrono, como hoy: await sobre un valor síncrono funciona');
  }
  const sinRed = await crearAlmacen({ base: 'http://127.0.0.1:1/api/', fetchFn: async () => { throw new TypeError('fetch failed'); }, avisar: (m) => avisos.push(m) });
  assert.ok(sinRed instanceof Store && !(sinRed instanceof AlmacenRemoto));
  assert.equal((await crearAlmacen({ base: null })).constructor, Store, 'sin http(s) (p. ej. file://) también');
  assert.deepEqual(avisos, [], 'ningún aviso al usuario');
});

test('modo servidor: detecta /api/salud, recupera la sesión ANTES del primer dibujo y guarda una copia de lectura', async () => {
  const s = await arrancar();
  try {
    const { almacen } = await remoto(s);
    assert.ok(almacen instanceof AlmacenRemoto);
    assert.equal(almacen.usuario, null, 'sin sesión no hay usuario ni datos');
    assert.equal(almacen.data.puntos.length, 0);
    const r = await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    assert.equal(r.ok, true);
    assert.equal(r.datos.usuario.nombre, 'Ing. Carlos Chen');
    assert.equal(almacen.usuario.id, 'U1', 'la copia local ya sabe quién es');
    assert.equal(almacen.data.puntos.length, 7);
    assert.equal(almacen.puntoPorId('PZ-018').nombre, 'Pozo Alajuela Norte', 'las lecturas del núcleo siguen funcionando sobre la copia');
    assert.ok(almacen.alertas().length >= 1, 'incluidos los selectores del núcleo');
    const malo = await almacen.login(CORREOS.tecnico, 'incorrecta');
    assert.equal(malo.ok, false);
    assert.match(malo.errores._form, /incorrectos/);
    // recargar la página = un navegador nuevo con la MISMA cookie: la sesión se recupera
    const recargado = await crearAlmacen({ base: baseDe(s), fetchFn: almacen.fetchFn });
    recargado.detenerSondeo();
    assert.equal(recargado.usuario?.id, 'U1');
    assert.equal(recargado.data.puntos.length, 7);
  } finally { await s.cerrar(); }
});

test('RF-86 las 16 escrituras del navegador son exactamente la lista blanca del servidor (ni una más ni una menos)', () => {
  assert.deepEqual([...ACCIONES_REMOTAS].sort(), Object.keys(ACCIONES).sort());
  for (const nombre of ACCIONES_REMOTAS) assert.notEqual(AlmacenRemoto.prototype[nombre], Store.prototype[nombre], `${nombre} viaja al servidor`);
});

test('RF-86 una escritura devuelve lo mismo que el Store local ({ok,datos} / {ok:false,errores}) y el folio lo pone el servidor (RF-93)', async () => {
  const s = await arrancar();
  try {
    const { almacen } = await remoto(s);
    await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    const invalido = await almacen.crearPunto(punto({ nombre: '' }));
    assert.equal(invalido.ok, false);
    assert.ok(invalido.errores.nombre);
    const ok = await almacen.crearPunto(punto());
    assert.equal(ok.ok, true);
    assert.equal(ok.datos.id, 'PZ-020', 'el ID lo asignó el servidor');
    assert.ok(almacen.puntoPorId('PZ-020'), 'la copia local se actualizó con lo que devolvió el servidor');
    const t0 = s.reloj();
    const m = await almacen.crearMuestra({ puntoId: 'PZ-020', ...fechaLocal(t0 - 3600000), tecnicoId: 'U1', tipoAgua: 'Subterránea/Pozo', objetivo: 'Solo monitoreo', clasificacion: 'referencia', referenciaFolio: '', solicitados: ['nitrato'], foto: { ...archivo.png(), url: 'blob:http://otra-pc/abc' } });
    assert.equal(m.ok, true, JSON.stringify(m));
    assert.match(m.datos.folio, /^AG-\d{4}-\d{3}$/);
    assert.equal(s.almacen.store.data.muestras.filter((x) => x.folio === m.datos.folio).length, 1, 'el servidor lo asignó y no se repite');
    assert.equal(m.datos.foto.url, null, 'la URL local del navegador no viaja');
    assert.equal((await almacen.registrarEnvio(m.datos.folio, { ...fechaLocal(t0 - 1800000), destino: 'Laboratorio — MiAMBIENTE' })).ok, true);
    assert.equal(almacen.etapaDe(almacen.muestraPorFolio(m.datos.folio)), 'Enviada');
    // un rechazo de permisos llega como sinPermiso, no como error de transporte
    const rechazo = await almacen.confirmarRevision('AG-2026-080', { observaciones: 'Un Técnico no puede confirmar.' });
    assert.equal(rechazo.ok, false);
    assert.equal(rechazo.sinPermiso, true);
  } finally { await s.cerrar(); }
});

test('RF-86 el certificado se manda SIN su url local (el servidor no la usa y no debe guardarla)', async () => {
  const s = await arrancar();
  try {
    const espia = [];
    const { almacen } = await remoto(s, { espia });
    await almacen.login(CORREOS.laboratorio, CLAVE_DEMO);
    await almacen.guardarResultados('AG-2026-007', { fechaAnalisis: '2026-10-02', certificado: { ...archivo.pdf(), url: 'blob:http://esta-pc/xyz' } });
    const envio = espia.filter((e) => e.url.endsWith('/accion')).pop();
    assert.ok(envio, 'se mandó al servidor');
    assert.equal(JSON.parse(envio.cuerpo).args[1].certificado.url, null);
    assert.ok(!envio.cuerpo.includes('blob:'));
  } finally { await s.cerrar(); }
});

test('RF-92 🔴 una respuesta vieja que llega tarde NO pisa los datos más nuevos (el sondeo no deshace lo que acabo de guardar)', async () => {
  const s = await arrancar();
  try {
    const real = fetchConGalleta();
    let soltar = null;
    let retener = false;
    const lenta = async (url, init) => {
      const res = await real(url, init);
      if (retener && String(url).endsWith('/estado')) { retener = false; await new Promise((ok) => { soltar = ok; }); }
      return res;
    };
    const almacen = new AlmacenRemoto({ base: baseDe(s), fetchFn: lenta });
    await almacen.refrescar();
    await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    retener = true;
    const sondeo = almacen.refrescar();                       // el servidor contesta con los 7 puntos... y la respuesta se queda esperando
    while (!soltar) await new Promise((ok) => setTimeout(ok, 5));
    const r = await almacen.crearPunto(punto());              // mientras tanto se guarda un punto nuevo (8)
    assert.equal(r.ok, true);
    assert.equal(almacen.data.puntos.length, 8);
    soltar();                                                 // ahora llega la respuesta vieja (7 puntos)
    assert.equal((await sondeo).cambio, false, 'se descarta');
    assert.equal(almacen.data.puntos.length, 8, 'el punto recién guardado sigue visible');
    assert.ok(almacen.puntoPorId(r.datos.id));
  } finally { await s.cerrar(); }
});

test('RF-92 dos personas en dos computadoras: cada 5 s se ven los cambios de la otra, y solo se avisa a la pantalla si algo cambió', async () => {
  const s = await arrancar();
  try {
    const avisadas = [];
    const A = await remoto(s, { alActualizar: (x) => avisadas.push(['A', x]) });
    const B = await remoto(s, { alActualizar: (x) => avisadas.push(['B', x]) });
    await A.almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    await B.almacen.login(CORREOS.admin, CLAVE_DEMO);
    assert.notEqual(A.almacen.usuario.id, B.almacen.usuario.id, 'dos sesiones distintas');
    const r = await A.almacen.crearPunto(punto());
    assert.equal(B.almacen.puntoPorId(r.datos.id), null, 'B todavía no lo ve');
    const sin = await B.almacen.refrescar();
    assert.equal(sin.ok, true);
    assert.equal(sin.cambio, true);
    assert.equal(B.almacen.puntoPorId(r.datos.id).nombre, 'Pozo La Esperanza', 'B lo ve sin recargar');
    assert.equal((await B.almacen.refrescar()).cambio, false, 'sin cambios nuevos no hay redibujo');
    // el sondeo real (cada 5 s) usa el mismo camino: refrescar() + alActualizar
    B.almacen.iniciarSondeo();
    B.almacen.detenerSondeo();
    // la sesión cerrada desde otro lado se nota
    await A.almacen.logout();
    assert.equal(A.almacen.usuario, null);
    assert.equal(A.almacen.data.puntos.length, 0, 'al salir no queda ningún dato en la copia local');
  } finally { await s.cerrar(); }
});

test('RF-92 el sondeo corre solo cada 5 s y avisa cuando la sesión se pierde', async () => {
  const s = await arrancar();
  try {
    const avisos = [];
    const almacen = new AlmacenRemoto({ base: baseDe(s), fetchFn: fetchConGalleta(), alActualizar: (x) => avisos.push(x) });
    await almacen.refrescar();
    await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    // adelantar el temporizador sin esperar 5 s reales
    const original = globalThis.setInterval;
    let tick = null;
    globalThis.setInterval = (fn, ms) => { assert.equal(ms, 5000, 'cada 5 segundos'); tick = fn; return { unref() {} }; };
    try { almacen.iniciarSondeo(); } finally { globalThis.setInterval = original; }
    await tick();
    assert.deepEqual(avisos, [], 'nada cambió: no se avisa');
    s.reloj.avanzar(9 * 60);   // vence la sesión (8 h)
    await tick();
    assert.deepEqual(avisos, [{ sesionPerdida: true }]);
    assert.equal(almacen.usuario, null);
    almacen.detenerSondeo();
  } finally { await s.cerrar(); }
});

test('RF-95 si el servidor no responde: mensaje claro en el formulario, nada se pierde, un solo aviso y se recupera solo', async () => {
  const s = await arrancar();
  try {
    let caido = false;
    const real = fetchConGalleta();
    const avisos = [];
    const almacen = new AlmacenRemoto({ base: baseDe(s), fetchFn: async (...a) => { if (caido) throw new TypeError('fetch failed'); return real(...a); }, avisar: (m, t) => avisos.push([m, t]) });
    await almacen.refrescar();
    await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    const datosAntes = almacen.data.puntos.length;
    caido = true;
    const r = await almacen.crearPunto(punto());
    assert.equal(r.ok, false);
    assert.equal(r.sinConexion, true);
    assert.match(r.errores._form, /No hay conexión con el servidor.*sigue aquí/, 'va al aviso del formulario: lo escrito no se pierde');
    assert.equal(almacen.data.puntos.length, datosAntes, 'la copia local no se toca');
    assert.equal(almacen.usuario.id, 'U1', 'ni se cierra la sesión');
    assert.equal((await almacen.refrescar()).ok, false);
    assert.equal(await almacen.estadoToken('abc'), 'sinconexion');
    assert.deepEqual(await almacen.cargarBandeja(), []);
    assert.equal((await almacen.logout()).ok, false, 'sin conexión no finge haber cerrado sesión');
    assert.equal(almacen.usuario.id, 'U1');
    caido = false;
    assert.equal((await almacen.crearPunto(punto())).ok, true, 'vuelve el servidor y todo sigue');
  } finally { await s.cerrar(); }
});

test('RF-95 la sesión caducada o cerrada en el servidor: la escritura avisa y devuelve sinSesion, sin perder el formulario', async () => {
  const s = await arrancar();
  try {
    const avisos = [];
    const { almacen } = await remoto(s, { alActualizar: (x) => avisos.push(x) });
    await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    s.reloj.avanzar(9 * 60);
    const r = await almacen.crearPunto(punto());
    assert.equal(r.ok, false);
    assert.equal(r.sinSesion, true);
    assert.match(r.errores._form, /sesión terminó/);
    assert.deepEqual(avisos, [{ sesionPerdida: true }]);
    assert.equal(almacen.usuario, null);
  } finally { await s.cerrar(); }
});

test('el doble clic no crea dos registros: la misma acción pedida dos veces a la vez viaja una sola vez', async () => {
  const s = await arrancar();
  try {
    const { almacen } = await remoto(s);
    await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
    const [a, b] = await Promise.all([almacen.crearPunto(punto()), almacen.crearPunto(punto())]);
    assert.equal(a.ok, true);
    assert.deepEqual(a, b, 'las dos esperas reciben la misma respuesta');
    assert.equal(s.almacen.store.data.puntos.filter((p) => p.nombre === 'Pozo La Esperanza').length, 1);
  } finally { await s.cerrar(); }
});

test('D8 el reloj: el navegador usa el desfase con el servidor para sus fechas por defecto (un reloj atrasado no rechaza «hoy»)', async () => {
  const reloj = crearReloj();
  reloj.avanzar(3 * 60);   // el servidor va 3 h adelante de este computador
  const s = await arrancar({ reloj });
  try {
    const { almacen } = await remoto(s);
    const dif = almacen.ahora().getTime() - reloj();
    assert.ok(Math.abs(dif) < 2000, `ahora() sigue al servidor (diferencia ${dif} ms)`);
    assert.ok(almacen.ahora().getTime() - Date.now() > 2.9 * 3600000, 'y no al reloj local');
  } finally { await s.cerrar(); }
});

test('M-19/M-20 el estado de un enlace y la bandeja simulada esperan al servidor', async () => {
  const s = await arrancar();
  try {
    const { almacen } = await remoto(s);
    assert.equal(await almacen.estadoToken('inventado'), 'invalido');
    assert.deepEqual(await almacen.cargarBandeja(), []);
    await almacen.solicitarRecuperacion(CORREOS.tecnico);
    const correos = await almacen.cargarBandeja();
    assert.equal(correos.length, 1);
    const token = correos[0].enlace.split('/').pop();
    assert.equal(await almacen.estadoToken(token), 'valido');
    const r = await almacen.restablecer(token, 'OtraClaveNueva2026', 'OtraClaveNueva2026');
    assert.equal(r.ok, true);
    assert.equal(await almacen.estadoToken(token), 'usado');
    assert.equal((await almacen.login(CORREOS.tecnico, 'OtraClaveNueva2026')).ok, true);
  } finally { await s.cerrar(); }
});

test('M-30 el CSP de la app no se debilitó y el navegador llama a la API por una ruta RELATIVA', () => {
  const index = readFileSync(join(raiz, 'docs', 'app', 'index.html'), 'utf8');
  assert.match(index, /connect-src 'self';/);
  assert.match(index, /default-src 'self'/);
  assert.ok(!/unsafe-eval|script-src[^;]*unsafe-inline|connect-src[^;]*\*/.test(index));
  const api = readFileSync(join(raiz, 'docs', 'app', 'js', 'ui', 'api.js'), 'utf8');
  assert.match(api, /new URL\('\.\.\/api\/'/);
  assert.ok(!/fetch\(\s*['"`]\/api/.test(api), 'nada de rutas absolutas /api (caerían en la raíz de github.io)');
});
