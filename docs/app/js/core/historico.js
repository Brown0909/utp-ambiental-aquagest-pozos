// Histórico mensual por pozo y relación con la lluvia (spec 003). Funciones PURAS: no tocan el DOM ni el store.
// Principios de la constitución que aquí se cumplen: el nitrato siempre lleva su forma (3), los datos de ejemplo se
// marcan como tales (4) y no se inventa nada (9): si faltan datos, se dice «sin dato» y no se calcula.
import { clean, isBlank, parseNumber, number, textLength } from './validators.js';
import { FORMAS_NITRATO } from './units.js';

export const PERIODO_MIN = '1990-01';
export const MAX_FILAS_CSV = 1000;
export const MAX_BYTES_CSV = 1048576;
export const MIN_PARES_CORRELACION = 6;
export const COLUMNAS_CSV = ['punto_id', 'periodo', 'nitrato', 'forma_nitrato', 'lluvia_mm', 'caudal_ls', 'fuente'];
/** Plantilla con el ID del pozo ya escrito. La fila de ejemplo falla a propósito si no se reemplaza (AAAA-MM). */
export const plantillaCsv = (puntoId) => `${COLUMNAS_CSV.join(',')}\n${puntoId},AAAA-MM,,,,,Escriba la fuente real del dato\n`;

const periodoReal = (p) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p ?? ''));
const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const formaDe = (v) => {
  const s = String(v ?? '').trim().toUpperCase().replace('₃', '3').replace('−', '-');
  return FORMAS_NITRATO.find((f) => f.toUpperCase() === s) ?? null;
};

/** Lee un CSV (coma o punto y coma, comillas dobles, BOM). Devuelve {filas:[{n, v}], errores:[texto]}. */
export function parsearCsv(texto) {
  const limpio = String(texto ?? '').replace(/^\uFEFF/, '');
  if (limpio.includes('\u0000')) return { filas: [], errores: ['El archivo no es un CSV de texto.'] };
  const primera = limpio.split(/\r?\n/, 1)[0];
  const sep = primera.includes(';') && !primera.includes(',') ? ';' : ',';
  const registros = [];
  let campo = '';
  let fila = [];
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') comillas = false; else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      registros.push(fila); fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); registros.push(fila); }
  const utiles = registros.filter((r) => r.some((x) => x.trim() !== ''));
  if (utiles.length === 0) return { filas: [], errores: ['El archivo está vacío.'] };
  const cab = utiles[0].map((x) => x.trim().toLowerCase());
  const errores = [];
  const desconocidas = cab.filter((c) => !COLUMNAS_CSV.includes(c));
  if (desconocidas.length) errores.push(`Columna no reconocida: ${desconocidas.slice(0, 3).join(', ')}. Use la plantilla.`);
  for (const obligatoria of ['periodo', 'fuente']) if (!cab.includes(obligatoria)) errores.push(`Falta la columna «${obligatoria}».`);
  if (!['nitrato', 'lluvia_mm', 'caudal_ls'].some((c) => cab.includes(c))) errores.push('Falta al menos una columna de datos (nitrato, lluvia_mm o caudal_ls).');
  if (errores.length) return { filas: [], errores };
  const filas = utiles.slice(1).map((r, i) => ({ n: i + 2, v: Object.fromEntries(cab.map((c, j) => [c, (r[j] ?? '').trim()])) }));
  return { filas, errores: [] };
}

