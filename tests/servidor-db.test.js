// Spec 004 · T1 y T2 — base de datos, claves cifradas y registro de accesos (RF-84, 85, 88, 90, 91, 94).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { arrancar, carpetaTemporal, volcarBase, CORREOS, CLAVE_DEMO } from './servidor-helpers.js';

const punto = (extra = {}) => ({ tipo: 'Pozo', nombre: 'Pozo La Esperanza', comunidad: 'Cerro Punta', profundidad: '12', lat: '8.858', lng: '-82.573', ...extra });

test('RF-84 un punto creado sigue ahí al cerrar y volver a abrir la base (🔴 persistencia real, en archivo)', async () => {
  const tmp = carpetaTemporal();
  try {
    let s = await arrancar({ ruta: tmp.ruta });
    let c = s.cliente();
    await c.entrar('tecnico');
    const r = await c.accion('crearPunto', punto());
    assert.equal(r.ok, true, JSON.stringify(r));
    const id = r.datos.id;
    await s.cerrar();

    s = await arrancar({ ruta: tmp.ruta });
    c = s.cliente();
    await c.entrar('tecnico');
    const est = await c.estado();
    assert.ok(est.datos.puntos.some((p) => p.id === id && p.nombre === 'Pozo La Esperanza'), 'el punto sigue después de reiniciar');
    // los contadores también sobreviven: el siguiente ID no repite el anterior
    const r2 = await c.accion('crearPunto', punto({ nombre: 'Otro pozo', comunidad: 'Boquete' }));
    assert.equal(r2.ok, true);
    assert.notEqual(r2.datos.id, id);
    await s.cerrar();
  } finally { await tmp.limpiar(); }
});

test('RF-85 la siembra de ejemplo ocurre UNA sola vez: lo que se agrega no se pisa al reiniciar', async () => {
  const tmp = carpetaTemporal();
  try {
    let s = await arrancar({ ruta: tmp.ruta });
    const inicial = s.almacen.store.data.muestras.length;
    assert.ok(inicial >= 9);
    assert.ok(s.base.meta('sembrada'));
    const c = s.cliente();
    await c.entrar('admin');
    await c.accion('cambiarEstado', 'U4', 'Activo');   // un cambio sobre los datos de ejemplo
    await s.cerrar();
    s = await arrancar({ ruta: tmp.ruta });
    const c2 = s.cliente();
    await c2.entrar('admin');
    const est = await c2.estado();
    assert.equal(est.datos.muestras.length, inicial, 'no se sembró otra vez');
    assert.equal(est.datos.usuarios.find((u) => u.id === 'U4').estado, 'Activo', 'el cambio sobrevivió al reinicio');
    await s.cerrar();
  } finally { await tmp.limpiar(); }
});

test('RF-90 🔴 `accesos` es de solo agregar: UPDATE y DELETE fallan, también con SQL directo', async () => {
  const s = await arrancar();
  try {
    await s.cliente().entrar('tecnico');   // deja al menos una fila
    const antes = s.base.db.prepare('SELECT COUNT(*) AS n FROM accesos').get().n;
    assert.ok(antes >= 1);
    assert.throws(() => s.base.db.exec("UPDATE accesos SET evento = 'otro'"), /de solo agregar/);
    assert.throws(() => s.base.db.exec('DELETE FROM accesos'), /de solo agregar/);
    assert.throws(() => s.base.db.exec("UPDATE accesos SET cuenta_id = 'U9' WHERE id = 1"), /de solo agregar/);
    assert.equal(s.base.db.prepare('SELECT COUNT(*) AS n FROM accesos').get().n, antes, 'nada se perdió');
  } finally { await s.cerrar(); }
});

test('RF-88 🔴 la clave guardada es scrypt con sal propia: no es la de demostración y nada queda en claro', async () => {
  const s = await arrancar();
  try {
    const filas = s.base.db.prepare('SELECT id, clave_cifrada, datos FROM usuarios').all();
    assert.equal(filas.length, 4);
    for (const f of filas) {
      assert.match(f.clave_cifrada, /^scrypt\$\d+\$8\$1\$/, `usuario ${f.id}`);
      assert.notEqual(f.clave_cifrada, CLAVE_DEMO);
      assert.ok(!f.clave_cifrada.includes(CLAVE_DEMO));
      assert.ok(!/password/i.test(f.datos), 'el JSON del usuario no lleva password');
    }
    assert.equal(new Set(filas.map((f) => f.clave_cifrada)).size, 4, 'cada usuario tiene su propia sal (misma clave, distinto cifrado)');
    const todo = JSON.stringify(volcarBase(s.base));
    assert.ok(!todo.includes(CLAVE_DEMO), 'la clave de demostración no aparece en ninguna tabla');
    assert.ok(!/"password"/.test(todo));
  } finally { await s.cerrar(); }
});

