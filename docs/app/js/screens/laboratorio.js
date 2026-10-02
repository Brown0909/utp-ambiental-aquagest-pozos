// Láminas 3 y 24 — Ingreso de resultados de laboratorio (RF-48 a RF-53). Se guardan tal como se reportaron.
import { html } from '../ui/dom.js';
import { leer, mostrarErrores } from '../ui/forms.js';
import { enlazarArchivo } from '../ui/archivos.js';
import { certificadoDemo } from '../ui/pdfDemo.js';
import { icono } from '../ui/icons.js';
import { coordTexto, profundidadTexto, insigniaEtapa, enlaceMuestra } from '../ui/formato.js';
import { fmtDateTime } from '../core/dates.js';
import { formResultados } from './laboratorioForm.js';

const NO_SE_PUEDE = {
  'Registrada': ['Esta muestra todavía no fue enviada.', 'custodia?folio='],
  'Enviada': ['Esta muestra fue enviada pero el laboratorio aún no confirmó la recepción.', 'custodia?folio='],
};

export default function laboratorio(ctx) {
  const { store } = ctx;
  const folio = ctx.consulta.get('folio') ?? '';
  const m = store.muestraPorFolio(folio);
  const etapa = m ? store.etapaDe(m) : null;
  const p = m ? store.puntoPorId(m.puntoId) : null;
  const pendientes = store.data.muestras.filter((x) => store.etapaDe(x) === 'Recibida en laboratorio');

  const buscador = html`<section class="tarjeta"><h2>Seleccionar muestra</h2>
    <form id="form-buscar" novalidate class="fila" style="align-items:end;margin-top:12px"><div class="campo" style="margin:0;flex:1 1 220px"><label for="f-folio">Buscar por folio</label>
      <input id="f-folio" name="folio" list="lista-folios" value="${folio}" placeholder="AG-2026-081" autocomplete="off"><datalist id="lista-folios">${store.data.muestras.map((x) => html`<option value="${x.folio}"></option>`)}</datalist></div>
      <button class="btn" type="submit" style="margin-bottom:14px">Buscar muestra</button></form>
    <p class="chico suave">${pendientes.length ? 'Recibidas, a la espera de resultados: ' : 'No hay muestras recibidas a la espera de resultados.'}${pendientes.map((x) => html`<a class="negrita" href="#/laboratorio?folio=${x.folio}">${x.folio}</a> `)}</p></section>`;

  const resumen = !m ? (folio ? html`<div class="aviso aviso-amarillo" style="margin-top:16px">${icono('alerta')}<div>No existe una muestra con el folio ${folio}.</div></div>` : '') : html`
    <section class="tarjeta"><div class="cabecera-punto"><div><h2>Muestra ${enlaceMuestra(m.folio)}</h2>
      <p class="suave">${p.id} · ${p.nombre} · ${coordTexto(p.lat, p.lng)}${p.tipo === 'Pozo' ? ` · Profundidad: ${profundidadTexto(p.profundidad)}` : ''} · Comunidad: ${p.comunidad}</p>
      <p class="chico suave">${m.tipoAgua} · ${m.objetivo} · ${m.clasificacion === 'referencia' ? 'Referencia' : `Seguimiento (referencia ${m.referenciaFolio})`}</p></div>${insigniaEtapa(etapa)}</div>
      <p class="chico" style="margin-top:10px"><strong>Trazabilidad del traslado:</strong> ${m.custodia.envio ? `Enviada ${fmtDateTime(m.custodia.envio.fechaHora)} (${store.nombreDe(m.custodia.envio.responsableId)})` : 'sin envío'}${m.custodia.recepcion ? ` · Recibida ${fmtDateTime(m.custodia.recepcion.fechaHora)} (${store.nombreDe(m.custodia.recepcion.responsableId)})` : ''} · <a href="#/custodia?folio=${m.folio}">Ver cadena de custodia</a></p></section>`;

  let cuerpo = '';
  if (m && etapa !== 'Recibida en laboratorio') {
    const [msg, ruta] = NO_SE_PUEDE[etapa] ?? ['Esta muestra ya tiene resultados cargados.', 'muestras/'];
    cuerpo = html`<div class="aviso aviso-gris">${icono('reloj')}<div><strong>No se pueden cargar resultados ahora</strong>${msg} <a href="#/${ruta}${m.folio}">Ir a la muestra</a></div></div>`;
  } else if (m) cuerpo = formResultados(store, m);

  return {
    titulo: 'Ingreso de resultados de laboratorio',
    subtitulo: 'Especifique y valide los resultados físico-químicos recibidos.',
    contenido: html`${buscador}${resumen ? html`<div style="margin-top:16px">${resumen}</div>` : ''}${cuerpo ? html`<div style="margin-top:16px">${cuerpo}</div>` : ''}`,
    montar(raiz) {
      raiz.querySelector('#form-buscar').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = e.currentTarget.folio.value.trim().toUpperCase();
        if (!v) { ctx.aviso('Escriba el folio de la muestra (por ejemplo AG-2026-081).', 'mal'); return; }
        ctx.navegar(`laboratorio?folio=${encodeURIComponent(v)}`);
      });
      const form = raiz.querySelector('#form-resultados');
      if (!form) return;
      const cert = enlazarArchivo(raiz, 'certificado');
      raiz.querySelector('[data-demo]').addEventListener('click', () => cert.poner(certificadoDemo(m, p.nombre)));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (form.dataset.enviando) return;
        const r = store.guardarResultados(m.folio, { ...leer(form), certificado: cert.obtener() });
        if (!r.ok) { mostrarErrores(form, r.errores); return; }
        form.dataset.enviando = '1';
        ctx.aviso(`Resultados de ${m.folio} guardados. Pasan a revisión técnica.`);
        ctx.navegar(`evaluacion?folio=${m.folio}`);
      });
    },
  };
}
