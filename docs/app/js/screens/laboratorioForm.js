// Formulario de resultados (RF-48 a RF-53): solo los parámetros solicitados; nitrato con su forma reportada.
import { html } from '../ui/dom.js';
import { entrada, selector, pastillas, errorForm } from '../ui/forms.js';
import { zonaArchivo } from '../ui/archivos.js';
import { icono } from '../ui/icons.js';
import { toDateStr } from '../core/dates.js';
import { PARAMETROS_LAB, ORDEN_PARAMETROS } from '../core/normativa.js';
import { etiquetaForma } from '../core/units.js';
import { LABORATORIOS } from '../core/seed.js';

const DEMO = '<button type="button" class="btn btn-neutro btn-chico" data-demo>Usar certificado de demostración</button>';

export function formResultados(store, m) {
  const rec = m.custodia.recepcion;
  const hoy = toDateStr(store.ahora());
  return html`<form id="form-resultados" novalidate class="tarjeta">${errorForm()}
    <h2>Resultados solicitados</h2><p class="chico suave" style="margin:4px 0 14px">Solo se muestran los parámetros solicitados para esta muestra.</p>
    <div class="rejilla rejilla-2">${ORDEN_PARAMETROS.filter((k) => m.solicitados.includes(k) && k !== 'nitrato').map((k) => entrada(k, `${PARAMETROS_LAB[k].nombre} (${PARAMETROS_LAB[k].unidad})`, {
      requerido: true, modo: k === 'conductividad' ? 'decimal' : 'numeric', ayuda: k === 'conductividad' ? `Campo: ${m.campo.conductividad ?? 'sin dato'} µS/cm — medición independiente.` : '' }))}</div>
    ${m.solicitados.includes('nitrato') ? html`<div class="rejilla rejilla-2">${pastillas('nitratoForma', 'Forma de nitrato reportada', [{ valor: 'NO3', etiqueta: etiquetaForma('NO3') }, { valor: 'NO3-N', etiqueta: etiquetaForma('NO3-N') }], '', { requerido: true })}
      ${entrada('nitrato', 'Resultado de nitrato (mg/L)', { requerido: true, modo: 'decimal', ayuda: 'Conserve la forma y la unidad exactas del laboratorio; no se convierte aquí.' })}</div>` : ''}
    <div class="rejilla rejilla-2">${entrada('fechaAnalisis', 'Fecha del análisis', { tipo: 'date', valor: hoy, requerido: true, min: rec.fechaHora.slice(0, 10), max: hoy })}
      ${selector('laboratorio', 'Laboratorio', LABORATORIOS, { valor: rec.laboratorio, requerido: true, vacio: null })}</div>
    ${zonaArchivo('certificado', 'Certificado firmado (PDF)', { accept: 'application/pdf', ayuda: 'PDF · máximo 10 MB · se verifica por su contenido', requerido: true, extra: DEMO })}
    <div class="aviso aviso-info">${icono('reloj')}<div><strong>Estado posterior: Pendiente de revisión técnica</strong>Resultados recibidos. No se emite un dictamen antes de confirmar la revisión técnica.</div></div>
    <div class="acciones-form"><button class="btn" type="submit">Guardar y enviar a evaluación</button></div></form>`;
}
