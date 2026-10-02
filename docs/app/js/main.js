// Arranque: crea el store (datos de ejemplo en memoria), decide qué pantalla mostrar según la sesión y el rol
// (RF-9, RF-10, RF-15) y la dibuja. Nada se guarda: al recargar, todo vuelve a empezar (RF-72).
import { Store } from './core/store.js';
import { esPublica, puedeVerRuta } from './core/permissions.js';
import { html, montar } from './ui/dom.js';
import { analizarHash, resolver } from './ui/router.js';
import { shell } from './ui/layout.js';
import { aviso } from './ui/avisos.js';
import { icono } from './ui/icons.js';

const store = new Store();
const raiz = document.getElementById('app');
let limpiarPantalla = null;
let contador = 0;

export function navegar(ruta) {
  const destino = `#/${ruta}`;
  if (location.hash === destino) pintar(); else location.hash = destino;
}

const ctx = { store, ruta: '', params: {}, consulta: new URLSearchParams(), navegar, rerender: () => pintar(), aviso };

function enlazarMarco() {
  const cerrar = () => document.body.classList.remove('menu-abierto');
  raiz.querySelector('[data-abrir-menu]')?.addEventListener('click', () => document.body.classList.add('menu-abierto'));
  raiz.querySelector('[data-cerrar-menu]')?.addEventListener('click', cerrar);
  raiz.querySelectorAll('.menu a').forEach((a) => a.addEventListener('click', cerrar));
  raiz.querySelector('[data-salir]')?.addEventListener('click', () => { cerrar(); store.logout(); aviso('Sesión cerrada.'); navegar('acceso'); });
}

function mostrarMarco(titulo, contenido, subtitulo = '') {
  montar(raiz, shell(ctx, { titulo, subtitulo, contenido }));
  enlazarMarco();
}

const sinPermiso = html`<div class="aviso aviso-mal">${icono('candado')}<div><strong>No tiene permiso para abrir esta pantalla.</strong>Su rol no incluye esta acción. Use el menú para ir a una pantalla disponible.</div></div>`;
const noEncontrada = html`<div class="aviso aviso-amarillo">${icono('alerta')}<div><strong>La pantalla no existe.</strong>Revise la dirección o use el menú.</div></div>`;

async function pintar() {
  const mio = ++contador;
  limpiarPantalla?.();
  limpiarPantalla = null;
  document.body.classList.remove('menu-abierto');
  const { ruta, consulta } = analizarHash(location.hash);
  if (!ruta) return navegar(store.usuario ? 'panel' : 'acceso');
  Object.assign(ctx, { ruta, consulta, params: {} });
  const user = store.usuario;
  const publica = esPublica(ruta);
  if (!publica && !user) return navegar('acceso');                    // RF-10
  if (publica && user && ruta === 'acceso') return navegar('panel');
  const destino = resolver(ruta);
  if (!destino) { if (user) mostrarMarco('No encontrada', noEncontrada); else navegar('acceso'); return; }
  if (!publica && !puedeVerRuta(user, ruta)) { mostrarMarco('No tiene permiso', sinPermiso); return; }   // RF-15
  ctx.params = destino.params;
  try {
    const modulo = await destino.cargar();
    if (mio !== contador) return;                                      // llegó otra navegación mientras cargaba
    const p = modulo.default(ctx);
    if (publica) { montar(raiz, p.contenido); p.montar?.(raiz); }
    else { mostrarMarco(p.titulo, p.contenido, p.subtitulo); p.montar?.(raiz.querySelector('#principal')); }
    limpiarPantalla = p.limpiar ?? null;
    window.scrollTo(0, 0);
    (raiz.querySelector('#principal') ?? raiz).focus({ preventScroll: true });
  } catch (err) {
    console.error(err);
    const caja = html`<div class="aviso aviso-mal">${icono('alerta')}<div><strong>Ocurrió un error al mostrar la pantalla.</strong>Recargue la página. (Detalle técnico en la consola del navegador.)</div></div>`;
    if (user) mostrarMarco('Error', caja); else montar(raiz, caja);
  }
}

window.addEventListener('hashchange', pintar);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.body.classList.remove('menu-abierto'); });
pintar();
