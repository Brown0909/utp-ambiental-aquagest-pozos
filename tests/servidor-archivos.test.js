// Spec 005 · T3 — certificados PDF y fotos guardados DE VERDAD (RF-100…RF-111). Todo corre en Node contra el servidor real,
// con una carpeta de archivos temporal (nunca `data/archivos/`). Lo que necesita un navegador de verdad (elegir un archivo con el
// selector, arrastrar, dibujar la foto en la pantalla, jsPDF) NO se prueba aquí: queda para la guía de prueba en pareja.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Base } from '../server/db.js';
import { crearServidor, CARPETA_ARCHIVOS } from '../server/http.js';
import { Archivos } from '../server/archivos.js';
import { crearReloj, crearCliente, fechaLocal, CLAVE_DEMO, CORREOS } from './servidor-helpers.js';
import { AlmacenRemoto } from '../docs/app/js/ui/api.js';
import { leerArchivo } from '../docs/app/js/ui/archivos.js';
import { bloqueResultados } from '../docs/app/js/ui/componentes.js';
import { aTexto } from '../docs/app/js/ui/dom.js';
import { LABORATORIOS, CONDICION_OK } from '../docs/app/js/core/seed.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1048576;

// --- contenidos de prueba (los grandes se generan en memoria, no con archivos) ---
const pdf = (n = 300) => { const b = Buffer.alloc(n, 0x20); b.write('%PDF-1.4\n'); return b; };
const png = (n = 300) => { const b = Buffer.alloc(n, 0x11); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); return b; };
const jpg = (n = 300) => { const b = Buffer.alloc(n, 0x22); Buffer.from([0xff, 0xd8, 0xff, 0xe0]).copy(b); return b; };
const texto = (n = 300) => Buffer.alloc(n, 0x61);

/** Entorno: base (en memoria o en archivo), carpeta de archivos temporal y servidor real en el puerto 0. */
async function entorno({ enArchivo = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'aquagest-archivos-'));
  const carpeta = join(dir, 'archivos');
  const rutaBase = enArchivo ? join(dir, 'aquagest.db') : ':memory:';
  const reloj = crearReloj();
  const e = { dir, carpeta, rutaBase, reloj, servidores: [] };
  e.arrancar = async () => {
    const base = new Base(rutaBase);
    const { servidor, almacen } = crearServidor({ base, demo: true, reloj, carpetaArchivos: carpeta });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    const s = { base, almacen, servidor, url: `http://127.0.0.1:${servidor.address().port}` };
    s.cerrar = async () => { servidor.closeAllConnections?.(); await new Promise((ok) => servidor.close(ok)); base.cerrar(); };
    s.cliente = (o) => crearCliente(s.url, o);
    e.servidores.push(s);
    return s;
  };
  e.limpiar = async () => { for (const s of e.servidores) await s.cerrar().catch(() => {}); rmSync(dir, { recursive: true, force: true }); };
  e.enDisco = () => (existsSync(carpeta) ? readdirSync(carpeta) : []);
  e.s = await e.arrancar();
  return e;
}

const conEntorno = (opciones, fn) => async () => {
  const e = await entorno(opciones);
  try { await fn(e); } finally { await e.limpiar(); }
};

const galleta = (c) => (c.galleta.size ? { Cookie: [...c.galleta].map(([k, v]) => `${k}=${v}`).join('; ') } : {});

/** Sube un archivo como lo hace el navegador (cuerpo binario + dos cabeceras). `extra` pisa cabeceras. */
async function subir(c, tipo, nombre, cuerpo, extra = {}) {
  const res = await fetch(`${c.url}/api/archivo`, {
    method: 'POST', body: cuerpo,
    headers: { 'Content-Type': 'application/octet-stream', 'X-Tipo-Archivo': tipo, 'X-Nombre-Archivo': encodeURIComponent(nombre), ...galleta(c), ...extra },
  });
  const t = await res.text();
  let json = null;
  try { json = JSON.parse(t); } catch { /* binario */ }
  return { status: res.status, json, texto: t, headers: res.headers };
}

async function bajar(c, id, extra = {}) {
  const res = await fetch(`${c.url}/api/archivo/${id}`, { headers: { ...galleta(c), ...extra } });
  return { status: res.status, cuerpo: Buffer.from(await res.arrayBuffer()), headers: res.headers };
}

const entrar = async (s, ...roles) => {
  const cs = roles.map(() => s.cliente());
  await Promise.all(cs.map((c, i) => c.entrar(roles[i])));
  return cs;
};

