// Marco de las pantallas sin sesión: foto-degradado a la izquierda y el formulario a la derecha (láminas 1, 20 y 21).
import { html } from './dom.js';
import { logo, icono as svg } from './icons.js';

export function marcoPublico(derecha) {
  return html`<div class="acceso">
    <section class="acceso-hero">
      <a class="marca" href="#/acceso" style="padding:0">${logo()}<span><b>AquaGest</b><small>PANAMÁ</small></span></a>
      <div><h1>Preservando el Recurso Hídrico de Nuestro País</h1>
        <p>Sistema avanzado de control, muestreo y evaluación normativa de aguas continentales y residuales según estándares COPANIT.</p></div>
      <p class="chico">© 2026 AquaGest Panamá · MiAMBIENTE · Proyecto universitario (UTP) con datos ficticios</p>
    </section>
    <section class="acceso-form"><div class="caja">${derecha}</div>
      <p class="acceso-pie">Uso exclusivo para personal autorizado del Ministerio de Ambiente de la República de Panamá. Esta es una demostración: no hay datos reales.</p></section>
  </div>`;
}

/** Entrada con ícono a la izquierda (acceso y recuperación). */
export function entradaIcono(n, etiqueta, iconoIzq, { tipo = 'text', valor = '', auto = '', ayuda = '', ver = false } = {}) {
  return html`<div class="campo" data-campo="${n}"><label for="f-${n}">${etiqueta}</label>
    <div class="entrada-icono">${iconoIzq}<input id="f-${n}" name="${n}" type="${tipo}" value="${valor}" autocomplete="${auto}" aria-describedby="err-${n}" required aria-required="true">
    ${ver ? html`<button type="button" class="ver" data-ver="${n}" aria-label="Mostrar u ocultar la contraseña">${svg('ojo', 18)}</button>` : ''}</div>
    ${ayuda ? html`<p class="ayuda">${ayuda}</p>` : ''}<p class="error" id="err-${n}" role="alert"></p></div>`;
}

export function enlazarVer(raiz) {
  raiz.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => {
    const i = raiz.querySelector(`#f-${b.dataset.ver}`);
    i.type = i.type === 'password' ? 'text' : 'password';
  }));
}
