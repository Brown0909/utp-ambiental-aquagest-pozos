// Normativa aplicable y evaluación. Principio 9 de la constitución: NINGÚN límite se inventa.
// Los límites cargados salen del texto oficial del RT DGNTI-COPANIT 23-395-99 (Tablas 2 y 3 y sección 3.1);
// falta confirmarlos contra el RT 21-2019, que lo reemplazó. Todo lo demás dice «Límite no cargado».
import { convertirNitrato, FACTOR_NO3_A_NO3N, numTexto, etiquetaFormaCorta } from './units.js';

export const TIPOS_AGUA = ['Agua potable', 'Agua superficial', 'Subterránea/Pozo', 'Agua residual', 'Agua residual tratada'];
export const OBJETIVOS = ['Consumo humano', 'Descarga', 'Reutilización', 'Solo monitoreo'];
export const PARAMETROS_LAB = {
  conductividad: { nombre: 'Conductividad', unidad: 'µS/cm' },
  coliformes_totales: { nombre: 'Coliformes totales', unidad: 'UFC/100 mL' },
  e_coli: { nombre: 'Escherichia coli', unidad: 'UFC/100 mL' },
  nitrato: { nombre: 'Nitrato', unidad: 'mg/L' },
};
export const ORDEN_PARAMETROS = ['conductividad', 'coliformes_totales', 'e_coli', 'nitrato'];

export const REGLAMENTOS = {
  potable: { id: 'COPANIT 21-2019', nombre: 'DGNTI-COPANIT 21-2019 · Agua potable', verificacion: 'Límites verificados en el texto del RT 23-395-99; falta confirmarlos contra el RT 21-2019.' },
  descarga: { id: 'COPANIT 35-2019', nombre: 'DGNTI-COPANIT 35-2019 · Descargas', verificacion: 'Límites no cargados: verificar en el reglamento.' },
  reutilizacion: { id: 'COPANIT 24-99', nombre: 'DGNTI-COPANIT 24-99 · Reutilización', verificacion: 'Límites no cargados: verificar en el reglamento.' },
};

/** Decisión D6: evita datos absurdos (p. ej. «consumo humano» de un agua residual). */
export function combinacionValida(tipoAgua, objetivo) {
  if (objetivo === 'Consumo humano' && !['Agua potable', 'Subterránea/Pozo', 'Agua superficial'].includes(tipoAgua)) return 'El objetivo «Consumo humano» no aplica a aguas residuales.';
  if (objetivo === 'Descarga' && !['Agua residual', 'Agua residual tratada'].includes(tipoAgua)) return 'La «Descarga» aplica solo a aguas residuales.';
  if (objetivo === 'Reutilización' && tipoAgua !== 'Agua residual tratada') return 'La «Reutilización» aplica solo a agua residual tratada.';
  return null;
}

/** Un pozo solo se muestrea como Subterránea/Pozo o Agua potable; «Subterránea/Pozo» no existe en un punto. */
export function tipoAguaParaRegistro(tipoRegistro, tipoAgua) {
  if (tipoRegistro === 'Pozo' && !['Subterránea/Pozo', 'Agua potable'].includes(tipoAgua)) return 'Un pozo solo admite Subterránea/Pozo o Agua potable.';
  if (tipoRegistro === 'Punto' && tipoAgua === 'Subterránea/Pozo') return 'Subterránea/Pozo solo se usa en pozos.';
  return null;
}

export function normativaAplicable(tipoAgua, objetivo) {
  if (objetivo === 'Solo monitoreo') return { estado: 'sin_criterio', reglamentoId: null, texto: 'Sin criterio aplicable' };
  if (objetivo === 'Consumo humano' && ['Agua potable', 'Subterránea/Pozo'].includes(tipoAgua)) return { estado: 'definida', reglamentoId: 'potable', texto: REGLAMENTOS.potable.id };
  if (objetivo === 'Descarga' && ['Agua residual', 'Agua residual tratada'].includes(tipoAgua)) return { estado: 'definida', reglamentoId: 'descarga', texto: REGLAMENTOS.descarga.id };
  if (objetivo === 'Reutilización' && tipoAgua === 'Agua residual tratada') return { estado: 'definida', reglamentoId: 'reutilizacion', texto: REGLAMENTOS.reutilizacion.id };
  return { estado: 'no_definida', reglamentoId: null, texto: 'Sin criterio definido para esta combinación' };
}

/** Límites VERIFICADOS. Para descarga y reutilización no hay ninguno cargado. */
export function limitesPara(tipoAgua, objetivo) {
  const n = normativaAplicable(tipoAgua, objetivo);
  if (n.reglamentoId !== 'potable') return {};
  const distribuida = tipoAgua === 'Agua potable';
  return {
    nitrato: { max: 10, unidad: 'mg/L', forma: 'NO3-N', nota: 'El reglamento no precisa la forma; se interpreta como NO3-N (por confirmar).' },
    e_coli: { max: 0, unidad: 'UFC/100 mL', nota: 'El reglamento fija 0 para coliformes fecales; se compara E. coli como indicador (por confirmar).' },
    coliformes_totales: { max: distribuida ? 3 : 10, unidad: 'UFC/100 mL', nota: distribuida ? 'Agua en el sistema de distribución.' : 'Agua no distribuida por tuberías.' },
    ph_campo: { min: 6.5, max: 8.5, unidad: '', nota: 'Medición de campo.' },
  };
}