const punto = (nombre = 'Pozo La Esperanza') => ({ tipo: 'Pozo', nombre, comunidad: 'Cerro Punta', profundidad: '12', lat: '8.858', lng: '-82.573' });
const muestra = (e, puntoId, minutosAtras, extra = {}) => ({ puntoId, ...fechaLocal(e.reloj() - minutosAtras * 60000), tecnicoId: 'U1', tipoAgua: 'Subterránea/Pozo', objetivo: 'Consumo humano', clasificacion: 'referencia', referenciaFolio: '', solicitados: ['nitrato'], ...extra });
const resultados = (e, certificado, extra = {}) => ({ nitrato: '50', nitratoForma: 'NO3', fechaAnalisis: fechaLocal(e.reloj()).fecha, laboratorio: LABORATORIOS[0], certificado, ...extra });

/** Deja una muestra «Recibida en laboratorio» (sin foto) lista para cargar resultados. */
async function muestraRecibida(e, tec, lab, minutosAtras = 120, nombrePunto = 'Pozo Recibida') {
  const p = await tec.accion('crearPunto', punto(nombrePunto));
  assert.equal(p.ok, true, JSON.stringify(p));
  const m = await tec.accion('crearMuestra', muestra(e, p.datos.id, minutosAtras));
  assert.equal(m.ok, true, JSON.stringify(m));
  const folio = m.datos.folio;
  assert.equal((await tec.accion('registrarEnvio', folio, { ...fechaLocal(e.reloj() - (minutosAtras - 30) * 60000), destino: LABORATORIOS[0] })).ok, true);
  assert.equal((await lab.accion('confirmarRecepcion', folio, { responsableId: 'U2', ...fechaLocal(e.reloj() - (minutosAtras - 60) * 60000), condicion: CONDICION_OK, incidencias: '' })).ok, true);
  return { folio, puntoId: p.datos.id };
}

// ---------------------------------------------------------------------------------------------------------------------

test('RF-100/107 🔴 un PDF válido se sube, recibe un id aleatorio y se baja con los MISMOS bytes y las cabeceras seguras', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const original = pdf(5000);
  const r = await subir(lab, 'certificado', 'certificado_AG-2026-001.pdf', original);
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true, r.texto);
  assert.match(r.json.archivo.id, /^[0-9a-f]{32}$/);
  assert.equal(r.json.archivo.size, 5000);
  assert.equal(r.json.archivo.type, 'application/pdf');
  const g = await bajar(lab, r.json.archivo.id);
  assert.equal(g.status, 200);
  assert.ok(g.cuerpo.equals(original), 'los bytes bajados son los subidos');
  assert.equal(g.headers.get('content-type'), 'application/pdf');
  assert.equal(g.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(g.headers.get('cache-control'), 'private, no-store');
  assert.equal(g.headers.get('content-disposition'), 'inline; filename="certificado_AG-2026-001.pdf"');
  // el rol que solo consulta (Técnico) también puede abrirlo, pero no subirlo (otra prueba)
  const [tec] = await entrar(e.s, 'tecnico');
  assert.equal((await bajar(tec, r.json.archivo.id)).status, 200);
}));

test('RF-101 🔴 un «.pdf» cuyo contenido es texto se rechaza y NO queda nada en disco ni en la base', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const r = await subir(lab, 'certificado', 'falso.pdf', texto());
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, false);
  assert.match(r.json.errores.archivo, /contenido/);
  assert.deepEqual(e.enDisco(), [], 'nada en disco');
  assert.equal(e.s.base.db.prepare('SELECT COUNT(*) AS n FROM archivos').get().n, 0, 'nada en la base');
  // un PNG disfrazado de PDF y un PDF con extensión de foto tampoco pasan
  assert.equal((await subir(lab, 'certificado', 'foto.pdf', png())).json.ok, false);
  assert.equal((await subir(lab, 'certificado', 'certificado.png', pdf())).json.ok, false, 'la extensión debe coincidir con el contenido');
  assert.deepEqual(e.enDisco(), []);
}));

test('RF-101 🔴 JPG y PNG válidos se aceptan como foto; uno falso, o de otro tipo, se rechaza', conEntorno({}, async (e) => {
  const [tec] = await entrar(e.s, 'tecnico');
  const a = await subir(tec, 'foto', 'campo.jpg', jpg());
  const b = await subir(tec, 'foto', 'campo.PNG', png());
  assert.equal(a.json.ok, true, a.texto);
  assert.equal(a.json.archivo.type, 'image/jpeg');
  assert.equal(b.json.ok, true, b.texto);
  assert.equal(b.json.archivo.type, 'image/png');
  assert.equal(e.enDisco().length, 2);
  const falso = await subir(tec, 'foto', 'falsa.jpg', texto());
  assert.equal(falso.json.ok, false);
  assert.equal((await subir(tec, 'foto', 'doc.pdf', pdf())).json.ok, false, 'un PDF no es una foto');
  assert.equal((await subir(tec, 'foto', 'png-con-nombre-jpg.jpg', png())).json.ok, false, 'el contenido PNG no coincide con la extensión .jpg');
  assert.equal(e.enDisco().length, 2, 'los rechazados no dejaron nada');
}));

