// Tarjetas del detalle de pozo (spec 003): comparación referencia–seguimiento, histórico mensual con lluvia e importación.
import { html } from './dom.js';
import { num } from './formato.js';
import { numTexto, etiquetaFormaCorta } from '../core/units.js';
import { fmtDate } from '../core/dates.js';
import { resumenAnual, correlacionLluviaNitrato, plantillaCsv, COLUMNAS_CSV, MAX_BYTES_CSV, MIN_PARES_CORRELACION } from '../core/historico.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesCorto = (periodo) => `${MESES[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(2, 4)}`;
const signo = (n) => (n > 0 ? '+' : '');
const dato = (v, f = (x) => numTexto(x)) => (v === null || v === undefined ? 'Sin dato' : f(v));

/** Cada seguimiento frente a su referencia. Describe lo observado; no dice si cumple ni que la lluvia sea la causa. */
export function tarjetaComparacion(comparaciones) {
  return html`<section class="tarjeta"><h2>Referencia frente a seguimiento después de lluvia</h2>
    ${comparaciones.length === 0 ? html`<p class="suave" style="margin-top:8px">Todavía no hay una muestra de seguimiento enlazada a una referencia en este pozo.</p>` : html`
    <div class="tabla-caja" style="margin-top:12px"><table><thead><tr><th>Referencia</th><th>Seguimiento</th><th>Cambio de nitrato</th><th>Lluvia registrada (seguimiento)</th></tr></thead><tbody>
      ${comparaciones.map((c) => html`<tr>
        <td><a href="#/muestras/${c.seguimiento.referenciaFolio}" class="negrita">${c.seguimiento.referenciaFolio}</a><div class="chico suave">${c.referencia ? fmtDate(c.referencia.fechaHora) : 'No encontrada'}${c.comparable ? ` · ${numTexto(c.nitratoRef)} mg/L` : ''}</div></td>
        <td><a href="#/muestras/${c.seguimiento.folio}" class="negrita">${c.seguimiento.folio}</a><div class="chico suave">${fmtDate(c.seguimiento.fechaHora)}${c.comparable ? ` · ${numTexto(c.nitratoSeg)} mg/L` : ''}</div></td>
        <td>${c.comparable ? html`<span class="negrita">${signo(c.delta)}${numTexto(c.delta)} mg/L</span>${c.porcentaje === null ? '' : ` (${signo(c.porcentaje)}${numTexto(c.porcentaje, 1)} %)`} · ${c.sentido}<div class="chico suave">Como ${etiquetaFormaCorta(c.forma)}</div>` : html`<span class="suave">${c.motivo}</span>`}</td>
        <td>${c.lluvia ? html`${num(c.lluvia.mm)} mm en ${c.lluvia.periodo}<div class="chico suave">${c.lluvia.fuente}</div>` : 'Sin dato'}</td></tr>`)}
    </tbody></table></div>`}
    <p class="chico suave" style="margin-top:10px">Describe lo observado entre dos muestras. No prueba que la lluvia sea la causa, una diferencia pequeña puede estar dentro de la incertidumbre del método del laboratorio, y no dice si el agua cumple: eso solo lo dictamina la revisión técnica.</p></section>`;
}

