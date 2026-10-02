// Validadores puros. Cada uno devuelve un texto de error o null. No tocan el DOM.
import { isRealDate, isRealTime, parseIso } from './dates.js';

export const DOMINIO_INSTITUCIONAL = 'miambiente.gob.pa';
// Panamá (con margen): latitud 7,0 a 9,8; longitud -83,2 a -77,0
export const LIMITES_PANAMA = { latMin: 7.0, latMax: 9.8, lngMin: -83.2, lngMax: -77.0 };

export const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
/** Quita espacios de más y caracteres de control. */
export const clean = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim();
export const required = (v) => (isBlank(v) ? 'Este campo es obligatorio.' : null);
const fmt = (n) => String(n).replace('.', ',');

/** Número con punto o coma decimal. Devuelve NaN si no es un número. */
export function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const s = String(v ?? '').trim();
  return /^-?\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(',', '.')) : NaN;
}

/** Opcional por sí solo: vacío es válido (combínelo con required si es obligatorio). */
export function number(v, { min = -Infinity, max = Infinity, unit = '' } = {}) {
  if (isBlank(v)) return null;
  const n = parseNumber(v);
  if (Number.isNaN(n)) return 'Escriba un número válido.';
  if (n < min || n > max) return `Debe estar entre ${fmt(min)} y ${fmt(max)}${unit ? ' ' + unit : ''}.`;
  return null;
}

export function integer(v, { min = 0, max = Infinity } = {}) {
  if (isBlank(v)) return null;
  const n = parseNumber(v);
  if (Number.isNaN(n) || !Number.isInteger(n)) return 'Escriba un número entero.';
  if (n < min || n > max) return `Debe estar entre ${min} y ${max}.`;
  return null;
}

export function textLength(v, { min = 0, max = Infinity } = {}) {
  if (isBlank(v)) return null;
  const n = clean(v).length;
  if (n < min) return `Escriba al menos ${min} caracteres.`;
  if (n > max) return `Escriba como máximo ${max} caracteres.`;
  return null;
}

export const normEmail = (v) => String(v ?? '').trim().toLowerCase();

export function email(v) {
  if (isBlank(v)) return null;
  const s = String(v).trim();
  return s.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? null : 'Escriba un correo válido.';
}

export function institutionalEmail(v) {
  if (isBlank(v)) return null;
  const e = email(v);
  if (e) return e;
  return normEmail(v).endsWith('@' + DOMINIO_INSTITUCIONAL) ? null : `Use su correo institucional (@${DOMINIO_INSTITUCIONAL}).`;
}

export function passwordPolicy(v) {
  const s = String(v ?? '');
  const ok = s.length >= 8 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s);
  return ok ? null : 'La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula y número.';
}

/** Nombre y apellido: al menos dos palabras de letras. */
export function fullName(v) {
  if (isBlank(v)) return null;
  const s = clean(v);
  if (s.length < 5 || s.length > 80) return 'Escriba nombre y apellido (entre 5 y 80 caracteres).';
  return /^[\p{L}][\p{L}.'’-]*(?:\s+[\p{L}][\p{L}.'’-]*)+$/u.test(s) ? null : 'Escriba nombre y apellido, solo con letras.';
}

export function personName(v) {
  if (isBlank(v)) return null;
  return /^[\p{L}][\p{L}.'’ -]{1,39}$/u.test(clean(v)) ? null : 'Use solo letras (de 2 a 40).';
}

export const dateField = (v) => (isBlank(v) ? null : isRealDate(v) ? null : 'Escriba un día real del calendario.');
export const timeField = (v) => (isBlank(v) ? null : isRealTime(v) ? null : 'Escriba una hora válida (HH:MM).');

/** Que el instante no sea posterior a «ahora». */
export function notFuture(iso, now) {
  const d = parseIso(iso);
  return d && d.getTime() > now.getTime() ? 'No puede ser una fecha y hora futura.' : null;
}

/** Coordenadas: devuelve {lat, lng, errors}. Con punto o coma decimal; dentro de Panamá. */
export function coordinates(latV, lngV) {
  const errors = {};
  const lat = parseNumber(latV);
  const lng = parseNumber(lngV);
  if (isBlank(latV)) errors.lat = 'La latitud es obligatoria.';
  else if (Number.isNaN(lat) || lat < -90 || lat > 90) errors.lat = 'Latitud inválida (entre -90 y 90).';
  if (isBlank(lngV)) errors.lng = 'La longitud es obligatoria.';
  else if (Number.isNaN(lng) || lng < -180 || lng > 180) errors.lng = 'Longitud inválida (entre -180 y 180).';
  if (!errors.lat && !errors.lng) {
    const L = LIMITES_PANAMA;
    if (lat < L.latMin || lat > L.latMax || lng < L.lngMin || lng > L.lngMax) {
      errors.lat = 'Las coordenadas están fuera de Panamá.';
      errors.lng = 'Las coordenadas están fuera de Panamá.';
    }
  }
  return { lat, lng, errors };
}

/** Identifica el tipo real de un archivo por sus primeros bytes. */
export function sniffFileType(bytes) {
  const b = bytes || [];
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'pdf';
  return null;
}
const EXT_DE = { jpg: ['jpg', 'jpeg'], png: ['png'], pdf: ['pdf'] };

/** archivo = {name, size, bytes}. kinds = ['jpg','png'] etc. */
export function checkFile(archivo, { kinds, maxBytes }) {
  if (!archivo) return 'Seleccione un archivo.';
  if (!archivo.size) return 'El archivo está vacío.';
  if (archivo.size > maxBytes) return `El archivo supera ${maxBytes / 1048576} MB.`;
  const real = sniffFileType(archivo.bytes);
  const nombres = kinds.map((k) => k.toUpperCase()).join(' o ');
  if (!real || !kinds.includes(real)) return `Solo se admite ${nombres}, y el contenido del archivo no lo es.`;
  const ext = String(archivo.name || '').split('.').pop().toLowerCase();
  if (!EXT_DE[real].includes(ext)) return 'La extensión del archivo no coincide con su contenido.';
  return null;
}

/** Corre las reglas de cada campo; devuelve {campo: primer error}. */
export function validate(values, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const msg = rule(values[field], values);
      if (msg) { errors[field] = msg; break; }
    }
  }
  return errors;
}
