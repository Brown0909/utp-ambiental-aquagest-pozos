// Plantillas HTML SEGURAS (RF-71, 🔴 XSS): todo valor que se interpola se ESCAPA por defecto.
// Para insertar HTML ya construido hay que pedirlo a propósito con raw() o devolviendo otra plantilla html``.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

class Crudo {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}
export const raw = (texto) => new Crudo(String(texto));

function pieza(v) {
  if (v instanceof Crudo) return v.texto;
  if (Array.isArray(v)) return v.map(pieza).join('');
  if (v === null || v === undefined || v === false || v === true) return '';
  return esc(v);
}

/** html`<p>${valor}</p>` -> Crudo. Los valores se escapan; las plantillas anidadas y los arreglos se respetan. */
export function html(literales, ...valores) {
  let salida = '';
  literales.forEach((l, i) => { salida += l; if (i < valores.length) salida += pieza(valores[i]); });
  return new Crudo(salida);
}

export const aTexto = (plantilla) => (plantilla instanceof Crudo ? plantilla.texto : esc(plantilla));
export function montar(elemento, plantilla) { elemento.innerHTML = aTexto(plantilla); }

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
