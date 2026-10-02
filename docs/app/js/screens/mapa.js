// Láminas 13 y 27 — Mapa de puntos y pozos (RF-63, RF-64). Leaflet + OpenStreetMap; los marcadores son propios (divIcon).
import { html } from '../ui/dom.js';
import { entrada, selector } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { TIPOS_AGUA } from '../core/normativa.js';
import { ESTADOS_MAPA, enlazarMapa } from './mapaLogica.js';

export default function mapa(ctx) {
  const contenido = html`
    <section class="tarjeta"><h2>Filtros del mapa</h2><form id="filtros" novalidate class="rejilla rejilla-4" style="margin-top:12px">
      ${selector('tipoRegistro', 'Tipo de registro', ['Punto', 'Pozo'], { vacio: 'Todos' })}${selector('tipoAgua', 'Tipo de agua', TIPOS_AGUA, { vacio: 'Todos' })}
      ${selector('estado', 'Estado', ESTADOS_MAPA.map(([v, e]) => ({ valor: v, etiqueta: e })), { vacio: 'Todos' })}${entrada('desde', 'Última muestra desde', { tipo: 'date' })}</form></section>
    <div class="rejilla dos-col" style="margin-top:16px"><section class="tarjeta" style="margin:0;padding:12px"><div id="mapa" class="mapa" role="region" aria-label="Mapa de puntos y pozos"></div>
      <div class="fila fila-entre" style="margin-top:10px"><span class="chico suave" id="aviso-mapa" role="status"></span><span class="fila"><span class="chico suave" id="estado-gps" role="status"></span><button type="button" class="btn btn-neutro btn-chico" id="mi-ubicacion">${icono('navegar', 16)} Mi ubicación</button></span></div></section>
      <section class="tarjeta" style="margin:0"><div id="panel-punto"></div>
        <h3 style="margin:18px 0 8px">Leyenda</h3><ul class="leyenda-lista">${ESTADOS_MAPA.map(([v, t]) => html`<li><span class="punto c-${v}"></span>${t}</li>`)}<li><span class="aro"></span>Muestra reciente (últimas 72 h): aro neutro, independiente del color</li></ul>
        <p class="chico suave">Icono con punto blanco: pozo (agua subterránea).</p></section></div>
    <section class="tarjeta"><h2 id="t-lista">Puntos registrados</h2><div id="lista" style="margin-top:10px"></div></section>`;
  let controlador = null;
  return {
    titulo: 'Mapa de puntos y pozos',
    subtitulo: 'Ubicación y estado del registro de muestreo.',
    contenido,
    limpiar() { controlador?.destruir(); controlador = null; },
    montar(raiz) { controlador = enlazarMapa(raiz, ctx); },
  };
}
