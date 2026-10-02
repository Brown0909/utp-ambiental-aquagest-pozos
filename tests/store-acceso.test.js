import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, CORREOS, CLAVE_DEMO } from './helpers.js';

test('RF-1 el acceso valida formato, dominio y contraseña vacía sin intentar entrar', () => {
  const s = crear();
  assert.ok(s.login('', '').errores.correo && s.login('', '').errores.password);
  assert.match(s.login('carlos', 'x').errores.correo, /correo válido/);
  assert.match(s.login('carlos@gmail.com', 'x').errores.correo, /institucional/);
  assert.ok(s.login(CORREOS.tecnico, '').errores.password);
  assert.equal(s.usuario, null);
});

test('RF-2 error genérico: no dice si falla el correo o la contraseña', () => {
  const s = crear();
  const a = s.login(CORREOS.tecnico, 'incorrecta');
  const b = s.login('nadie@miambiente.gob.pa', CLAVE_DEMO);
  assert.equal(a.errores._form, 'Correo o contraseña incorrectos.');
  assert.equal(b.errores._form, a.errores._form);
});

test('login correcto, sin importar mayúsculas del correo; y RF-9 cerrar sesión', () => {
  const s = crear();
  assert.equal(s.login('CARLOS.CHEN@MiAmbiente.gob.pa', CLAVE_DEMO).ok, true);
  assert.equal(s.usuario.rol, 'Técnico');
  s.logout();
  assert.equal(s.usuario, null);
});

test('🔴 RF-3 usuario Inactivo con la contraseña correcta NO entra y se le informa', () => {
  const s = crear();
  const r = s.login(CORREOS.inactivo, CLAVE_DEMO);
  assert.equal(r.ok, false);
  assert.match(r.errores._form, /inactivo/);
  assert.equal(s.usuario, null);
  assert.equal(s.login(CORREOS.inactivo, 'mala').errores._form, 'Correo o contraseña incorrectos.', 'con clave mala no se revela el estado');
});

test('🔴 RF-4 cinco fallos seguidos bloquean 60 s; luego se puede otra vez', () => {
  const s = crear();
  for (let i = 0; i < 5; i++) assert.equal(s.login(CORREOS.tecnico, 'mala').ok, false);
  const bloqueado = s.login(CORREOS.tecnico, CLAVE_DEMO);   // aun con la clave correcta
  assert.equal(bloqueado.ok, false);
  assert.equal(bloqueado.bloqueado, true);
  assert.ok(bloqueado.segundos <= 60);
  assert.equal(s.login(CORREOS.admin, CLAVE_DEMO).ok, true, 'otro correo no se afecta');
  s.logout();
  s.avanzar(61 / 60);                                        // 61 segundos
  assert.equal(s.login(CORREOS.tecnico, CLAVE_DEMO).ok, true);
});

test('RF-4 un acierto reinicia la cuenta de fallos', () => {
  const s = crear();
  for (let i = 0; i < 4; i++) s.login(CORREOS.tecnico, 'mala');
  assert.equal(s.login(CORREOS.tecnico, CLAVE_DEMO).ok, true);
  s.logout();
  for (let i = 0; i < 4; i++) s.login(CORREOS.tecnico, 'mala');
  assert.equal(s.login(CORREOS.tecnico, CLAVE_DEMO).ok, true, 'no llegó a 5 seguidos');
});