test('RF-88 🔴 /api/estado y las respuestas no traen password, cifrados, tokens ni intentos (en ningún rol)', async () => {
  const s = await arrancar();
  try {
    for (const rol of ['tecnico', 'laboratorio', 'admin']) {
      const c = s.cliente();
      const login = await c.entrar(rol);
      const texto = JSON.stringify([login.json, await c.estado()]);
      for (const prohibido of ['password', 'clave_cifrada', 'scrypt$', CLAVE_DEMO, '"tokens"', '"intentos"']) assert.ok(!texto.includes(prohibido), `${rol}: «${prohibido}» no debe salir al navegador`);
    }
    // invitar y restablecer también escriben `password` en el núcleo: tampoco sale
    const admin = s.cliente();
    await admin.entrar('admin');
    const inv = await admin.post('/api/accion', { accion: 'invitarUsuario', args: [{ nombre: 'Nueva Persona', correo: 'nueva.persona@miambiente.gob.pa', rol: 'Técnico', estado: 'Activo' }] });
    assert.equal(inv.json.resultado.ok, true);
    assert.ok(!/password|scrypt|Aqua2026/.test(inv.texto), 'la respuesta de invitar no filtra la clave');
    const fila = s.base.db.prepare('SELECT clave_cifrada FROM usuarios WHERE correo = ?').get('nueva.persona@miambiente.gob.pa');
    assert.match(fila.clave_cifrada, /^scrypt\$/);
    const nueva = s.cliente();
    assert.equal((await nueva.login('nueva.persona@miambiente.gob.pa')).json.ok, true, 'la persona invitada entra con la clave de demostración (D6), ya cifrada');
  } finally { await s.cerrar(); }
});

test('RF-87 la cookie es HttpOnly + SameSite=Strict y en la base solo queda su hash (🔴 no se puede robar leyendo la base)', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    const r = await c.entrar('tecnico');
    const sc = r.headers.getSetCookie()[0];
    assert.match(sc, /HttpOnly/);
    assert.match(sc, /SameSite=Strict/);
    assert.match(sc, /Path=\//);
    assert.match(sc, /Max-Age=28800/);
    const valor = sc.split(';')[0].split('=')[1];
    assert.ok(valor.length >= 40, 'valor aleatorio largo (32 bytes)');
    const sesiones = s.base.db.prepare('SELECT hash FROM sesiones').all();
    assert.equal(sesiones.length, 1);
    assert.equal(sesiones[0].hash, createHash('sha256').update(valor).digest('hex'));
    assert.ok(!JSON.stringify(volcarBase(s.base)).includes(valor), 'el valor de la cookie no está en la base');
    const otra = s.cliente();
    await otra.entrar('tecnico');
    assert.notEqual([...otra.galleta.values()][0], valor, 'cada entrada genera un valor distinto');
  } finally { await s.cerrar(); }
});

test('RF-90 🔴 el registro de accesos anota entrada, salida, fallos y bloqueo, con IP y navegador, y NUNCA la clave ni el correo tecleado', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente({ navegador: 'NavegadorDeJosé/9.9' });
    await c.login(CORREOS.tecnico, 'ClaveSecretaXYZ1');           // clave equivocada, cuenta que existe
    await c.login('nadie.existe@miambiente.gob.pa', 'OtraClaveSecreta7');   // cuenta que NO existe
    await c.entrar('tecnico');
    await c.salir();
    const filas = s.base.db.prepare('SELECT * FROM accesos ORDER BY id').all();
    assert.deepEqual(filas.map((f) => f.evento), ['contrasena_incorrecta', 'contrasena_incorrecta', 'entrada', 'salida']);
    assert.deepEqual(filas.map((f) => f.cuenta_id), ['U1', null, 'U1', 'U1']);
    for (const f of filas) {
      assert.equal(f.ip, '127.0.0.1');
      assert.equal(f.navegador, 'NavegadorDeJosé/9.9');
      assert.match(f.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
    const texto = JSON.stringify(volcarBase(s.base).accesos);
    for (const secreto of ['ClaveSecretaXYZ1', 'OtraClaveSecreta7', 'nadie.existe', 'carlos.chen', CLAVE_DEMO, '@']) assert.ok(!texto.includes(secreto), `el registro no debe contener «${secreto}»`);
  } finally { await s.cerrar(); }
});

test('RF-90 el 5.º intento fallido anota el bloqueo (una vez) y con la cuenta bloqueada ni la clave buena entra', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    for (let i = 0; i < 5; i++) await c.login(CORREOS.laboratorio, `mala-${i}-Abc12345`);
    const bloqueado = await c.login(CORREOS.laboratorio, CLAVE_DEMO);
    assert.equal(bloqueado.json.ok, false);
    assert.equal(bloqueado.json.bloqueado, true);
    assert.equal((await c.estado()).usuario, null, 'no hay sesión');
    const eventos = s.base.db.prepare('SELECT evento FROM accesos ORDER BY id').all().map((f) => f.evento);
    assert.equal(eventos.filter((e) => e === 'contrasena_incorrecta').length, 5);
    assert.equal(eventos.filter((e) => e === 'bloqueo').length, 1);
    assert.ok(!eventos.includes('entrada'));
    s.reloj.avanzar(2);   // pasan más de 60 s
    assert.equal((await c.login(CORREOS.laboratorio, CLAVE_DEMO)).json.ok, true, 'el bloqueo dura 60 s y luego se puede entrar');
  } finally { await s.cerrar(); }
});

