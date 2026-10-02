// Campos de formulario con error DE TEXTO asociado al campo (RNF-4). Todo valor se escapa (RF-71).
import { html, raw } from './dom.js';
import { icono } from './icons.js';

const atr = (cond, texto) => (cond ? raw(texto) : '');
const req = (r) => (r ? html`<span class="req" aria-hidden="true">*</span>` : '');
const descr = (n, ayuda) => `err-${n}${ayuda ? ` ayu-${n}` : ''}`;
const pie = (n, ayuda) => html`${ayuda ? html`<p class="ayuda" id="ayu-${n}">${ayuda}</p>` : ''}<p class="error" id="err-${n}" role="alert"></p>`;
const normalizar = (ops) => ops.map((o) => (typeof o === 'string' ? { valor: o, etiqueta: o } : o));

export function entrada(n, etiqueta, { tipo = 'text', valor = '', requerido = false, ayuda = '', placeholder = '', lectura = false, modo = '', min = '', max = '', paso = '', auto = '', largo = '' } = {}) {
  return html`<div class="campo" data-campo="${n}"><label for="f-${n}">${etiqueta} ${req(requerido)}</label>
    <input id="f-${n}" name="${n}" type="${tipo}" value="${valor}" placeholder="${placeholder}" aria-describedby="${descr(n, ayuda)}"
      ${atr(requerido, ' required aria-required="true"')}${atr(lectura, ' readonly')}${atr(modo, ` inputmode="${modo}"`)}${atr(min !== '', ` min="${min}"`)}${atr(max !== '', ` max="${max}"`)}${atr(paso, ` step="${paso}"`)}${atr(auto, ` autocomplete="${auto}"`)}${atr(largo, ` maxlength="${largo}"`)}>
    ${pie(n, ayuda)}</div>`;
}

export function area(n, etiqueta, { valor = '', requerido = false, ayuda = '', largo = 500, filas = 3 } = {}) {
  return html`<div class="campo" data-campo="${n}"><label for="f-${n}">${etiqueta} ${req(requerido)}</label>
    <textarea id="f-${n}" name="${n}" rows="${filas}" maxlength="${largo}" aria-describedby="${descr(n, ayuda)}">${valor}</textarea>${pie(n, ayuda)}</div>`;
}

/** opciones = [{valor, etiqueta}] o ['texto'] */
export function selector(n, etiqueta, opciones, { valor = '', requerido = false, ayuda = '', vacio = 'Seleccione…', deshabilitado = false } = {}) {
  const ops = normalizar(opciones);
  return html`<div class="campo" data-campo="${n}"><label for="f-${n}">${etiqueta} ${req(requerido)}</label>
    <select id="f-${n}" name="${n}" aria-describedby="${descr(n, ayuda)}"${atr(requerido, ' required aria-required="true"')}${atr(deshabilitado, ' disabled')}>
      ${vacio === null ? '' : html`<option value="">${vacio}</option>`}
      ${ops.map((o) => html`<option value="${o.valor}"${atr(String(o.valor) === String(valor), ' selected')}>${o.etiqueta}</option>`)}
    </select>${pie(n, ayuda)}</div>`;
}

export function pastillas(n, etiqueta, opciones, valor = '', { requerido = false, ayuda = '' } = {}) {
  const ops = normalizar(opciones);
  return html`<div class="campo" data-campo="${n}" role="radiogroup" aria-labelledby="t-${n}"><span class="campo-titulo" id="t-${n}">${etiqueta} ${req(requerido)}</span>
    <div class="pastillas">${ops.map((o) => html`<label><input type="radio" name="${n}" value="${o.valor}"${atr(String(o.valor) === String(valor), ' checked')}><span>${o.etiqueta}</span></label>`)}</div>
    ${pie(n, ayuda)}</div>`;
}

export function casillas(n, etiqueta, opciones, marcadas = [], { requerido = false, ayuda = '' } = {}) {
  const ops = normalizar(opciones);
  return html`<div class="campo" data-campo="${n}" role="group" aria-labelledby="t-${n}"><span class="campo-titulo" id="t-${n}">${etiqueta} ${req(requerido)}</span>
    <div class="casillas">${ops.map((o) => html`<label><input type="checkbox" name="${n}" value="${o.valor}"${atr(marcadas.includes(o.valor), ' checked')}> ${o.etiqueta}</label>`)}</div>
    ${pie(n, ayuda)}</div>`;
}

/** Medición de campo con su unidad (pH, temperatura…). */
export function parametro(n, etiqueta, unidad, valor = '') {
  return html`<div class="parametro" data-campo="${n}"><label for="f-${n}">${etiqueta}</label>
    <input id="f-${n}" name="${n}" type="text" inputmode="decimal" value="${valor}" autocomplete="off" aria-describedby="err-${n}">
    <span class="unidad">${unidad || ' '}</span><p class="error" id="err-${n}" role="alert"></p></div>`;
}

export const errorForm = () => html`<div class="aviso aviso-mal error-form" role="alert">${icono('alerta')}<div class="texto"></div></div>`;

/** Lee un formulario: casillas -> arreglo, radios -> su valor, archivos se ignoran. */
export function leer(form) {
  const v = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled || el.type === 'file' || el.type === 'button' || el.type === 'submit') continue;
    if (el.type === 'checkbox') { v[el.name] ??= []; if (el.checked) v[el.name].push(el.value); }
    else if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; else v[el.name] ??= ''; }
    else v[el.name] = el.value;
  }
  return v;
}

export function limpiarErrores(form) {
  form.querySelectorAll('.con-error').forEach((c) => c.classList.remove('con-error'));
  form.querySelectorAll('.error').forEach((e) => { e.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
  const g = form.querySelector('.error-form');
  if (g) { g.classList.remove('visible'); g.querySelector('.texto').textContent = ''; }
}

/** Muestra cada error junto a su campo (textContent: nunca HTML). Lo que no tiene campo va al aviso del formulario. */
export function mostrarErrores(form, errores) {
  limpiarErrores(form);
  const sueltos = [];
  let primero = null;
  for (const [nombre, msg] of Object.entries(errores)) {
    const cont = nombre === '_form' ? null : form.querySelector(`[data-campo="${CSS.escape(nombre)}"]`);
    if (!cont) { sueltos.push(msg); continue; }
    cont.classList.add('con-error');
    cont.querySelector('.error').textContent = msg;
    cont.querySelectorAll('input,select,textarea').forEach((i) => i.setAttribute('aria-invalid', 'true'));
    primero ??= cont;
  }
  const caja = form.querySelector('.error-form');
  if (sueltos.length && caja) { caja.querySelector('.texto').textContent = sueltos.join(' '); caja.classList.add('visible'); primero ??= caja; }
  if (primero) {
    (primero.querySelector('input:not([type=radio]):not([type=checkbox]),select,textarea,input') ?? primero).focus?.({ preventScroll: true });
    primero.scrollIntoView?.({ block: 'center' });
  }
}