test('RF-102 🔴 los topes: foto 5 MB y certificado 10 MB pasan justo en el límite; un byte más da 413 SIN guardar nada', conEntorno({}, async (e) => {
  const [tec, lab] = await entrar(e.s, 'tecnico', 'laboratorio');
  const f = await subir(tec, 'foto', 'justa.png', png(5 * MB));
  assert.equal(f.json?.ok, true, `foto de 5 MB exactos: ${f.status} ${f.texto.slice(0, 120)}`);
  const c = await subir(lab, 'certificado', 'justo.pdf', pdf(10 * MB));
  assert.equal(c.json?.ok, true, `certificado de 10 MB exactos: ${c.status} ${c.texto.slice(0, 120)}`);
  const antes = e.enDisco().length;
  const f2 = await subir(tec, 'foto', 'grande.png', png(5 * MB + 1));
  assert.equal(f2.status, 413);
  assert.equal(f2.json.ok, false);
  const c2 = await subir(lab, 'certificado', 'grande.pdf', pdf(10 * MB + 1));
  assert.equal(c2.status, 413);
  assert.equal(e.enDisco().length, antes, 'los dos pasados del tope no se guardaron');
  assert.equal(e.s.base.db.prepare('SELECT COUNT(*) AS n FROM archivos').get().n, antes);
}));

test('RF-102 🔴 el tope JSON de 1,5 MB y el filtro «solo JSON» del resto de rutas NO cambian', conEntorno({}, async (e) => {
  const [tec] = await entrar(e.s, 'tecnico');
  const grande = await tec.post('/api/accion', JSON.stringify({ accion: 'crearPunto', args: [{ nombre: 'x'.repeat(1.6 * MB) }] }));
  assert.equal(grande.status, 413);
  const noJson = await fetch(`${e.s.url}/api/accion`, { method: 'POST', body: 'a=b', headers: { 'Content-Type': 'text/plain', ...galleta(tec) } });
  assert.equal(noJson.status, 400);
  // y un archivo de 2 MB (más que el tope JSON) sí viaja por su ruta propia
  assert.equal((await subir(tec, 'foto', 'dos-mb.png', png(2 * MB))).json?.ok, true);
}));

test('RF-104/107 🔴 un id con ../, un id corto o uno que no existe dan 404; un archivo suelto en la carpeta sin fila en la base tampoco se sirve', conEntorno({}, async (e) => {
  const [tec] = await entrar(e.s, 'tecnico');
  const bueno = (await subir(tec, 'foto', 'ok.png', png())).json.archivo.id;
  assert.equal((await bajar(tec, bueno)).status, 200, 'el id bueno sí abre (la prueba no es vacía)');
  for (const malo of ['..%2f..%2fdata%2faquagest.db', '%2e%2e%2f%2e%2e%2fpackage.json', 'abc123', 'a'.repeat(32), '0'.repeat(32), `${bueno}.pdf`, `${bueno}%00`, bueno.toUpperCase(), `${bueno}/`]) {
    const g = await bajar(tec, malo);
    assert.equal(g.status, 404, `id «${malo}» debía dar 404 y dio ${g.status}`);
  }
  // 32 hex válidos con el archivo puesto a mano en la carpeta, pero sin fila en la base: no se sirve
  const suelto = 'f'.repeat(32);
  writeFileSync(join(e.carpeta, suelto), pdf());
  assert.equal((await bajar(tec, suelto)).status, 404);
  // una fila envenenada con un id con ../ y un archivo secreto FUERA de la carpeta: ni el servidor ni el módulo lo entregan
  writeFileSync(join(e.dir, 'secreto'), 'contenido secreto');
  e.s.base.archivoNuevo({ id: '../secreto', tipo: 'foto', tipoReal: 'png', tamano: 5, nombre: 'x.png', subidoPor: 'U1', fecha: 'x' });
  const g = await bajar(tec, '..%2fsecreto');
  assert.equal(g.status, 404);
  assert.ok(!g.cuerpo.toString().includes('secreto'));
  assert.equal(await new Archivos({ base: e.s.base, carpeta: e.carpeta }).leer('../secreto'), null);
}));

