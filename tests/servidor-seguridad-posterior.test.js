// Regresiones de la revisión de seguridad automática del 28-oct-2026 sobre la Spec 004 (reglas 15 y 18 de José).
// 1) La bandeja simulada devolvía enlaces de recuperación utilizables a cualquiera de la red.
// 2) Llenar la memoria de intentos con correos inventados borraba el bloqueo de una cuenta real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Base } from '../server/db.js';
import { Almacen } from '../server/almacen.js';
import { esPeticionLocal, puedeVerBandeja } from '../server/http.js';
import { CORREOS, CLAVE_DEMO, crearReloj } from './servidor-helpers.js';

const desde = (remoteAddress) => ({ socket: { remoteAddress } });

test('bandeja: solo el mismo computador del servidor cuenta como local', () => {
  for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) assert.equal(esPeticionLocal(desde(ip)), true, ip);
  for (const ip of ['192.168.0.178', '10.0.0.5', '::ffff:192.168.0.178', undefined, '']) assert.equal(esPeticionLocal(desde(ip)), false, String(ip));
  assert.equal(esPeticionLocal({}), false);
});

test('bandeja: desde otra PC solo la ve un Administrador con sesión', () => {
  const almacen = new Almacen({ base: new Base(':memory:'), demo: true, reloj: crearReloj() });
  const remota = desde('192.168.0.178');
  assert.equal(puedeVerBandeja(remota, almacen, null), false, 'sin sesión');
  assert.equal(puedeVerBandeja(remota, almacen, 'U1'), false, 'Técnico');
  assert.equal(puedeVerBandeja(remota, almacen, 'U2'), false, 'Laboratorio');
  assert.equal(puedeVerBandeja(remota, almacen, 'U999'), false, 'sesión de un usuario que no existe');
  assert.equal(puedeVerBandeja(remota, almacen, 'U3'), true, 'Administrador');
  assert.equal(puedeVerBandeja(desde('127.0.0.1'), almacen, null), true, 'desde el propio servidor, sin sesión');
});

test('bloqueo: llenar la memoria con correos inventados NO desbloquea a una cuenta real', async () => {
  const reloj = crearReloj();
  const almacen = new Almacen({ base: new Base(':memory:'), demo: false, reloj, maxIntentosEnMemoria: 10 });
  const cliente = { ip: '10.0.0.9', navegador: 'prueba' };
  for (let i = 0; i < 5; i += 1) await almacen.login(CORREOS.tecnico, 'incorrecta-' + i, cliente);
  const bloqueada = await almacen.login(CORREOS.tecnico, CLAVE_DEMO, cliente);
  assert.equal(bloqueada.resultado.ok, false);
  assert.equal(bloqueada.resultado.bloqueado, true, 'tras 5 fallos la cuenta está bloqueada aun con la clave buena');
  for (let i = 0; i < 40; i += 1) await almacen.login(`inventado${i}@miambiente.gob.pa`, 'x', cliente);
  const despues = await almacen.login(CORREOS.tecnico, CLAVE_DEMO, cliente);
  assert.equal(despues.resultado.ok, false, 'el bloqueo sigue aunque se llenó la memoria de intentos');
  assert.equal(despues.resultado.bloqueado, true);
  assert.ok(Object.keys(almacen.store.data.intentos).length <= 20, 'la poda sí limita la memoria con correos inventados');
  reloj.avanzar(2);
  assert.equal((await almacen.login(CORREOS.tecnico, CLAVE_DEMO, cliente)).resultado.ok, true, 'pasado el minuto, entra');
});
