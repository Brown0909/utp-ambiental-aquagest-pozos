// Paso 2 de la recuperación: elegir contraseña nueva con el enlace (RF-7, RF-8).
import { html } from '../ui/dom.js';
import { entrada, errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { marcoPublico } from '../ui/publico.js';

const MENSAJES = {
  invalido: 'El enlace no es válido.',
  usado: 'Este enlace ya fue usado. Cada enlace sirve una sola vez.',
  vencido: 'El enlace venció (dura 30 minutos).',
};

export default function restablecer(ctx) {
  const { store } = ctx;
  const token = ctx.params.token;
  const estado = store.estadoToken(token);
  if (estado !== 'valido') {
    return { publico: true, contenido: marcoPublico(html`<h2>Restablecer contraseña</h2>
      <div class="aviso aviso-mal" style="margin:18px 0">${icono('alerta')}<div><strong>${MENSAJES[estado]}</strong>Solicite un enlace nuevo.</div></div>
      <a class="btn btn-ancho" href="#/recuperar">Solicitar otro enlace</a>`) };
  }
  return {
    publico: true,
    contenido: marcoPublico(html`<h2>Restablecer contraseña</h2>
      <div class="fila chico negrita" style="margin:14px 0"><span class="badge b-gris">1 · Verificar correo</span><span class="badge b-azul">2 · Restablecer</span></div>
      <form id="form-restablecer" novalidate>
        ${errorForm()}
        ${entrada('nueva', 'Contraseña nueva', { tipo: 'password', requerido: true, auto: 'new-password', ayuda: 'Al menos 8 caracteres, con mayúscula, minúscula y número.' })}
        ${entrada('confirmacion', 'Repita la contraseña', { tipo: 'password', requerido: true, auto: 'new-password' })}
        <button class="btn btn-ancho" type="submit">Guardar contraseña nueva</button>
      </form>`),
    montar(raiz) {
      const form = raiz.querySelector('#form-restablecer');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = leer(form);
        const r = store.restablecer(token, v.nueva, v.confirmacion);
        if (!r.ok) { mostrarErrores(form, r.errores); return; }
        ctx.aviso('Contraseña actualizada. Ya puede iniciar sesión.');
        ctx.navegar('acceso');
      });
      form.nueva.focus();
    },
  };
}