test('RF-103/107 🔴 sin sesión: 401 al subir y 401 al bajar (y no se guarda nada)', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const id = (await subir(lab, 'certificado', 'a.pdf', pdf())).json.archivo.id;
  const anonimo = e.s.cliente();
  const s1 = await subir(anonimo, 'certificado', 'b.pdf', pdf());
  assert.equal(s1.status, 401);
  assert.equal((await bajar(anonimo, id)).status, 401);
  assert.equal((await bajar(anonimo, 'no-es-un-id')).status, 401, 'primero la sesión, después el formato');
  assert.equal(e.enDisco().length, 1);
  // una sesión cerrada tampoco sirve
  await lab.salir();
  assert.equal((await bajar(lab, id)).status, 401);
  assert.equal((await subir(lab, 'certificado', 'c.pdf', pdf())).status, 401);
}));

test('RF-103 🔴 permisos: el Técnico no puede subir un certificado, el Laboratorio no puede subir una foto; el Administrador puede los dos', conEntorno({}, async (e) => {
  const [tec, lab, adm] = await entrar(e.s, 'tecnico', 'laboratorio', 'admin');
  const t = await subir(tec, 'certificado', 'a.pdf', pdf());
  assert.equal(t.json.ok, false);
  assert.match(t.json.errores.archivo, /rol/);
  const l = await subir(lab, 'foto', 'a.png', png());
  assert.equal(l.json.ok, false);
  assert.match(l.json.errores.archivo, /rol/);
  assert.deepEqual(e.enDisco(), [], 'los rechazados por permiso no dejaron nada');
  assert.equal((await subir(tec, 'foto', 'a.png', png())).json.ok, true, 'el Técnico sí sube fotos');
  assert.equal((await subir(lab, 'certificado', 'a.pdf', pdf())).json.ok, true, 'el Laboratorio sí sube certificados');
  assert.equal((await subir(adm, 'foto', 'b.png', png())).json.ok, true);
  assert.equal((await subir(adm, 'certificado', 'b.pdf', pdf())).json.ok, true);
  assert.equal((await subir(tec, '../etc', 'a.png', png())).json.ok, false, 'un tipo inventado se rechaza');
  assert.equal((await subir(tec, 'foto', '', png())).json.ok, false, 'sin nombre se rechaza');
  assert.equal((await subir(tec, 'foto', 'n'.repeat(201) + '.png', png())).json.ok, false, 'nombre de más de 200 caracteres');
  assert.equal(e.enDisco().length, 4);
}));

test('RF-97/103 🔴 un `Origin` ajeno recibe 403 al subir y al bajar, aunque haya sesión', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const id = (await subir(lab, 'certificado', 'a.pdf', pdf())).json.archivo.id;
  const s = await subir(lab, 'certificado', 'b.pdf', pdf(), { Origin: 'http://sitio-malo.example' });
  assert.equal(s.status, 403);
  assert.equal((await bajar(lab, id, { Origin: 'http://sitio-malo.example' })).status, 403);
  assert.equal((await bajar(lab, id, { Origin: e.s.url })).status, 200, 'el mismo origen sí pasa');
  assert.equal(e.enDisco().length, 1);
}));

test('RF-102 el archivo vacío se rechaza y no deja nada', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const r = await subir(lab, 'certificado', 'vacio.pdf', Buffer.alloc(0));
  assert.equal(r.json.ok, false);
  assert.match(r.json.errores.archivo, /vacío/);
  assert.deepEqual(e.enDisco(), []);
}));

test('RF-104 🔴 el nombre en disco es un id aleatorio de 32 hex: no contiene nada del nombre original y el archivo no se pisa', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const a = (await subir(lab, 'certificado', 'informe-secreto-del-pozo.pdf', pdf(400))).json.archivo.id;
  const b = (await subir(lab, 'certificado', 'informe-secreto-del-pozo.pdf', pdf(500))).json.archivo.id;
  assert.notEqual(a, b, 'dos subidas con el mismo nombre dan ids distintos');
  const enDisco = e.enDisco().sort();
  assert.deepEqual(enDisco, [a, b].sort());
  for (const f of enDisco) { assert.match(f, /^[0-9a-f]{32}$/); assert.ok(!f.includes('secreto') && !f.includes('.pdf')); }
  assert.equal(readFileSync(join(e.carpeta, a)).length, 400);
  assert.equal(readFileSync(join(e.carpeta, b)).length, 500);
}));

