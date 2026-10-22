import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, puntoValido } from './helpers.js';
import {
  parsearCsv, validarFilaHistorica, serieMensual, resumenAnual, correlacionLluviaNitrato,
  compararReferenciaSeguimiento, construirHistoricoEjemplo, plantillaCsv,
} from '../docs/app/js/core/historico.js';

const AHORA = '2026-10-02T12:00';
const CSV = 'punto_id,periodo,nitrato,forma_nitrato,lluvia_mm,caudal_ls,fuente\n';

test('el histórico de ejemplo es ficticio, determinista y marcado como tal', () => {
  const a = construirHistoricoEjemplo(new Date(2026, 9, 2));
  const b = construirHistoricoEjemplo(new Date(2026, 9, 2));
  assert.deepEqual(a, b);
  assert.equal(a.length, 60);
  assert.ok(a.every((h) => h.origen === 'ejemplo' && /ficticio/.test(h.fuente)));
  assert.equal(a.at(-1).periodo, '2026-09', 'llega hasta el mes anterior, nunca al futuro');
});

test('CSV: acepta coma y punto y coma, comillas y BOM; rechaza columnas raras o faltantes', () => {
  assert.equal(parsearCsv(`\uFEFF${CSV}PZ-018,2025-03,4.2,NO3-N,120,1.4,IMHPA\n`).filas.length, 1);
  const pyc = parsearCsv('periodo;nitrato;forma_nitrato;fuente\n2025-03;4,2;NO3-N;"IMHPA; estación 1"\n');
  assert.equal(pyc.filas[0].v.fuente, 'IMHPA; estación 1');
  assert.match(parsearCsv('periodo,fuente\n2025-03,X\n').errores.join(' '), /al menos una columna de datos/);
  assert.match(parsearCsv('periodo,nitrato,hack\n').errores.join(' '), /no reconocida/);
  assert.match(parsearCsv('nitrato,fuente\n1,x\n').errores.join(' '), /«periodo»/);
  assert.match(parsearCsv('').errores[0], /vacío/);
  assert.match(parsearCsv('a\u0000b').errores[0], /no es un CSV/);
});

test('validar fila: período real y no futuro, forma obligatoria con nitrato, fuente obligatoria', () => {
  const ok = { periodo: '2025-03', nitrato: '4,2', forma_nitrato: 'no3-n', lluvia_mm: '120', caudal_ls: '', fuente: 'IMHPA' };
  const r = validarFilaHistorica(ok, { ahoraIso: AHORA });
  assert.deepEqual(r.fila.nitrato, { valor: 4.2, forma: 'NO3-N' });
  assert.equal(r.fila.caudalLs, null);
  for (const [cambio, campo] of [[{ periodo: '2026-13' }, 'periodo'], [{ periodo: '2026-11' }, 'periodo'], [{ periodo: '1980-01' }, 'periodo'],
    [{ forma_nitrato: '' }, 'forma_nitrato'], [{ fuente: '' }, 'fuente'], [{ lluvia_mm: '-1' }, 'lluvia_mm'], [{ lluvia_mm: '3001' }, 'lluvia_mm'],
    [{ caudal_ls: '501' }, 'caudal_ls'], [{ nitrato: 'mucho' }, 'nitrato']]) {
    assert.ok(validarFilaHistorica({ ...ok, ...cambio }, { ahoraIso: AHORA }).errores[campo], campo);
  }
  assert.ok(validarFilaHistorica({ periodo: '2025-03', fuente: 'X1' }, { ahoraIso: AHORA }).errores.nitrato, 'sin ningún dato');
});

test('serie mensual: no mezcla NO3 con NO3-N y promedia los registros del mismo mes', () => {
  const registros = [
    { periodo: '2025-01', nitrato: { valor: 4, forma: 'NO3-N' }, lluviaMm: 50, caudalLs: 1 },
    { periodo: '2025-02', nitrato: { valor: 20, forma: 'NO3' }, lluviaMm: 80, caudalLs: null },
    { periodo: '2025-03', nitrato: { valor: 6, forma: 'NO3-N' }, lluviaMm: null, caudalLs: null },
  ];
  const s = serieMensual({ registros });
  assert.equal(s.forma, 'NO3-N');
  assert.equal(s.excluidos, 1);
  assert.deepEqual(s.meses.map((m) => [m.periodo, m.nitrato]), [['2025-01', 4], ['2025-02', null], ['2025-03', 6]]);
  assert.equal(serieMensual({ registros, forma: 'NO3' }).meses.find((m) => m.nitrato === 20).periodo, '2025-02');
  const con = serieMensual({ registros: [registros[0]], muestras: [{ fechaHora: '2025-01-20T09:00', resultados: { valores: { nitrato: { valor: 6, forma: 'NO3-N' } } } }] });
  assert.equal(con.meses[0].nitrato, 5);
  assert.equal(con.meses[0].nNitrato, 2);
});

