// Registrar muestras (RF-27 a RF-39).
import { fallo, exito, hayErrores } from './result.js';
import { validate, required, textLength, number, coordinates, clean, isBlank, parseNumber, dateField, timeField, notFuture, checkFile } from './validators.js';
import { combine, minutesBetween } from './dates.js';
import { siguienteFolio } from './ids.js';
import { distanciaMetros } from './geo.js';
import { TIPOS_AGUA, OBJETIVOS, PARAMETROS_LAB, combinacionValida, tipoAguaParaRegistro } from './normativa.js';
import { PERIODOS_LLUVIA } from './seed.js';

export const CLASIFICACIONES = ['referencia', 'seguimiento'];
export const MAX_DIAS_ATRAS = 30;
export const MAX_FOTO = 5 * 1048576;
export const DISTANCIA_ADVERTENCIA_M = 500;
export const RANGOS_CAMPO = {
  ph: { min: 0, max: 14, unit: '', nombre: 'pH' },
  temperatura: { min: 0, max: 60, unit: '°C', nombre: 'Temperatura' },
  oxigeno: { min: 0, max: 25, unit: 'mg/L', nombre: 'Oxígeno disuelto' },
  turbidez: { min: 0, max: 1000, unit: 'NTU', nombre: 'Turbidez' },
  conductividad: { min: 0, max: 100000, unit: 'µS/cm', nombre: 'Conductividad' },
};
const unoDe = (lista, msg) => (v) => (v && !lista.includes(v) ? msg : null);
const numOrNull = (v) => (isBlank(v) ? null : parseNumber(v));