test('RF-105 🔴 un archivo de OTRA persona, uno ya usado, uno del tipo equivocado o uno inventado NO se pueden referenciar', conEntorno({}, async (e) => {
  const [tec, adm] = await entrar(e.s, 'tecnico', 'admin');
  const p = await tec.accion('crearPunto', punto());
  const idTec = (await subir(tec, 'foto', 'a.png', png())).json.archivo.id;
  const idCert = (await subir(adm, 'certificado', 'c.pdf', pdf())).json.archivo.id;
  const n0 = (await tec.estado()).datos.muestras.length;

  // de otra persona: el Administrador intenta usar la foto que subió el Técnico
  const ajeno = await adm.accion('crearMuestra', muestra(e, p.datos.id, 200, { foto: { archivoId: idTec } }));
  assert.equal(ajeno.ok, false);
  assert.ok(ajeno.errores.foto, 'el error cae en el campo foto');
  // del tipo equivocado (es un certificado, no una foto)
  const tipo = await adm.accion('crearMuestra', muestra(e, p.datos.id, 200, { foto: { archivoId: idCert } }));
  assert.equal(tipo.ok, false);
  assert.ok(tipo.errores.foto);
  // inventado, y con formato raro
  for (const x of ['0'.repeat(32), '../x', 7, null, { a: 1 }]) {
    const r = await tec.accion('crearMuestra', muestra(e, p.datos.id, 200, { foto: { archivoId: x } }));
    assert.equal(r.ok, false, `archivoId ${JSON.stringify(x)}`);
    assert.ok(r.errores.foto);
  }
  assert.equal((await tec.estado()).datos.muestras.length, n0, 'ninguna muestra se creó');

  // el dueño sí puede (la prueba no es vacía) …
  const ok = await tec.accion('crearMuestra', muestra(e, p.datos.id, 200, { foto: { archivoId: idTec } }));
  assert.equal(ok.ok, true, JSON.stringify(ok));
  // … pero una vez usada, nadie la vuelve a referenciar, ni el mismo dueño en otra muestra
  const otra = await tec.accion('crearMuestra', muestra(e, p.datos.id, 150, { foto: { archivoId: idTec } }));
  assert.equal(otra.ok, false);
  assert.ok(otra.errores.foto);
  assert.equal((await tec.estado()).datos.muestras.length, n0 + 1);
  assert.equal(e.s.base.archivo(idTec).usado, 1);
}));

test('RF-105 un archivo cuya acción NO se guardó (el núcleo la rechazó por otro campo) sigue libre para reintentar', conEntorno({}, async (e) => {
  const [tec] = await entrar(e.s, 'tecnico');
  const p = await tec.accion('crearPunto', punto());
  const id = (await subir(tec, 'foto', 'a.png', png())).json.archivo.id;
  const mala = await tec.accion('crearMuestra', muestra(e, p.datos.id, 200, { solicitados: [], foto: { archivoId: id } }));
  assert.equal(mala.ok, false);
  assert.ok(mala.errores.solicitados);
  assert.equal(e.s.base.archivo(id).usado, 0, 'no se marcó como usado');
  const buena = await tec.accion('crearMuestra', muestra(e, p.datos.id, 200, { foto: { archivoId: id } }));
  assert.equal(buena.ok, true, JSON.stringify(buena));
}));

test('RF-105/106 🔴 tipo, tamaño y bytes salen del archivo GUARDADO y la `url` la pone el servidor: lo que mande el navegador se ignora', conEntorno({}, async (e) => {
  const [tec, lab] = await entrar(e.s, 'tecnico', 'laboratorio');
  const p = await tec.accion('crearPunto', punto());
  const id = (await subir(tec, 'foto', 'real.png', png(1234))).json.archivo.id;
  const m = await tec.accion('crearMuestra', muestra(e, p.datos.id, 200, { foto: { archivoId: id, url: 'javascript:alert(1)', size: 1, type: 'text/html', bytes: [0, 0, 0], name: 'otro.exe' } }));
  assert.equal(m.ok, true, JSON.stringify(m));
  assert.deepEqual(m.datos.foto, { nombre: 'real.png', tipo: 'image/png', tamano: 1234, url: `../api/archivo/${id}` });
  // lo mismo con el certificado, y la bandera «demostración» solo la lleva el certificado
  const { folio } = await muestraRecibida(e, tec, lab, 300);
  const cid = (await subir(lab, 'certificado', 'cert.pdf', pdf(777))).json.archivo.id;
  const r = await lab.accion('guardarResultados', folio, resultados(e, { archivoId: cid, url: 'https://malo.example/x.pdf', size: 3, type: 'image/png', bytes: [1], name: 'malo.pdf' }));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.datos.resultados.certificado, { nombre: 'cert.pdf', tamano: 777, url: `../api/archivo/${cid}`, demo: false });
}));

