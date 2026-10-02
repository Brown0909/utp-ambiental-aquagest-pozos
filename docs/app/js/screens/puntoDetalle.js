// Láminas 7 y 17 — Detalle de punto o pozo (RF-25): muestras, cronología, lluvia, resultados y mediciones de campo.
import { html } from '../ui/dom.js';
import { icono } from '../ui/icons.js';
import { coordTexto, profundidadTexto, insigniaMuestra, insigniaClase } from '../ui/formato.js';
import { lineaTiempo, bloqueLluvia, bloqueResultados, bloqueCampo } from '../ui/componentes.js';
import { fmtDate } from '../core/dates.js';
import { can } from '../core/permissions.js';

export default function puntoDetalle(ctx) {
  const { store } = ctx;
  const p = store.puntoPorId(ctx.params.id);
  if (!p) return { titulo: 'No encontrado', contenido: html`<div class="aviso aviso-amarillo">${icono('alerta')}<div>El registro ${ctx.params.id} no existe. <a href="#/puntos">Volver a Puntos y pozos</a></div></div>` };
  const muestras = store.muestrasDePunto(p.id);
  const elegida = muestras.find((m) => m.folio === ctx.consulta.get('muestra')) ?? muestras[0] ?? null;
  const escribe = can(store.usuario, 'registrar_puntos_muestras');

  const contenido = html`
    <section class="tarjeta"><div class="cabecera-punto"><div>
      <span class="id-chip">${p.id}</span> <span class="badge b-gris">${p.tipo}</span>
      <h2 style="margin-top:8px">${p.nombre}</h2>
      <p class="suave">${coordTexto(p.lat, p.lng)} · Comunidad: ${p.comunidad}${p.tipo === 'Pozo' ? html` · Profundidad: ${profundidadTexto(p.profundidad)}` : ''}</p>
      <p class="chico suave">ID permanente · distinto del folio de muestra</p></div>
      <div class="fila">${escribe ? html`<a class="btn" href="#/muestras/nueva?punto=${p.id}">Registrar muestra</a><a class="btn btn-sec" href="#/puntos/${p.id}/editar">Editar ${p.tipo === 'Pozo' ? 'pozo' : 'punto'}</a>` : ''}<a class="btn btn-neutro" href="#/puntos">← Puntos y pozos</a></div></div></section>
    <section class="tarjeta"><h2>Muestras del ${p.tipo === 'Pozo' ? 'pozo' : 'punto'}</h2>
      ${muestras.length === 0 ? html`<p class="suave" style="margin-top:8px">Este registro todavía no tiene muestras.</p>` : html`<div class="apilado" style="margin-top:12px">${muestras.map((m) => html`
        <a class="sel-muestra" href="#/puntos/${p.id}?muestra=${m.folio}" aria-current="${elegida && m.folio === elegida.folio ? 'true' : 'false'}">
          <div class="fila fila-entre"><strong>${m.folio}</strong><span class="fila">${insigniaClase(m)} ${insigniaMuestra(store, m)}</span></div>
          <div class="chico suave">${fmtDate(m.fechaHora)} · ${m.clasificacion === 'referencia' ? 'Referencia' : 'Seguimiento'}${m.referenciaFolio ? ` · Enlazado a referencia ${m.referenciaFolio}` : ''}</div></a>`)}</div>
        <p class="chico suave" style="margin-top:10px">Referencia y seguimiento conservan folios independientes, vinculados al mismo ID ${p.id}.</p>`}</section>
    ${elegida ? html`
      <div class="rejilla rejilla-2" style="margin-top:16px">
        <section class="tarjeta" style="margin:0"><h2>Cronología · ${elegida.folio}</h2><p class="chico suave" style="margin-bottom:10px">${elegida.referenciaFolio ? `Seguimiento enlazado a ${elegida.referenciaFolio}` : 'Muestra de referencia'}</p>${lineaTiempo(store.cronologia(elegida))}</section>
        <section class="tarjeta" style="margin:0"><h2>Lluvia asociada</h2><p class="chico suave" style="margin-bottom:10px">Lluvia registrada para ${elegida.folio}</p>${bloqueLluvia(elegida)}
          <h2 style="margin-top:20px">Mediciones de campo</h2><div style="margin-top:10px">${bloqueCampo(elegida)}</div></section></div>
      <section class="tarjeta"><div class="tarjeta-titulo"><h2>Resultados de laboratorio · ${elegida.folio} · ${fmtDate(elegida.fechaHora)}</h2><a class="btn btn-sec btn-chico" href="#/muestras/${elegida.folio}">Ver detalle de la muestra</a></div>${bloqueResultados(elegida)}</section>` : ''}`;
  return { titulo: `${p.id} · ${p.nombre}`, subtitulo: 'Identidad, muestras enlazadas y trazabilidad del proceso.', contenido };
}
