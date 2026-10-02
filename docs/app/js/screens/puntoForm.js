// Láminas 6 y 16 — Alta de punto o pozo; también edición (RF-18 a RF-24).
import { html } from '../ui/dom.js';
import { entrada, pastillas, errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { coordTexto } from '../ui/formato.js';
import { siguienteIdPunto } from '../core/ids.js';
import { coordinates } from '../core/validators.js';

const MENSAJES_GPS = { 1: 'Permiso de ubicación denegado. Escriba las coordenadas a mano.', 2: 'No se pudo determinar la ubicación. Escriba las coordenadas a mano.', 3: 'La ubicación tardó demasiado. Intente de nuevo o escriba las coordenadas.' };

export default function puntoForm(ctx) {
  const { store } = ctx;
  const id = ctx.params.id ?? null;
  const edicion = id !== null;
  const punto = edicion ? store.puntoPorId(id) : null;
  if (edicion && !punto) return { titulo: 'No encontrado', contenido: html`<div class="aviso aviso-amarillo">${icono('alerta')}<div>El registro ${id} no existe. <a href="#/puntos">Volver a Puntos y pozos</a></div></div>` };
  const v = punto ?? { tipo: 'Pozo', nombre: '', comunidad: '', profundidad: '', lat: '', lng: '' };

  const contenido = html`<section class="tarjeta"><h2>Datos del registro</h2>
    <p class="suave" style="margin:4px 0 16px">${edicion ? 'Edite los datos. El ID y el tipo no cambian.' : 'Complete el registro antes de asociar muestras.'}</p>
    <form id="form-punto" novalidate>${errorForm()}
      ${edicion ? html`<div class="campo"><span class="campo-titulo">Tipo de registro</span><p class="negrita">${punto.tipo}</p></div><input type="hidden" name="tipo" value="${punto.tipo}">`
        : pastillas('tipo', 'Tipo de registro', ['Punto', 'Pozo'], v.tipo, { requerido: true })}
      ${entrada('id', 'ID del punto o pozo', { valor: edicion ? punto.id : siguienteIdPunto(store.data.puntos, v.tipo), lectura: true, ayuda: 'Identidad permanente. No es el folio de la muestra.' })}
      <div class="rejilla rejilla-2">${entrada('nombre', 'Nombre', { valor: v.nombre, requerido: true, largo: 80, placeholder: 'Ej. Pozo Alajuela Norte' })}${entrada('comunidad', 'Comunidad', { valor: v.comunidad, requerido: true, largo: 60 })}</div>
      <div id="bloque-prof">${entrada('profundidad', 'Profundidad (m)', { valor: v.profundidad ?? '', requerido: true, modo: 'decimal', ayuda: 'Obligatorio únicamente para pozos (entre 0,5 y 500 m).' })}</div>
      <h3 style="margin:8px 0">Ubicación geográfica</h3>
      <p class="chico suave" style="margin-bottom:10px">Capture el GPS o ingrese las coordenadas manualmente (coordenadas decimales, punto o coma).</p>
      <div class="fila" style="margin-bottom:10px"><button type="button" class="btn btn-sec" id="capturar">${icono('navegar', 18)} Capturar ubicación</button><span class="chico suave" id="estado-gps" role="status"></span></div>
      <div class="rejilla rejilla-2">${entrada('lat', 'Latitud', { valor: v.lat, requerido: true, modo: 'decimal', placeholder: '9.0333' })}${entrada('lng', 'Longitud', { valor: v.lng, requerido: true, modo: 'decimal', placeholder: '-79.5333' })}</div>
      <p class="chico negrita" id="vista-coord" aria-live="polite"></p>
      <p class="chico suave">* Campos obligatorios · Institución: MiAMBIENTE</p>
      <div class="acciones-form"><button class="btn" type="submit">Guardar</button><a class="btn btn-neutro" href="${edicion ? `#/puntos/${id}` : '#/puntos'}">Cancelar</a></div>
    </form></section>`;

  return {
    titulo: edicion ? `Editar ${punto.id}` : 'Alta de punto o pozo',
    subtitulo: edicion ? 'Actualice nombre, comunidad, profundidad y coordenadas.' : 'Completa el registro antes de asociar muestras.',
    contenido,
    montar(raiz) {
      const form = raiz.querySelector('#form-punto');
      const bloqueProf = raiz.querySelector('#bloque-prof');
      const campoId = form.querySelector('#f-id');
      const coord = raiz.querySelector('#vista-coord');
      const tipoActual = () => (edicion ? punto.tipo : leer(form).tipo);
      const ajustar = () => {
        const esPozo = tipoActual() === 'Pozo';
        bloqueProf.hidden = !esPozo;
        form.profundidad.disabled = !esPozo;
        if (!edicion) campoId.value = siguienteIdPunto(store.data.puntos, tipoActual());
      };
      const vista = () => {
        const c = coordinates(form.lat.value, form.lng.value);
        coord.textContent = Object.keys(c.errors).length ? '' : coordTexto(c.lat, c.lng);
      };
      form.addEventListener('change', ajustar);
      form.addEventListener('input', vista);
      ajustar(); vista();

      raiz.querySelector('#capturar').addEventListener('click', (e) => {
        const estado = raiz.querySelector('#estado-gps');
        if (!navigator.geolocation) { mostrarErrores(form, { lat: 'Este dispositivo no permite capturar la ubicación. Escriba las coordenadas.' }); return; }
        e.currentTarget.disabled = true;
        estado.textContent = 'Buscando ubicación…';
        navigator.geolocation.getCurrentPosition((pos) => {
          form.lat.value = pos.coords.latitude.toFixed(6);
          form.lng.value = pos.coords.longitude.toFixed(6);
          estado.textContent = `Ubicación capturada (precisión ≈ ${Math.round(pos.coords.accuracy)} m).`;
          e.currentTarget.disabled = false;
          const c = coordinates(form.lat.value, form.lng.value);
          mostrarErrores(form, c.errors);       // si cae fuera de Panamá, se avisa de inmediato (RF-21)
          vista();
        }, (err) => {
          estado.textContent = '';
          e.currentTarget.disabled = false;
          mostrarErrores(form, { lat: MENSAJES_GPS[err.code] ?? 'No se pudo capturar la ubicación.' });
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (form.dataset.enviando) return;
        const datos = leer(form);
        const r = edicion ? store.editarPunto(id, datos) : store.crearPunto(datos);
        if (!r.ok) { mostrarErrores(form, r.errores); return; }
        form.dataset.enviando = '1';
        ctx.aviso(`${r.datos.id} guardado.`);
        ctx.navegar(`puntos/${r.datos.id}`);
      });
      form.nombre.focus();
    },
  };
}
