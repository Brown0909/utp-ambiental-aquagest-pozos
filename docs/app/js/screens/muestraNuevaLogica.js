// Comportamiento del formulario «Registrar muestra»: punto elegido, normativa en vivo, referencia, GPS, foto y guardado.
import { html, montar } from '../ui/dom.js';
import { leer, mostrarErrores } from '../ui/forms.js';
import { enlazarArchivo } from '../ui/archivos.js';
import { icono } from '../ui/icons.js';
import { capturarUbicacion } from '../ui/gps.js';
import { coordTexto, profundidadTexto } from '../ui/formato.js';
import { normativaAplicable, combinacionValida, tipoAguaParaRegistro, REGLAMENTOS } from '../core/normativa.js';
import { coordinates } from '../core/validators.js';
import { fmtDate } from '../core/dates.js';

export function enlazarFormularioMuestra(raiz, ctx) {
  const { store } = ctx;
  const form = raiz.querySelector('#form-muestra');
  const foto = enlazarArchivo(raiz, 'foto', { vista: true });
  const tarjeta = raiz.querySelector('#tarjeta-punto');
  const normativa = raiz.querySelector('#normativa');
  const bloqueRef = raiz.querySelector('#bloque-referencia');
  const marcar = (nombre, valor) => form.querySelectorAll(`input[name="${nombre}"]`).forEach((i) => { i.checked = i.value === valor; });
  const puntoActual = () => store.puntoPorId(form.puntoId.value);

  function llenarReferencias() {
    const refs = form.puntoId.value ? store.referenciasDe(form.puntoId.value) : [];
    const previa = form.referenciaFolio.value;
    montar(form.referenciaFolio, html`<option value="">${refs.length ? 'Seleccione…' : 'Este punto no tiene muestras de referencia'}</option>${refs.map((m) => html`<option value="${m.folio}"${m.folio === previa ? ' selected' : ''}>${m.folio} (${fmtDate(m.fechaHora)})</option>`)}`);
  }

  function actualizarNormativa() {
    const { tipoAgua, objetivo } = leer(form);
    let clase = 'aviso-gris';
    let cuerpo = html`Elija el tipo de agua y el objetivo.`;
    if (tipoAgua && objetivo) {
      const err = combinacionValida(tipoAgua, objetivo);
      const n = normativaAplicable(tipoAgua, objetivo);
      if (err) { clase = 'aviso-mal'; cuerpo = html`<strong>Combinación no prevista</strong>${err}`; }
      else if (n.estado === 'definida') { clase = 'aviso-info'; cuerpo = html`<strong>${REGLAMENTOS[n.reglamentoId].nombre}</strong>${REGLAMENTOS[n.reglamentoId].verificacion}`; }
      else if (n.estado === 'sin_criterio') cuerpo = html`<strong>Sin criterio aplicable</strong>Solo monitoreo no aplica un límite de cumplimiento.`;
      else cuerpo = html`<strong>${n.texto}</strong>El analista debe definir el criterio.`;
    }
    normativa.className = `aviso ${clase}`;
    montar(normativa, html`${icono('check')}<div>${cuerpo}<span class="chico" style="display:block;margin-top:4px">COPANIT 35-2019: descargas · COPANIT 24-99: reutilización. Criterios sujetos a verificación técnica.</span></div>`);
  }

  function actualizarPunto(porUsuario) {
    const p = puntoActual();
    tarjeta.hidden = !p;
    if (p) montar(tarjeta, html`${icono('pin')}<div><strong>${p.id} · ${p.nombre}</strong><br>${coordTexto(p.lat, p.lng)} · Comunidad ${p.comunidad}${p.tipo === 'Pozo' ? html` · Profundidad: ${profundidadTexto(p.profundidad)}` : ''}<br><span class="chico">ID permanente · distinto del folio de muestra</span></div>`);
    form.comunidad.value = p ? p.comunidad : '';
    form.profundidad.value = p ? (p.tipo === 'Pozo' ? profundidadTexto(p.profundidad) : 'No aplica (es un punto)') : '';
    if (p && porUsuario) {
      const actual = leer(form).tipoAgua;
      if (!actual || tipoAguaParaRegistro(p.tipo, actual)) marcar('tipoAgua', p.tipo === 'Pozo' ? 'Subterránea/Pozo' : 'Agua superficial');
    }
    llenarReferencias();
    actualizarNormativa();
  }

  const alternarReferencia = () => { bloqueRef.hidden = leer(form).clasificacion !== 'seguimiento'; };
  form.puntoId.addEventListener('change', () => actualizarPunto(true));
  form.addEventListener('change', (e) => {
    if (e.target.name === 'tipoAgua' || e.target.name === 'objetivo') actualizarNormativa();
    if (e.target.name === 'clasificacion') alternarReferencia();
  });

  raiz.querySelector('#capturar').addEventListener('click', (e) => capturarUbicacion({
    boton: e.currentTarget, estadoEl: raiz.querySelector('#estado-gps'),
    alExito: (lat, lng) => { form.lat.value = lat; form.lng.value = lng; mostrarErrores(form, coordinates(lat, lng).errors); },
    alError: (msg) => mostrarErrores(form, { lat: msg }),
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.dataset.enviando) return;
    const r = store.crearMuestra({ ...leer(form), foto: foto.obtener() });
    if (!r.ok) { mostrarErrores(form, r.errores); return; }
    form.dataset.enviando = '1';
    (r.advertencias ?? []).forEach((a) => ctx.aviso(a, 'mal'));
    ctx.navegar(`muestras/${r.datos.folio}/guardada`);
  });
  actualizarPunto(false);
  alternarReferencia();
  form.puntoId.focus();
}
