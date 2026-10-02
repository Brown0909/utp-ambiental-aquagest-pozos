// Lámina 10 — Muestra guardada: folio asignado y QR (RF-27).
import { html } from '../ui/dom.js';
import { icono } from '../ui/icons.js';
import { qrDeFolio } from '../ui/qr.js';
import { fmtDateTime } from '../core/dates.js';
import { can } from '../core/permissions.js';

export default function muestraGuardada(ctx) {
  const { store } = ctx;
  const m = store.muestraPorFolio(ctx.params.folio);
  if (!m) return { titulo: 'No encontrada', contenido: html`<div class="aviso aviso-amarillo">${icono('alerta')}<div>La muestra ${ctx.params.folio} no existe. <a href="#/panel">Volver al panel</a></div></div>` };
  const p = store.puntoPorId(m.puntoId);
  const qr = qrDeFolio(m.folio);
  const contenido = html`<section class="tarjeta">
    <div class="aviso aviso-ok" role="status">${icono('ok', 22)}<div><strong>Muestra guardada correctamente</strong>Conserve el folio y el código QR para identificar la muestra durante todo el proceso.</div></div>
    <div class="rejilla rejilla-2" style="margin-top:20px;align-items:center">
      <div><p class="chico suave">Folio asignado</p><p style="font-size:34px;font-weight:800;letter-spacing:-.02em">${m.folio}</p>
        <p class="negrita">${p.id} · ${p.nombre}</p>
        <p class="suave">${fmtDateTime(m.fechaHora)}</p>
        <p class="suave">${m.tipoAgua} · ${m.clasificacion === 'referencia' ? 'Referencia' : 'Seguimiento'}${m.referenciaFolio ? ` de ${m.referenciaFolio}` : ''}</p>
        <p style="margin-top:8px"><span class="badge b-azul">Tomada · lista para envío</span></p></div>
      <div style="text-align:center"><div style="width:190px;margin:0 auto" role="img" aria-label="Código QR del folio ${m.folio}">${qr.svg}</div>
        <p class="chico negrita" style="margin-top:6px">Escanee para abrir el detalle</p></div></div>
    <p class="chico suave" style="margin-top:16px">Etiquete el recipiente con el folio ${m.folio} y presente este QR al registrar la recepción en laboratorio.</p>
    <div class="acciones-form">${can(store.usuario, 'registrar_envio') ? html`<a class="btn" href="#/custodia?folio=${m.folio}">Registrar envío</a>` : ''}
      <a class="btn btn-sec" href="#/muestras/${m.folio}">Ver detalle</a><a class="btn btn-neutro" href="#/muestras/nueva">Registrar otra muestra</a><a class="btn btn-neutro" href="#/panel">Volver</a></div></section>`;
  return { titulo: 'Muestra guardada', subtitulo: 'El registro quedó disponible para consulta, traslado y análisis de laboratorio.', contenido };
}
