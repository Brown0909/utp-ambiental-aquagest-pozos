// Láminas 12 y 26 — Historial y reportes: filtros, línea de tiempo por muestra, exportar PDF y Excel (RF-61, RF-62).
import { html, montar } from '../ui/dom.js';
import { entrada, selector, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { exportarPdf, exportarExcel } from '../ui/exportar.js';
import { coordTexto, profundidadTexto, insigniaMuestra, insigniaClase, enlaceMuestra } from '../ui/formato.js';
import { lineaTiempo, bloqueResultados, bloqueCampo } from '../ui/componentes.js';
import { fmtDate } from '../core/dates.js';
import { TIPOS_AGUA } from '../core/normativa.js';
import { ETAPAS } from '../core/store-flujo.js';

const filtros = { tipoAgua: '', puntoId: '', desde: '', hasta: '', estado: '' };   // se conservan durante la visita

export default function historial(ctx) {
  const { store } = ctx;

  const tarjeta = (m) => {
    const p = store.puntoPorId(m.puntoId);
    const seguimientos = store.data.muestras.filter((x) => x.referenciaFolio === m.folio);
    return html`<article class="tarjeta" style="box-shadow:none"><div class="fila fila-entre"><div><h3>${enlaceMuestra(m.folio)} · ${m.clasificacion === 'referencia' ? 'Referencia' : 'Seguimiento'}</h3>
      <p class="chico suave">${fmtDate(m.fechaHora)} · ${p.id} · ${p.nombre} · ${m.tipoAgua} · ${m.objetivo}</p></div><div class="fila">${insigniaClase(m)} ${insigniaMuestra(store, m)}</div></div>
      <p class="chico" style="margin:8px 0">${m.referenciaFolio ? html`Enlazado a referencia <a href="#/muestras/${m.referenciaFolio}">${m.referenciaFolio}</a>. ` : ''}${seguimientos.length ? html`Referencia enlazada al seguimiento ${seguimientos.map((x) => html`<a href="#/muestras/${x.folio}">${x.folio}</a> `)}. ` : ''}Lluvia registrada: ${m.lluvia ? `${m.lluvia.mm} mm (${m.lluvia.periodo})` : 'sin dato'}.</p>
      <details><summary class="negrita" style="cursor:pointer">Línea de tiempo, resultados y mediciones de campo</summary><div class="rejilla rejilla-2" style="margin-top:12px">
        <div><h3 style="margin-bottom:8px">Línea de tiempo del proceso</h3>${lineaTiempo(store.cronologia(m))}<p class="chico suave">Los estados corresponden a etapas del proceso, no a dictámenes de cumplimiento.</p></div>
        <div><h3 style="margin-bottom:8px">Resultados de laboratorio</h3>${bloqueResultados(m)}<h3 style="margin:14px 0 8px">Mediciones de campo</h3>${bloqueCampo(m)}</div></div></details></article>`;
  };

  const resultado = () => {
    const r = store.historial(filtros);
    if (Object.keys(r.errores).length) return { r, vista: '' };
    const punto = filtros.puntoId ? store.puntoPorId(filtros.puntoId) : null;
    const vista = html`${punto ? html`<div class="aviso aviso-gris" style="margin-bottom:14px">${icono('pin')}<div><strong>${punto.id} · ${punto.nombre}</strong>${coordTexto(punto.lat, punto.lng)} · Comunidad ${punto.comunidad}${punto.tipo === 'Pozo' ? ` · Profundidad: ${profundidadTexto(punto.profundidad)}` : ''}<br><span class="chico">ID permanente · distinto del folio de muestra</span></div></div>` : ''}
      <div class="fila fila-entre" style="margin-bottom:12px"><p class="negrita" aria-live="polite">${r.muestras.length} muestra${r.muestras.length === 1 ? '' : 's'} registrada${r.muestras.length === 1 ? '' : 's'}</p>
        <div class="fila"><button type="button" class="btn btn-sec btn-chico" data-exportar="pdf">${icono('descarga', 16)} Exportar PDF</button><button type="button" class="btn btn-sec btn-chico" data-exportar="excel">${icono('descarga', 16)} Exportar datos (Excel)</button></div></div>
      <div class="apilado">${r.muestras.length === 0 ? html`<div class="aviso aviso-gris">${icono('buscar')}<div>No hay muestras con estos filtros.</div></div>` : r.muestras.map(tarjeta)}</div>`;
    return { r, vista };
  };

  const contenido = html`<section class="tarjeta"><h2>Filtros de búsqueda</h2>
    <form id="filtros" novalidate style="margin-top:12px"><div class="rejilla rejilla-3">
      ${selector('tipoAgua', 'Tipo de agua', TIPOS_AGUA, { valor: filtros.tipoAgua, vacio: 'Todos' })}
      ${selector('puntoId', 'Pozo o punto', store.data.puntos.map((p) => ({ valor: p.id, etiqueta: `${p.id} · ${p.nombre}` })), { valor: filtros.puntoId, vacio: 'Todos' })}
      ${selector('institucion', 'Institución', ['MiAMBIENTE'], { valor: 'MiAMBIENTE', vacio: null })}
      ${entrada('desde', 'Desde', { tipo: 'date', valor: filtros.desde })}${entrada('hasta', 'Hasta', { tipo: 'date', valor: filtros.hasta })}
      ${selector('estado', 'Estado de proceso', ETAPAS, { valor: filtros.estado, vacio: 'Todos' })}</div>
      <div class="acciones-form" style="margin-top:0"><button class="btn" type="submit">Aplicar filtros</button><button class="btn btn-neutro" type="reset">Limpiar filtros</button></div></form></section>
    <section class="tarjeta"><h2>Historial por pozo</h2><div id="resultado" style="margin-top:12px"></div></section>`;

  return {
    titulo: 'Historial y reportes',
    subtitulo: 'Registro histórico y seguimiento por pozo.',
    contenido,
    montar(raiz) {
      const form = raiz.querySelector('#filtros');
      const zona = raiz.querySelector('#resultado');
      const pintar = () => {
        const { r, vista } = resultado();
        if (Object.keys(r.errores).length) { mostrarErrores(form, r.errores); zona.textContent = ''; return; }
        mostrarErrores(form, {});
        montar(zona, vista);
        zona.querySelector('[data-exportar="pdf"]')?.addEventListener('click', () => { exportarPdf(store, r.muestras, filtros); ctx.aviso('PDF generado.'); });
        zona.querySelector('[data-exportar="excel"]')?.addEventListener('click', () => { exportarExcel(store, r.muestras, filtros); ctx.aviso('Excel generado.'); });
      };
      form.addEventListener('submit', (e) => { e.preventDefault(); const v = leer(form); Object.assign(filtros, { tipoAgua: v.tipoAgua, puntoId: v.puntoId, desde: v.desde, hasta: v.hasta, estado: v.estado }); pintar(); });
      form.addEventListener('reset', (e) => {
        e.preventDefault();   // «reset» devolvería los valores con que se dibujó el formulario; aquí se vacían a propósito
        form.querySelectorAll('input, select:not([name=institucion])').forEach((el) => { el.value = ''; });
        Object.assign(filtros, { tipoAgua: '', puntoId: '', desde: '', hasta: '', estado: '' });
        pintar();
      });
      pintar();
    },
  };
}
