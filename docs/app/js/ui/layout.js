// Marco de las pantallas privadas: menú lateral (según el rol, RF-14), encabezado y campana de alertas.
import { html, raw } from './dom.js';
import { icono, logo } from './icons.js';
import { menuPara } from '../core/permissions.js';
import { fmtLong } from '../core/dates.js';
import { iniciales } from './formato.js';

/** «Registrar Muestra» solo se marca en su propia pantalla; el resto, por su primer tramo (puntos/…). */
function activo(rutaItem, rutaActual) {
  if (rutaItem === 'muestras/nueva') return rutaActual === 'muestras/nueva';
  return rutaItem.split('/')[0] === rutaActual.split('/')[0];
}

export function shell(ctx, { titulo, subtitulo = '', contenido }) {
  const { store, ruta } = ctx;
  const u = store.usuario;
  const alertas = store.alertas().length;
  return html`<div class="shell">
    <aside class="lateral" id="lateral" aria-label="Menú principal">
      <a class="marca" href="#/panel">${logo()}<span><b>AquaGest</b><small>MIAMBIENTE</small></span></a>
      <nav aria-label="Pantallas"><ul class="menu">
        ${menuPara(u).map((i) => html`<li><a href="#/${i.ruta}"${activo(i.ruta, ruta) ? raw(' aria-current="page"') : ''}>${icono(i.icono)}<span>${i.etiqueta}</span></a></li>`)}
      </ul></nav>
      <div class="usuario-caja"><span class="avatar" aria-hidden="true">${iniciales(u.nombre)}</span>
        <div><b>${u.nombre}</b><small>${u.rol} · MiAMBIENTE</small>
        <button type="button" class="btn-enlace" data-salir>${icono('salir', 14)} Cerrar sesión</button></div></div>
    </aside>
    <div class="cortina" data-cerrar-menu></div>
    <div class="principal">
      <header class="encabezado">
        <div class="fila"><button type="button" class="btn-menu" data-abrir-menu aria-label="Abrir menú" aria-controls="lateral">${icono('menu')}</button>
          <div><h1 id="titulo-pagina">${titulo}</h1>${subtitulo ? html`<p class="sub">${subtitulo}</p>` : ''}</div></div>
        <div class="encabezado-der"><span class="chip-fecha">${icono('calendario', 18)} ${fmtLong(store.ahora())}</span>
          <a class="campana" href="#/panel" aria-label="Alertas operativas: ${alertas}">${icono('campana')}${alertas ? html`<span class="n">${alertas}</span>` : ''}</a></div>
      </header>
      <main class="contenido" id="principal" tabindex="-1">${contenido}</main>
    </div>
  </div>`;
}
