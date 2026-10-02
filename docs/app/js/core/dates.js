// Fechas y horas LOCALES sin zonas horarias. Formato interno de un instante: 'AAAA-MM-DDTHH:mm'.
// Compararlos como texto equivale a compararlos como fechas.
const pad = (n, w = 2) => String(n).padStart(w, '0');
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const toIso = (d) => `${toDateStr(d)}T${toTimeStr(d)}`;

/** ¿Es un día real del calendario? (rechaza 31 de febrero) */
export function isRealDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

export function isRealTime(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s ?? ''));
}

export const combine = (dateStr, timeStr) => `${dateStr}T${timeStr}`;

/** 'AAAA-MM-DDTHH:mm' -> Date, o null si no es un instante real. */
export function parseIso(iso) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(String(iso ?? ''));
  if (!m || !isRealDate(m[1]) || !isRealTime(m[2])) return null;
  const [y, mo, d] = m[1].split('-').map(Number);
  const [h, mi] = m[2].split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

export function addMinutes(iso, minutes) {
  const d = parseIso(iso);
  return toIso(new Date(d.getTime() + minutes * 60000));
}

/** Minutos que pasan de a hasta b (positivo si b es posterior). */
export function minutesBetween(a, b) {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 60000);
}

export const fmtDate = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
export const fmtTime = (iso) => String(iso).slice(11, 16);
export const fmtDateTime = (iso) => `${fmtDate(iso)} · ${fmtTime(iso)}`;
/** '2 Oct, 2026' */
export const fmtLong = (d) => `${d.getDate()} ${MESES[d.getMonth()]}, ${d.getFullYear()}`;
export const monthKey = (iso) => String(iso).slice(0, 7);
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
