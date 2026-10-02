import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, como, avanzarA, envioValido, recepcionValida } from './helpers.js';

test('RF-41 el envío guarda responsable, fecha, hora, origen y destino', () => {
  const s = crear();
  const folio = avanzarA(s, 'Registrada');
  como(s, 'tecnico');
  assert.equal(s.registrarEnvio(folio, envioValido()).ok, true);
  const e = s.muestraPorFolio(folio).custodia.envio;
  assert.deepEqual([e.fechaHora, e.responsableId, e.destino], ['2026-10-02T09:00', 'U1', 'Laboratorio — MiAMBIENTE']);
  assert.match(e.origen, /^PZ-018 · Pozo Alajuela Norte$/);
  assert.equal(s.etapaDe(s.muestraPorFolio(folio)), 'Enviada');
});

test('RF-42 el envío no puede ser anterior a la muestra ni futuro, y pide destino de la lista', () => {
  const s = crear();
  const folio = avanzarA(s, 'Registrada');                 // muestra a las 08:00
  como(s, 'tecnico');
  assert.match(s.registrarEnvio(folio, envioValido({ hora: '07:59' })).errores.fecha, /anterior a la toma/);
  assert.match(s.registrarEnvio(folio, envioValido({ hora: '12:01' })).errores.fecha, /futur/);
  assert.match(s.registrarEnvio(folio, envioValido({ fecha: '2026-10-03' })).errores.fecha, /futur/);
  assert.ok(s.registrarEnvio(folio, envioValido({ destino: 'Mi casa' })).errores.destino);
  assert.ok(s.registrarEnvio(folio, { fecha: '', hora: '', destino: '' }).errores.hora);
  assert.equal(s.etapaDe(s.muestraPorFolio(folio)), 'Registrada', 'ningún intento fallido cambió nada');
  assert.equal(s.registrarEnvio(folio, envioValido({ hora: '08:00' })).ok, true, 'justo a la hora de la muestra vale');
});

test('RF-43 la recepción guarda responsable, fecha, hora, condición e incidencias', () => {
  const s = crear();
  const folio = avanzarA(s, 'Enviada');
  como(s, 'laboratorio');
  assert.equal(s.confirmarRecepcion(folio, recepcionValida()).ok, true);
  const r = s.muestraPorFolio(folio).custodia.recepcion;
  assert.deepEqual([r.fechaHora, r.responsableId, r.condicion, r.laboratorio], ['2026-10-02T10:00', 'U2', 'Envases íntegros y rotulados', 'Laboratorio — MiAMBIENTE']);
  assert.equal(s.etapaDe(s.muestraPorFolio(folio)), 'Recibida en laboratorio');
});

test('RF-44 si la condición no es «íntegros y rotulados» se exige describir la incidencia', () => {
  const s = crear();
  const folio = avanzarA(s, 'Enviada');
  como(s, 'laboratorio');
  assert.match(s.confirmarRecepcion(folio, recepcionValida({ condicion: 'Envases dañados', incidencias: '' })).errores.incidencias, /Describa la incidencia/);
  assert.ok(s.confirmarRecepcion(folio, recepcionValida({ condicion: 'Envases dañados', incidencias: 'rota' })).errores.incidencias);
  assert.ok(s.confirmarRecepcion(folio, recepcionValida({ condicion: 'Cualquier cosa' })).errores.condicion);
  const ok = s.confirmarRecepcion(folio, recepcionValida({ condicion: 'Envases dañados', incidencias: 'Un envase llegó roto' }));
  assert.equal(ok.ok, true);
  assert.equal(s.muestraPorFolio(folio).custodia.recepcion.incidencias, 'Un envase llegó roto');
});

test('RF-45 y RF-46 la recepción no precede al envío ni es futura; responsable Laboratorio o Administrador activo', () => {
  const s = crear();
  const folio = avanzarA(s, 'Enviada');                      // envío 09:00
  como(s, 'laboratorio');
  assert.match(s.confirmarRecepcion(folio, recepcionValida({ hora: '08:59' })).errores.fecha, /anterior al envío/);
  assert.match(s.confirmarRecepcion(folio, recepcionValida({ hora: '12:30' })).errores.fecha, /futur/);
  for (const id of ['U1', 'U4', 'U999', '']) assert.ok(s.confirmarRecepcion(folio, recepcionValida({ responsableId: id })).errores.responsableId, id);
  assert.equal(s.confirmarRecepcion(folio, recepcionValida({ responsableId: 'U3' })).ok, true, 'un Administrador también puede');
});
