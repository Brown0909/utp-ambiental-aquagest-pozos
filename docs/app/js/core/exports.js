// Filas para exportar a Excel y PDF (RF-62). Puro: no usa el DOM ni las librerías de exportación.
// RF-59 también rige aquí: antes de la revisión confirmada NO se exporta Cumple ni No cumple.
import { evaluar, normativaAplicable, PARAMETROS_LAB, ORDEN_PARAMETROS } from './normativa.js';
import { etapaDe } from './store-flujo.js';
import { fmtDateTime, fmtDate } from './dates.js';
import { numTexto, etiquetaFormaCorta } from './units.js';

/** Un texto que empiece con = + @ (o - que no sea número) podría leerse como fórmula: se neutraliza. */
export function celdaSegura(v) {
  if (typeof v !== 'string') return v;
  return /^[=+@]/.test(v) || /^-(?![0-9.,]+$)/.test(v) ? `'${v}` : v;
}
const seguro = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, celdaSegura(v)]));

export function nombreArchivo(base, ahora, extension) {
  const p = (n) => String(n).padStart(2, '0');
  return `${base}_${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}_${p(ahora.getHours())}${p(ahora.getMinutes())}.${extension}`;
}

export function filasMuestras(store, muestras) {
  return muestras.map((m) => {
    const p = store.puntoPorId(m.puntoId);
    const c = m.campo ?? {};
    return seguro({
      'Folio': m.folio, 'ID punto/pozo': p.id, 'Punto/pozo': p.nombre, 'Comunidad': p.comunidad, 'Tipo de registro': p.tipo,
      'Fecha y hora': fmtDateTime(m.fechaHora), 'Tipo de agua': m.tipoAgua, 'Objetivo': m.objetivo, 'Normativa aplicable': normativaAplicable(m.tipoAgua, m.objetivo).texto,
      'Clasificación': m.clasificacion === 'referencia' ? 'Referencia' : 'Seguimiento', 'Referencia enlazada': m.referenciaFolio ?? '',
      'Técnico responsable': store.nombreDe(m.tecnicoId), 'Estado': etapaDe(m), 'Dictamen (revisión confirmada)': m.revision ? m.revision.dictamen : '',
      'Lluvia (mm)': m.lluvia ? m.lluvia.mm : 'Sin dato', 'Lluvia período': m.lluvia ? m.lluvia.periodo : 'Sin dato', 'Lluvia fuente': m.lluvia ? m.lluvia.fuente : 'Sin dato',
      'pH (campo)': c.ph ?? '', 'Temperatura (°C)': c.temperatura ?? '', 'Oxígeno disuelto (mg/L)': c.oxigeno ?? '', 'Turbidez (NTU)': c.turbidez ?? '', 'Conductividad campo (µS/cm)': c.conductividad ?? '',
    });
  });
}

/** Una fila por parámetro de laboratorio. Con revisión confirmada usa la copia guardada; si no, «Pendiente». */
export function filasResultados(store, muestras) {
  const filas = [];
  for (const m of muestras) {
    if (!m.resultados) continue;
    const confirmadas = m.revision ? m.revision.filas : null;
    const en = (confirmadas ?? evaluar(m, m.resultados, m.conversion).filas);
    for (const key of ORDEN_PARAMETROS) {
      const d = m.resultados.valores[key];
      if (!d) continue;
      const f = en.find((x) => x.key === key);
      filas.push(seguro({
        'Folio': m.folio, 'Parámetro': PARAMETROS_LAB[key].nombre, 'Resultado': d.valor, 'Unidad': PARAMETROS_LAB[key].unidad,
        'Forma reportada': d.forma ? etiquetaFormaCorta(d.forma) : '', 'Fecha del análisis': fmtDate(m.resultados.fechaAnalisis), 'Laboratorio': m.resultados.laboratorio,
        'Límite aplicado': f ? f.limiteTexto : '—',
        'Evaluación': m.revision ? ({ cumple: 'Cumple', no_cumple: 'No cumple', sin_criterio: 'Sin criterio', sin_limite: 'Límite no cargado', requiere_conversion: 'Requiere conversión' }[f?.estado] ?? '—') : 'Pendiente de revisión técnica',
        'Certificado': m.resultados.certificado.nombre,
      }));
    }
  }
  return filas;
}

