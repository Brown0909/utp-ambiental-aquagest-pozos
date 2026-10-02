import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertirNitrato, FACTOR_NO3_A_NO3N } from '../docs/app/js/core/units.js';
import { combinacionValida, tipoAguaParaRegistro, normativaAplicable, limitesPara, evaluar } from '../docs/app/js/core/normativa.js';

const potable = (extra = {}) => ({ tipoAgua: 'Agua potable', objetivo: 'Consumo humano', campo: { ph: 7.2 }, ...extra });
const res = (valores) => ({ valores });

test('conversión NO3 <-> NO3-N con factor 4,43, ida y vuelta', () => {
  assert.equal(FACTOR_NO3_A_NO3N, 4.43);
  assert.ok(Math.abs(convertirNitrato(44.3, 'NO3', 'NO3-N') - 10) < 1e-9);
  assert.ok(Math.abs(convertirNitrato(10, 'NO3-N', 'NO3') - 44.3) < 1e-9);
  assert.equal(convertirNitrato(7, 'NO3', 'NO3'), 7);
  assert.throws(() => convertirNitrato(1, 'X', 'NO3'));
});

test('RF-32 combinaciones tipo de agua / objetivo', () => {
  assert.equal(combinacionValida('Agua potable', 'Consumo humano'), null);
  assert.equal(combinacionValida('Agua residual', 'Descarga'), null);
  assert.equal(combinacionValida('Agua residual tratada', 'Reutilización'), null);
  assert.equal(combinacionValida('Agua residual', 'Solo monitoreo'), null);
  assert.match(combinacionValida('Agua residual', 'Consumo humano'), /residuales/);
  assert.match(combinacionValida('Agua potable', 'Descarga'), /residuales/);
  assert.match(combinacionValida('Agua residual', 'Reutilización'), /tratada/);
});

test('RF-31 compatibilidad con el tipo de registro', () => {
  assert.equal(tipoAguaParaRegistro('Pozo', 'Subterránea/Pozo'), null);
  assert.equal(tipoAguaParaRegistro('Pozo', 'Agua potable'), null);
  assert.match(tipoAguaParaRegistro('Pozo', 'Agua residual'), /pozo solo admite/);
  assert.match(tipoAguaParaRegistro('Punto', 'Subterránea/Pozo'), /solo se usa en pozos/);
  assert.equal(tipoAguaParaRegistro('Punto', 'Agua superficial'), null);
});

test('RF-33 normativa aplicable', () => {
  assert.equal(normativaAplicable('Subterránea/Pozo', 'Solo monitoreo').texto, 'Sin criterio aplicable');
  assert.equal(normativaAplicable('Agua potable', 'Consumo humano').texto, 'COPANIT 21-2019');
  assert.equal(normativaAplicable('Agua residual', 'Descarga').texto, 'COPANIT 35-2019');
  assert.equal(normativaAplicable('Agua residual tratada', 'Reutilización').texto, 'COPANIT 24-99');
  assert.equal(normativaAplicable('Agua superficial', 'Consumo humano').estado, 'no_definida');
});

test('RF-55 solo monitoreo: todo «Sin criterio» y NUNCA cumple/no cumple', () => {
  const m = { tipoAgua: 'Subterránea/Pozo', objetivo: 'Solo monitoreo', campo: { ph: 3 } };
  const r = evaluar(m, res({ nitrato: { valor: 999, forma: 'NO3-N' }, e_coli: { valor: 50 } }));
  assert.ok(r.filas.every((f) => f.estado === 'sin_criterio'));
  assert.equal(r.dictamen.valor, 'Sin criterio aplicable');
  assert.ok(!r.filas.some((f) => f.key === 'ph_campo'), 'el pH de campo tampoco se evalúa');
});

