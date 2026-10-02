import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, como, avanzarA, resultadosValidos, recepcionValida, envioValido } from './helpers.js';

// Muestra de agua potable para consumo humano en el punto PT-002, con resultados ya cargados.
function potable(resultados = {}, campo = { ph: '7,2' }) {
  const s = crear();
  como(s, 'tecnico');
  const folio = s.crearMuestra({ puntoId: 'PT-002', fecha: '2026-10-02', hora: '08:00', tecnicoId: 'U1', tipoAgua: 'Agua potable', objetivo: 'Consumo humano', clasificacion: 'referencia', solicitados: ['nitrato', 'conductividad', 'coliformes_totales', 'e_coli'], ...campo }).datos.folio;
  s.registrarEnvio(folio, envioValido());
  como(s, 'laboratorio');
  s.confirmarRecepcion(folio, recepcionValida());
  assert.equal(s.guardarResultados(folio, resultadosValidos(resultados)).ok, true);
  como(s, 'admin');
  return { s, folio };
}

test('RF-54 cada parámetro con su resultado, el límite aplicado y el reglamento', () => {
  const { s, folio } = potable();
  const ev = s.evaluacionDe(folio);
  assert.equal(ev.normativa.texto, 'COPANIT 21-2019');
  assert.deepEqual(ev.filas.map((f) => f.key), ['conductividad', 'coliformes_totales', 'e_coli', 'nitrato', 'ph_campo']);
  assert.equal(ev.filas.find((f) => f.key === 'nitrato').limiteTexto, '≤ 10 mg/L NO₃-N');
  assert.equal(s.evaluacionDe('AG-2026-003') && true, true);
  assert.equal(s.evaluacionDe('AG-2026-002'), null, 'sin resultados no hay evaluación');
});

test('RF-55 solo monitoreo: «Sin criterio» y la revisión confirmada NO dice Cumple ni No cumple', () => {
  const s = crear();
  const folio = avanzarA(s, 'Resultados', { solicitados: ['nitrato', 'e_coli'] });   // PZ-018, solo monitoreo
  como(s, 'admin');
  assert.ok(s.evaluacionDe(folio).filas.every((f) => f.estado === 'sin_criterio'));
  s.confirmarRevision(folio, { observaciones: 'Solo monitoreo, sin dictamen.' });
  assert.equal(s.muestraPorFolio(folio).revision.dictamen, 'Sin criterio aplicable');
});

test('🔴 RF-57 nitrato en otra forma SIN conversión documentada: no compara y la confirmación se bloquea', () => {
  const { s, folio } = potable({ nitrato: '50', nitratoForma: 'NO3' });
  const n = s.evaluacionDe(folio).filas.find((f) => f.key === 'nitrato');
  assert.equal(n.estado, 'requiere_conversion');
  const r = s.confirmarRevision(folio, { observaciones: 'Intento de confirmar sin convertir.' });
  assert.equal(r.ok, false);
  assert.equal(r.bloqueada, true);
  assert.match(r.errores._form, /conversión/);
  assert.equal(s.muestraPorFolio(folio).revision, null, 'la muestra sigue sin revisión confirmada');
});

test('RF-58 con conversión documentada compara (50 mg/L NO3 ≈ 11,3 NO3-N → No cumple) y conserva el valor original', () => {
  const { s, folio } = potable({ nitrato: '50', nitratoForma: 'NO3' });
  assert.ok(s.documentarConversion(folio, { nota: 'corta' }).errores.nota);
  assert.equal(s.documentarConversion(folio, { nota: 'Factor 4,43 (62/14) según criterio del analista.' }).ok, true);
  assert.match(s.documentarConversion(folio, { nota: 'Segunda vez con otra nota' }).errores._form, /ya fue documentada/);
  const ev = s.evaluacionDe(folio);
  const n = ev.filas.find((f) => f.key === 'nitrato');
  assert.equal(n.estado, 'no_cumple');
  assert.equal(n.valor, 50, 'el valor original no se modificó');
  assert.equal(s.confirmarRevision(folio, { observaciones: 'No cumple por nitrato convertido.' }).ok, true);
  assert.equal(s.muestraPorFolio(folio).revision.dictamen, 'No cumple');
  assert.equal(s.muestraPorFolio(folio).resultados.valores.nitrato.forma, 'NO3');
});

test('RF-58 no se documenta una conversión que no hace falta', () => {
  const { s, folio } = potable();                            // nitrato ya viene como NO3-N
  assert.match(s.documentarConversion(folio, { nota: 'Nota larga y suficiente.' }).errores._form, /No hace falta/);
});