export function filasCustodia(store, muestras) {
  return muestras.filter((m) => m.custodia.envio).map((m) => {
    const e = m.custodia.envio;
    const r = m.custodia.recepcion;
    return seguro({
      'Folio': m.folio, 'Origen': e.origen, 'Destino': e.destino, 'Enviada': fmtDateTime(e.fechaHora), 'Responsable del envío': store.nombreDe(e.responsableId),
      'Recibida': r ? fmtDateTime(r.fechaHora) : '', 'Responsable de recepción': r ? store.nombreDe(r.responsableId) : '', 'Condición': r ? r.condicion : '', 'Incidencias': r ? r.incidencias : '',
    });
  });
}

export function textoFiltros(store, f = {}) {
  const partes = [];
  if (f.puntoId) partes.push(`Punto/pozo: ${f.puntoId} · ${store.puntoPorId(f.puntoId)?.nombre ?? ''}`);
  if (f.tipoAgua) partes.push(`Tipo de agua: ${f.tipoAgua}`);
  if (f.desde || f.hasta) partes.push(`Fechas: ${f.desde ? fmtDate(f.desde) : '…'} a ${f.hasta ? fmtDate(f.hasta) : '…'}`);
  if (f.estado) partes.push(`Estado: ${f.estado}`);
  return partes.length ? partes.join(' · ') : 'Sin filtros (todas las muestras)';
}

export { numTexto };

/** Los PDF con fuentes estándar solo admiten Latin-1: se reemplazan subíndices y símbolos que no existen allí. */
export function aTextoPdf(s) {
  return String(s ?? '')
    .replace(/₃/g, '3').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[–−]/g, '-').replace(/→/g, '->')
    .replace(/[^ -ÿ—•…]/g, '?');
}

/** Bloque de texto de una muestra para el PDF: título + líneas (ya compatibles con el PDF). */
export function lineasPdfMuestra(store, m) {
  const p = store.puntoPorId(m.puntoId);
  const L = [];
  L.push(`${fmtDateTime(m.fechaHora)} · ${m.tipoAgua} · ${m.objetivo} · Normativa: ${normativaAplicable(m.tipoAgua, m.objetivo).texto}`);
  L.push(`Estado: ${etapaDe(m)}${m.revision ? ` · Dictamen confirmado: ${m.revision.dictamen}` : ' · Sin dictamen (revisión técnica pendiente)'} · Técnico: ${store.nombreDe(m.tecnicoId)}`);
  if (m.referenciaFolio) L.push(`Seguimiento enlazado a la referencia ${m.referenciaFolio}`);
  L.push(m.lluvia ? `Lluvia: ${numTexto(m.lluvia.mm)} mm · ${m.lluvia.periodo} · ${m.lluvia.fuente}` : 'Lluvia: Sin dato');
  const c = m.campo ?? {};
  const campo = [['pH', c.ph, ''], ['Temp.', c.temperatura, ' °C'], ['O. disuelto', c.oxigeno, ' mg/L'], ['Turbidez', c.turbidez, ' NTU'], ['Cond. campo', c.conductividad, ' µS/cm']].filter(([, v]) => v !== null && v !== undefined);
  if (campo.length) L.push(`Campo: ${campo.map(([n, v, u]) => `${n} ${numTexto(v)}${u}`).join(' · ')}`);
  for (const f of filasResultados(store, [m])) {
    L.push(`  ${f['Parámetro']}: ${numTexto(f['Resultado'])} ${f['Unidad']}${f['Forma reportada'] ? ` (como ${f['Forma reportada']})` : ''} · Límite: ${f['Límite aplicado']} · ${f['Evaluación']}`);
  }
  if (!m.resultados) L.push('  Sin resultados de laboratorio todavía.');
  if (m.custodia.envio) L.push(`Envío: ${fmtDateTime(m.custodia.envio.fechaHora)} (${store.nombreDe(m.custodia.envio.responsableId)})${m.custodia.recepcion ? ` · Recepción: ${fmtDateTime(m.custodia.recepcion.fechaHora)} (${store.nombreDe(m.custodia.recepcion.responsableId)})` : ' · Recepción pendiente'}`);
  return { titulo: `${m.folio} · ${p.id} ${p.nombre}`, lineas: L.map(aTextoPdf) };
}