const textoLimite = (lim) => (lim.min !== undefined ? `${numTexto(lim.min, 1)} – ${numTexto(lim.max, 1)}` : `≤ ${numTexto(lim.max, 1)} ${lim.unidad}`);

function filaDe(key, valor, unidad, extra) {
  return { key, nombre: key === 'ph_campo' ? 'pH (campo)' : PARAMETROS_LAB[key].nombre, valor, unidad, ...extra };
}

/**
 * Compara los resultados contra los límites VERIFICADOS. Devuelve {normativa, filas, dictamen}.
 * conversion = {documentada: true, nota} cuando un Administrador documentó NO3 <-> NO3-N.
 * El dictamen es solo una PROPUESTA: «Cumple/No cumple» se muestra tras la revisión humana (RF-59).
 */
export function evaluar(muestra, resultados, conversion = null) {
  const normativa = normativaAplicable(muestra.tipoAgua, muestra.objetivo);
  const limites = limitesPara(muestra.tipoAgua, muestra.objetivo);
  const filas = [];
  for (const key of ORDEN_PARAMETROS) {
    const dato = resultados?.valores?.[key];
    if (!dato) continue;
    const unidad = PARAMETROS_LAB[key].unidad;
    const base = filaDe(key, dato.valor, unidad, { forma: dato.forma ?? null });
    if (normativa.estado !== 'definida') { filas.push({ ...base, estado: 'sin_criterio', limiteTexto: '—' }); continue; }
    const lim = limites[key];
    if (!lim) { filas.push({ ...base, estado: 'sin_limite', limiteTexto: 'Límite no cargado' }); continue; }
    let valor = dato.valor;
    let nota = lim.nota;
    if (key === 'nitrato' && dato.forma !== lim.forma) {
      if (!conversion?.documentada) {
        const aviso = `El resultado viene como ${etiquetaFormaCorta(dato.forma)} y el límite como ${etiquetaFormaCorta(lim.forma)}: no se comparan sin conversión documentada.`;
        filas.push({ ...base, estado: 'requiere_conversion', limiteTexto: `${textoLimite(lim)} ${etiquetaFormaCorta(lim.forma)}`, nota: aviso });
        continue;
      }
      valor = convertirNitrato(dato.valor, dato.forma, lim.forma);
      nota = `Convertido con factor ${numTexto(FACTOR_NO3_A_NO3N)} (${etiquetaFormaCorta(dato.forma)} → ${etiquetaFormaCorta(lim.forma)}): ${numTexto(valor)} mg/L. ${conversion.nota ?? ''}`.trim();
    }
    const fuera = (lim.max !== undefined && valor > lim.max) || (lim.min !== undefined && valor < lim.min);
    const limiteTexto = textoLimite(lim) + (lim.forma ? ' ' + etiquetaFormaCorta(lim.forma) : '');
    filas.push({ ...base, estado: fuera ? 'no_cumple' : 'cumple', limiteTexto, nota, comparado: valor });
  }
  const ph = muestra.campo?.ph;
  if (normativa.estado === 'definida' && limites.ph_campo && ph !== null && ph !== undefined) {
    const lim = limites.ph_campo;
    const fuera = ph < lim.min || ph > lim.max;
    filas.push(filaDe('ph_campo', ph, '', { estado: fuera ? 'no_cumple' : 'cumple', limiteTexto: textoLimite(lim), nota: lim.nota, forma: null }));
  }
  return { normativa, filas, dictamen: dictamenPropuesto(normativa, filas) };
}

export function dictamenPropuesto(normativa, filas) {
  if (normativa.estado !== 'definida') return { valor: 'Sin criterio aplicable', parcial: false, bloqueado: false, motivos: [normativa.texto] };
  if (filas.some((f) => f.estado === 'requiere_conversion')) {
    return { valor: null, parcial: false, bloqueado: true, motivos: ['Falta documentar la conversión de nitrato (NO3 ↔ NO3-N).'] };
  }
  const comparables = filas.filter((f) => f.estado === 'cumple' || f.estado === 'no_cumple');
  if (comparables.length === 0) return { valor: 'Sin criterio aplicable', parcial: false, bloqueado: false, motivos: ['Ningún parámetro tiene límite cargado.'] };
  const fallan = comparables.filter((f) => f.estado === 'no_cumple');
  return { valor: fallan.length ? 'No cumple' : 'Cumple', parcial: filas.some((f) => f.estado === 'sin_limite'), bloqueado: false, motivos: fallan.map((f) => `${f.nombre} fuera de límite`) };
}
