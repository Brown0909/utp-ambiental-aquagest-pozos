// Láminas 9 y 19 — Usuarios y roles: lista con filtros, invitar, cambiar rol/estado, solicitudes y matriz (RF-13, RF-67 a RF-70).
import { html, montar } from '../ui/dom.js';
import { entrada, selector, errorForm, leer, mostrarErrores } from '../ui/forms.js';
import { icono } from '../ui/icons.js';
import { iniciales } from '../ui/formato.js';
import { ROLES, ESTADOS_USUARIO, ACCIONES, MATRIZ } from '../core/permissions.js';
import { bloqueSolicitudes, enlazarSolicitudes } from './usuariosSolicitudes.js';

const filtro = { texto: '', rol: '', estado: '' };   // se conservan durante la visita

const selRol = (u) => html`<select class="cambiar-rol" aria-label="${`Rol de ${u.nombre}`}" data-id="${u.id}" style="min-height:36px;border-radius:8px;border:1px solid #c9d4e0;padding:4px 8px">${ROLES.map((o) => html`<option ${o === u.rol ? 'selected' : ''}>${o}</option>`)}</select>`;

export default function usuarios(ctx) {
  const { store } = ctx;

  const fila = (u) => html`<tr data-u="${u.id}"><td><strong>${u.nombre}</strong><br><span class="chico suave">${u.correo}</span></td>
    <td>${selRol(u)}</td>
    <td><span class="badge ${u.estado === 'Activo' ? 'b-cumple' : 'b-gris'}">${u.estado}</span></td>
    <td><button type="button" class="btn btn-sec btn-chico" data-estado="${u.id}">${u.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button></td></tr>`;

  const lista = () => {
    const t = filtro.texto.trim().toLowerCase();
    const us = store.data.usuarios.filter((u) => (!t || `${u.nombre} ${u.correo}`.toLowerCase().includes(t)) && (!filtro.rol || u.rol === filtro.rol) && (!filtro.estado || u.estado === filtro.estado));
    return html`<p class="negrita" aria-live="polite">${us.length} usuario${us.length === 1 ? '' : 's'}</p>
      ${us.length === 0 ? html`<div class="aviso aviso-gris">${icono('buscar')}<div>Ningún usuario coincide con estos filtros.</div></div>`
        : html`<div class="tabla-caja"><table class="tabla"><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${us.map(fila)}</tbody></table></div>`}`;
  };

  const matriz = html`<section class="tarjeta"><h2>Matriz de permisos</h2><p class="suave chico" style="margin:4px 0 12px">Qué puede hacer cada rol. La pantalla oculta lo que no corresponde y cada acción lo vuelve a comprobar.</p>
    <div class="tabla-caja"><table class="tabla"><thead><tr><th>Acción</th>${ROLES.map((r) => html`<th>${r}</th>`)}</tr></thead><tbody>
      ${Object.entries(ACCIONES).map(([k, etiqueta]) => html`<tr><td>${etiqueta}</td>${ROLES.map((r) => html`<td>${MATRIZ[k][r] ? html`<span class="badge b-cumple">Permitido</span>` : html`<span class="badge b-gris">No</span>`}</td>`)}</tr>`)}
    </tbody></table></div><p class="chico suave" style="margin-top:8px">Un usuario inactivo no puede realizar ninguna acción, aunque conserve su rol.</p></section>`;

  const invitar = html`<section class="tarjeta"><h2>Alta / invitar usuario</h2>
    <form id="invitar" novalidate style="margin-top:12px">${errorForm()}<div class="rejilla rejilla-2">
      ${entrada('nombre', 'Nombre completo', { requerido: true, largo: 80, auto: 'off' })}
      ${entrada('correo', 'Correo institucional', { tipo: 'email', requerido: true, placeholder: 'nombre@miambiente.gob.pa', auto: 'off' })}
      ${selector('rol', 'Rol', ROLES, { requerido: true })}
      ${selector('estado', 'Estado', ESTADOS_USUARIO, { valor: 'Activo', requerido: true, vacio: null })}</div>
      <div class="acciones-form"><button class="btn" type="submit">${icono('correo', 16)} Enviar invitación</button></div></form></section>`;

  const bandeja = () => {
    const c = store.data.correos.slice(0, 5);
    return html`<h2>Correos simulados recientes</h2><p class="chico suave" style="margin:4px 0 8px">Esta demostración no envía correos reales: aquí se ven los que se enviarían.</p>
      ${c.length === 0 ? html`<p class="suave">Todavía no se ha enviado ninguno.</p>` : html`<ul>${c.map((x) => html`<li><strong>${x.asunto}</strong><br><span class="chico suave">Para ${x.para}</span></li>`)}</ul>`}`;
  };

  const contenido = html`<div class="apilado"><div id="solicitudes"></div>
    <section class="tarjeta"><h2>Usuarios registrados</h2>
      <form id="filtros" novalidate style="margin-top:12px"><div class="rejilla rejilla-3">
        ${entrada('texto', 'Buscar por nombre o correo', { valor: filtro.texto })}
        ${selector('rol', 'Rol', ROLES, { valor: filtro.rol, vacio: 'Todos' })}
        ${selector('estado', 'Estado', ESTADOS_USUARIO, { valor: filtro.estado, vacio: 'Todos' })}</div></form>
      <p class="error-lista" role="alert" style="color:var(--mal);font-weight:600;margin:8px 0"></p>
      <div id="lista"></div></section>
    ${invitar}${matriz}<section class="tarjeta" id="correos"></section></div>`;

  return {
    titulo: 'Usuarios y roles',
    subtitulo: 'Gestión de cuentas, roles y permisos de MiAMBIENTE.',
    contenido,
    montar(raiz) {
      const zonaLista = raiz.querySelector('#lista');
      const errLista = raiz.querySelector('.error-lista');
      const pintarSolicitudes = () => { const z = raiz.querySelector('#solicitudes'); montar(z, bloqueSolicitudes(store)); enlazarSolicitudes(z, ctx); };
      const pintarCorreos = () => montar(raiz.querySelector('#correos'), bandeja());
      const pintarLista = () => {
        montar(zonaLista, lista());
        zonaLista.querySelectorAll('.cambiar-rol').forEach((s) => s.addEventListener('change', () => {
          const r = store.cambiarRol(s.dataset.id, s.value);
          errLista.textContent = r.ok ? '' : Object.values(r.errores).join(' ');
          if (r.ok) ctx.aviso('Rol actualizado.');
          pintarLista();
        }));
        zonaLista.querySelectorAll('[data-estado]').forEach((b) => b.addEventListener('click', () => {
          const u = store.usuarioPorId(b.dataset.estado);
          const r = store.cambiarEstado(u.id, u.estado === 'Activo' ? 'Inactivo' : 'Activo');
          errLista.textContent = r.ok ? '' : Object.values(r.errores).join(' ');
          if (r.ok) { ctx.aviso(`Usuario ${r.datos.estado === 'Activo' ? 'activado' : 'desactivado'}.`); pintarLista(); }
        }));
      };
      const filtros = raiz.querySelector('#filtros');
      filtros.addEventListener('submit', (e) => e.preventDefault());
      filtros.addEventListener('input', () => { Object.assign(filtro, { texto: filtros.texto.value, rol: filtros.rol.value, estado: filtros.estado.value }); pintarLista(); });
      const form = raiz.querySelector('#invitar');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const r = store.invitarUsuario(leer(form));
        if (!r.ok) { mostrarErrores(form, r.errores); return; }
        mostrarErrores(form, {});
        form.reset();
        ctx.aviso(`Invitación enviada a ${r.datos.correo}.`);
        pintarLista();
        pintarCorreos();
      });
      pintarSolicitudes();
      pintarLista();
      pintarCorreos();
    },
  };
}