test('RF-100…109 🔴 flujo completo por HTTP: foto → muestra → envío → recepción → certificado → resultados, se abren y SOBREVIVEN al reinicio del servidor', conEntorno({ enArchivo: true }, async (e) => {
  const [tec, lab] = await entrar(e.s, 'tecnico', 'laboratorio');
  const p = await tec.accion('crearPunto', punto());
  const foto = jpg(2048);
  const fid = (await subir(tec, 'foto', 'campo.jpg', foto)).json.archivo.id;
  const m = await tec.accion('crearMuestra', muestra(e, p.datos.id, 120, { foto: { archivoId: fid } }));
  assert.equal(m.ok, true, JSON.stringify(m));
  const folio = m.datos.folio;
  assert.equal((await tec.accion('registrarEnvio', folio, { ...fechaLocal(e.reloj() - 90 * 60000), destino: LABORATORIOS[0] })).ok, true);
  assert.equal((await lab.accion('confirmarRecepcion', folio, { responsableId: 'U2', ...fechaLocal(e.reloj() - 60 * 60000), condicion: CONDICION_OK, incidencias: '' })).ok, true);
  const cert = pdf(4096);
  const cid = (await subir(lab, 'certificado', 'certificado.pdf', cert)).json.archivo.id;
  const r = await lab.accion('guardarResultados', folio, resultados(e, { archivoId: cid }));
  assert.equal(r.ok, true, JSON.stringify(r));

  // se abren desde las direcciones que quedaron en la muestra (relativas a /app/, o sea /api/archivo/<id>)
  const guardada = (await tec.estado()).datos.muestras.find((x) => x.folio === folio);
  assert.equal(guardada.foto.url, `../api/archivo/${fid}`);
  assert.equal(guardada.resultados.certificado.url, `../api/archivo/${cid}`);
  const aRuta = (u) => new URL(u, 'http://x/app/').pathname;
  assert.ok((await bajar(tec, aRuta(guardada.foto.url).split('/').pop())).cuerpo.equals(foto));
  assert.ok((await bajar(tec, aRuta(guardada.resultados.certificado.url).split('/').pop())).cuerpo.equals(cert));
  assert.equal(aRuta(guardada.foto.url), `/api/archivo/${fid}`);

  // se apaga y se enciende sobre la MISMA base y la MISMA carpeta
  await e.s.cerrar();
  const s2 = await e.arrancar();
  const tec2 = s2.cliente();
  await tec2.entrar('tecnico');
  const g2 = (await tec2.estado()).datos.muestras.find((x) => x.folio === folio);
  assert.equal(g2.foto.url, `../api/archivo/${fid}`);
  const f2 = await bajar(tec2, fid);
  assert.equal(f2.status, 200);
  assert.ok(f2.cuerpo.equals(foto), 'la foto sigue abriéndose tras el reinicio');
  assert.ok((await bajar(tec2, cid)).cuerpo.equals(cert), 'el certificado sigue abriéndose tras el reinicio');
  assert.equal(s2.base.archivo(fid).usado, 1, 'y sigue marcado como usado');
}));

test('RF-104/108 🔴 un nombre con <script>, comillas y saltos de línea se guarda como TEXTO; la descarga no lo refleja sin sanear ni deja inyectar cabeceras', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const peligroso = '<script>alert(1)</script>.pdf';
  const r = await subir(lab, 'certificado', peligroso, pdf());
  assert.equal(r.json.ok, true, r.texto);
  assert.equal(r.json.archivo.name, peligroso, 'el nombre se guarda tal cual, como texto de presentación');
  const g = await bajar(lab, r.json.archivo.id);
  const cd = g.headers.get('content-disposition');
  assert.match(cd, /^inline; filename="[A-Za-z0-9._-]+"$/, cd);
  assert.ok(!/[<>]/.test(cd));
  assert.equal(g.headers.get('content-type'), 'application/pdf', 'nunca text/html');

  const raro = 'a"b\r\nSet-Cookie: x=1\r\n\r\n<b>.pdf';
  const r2 = await subir(lab, 'certificado', raro, pdf());
  assert.equal(r2.json.ok, true, r2.texto);
  assert.ok(!/[\r\n\u0000]/.test(r2.json.archivo.name), 'los saltos de línea se quitan del nombre');
  const g2 = await bajar(lab, r2.json.archivo.id);
  assert.equal(g2.status, 200);
  assert.equal(g2.headers.get('set-cookie'), null, 'no se pudo inyectar una cabecera');
  assert.match(g2.headers.get('content-disposition'), /^inline; filename="[A-Za-z0-9._-]+"$/);

  // y la pantalla lo pinta escapado y con rel="noopener" (el escape es el de la plantilla html``)
  const dibujo = aTexto(bloqueResultados({ resultados: { fechaAnalisis: '2026-10-02', laboratorio: 'Lab', valores: {}, certificado: { nombre: peligroso, url: `../api/archivo/${r.json.archivo.id}`, demo: false } } }));
  assert.ok(!dibujo.includes('<script>'), 'el nombre no se inserta como HTML');
  assert.ok(dibujo.includes('&lt;script&gt;'));
  assert.ok(dibujo.includes('rel="noopener"'));
}));

