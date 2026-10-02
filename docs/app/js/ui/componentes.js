// Bloques que se repiten en varias pantallas: cronología, resultados, lluvia y mediciones de campo.
import { html } from './dom.js';
import { icono } from './icons.js';
import { fmtDateTime, fmtDate } from '../core/dates.js';
import { numTexto, etiquetaFormaCorta } from '../core/units.js';
import { PARAMETROS_LAB, ORDEN_PARAMETROS } from '../core/normativa.js';
import { RANGOS_CAMPO } from '../core/store-muestras.js';
import { num } from './formato.js';

export function lineaTiempo(pasos) {
  return html`<ol class="linea">${pasos.map((p) => html`<li class="${p.enCurso ? 'en-curso' : ''}"><span class="hito"></span>
    <div><strong>${p.titulo}</strong>${p.enCurso ? html` <span class="badge b-pendiente">En curso</span>` : ''}
    <div class="chico suave">${p.fechaHora ? fmtDateTime(p.fechaHora) + ' · ' : ''}${p.responsable}</div></div></li>`)}</ol>`;
}

/** Lluvia asociada: «Sin dato» si no se registró (RF-35). */
export function bloqueLluvia(m) {
  const d = (v) => (v === null || v === undefined ? 'Sin dato' : v);
  return html`<div class="rejilla rejilla-3">
    <div><div class="chico suave">Cantidad (mm)</div><div class="negrita">${m.lluvia ? num(m.lluvia.mm) : 'Sin dato'}</div></div>
    <div><div class="chico suave">Período</div><div class="negrita">${d(m.lluvia?.periodo)}</div></div>
    <div><div class="chico suave">Fuente</div><div class="negrita">${d(m.lluvia?.fuente)}</div></div></div>
    ${m.lluvia ? '' : html`<p class="chico suave" style="margin-top:8px">No hay registro meteorológico disponible.</p>`}`;
}

/** Valores tal como los reportó el laboratorio (RF-53): el nitrato conserva su forma. */
export function bloqueResultados(m) {
  if (!m.resultados) return html`<div class="aviso aviso-gris">${icono('reloj')}<div>Todavía no hay resultados de laboratorio para esta muestra.</div></div>`;
  const r = m.resultados;
  return html`<div class="tabla-caja"><table><thead><tr><th>Parámetro</th><th>Resultado</th><th>Unidad</th></tr></thead><tbody>
    ${ORDEN_PARAMETROS.filter((k) => r.valores[k]).map((k) => { const v = r.valores[k]; return html`<tr><td>${PARAMETROS_LAB[k].nombre}${v.forma ? html` <span class="chico suave">(como ${etiquetaFormaCorta(v.forma)})</span>` : ''}</td><td class="negrita">${num(v.valor)}</td><td>${PARAMETROS_LAB[k].unidad}</td></tr>`; })}
    </tbody></table></div>
    <p class="chico suave" style="margin-top:8px">Análisis ${fmtDate(r.fechaAnalisis)} · ${r.laboratorio} · Certificado: ${r.certificado.url ? html`<a href="${r.certificado.url}" target="_blank" rel="noopener">${r.certificado.nombre}</a>` : r.certificado.nombre}${r.certificado.demo ? ' (de demostración)' : ''}</p>
    ${m.resultados.valores.nitrato ? html`<p class="chico" style="margin-top:6px">Nitrato reportado como ${etiquetaFormaCorta(r.valores.nitrato.forma)}: se conserva la forma y la unidad exactas del laboratorio.</p>` : ''}`;
}

export function bloqueCampo(m) {
  const c = m.campo ?? {};
  const hay = Object.values(c).some((v) => v !== null && v !== undefined);
  if (!hay) return html`<p class="suave">No se registraron mediciones de campo.</p>`;
  return html`<div class="parametros">${Object.entries(RANGOS_CAMPO).filter(([k]) => c[k] !== null && c[k] !== undefined).map(([k, r]) => html`<div class="parametro"><label>${r.nombre}</label><div class="negrita" style="font-size:20px">${num(c[k])}</div><span class="unidad">${r.unit || 'pH'}</span></div>`)}</div>
    <p class="chico suave" style="margin-top:8px">La conductividad de campo es una medición independiente de la de laboratorio.</p>`;
}

export { numTexto };
