// Láminas 5 y 15 — Puntos y pozos: búsqueda, filtros, conteo y páginas de 10 (RF-17, RF-26).
import { html, montar } from '../ui/dom.js';
import { entrada, selector } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { coordTexto, profundidadTexto, insigniaMuestra, insigniaClase } from '../ui/formato.js';
import { fmtDate } from '../core/dates.js';
import { can } from '../core/permissions.js';

export default function puntos(ctx) {
  const { store } = ctx;
  const estado = { texto: '', tipo: '', comunidad: '', pagina: 1 };
  const pendiente = store.pozosConSeguimientoPendiente()[0];

  const lista = () => {
    const r = store.listarPuntos(estado);
    const desde = r.total === 0 ? 0 : (r.pagina - 1) * 10 + 1;
    return html`<p class="chico negrita" aria-live="polite">${r.total} registro${r.total === 1 ? '' : 's'} · ${r.pozos} pozo${r.pozos === 1 ? '' : 's'} · ${r.puntos} punto${r.puntos === 1 ? '' : 's'}</p>
      <div class="apilado" style="margin-top:12px">${r.items.length === 0 ? html`<div class="aviso aviso-gris">${icono('buscar')}<div>No hay registros con esos filtros.</div></div>` : r.items.map((p) => html`
        <article class="tarjeta" style="box-shadow:none;padding:14px"><div class="cabecera-punto"><div>
          <span class="id-chip">${p.id}</span> <span class="badge b-gris">${p.tipo}</span>
          <h3 style="margin-top:6px">${p.nombre}</h3>
          <p class="chico suave">${coordTexto(p.lat, p.lng)} · Comunidad: ${p.comunidad}${p.tipo === 'Pozo' ? html` · Profundidad: ${profundidadTexto(p.profundidad)}` : ''}</p></div>
          <a class="btn btn-sec btn-chico" href="#/puntos/${p.id}">Ver detalle</a></div></article>`)}</div>
      <div class="paginacion"><span class="chico suave">Mostrando ${r.items.length === 0 ? 0 : `${desde}–${desde + r.items.length - 1}`} de ${r.total} registros · Página ${r.pagina} de ${r.paginas}</span>
        <span class="fila"><button type="button" class="btn btn-neutro btn-chico" data-pag="-1"${r.pagina <= 1 ? ' disabled' : ''}>← Anterior</button><button type="button" class="btn btn-neutro btn-chico" data-pag="1"${r.pagina >= r.paginas ? ' disabled' : ''}>Siguiente →</button></span></div>`;
  };

  const contenido = html`
    <section class="tarjeta"><div class="tarjeta-titulo"><h2>Ubicaciones registradas</h2>
      ${can(store.usuario, 'registrar_puntos_muestras') ? html`<a class="btn" href="#/puntos/nuevo">+ Nuevo punto/pozo</a>` : ''}</div>
      <form class="filtros" id="filtros" role="search" novalidate>
        ${entrada('texto', 'Buscar', { placeholder: 'Nombre, ID o comunidad', auto: 'off' })}
        ${selector('tipo', 'Tipo de registro', ['Punto', 'Pozo'], { vacio: 'Todos' })}
        ${selector('comunidad', 'Comunidad', store.comunidades(), { vacio: 'Todas' })}
        <button type="reset" class="btn btn-neutro" style="margin-bottom:14px">Limpiar</button>
      </form>
      <div id="resultado"></div></section>
    ${pendiente ? html`<section class="tarjeta"><div class="tarjeta-titulo"><h2>Pozo con seguimiento pendiente</h2><span class="badge b-no_cumple">1 pozo pendiente</span></div>
      <p class="negrita">${pendiente.punto.id} · ${pendiente.punto.nombre}</p>
      <p class="chico suave">${coordTexto(pendiente.punto.lat, pendiente.punto.lng)} · Profundidad: ${profundidadTexto(pendiente.punto.profundidad)} · Comunidad: ${pendiente.punto.comunidad}</p>
      <p class="chico suave">ID permanente · distinto del folio de muestra</p>
      ${pendiente.muestras.map((m) => html`<div class="fila fila-entre" style="margin-top:10px"><div><a class="negrita" href="#/muestras/${m.folio}">${m.folio}</a> <span class="chico suave">· ${fmtDate(m.fechaHora)} · Referencia ${m.referenciaFolio}</span></div>
        <div class="fila">${insigniaClase(m)} ${insigniaMuestra(store, m)} <a class="btn btn-sec btn-chico" href="#/puntos/${pendiente.punto.id}">Ver seguimiento</a></div></div>`)}</section>` : ''}`;

  return {
    titulo: 'Puntos y pozos',
    subtitulo: 'Registro de ubicaciones de muestreo · MiAMBIENTE',
    contenido,
    montar(raiz) {
      const zona = raiz.querySelector('#resultado');
      const form = raiz.querySelector('#filtros');
      const pintar = () => { montar(zona, lista()); };
      const leerFiltros = () => { estado.texto = form.texto.value; estado.tipo = form.tipo.value; estado.comunidad = form.comunidad.value; estado.pagina = 1; pintar(); };
      form.addEventListener('submit', (e) => e.preventDefault());
      form.addEventListener('input', leerFiltros);
      form.addEventListener('change', leerFiltros);
      form.addEventListener('reset', () => setTimeout(leerFiltros, 0));
      zona.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pag]');
        if (!b) return;
        estado.pagina += Number(b.dataset.pag);
        pintar();
        zona.scrollIntoView({ block: 'start' });
      });
      pintar();
    },
  };
}
