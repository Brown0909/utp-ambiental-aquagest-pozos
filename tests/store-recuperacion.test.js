import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, CORREOS, CLAVE_DEMO } from './helpers.js';
import { MENSAJE_RECUPERACION } from '../docs/app/js/core/store-acceso.js';

function enlaceDe(s, correo) {
  s.solicitarRecuperacion(correo);
  return s.data.correos[0].enlace.split('/').pop();
}

test('RF-5 y RF-6 recuperación: mismo mensaje exista o no el correo; solo el real deja correo', () => {
  const s = crear();
  const real = s.solicitarRecuperacion(CORREOS.tecnico);
  const falso = s.solicitarRecuperacion('nadie@miambiente.gob.pa');
  const inactivo = s.solicitarRecuperacion(CORREOS.inactivo);
  assert.equal(real.datos.mensaje, MENSAJE_RECUPERACION);
  assert.equal(falso.datos.mensaje, real.datos.mensaje);
  assert.equal(inactivo.datos.mensaje, real.datos.mensaje);
  assert.equal(s.data.correos.length, 1);
  assert.equal(s.data.correos[0].para, CORREOS.tecnico);
  assert.match(s.data.correos[0].enlace, /^#\/restablecer\/[0-9a-f]{32}$/);
  assert.equal(s.solicitarRecuperacion('mal').ok, false);
  assert.match(s.solicitarRecuperacion('a@gmail.com').errores.correo, /institucional/);
});

test('🔴 RF-7 el enlace sirve UNA vez y solo 30 minutos', () => {
  const s = crear();
  const t1 = enlaceDe(s, CORREOS.tecnico);
  assert.equal(s.estadoToken(t1), 'valido');
  assert.equal(s.restablecer(t1, 'NuevaClave1', 'NuevaClave1').ok, true);
  assert.equal(s.estadoToken(t1), 'usado');
  assert.match(s.restablecer(t1, 'OtraClave22', 'OtraClave22').errores._form, /ya fue usado/);
  assert.equal(s.login(CORREOS.tecnico, 'NuevaClave1').ok, true, 'la clave nueva funciona');
  s.logout();
  assert.equal(s.login(CORREOS.tecnico, CLAVE_DEMO).ok, false, 'la clave vieja ya no');
  const t2 = enlaceDe(s, CORREOS.laboratorio);
  s.avanzar(31);
  assert.equal(s.estadoToken(t2), 'vencido');
  assert.match(s.restablecer(t2, 'NuevaClave1', 'NuevaClave1').errores._form, /venció/);
  assert.match(s.restablecer('inventado', 'NuevaClave1', 'NuevaClave1').errores._form, /no es válido/);
  const t3 = enlaceDe(s, CORREOS.admin);
  s.avanzar(29);
  assert.equal(s.estadoToken(t3), 'valido', 'a los 29 minutos aún sirve');
});

test('RF-8 política de contraseña y confirmación', () => {
  const s = crear();
  const t = enlaceDe(s, CORREOS.tecnico);
  assert.ok(s.restablecer(t, 'corta', 'corta').errores.nueva);
  assert.ok(s.restablecer(t, 'sinmayuscula1', 'sinmayuscula1').errores.nueva);
  assert.match(s.restablecer(t, 'NuevaClave1', 'OtraClave22').errores.confirmacion, /no coinciden/);
  assert.equal(s.estadoToken(t), 'valido', 'un intento fallido no gasta el enlace');
});