test('RF-54 potable que cumple: cada parámetro con su límite', () => {
  const r = evaluar(potable(), res({ nitrato: { valor: 4.8, forma: 'NO3-N' }, e_coli: { valor: 0 }, coliformes_totales: { valor: 2 }, conductividad: { valor: 420 } }));
  const por = Object.fromEntries(r.filas.map((f) => [f.key, f]));
  assert.equal(por.nitrato.estado, 'cumple');
  assert.equal(por.e_coli.estado, 'cumple');
  assert.equal(por.coliformes_totales.estado, 'cumple');
  assert.equal(por.conductividad.estado, 'sin_limite');      // RF-56
  assert.equal(por.conductividad.limiteTexto, 'Límite no cargado');
  assert.equal(por.ph_campo.estado, 'cumple');
  assert.equal(r.dictamen.valor, 'Cumple');
  assert.equal(r.dictamen.parcial, true, 'hay un parámetro sin límite');
});

test('potable que NO cumple: E. coli, coliformes, nitrato y pH fuera', () => {
  const r = evaluar(potable({ campo: { ph: 5.2 } }), res({ nitrato: { valor: 12.4, forma: 'NO3-N' }, e_coli: { valor: 1 }, coliformes_totales: { valor: 4 } }));
  assert.ok(r.filas.every((f) => f.estado === 'no_cumple'));
  assert.equal(r.dictamen.valor, 'No cumple');
  assert.equal(evaluar(potable({ tipoAgua: 'Subterránea/Pozo' }), res({ coliformes_totales: { valor: 10 } })).filas[0].estado, 'cumple', 'pozo: tope 10');
  assert.equal(evaluar(potable(), res({ coliformes_totales: { valor: 4 } })).filas[0].estado, 'no_cumple', 'distribución: tope 3');
});

test('🔴 RF-57 forma distinta SIN conversión documentada: no compara y bloquea', () => {
  const r = evaluar(potable(), res({ nitrato: { valor: 12, forma: 'NO3' } }));
  const n = r.filas.find((f) => f.key === 'nitrato');
  assert.equal(n.estado, 'requiere_conversion');
  assert.equal(r.dictamen.bloqueado, true);
  assert.equal(r.dictamen.valor, null);
  // la prueba muerde: si el código comparara 12 contra 10 daría «no cumple»; aquí NO debe dar eso
  assert.notEqual(n.estado, 'no_cumple');
});

test('RF-58 con conversión documentada: convierte, conserva el original y compara', () => {
  const conv = { documentada: true, nota: 'Factor estándar 62/14' };
  const ok = evaluar(potable(), res({ nitrato: { valor: 12, forma: 'NO3' } }), conv);   // 12/4,43 = 2,71 -> cumple
  const n = ok.filas.find((f) => f.key === 'nitrato');
  assert.equal(n.estado, 'cumple');
  assert.equal(n.valor, 12, 'el valor original no se toca');
  assert.ok(Math.abs(n.comparado - 2.7088) < 0.001);
  assert.match(n.nota, /factor 4.43/);
  const mal = evaluar(potable(), res({ nitrato: { valor: 50, forma: 'NO3' } }), conv);  // 50/4,43 = 11,29 -> no cumple
  assert.equal(mal.filas.find((f) => f.key === 'nitrato').estado, 'no_cumple');
});

test('descarga y reutilización: reglamento definido pero SIN límites cargados', () => {
  assert.deepEqual(limitesPara('Agua residual', 'Descarga'), {});
  const r = evaluar({ tipoAgua: 'Agua residual', objetivo: 'Descarga', campo: {} }, res({ conductividad: { valor: 900 } }));
  assert.equal(r.filas[0].estado, 'sin_limite');
  assert.equal(r.dictamen.valor, 'Sin criterio aplicable');
  assert.match(r.dictamen.motivos[0], /Ningún parámetro/);
});

test('combinación no definida: sin criterio, sin dictamen de cumplimiento', () => {
  const r = evaluar({ tipoAgua: 'Agua superficial', objetivo: 'Consumo humano', campo: {} }, res({ e_coli: { valor: 5 } }));
  assert.equal(r.filas[0].estado, 'sin_criterio');
  assert.equal(r.dictamen.valor, 'Sin criterio aplicable');
});