test('resumen anual y correlación: sin suficientes pares NO se calcula (no se inventa)', () => {
  const meses = [{ periodo: '2025-01', nitrato: 4, lluviaMm: 50, caudalLs: 1 }, { periodo: '2025-02', nitrato: 6, lluviaMm: 100, caudalLs: 2 }, { periodo: '2024-12', nitrato: 5, lluviaMm: null, caudalLs: null }];
  const [a25, a24] = resumenAnual(meses);
  assert.deepEqual([a25.anio, a25.nitratoMedio, a25.nitratoMax, a25.lluviaTotal, a25.caudalMedio], ['2025', 5, 6, 150, 1.5]);
  assert.equal(a24.lluviaTotal, null);
  const c = correlacionLluviaNitrato(meses);
  assert.equal(c.r, null);
  assert.match(c.motivo, /al menos 6/);
  const seis = [1, 2, 3, 4, 5, 6].map((i) => ({ periodo: `2025-0${i}`, lluviaMm: i * 10, nitrato: i * 2 }));
  assert.equal(correlacionLluviaNitrato(seis).r, 1);
  assert.match(correlacionLluviaNitrato(seis.map((m) => ({ ...m, nitrato: 3 }))).motivo, /iguales/);
});

test('referencia frente a seguimiento: cambio, formas distintas y resultados faltantes', () => {
  const s = crear('tecnico');
  const [c] = compararReferenciaSeguimiento(s.muestrasDePunto('PZ-018'));
  assert.equal(c.comparable, true);
  assert.deepEqual([c.nitratoRef, c.nitratoSeg, c.delta, c.porcentaje, c.sentido, c.forma], [3.9, 4.8, 0.9, 23.1, 'aumentó', 'NO3-N']);
  assert.equal(c.lluvia, null, 'sin lluvia registrada se dice «sin dato», no se inventa');
  const mezcla = s.muestrasDePunto('PZ-018').map((m) => (m.folio === 'AG-2026-081' ? { ...m, resultados: { valores: { nitrato: { valor: 21, forma: 'NO3' } } } } : m));
  assert.match(compararReferenciaSeguimiento(mezcla)[0].motivo, /conversión documentada/);
  const sin = s.muestrasDePunto('PZ-018').map((m) => (m.folio === 'AG-2026-080' ? { ...m, resultados: null } : m));
  assert.match(compararReferenciaSeguimiento(sin)[0].motivo, /Falta el resultado/);
});

test('importar histórico: todo o nada, sin duplicar meses y solo con permiso', () => {
  const s = crear('tecnico');
  const antes = s.historicoDePunto('PZ-018').length;
  const bueno = `${CSV}PZ-018,2024-01,3.8,NO3-N,90,1.3,IMHPA estación demo\n,2024-02,,,60,,IMHPA estación demo\n`;
  const r = s.importarHistorico('PZ-018', bueno);
  assert.equal(r.ok, true);
  assert.equal(r.datos.importadas, 2);
  assert.equal(s.historicoDePunto('PZ-018').length, antes + 2);
  assert.ok(s.historicoDePunto('PZ-018').filter((h) => h.origen === 'importado').every((h) => h.creadoPorId === 'U1'));
  const repetido = s.importarHistorico('PZ-018', bueno);
  assert.equal(repetido.ok, false);
  assert.match(repetido.detalle.join(' '), /ya existe un registro de 2024-01/);
  const mixto = s.importarHistorico('PZ-018', `${CSV},2023-05,4,NO3-N,10,,X1\n,2023-06,4,,10,,X1\n`);
  assert.equal(mixto.ok, false);
  assert.equal(s.historicoDePunto('PZ-018').some((h) => h.periodo === '2023-05'), false, 'la fila buena tampoco se guardó');
  assert.match(s.importarHistorico('PZ-018', `${CSV}PZ-019,2023-05,4,NO3-N,10,,X1\n`).detalle[0], /no coincide con PZ-018/);
  assert.equal(s.importarHistorico('PZ-999', bueno).ok, false);
  const lab = crear('laboratorio');
  assert.equal(lab.importarHistorico('PZ-018', bueno).sinPermiso, true);
});

test('la plantilla trae el ID del pozo y no se puede importar sin completarla', () => {
  const s = crear('tecnico');
  assert.match(plantillaCsv('PZ-018'), /^punto_id,periodo.*\nPZ-018,AAAA-MM/);
  assert.equal(s.importarHistorico('PZ-018', plantillaCsv('PZ-018')).ok, false);
});

test('caudal del pozo: opcional, 0 a 500 L/s, solo pozos', () => {
  const s = crear('tecnico');
  assert.equal(s.crearPunto(puntoValido({ caudal: '' })).datos.caudal, null);
  assert.equal(s.crearPunto(puntoValido({ nombre: 'Pozo Dos', caudal: '2,5' })).datos.caudal, 2.5);
  assert.ok(s.crearPunto(puntoValido({ nombre: 'Pozo Tres', caudal: '501' })).errores.caudal);
  assert.ok(s.crearPunto(puntoValido({ nombre: 'Pozo Tres', caudal: 'rápido' })).errores.caudal);
  assert.equal(s.crearPunto(puntoValido({ tipo: 'Punto', nombre: 'Río Seco', profundidad: '', caudal: '9' })).datos.caudal, null);
  assert.equal(s.editarPunto('PZ-018', { ...s.puntoPorId('PZ-018'), lat: '9.0333', lng: '-79.5333', caudal: '1,8' }).datos.caudal, 1.8);
});
