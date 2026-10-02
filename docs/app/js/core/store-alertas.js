// Alertas operativas del panel (RF-66).
import { etapaDe } from './store-flujo.js';
import { normativaAplicable } from './normativa.js';
import { minutesBetween } from './dates.js';
import { numTexto } from './units.js';

export const PH_MIN = 6.5;
export const PH_MAX = 8.5;
export const HORAS_ANALISIS = 48;
export const HORAS_RECEPCION = 24;

export default {
  /** pH fuera de 6,5–8,5 (consumo humano), análisis con más de 48 h, envío con más de 24 h sin recepción, revisión pendiente. */
  alertas() {
    const lista = [];
    const ahora = this.ahoraIso();
    for (const m of this.data.muestras) {
      const p = this.puntoPorId(m.puntoId);
      const potable = normativaAplicable(m.tipoAgua, m.objetivo).reglamentoId === 'potable';
      const ph = m.campo?.ph;
      if (potable && ph !== null && ph !== undefined && (ph < PH_MIN || ph > PH_MAX)) {
        lista.push({ id: `ph-${m.folio}`, nivel: 'critica', titulo: 'pH fuera de límites', folio: m.folio,
          texto: `Muestra ${m.folio} en ${p.comunidad} presenta pH de ${numTexto(ph, 1)} (fuera del rango ${numTexto(PH_MIN, 1)}–${numTexto(PH_MAX, 1)} del reglamento).` });
      }
      const etapa = etapaDe(m);
      if (etapa === 'Recibida en laboratorio' && minutesBetween(m.custodia.recepcion.fechaHora, ahora) > HORAS_ANALISIS * 60) {
        lista.push({ id: `lab-${m.folio}`, nivel: 'aviso', titulo: 'Análisis retrasado', folio: m.folio,
          texto: `Muestra ${m.folio} en ${p.comunidad} lleva más de ${HORAS_ANALISIS} horas en el laboratorio sin resultados.` });
      }
      if (etapa === 'Enviada' && minutesBetween(m.custodia.envio.fechaHora, ahora) > HORAS_RECEPCION * 60) {
        lista.push({ id: `env-${m.folio}`, nivel: 'aviso', titulo: 'Recepción pendiente', folio: m.folio,
          texto: `Muestra ${m.folio} fue enviada hace más de ${HORAS_RECEPCION} horas y el laboratorio no confirmó la recepción.` });
      }
    }
    for (const p of this.data.puntos) {
      const n = this.data.muestras.filter((m) => m.puntoId === p.id && etapaDe(m) === 'Pendiente de revisión técnica').length;
      if (n > 0) {
        lista.push({ id: `rev-${p.id}`, nivel: 'aviso', titulo: 'Revisión técnica pendiente', ruta: 'evaluacion',
          texto: `${p.id} tiene ${n} muestra${n > 1 ? 's' : ''} con resultados recibidos, aún sin revisión confirmada.` });
      }
    }
    return lista.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'critica' ? -1 : 1));
  },
};