/** Valida una fila histórica. {errores:{campo:texto}, fila}. `ahoraIso` = 'AAAA-MM-DDTHH:mm'. */
export function validarFilaHistorica(v, { ahoraIso }) {
  const errores = {};
  if (isBlank(v.periodo)) errores.periodo = 'El período es obligatorio (AAAA-MM).';
  else if (!periodoReal(v.periodo.trim())) errores.periodo = 'Use el formato AAAA-MM con un mes real (ej. 2025-03).';
  else if (v.periodo.trim() < PERIODO_MIN) errores.periodo = `No puede ser anterior a ${PERIODO_MIN}.`;
  else if (v.periodo.trim() > ahoraIso.slice(0, 7)) errores.periodo = 'No puede ser un mes futuro.';
  const nit = number(v.nitrato, { min: 0, max: 1000, unit: 'mg/L' });
  if (nit) errores.nitrato = nit;
  const forma = formaDe(v.forma_nitrato);
  if (!isBlank(v.nitrato) && !nit && !forma) errores.forma_nitrato = 'Indique la forma del nitrato: NO3 o NO3-N.';
  if (isBlank(v.nitrato) && !isBlank(v.forma_nitrato)) errores.nitrato = 'Hay forma de nitrato pero falta el valor.';
  const lluvia = number(v.lluvia_mm, { min: 0, max: 3000, unit: 'mm' });
  if (lluvia) errores.lluvia_mm = lluvia;
  const caudal = number(v.caudal_ls, { min: 0, max: 500, unit: 'L/s' });
  if (caudal) errores.caudal_ls = caudal;
  if (isBlank(v.nitrato) && isBlank(v.lluvia_mm) && isBlank(v.caudal_ls)) errores.nitrato = 'Escriba al menos nitrato, lluvia o caudal.';
  const fuente = isBlank(v.fuente) ? 'La fuente es obligatoria (de dónde salió el dato).' : textLength(v.fuente, { min: 2, max: 80 });
  if (fuente) errores.fuente = fuente;
  if (Object.keys(errores).length) return { errores, fila: null };
  return {
    errores,
    fila: {
      periodo: v.periodo.trim(),
      nitrato: isBlank(v.nitrato) ? null : { valor: parseNumber(v.nitrato), forma },
      lluviaMm: isBlank(v.lluvia_mm) ? null : parseNumber(v.lluvia_mm),
      caudalLs: isBlank(v.caudal_ls) ? null : parseNumber(v.caudal_ls),
      fuente: clean(v.fuente),
    },
  };
}

/** Nitrato de una muestra con resultados: {valor, forma} o null. */
export const nitratoDeMuestra = (m) => {
  const n = m.resultados?.valores?.nitrato;
  return n && n.forma ? { valor: n.valor, forma: n.forma } : null;
};

/**
 * Serie mensual de un pozo. Nitrato: promedio de los registros históricos y de las muestras del sistema de ese mes,
 * SOLO de la forma elegida (no se mezclan NO3 y NO3-N). Lluvia y caudal: solo del histórico.
 */
export function serieMensual({ registros = [], muestras = [], forma = null } = {}) {
  const conteo = {};
  const obs = [];
  for (const r of registros) if (r.nitrato) obs.push({ periodo: r.periodo, ...r.nitrato });
  for (const m of muestras) { const n = nitratoDeMuestra(m); if (n) obs.push({ periodo: m.fechaHora.slice(0, 7), ...n }); }
  for (const o of obs) conteo[o.forma] = (conteo[o.forma] ?? 0) + 1;
  const formas = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]);
  const elegida = forma && conteo[forma] ? forma : formas[0] ?? null;
  const porMes = new Map();
  const mes = (p) => { if (!porMes.has(p)) porMes.set(p, { periodo: p, nit: [], lluviaMm: null, caudalLs: null, ejemplo: false }); return porMes.get(p); };
  for (const o of obs) if (o.forma === elegida) mes(o.periodo).nit.push(o.valor);
  for (const r of registros) {
    const m = mes(r.periodo);
    if (r.lluviaMm !== null && r.lluviaMm !== undefined) m.lluviaMm = r.lluviaMm;
    if (r.caudalLs !== null && r.caudalLs !== undefined) m.caudalLs = r.caudalLs;
    if (r.origen === 'ejemplo') m.ejemplo = true;
  }
  const meses = [...porMes.values()].sort((a, b) => a.periodo.localeCompare(b.periodo)).map((m) => ({
    periodo: m.periodo, nNitrato: m.nit.length, nitrato: m.nit.length ? redondear(m.nit.reduce((s, x) => s + x, 0) / m.nit.length) : null,
    lluviaMm: m.lluviaMm, caudalLs: m.caudalLs, ejemplo: m.ejemplo,
  })).filter((m) => m.nitrato !== null || m.lluviaMm !== null || m.caudalLs !== null);
  return { forma: elegida, formas, excluidos: obs.filter((o) => o.forma !== elegida).length, meses };
}

