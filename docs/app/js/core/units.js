// Nitrato: NO3 (ion nitrato) y NO3-N (nitrógeno de nitrato) son FORMAS DISTINTAS del mismo dato.
// Factor: NO3 / N = 62,0 / 14,0 ≈ 4,43. 10 mg/L como NO3-N equivalen a ~44,3 mg/L como NO3.
export const FACTOR_NO3_A_NO3N = 4.43;
export const FORMAS_NITRATO = ['NO3', 'NO3-N'];

export const etiquetaForma = (forma) => (forma === 'NO3' ? 'NO₃ (ion nitrato)' : 'NO₃-N (nitrógeno de nitrato)');
export const etiquetaFormaCorta = (forma) => (forma === 'NO3' ? 'NO₃' : 'NO₃-N');

export function convertirNitrato(valor, desde, hacia) {
  if (!FORMAS_NITRATO.includes(desde) || !FORMAS_NITRATO.includes(hacia)) throw new Error('Forma de nitrato desconocida');
  if (desde === hacia) return valor;
  return desde === 'NO3' ? valor / FACTOR_NO3_A_NO3N : valor * FACTOR_NO3_A_NO3N;
}

export const redondear = (n, decimales = 2) => Math.round(n * 10 ** decimales) / 10 ** decimales;
/** 4.8 -> '4,8' */
export const numTexto = (n, decimales = 2) => String(redondear(n, decimales)).replace('.', ',');
