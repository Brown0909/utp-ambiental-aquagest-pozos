// Consultas de solo lectura: panel, mapa, historial y cronología (RF-25, 61, 63 a 65).
import { etapaDe, ETAPAS } from './store-flujo.js';
import { minutesBetween } from './dates.js';

export const VENTANA_PANEL_DIAS = 30;
export const HORAS_RECIENTE = 72;

export default {
  /** Color del punto en el mapa según su última muestra (RF-63). */
  estadoMapa(m) {
    if (!m) return 'sin_muestras';
    if (!m.revision) return 'pendiente';
    return m.revision.dictamen === 'Cumple' ? 'cumple' : m.revision.dictamen === 'No cumple' ? 'no_cumple' : 'sin_criterio';
  },

  esReciente(m) {
    return minutesBetween(m.fechaHora, this.ahoraIso()) <= HORAS_RECIENTE * 60;
  },

  /** RF-63 y RF-64. `desde` = solo puntos cuya última muestra es de esa fecha en adelante. */
  puntosParaMapa({ tipoRegistro = '', tipoAgua = '', estado = '', desde = '' } = {}) {
    return this.data.puntos.map((punto) => {
      const muestra = this.muestrasDePunto(punto.id)[0] ?? null;
      return { punto, muestra, estado: this.estadoMapa(muestra), reciente: muestra ? this.esReciente(muestra) : false };
    }).filter((x) => (!tipoRegistro || x.punto.tipo === tipoRegistro) && (!tipoAgua || x.muestra?.tipoAgua === tipoAgua)
      && (!estado || x.estado === estado) && (!desde || (x.muestra && x.muestra.fechaHora.slice(0, 10) >= desde)));
  },

  /** RF-65: panel con las muestras de los últimos 30 días (decisión D11: ventana móvil, no mes calendario). */
  kpis() {
    const ms = this.data.muestras.filter((m) => { const t = minutesBetween(m.fechaHora, this.ahoraIso()); return t >= 0 && t <= VENTANA_PANEL_DIAS * 1440; });
    const dict = (d) => ms.filter((m) => m.revision?.dictamen === d).length;
    const pendientesLab = ms.filter((m) => ['Registrada', 'Enviada', 'Recibida en laboratorio'].includes(etapaDe(m))).length;
    const pendientesRevision = ms.filter((m) => etapaDe(m) === 'Pendiente de revisión técnica').length;
    const cumplen = dict('Cumple');
    const noCumplen = dict('No cumple');
    const sinCriterio = dict('Sin criterio aplicable');
    const total = ms.length;
    const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
    const pendientes = pendientesLab + pendientesRevision;
    return {
      total, revisadas: cumplen + noCumplen + sinCriterio, cumplen, noCumplen, sinCriterio, pendientesLab, pendientesRevision,
      distribucion: [
        { clave: 'cumple', etiqueta: 'Cumplen', n: cumplen, pct: pct(cumplen) },
        { clave: 'no_cumple', etiqueta: 'No cumplen', n: noCumplen, pct: pct(noCumplen) },
        { clave: 'sin_criterio', etiqueta: 'Sin criterio', n: sinCriterio, pct: pct(sinCriterio) },
        { clave: 'pendiente', etiqueta: 'Pendientes', n: pendientes, pct: pct(pendientes) },
      ],
    };
  },

  ultimasMuestras(n = 5) {
    return [...this.data.muestras].sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)).slice(0, n);
  },

  /** RF-61: filtros del historial. Un rango invertido devuelve error y ninguna muestra. */
  historial({ tipoAgua = '', puntoId = '', desde = '', hasta = '', estado = '' } = {}) {
    if (desde && hasta && desde > hasta) return { errores: { hasta: 'La fecha «hasta» no puede ser anterior a «desde».' }, muestras: [] };
    const muestras = this.data.muestras.filter((m) => {
      const dia = m.fechaHora.slice(0, 10);
      return (!tipoAgua || m.tipoAgua === tipoAgua) && (!puntoId || m.puntoId === puntoId) && (!desde || dia >= desde) && (!hasta || dia <= hasta) && (!estado || etapaDe(m) === estado);
    }).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
    return { errores: {}, muestras };
  },

  /** RF-25: pasos del proceso de una muestra, con quién y cuándo. */
  cronologia(m) {
    const pasos = [{ clave: 'registrada', titulo: 'Muestra registrada', fechaHora: m.fechaHora, responsable: this.nombreDe(m.tecnicoId) }];
    const { envio, recepcion } = m.custodia;
    if (envio) pasos.push({ clave: 'enviada', titulo: 'Enviada', fechaHora: envio.fechaHora, responsable: this.nombreDe(envio.responsableId) });
    if (recepcion) pasos.push({ clave: 'recibida', titulo: 'Recibida en laboratorio', fechaHora: recepcion.fechaHora, responsable: this.nombreDe(recepcion.responsableId) });
    if (m.resultados) pasos.push({ clave: 'resultados', titulo: 'Resultados recibidos', fechaHora: m.resultados.cargadoEn, responsable: m.resultados.laboratorio });
    if (m.resultados && !m.revision) pasos.push({ clave: 'pendiente', titulo: 'Pendiente de revisión técnica', fechaHora: null, responsable: 'Revisión del analista responsable', enCurso: true });
    if (m.revision) pasos.push({ clave: 'revision', titulo: 'Revisión confirmada', fechaHora: m.revision.fecha, responsable: this.nombreDe(m.revision.analistaId) });
    return pasos;
  },

  /** «Cumple/No cumple» solo si hay revisión confirmada (RF-59). Antes, solo la etapa. */
  etiquetaEstado(m) {
    if (m.revision) return m.revision.dictamen;
    return etapaDe(m) === 'Pendiente de revisión técnica' ? 'Pendiente de revisión técnica' : 'Pendiente de laboratorio';
  },
};
export { ETAPAS };