test('RF-91 🔴 una sesión de más de 8 h vence, se anota «sesion_vencida» una vez y hay que entrar de nuevo', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    await c.entrar('tecnico');
    s.reloj.avanzar(7 * 60 + 59);
    assert.equal((await c.estado()).usuario?.id, 'U1', 'a las 7 h 59 min sigue válida');
    s.reloj.avanzar(2);
    assert.equal((await c.estado()).usuario, null, 'pasadas las 8 h, vencida');
    const r = await c.post('/api/accion', { accion: 'crearPunto', args: [punto()] });
    assert.equal(r.status, 401, 'tampoco ejecuta acciones');
    await c.estado();
    const vencidas = s.base.db.prepare("SELECT cuenta_id, fecha FROM accesos WHERE evento = 'sesion_vencida'").all();
    assert.equal(vencidas.length, 1, 'se anota una sola vez');
    assert.equal(vencidas[0].cuenta_id, 'U1');
  } finally { await s.cerrar(); }
});

test('RF-87 salir cierra la sesión del servidor: la misma cookie ya no vale (🔴 no basta con borrarla en el navegador)', async () => {
  const s = await arrancar();
  try {
    const c = s.cliente();
    await c.entrar('tecnico');
    const copia = new Map(c.galleta);
    await c.salir();
    const robado = s.cliente();
    for (const [k, v] of copia) robado.galleta.set(k, v);
    assert.equal((await robado.estado()).usuario, null, 'la cookie guardada antes de salir ya no sirve');
  } finally { await s.cerrar(); }
});

test('RF-88 recuperación: el enlace se guarda como hash, sirve una vez, cambia la clave y cierra las sesiones abiertas', async () => {
  const s = await arrancar();
  try {
    const abierta = s.cliente();
    await abierta.entrar('tecnico');
    const c = s.cliente();
    assert.equal((await c.post('/api/accion', { accion: 'solicitarRecuperacion', args: [CORREOS.tecnico] })).json.resultado.ok, true);
    const correos = (await c.get('/api/bandeja')).json.correos;
    const enlace = correos.find((x) => x.enlace?.startsWith('#/restablecer/')).enlace;
    const token = enlace.split('/').pop();
    assert.equal((await c.get(`/api/token/${token}`)).json.estado, 'valido');
    assert.equal((await c.get('/api/token/inventado')).json.estado, 'invalido');
    const hashes = s.base.db.prepare('SELECT hash FROM tokens').all().map((f) => f.hash);
    assert.deepEqual(hashes, [createHash('sha256').update(token).digest('hex')], 'en la tabla de tokens solo está el hash');
    const NUEVA = 'NuevaClaveSegura2026';
    const mal = await c.accion('restablecer', token, NUEVA, 'otra distinta');
    assert.equal(mal.ok, false);
    assert.equal((await c.accion('restablecer', token, NUEVA, NUEVA)).ok, true);
    assert.equal((await c.get(`/api/token/${token}`)).json.estado, 'usado');
    assert.equal((await c.accion('restablecer', token, NUEVA, NUEVA)).ok, false, 'el enlace sirve una sola vez');
    assert.ok(!JSON.stringify(volcarBase(s.base).usuarios).includes(NUEVA), 'la clave nueva está cifrada en la base');
    assert.equal((await s.cliente().login(CORREOS.tecnico, CLAVE_DEMO)).json.ok, false, 'la vieja ya no entra');
    assert.equal((await s.cliente().login(CORREOS.tecnico, NUEVA)).json.ok, true, 'la nueva sí');
    assert.equal((await abierta.estado()).usuario, null, 'la sesión que estaba abierta se cerró');
  } finally { await s.cerrar(); }
});

test('D7 sin la demostración activa no hay bandeja pública ni enlaces de recuperación guardados', async () => {
  const s = await arrancar({ demo: false });
  try {
    const c = s.cliente();
    assert.equal((await c.get('/api/bandeja')).status, 404);
    assert.equal((await c.get('/api/salud')).json.demo, false);
    await c.accion('solicitarRecuperacion', CORREOS.tecnico);
    const filas = s.base.db.prepare('SELECT datos FROM correos').all();
    assert.equal(filas.length, 1);
    assert.equal(JSON.parse(filas[0].datos).enlace, null, 'el enlace utilizable no se conserva');
  } finally { await s.cerrar(); }
});