/** Resumen por año: promedio y máximo de nitrato, lluvia acumulada (de los meses con dato) y caudal medio. */
export function resumenAnual(meses) {
  const porAnio = new Map();
  for (const m of meses) {
    const a = m.periodo.slice(0, 4);
    if (!porAnio.has(a)) porAnio.set(a, []);
    porAnio.get(a).push(m);
  }
  const media = (xs) => (xs.length ? redondear(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
  return [...porAnio.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([anio, ms]) => {
    const nit = ms.filter((m) => m.nitrato !== null).map((m) => m.nitrato);
    const llu = ms.filter((m) => m.lluviaMm !== null).map((m) => m.lluviaMm);
    const cau = ms.filter((m) => m.caudalLs !== null).map((m) => m.caudalLs);
    return {
      anio, mesesConDato: ms.length, nitratoMedio: media(nit), nitratoMax: nit.length ? Math.max(...nit) : null,
      mesesConLluvia: llu.length, lluviaTotal: llu.length ? redondear(llu.reduce((s, x) => s + x, 0), 1) : null, caudalMedio: media(cau),
    };
  });
}

/** Correlación de Pearson entre lluvia mensual y nitrato mensual. Solo con suficientes pares; es orientativa. */
export function correlacionLluviaNitrato(meses) {
  const pares = meses.filter((m) => m.lluviaMm !== null && m.nitrato !== null);
  const n = pares.length;
  if (n < MIN_PARES_CORRELACION) return { n, r: null, motivo: `Se necesitan al menos ${MIN_PARES_CORRELACION} meses con lluvia y nitrato (hay ${n}).` };
  const mx = pares.reduce((s, p) => s + p.lluviaMm, 0) / n;
  const my = pares.reduce((s, p) => s + p.nitrato, 0) / n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (const p of pares) { sxy += (p.lluviaMm - mx) * (p.nitrato - my); sxx += (p.lluviaMm - mx) ** 2; syy += (p.nitrato - my) ** 2; }
  if (sxx === 0 || syy === 0) return { n, r: null, motivo: 'Todos los valores son iguales: no hay variación para comparar.' };
  return { n, r: redondear(sxy / Math.sqrt(sxx * syy)), motivo: null };
}

/** Cada seguimiento frente a su referencia: cambio de nitrato y lluvia registrada. No dice si cumple la norma. */
export function compararReferenciaSeguimiento(muestras) {
  const porFolio = new Map(muestras.map((m) => [m.folio, m]));
  return muestras.filter((m) => m.clasificacion === 'seguimiento' && m.referenciaFolio).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)).map((seg) => {
    const ref = porFolio.get(seg.referenciaFolio) ?? null;
    const base = { seguimiento: seg, referencia: ref, lluvia: seg.lluvia ?? null };
    const a = ref ? nitratoDeMuestra(ref) : null;
    const b = nitratoDeMuestra(seg);
    if (!a || !b) return { ...base, comparable: false, motivo: 'Falta el resultado de nitrato en la referencia o en el seguimiento.' };
    if (a.forma !== b.forma) return { ...base, comparable: false, motivo: 'Una está en NO₃ y la otra en NO₃-N: no se comparan sin una conversión documentada.' };
    const delta = redondear(b.valor - a.valor);
    return {
      ...base, comparable: true, forma: a.forma, nitratoRef: a.valor, nitratoSeg: b.valor, delta,
      porcentaje: a.valor > 0 ? redondear((delta / a.valor) * 100, 1) : null,
      sentido: delta > 0 ? 'aumentó' : delta < 0 ? 'disminuyó' : 'sin cambio',
    };
  });
}

/**
 * Histórico FICTICIO para la demostración (principio 4): 30 meses hasta el mes anterior, determinista (sin azar).
 * Nunca debe presentarse como dato real: cada fila lleva origen «ejemplo» y la fuente lo dice.
 */
export function construirHistoricoEjemplo(ahora = new Date()) {
  const lluviaBase = [70, 45, 55, 130, 260, 270, 250, 290, 310, 360, 340, 160];
  const pozos = [{ id: 'PZ-018', base: 3.2, kLluvia: 0.004, caudal: 1.4 }, { id: 'PZ-019', base: 9.4, kLluvia: 0.006, caudal: 0.9 }];
  const registros = [];
  let n = 0;
  for (let k = 30; k >= 1; k--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - k, 1);
    const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const i = 30 - k;
    const lluvia = Math.round(lluviaBase[d.getMonth()] * (0.8 + 0.25 * Math.abs(Math.sin(i * 1.3))));
    for (const p of pozos) {
      n += 1;
      registros.push({
        id: `H-${String(n).padStart(4, '0')}`, puntoId: p.id, periodo,
        nitrato: { valor: redondear(p.base + p.kLluvia * lluvia + 0.35 * Math.sin(i * 2.1 + p.base), 1), forma: 'NO3-N' },
        lluviaMm: lluvia, caudalLs: redondear(p.caudal + 0.12 * Math.sin(i * 1.7), 2),
        fuente: 'Dato de ejemplo (ficticio)', origen: 'ejemplo',
      });
    }
  }
  return registros;
}
