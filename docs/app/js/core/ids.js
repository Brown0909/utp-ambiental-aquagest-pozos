// Identificadores: el ID del punto/pozo es PERMANENTE y distinto del folio de la muestra.
const pad3 = (n) => String(n).padStart(3, '0');

export const esFolio = (s) => /^AG-\d{4}-\d{3,}$/.test(String(s ?? ''));
export const esIdPunto = (s) => /^(PZ|PT)-\d{3,}$/.test(String(s ?? ''));

/** PZ-018 -> el siguiente es PZ-019; los huecos no se reutilizan (PT-001, PT-002, PT-004 -> PT-005). */
export function siguienteIdPunto(registros, tipo) {
  const prefijo = tipo === 'Pozo' ? 'PZ' : 'PT';
  const re = new RegExp('^' + prefijo + '-([0-9]+)$');
  const max = registros.reduce((m, r) => Math.max(m, Number(re.exec(r.id)?.[1] ?? 0)), 0);
  return `${prefijo}-${pad3(max + 1)}`;
}

/** AG-2026-081 -> AG-2026-082; en un año nuevo vuelve a AG-AAAA-001. */
export function siguienteFolio(muestras, anio) {
  const re = new RegExp('^AG-' + anio + '-([0-9]+)$');
  const max = muestras.reduce((m, x) => Math.max(m, Number(re.exec(x.folio)?.[1] ?? 0)), 0);
  return `AG-${anio}-${pad3(max + 1)}`;
}
