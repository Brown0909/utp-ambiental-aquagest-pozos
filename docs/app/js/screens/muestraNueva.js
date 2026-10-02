// Láminas 11 y 23 — Registrar muestra (RF-27 a RF-39).
import { html } from '../ui/dom.js';
import { entrada, selector, pastillas, casillas, parametro, errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { zonaArchivo } from '../ui/archivos.js';
import { icono } from '../ui/icons.js';
import { toDateStr, toTimeStr } from '../core/dates.js';
import { siguienteFolio } from '../core/ids.js';
import { TIPOS_AGUA, OBJETIVOS, PARAMETROS_LAB } from '../core/normativa.js';
import { PERIODOS_LLUVIA } from '../core/seed.js';
import { RANGOS_CAMPO } from '../core/store-muestras.js';
import { enlazarFormularioMuestra } from './muestraNuevaLogica.js';

export default function muestraNueva(ctx) {
  const { store } = ctx;
  const ahora = store.ahora();
  const tecnicos = store.data.usuarios.filter((u) => u.estado === 'Activo' && ['Técnico', 'Administrador'].includes(u.rol));
  const yo = tecnicos.find((u) => u.id === store.usuario.id) ?? tecnicos[0];
  const puntoInicial = store.puntoPorId(ctx.consulta.get('punto'))?.id ?? '';
  const folioPrevio = siguienteFolio(store.data.muestras, ahora.getFullYear());

  const contenido = html`<form id="form-muestra" novalidate>${errorForm()}
    <section class="tarjeta"><h2>Información de la muestra</h2>
      <div class="rejilla rejilla-2" style="margin-top:14px">
        <div class="campo"><label for="f-folio">Folio y QR</label><input id="f-folio" value="${folioPrevio}" readonly aria-describedby="ayu-folio"><p class="ayuda" id="ayu-folio">Un único folio identifica la muestra y su QR; se confirma al guardar.</p></div>
        ${selector('puntoId', 'Punto o pozo registrado', store.data.puntos.map((p) => ({ valor: p.id, etiqueta: `${p.id} · ${p.nombre}` })), { valor: puntoInicial, requerido: true, ayuda: 'Se elige del registro institucional; no es texto libre.' })}</div>
      <div id="tarjeta-punto" class="aviso aviso-gris" style="margin-bottom:14px" hidden></div>
      <div class="rejilla rejilla-2">${entrada('fecha', 'Fecha', { tipo: 'date', valor: toDateStr(ahora), requerido: true, max: toDateStr(ahora) })}${entrada('hora', 'Hora', { tipo: 'time', valor: toTimeStr(ahora), requerido: true })}</div>
      ${selector('tecnicoId', 'Técnico responsable', tecnicos.map((u) => ({ valor: u.id, etiqueta: `${u.nombre} (${u.rol})` })), { valor: yo?.id ?? '', requerido: true, vacio: null })}
      ${pastillas('tipoAgua', 'Tipo de agua', TIPOS_AGUA, '', { requerido: true })}
      ${pastillas('objetivo', 'Objetivo de la evaluación', OBJETIVOS, 'Solo monitoreo', { requerido: true })}
      <div class="campo"><span class="campo-titulo">Normativa aplicable</span><div id="normativa" class="aviso aviso-gris" aria-live="polite"></div></div>
      ${pastillas('clasificacion', 'Clasificación de la muestra', [{ valor: 'referencia', etiqueta: 'Muestra de referencia' }, { valor: 'seguimiento', etiqueta: 'Seguimiento después de lluvia' }], 'referencia', { requerido: true })}
      <div id="bloque-referencia" hidden>${selector('referenciaFolio', 'Muestra de referencia', [], { requerido: true, ayuda: 'Referencia registrada del mismo punto o pozo.' })}</div>
    </section>
    <section class="tarjeta"><h2>Contexto de lluvia</h2><p class="chico suave" style="margin:4px 0 12px">Opcional. Complete los tres datos o déjelos vacíos: la muestra dirá «Sin dato».</p>
      <div class="rejilla rejilla-3">${entrada('lluviaMm', 'Cantidad (mm)', { modo: 'decimal' })}${selector('lluviaPeriodo', 'Período', PERIODOS_LLUVIA, { vacio: 'Sin dato' })}${entrada('lluviaFuente', 'Fuente', { placeholder: 'Ej. ETESA Hidrometeorología', largo: 80 })}</div></section>
    <section class="tarjeta"><h2>Ubicación y evidencia de campo</h2>
      <div class="rejilla rejilla-2" style="margin-top:12px">${entrada('comunidad', 'Comunidad / JAAR', { lectura: true })}${entrada('profundidad', 'Datos del pozo (profundidad)', { lectura: true })}</div>
      <p class="campo-titulo" style="margin-top:6px">GPS de la toma (opcional)</p>
      <div class="rejilla rejilla-2">${entrada('lat', 'Latitud', { modo: 'decimal', placeholder: 'Usa la del punto si queda vacío' })}${entrada('lng', 'Longitud', { modo: 'decimal' })}</div>
      <div class="fila" style="margin-bottom:14px"><button type="button" class="btn btn-sec btn-chico" id="capturar">${icono('navegar', 16)} Capturar ubicación</button><span class="chico suave" id="estado-gps" role="status"></span></div>
      ${zonaArchivo('foto', 'Adjuntar foto de campo', { accept: 'image/jpeg,image/png', ayuda: 'JPG o PNG · máximo 5 MB' })}</section>
    <section class="tarjeta"><h2>Parámetros de campo</h2><p class="chico suave" style="margin:4px 0 12px">Mediciones con equipo de campo (opcionales). La conductividad de laboratorio se registra por separado.</p>
      <div class="parametros">${Object.entries(RANGOS_CAMPO).map(([k, r]) => parametro(k, r.nombre, r.unit))}</div></section>
    <section class="tarjeta"><h2>Parámetros solicitados al laboratorio</h2>
      <div style="margin-top:10px">${casillas('solicitados', 'Elija al menos uno', Object.entries(PARAMETROS_LAB).map(([k, p]) => ({ valor: k, etiqueta: p.nombre })), Object.keys(PARAMETROS_LAB), { requerido: true })}</div></section>
    <p class="chico suave" style="margin-top:12px">* Campos obligatorios · MiAMBIENTE</p>
    <div class="acciones-form"><a class="btn btn-neutro" href="#/panel">Cancelar</a><button class="btn" type="submit">Guardar muestra</button></div></form>`;

  return {
    titulo: 'Registrar muestra',
    subtitulo: 'Registra la muestra, objetivo, punto de muestreo y parámetros de campo.',
    contenido,
    montar(raiz) { enlazarFormularioMuestra(raiz, ctx); },
  };
}
