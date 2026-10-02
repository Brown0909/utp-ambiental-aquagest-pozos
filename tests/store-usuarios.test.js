import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, CORREOS } from './helpers.js';

const solicitud = (extra = {}) => ({ nombre: 'Elena', apellido: 'Torres', correo: 'elena.torres@miambiente.gob.pa', unidad: 'Calidad Ambiental', provincia: 'Panamá', cargo: 'Técnico de muestreo', ...extra });

test('RF-11 la solicitud de cuenta valida cada campo', () => {
  const s = crear();
  const vacia = s.solicitarCuenta({});
  for (const c of ['nombre', 'apellido', 'correo', 'unidad', 'provincia', 'cargo']) assert.ok(vacia.errores[c], c);
  assert.match(s.solicitarCuenta(solicitud({ correo: 'elena@gmail.com' })).errores.correo, /institucional/);
  assert.ok(s.solicitarCuenta(solicitud({ nombre: 'E1ena' })).errores.nombre);
  assert.match(s.solicitarCuenta(solicitud({ provincia: 'Narnia' })).errores.provincia, /lista/);
  assert.equal(s.solicitarCuenta(solicitud()).ok, true);
});

test('RF-12 no se repite un correo de usuario ni de solicitud pendiente', () => {
  const s = crear();
  assert.match(s.solicitarCuenta(solicitud({ correo: CORREOS.tecnico.toUpperCase() })).errores.correo, /Ya existe/);
  assert.equal(s.solicitarCuenta(solicitud()).ok, true);
  assert.match(s.solicitarCuenta(solicitud()).errores.correo, /pendiente/);
});

test('RF-13 el Administrador aprueba (crea usuario y deja correo) o rechaza (con motivo)', () => {
  const s = crear();
  s.solicitarCuenta(solicitud());
  s.solicitarCuenta(solicitud({ correo: 'otro.usuario@miambiente.gob.pa', nombre: 'Otro', apellido: 'Usuario' }));
  s.login(CORREOS.tecnico, 'Aqua2026!');
  assert.equal(s.resolverSolicitud('S1', { decision: 'aprobar', rol: 'Laboratorio' }).sinPermiso, true, 'un Técnico no resuelve');
  s.logout();
  s.login(CORREOS.admin, 'Aqua2026!');
  assert.ok(s.resolverSolicitud('S1', { decision: 'aprobar', rol: '' }).errores.rol);
  const ok = s.resolverSolicitud('S1', { decision: 'aprobar', rol: 'Laboratorio' });
  assert.equal(ok.ok, true);
  const nuevo = s.data.usuarios.find((u) => u.correo === 'elena.torres@miambiente.gob.pa');
  assert.deepEqual([nuevo.rol, nuevo.estado, nuevo.nombre], ['Laboratorio', 'Activo', 'Elena Torres']);
  assert.equal(s.data.correos[0].para, nuevo.correo);
  assert.ok(s.resolverSolicitud('S2', { decision: 'rechazar', motivo: 'no' }).errores.motivo);
  assert.equal(s.resolverSolicitud('S2', { decision: 'rechazar', motivo: 'Datos incompletos' }).ok, true);
  assert.equal(s.data.solicitudes[1].estado, 'Rechazada');
  assert.match(s.resolverSolicitud('S1', { decision: 'aprobar', rol: 'Técnico' }).errores._form, /ya fue resuelta/);
});

test('RF-68 invitar: nombre de 2 palabras, correo institucional único, rol y estado válidos', () => {
  const s = crear('admin');
  const v = { nombre: 'Elena Torres', correo: 'elena.torres@miambiente.gob.pa', rol: 'Técnico', estado: 'Activo' };
  assert.ok(s.invitarUsuario({ ...v, nombre: 'Elena' }).errores.nombre);
  assert.ok(s.invitarUsuario({ ...v, correo: 'elena@gmail.com' }).errores.correo);
  assert.match(s.invitarUsuario({ ...v, correo: CORREOS.tecnico }).errores.correo, /Ya existe/);
  assert.ok(s.invitarUsuario({ ...v, rol: 'Jefe' }).errores.rol);
  assert.ok(s.invitarUsuario({ ...v, estado: 'Quizás' }).errores.estado);
  assert.equal(s.invitarUsuario(v).ok, true);
  assert.match(s.invitarUsuario(v).errores.correo, /Ya existe/);
});

test('🔴 RF-16 un rol sin permiso no cambia datos aunque llame la acción directo', () => {
  const s = crear('tecnico');
  const antes = JSON.stringify(s.data.usuarios);
  const r1 = s.invitarUsuario({ nombre: 'Elena Torres', correo: 'elena.torres@miambiente.gob.pa', rol: 'Administrador', estado: 'Activo' });
  const r2 = s.cambiarRol('U1', 'Administrador');
  const r3 = s.cambiarEstado('U3', 'Inactivo');
  for (const r of [r1, r2, r3]) { assert.equal(r.ok, false); assert.equal(r.sinPermiso, true); }
  assert.equal(JSON.stringify(s.data.usuarios), antes);
  const sinSesion = crear();
  assert.equal(sinSesion.cambiarRol('U1', 'Administrador').sinPermiso, true);
});

test('🔴 RF-69 no se desactiva a uno mismo ni al último Administrador activo', () => {
  const s = crear('admin');
  assert.match(s.cambiarEstado('U3', 'Inactivo').errores._form, /propio usuario/);
  assert.match(s.cambiarRol('U3', 'Técnico').errores._form, /último Administrador/);
  s.invitarUsuario({ nombre: 'Pedro Gómez', correo: 'pedro.gomez@miambiente.gob.pa', rol: 'Administrador', estado: 'Activo' });
  const p = s.data.usuarios.find((u) => u.nombre === 'Pedro Gómez');
  assert.equal(s.cambiarRol('U3', 'Técnico').ok, true, 'con otro admin activo sí se puede degradar');
  assert.equal(s.cambiarEstado(p.id, 'Inactivo').sinPermiso, true, 'el permiso se vuelve a comprobar con el rol nuevo de la sesión');
  s.logout();
  s.login('pedro.gomez@miambiente.gob.pa', 'Aqua2026!');
  assert.match(s.cambiarEstado(p.id, 'Inactivo').errores._form, /propio usuario/);
  assert.match(s.cambiarRol(p.id, 'Laboratorio').errores._form, /último Administrador/, 'Pedro quedó como único admin activo');
});

test('RF-70 el Administrador cambia rol y estado de otros', () => {
  const s = crear('admin');
  assert.equal(s.cambiarRol('U1', 'Laboratorio').ok, true);
  assert.equal(s.usuarioPorId('U1').rol, 'Laboratorio');
  assert.equal(s.cambiarEstado('U4', 'Activo').ok, true);
  assert.equal(s.cambiarEstado('U1', 'Inactivo').ok, true);
  assert.equal(s.cambiarRol('U999', 'Técnico').ok, false);
  assert.ok(s.cambiarRol('U1', 'Jefe').errores.rol);
  s.logout();
  assert.equal(s.login(CORREOS.tecnico, 'Aqua2026!').ok, false, 'RF-3: ya está inactivo');
});