test('RF-100/109 el servidor no borra ni reemplaza archivos de usuario, y la carpeta está fuera de docs/ y cubierta por .gitignore', () => {
  const lista = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? lista(join(dir, d.name)) : [join(dir, d.name)]));
  const codigo = lista(join(raiz, 'server')).filter((f) => f.endsWith('.js'));
  assert.ok(codigo.some((f) => f.endsWith('archivos.js')), 'se revisa también server/archivos.js');
  for (const f of codigo) {
    const t = readFileSync(f, 'utf8');
    assert.ok(!/\b(unlink|unlinkSync|rm|rmSync|rmdir|rmdirSync|truncate|truncateSync|rename|renameSync|copyFileSync|cpSync)\b/.test(t), `${relative(raiz, f)} borra o reemplaza archivos`);
    assert.ok(!/DELETE\s+FROM/i.test(t), `${relative(raiz, f)} contiene DELETE FROM`);
    assert.ok(!/flag:\s*'w'/.test(t), `${relative(raiz, f)} abre archivos para sobrescribir`);
  }
  assert.equal(CARPETA_ARCHIVOS, resolve(raiz, 'data', 'archivos'));
  assert.ok(relative(join(raiz, 'docs'), CARPETA_ARCHIVOS).startsWith('..'), 'la carpeta de archivos está fuera de docs/');
  assert.ok(!existsSync(join(raiz, 'docs', 'data')) && !existsSync(join(raiz, 'docs', 'archivos')));
  const lineas = readFileSync(join(raiz, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
  assert.ok(lineas.includes('data/'), 'data/ (y con ella data/archivos/) no se sube a git');
});

test('RF-109 la base no tiene ninguna ruta que borre filas de `archivos`: solo se marca «usado»', conEntorno({}, async (e) => {
  const [lab] = await entrar(e.s, 'laboratorio');
  const id = (await subir(lab, 'certificado', 'a.pdf', pdf())).json.archivo.id;
  assert.equal(e.s.base.archivoUsar(id), true);
  assert.equal(e.s.base.archivoUsar(id), false, 'marcar dos veces no hace nada la segunda');
  assert.equal(e.s.base.archivo(id).usado, 1);
  assert.equal(typeof e.s.base.archivoBorrar, 'undefined');
}));

// --- el lado del navegador (la parte que corre en Node; lo demás se prueba a mano) ---------------------------------------

/** `fetch` con cookie jar, como el navegador, que anota las peticiones. */
function fetchDeNavegador(espia = []) {
  const jar = new Map();
  return async (url, init = {}) => {
    const headers = { ...(init.headers ?? {}), ...(jar.size ? { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}) };
    espia.push({ url: String(url), metodo: init.method ?? 'GET', cabeceras: init.headers ?? {}, cuerpo: init.body });
    const res = await fetch(url, { ...init, headers });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [par] = c.split(';');
      const i = par.indexOf('=');
      if (!par.slice(i + 1) || /Max-Age=0/i.test(c)) jar.delete(par.slice(0, i)); else jar.set(par.slice(0, i), par.slice(i + 1));
    }
    return res;
  };
}

test('RF-100/110 el cliente (AlmacenRemoto) sube el File ANTES de la acción y manda {archivoId}, sin bytes ni url', conEntorno({}, async (e) => {
  const espia = [];
  const almacen = new AlmacenRemoto({ base: `${e.s.url}/api/`, fetchFn: fetchDeNavegador(espia) });
  assert.equal((await almacen.login(CORREOS.tecnico, CLAVE_DEMO)).ok, true);
  const p = await almacen.crearPunto(punto());
  const contenido = png(3000);
  const file = new File([contenido], 'campo.png', { type: 'image/png' });
  const elegido = await leerArchivo(file);
  assert.equal(elegido.file, file, 'leerArchivo conserva el File');
  const r = await almacen.crearMuestra({ ...muestra(e, p.datos.id, 120), foto: elegido });
  assert.equal(r.ok, true, JSON.stringify(r));
  const subida = espia.findIndex((x) => x.url.endsWith('/api/archivo') && x.metodo === 'POST');
  const accion = espia.findIndex((x) => x.url.endsWith('/api/accion') && String(x.cuerpo).includes('crearMuestra'));
  assert.ok(subida >= 0 && accion > subida, 'primero la subida y después la acción');
  assert.equal(espia[subida].cabeceras['X-Tipo-Archivo'], 'foto');
  assert.equal(decodeURIComponent(espia[subida].cabeceras['X-Nombre-Archivo']), 'campo.png');
  const enviado = JSON.parse(espia[accion].cuerpo).args[0].foto;
  assert.deepEqual(Object.keys(enviado), ['archivoId'], 'solo el id: sin bytes, ni url, ni nombre');
  assert.match(r.datos.foto.url, /^\.\.\/api\/archivo\/[0-9a-f]{32}$/);
  assert.ok((await bajar(e.s.cliente(), r.datos.foto.url.split('/').pop())).status === 401, 'sin sesión no se abre');
}));

