// Puntos y pozos (RF-17 a RF-26).
import { fallo, exito, hayErrores } from './result.js';
import { validate, required, textLength, number, coordinates, clean, isBlank, parseNumber } from './validators.js';
import { siguienteIdPunto } from './ids.js';

export const TIPOS_REGISTRO = ['Punto', 'Pozo'];
export const POR_PAGINA = 10;
const norm = (s) => clean(s).toLowerCase();

/** Valida los datos de un punto o pozo. La profundidad solo se pide a los pozos (RF-20). */
function validarPunto(v, tipo) {
  const errores = validate(v, {
    nombre: [required, (x) => textLength(x, { min: 3, max: 80 })],
    comunidad: [required, (x) => textLength(x, { min: 2, max: 60 })],
  });
  if (tipo === 'Pozo') {
    if (isBlank(v.profundidad)) errores.profundidad = 'La profundidad es obligatoria para un pozo.';
    else { const e = number(v.profundidad, { min: 0.5, max: 500, unit: 'm' }); if (e) errores.profundidad = e; }
  }
  const c = coordinates(v.lat, v.lng);
  Object.assign(errores, c.errors);
  return { errores, lat: c.lat, lng: c.lng };
}

export default {
  puntoPorId(id) {
    return this.data.puntos.find((p) => p.id === id) ?? null;
  },

  muestrasDePunto(id) {
    return this.data.muestras.filter((m) => m.puntoId === id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
  },

  crearPunto(v) {
    const sinPermiso = this.exigir('registrar_puntos_muestras');
    if (sinPermiso) return sinPermiso;
    if (!TIPOS_REGISTRO.includes(v.tipo)) return fallo({ tipo: 'Elija Punto o Pozo.' });
    const { errores, lat, lng } = validarPunto(v, v.tipo);
    if (!errores.nombre && !errores.comunidad && this.data.puntos.some((p) => norm(p.nombre) === norm(v.nombre) && norm(p.comunidad) === norm(v.comunidad))) {
      errores.nombre = 'Ya existe un registro con este nombre en esa comunidad.';
    }
    if (hayErrores(errores)) return fallo(errores);
    const punto = {
      id: siguienteIdPunto(this.data.puntos, v.tipo), tipo: v.tipo, nombre: clean(v.nombre), comunidad: clean(v.comunidad),
      profundidad: v.tipo === 'Pozo' ? parseNumber(v.profundidad) : null, lat, lng, creadoEn: this.ahoraIso(),
    };
    this.data.puntos.push(punto);
    this.notificar();
    return exito(punto);
  },

  /** RF-24: edita nombre, comunidad, profundidad y coordenadas. El ID y el tipo no cambian. */
  editarPunto(id, v) {
    const sinPermiso = this.exigir('registrar_puntos_muestras');
    if (sinPermiso) return sinPermiso;
    const punto = this.puntoPorId(id);
    if (!punto) return fallo({ _form: 'El registro no existe.' });
    const { errores, lat, lng } = validarPunto(v, punto.tipo);
    if (!errores.nombre && !errores.comunidad && this.data.puntos.some((p) => p.id !== id && norm(p.nombre) === norm(v.nombre) && norm(p.comunidad) === norm(v.comunidad))) {
      errores.nombre = 'Ya existe un registro con este nombre en esa comunidad.';
    }
    if (hayErrores(errores)) return fallo(errores);
    Object.assign(punto, { nombre: clean(v.nombre), comunidad: clean(v.comunidad), profundidad: punto.tipo === 'Pozo' ? parseNumber(v.profundidad) : null, lat, lng });
    this.notificar();
    return exito(punto);
  },

  /** RF-17: búsqueda por nombre, ID o comunidad; filtros por tipo y comunidad; páginas de 10. */
  listarPuntos({ texto = '', tipo = '', comunidad = '', pagina = 1 } = {}) {
    const q = norm(texto);
    const filtrados = this.data.puntos.filter((p) => (!tipo || p.tipo === tipo) && (!comunidad || p.comunidad === comunidad)
      && (!q || norm(p.nombre).includes(q) || p.id.toLowerCase().includes(q) || norm(p.comunidad).includes(q)));
    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const actual = Math.min(Math.max(1, Number(pagina) || 1), paginas);
    return {
      total: filtrados.length, pozos: filtrados.filter((p) => p.tipo === 'Pozo').length, puntos: filtrados.filter((p) => p.tipo === 'Punto').length,
      pagina: actual, paginas, items: filtrados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA),
    };
  },

  comunidades() {
    return [...new Set(this.data.puntos.map((p) => p.comunidad))].sort((a, b) => a.localeCompare(b, 'es'));
  },

  /** RF-26: pozos con una muestra de seguimiento sin revisión confirmada. */
  pozosConSeguimientoPendiente() {
    return this.data.puntos.filter((p) => p.tipo === 'Pozo').map((p) => ({ punto: p, muestras: this.data.muestras.filter((m) => m.puntoId === p.id && m.clasificacion === 'seguimiento' && !m.revision) })).filter((x) => x.muestras.length > 0);
  },
};
