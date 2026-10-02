// Lámina 1 — Acceso al sistema (RF-1 a RF-4, RF-9, RF-10).
import { html } from '../ui/dom.js';
import { errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { marcoPublico, entradaIcono, enlazarVer } from '../ui/publico.js';
import { CLAVE_DEMO } from '../core/seed.js';

const ROLES_RAPIDOS = [['Técnico', 'Técnico'], ['Laboratorio', 'Laboratorio'], ['Administrador', 'Administrador']];

export default function acceso(ctx) {
  const { store } = ctx;
  const quien = (rol) => store.data.usuarios.find((u) => u.rol === rol && u.estado === 'Activo');
  const contenido = marcoPublico(html`
    <h2>Acceso al Sistema</h2>
    <p class="suave">Inicie sesión para gestionar las muestras ambientales.</p>
    <form id="form-acceso" novalidate style="margin-top:22px">
      ${errorForm()}
      ${entradaIcono('correo', 'Correo Electrónico Institucional', icono('correo', 18), { tipo: 'email', auto: 'username' })}
      <div class="fila fila-entre" style="margin-bottom:6px"><span></span><a href="#/recuperar" class="chico negrita">¿Olvidó su contraseña?</a></div>
      ${entradaIcono('password', 'Contraseña', icono('candado', 18), { tipo: 'password', auto: 'current-password', ver: true })}
      <button class="btn btn-ancho" type="submit" style="margin-top:6px">Iniciar Sesión</button>
      <a class="btn btn-sec btn-ancho" href="#/solicitud" style="margin-top:12px">Solicitar Creación de Cuenta</a>
    </form>
    <div class="demo-clave"><strong>Demostración con datos ficticios.</strong> Clave de todos los usuarios de ejemplo: <code>${CLAVE_DEMO}</code>
      <div class="fila" style="margin-top:8px">${ROLES_RAPIDOS.map(([rol, texto]) => html`<button type="button" class="btn btn-neutro btn-chico" data-usar="${rol}">Entrar como ${texto}</button>`)}</div>
      <p class="chico" style="margin-top:8px"><a href="#/bandeja">Bandeja de correo simulada</a> · <a href="../index.html">← Volver a la presentación del proyecto</a></p></div>`);

  return {
    publico: true,
    contenido,
    montar(raiz) {
      const form = raiz.querySelector('#form-acceso');
      enlazarVer(raiz);
      raiz.querySelectorAll('[data-usar]').forEach((b) => b.addEventListener('click', () => {
        const u = quien(b.dataset.usar);
        form.correo.value = u.correo;
        form.password.value = CLAVE_DEMO;
        form.querySelector('button[type=submit]').focus();
      }));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = leer(form);
        const r = store.login(v.correo, v.password);
        if (!r.ok) { mostrarErrores(form, r.errores); return; }
        ctx.aviso(`Bienvenido/a, ${r.datos.usuario.nombre}.`);
        ctx.navegar('panel');
      });
      form.correo.focus();
    },
  };
}
