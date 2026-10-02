import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, puntoValido } from './helpers.js';

test('RF-24 editar: cambia datos con las mismas validaciones y NO cambia ID ni tipo', () => {
  const s = crear('tecnico');
  const r = s.editarPunto('PZ-018', puntoValido({ tipo: 'Punto', nombre: 'Pozo Alajuela Sur', comunidad: 'Alajuela', profundidad: '11,5', lat: '9.03', lng: '-79.53' }));
  assert.equal(r.ok, true);
  const p = s.puntoPorId('PZ-018');
  assert.deepEqual([p.id, p.tipo, p.nombre, p.profundidad, p.lat], ['PZ-018', 'Pozo', 'Pozo Alajuela Sur', 11.5, 9.03]);
  assert.match(s.editarPunto('PZ-018', puntoValido({ profundidad: '' })).errores.profundidad, /obligatoria/);
  assert.match(s.editarPunto('PZ-018', puntoValido({ lat: '40', lng: '-74' })).errores.lat, /fuera de Panamá/);
  assert.match(s.editarPunto('PT-001', { nombre: 'Planta Potabilizadora Chilibre', comunidad: 'Chilibre', lat: '9.12', lng: '-79.62' }).errores.nombre, /Ya existe/);
  assert.equal(s.editarPunto('PT-001', { nombre: 'Río Chagres - Estación Alajuela', comunidad: 'Alajuela', lat: '9.12', lng: '-79.62' }).ok, true, 'guardarse con su mismo nombre no es duplicado');
  assert.match(s.editarPunto('PZ-999', puntoValido()).errores._form, /no existe/);
});

test('RF-17 listar: búsqueda, filtros, conteo y páginas de 10', () => {
  const s = crear('tecnico');
  const todo = s.listarPuntos();
  assert.deepEqual([todo.total, todo.pozos, todo.puntos, todo.pagina, todo.paginas], [7, 2, 5, 1, 1]);
  assert.deepEqual(s.listarPuntos({ texto: 'chagres' }).items.map((p) => p.id), ['PT-001']);
  assert.deepEqual(s.listarPuntos({ texto: 'pz-018' }).items.map((p) => p.id), ['PZ-018']);
  assert.deepEqual(s.listarPuntos({ texto: 'CHILIBRE' }).items.map((p) => p.id), ['PT-002']);
  assert.equal(s.listarPuntos({ tipo: 'Pozo' }).total, 2);
  assert.equal(s.listarPuntos({ comunidad: 'Alajuela' }).total, 2);
  assert.equal(s.listarPuntos({ texto: 'zzz' }).total, 0);
  assert.deepEqual(s.comunidades(), ['Alajuela', 'Boquete', 'Cerro Punta', 'Chilibre', 'Colón', 'Pacora']);
  for (let i = 0; i < 9; i++) s.crearPunto(puntoValido({ tipo: 'Punto', nombre: `Quebrada ${i + 1}`, profundidad: '' }));
  const p1 = s.listarPuntos();
  assert.deepEqual([p1.total, p1.paginas, p1.items.length], [16, 2, 10]);
  assert.equal(s.listarPuntos({ pagina: 2 }).items.length, 6);
  assert.equal(s.listarPuntos({ pagina: 99 }).pagina, 2, 'una página fuera de rango se acota');
  assert.equal(s.listarPuntos({ pagina: 'x' }).pagina, 1);
});

test('RF-26 pozo con seguimiento pendiente, y deja de serlo al confirmar su revisión', () => {
  const s = crear('admin');
  const antes = s.pozosConSeguimientoPendiente();
  assert.deepEqual(antes.map((x) => x.punto.id), ['PZ-018']);
  assert.deepEqual(antes[0].muestras.map((m) => m.folio), ['AG-2026-081']);
  assert.equal(s.confirmarRevision('AG-2026-081', { observaciones: 'Revisión del seguimiento completada.' }).ok, true);
  assert.deepEqual(s.pozosConSeguimientoPendiente(), []);
});
