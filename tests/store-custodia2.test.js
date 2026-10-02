import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, como, avanzarA, envioValido, recepcionValida } from './helpers.js';

test('RF-47 no hay segundo envío, ni recepción sin envío, ni segunda recepción', () => {
  const s = crear();
  const reg = avanzarA(s, 'Registrada');
  como(s, 'laboratorio');
  assert.match(s.confirmarRecepcion(reg, recepcionValida()).errores._form, /todavía no fue enviada/);
  como(s, 'tecnico');
  assert.equal(s.registrarEnvio(reg, envioValido()).ok, true);
  assert.match(s.registrarEnvio(reg, envioValido()).errores._form, /ya fue enviada/);
  como(s, 'laboratorio');
  assert.equal(s.confirmarRecepcion(reg, recepcionValida()).ok, true);
  assert.match(s.confirmarRecepcion(reg, recepcionValida()).errores._form, /ya fue confirmada/);
  como(s, 'tecnico');
  assert.match(s.registrarEnvio('AG-2026-999', envioValido()).errores._form, /no existe/);
});

test('🔴 RF-16 quién puede enviar y quién recibir', () => {
  const s = crear();
  const reg = avanzarA(s, 'Registrada');
  como(s, 'laboratorio');
  assert.equal(s.registrarEnvio(reg, envioValido()).sinPermiso, true, 'Laboratorio no registra envíos');
  como(s, 'tecnico');
  s.registrarEnvio(reg, envioValido());
  assert.equal(s.confirmarRecepcion(reg, recepcionValida()).sinPermiso, true, 'Técnico no confirma recepciones');
  como(s, 'admin');
  assert.equal(s.confirmarRecepcion(reg, recepcionValida()).ok, true, 'Administrador sí');
});

test('RF-40 custodia: búsqueda por folio o pozo, estado y rango de fechas', () => {
  const s = crear('tecnico');
  assert.equal(s.listarCustodia().length, 11);
  assert.deepEqual(s.listarCustodia({ texto: 'ag-2026-081' }).map((m) => m.folio), ['AG-2026-081']);
  assert.equal(s.listarCustodia({ texto: 'pz-018' }).length, 2);
  assert.equal(s.listarCustodia({ texto: 'alajuela norte' }).length, 2);
  assert.deepEqual(s.listarCustodia({ estado: 'Enviada' }).map((m) => m.folio), ['AG-2026-006']);
  assert.equal(s.listarCustodia({ estado: 'Registrada' }).length, 1);
  assert.equal(s.listarCustodia({ desde: '2026-10-01', hasta: '2026-10-02' }).length, 3);
  assert.equal(s.listarCustodia({ texto: 'zzz' }).length, 0);
});