export default {
  crearMuestra(v) {
    const sinPermiso = this.exigir('registrar_puntos_muestras');
    if (sinPermiso) return sinPermiso;
    const ahora = this.ahora();
    const errores = validate(v, {
      puntoId: [required],
      fecha: [required, dateField],
      hora: [required, timeField],
      tipoAgua: [required, unoDe(TIPOS_AGUA, 'Elija un tipo de agua de la lista.')],
      objetivo: [required, unoDe(OBJETIVOS, 'Elija un objetivo de la lista.')],
      clasificacion: [required, unoDe(CLASIFICACIONES, 'Elija la clasificación.')],
    });
    const punto = this.puntoPorId(v.puntoId);
    if (!errores.puntoId && !punto) errores.puntoId = 'Elija un punto o pozo de la lista registrada.';
    let fechaHora = null;
    if (!errores.fecha && !errores.hora) {
      fechaHora = combine(v.fecha, v.hora);
      const futuro = notFuture(fechaHora, ahora);
      if (futuro) errores.fecha = futuro;
      else if (minutesBetween(fechaHora, this.ahoraIso()) > MAX_DIAS_ATRAS * 1440) errores.fecha = `No puede ser anterior a ${MAX_DIAS_ATRAS} días.`;
    }
    const tec = this.usuarioPorId(v.tecnicoId);
    if (!tec || tec.estado !== 'Activo' || !['Técnico', 'Administrador'].includes(tec.rol)) errores.tecnicoId = 'Elija un técnico activo (Técnico o Administrador).';
    if (!errores.tipoAgua && punto) { const e = tipoAguaParaRegistro(punto.tipo, v.tipoAgua); if (e) errores.tipoAgua = e; }
    if (!errores.tipoAgua && !errores.objetivo) { const e = combinacionValida(v.tipoAgua, v.objetivo); if (e) errores.objetivo = e; }
    if (v.clasificacion === 'seguimiento') {
      if (isBlank(v.referenciaFolio)) errores.referenciaFolio = 'Elija la muestra de referencia.';
      else {
        const ref = this.data.muestras.find((m) => m.folio === v.referenciaFolio);
        if (!ref) errores.referenciaFolio = 'La muestra de referencia no existe.';
        else if (ref.puntoId !== v.puntoId) errores.referenciaFolio = 'La referencia debe ser del mismo punto o pozo.';
        else if (ref.clasificacion !== 'referencia') errores.referenciaFolio = 'Elija una muestra de clasificación referencia.';
        else if (fechaHora && ref.fechaHora > fechaHora) errores.referenciaFolio = 'La referencia no puede ser posterior al seguimiento.';
      }
    } else if (v.clasificacion === 'referencia' && !isBlank(v.referenciaFolio)) errores.referenciaFolio = 'Una muestra de referencia no lleva referencia enlazada.';
    // Lluvia: los tres datos o ninguno (RF-35)
    const lluviaVacia = [v.lluviaMm, v.lluviaPeriodo, v.lluviaFuente].every(isBlank);
    let lluvia = null;
    if (!lluviaVacia) {
      const L = validate(v, { lluviaMm: [required, (x) => number(x, { min: 0, max: 1000, unit: 'mm' })], lluviaPeriodo: [required, unoDe(PERIODOS_LLUVIA, 'Elija un período.')], lluviaFuente: [required, (x) => textLength(x, { min: 2, max: 80 })] });
      Object.assign(errores, L);
      if (!hayErrores(L)) lluvia = { mm: parseNumber(v.lluviaMm), periodo: v.lluviaPeriodo, fuente: clean(v.lluviaFuente) };
      else errores._lluvia = 'Complete cantidad, período y fuente de la lluvia, o deje los tres vacíos.';
    }
    // GPS opcional: si se informa, completo, en Panamá; advierte si queda lejos del punto (RF-39)
    const advertencias = [];
    let gps = null;
    if (!(isBlank(v.lat) && isBlank(v.lng))) {
      const c = coordinates(v.lat, v.lng);
      if (hayErrores(c.errors)) Object.assign(errores, c.errors);
      else {
        gps = { lat: c.lat, lng: c.lng };
        const d = punto ? distanciaMetros(gps, punto) : 0;
        if (d > DISTANCIA_ADVERTENCIA_M) advertencias.push(`La ubicación capturada está a ${d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m'} del punto registrado.`);
      }
    }
    // Parámetros de campo (opcionales, pero con rango físico, RF-36)
    const campo = {};
    for (const [k, r] of Object.entries(RANGOS_CAMPO)) {
      const e = number(v[k], { min: r.min, max: r.max, unit: r.unit });
      if (e) errores[k] = e;
      campo[k] = numOrNull(v[k]);
    }
    const sol = Array.isArray(v.solicitados) ? v.solicitados : [];
    if (sol.length === 0 || sol.some((k) => !PARAMETROS_LAB[k])) errores.solicitados = 'Elija al menos un parámetro para el laboratorio.';
    if (v.foto) { const e = checkFile(v.foto, { kinds: ['jpg', 'png'], maxBytes: MAX_FOTO }); if (e) errores.foto = e; }
    if (hayErrores(errores)) return fallo(errores);
    const m = {
      folio: siguienteFolio(this.data.muestras, ahora.getFullYear()), puntoId: punto.id, tipoAgua: v.tipoAgua, objetivo: v.objetivo, clasificacion: v.clasificacion,
      referenciaFolio: v.clasificacion === 'seguimiento' ? v.referenciaFolio : null, fechaHora, tecnicoId: tec.id, gps, lluvia, campo, solicitados: [...sol],
      foto: v.foto ? { nombre: v.foto.name, tipo: v.foto.type ?? null, tamano: v.foto.size, url: v.foto.url ?? null } : null,
      custodia: { envio: null, recepcion: null }, resultados: null, revision: null, conversion: null, creadaEn: this.ahoraIso(), creadaPorId: this.usuario.id,
    };
    this.data.muestras.push(m);
    this.notificar();
    return exito(m, { advertencias });
  },

  muestraPorFolio(folio) {
    return this.data.muestras.find((m) => m.folio === folio) ?? null;
  },

  /** Referencias que un seguimiento puede enlazar: del mismo punto, clasificación referencia (RF-34). */
  referenciasDe(puntoId) {
    return this.data.muestras.filter((m) => m.puntoId === puntoId && m.clasificacion === 'referencia').sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
  },
};
