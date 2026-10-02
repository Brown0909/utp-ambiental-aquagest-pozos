// Cadena de custodia (RF-40 a RF-47).
import { fallo, exito, hayErrores } from './result.js';
import { validate, required, textLength, clean, dateField, timeField, notFuture } from './validators.js';
import { combine } from './dates.js';
import { LABORATORIOS, CONDICIONES_RECEPCION, CONDICION_OK } from './seed.js';

export const ETAPAS = ['Registrada', 'Enviada', 'Recibida en laboratorio', 'Pendiente de revisión técnica', 'Revisión confirmada'];
const unoDe = (lista, msg) => (v) => (v && !lista.includes(v) ? msg : null);

/** Etapa del proceso, derivada de lo que ya ocurrió con la muestra. */
export function etapaDe(m) {
  if (m.revision) return 'Revisión confirmada';
  if (m.resultados) return 'Pendiente de revisión técnica';
  if (m.custodia.recepcion) return 'Recibida en laboratorio';
  if (m.custodia.envio) return 'Enviada';
  return 'Registrada';
}

export default {
  etapaDe(m) { return etapaDe(m); },

  /** RF-41 y RF-42: envío de una muestra «Registrada». */
  registrarEnvio(folio, v) {
    const sinPermiso = this.exigir('registrar_envio');
    if (sinPermiso) return sinPermiso;
    const m = this.muestraPorFolio(folio);
    if (!m) return fallo({ _form: 'La muestra no existe.' });
    if (etapaDe(m) !== 'Registrada') return fallo({ _form: 'Esta muestra ya fue enviada.' });
    const errores = validate(v, { fecha: [required, dateField], hora: [required, timeField], destino: [required, unoDe(LABORATORIOS, 'Elija un laboratorio de la lista.')] });
    if (!errores.fecha && !errores.hora) {
      const iso = combine(v.fecha, v.hora);
      const futuro = notFuture(iso, this.ahora());
      if (futuro) errores.fecha = futuro;
      else if (iso < m.fechaHora) errores.fecha = 'El envío no puede ser anterior a la toma de la muestra.';
    }
    if (hayErrores(errores)) return fallo(errores);
    const punto = this.puntoPorId(m.puntoId);
    m.custodia.envio = { fechaHora: combine(v.fecha, v.hora), responsableId: this.usuario.id, origen: `${punto.id} · ${punto.nombre}`, destino: v.destino };
    this.notificar();
    return exito(m);
  },

  /** RF-43 a RF-47: recepción de una muestra «Enviada». */
  confirmarRecepcion(folio, v) {
    const sinPermiso = this.exigir('recepcion_resultados');
    if (sinPermiso) return sinPermiso;
    const m = this.muestraPorFolio(folio);
    if (!m) return fallo({ _form: 'La muestra no existe.' });
    const etapa = etapaDe(m);
    if (etapa === 'Registrada') return fallo({ _form: 'La muestra todavía no fue enviada.' });
    if (etapa !== 'Enviada') return fallo({ _form: 'La recepción de esta muestra ya fue confirmada.' });
    const errores = validate(v, {
      responsableId: [required], fecha: [required, dateField], hora: [required, timeField],
      condicion: [required, unoDe(CONDICIONES_RECEPCION, 'Elija la condición de recepción.')],
    });
    const resp = this.usuarioPorId(v.responsableId);
    if (!errores.responsableId && (!resp || resp.estado !== 'Activo' || !['Laboratorio', 'Administrador'].includes(resp.rol))) errores.responsableId = 'Elija un responsable activo (Laboratorio o Administrador).';
    if (!errores.fecha && !errores.hora) {
      const iso = combine(v.fecha, v.hora);
      const futuro = notFuture(iso, this.ahora());
      if (futuro) errores.fecha = futuro;
      else if (iso < m.custodia.envio.fechaHora) errores.fecha = 'La recepción no puede ser anterior al envío.';
    }
    if (!errores.condicion && v.condicion !== CONDICION_OK) {
      const e = validate(v, { incidencias: [required, (x) => textLength(x, { min: 5, max: 300 })] });
      if (e.incidencias) errores.incidencias = e.incidencias === 'Este campo es obligatorio.' ? 'Describa la incidencia (la condición no es «Envases íntegros y rotulados»).' : e.incidencias;
    }
    if (hayErrores(errores)) return fallo(errores);
    m.custodia.recepcion = { fechaHora: combine(v.fecha, v.hora), responsableId: resp.id, laboratorio: m.custodia.envio.destino, condicion: v.condicion, incidencias: clean(v.incidencias ?? '') };
    this.notificar();
    return exito(m);
  },

  /** Muestras en custodia con búsqueda y filtros (RF-40). */
  listarCustodia({ texto = '', estado = '', desde = '', hasta = '' } = {}) {
    const q = clean(texto).toLowerCase();
    return this.data.muestras.filter((m) => {
      const p = this.puntoPorId(m.puntoId);
      const dia = m.fechaHora.slice(0, 10);
      return (!q || m.folio.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
        && (!estado || etapaDe(m) === estado) && (!desde || dia >= desde) && (!hasta || dia <= hasta);
    }).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
  },
};
