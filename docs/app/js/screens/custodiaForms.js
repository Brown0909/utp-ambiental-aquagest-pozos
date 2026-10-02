// Formularios de la cadena de custodia: registrar envío (RF-41, 42) y confirmar recepción (RF-43 a RF-47).
import { html } from '../ui/dom.js';
import { entrada, selector, area, errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { toDateStr, toTimeStr } from '../core/dates.js';
import { LABORATORIOS, CONDICIONES_RECEPCION, CONDICION_OK } from '../core/seed.js';

export function formEnvio(store, m) {
  const ahora = store.ahora();
  return html`<form id="form-envio" novalidate class="apilado">${errorForm()}
    <h3>Registrar envío</h3>
    <p class="chico suave">Responsable: ${store.usuario.nombre}</p>
    <div class="rejilla rejilla-2">${entrada('fecha', 'Fecha', { tipo: 'date', valor: toDateStr(ahora), requerido: true, max: toDateStr(ahora) })}${entrada('hora', 'Hora', { tipo: 'time', valor: toTimeStr(ahora), requerido: true })}</div>
    ${selector('destino', 'Destino', LABORATORIOS, { valor: LABORATORIOS[0], requerido: true, vacio: null })}
    <button class="btn" type="submit">Registrar envío</button></form>`;
}

export function formRecepcion(store, m) {
  const ahora = store.ahora();
  const receptores = store.data.usuarios.filter((u) => u.estado === 'Activo' && ['Laboratorio', 'Administrador'].includes(u.rol));
  const yo = receptores.find((u) => u.id === store.usuario.id) ?? receptores[0];
  return html`<form id="form-recepcion" novalidate class="apilado">${errorForm()}
    <h3>Confirmación de recepción</h3>
    ${selector('responsableId', 'Responsable de recepción', receptores.map((u) => ({ valor: u.id, etiqueta: `${u.nombre} (${u.rol})` })), { valor: yo?.id ?? '', requerido: true, vacio: null })}
    <div class="rejilla rejilla-2">${entrada('fecha', 'Fecha', { tipo: 'date', valor: toDateStr(ahora), requerido: true, max: toDateStr(ahora) })}${entrada('hora', 'Hora', { tipo: 'time', valor: toTimeStr(ahora), requerido: true })}</div>
    ${selector('condicion', 'Condición de recepción', CONDICIONES_RECEPCION, { valor: CONDICION_OK, requerido: true, vacio: null })}
    ${area('incidencias', 'Incidencias', { ayuda: 'Obligatoria si la condición no es «Envases íntegros y rotulados».', largo: 300 })}
    <button class="btn" type="submit">Confirmar recepción</button></form>`;
}

/** Conecta los dos formularios con las acciones del store. */
export function enlazarForms(raiz, ctx, folio) {
  const { store } = ctx;
  const enviar = (id, accion, mensaje) => {
    const form = raiz.querySelector(id);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.dataset.enviando) return;
      const r = accion(folio, leer(form));
      if (!r.ok) { mostrarErrores(form, r.errores); return; }
      form.dataset.enviando = '1';
      ctx.aviso(mensaje);
      ctx.rerender();
    });
  };
  enviar('#form-envio', (f, v) => store.registrarEnvio(f, v), 'Envío registrado.');
  enviar('#form-recepcion', (f, v) => store.confirmarRecepcion(f, v), 'Recepción confirmada.');
}
