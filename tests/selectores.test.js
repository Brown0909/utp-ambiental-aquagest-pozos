import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, avanzarA, como } from './helpers.js';

test('RF-63 el mapa pinta cada punto con el estado de su ÚLTIMA muestra y marca las recientes (≤72 h)', () => {
  const s = crear('tecnico');
  const mapa = Object.fromEntries(s.puntosParaMapa().map((x) => [x.punto.id, x]));
  assert.equal(mapa['PZ-019'].estado, 'no_cumple');
  assert.equal(mapa['PT-005'].estado, 'cumple');
  assert.equal(mapa['PT-001'].estado, 'sin_criterio');
  assert.equal(mapa['PT-004'].estado, 'sin_criterio');
  assert.equal(mapa['PZ-018'].estado, 'pendiente');
  assert.equal(mapa['PT-002'].estado, 'pendiente');
  assert.equal(mapa['PZ-018'].muestra.folio, 'AG-2026-081', 'la última, no la referencia');
  assert.equal(mapa['PZ-018'].reciente, true);
  assert.equal(mapa['PT-001'].reciente, false, 'su última muestra es de hace 8 días');
  assert.equal(mapa['PZ-019'].reciente, false);
  const nuevo = crear('tecnico');
  nuevo.crearPunto({ tipo: 'Punto', nombre: 'Punto sin muestras', comunidad: 'Colón', lat: '9.3', lng: '-79.9' });
  assert.equal(nuevo.puntosParaMapa().find((x) => x.punto.nombre === 'Punto sin muestras').estado, 'sin_muestras');
});

test('RF-63 «pendiente» pasa a Cumple/No cumple solo al confirmar la revisión', () => {
  const s = crear();
  const folio = avanzarA(s, 'Resultados', { puntoId: 'PT-005', tipoAgua: 'Agua potable', objetivo: 'Consumo humano', solicitados: ['e_coli'] });
  const estado = () => s.puntosParaMapa().find((x) => x.punto.id === 'PT-005').estado;
  assert.equal(estado(), 'pendiente', 'la muestra nueva es la última de ese punto y aún no tiene revisión');
  como(s, 'admin');
  s.confirmarRevision(folio, { observaciones: 'Confirmada por el analista.' });
  assert.equal(estado(), 'cumple', 'E. coli 0 en agua potable');
});

test('RF-64 el mapa se filtra por tipo de registro, tipo de agua, estado y fecha', () => {
  const s = crear('tecnico');
  const ids = (f) => s.puntosParaMapa(f).map((x) => x.punto.id).sort();
  assert.deepEqual(ids({ tipoRegistro: 'Pozo' }), ['PZ-018', 'PZ-019']);
  assert.deepEqual(ids({ tipoAgua: 'Agua residual tratada' }), ['PT-003']);
  assert.deepEqual(ids({ estado: 'no_cumple' }), ['PZ-019']);
  assert.deepEqual(ids({ estado: 'cumple' }), ['PT-005']);
  assert.deepEqual(ids({ desde: '2026-10-01' }), ['PT-002', 'PT-003', 'PZ-018']);
  assert.deepEqual(ids({ estado: 'cumple', tipoRegistro: 'Pozo' }), []);
});

test('RF-65 el panel cuenta las muestras de los últimos 30 días', () => {
  const k = crear('tecnico').kpis();
  assert.deepEqual([k.total, k.cumplen, k.noCumplen, k.sinCriterio, k.revisadas], [11, 2, 2, 2, 6]);
  assert.deepEqual([k.pendientesLab, k.pendientesRevision], [3, 2]);
  assert.deepEqual(k.distribucion.map((d) => d.n), [2, 2, 2, 5]);
  assert.equal(k.distribucion.reduce((a, d) => a + d.n, 0), k.total, 'la barra suma el total');
  const s = crear('tecnico');
  s.avanzar(40 * 24 * 60);                                   // 40 días después: nada cae en la ventana
  assert.equal(s.kpis().total, 0);
  assert.deepEqual(s.kpis().distribucion.map((d) => d.pct), [0, 0, 0, 0], 'sin división por cero');
  assert.deepEqual(crear('tecnico').ultimasMuestras(3).map((m) => m.folio), ['AG-2026-002', 'AG-2026-081', 'AG-2026-006']);
});

test('RF-66 alertas: pH, análisis > 48 h, envío > 24 h sin recepción y revisión pendiente', () => {
  const s = crear('tecnico');
  const al = s.alertas();
  assert.equal(al[0].nivel, 'critica', 'las críticas van primero');
  assert.match(al[0].texto, /AG-2026-005.*pH de 5,2.*6,5–8,5/);
  const por = (t) => al.find((a) => a.titulo === t);
  assert.match(por('Análisis retrasado').texto, /AG-2026-007.*48 horas/);
  assert.match(por('Recepción pendiente').texto, /AG-2026-006.*24 horas/);
  assert.match(por('Revisión técnica pendiente').texto, /PZ-018 tiene 2 muestras con resultados recibidos/);
  assert.equal(al.length, 4);
  assert.ok(!al.some((a) => a.folio === 'AG-2026-081' && a.nivel === 'critica'), 'el pH de un pozo en solo monitoreo no alerta');
});

test('RF-61 historial filtrado y rango invertido rechazado', () => {
  const s = crear('tecnico');
  assert.equal(s.historial().muestras.length, 11);
  assert.deepEqual(s.historial({ puntoId: 'PZ-018' }).muestras.map((m) => m.folio), ['AG-2026-081', 'AG-2026-080']);
  assert.equal(s.historial({ tipoAgua: 'Agua potable' }).muestras.length, 4);
  assert.equal(s.historial({ estado: 'Revisión confirmada' }).muestras.length, 6);
  assert.deepEqual(s.historial({ desde: '2026-10-01', hasta: '2026-10-02' }).muestras.map((m) => m.folio), ['AG-2026-002', 'AG-2026-081', 'AG-2026-006']);
  assert.equal(s.historial({ desde: '2026-10-02', hasta: '2026-10-02' }).muestras.length, 2, 'mismo día vale');
  const inv = s.historial({ desde: '2026-10-02', hasta: '2026-10-01' });
  assert.match(inv.errores.hasta, /no puede ser anterior/);
  assert.deepEqual(inv.muestras, []);
});

test('RF-25 cronología: pasos con responsable y fecha, y «En curso» si falta la revisión', () => {
  const s = crear('tecnico');
  const pasos = s.cronologia(s.muestraPorFolio('AG-2026-081'));
  assert.deepEqual(pasos.map((p) => p.clave), ['registrada', 'enviada', 'recibida', 'resultados', 'pendiente']);
  assert.equal(pasos[0].responsable, 'Ing. Carlos Chen');
  assert.equal(pasos[2].responsable, 'Lic. Ana Rodríguez');
  assert.equal(pasos[4].enCurso, true);
  assert.equal(s.cronologia(s.muestraPorFolio('AG-2026-001')).at(-1).clave, 'revision');
  assert.equal(s.cronologia(s.muestraPorFolio('AG-2026-002')).length, 1);
});
