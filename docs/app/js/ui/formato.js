// Presentación común: insignias de estado, coordenadas, iniciales, números en español.
import { html } from './dom.js';

export const num = (n) => String(n).replace('.', ',');
export const iniciales = (nombre) => String(nombre).replace(/^(Ing\.|Lic\.|Dr\.|Dra\.)\s*/i, '').split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();

/** 9.0333, -79.5333 -> «9.0333° N, 79.5333° O» (como en el diseño) */
export function coordTexto(lat, lng) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'O'}`;
}

export const profundidadTexto = (p) => (p === null || p === undefined ? '' : `${num(p.toFixed(1))} m`);

const CLAVE_DICTAMEN = { 'Cumple': 'cumple', 'No cumple': 'no_cumple', 'Sin criterio aplicable': 'sin_criterio' };
/** Insignia del estado visible de una muestra (RF-59: Cumple/No cumple solo tras la revisión confirmada). */
export function insigniaMuestra(store, m) {
  const texto = store.etiquetaEstado(m);
  return html`<span class="badge b-${CLAVE_DICTAMEN[texto] ?? 'pendiente'}">${texto}</span>`;
}

const CLAVE_ETAPA = { 'Registrada': 'gris', 'Enviada': 'azul', 'Recibida en laboratorio': 'azul', 'Pendiente de revisión técnica': 'pendiente', 'Revisión confirmada': 'cumple' };
export const insigniaEtapa = (etapa) => html`<span class="badge b-${CLAVE_ETAPA[etapa] ?? 'gris'}">${etapa}</span>`;
export const insigniaClase = (m) => (m.clasificacion === 'referencia' ? html`<span class="badge b-azul">Referencia</span>` : html`<span class="badge b-pendiente">Seguimiento</span>`);

const ETIQUETA_EVAL = { cumple: ['cumple', 'Cumple'], no_cumple: ['no_cumple', 'No cumple'], sin_criterio: ['sin_criterio', 'Sin criterio'], sin_limite: ['gris', 'Límite no cargado'], requiere_conversion: ['pendiente', 'Requiere conversión'] };
export function insigniaEval(estado) {
  const [c, t] = ETIQUETA_EVAL[estado] ?? ['gris', estado];
  return html`<span class="badge b-${c}">${t}</span>`;
}

export const enlaceMuestra = (folio) => html`<a href="#/muestras/${folio}" class="negrita">${folio}</a>`;
export const enlacePunto = (id, nombre) => html`<a href="#/puntos/${id}">${id}${nombre ? ` · ${nombre}` : ''}</a>`;
