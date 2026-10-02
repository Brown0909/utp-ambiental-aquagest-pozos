// Lámina 20 — Solicitud de cuenta (RF-11, RF-12). Un administrador la aprueba o rechaza en «Usuarios y roles».
import { html } from '../ui/dom.js';
import { entrada, selector, errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { marcoPublico } from '../ui/publico.js';
import { PROVINCIAS } from '../core/store-usuarios.js';

export default function solicitud(ctx) {
  const { store } = ctx;
  const formulario = html`<h2>Solicitud de cuenta</h2>
    <p class="suave">Complete sus datos institucionales. La solicitud será validada por un administrador de MiAMBIENTE.</p>
    <form id="form-solicitud" novalidate style="margin-top:20px">
      ${errorForm()}
      <div class="rejilla rejilla-2">${entrada('nombre', 'Nombre', { requerido: true, auto: 'given-name' })}${entrada('apellido', 'Apellido', { requerido: true, auto: 'family-name' })}</div>
      ${entrada('correo', 'Correo electrónico institucional', { tipo: 'email', requerido: true, ayuda: 'Debe terminar en @miambiente.gob.pa', auto: 'email' })}
      ${entrada('institucion', 'Institución', { valor: 'Ministerio de Ambiente · MiAMBIENTE', lectura: true })}
      <div class="rejilla rejilla-2">${entrada('unidad', 'Unidad / Dirección', { requerido: true, placeholder: 'Ej. Calidad Ambiental', largo: 80 })}${selector('provincia', 'Provincia', PROVINCIAS, { requerido: true })}</div>
      ${entrada('cargo', 'Cargo o función', { requerido: true, placeholder: 'Ej. Técnico de muestreo ambiental', largo: 80 })}
      <p class="chico suave">Al enviar esta solicitud, confirma que los datos corresponden a su identidad institucional. (Demo: no se envía ningún correo real.)</p>
      <div class="acciones-form"><a class="btn btn-neutro" href="#/acceso">Cancelar</a><button class="btn" type="submit">Enviar solicitud</button></div>
    </form>`;
  return {
    publico: true,
    contenido: marcoPublico(formulario),
    montar(raiz) {
      const form = raiz.querySelector('#form-solicitud');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const r = store.solicitarCuenta(leer(form));
        if (!r.ok) { mostrarErrores(form, r.errores); return; }
        raiz.querySelector('.caja').innerHTML = '';
        const ok = document.createElement('div');
        ok.className = 'aviso aviso-ok';
        ok.setAttribute('role', 'status');
        ok.innerHTML = icono('ok', 22).texto;
        const t = document.createElement('div');
        t.innerHTML = '<strong>Solicitud enviada.</strong>';
        t.append(' Un administrador la validará. (Demo: entre como Administrador y vaya a «Usuarios y roles» para aprobarla.) ');
        const a = document.createElement('a'); a.href = '#/acceso'; a.textContent = 'Volver al acceso'; t.append(a);
        ok.append(t);
        raiz.querySelector('.caja').append(ok);
      });
      form.nombre.focus();
    },
  };
}
