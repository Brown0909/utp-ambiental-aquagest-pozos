// Resultados de laboratorio (RF-48 a RF-53). Se guardan TAL COMO se reportaron (valor y forma de nitrato).
import { fallo, exito, hayErrores } from './result.js';
import { validate, required, textLength, number, integer, isBlank, parseNumber, clean, dateField, notFuture, checkFile } from './validators.js';
import { FORMAS_NITRATO } from './units.js';
import { etapaDe } from './store-flujo.js';

export const MAX_CERTIFICADO = 10 * 1048576;
const REGLAS = {
  nitrato: (x) => number(x, { min: 0, max: 1000, unit: 'mg/L' }),
  conductividad: (x) => number(x, { min: 0, max: 100000, unit: 'µS/cm' }),
  coliformes_totales: (x) => integer(x, { min: 0, max: 100000 }),
  e_coli: (x) => integer(x, { min: 0, max: 100000 }),
};

export default {
  guardarResultados(folio, v) {
    const sinPermiso = this.exigir('recepcion_resultados');
    if (sinPermiso) return sinPermiso;
    const m = this.muestraPorFolio(folio);
    if (!m) return fallo({ _form: 'La muestra no existe.' });
    const etapa = etapaDe(m);
    if (etapa === 'Registrada' || etapa === 'Enviada') return fallo({ _form: 'La muestra todavía no fue recibida en el laboratorio.' });
    if (etapa !== 'Recibida en laboratorio') return fallo({ _form: 'Esta muestra ya tiene resultados cargados.' });
    const errores = {};
    const valores = {};
    for (const key of m.solicitados) {
      const crudo = v[key];
      const e = isBlank(crudo) ? 'Escriba el resultado de este parámetro.' : REGLAS[key](crudo);
      if (e) errores[key] = e; else valores[key] = { valor: parseNumber(crudo) };
    }
    if (m.solicitados.includes('nitrato')) {
      if (!FORMAS_NITRATO.includes(v.nitratoForma)) errores.nitratoForma = 'Indique la forma reportada: NO3 o NO3-N.';
      else if (valores.nitrato) valores.nitrato.forma = v.nitratoForma;
    }
    Object.assign(errores, validate(v, { fechaAnalisis: [required, dateField], laboratorio: [required, (x) => textLength(x, { min: 2, max: 80 })] }));
    if (!errores.fechaAnalisis) {
      if (notFuture(`${v.fechaAnalisis}T00:00`, this.ahora())) errores.fechaAnalisis = 'La fecha del análisis no puede ser futura.';
      else if (v.fechaAnalisis < m.custodia.recepcion.fechaHora.slice(0, 10)) errores.fechaAnalisis = 'El análisis no puede ser anterior a la recepción.';
    }
    const cert = v.certificado;
    const ec = checkFile(cert, { kinds: ['pdf'], maxBytes: MAX_CERTIFICADO });
    if (ec) errores.certificado = ec;
    if (hayErrores(errores)) return fallo(errores);
    m.resultados = {
      fechaAnalisis: v.fechaAnalisis, laboratorio: clean(v.laboratorio), valores,
      certificado: { nombre: cert.name, tamano: cert.size, url: cert.url ?? null, demo: !!cert.demo },
      cargadoPorId: this.usuario.id, cargadoEn: this.ahoraIso(),
    };
    this.notificar();
    return exito(m);
  },
};
