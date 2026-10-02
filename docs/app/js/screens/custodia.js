// Láminas 8 y 18 — Recepción y traslado: cadena de custodia desde campo hasta laboratorio (RF-40 a RF-47).
import { html, montar } from '../ui/dom.js';
import { entrada, selector } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { qrDeFolio } from '../ui/qr.js';
import { coordTexto, profundidadTexto, insigniaEtapa, enlaceMuestra } from '../ui/formato.js';
import { fmtDate, fmtDateTime } from '../core/dates.js';
import { can } from '../core/permissions.js';
import { PARAMETROS_LAB } from '../core/normativa.js';
import { ETAPAS } from '../core/store-flujo.js';
import { formEnvio, formRecepcion, enlazarForms } from './custodiaForms.js';

const filtros = { texto: '', estado: '', desde: '', hasta: '' };   // se conservan mientras dure la visita

export default function custodia(ctx) {
  const { store } = ctx;
  const elegido = store.muestraPorFolio(ctx.consulta.get('folio')) ?? store.listarCustodia(filtros)[0] ?? null;

  const lista = () => {
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) return html`<div class="aviso aviso-mal" role="alert">${icono('alerta')}<div>La fecha «hasta» no puede ser anterior a «desde».</div></div>`;
    const ms = store.listarCustodia(filtros);
    return html`<p class="chico negrita" aria-live="polite">${ms.length} muestra${ms.length === 1 ? '' : 's'} en cadena de custodia</p><div class="apilado" style="margin-top:10px">
      ${ms.length === 0 ? html`<div class="aviso aviso-gris">${icono('buscar')}<div>No hay muestras con esos filtros.</div></div>` : ms.map((m) => { const p = store.puntoPorId(m.puntoId); return html`
        <a class="sel-muestra" href="#/custodia?folio=${m.folio}" aria-current="${elegido && elegido.folio === m.folio ? 'true' : 'false'}"><div class="fila fila-entre"><strong>${m.folio}</strong>${insigniaEtapa(store.etapaDe(m))}</div>
        <div class="chico suave">${fmtDate(m.fechaHora)} · ${m.clasificacion === 'referencia' ? 'Referencia' : 'Seguimiento'} · ${p.id} · ${p.nombre}</div></a>`; })}</div>`;
  };

  const detalle = () => {
    if (!elegido) return html`<div class="aviso aviso-gris">${icono('camion')}<div>Seleccione una muestra de la lista.</div></div>`;
    const m = elegido;
    const p = store.puntoPorId(m.puntoId);
    const etapa = store.etapaDe(m);
    const { envio, recepcion } = m.custodia;
    const qr = qrDeFolio(m.folio);
    return html`<div class="cabecera-punto"><div><h2>Detalle · ${enlaceMuestra(m.folio)}</h2>
      <p class="chico suave">${m.clasificacion === 'referencia' ? 'Muestra de referencia' : `Seguimiento · referencia enlazada: ${m.referenciaFolio}`} · ${fmtDate(m.fechaHora)}</p>
      <p class="chico suave">${p.id} · ${p.nombre} · ${coordTexto(p.lat, p.lng)} · ${p.comunidad}${p.tipo === 'Pozo' ? ` · Profundidad: ${profundidadTexto(p.profundidad)}` : ''}</p>
      <div style="margin-top:8px">${insigniaEtapa(etapa)}</div></div>
      <div style="width:96px" role="img" aria-label="Código QR del folio ${m.folio}">${qr.svg}</div></div>
      <h3 style="margin-top:18px">Registro de custodia</h3><ol class="linea" style="margin-top:10px">
        <li class="${envio ? '' : 'en-curso'}"><span class="hito"></span><div><strong>${envio ? 'Enviada' : 'Pendiente de envío'}</strong>${envio ? html`<div class="chico suave">${fmtDateTime(envio.fechaHora)} · Responsable: ${store.nombreDe(envio.responsableId)}<br>Origen: ${envio.origen}<br>Destino: ${envio.destino}</div>` : ''}</div></li>
        <li class="${envio && !recepcion ? 'en-curso' : ''}"><span class="hito"></span><div><strong>${recepcion ? 'Recibida en laboratorio' : 'Recepción pendiente'}</strong>${recepcion ? html`<div class="chico suave">${fmtDateTime(recepcion.fechaHora)} · Responsable: ${store.nombreDe(recepcion.responsableId)}<br>${recepcion.laboratorio}<br>Condición: ${recepcion.condicion}${recepcion.incidencias ? html`<br>Incidencias: ${recepcion.incidencias}` : html`<br>Sin incidencias registradas`}</div>` : ''}</div></li></ol>
      <p class="chico" style="margin-top:6px"><strong>Parámetros solicitados:</strong> ${m.solicitados.map((k) => PARAMETROS_LAB[k].nombre).join(' · ')}</p>
      <div class="tarjeta" style="box-shadow:none;background:#f8fafc;margin-top:14px">${
        etapa === 'Registrada' ? (can(store.usuario, 'registrar_envio') ? formEnvio(store, m) : html`<p class="suave">Esta muestra está pendiente de envío. Solo un Técnico o un Administrador puede registrarlo.</p>`)
        : etapa === 'Enviada' ? (can(store.usuario, 'recepcion_resultados') ? formRecepcion(store, m) : html`<p class="suave">Esta muestra fue enviada y espera la confirmación del laboratorio. Solo Laboratorio o un Administrador puede confirmarla.</p>`)
        : html`<p class="suave">Envío y recepción conservan responsables, fecha y hora propios. El folio y el QR identifican la misma muestra durante todo el traslado.</p>
          <p style="margin-top:8px"><a class="btn btn-sec btn-chico" href="#/muestras/${m.folio}">Ver detalle de la muestra</a></p>`}</div>`;
  };

  const contenido = html`<div class="rejilla dos-col">
    <section class="tarjeta" style="margin:0"><h2>Muestras en cadena de custodia</h2>
      <form id="filtros" role="search" novalidate class="apilado" style="margin-top:12px">
        ${entrada('texto', 'Buscar folio o pozo', { valor: filtros.texto, auto: 'off', placeholder: 'AG-2026-081 o PZ-018' })}
        ${selector('estado', 'Estado de traslado', ETAPAS, { valor: filtros.estado, vacio: 'Todos' })}
        <div class="rejilla rejilla-2">${entrada('desde', 'Desde', { tipo: 'date', valor: filtros.desde })}${entrada('hasta', 'Hasta', { tipo: 'date', valor: filtros.hasta })}</div></form>
      <div id="lista"></div></section>
    <section class="tarjeta" style="margin:0" id="detalle">${detalle()}</section></div>`;

  return {
    titulo: 'Recepción y traslado de muestras',
    subtitulo: 'Cadena de custodia desde campo hasta laboratorio.',
    contenido,
    montar(raiz) {
      const form = raiz.querySelector('#filtros');
      const zona = raiz.querySelector('#lista');
      const pintar = () => montar(zona, lista());
      const leerF = () => { Object.assign(filtros, { texto: form.texto.value, estado: form.estado.value, desde: form.desde.value, hasta: form.hasta.value }); pintar(); };
      form.addEventListener('submit', (e) => e.preventDefault());
      form.addEventListener('input', leerF);
      form.addEventListener('change', leerF);
      pintar();
      if (elegido) enlazarForms(raiz, ctx, elegido.folio);
    },
  };
}
