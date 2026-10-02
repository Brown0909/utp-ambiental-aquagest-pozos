// Conversión de nitrato documentada (RF-58) y confirmación de la revisión técnica (RF-59, RF-60).
import { html } from '../ui/dom.js';
import { area, errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { insigniaMuestra } from '../ui/formato.js';
import { fmtDateTime } from '../core/dates.js';
import { can } from '../core/permissions.js';
import { FACTOR_NO3_A_NO3N, etiquetaFormaCorta, numTexto } from '../core/units.js';

export function bloqueConversion(store, m, ev) {
  const fila = ev.filas.find((f) => f.key === 'nitrato');
  if (!fila) return '';
  const forma = m.resultados.valores.nitrato.forma;
  return html`<div class="aviso aviso-gris" style="margin-top:14px">${icono('alerta')}<div><strong>Formas de nitrato</strong>
    Resultado reportado como ${etiquetaFormaCorta(forma)}. NO₃ y NO₃-N son formas distintas: no se comparan resultados y límites de formas diferentes sin conversión documentada.
    <br><strong>Conversión documentada:</strong> ${m.conversion ? html`Registrada (factor ${numTexto(FACTOR_NO3_A_NO3N)}) por ${store.nombreDe(m.conversion.porId)}: ${m.conversion.nota}` : 'No registrada. Se conserva el valor original.'}
    ${fila.estado === 'requiere_conversion' && !m.conversion && !m.revision ? (can(store.usuario, 'confirmar_revision')
      ? html`<form id="form-conversion" novalidate style="margin-top:12px">${errorForm()}${area('nota', 'Nota de la conversión', { requerido: true, largo: 300, ayuda: `Se usará el factor ${numTexto(FACTOR_NO3_A_NO3N)} (NO₃ ÷ ${numTexto(FACTOR_NO3_A_NO3N)} = NO₃-N). Explique el criterio (mínimo 10 caracteres).` })}<button class="btn btn-sec btn-chico" type="submit">Documentar conversión</button></form>`
      : html`<p class="chico" style="margin-top:8px">Un Administrador debe documentar la conversión para poder comparar.</p>`) : ''}</div></div>`;
}

export function bloqueRevision(store, m, ev) {
  if (m.revision) {
    const r = m.revision;
    return html`<h3 style="margin-top:20px">Revisión técnica</h3><div class="aviso aviso-ok" style="margin-top:10px">${icono('ok')}<div><strong>Revisión confirmada · ${insigniaMuestra(store, m)}</strong>
      ${r.parcial ? 'Evaluación parcial: hay parámetros sin límite cargado. ' : ''}Analista: ${store.nombreDe(r.analistaId)} · ${fmtDateTime(r.fecha)}<br>${r.observaciones}</div></div>`;
  }
  const puede = can(store.usuario, 'confirmar_revision');
  return html`<h3 style="margin-top:20px">Revisión técnica</h3>
    <p class="chico suave">Confirmar la revisión registra la validación técnica y, solo entonces, el dictamen. Hasta ese momento ningún resultado se declara «Cumple» o «No cumple».</p>
    ${ev.dictamen.bloqueado ? html`<div class="aviso aviso-amarillo" style="margin-top:10px">${icono('alerta')}<div><strong>Confirmación bloqueada</strong>${ev.dictamen.motivos[0]}</div></div>` : ''}
    ${puede ? html`<form id="form-revision" novalidate style="margin-top:12px">${errorForm()}
      <p class="chico negrita">Analista responsable: ${store.usuario.nombre} · MiAMBIENTE</p>
      ${area('observaciones', 'Observaciones', { requerido: true, largo: 500, ayuda: 'Mínimo 10 caracteres. Explique lo revisado (forma de nitrato, trazabilidad, criterio).' })}
      <div class="fila"><span class="badge b-pendiente">Pendiente de revisión técnica</span><button class="btn" type="submit"${ev.dictamen.bloqueado ? ' disabled' : ''}>Confirmar revisión</button></div></form>`
      : html`<div class="aviso aviso-gris" style="margin-top:10px">${icono('candado')}<div>Solo un Administrador puede confirmar la revisión técnica.</div></div>`}`;
}

export function enlazarRevision(raiz, ctx, folio) {
  const { store } = ctx;
  const conectar = (id, accion, mensaje) => {
    const form = raiz.querySelector(id);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.dataset.enviando) return;
      const r = accion(leer(form));
      if (!r.ok) { mostrarErrores(form, r.errores); return; }
      form.dataset.enviando = '1';
      ctx.aviso(mensaje);
      ctx.rerender();
    });
  };
  conectar('#form-conversion', (v) => store.documentarConversion(folio, v), 'Conversión documentada.');
  conectar('#form-revision', (v) => store.confirmarRevision(folio, v), 'Revisión confirmada.');
}
