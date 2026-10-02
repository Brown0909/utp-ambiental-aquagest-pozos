// Láminas 4 y 25 — Evaluación normativa (RF-54 a RF-60). Compara con los límites VERIFICADOS; el dictamen lo da la revisión humana.
import { html } from '../ui/dom.js';
import { selector } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { coordTexto, profundidadTexto, insigniaMuestra, num } from '../ui/formato.js';
import { REGLAMENTOS } from '../core/normativa.js';
import { etiquetaFormaCorta } from '../core/units.js';
import { bloqueConversion, bloqueRevision, enlazarRevision } from './evaluacionRevision.js';

// Antes de la revisión confirmada NO se usan las palabras «Cumple» / «No cumple» (RF-59).
const PROPUESTA = { cumple: ['b-azul', 'Dentro del límite (propuesta)'], no_cumple: ['b-pendiente', 'Fuera del límite (propuesta)'], sin_criterio: ['b-gris', 'Sin criterio'], sin_limite: ['b-gris', 'Límite no cargado'], requiere_conversion: ['b-pendiente', 'Requiere conversión'] };
const CONFIRMADO = { cumple: ['b-cumple', 'Cumple'], no_cumple: ['b-no_cumple', 'No cumple'], sin_criterio: ['b-gris', 'Sin criterio'], sin_limite: ['b-gris', 'Límite no cargado'], requiere_conversion: ['b-pendiente', 'Requiere conversión'] };

export default function evaluacion(ctx) {
  const { store } = ctx;
  const conResultados = store.data.muestras.filter((x) => x.resultados).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
  const m = store.muestraPorFolio(ctx.consulta.get('folio')) ?? conResultados.find((x) => !x.revision) ?? conResultados[0] ?? null;
  if (!m || !m.resultados) {
    return { titulo: 'Evaluación normativa', subtitulo: 'Comparación contra normas sanitarias de Panamá.', contenido: html`<div class="aviso aviso-gris">${icono('check')}<div><strong>No hay una muestra con resultados para evaluar.</strong>Cuando el laboratorio cargue resultados, aparecerán aquí. <a href="#/laboratorio">Ir a Resultados Lab</a></div></div>` };
  }
  const p = store.puntoPorId(m.puntoId);
  const ev = store.evaluacionDe(m.folio);
  const tabla = m.revision ? CONFIRMADO : PROPUESTA;
  const etiquetaEstado = m.revision ? html`${insigniaMuestra(store, m)}` : html`<span class="badge b-pendiente">Pendiente de revisión técnica</span>`;
  const reglamento = ev.normativa.reglamentoId ? REGLAMENTOS[ev.normativa.reglamentoId] : null;

  const contenido = html`
    <section class="tarjeta"><div class="cabecera-punto"><div><h2>Muestra ${m.folio}</h2>
      <p class="suave">${m.referenciaFolio ? html`Referencia: <a class="negrita" href="#/muestras/${m.referenciaFolio}">${m.referenciaFolio}</a> · ` : ''}${p.nombre} · ${coordTexto(p.lat, p.lng)}${p.tipo === 'Pozo' ? ` · Profundidad ${profundidadTexto(p.profundidad)}` : ''} · Comunidad ${p.comunidad}</p></div>${etiquetaEstado}</div></section>
    <section class="tarjeta"><h2>Selección de evaluación</h2>
      <div class="rejilla rejilla-3" style="margin-top:12px">
        ${selector('muestra', 'Muestra', conResultados.map((x) => ({ valor: x.folio, etiqueta: `${x.folio} · ${store.puntoPorId(x.puntoId).nombre}` })), { valor: m.folio, vacio: null })}
        <div class="campo"><span class="campo-titulo">Objetivo</span><p class="negrita">${m.objetivo}</p></div><div class="campo"><span class="campo-titulo">Tipo de agua</span><p class="negrita">${m.tipoAgua}</p></div></div>
      <p class="chico suave">El tipo de agua y el objetivo se toman de la muestra y no se cambian aquí.</p></section>
    <section class="tarjeta"><div class="tarjeta-titulo"><div><h2>Resultados vs límites permitidos</h2>
      <p class="chico suave">${ev.normativa.estado === 'definida' ? `${reglamento.nombre}` : `${ev.normativa.texto} · ${m.objetivo}`}</p></div>${etiquetaEstado}</div>
      <div class="tabla-caja"><table><thead><tr><th>Parámetro</th><th>Resultado de la muestra</th><th>Límite aplicado</th><th>Reglamento</th></tr></thead><tbody>
        ${ev.filas.map((f) => { const [clase, texto] = tabla[f.estado]; return html`<tr><td class="negrita">${f.nombre}</td><td>${num(f.valor)} ${f.unidad}${f.forma ? html` <span class="chico suave">(${etiquetaFormaCorta(f.forma)})</span>` : ''}</td><td>${f.limiteTexto}${f.nota ? html`<div class="chico suave">${f.nota}</div>` : ''}</td><td><span class="badge ${clase}">${texto}</span></td></tr>`; })}
      </tbody></table></div>
      ${ev.normativa.estado === 'definida' ? html`<p class="chico suave" style="margin-top:10px">${reglamento.verificacion}</p>` : ''}
      ${bloqueConversion(store, m, ev)}
      <div class="aviso aviso-gris" style="margin-top:14px">${icono('check')}<div><strong>Requisito de revisión</strong>COPANIT 35-2019: descargas. COPANIT 24-99: reutilización. El criterio depende del tipo de agua y del objetivo. Nitrato: especificar NO₃ o NO₃-N; no comparar formas distintas sin conversión documentada. Sin criterio aplicable para solo monitoreo. Cumple / No cumple únicamente tras confirmar la revisión técnica.</div></div>
      ${bloqueRevision(store, m, ev)}</section>`;

  return {
    titulo: 'Evaluación normativa',
    subtitulo: 'Comparación contra normas sanitarias de Panamá.',
    contenido,
    montar(raiz) {
      raiz.querySelector('#f-muestra').addEventListener('change', (e) => ctx.navegar(`evaluacion?folio=${encodeURIComponent(e.target.value)}`));
      enlazarRevision(raiz, ctx, m.folio);
    },
  };
}
