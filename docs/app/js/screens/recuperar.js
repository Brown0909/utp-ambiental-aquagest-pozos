// Lámina 21 — Recuperar contraseña (RF-5, RF-6). Responde lo mismo exista o no el correo.
import { html } from '../ui/dom.js';
import { errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { marcoPublico, entradaIcono } from '../ui/publico.js';

export default function recuperar(ctx) {
  const { store } = ctx;
  const contenido = marcoPublico(html`
    <a href="#/acceso" class="btn-enlace chico" style="display:inline-flex;gap:6px;align-items:center;margin-bottom:14px">${icono('volver', 16)} Volver</a>
    <h2>Recuperar contraseña</h2>
    <p class="suave">Ingrese su correo institucional. Le enviaremos un enlace seguro para restablecer el acceso a AquaGest.</p>
    <div class="fila chico negrita" style="margin:14px 0"><span class="badge b-azul">1 · Verificar correo</span><span class="badge b-gris">2 · Restablecer</span></div>
    <form id="form-recuperar" novalidate>
      ${errorForm()}
      ${entradaIcono('correo', 'Correo Electrónico Institucional', icono('correo', 18), { tipo: 'email', auto: 'username', ayuda: 'Use el mismo correo registrado en su cuenta.' })}
      <div class="aviso aviso-info" style="margin-bottom:14px">${icono('candado')}<div><strong>Proceso seguro</strong>El enlace tendrá una vigencia de 30 minutos y sirve una sola vez. Si no reconoce esta solicitud, comuníquese con el administrador institucional.</div></div>
      <button class="btn btn-ancho" type="submit">Enviar enlace de recuperación</button>
      <a class="btn btn-neutro btn-ancho" href="#/acceso" style="margin-top:12px">Volver al acceso</a>
    </form>
    <div id="resultado" role="status" aria-live="polite"></div>`);
  return {
    publico: true,
    contenido,
    montar(raiz) {
      const form = raiz.querySelector('#form-recuperar');
      const salida = raiz.querySelector('#resultado');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        salida.textContent = '';
        const r = store.solicitarRecuperacion(leer(form).correo);
        if (!r.ok) { mostrarErrores(form, r.errores); return; }
        mostrarErrores(form, {});
        const caja = document.createElement('div');
        caja.className = 'aviso aviso-ok';
        caja.style.marginTop = '14px';
        const t = document.createElement('div');
        const b = document.createElement('strong'); b.textContent = 'Solicitud recibida.';
        t.append(b, document.createElement('br'), r.datos.mensaje, document.createElement('br'));
        const a = document.createElement('a'); a.href = '#/bandeja'; a.textContent = 'Abrir la bandeja de correo simulada (solo demostración)';
        t.append(a);
        caja.append(t);
        salida.append(caja);
      });
      form.correo.focus();
    },
  };
}
