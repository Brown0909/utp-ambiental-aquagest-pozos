// Solicitudes de cuenta y gestión de usuarios (RF-11 a RF-13, RF-68 a RF-70).
import { fallo, exito, hayErrores } from './result.js';
import { validate, required, institutionalEmail, personName, fullName, textLength, normEmail, clean } from './validators.js';
import { ROLES, ESTADOS_USUARIO } from './permissions.js';
import { CLAVE_DEMO } from './seed.js';

export const PROVINCIAS = ['Bocas del Toro', 'Chiriquí', 'Coclé', 'Colón', 'Darién', 'Herrera', 'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas', 'Comarca Guna Yala', 'Comarca Emberá-Wounaan', 'Comarca Ngäbe-Buglé'];
const unoDe = (lista, msg) => (v) => (v && !lista.includes(v) ? msg : null);

export default {
  correoYaRegistrado(correo, exceptoId = null) {
    const c = normEmail(correo);
    return this.data.usuarios.some((u) => u.id !== exceptoId && normEmail(u.correo) === c);
  },

  esUltimoAdminActivo(u) {
    const activos = this.data.usuarios.filter((x) => x.rol === 'Administrador' && x.estado === 'Activo');
    return u.rol === 'Administrador' && u.estado === 'Activo' && activos.length === 1;
  },

  /** Cualquiera puede pedir una cuenta (no requiere sesión). RF-11 y RF-12. */
  solicitarCuenta(v) {
    const errores = validate(v, {
      nombre: [required, personName],
      apellido: [required, personName],
      correo: [required, institutionalEmail],
      unidad: [required, (x) => textLength(x, { min: 2, max: 80 })],
      provincia: [required, unoDe(PROVINCIAS, 'Elija una provincia o comarca de la lista.')],
      cargo: [required, (x) => textLength(x, { min: 3, max: 80 })],
    });
    if (!errores.correo) {
      if (this.correoYaRegistrado(v.correo)) errores.correo = 'Ya existe un usuario con este correo.';
      else if (this.data.solicitudes.some((s) => s.estado === 'Pendiente' && normEmail(s.correo) === normEmail(v.correo))) errores.correo = 'Ya hay una solicitud pendiente con este correo.';
    }
    if (hayErrores(errores)) return fallo(errores);
    this.data.contador.solicitud += 1;
    const s = { id: `S${this.data.contador.solicitud}`, nombre: clean(v.nombre), apellido: clean(v.apellido), correo: normEmail(v.correo), unidad: clean(v.unidad), provincia: v.provincia, cargo: clean(v.cargo), fecha: this.ahoraIso(), estado: 'Pendiente', motivo: null };
    this.data.solicitudes.push(s);
    this.notificar();
    return exito(s);
  },

  /** RF-13: solo un Administrador aprueba (con rol) o rechaza (con motivo de 5+ caracteres). */
  resolverSolicitud(id, { decision, rol, motivo }) {
    const sinPermiso = this.exigir('gestionar_usuarios');
    if (sinPermiso) return sinPermiso;
    const s = this.data.solicitudes.find((x) => x.id === id);
    if (!s || s.estado !== 'Pendiente') return fallo({ _form: 'La solicitud no existe o ya fue resuelta.' });
    if (decision === 'aprobar') {
      const errores = validate({ rol }, { rol: [required, unoDe(ROLES, 'Elija un rol válido.')] });
      if (!errores.rol && this.correoYaRegistrado(s.correo)) errores._form = 'Ya existe un usuario con este correo.';
      if (hayErrores(errores)) return fallo(errores);
      const u = { id: `U${this.data.usuarios.length + 1}`, nombre: `${s.nombre} ${s.apellido}`, correo: s.correo, rol, estado: 'Activo', password: CLAVE_DEMO };
      this.data.usuarios.push(u);
      s.estado = 'Aprobada';
      this.enviarCorreo({ para: u.correo, asunto: 'Su cuenta de AquaGest fue aprobada', cuerpo: `Ya puede iniciar sesión con el rol ${rol}. (Demo: la clave es la de demostración.)`, enlace: '#/acceso' });
    } else if (decision === 'rechazar') {
      const errores = validate({ motivo }, { motivo: [required, (x) => textLength(x, { min: 5, max: 200 })] });
      if (hayErrores(errores)) return fallo(errores);
      s.estado = 'Rechazada';
      s.motivo = clean(motivo);
      this.enviarCorreo({ para: s.correo, asunto: 'Su solicitud de cuenta no fue aprobada', cuerpo: `Motivo: ${s.motivo}` });
    } else return fallo({ _form: 'Decisión no válida.' });
    this.notificar();
    return exito(s);
  },

  invitarUsuario(v) {
    const sinPermiso = this.exigir('gestionar_usuarios');
    if (sinPermiso) return sinPermiso;
    const errores = validate(v, {
      nombre: [required, fullName],
      correo: [required, institutionalEmail],
      rol: [required, unoDe(ROLES, 'Elija un rol válido.')],
      estado: [required, unoDe(ESTADOS_USUARIO, 'Elija un estado válido.')],
    });
    if (!errores.correo && this.correoYaRegistrado(v.correo)) errores.correo = 'Ya existe un usuario con este correo.';
    if (hayErrores(errores)) return fallo(errores);
    const u = { id: `U${this.data.usuarios.length + 1}`, nombre: clean(v.nombre), correo: normEmail(v.correo), rol: v.rol, estado: v.estado, password: CLAVE_DEMO };
    this.data.usuarios.push(u);
    this.enviarCorreo({ para: u.correo, asunto: 'Invitación a AquaGest MiAMBIENTE', cuerpo: `Se le asignó el rol ${u.rol}. (Demo: la clave es la de demostración.)`, enlace: '#/acceso' });
    this.notificar();
    return exito(u);
  },

  cambiarRol(userId, rol) {
    const sinPermiso = this.exigir('gestionar_usuarios');
    if (sinPermiso) return sinPermiso;
    const u = this.usuarioPorId(userId);
    if (!u) return fallo({ _form: 'El usuario no existe.' });
    if (!ROLES.includes(rol)) return fallo({ rol: 'Elija un rol válido.' });
    if (rol !== 'Administrador' && this.esUltimoAdminActivo(u)) return fallo({ _form: 'No se puede degradar al último Administrador activo.' });
    u.rol = rol;
    this.notificar();
    return exito(u);
  },

  cambiarEstado(userId, estado) {
    const sinPermiso = this.exigir('gestionar_usuarios');
    if (sinPermiso) return sinPermiso;
    const u = this.usuarioPorId(userId);
    if (!u) return fallo({ _form: 'El usuario no existe.' });
    if (!ESTADOS_USUARIO.includes(estado)) return fallo({ estado: 'Elija un estado válido.' });
    if (estado === 'Inactivo' && u.id === this.data.sesion.userId) return fallo({ _form: 'No puede desactivar su propio usuario.' });
    if (estado === 'Inactivo' && this.esUltimoAdminActivo(u)) return fallo({ _form: 'No se puede desactivar al último Administrador activo.' });
    u.estado = estado;
    this.notificar();
    return exito(u);
  },
};
