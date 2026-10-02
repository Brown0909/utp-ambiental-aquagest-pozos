// Lámina 14 — Detalle de muestra: trazabilidad, mediciones y resultados del folio (RF-25, RF-59).
import { html } from '../ui/dom.js';
import { icono } from '../ui/icons.js';
import { qrDeFolio } from '../ui/qr.js';
import { coordTexto, profundidadTexto, insigniaMuestra, insigniaClase, insigniaEtapa, enlacePunto } from '../ui/formato.js';
import { lineaTiempo, bloqueLluvia, bloqueResultados, bloqueCampo } from '../ui/componentes.js';
import { fmtDateTime } from '../core/dates.js';
import { PARAMETROS_LAB, normativaAplicable } from '../core/normativa.js';
import { can } from '../core/permissions.js';

export default function muestraDetalle(ctx) {
  const { store } = ctx;
  const m = store.muestraPorFolio(ctx.params.folio);
  if (!m) return { titulo: 'No encontrada', contenido: html`<div class="aviso aviso-amarillo">${icono('alerta')}<div>La muestra ${ctx.params.folio} no existe. <a href="#/historial">Ir al historial</a></div></div>` };
  const p = store.puntoPorId(m.puntoId);
  const etapa = store.etapaDe(m);
  const u = store.usuario;
  const qr = qrDeFolio(m.folio);
  const n = normativaAplicable(m.tipoAgua, m.objetivo);
  const accion = { 'Registrada': can(u, 'registrar_envio') && ['Registrar envío', `custodia?folio=${m.folio}`],
    'Enviada': can(u, 'recepcion_resultados') && ['Confirmar recepción', `custodia?folio=${m.folio}`],
    'Recibida en laboratorio': can(u, 'recepcion_resultados') && ['Cargar resultados', `laboratorio?folio=${m.folio}`],
    'Pendiente de revisión técnica': ['Ver evaluación normativa', `evaluacion?folio=${m.folio}`],
    'Revisión confirmada': ['Ver evaluación normativa', `evaluacion?folio=${m.folio}`] }[etapa];
  const dato = (t, v) => html`<div><div class="chico suave">${t}</div><div class="negrita">${v}</div></div>`;
  const contenido = html`
    <section class="tarjeta"><div class="cabecera-punto"><div>
      <div class="fila">${insigniaClase(m)} ${insigniaEtapa(etapa)} ${insigniaMuestra(store, m)}</div>
      <h2 style="font-size:28px;margin-top:8px">${m.folio}</h2>
      <p class="suave">${m.referenciaFolio ? html`Enlazada a la muestra de referencia <a class="negrita" href="#/muestras/${m.referenciaFolio}">${m.referenciaFolio}</a> · ` : ''}${enlacePunto(p.id, p.nombre)}</p>
      <div class="fila" style="margin-top:12px"><a class="btn btn-neutro btn-chico" href="#/puntos/${p.id}?muestra=${m.folio}">← Volver al ${p.tipo === 'Pozo' ? 'pozo' : 'punto'}</a>${accion ? html`<a class="btn btn-chico" href="#/${accion[1]}">${accion[0]}</a>` : ''}</div></div>
      <div style="width:120px" role="img" aria-label="Código QR del folio ${m.folio}">${qr.svg}</div></div></section>
    <section class="tarjeta"><h2>Datos de la muestra</h2>
      <div class="rejilla rejilla-4" style="margin-top:12px">
        ${dato('Fecha y hora', fmtDateTime(m.fechaHora))}${dato('Técnico responsable', store.nombreDe(m.tecnicoId))}${dato('Tipo de agua', m.tipoAgua)}${dato('Objetivo', m.objetivo)}
        ${dato('Normativa aplicable', n.texto)}${dato('Ubicación del punto', coordTexto(p.lat, p.lng))}${dato('Comunidad', p.comunidad)}${dato(p.tipo === 'Pozo' ? 'Profundidad' : 'Tipo', p.tipo === 'Pozo' ? profundidadTexto(p.profundidad) : 'Punto de muestreo')}
        ${dato('GPS de la toma', m.gps ? coordTexto(m.gps.lat, m.gps.lng) : 'Usa la ubicación del punto')}${dato('Parámetros solicitados', m.solicitados.map((k) => PARAMETROS_LAB[k].nombre).join(', '))}</div>
      ${m.foto ? html`<div style="margin-top:14px"><div class="chico suave">Foto de campo</div>${m.foto.url ? html`<img class="vista-foto" style="margin-inline:0" src="${m.foto.url}" alt="Foto de campo de ${m.folio}">` : html`<span class="negrita">${m.foto.nombre}</span>`}</div>` : ''}</section>
    <div class="rejilla rejilla-2" style="margin-top:16px">
      <section class="tarjeta" style="margin:0"><h2>Cronología del proceso</h2><div style="margin-top:12px">${lineaTiempo(store.cronologia(m))}</div>
        <p class="chico suave">Los estados corresponden a etapas del proceso, no a dictámenes de cumplimiento.</p></section>
      <section class="tarjeta" style="margin:0"><h2>Lluvia asociada</h2><div style="margin-top:10px">${bloqueLluvia(m)}</div>
        <h2 style="margin-top:20px">Mediciones de campo</h2><div style="margin-top:10px">${bloqueCampo(m)}</div></section></div>
    <section class="tarjeta"><h2>Resultados de laboratorio</h2><div style="margin-top:12px">${bloqueResultados(m)}</div></section>
    ${m.revision ? html`<section class="tarjeta"><h2>Revisión técnica</h2><p style="margin-top:8px">Dictamen: ${insigniaMuestra(store, m)}${m.revision.parcial ? html` <span class="chico suave">(evaluación parcial: hay parámetros sin límite cargado)</span>` : ''}</p>
      <p class="chico suave" style="margin-top:6px">Analista: ${store.nombreDe(m.revision.analistaId)} · ${fmtDateTime(m.revision.fecha)}</p><p style="margin-top:8px">${m.revision.observaciones}</p></section>` : ''}`;
  return { titulo: 'Detalle de muestra', subtitulo: 'Consulta la trazabilidad, mediciones y resultados asociados al folio.', contenido };
}