test('RF-100 el cliente muestra el error de la subida en el campo (foto/certificado) y NO manda la acción', conEntorno({}, async (e) => {
  const espia = [];
  const almacen = new AlmacenRemoto({ base: `${e.s.url}/api/`, fetchFn: fetchDeNavegador(espia) });
  await almacen.login(CORREOS.tecnico, CLAVE_DEMO);
  const p = await almacen.crearPunto(punto());
  const falsa = { name: 'falsa.png', size: 300, type: 'image/png', bytes: [0x61], url: 'blob:x', file: new Blob([texto()]) };
  const antes = espia.filter((x) => x.url.endsWith('/api/accion')).length;
  const r = await almacen.crearMuestra({ ...muestra(e, p.datos.id, 120), foto: falsa });
  assert.equal(r.ok, false);
  assert.match(r.errores.foto, /contenido/);
  assert.equal(espia.filter((x) => x.url.endsWith('/api/accion')).length, antes, 'la acción no se mandó');
  // sin conexión: mismo aviso de siempre, sin perder el formulario
  const sin = new AlmacenRemoto({ base: `${e.s.url}/api/`, fetchFn: async () => { throw new TypeError('fetch failed'); } });
  const r2 = await sin.crearMuestra({ ...muestra(e, 'PZ-001', 120), foto: { ...falsa, file: new Blob([png()]) } });
  assert.equal(r2.ok, false);
  assert.equal(r2.sinConexion, true);
}));

test('RF-100 el certificado de demostración (un Blob con demo:true) se sube igual, y si la acción falla por otro campo NO se sube dos veces', conEntorno({}, async (e) => {
  const [tec, lab] = await entrar(e.s, 'tecnico', 'laboratorio');
  const { folio } = await muestraRecibida(e, tec, lab);
  const espia = [];
  const almacen = new AlmacenRemoto({ base: `${e.s.url}/api/`, fetchFn: fetchDeNavegador(espia) });
  await almacen.login(CORREOS.laboratorio, CLAVE_DEMO);
  const blob = new Blob([pdf(900)], { type: 'application/pdf' });
  const demo = { name: `certificado_${folio}.pdf`, size: 900, type: 'application/pdf', bytes: [...pdf(900).subarray(0, 16)], url: 'blob:x', demo: true, file: blob };
  const mala = await almacen.guardarResultados(folio, resultados(e, demo, { nitrato: '' }));
  assert.equal(mala.ok, false);
  assert.ok(mala.errores.nitrato, 'falló por otro campo');
  const buena = await almacen.guardarResultados(folio, resultados(e, demo));
  assert.equal(buena.ok, true, JSON.stringify(buena));
  assert.equal(espia.filter((x) => x.url.endsWith('/api/archivo') && x.metodo === 'POST').length, 1, 'se subió una sola vez');
  assert.equal(buena.datos.resultados.certificado.demo, true, 'sigue marcado como de demostración');
  assert.match(buena.datos.resultados.certificado.url, /^\.\.\/api\/archivo\//);
  assert.equal(e.enDisco().length, 1);
}));

test('RF-110 en demostración (sin servidor) el Store local sigue igual: acepta el archivo con su `file` extra y guarda la url local como siempre', async () => {
  // AlmacenRemoto solo existe con servidor; en GitHub Pages crearAlmacen devuelve el Store local y `file` es una propiedad que el núcleo ignora.
  const { crear, muestraValida, archivo } = await import('./helpers.js');
  const s = crear('tecnico');
  const r = s.crearMuestra(muestraValida({ foto: { ...archivo.png(), url: 'blob:local', file: new Blob(['x']) } }));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.datos.foto.url, 'blob:local');
  assert.ok(!('_subir' in s), 'el Store local no tiene subida de archivos');
});

test('RF-111 la carpeta configurable: Archivos solo escribe dentro de la carpeta que se le dio', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aquagest-archivos-'));
  try {
    const base = new Base(':memory:');
    const a = new Archivos({ base, carpeta: join(dir, 'x') });
    const r = a.guardar({ tipo: 'certificado', nombre: 'a.pdf', buffer: pdf(), subidoPor: 'U2', fecha: 'hoy' });
    assert.equal(r.ok, true);
    assert.ok(existsSync(join(dir, 'x', r.archivo.id)));
    assert.deepEqual(readdirSync(dir), ['x']);
    mkdirSync(join(dir, 'y'));
    assert.equal(a.resolver('../y', 'certificado', 'U2').ok, false);
    base.cerrar();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
