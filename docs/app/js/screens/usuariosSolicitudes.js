// Solicitudes de cuenta pendientes: aprobar con un rol o rechazar con motivo (RF-13).
import { html } from '../ui/dom.js';
import { icono } from '../ui/icons.js';
import { fmtDateTime } from '../core/dates.js';
import { ROLES } from '../core/permissions.js';

export function bloqueSolicitudes(store) {
  const pendientes = store.data.solicitudes.filter((s) => s.estado === 'Pendiente');
  return html`<section class="tarjeta"><div class="tarjeta-titulo"><h2>Solicitudes de cuenta</h2><span class="badge ${pendientes.length ? 'b-pendiente' : 'b-gris'}">${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}</span></div>
    ${pendientes.length === 0 ? html`<p class="suave">No hay solicitudes pendientes. Las solicitudes se envían desde la pantalla de acceso («Solicitar Creación de Cuenta»).</p>`
      : html`<div class="apilado">${pendientes.map((s) => html`<article class="tarjeta" style="box-shadow:none;background:#f8fafc" data-solicitud="${s.id}">
        <p class="negrita">${s.nombre} ${s.apellido} <span class="chico suave">· ${s.correo}</span></p>
        <p class="chico suave">${s.cargo} · ${s.unidad} · ${s.provincia} · ${fmtDateTime(s.fecha)}</p>
        <div class="fila" style="margin-top:10px"><label class="chico negrita" for="rol-${s.id}">Rol:</label>
          <select id="rol-${s.id}" style="min-height:36px;border-radius:8px;border:1px solid #c9d4e0;padding:4px 8px">${ROLES.map((r) => html`<option>${r}</option>`)}</select>
          <button type="button" class="btn btn-chico" data-aprobar="${s.id}">${icono('ok', 16)} Aprobar</button>
          <input type="text" id="mot-${s.id}" placeholder="Motivo del rechazo (5+ caracteres)" aria-label="Motivo del rechazo" style="min-height:36px;border-radius:8px;border:1px solid #c9d4e0;padding:4px 10px;flex:1 1 200px">
          <button type="button" class="btn btn-peligro btn-chico" data-rechazar="${s.id}">Rechazar</button></div>
        <p class="error chico" role="alert" style="color:var(--mal);font-weight:600;margin-top:6px"></p></article>`)}</div>`}</section>`;
}

export function enlazarSolicitudes(raiz, ctx) {
  const { store } = ctx;
  raiz.querySelectorAll('[data-solicitud]').forEach((art) => {
    const id = art.dataset.solicitud;
    const salida = art.querySelector('.error');
    const resolver = (datos, ok) => {
      const r = store.resolverSolicitud(id, datos);
      if (!r.ok) { salida.textContent = Object.values(r.errores).join(' '); return; }
      ctx.aviso(ok);
      ctx.rerender();
    };
    art.querySelector('[data-aprobar]').addEventListener('click', () => resolver({ decision: 'aprobar', rol: art.querySelector(`#rol-${id}`).value }, 'Solicitud aprobada: usuario creado.'));
    art.querySelector('[data-rechazar]').addEventListener('click', () => resolver({ decision: 'rechazar', motivo: art.querySelector(`#mot-${id}`).value }, 'Solicitud rechazada.'));
  });
}