/** Barras = lluvia mensual (mm); línea = nitrato mensual. Dos escalas: la tabla de abajo es el equivalente en texto. */
function grafica(meses, forma) {
  const W = 640; const H = 230; const ML = 40; const MR = 40; const MT = 16; const MB = 32;
  const iw = W - ML - MR; const ih = H - MT - MB;
  const maxL = Math.max(1, ...meses.map((m) => m.lluviaMm ?? 0));
  const maxN = Math.max(1, ...meses.map((m) => m.nitrato ?? 0));
  const paso = iw / meses.length;
  const ancho = Math.max(2, paso * 0.6);
  const x = (i) => ML + paso * i + paso / 2;
  const yL = (v) => MT + ih - (v / maxL) * ih;
  const yN = (v) => MT + ih - (v / maxN) * ih;
  const puntos = meses.map((m, i) => (m.nitrato === null ? null : { x: x(i), y: yN(m.nitrato) })).filter(Boolean);
  return html`<div class="grafica"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Lluvia mensual en barras y nitrato mensual en línea, ${meses.length} meses. El detalle está en la tabla de abajo.">
    <line class="g-eje" x1="${ML}" y1="${MT + ih}" x2="${W - MR}" y2="${MT + ih}"/>
    ${meses.map((m, i) => (m.lluviaMm === null ? '' : html`<rect class="g-barra" x="${(x(i) - ancho / 2).toFixed(1)}" y="${yL(m.lluviaMm).toFixed(1)}" width="${ancho.toFixed(1)}" height="${(MT + ih - yL(m.lluviaMm)).toFixed(1)}"/>`))}
    ${puntos.length > 1 ? html`<polyline class="g-linea" points="${puntos.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>` : ''}
    ${puntos.map((p) => html`<circle class="g-punto" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.6"/>`)}
    <text class="g-txt" x="${ML - 6}" y="${MT + 4}" text-anchor="end">${Math.round(maxL)}</text><text class="g-txt" x="${ML - 6}" y="${MT + ih}" text-anchor="end">0</text>
    <text class="g-txt g-txt-n" x="${W - MR + 6}" y="${MT + 4}">${numTexto(maxN, 1)}</text><text class="g-txt g-txt-n" x="${W - MR + 6}" y="${MT + ih}">0</text>
    <text class="g-txt" x="${ML}" y="${H - 10}">${mesCorto(meses[0].periodo)}</text><text class="g-txt" x="${W - MR}" y="${H - 10}" text-anchor="end">${mesCorto(meses[meses.length - 1].periodo)}</text></svg>
    <p class="chico suave">Barras: lluvia (mm por mes, eje izquierdo) · Línea: nitrato como ${etiquetaFormaCorta(forma)} (mg/L, eje derecho)</p></div>`;
}

export function tarjetaHistorico(store, punto, { forma = null, escribe = false, folioActual = '' } = {}) {
  const serie = store.serieDePunto(punto.id, forma);
  const { meses } = serie;
  const anuales = resumenAnual(meses);
  const corr = correlacionLluviaNitrato(meses);
  const hayEjemplo = meses.some((m) => m.ejemplo);
  const otras = serie.formas.filter((f) => f !== serie.forma);
  return html`<section class="tarjeta"><div class="tarjeta-titulo"><h2>Histórico mensual y lluvia</h2><span class="chico suave">${meses.length} mes${meses.length === 1 ? '' : 'es'} con datos</span></div>
    ${hayEjemplo ? html`<div class="aviso aviso-amarillo" style="margin-bottom:12px"><div><strong>Incluye datos de ejemplo (ficticios)</strong>Sirven para la demostración. No son mediciones reales y la relación que se ve no es un hallazgo. Los datos reales se cargan con «Importar histórico».</div></div>` : ''}
    ${meses.length === 0 ? html`<p class="suave">Este ${punto.tipo === 'Pozo' ? 'pozo' : 'punto'} todavía no tiene histórico. ${escribe ? 'Importe un CSV con datos reales abajo.' : ''}</p>` : html`
      ${grafica(meses, serie.forma)}
      ${otras.length ? html`<p class="chico" style="margin-top:8px">Se muestra nitrato como ${etiquetaFormaCorta(serie.forma)}; ${serie.excluidos} registro(s) en otra forma no se incluyen porque no se mezclan sin conversión documentada. ${otras.map((f) => html`<a href="#/puntos/${punto.id}?${folioActual ? `muestra=${folioActual}&` : ''}forma=${f}">Ver como ${etiquetaFormaCorta(f)}</a> `)}</p>` : ''}
      <div class="aviso aviso-gris" style="margin-top:12px"><div>${corr.r === null ? corr.motivo : html`<strong>Relación lluvia–nitrato (mensual): r = ${numTexto(corr.r)} con ${corr.n} meses.</strong>Es una medida orientativa (con menos de ${MIN_PARES_CORRELACION} meses no se calcula). Que dos series se muevan juntas no prueba que una cause la otra.`}</div></div>
      <h3 style="margin:16px 0 8px">Resumen por año</h3>
      <div class="tabla-caja"><table><thead><tr><th>Año</th><th>Meses con dato</th><th>Nitrato medio</th><th>Nitrato máx.</th><th>Lluvia acumulada</th><th>Caudal medio</th></tr></thead><tbody>
        ${anuales.map((a) => html`<tr><td class="negrita">${a.anio}</td><td>${a.mesesConDato}</td><td>${dato(a.nitratoMedio)} mg/L</td><td>${dato(a.nitratoMax)} mg/L</td><td>${dato(a.lluviaTotal, (v) => `${numTexto(v, 1)} mm`)}${a.mesesConLluvia ? html` <span class="chico suave">(${a.mesesConLluvia} meses)</span>` : ''}</td><td>${dato(a.caudalMedio)} L/s</td></tr>`)}
      </tbody></table></div>
      <details style="margin-top:14px"><summary class="negrita">Ver tabla mensual completa</summary>
        <div class="tabla-caja" style="margin-top:8px"><table><thead><tr><th>Mes</th><th>Nitrato (mg/L)</th><th>Lluvia (mm)</th><th>Caudal (L/s)</th></tr></thead><tbody>
          ${[...meses].reverse().map((m) => html`<tr><td>${mesCorto(m.periodo)}${m.ejemplo ? html` <span class="badge b-gris">Ejemplo</span>` : ''}</td><td>${dato(m.nitrato)}${m.nNitrato > 1 ? html` <span class="chico suave">(${m.nNitrato} registros)</span>` : ''}</td><td>${dato(m.lluviaMm)}</td><td>${dato(m.caudalLs)}</td></tr>`)}
        </tbody></table></div></details>
      <p class="chico suave" style="margin-top:10px">Nitrato: promedio de los registros históricos y de las muestras del sistema de ese mes. Lluvia y caudal: solo del histórico, con la fuente indicada al importarlo.</p>`}
    ${escribe ? html`<div style="margin-top:18px;border-top:1px solid var(--borde);padding-top:14px"><h3>Importar histórico (CSV)</h3>
      <p class="chico suave" style="margin:4px 0 10px">Una fila por mes. Columnas: ${COLUMNAS_CSV.join(', ')}. Obligatorios: periodo (AAAA-MM), fuente y al menos un dato. Si hay nitrato, indique su forma (NO3 o NO3-N). Se importa todo o nada; hasta 1 MB.</p>
      <div class="fila"><label for="csv-historico" class="oculto-visual">Archivo CSV del histórico</label><input type="file" id="csv-historico" accept=".csv,text/csv"><button type="button" class="btn btn-sec btn-chico" id="plantilla-csv">Descargar plantilla</button></div>
      <div id="resultado-importacion" role="status" aria-live="polite" style="margin-top:10px"></div></div>` : ''}</section>`;
}

/** Conecta el selector de archivo: lee el CSV en el navegador y lo entrega al store. Los mensajes van con textContent. */
export function montarImportacion(raiz, ctx, puntoId) {
  const entrada = raiz.querySelector('#csv-historico');
  if (!entrada) return;
  const salida = raiz.querySelector('#resultado-importacion');
  const mostrar = (texto, lineas = []) => {
    salida.replaceChildren();
    const caja = document.createElement('div');
    caja.className = 'aviso aviso-mal';
    const cuerpo = document.createElement('div');
    cuerpo.textContent = texto;
    if (lineas.length) {
      const lista = document.createElement('ul');
      lista.style.margin = '6px 0 0';
      for (const l of lineas) { const li = document.createElement('li'); li.textContent = l; lista.append(li); }
      cuerpo.append(lista);
    }
    caja.append(cuerpo);
    salida.append(caja);
  };
  entrada.addEventListener('change', async () => {
    const archivo = entrada.files[0];
    if (!archivo) return;
    entrada.value = '';
    if (!/\.csv$/i.test(archivo.name)) return mostrar('Elija un archivo con extensión .csv.');
    if (!archivo.size) return mostrar('El archivo está vacío.');
    if (archivo.size > MAX_BYTES_CSV) return mostrar('El archivo supera 1 MB.');
    const r = ctx.store.importarHistorico(puntoId, await archivo.text());
    if (!r.ok) return mostrar(r.errores._form ?? 'No se pudo importar el archivo.', r.detalle ?? []);
    ctx.aviso(`${r.datos.importadas} mes(es) importado(s).`);
    ctx.rerender();
  });
  raiz.querySelector('#plantilla-csv').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([plantillaCsv(puntoId)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `plantilla_historico_${puntoId}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
