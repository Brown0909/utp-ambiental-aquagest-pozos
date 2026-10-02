import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, avanzarA } from './helpers.js';
import { celdaSegura, filasMuestras, filasResultados, filasCustodia, textoFiltros, nombreArchivo } from '../docs/app/js/core/exports.js';

test('RF-62 las filas exportadas son EXACTAMENTE las muestras del filtro vigente', () => {
  const s = crear('tecnico');
  const filtro = { puntoId: 'PZ-018' };
  const muestras = s.historial(filtro).muestras;
  const filas = filasMuestras(s, muestras);
  assert.deepEqual(filas.map((f) => f['Folio']), muestras.map((m) => m.folio));
  assert.deepEqual(filas.map((f) => f['Folio']).sort(), ['AG-2026-080', 'AG-2026-081']);
  assert.equal(filasMuestras(s, s.historial({ puntoId: 'PZ-018', estado: 'Revisión confirmada' }).muestras).length, 0);
  assert.equal(filasMuestras(s, s.historial().muestras).length, 11);
  assert.equal(filasResultados(s, muestras).length, 8, '2 muestras × 4 parámetros');
  assert.equal(filasCustodia(s, muestras).length, 2);
  assert.equal(textoFiltros(s, filtro), 'Punto/pozo: PZ-018 · Pozo Alajuela Norte');
  assert.equal(textoFiltros(s, {}), 'Sin filtros (todas las muestras)');
  assert.match(textoFiltros(s, { desde: '2026-10-01', hasta: '2026-10-02', estado: 'Enviada' }), /01\/10\/2026 a 02\/10\/2026 · Estado: Enviada/);
});

test('🔴 RF-59 el Excel y el PDF tampoco muestran Cumple/No cumple antes de la revisión confirmada', () => {
  const s = crear('tecnico');
  const pendiente = s.historial({ estado: 'Pendiente de revisión técnica' }).muestras;
  assert.equal(pendiente.length, 2);
  for (const f of filasResultados(s, pendiente)) assert.equal(f['Evaluación'], 'Pendiente de revisión técnica');
  for (const f of filasMuestras(s, pendiente)) assert.equal(f['Dictamen (revisión confirmada)'], '');
  const confirmadas = s.historial({ estado: 'Revisión confirmada' }).muestras;
  const dict = filasMuestras(s, confirmadas).map((f) => f['Dictamen (revisión confirmada)']).sort();
  assert.deepEqual(dict, ['Cumple', 'Cumple', 'No cumple', 'No cumple', 'Sin criterio aplicable', 'Sin criterio aplicable']);
  const eval008 = filasResultados(s, [s.muestraPorFolio('AG-2026-008')]);
  assert.equal(eval008.find((f) => f['Parámetro'] === 'Nitrato')['Evaluación'], 'No cumple');
  assert.equal(eval008.find((f) => f['Parámetro'] === 'Conductividad')['Evaluación'], 'Límite no cargado');
});

test('Sin dato: la lluvia ausente se exporta como «Sin dato» y el nitrato conserva su forma', () => {
  const s = crear('tecnico');
  const f = filasMuestras(s, [s.muestraPorFolio('AG-2026-081')])[0];
  assert.deepEqual([f['Lluvia (mm)'], f['Lluvia período'], f['Lluvia fuente']], ['Sin dato', 'Sin dato', 'Sin dato']);
  const n = filasResultados(s, [s.muestraPorFolio('AG-2026-081')]).find((x) => x['Parámetro'] === 'Nitrato');
  assert.deepEqual([n['Resultado'], n['Forma reportada'], n['Unidad']], [4.8, 'NO₃-N', 'mg/L']);
});

test('celdaSegura neutraliza fórmulas (= + @ y - que no es número) y deja pasar números y texto normal', () => {
  assert.equal(celdaSegura('=HYPERLINK("http://x")'), `'=HYPERLINK("http://x")`);
  assert.equal(celdaSegura('+1+1'), "'+1+1");
  assert.equal(celdaSegura('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(celdaSegura('-cmd'), "'-cmd");
  assert.equal(celdaSegura('-12,5'), '-12,5');
  assert.equal(celdaSegura('Pozo Norte'), 'Pozo Norte');
  assert.equal(celdaSegura(4.8), 4.8);
  const s = crear('tecnico');
  s.crearPunto({ tipo: 'Punto', nombre: '=2+2 maligno', comunidad: 'Colón', lat: '9.3', lng: '-79.9' });
  const folio = s.crearMuestra({ puntoId: 'PT-006', fecha: '2026-10-02', hora: '08:00', tecnicoId: 'U1', tipoAgua: 'Agua superficial', objetivo: 'Solo monitoreo', clasificacion: 'referencia', solicitados: ['e_coli'] }).datos.folio;
  assert.equal(filasMuestras(s, [s.muestraPorFolio(folio)])[0]['Punto/pozo'], "'=2+2 maligno");
});

test('nombre del archivo con fecha y hora', () => {
  assert.equal(nombreArchivo('AquaGest_Historial', new Date(2026, 9, 2, 9, 5), 'xlsx'), 'AquaGest_Historial_2026-10-02_0905.xlsx');
});

import { aTextoPdf, lineasPdfMuestra } from '../docs/app/js/core/exports.js';

test('PDF: solo caracteres que las fuentes estándar soportan (subíndices y ≤ se reemplazan)', () => {
  assert.equal(aTextoPdf('≤ 10 mg/L NO₃-N → ok – fin'), '<= 10 mg/L NO3-N -> ok - fin');
  assert.equal(aTextoPdf('Hídrico µS/cm °C · ñ'), 'Hídrico µS/cm °C · ñ');
  assert.equal(aTextoPdf('日本'), '??');
  const s = crear('tecnico');
  for (const m of s.data.muestras) {
    const { lineas } = lineasPdfMuestra(s, m);
    for (const l of lineas) assert.ok(!/[^ -ÿ—•…]/.test(l), `${m.folio}: ${l}`);
  }
});

test('🔴 RF-59 el PDF de una muestra sin revisión dice que NO hay dictamen', () => {
  const s = crear('tecnico');
  const sin = lineasPdfMuestra(s, s.muestraPorFolio('AG-2026-081')).lineas.join('\n');
  assert.match(sin, /Sin dictamen \(revisión técnica pendiente\)/);
  assert.ok(!/Dictamen confirmado/.test(sin));
  const con = lineasPdfMuestra(s, s.muestraPorFolio('AG-2026-008')).lineas.join('\n');
  assert.match(con, /Dictamen confirmado: No cumple/);
  assert.match(con, /Nitrato: 14,2 mg\/L \(como NO3-N\) · Límite: <= 10 mg\/L NO3-N · No cumple/);
  assert.match(lineasPdfMuestra(s, s.muestraPorFolio('AG-2026-002')).lineas.join('\n'), /Sin resultados de laboratorio todavía/);
});
