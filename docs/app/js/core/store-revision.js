// Evaluación normativa y revisión técnica (RF-54 a RF-60).
// «Cumple / No cumple» solo existe después de que un Administrador confirma la revisión (RF-59, principio 10).
import { fallo, exito, hayErrores } from './result.js';
import { validate, required, textLength, clean } from './validators.js';
import { evaluar, limitesPara } from './normativa.js';
import { FACTOR_NO3_A_NO3N } from './units.js';
import { etapaDe } from './store-flujo.js';

export default {
  /** Comparación en vivo (solo propuesta). null si la muestra no tiene resultados. */
  evaluacionDe(folio) {
    const m = this.muestraPorFolio(folio);
    return m && m.resultados ? evaluar(m, m.resultados, m.conversion) : null;
  },

  /** RF-58: un Administrador documenta la conversión NO3 <-> NO3-N. El valor original no se toca. */
  documentarConversion(folio, { nota }) {
    const sinPermiso = this.exigir('confirmar_revision');
    if (sinPermiso) return sinPermiso;
    const m = this.muestraPorFolio(folio);
    if (!m) return fallo({ _form: 'La muestra no existe.' });
    if (etapaDe(m) !== 'Pendiente de revisión técnica') return fallo({ _form: 'Solo se documenta la conversión mientras la revisión técnica está pendiente.' });
    if (m.conversion) return fallo({ _form: 'La conversión ya fue documentada.' });
    const dato = m.resultados.valores.nitrato;
    const lim = limitesPara(m.tipoAgua, m.objetivo).nitrato;
    if (!dato || !lim) return fallo({ _form: 'Esta muestra no tiene un límite de nitrato contra el cual convertir.' });
    if (dato.forma === lim.forma) return fallo({ _form: 'No hace falta convertir: la forma reportada ya coincide con la del límite.' });
    const errores = validate({ nota }, { nota: [required, (x) => textLength(x, { min: 10, max: 300 })] });
    if (hayErrores(errores)) return fallo(errores);
    m.conversion = { documentada: true, nota: clean(nota), factor: FACTOR_NO3_A_NO3N, desde: dato.forma, hacia: lim.forma, porId: this.usuario.id, fecha: this.ahoraIso() };
    this.notificar();
    return exito(m);
  },

  /** RF-60: confirma la revisión; registra analista, fecha y dictamen. Bloqueada si falta una conversión (RF-57). */
  confirmarRevision(folio, { observaciones }) {
    const sinPermiso = this.exigir('confirmar_revision');
    if (sinPermiso) return sinPermiso;
    const m = this.muestraPorFolio(folio);
    if (!m) return fallo({ _form: 'La muestra no existe.' });
    if (etapaDe(m) !== 'Pendiente de revisión técnica') return fallo({ _form: m.revision ? 'La revisión de esta muestra ya fue confirmada.' : 'La muestra todavía no tiene resultados para revisar.' });
    const errores = validate({ observaciones }, { observaciones: [required, (x) => textLength(x, { min: 10, max: 500 })] });
    if (hayErrores(errores)) return fallo(errores);
    const ev = evaluar(m, m.resultados, m.conversion);
    if (ev.dictamen.bloqueado) return fallo({ _form: `${ev.dictamen.motivos[0]} No se puede confirmar la revisión hasta documentarla.` }, { bloqueada: true });
    m.revision = {
      dictamen: ev.dictamen.valor, parcial: ev.dictamen.parcial, motivos: ev.dictamen.motivos, analistaId: this.usuario.id,
      fecha: this.ahoraIso(), observaciones: clean(observaciones), filas: ev.filas,
    };
    this.notificar();
    return exito(m);
  },
};
