// Histórico mensual de pozos y comparación con la lluvia (spec 003). Datos reales o de ejemplo, siempre con su fuente.
import { fallo, exito } from './result.js';
import { parsearCsv, validarFilaHistorica, serieMensual, compararReferenciaSeguimiento, MAX_FILAS_CSV } from './historico.js';

const MAX_ERRORES_MOSTRADOS = 10;

export default {
  historicoDePunto(id) {
    return this.data.historico.filter((h) => h.puntoId === id).sort((a, b) => a.periodo.localeCompare(b.periodo));
  },

  serieDePunto(id, forma = null) {
    return serieMensual({ registros: this.historicoDePunto(id), muestras: this.muestrasDePunto(id), forma });
  },

  comparacionesDePunto(id) {
    return compararReferenciaSeguimiento(this.muestrasDePunto(id));
  },

  /**
   * Importa filas de un CSV al histórico de UN punto/pozo. Todo o nada: si una fila falla, no se guarda ninguna.
   * El permiso es el mismo de registrar puntos y muestras (no se amplía la matriz de permisos).
   */
  importarHistorico(puntoId, texto) {
    const sinPermiso = this.exigir('registrar_puntos_muestras');
    if (sinPermiso) return sinPermiso;
    if (!this.puntoPorId(puntoId)) return fallo({ _form: 'El pozo o punto no existe.' });
    const { filas, errores: erroresCsv } = parsearCsv(texto);
    if (erroresCsv.length) return fallo({ _form: erroresCsv.join(' ') }, { detalle: erroresCsv });
    if (filas.length === 0) return fallo({ _form: 'El archivo no tiene filas de datos.' });
    if (filas.length > MAX_FILAS_CSV) return fallo({ _form: `El archivo tiene ${filas.length} filas; el máximo es ${MAX_FILAS_CSV}.` });
    const detalle = [];
    const nuevas = [];
    const vistos = new Set(this.historicoDePunto(puntoId).map((h) => h.periodo));
    for (const { n, v } of filas) {
      if (v.punto_id && v.punto_id.toUpperCase() !== puntoId) { detalle.push(`Fila ${n}: el punto_id ${v.punto_id} no coincide con ${puntoId}.`); continue; }
      const { errores, fila } = validarFilaHistorica(v, { ahoraIso: this.ahoraIso() });
      if (!fila) { detalle.push(`Fila ${n}: ${Object.values(errores)[0]}`); continue; }
      if (vistos.has(fila.periodo)) { detalle.push(`Fila ${n}: ya existe un registro de ${fila.periodo} para ${puntoId}.`); continue; }
      vistos.add(fila.periodo);
      nuevas.push(fila);
    }
    if (detalle.length) {
      const extra = detalle.length > MAX_ERRORES_MOSTRADOS ? ` (y ${detalle.length - MAX_ERRORES_MOSTRADOS} más)` : '';
      return fallo({ _form: `No se importó nada: ${detalle.length} fila(s) con error${extra}.` }, { detalle: detalle.slice(0, MAX_ERRORES_MOSTRADOS) });
    }
    for (const f of nuevas) {
      this.data.contador.historico += 1;
      this.data.historico.push({ id: `H-${String(this.data.contador.historico).padStart(4, '0')}`, puntoId, ...f, origen: 'importado', creadoEn: this.ahoraIso(), creadoPorId: this.usuario.id });
    }
    this.notificar();
    return exito({ importadas: nuevas.length });
  },
};
