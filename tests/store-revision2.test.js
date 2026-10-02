import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, como, avanzarA } from './helpers.js';

const conResultados = (extra) => { const s = crear(); const folio = avanzarA(s, 'Resultados', extra); como(s, 'admin'); return { s, folio }; };

test('🔴 RF-59 antes de la revisión confirmada NUNCA se muestra Cumple ni No cumple', () => {
  const { s, folio } = conResultados();
  const m = s.muestraPorFolio(folio);
  assert.equal(s.etiquetaEstado(m), 'Pendiente de revisión técnica');
  for (const x of s.data.muestras.filter((q) => !q.revision)) {
    assert.ok(!['Cumple', 'No cumple'].includes(s.etiquetaEstado(x)), x.folio);
  }
  assert.equal(s.estadoMapa(m), 'pendiente');
  s.confirmarRevision(folio, { observaciones: 'Revisado y confirmado por el analista.' });
  assert.equal(s.etiquetaEstado(m), 'Sin criterio aplicable', 'tras confirmar aparece el dictamen');
});

test('RF-60 la revisión registra analista, fecha y dictamen; pide observaciones de 10+ caracteres', () => {
  const { s, folio } = conResultados();
  assert.match(s.confirmarRevision(folio, { observaciones: '' }).errores.observaciones, /obligatorio/);
  assert.match(s.confirmarRevision(folio, { observaciones: 'corto' }).errores.observaciones, /al menos 10/);
  assert.match(s.confirmarRevision(folio, { observaciones: 'x'.repeat(501) }).errores.observaciones, /máximo 500/);
  assert.equal(s.etapaDe(s.muestraPorFolio(folio)), 'Pendiente de revisión técnica', 'los intentos fallidos no avanzan');
  assert.equal(s.confirmarRevision(folio, { observaciones: 'Observaciones suficientes.' }).ok, true);
  const rev = s.muestraPorFolio(folio).revision;
  assert.deepEqual([rev.analistaId, rev.fecha, rev.observaciones], ['U3', '2026-10-02T12:00', 'Observaciones suficientes.']);
  assert.equal(s.etapaDe(s.muestraPorFolio(folio)), 'Revisión confirmada');
  assert.match(s.confirmarRevision(folio, { observaciones: 'Otra vez, sin cambios.' }).errores._form, /ya fue confirmada/);
  assert.match(s.documentarConversion(folio, { nota: 'Demasiado tarde para esto.' }).errores._form, /pendiente/);
});

test('RF-60 no se revisa una muestra sin resultados', () => {
  const s = crear('admin');
  assert.match(s.confirmarRevision('AG-2026-002', { observaciones: 'Observaciones suficientes.' }).errores._form, /todavía no tiene resultados/);
  assert.match(s.confirmarRevision('AG-2026-999', { observaciones: 'Observaciones suficientes.' }).errores._form, /no existe/);
});

test('🔴 RF-16 solo el Administrador confirma la revisión o documenta conversiones', () => {
  const { s, folio } = conResultados();
  for (const rol of ['tecnico', 'laboratorio']) {
    como(s, rol);
    assert.equal(s.confirmarRevision(folio, { observaciones: 'Observaciones suficientes.' }).sinPermiso, true, rol);
    assert.equal(s.documentarConversion(folio, { nota: 'Nota suficientemente larga.' }).sinPermiso, true, rol);
  }
  s.logout();
  assert.equal(s.confirmarRevision(folio, { observaciones: 'Observaciones suficientes.' }).sinPermiso, true);
  assert.equal(s.muestraPorFolio(folio).revision, null);
});

test('el dictamen guarda una copia de las filas evaluadas (el registro no cambia después)', () => {
  const { s, folio } = conResultados();
  s.confirmarRevision(folio, { observaciones: 'Observaciones suficientes.' });
  const rev = s.muestraPorFolio(folio).revision;
  assert.ok(rev.filas.length >= 4);
  assert.ok(rev.filas.every((f) => f.estado === 'sin_criterio'));
});
