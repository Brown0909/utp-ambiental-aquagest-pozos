// Láminas 2 y 22 — Panel General de Control (RF-65, RF-66, RF-26). Todo se calcula de los datos en memoria.
import { html } from '../ui/dom.js';
import { icono } from '../ui/icons.js';
import { insigniaMuestra, insigniaClase, coordTexto, profundidadTexto, num } from '../ui/formato.js';
import { fmtDate } from '../core/dates.js';
import { can } from '../core/permissions.js';
import { VENTANA_PANEL_DIAS } from '../core/store-selectores.js';

const kpi = (titulo, valor, sub, clase, ico) => html`<article class="tarjeta kpi"><div class="cab"><span>${titulo}</span><span class="ficha ficha-${clase}">${icono(ico, 18)}</span></div>
  <div class="valor">${valor}</div><div class="chico suave">${sub}</div></article>`;

export default function panel(ctx) {
  const { store } = ctx;
  const k = store.kpis();
  const alertas = store.alertas();
  const pendientes = store.pozosConSeguimientoPendiente();
  const ultimas = store.ultimasMuestras(5);
  const puedeRegistrar = can(store.usuario, 'registrar_puntos_muestras');
  const contenido = html`
    <section class="rejilla-kpi" aria-label="Indicadores">
      ${kpi(`Total de muestras (${VENTANA_PANEL_DIAS} días)`, k.total, 'Registradas', 'azul', 'panel')}
      ${kpi('Muestras que Cumplen', k.cumplen, 'Revisión confirmada', 'verde', 'ok')}
      ${kpi('Muestras que NO cumplen', k.noCumplen, 'Revisión confirmada', 'roja', 'alerta')}
      ${kpi('Pendientes de Laboratorio', k.pendientesLab, 'Sin resultados de laboratorio', 'ambar', 'reloj')}
    </section>
    <section class="tarjeta" aria-labelledby="t-dist">
      <div class="tarjeta-titulo"><h2 id="t-dist">Distribución del Cumplimiento</h2><span class="badge b-gris">Últimos ${VENTANA_PANEL_DIAS} días · ${k.revisadas} revisadas de ${k.total}</span></div>
      <div class="barra" role="img" aria-label="${k.distribucion.map((d) => `${d.etiqueta}: ${d.n}`).join(', ')}">
        ${k.distribucion.filter((d) => d.n > 0).map((d) => html`<i class="c-${d.clave}" style="width:${d.pct}%"></i>`)}</div>
      <div class="leyenda">${k.distribucion.map((d) => html`<span><span class="punto c-${d.clave}"></span>${d.etiqueta} · ${d.n} (${num(d.pct)}%)</span>`)}</div>
      <p class="chico suave" style="margin-top:10px">Cumple / No cumple solo cuentan tras la revisión técnica confirmada. «Sin criterio» = solo monitoreo o sin límite aplicable.</p>
    </section>
    <section class="tarjeta" aria-labelledby="t-ult">
      <div class="tarjeta-titulo"><h2 id="t-ult">Últimas muestras</h2>${puedeRegistrar ? html`<a class="btn" href="#/muestras/nueva">+ Registrar muestra</a>` : ''}</div>
      <div class="tabla-caja"><table><thead><tr><th>Código</th><th>Punto de muestreo</th><th>Tipo de agua</th><th>Estado</th></tr></thead><tbody>
        ${ultimas.map((m) => { const p = store.puntoPorId(m.puntoId); return html`<tr><td><a class="negrita" href="#/muestras/${m.folio}">${m.folio}</a></td><td>${p.nombre}</td><td>${m.tipoAgua}</td><td>${insigniaMuestra(store, m)}</td></tr>`; })}
      </tbody></table></div>
    </section>
    <section class="tarjeta" aria-labelledby="t-al">
      <div class="tarjeta-titulo"><h2 id="t-al">Alertas operativas</h2><span class="badge ${alertas.length ? 'b-pendiente' : 'b-cumple'}">${alertas.length}</span></div>
      <div class="apilado">${alertas.length === 0 ? html`<div class="aviso aviso-ok">${icono('ok')}<div>Sin alertas operativas.</div></div>`
        : alertas.map((a) => html`<div class="aviso ${a.nivel === 'critica' ? 'aviso-mal' : 'aviso-amarillo'}">${icono(a.nivel === 'critica' ? 'alerta' : 'reloj')}<div><strong>${a.titulo}</strong>${a.texto}
          ${a.folio ? html` <a href="#/muestras/${a.folio}">Ver muestra</a>` : ''}${a.ruta ? html` <a href="#/${a.ruta}">Ir a evaluación</a>` : ''}</div></div>`)}</div>
    </section>
    <section class="tarjeta" aria-labelledby="t-poz">
      <div class="tarjeta-titulo"><h2 id="t-poz">Pozos con seguimiento pendiente</h2><span class="badge ${pendientes.length ? 'b-no_cumple' : 'b-cumple'}">${pendientes.length} pozo${pendientes.length === 1 ? '' : 's'} pendiente${pendientes.length === 1 ? '' : 's'}</span></div>
      <div class="apilado">${pendientes.length === 0 ? html`<p class="suave">Ningún pozo tiene seguimientos sin revisión confirmada.</p>` : pendientes.map(({ punto, muestras }) => html`
        <article class="tarjeta" style="background:#f8fafc;box-shadow:none"><h3>${punto.nombre}</h3>
          <p class="chico suave">${coordTexto(punto.lat, punto.lng)} · Comunidad ${punto.comunidad} · Profundidad: ${profundidadTexto(punto.profundidad)} · <span title="Identidad permanente, distinta del folio de la muestra">ID ${punto.id}</span></p>
          <div class="apilado" style="margin-top:10px">${muestras.map((m) => html`<div class="fila fila-entre"><div><a class="negrita" href="#/muestras/${m.folio}">${m.folio}</a> <span class="chico suave">· Referencia ${m.referenciaFolio} · ${fmtDate(m.fechaHora)} · Responsable: ${store.nombreDe(m.tecnicoId)}</span></div><div class="fila">${insigniaClase(m)} ${insigniaMuestra(store, m)} <a class="btn btn-sec btn-chico" href="#/puntos/${punto.id}">Ver seguimiento</a></div></div>`)}</div></article>`)}</div>
    </section>`;
  return { titulo: 'Panel General de Control', subtitulo: `Bienvenido ${store.usuario.nombre} · Resumen de muestreos de agua · MiAMBIENTE`, contenido };
}
