// Bandeja de correo SIMULADA: muestra lo que el sistema «enviaría». No existe en el diseño; hace usable la recuperación
// de contraseña y las invitaciones sin enviar correos reales (spec 002).
import { html } from '../ui/dom.js';
import { icono } from '../ui/icons.js';
import { marcoPublico } from '../ui/publico.js';
import { fmtDateTime } from '../core/dates.js';

export default function bandeja(ctx) {
  const correos = ctx.store.data.correos;
  return {
    publico: true,
    contenido: marcoPublico(html`
      <a href="#/acceso" class="btn-enlace chico" style="display:inline-flex;gap:6px;align-items:center;margin-bottom:14px">${icono('volver', 16)} Volver al acceso</a>
      <h2>Bandeja de correo simulada</h2>
      <p class="suave">Aquí aparecen los correos que el sistema enviaría. <strong>No se envía ningún correo real.</strong></p>
      <div class="apilado" style="margin-top:18px">
        ${correos.length === 0
          ? html`<div class="aviso aviso-gris">${icono('correo')}<div>No hay correos todavía. Solicite una recuperación de contraseña o invite a un usuario.</div></div>`
          : correos.map((c) => html`<article class="tarjeta" style="padding:14px">
              <p class="chico suave">${fmtDateTime(c.fecha)} · Para: ${c.para}</p>
              <h3 style="margin:4px 0">${c.asunto}</h3><p class="chico">${c.cuerpo}</p>
              ${c.enlace && String(c.enlace).startsWith('#/') ? html`<p style="margin-top:8px"><a class="btn btn-chico" href="${c.enlace}">Abrir el enlace</a></p>` : ''}</article>`)}
      </div>`),
  };
}
