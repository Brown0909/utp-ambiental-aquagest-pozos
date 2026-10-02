// Comportamiento del mapa: marcadores por estado, aro de «muestra reciente», panel del punto elegido y «Mi ubicación».
import { html, montar } from '../ui/dom.js';
import { icono } from '../ui/icons.js';
import { capturarUbicacion } from '../ui/gps.js';
import { coordTexto, profundidadTexto, insigniaMuestra } from '../ui/formato.js';
import { fmtDate } from '../core/dates.js';

export const ESTADOS_MAPA = [['cumple', 'Cumple · revisión confirmada'], ['no_cumple', 'No cumple · revisión confirmada'], ['pendiente', 'Pendiente de laboratorio / revisión técnica'], ['sin_criterio', 'Revisión confirmada · sin criterio'], ['sin_muestras', 'Sin muestras']];
const TEXTO = Object.fromEntries(ESTADOS_MAPA);
const filtros = { tipoRegistro: '', tipoAgua: '', estado: '', desde: '' };   // se conservan durante la visita

export function enlazarMapa(raiz, ctx) {
  const { store } = ctx;
  const L = window.L;
  const form = raiz.querySelector('#filtros');
  Object.entries(filtros).forEach(([k, v]) => { form[k].value = v; });
  const map = L.map(raiz.querySelector('#mapa'), { scrollWheelZoom: false }).setView([8.55, -80.1], 7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
    .addTo(map).once('tileerror', () => { raiz.querySelector('#aviso-mapa').textContent = 'No se cargaron las teselas del mapa (¿sin internet?). Los puntos se muestran igual.'; });
  const marcas = L.layerGroup().addTo(map);
  let datos = [];
  let elegido = null;
  let yo = null;

  const panel = (x) => {
    if (!x) return html`<p class="suave">Elija un punto en el mapa o en la lista.</p>`;
    const { punto: p, muestra: m } = x;
    return html`<h3>${p.tipo === 'Pozo' ? 'Pozo' : 'Punto'} seleccionado</h3><p class="negrita" style="margin-top:6px">${p.id} · ${p.nombre}</p>
      <p class="chico suave">${coordTexto(p.lat, p.lng)} · Comunidad: ${p.comunidad}${p.tipo === 'Pozo' ? ` · Profundidad: ${profundidadTexto(p.profundidad)}` : ''}</p><p class="chico suave">ID permanente · distinto del folio de muestra</p>
      ${m ? html`<p style="margin-top:8px"><a class="negrita" href="#/muestras/${m.folio}">${m.folio}</a> · ${fmtDate(m.fechaHora)} ${insigniaMuestra(store, m)}</p>
        <p class="chico suave">${m.referenciaFolio ? `Referencia ${m.referenciaFolio} · ` : ''}Lluvia: ${m.lluvia ? `${m.lluvia.mm} mm (${m.lluvia.periodo})` : 'sin dato'}</p>` : html`<p class="chico suave" style="margin-top:8px">Sin muestras registradas.</p>`}
      <p style="margin-top:10px"><a class="btn btn-sec btn-chico" href="#/puntos/${p.id}">Ver detalle ${p.tipo === 'Pozo' ? 'del pozo' : 'del punto'}</a></p>`;
  };
  const elegir = (x) => { elegido = x?.punto.id ?? null; montar(raiz.querySelector('#panel-punto'), panel(x)); };

  const pintar = () => {
    marcas.clearLayers();
    datos = store.puntosParaMapa(filtros);
    const limites = [];
    for (const x of datos) {
      const icono_ = L.divIcon({ className: 'pin-caja', iconSize: [34, 34], iconAnchor: [17, 17], html: `<span class="pin c-${x.estado}${x.reciente ? ' reciente' : ''}${x.punto.tipo === 'Pozo' ? ' pozo' : ''}"></span>` });
      L.marker([x.punto.lat, x.punto.lng], { icon: icono_, keyboard: true, title: `${x.punto.id} · ${x.punto.nombre} · ${TEXTO[x.estado]}`, alt: x.punto.nombre }).addTo(marcas).on('click', () => elegir(x));
      limites.push([x.punto.lat, x.punto.lng]);
    }
    if (limites.length) map.fitBounds(limites, { padding: [40, 40], maxZoom: 11 });
    elegir(datos.find((x) => x.punto.id === elegido) ?? null);
    montar(raiz.querySelector('#lista'), datos.length === 0 ? html`<div class="aviso aviso-gris">${icono('buscar')}<div>No hay puntos con estos filtros.</div></div>`
      : html`<div class="apilado">${datos.map((x) => html`<button type="button" class="sel-muestra" data-punto="${x.punto.id}" style="text-align:left;width:100%;cursor:pointer"><div class="fila fila-entre"><strong>${x.punto.id} · ${x.punto.nombre}</strong><span class="badge b-${x.estado}">${TEXTO[x.estado].split(' · ')[0]}</span></div>
        <div class="chico suave">${x.muestra ? `${x.muestra.folio} · ${fmtDate(x.muestra.fechaHora)}` : 'Sin muestras'}</div></button>`)}</div>`);
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', () => { Object.keys(filtros).forEach((k) => { filtros[k] = form[k].value; }); pintar(); });
  raiz.querySelector('#lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-punto]');
    const x = b && datos.find((d) => d.punto.id === b.dataset.punto);
    if (x) { elegir(x); map.setView([x.punto.lat, x.punto.lng], 12); }
  });
  raiz.querySelector('#mi-ubicacion').addEventListener('click', (e) => capturarUbicacion({
    boton: e.currentTarget, estadoEl: raiz.querySelector('#estado-gps'),
    alExito: (lat, lng) => { yo?.remove(); yo = L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#0a7fc8', fillOpacity: 1 }).addTo(map).bindTooltip('Usted está aquí'); map.setView([lat, lng], 13); },
    alError: (msg) => ctx.aviso(msg, 'mal'),
  }));
  pintar();
  return { destruir() { map.remove(); } };
}
