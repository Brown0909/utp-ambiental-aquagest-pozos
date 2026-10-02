// Acceso, recuperación de contraseña, solicitudes de cuenta y gestión de usuarios (RF-1 a RF-13, RF-67 a RF-70).
import { fallo, exito, hayErrores } from './result.js';
import { validate, required, institutionalEmail, passwordPolicy, normEmail } from './validators.js';

export const MENSAJE_RECUPERACION = 'Si el correo corresponde a un usuario activo, recibirá un enlace de recuperación. El enlace dura 30 minutos.';
export const MAX_INTENTOS = 5;
export const BLOQUEO_SEGUNDOS = 60;
export const VIGENCIA_ENLACE_MIN = 30;

const token = () => globalThis.crypto.randomUUID().replace(/-/g, '');

export default {
  login(correo, password) {
    const errores = validate({ correo, password }, { correo: [required, institutionalEmail], password: [required] });
    if (hayErrores(errores)) return fallo(errores);
    const clave = normEmail(correo);
    const ahora = this.ahora().getTime();
    const intento = this.data.intentos[clave] ?? { fallos: 0, hasta: 0 };
    if (intento.hasta > ahora) {
      const segundos = Math.ceil((intento.hasta - ahora) / 1000);
      return fallo({ _form: `Demasiados intentos fallidos. Espere ${segundos} segundos.` }, { bloqueado: true, segundos });
    }
    const u = this.data.usuarios.find((x) => normEmail(x.correo) === clave);
    if (!u || u.password !== password) {
      intento.fallos += 1;
      if (intento.fallos >= MAX_INTENTOS) { intento.hasta = ahora + BLOQUEO_SEGUNDOS * 1000; intento.fallos = 0; }
      this.data.intentos[clave] = intento;
      return fallo({ _form: 'Correo o contraseña incorrectos.' });
    }
    if (u.estado !== 'Activo') return fallo({ _form: 'Su usuario está inactivo. Comuníquese con el administrador.' }, { inactivo: true });
    this.data.intentos[clave] = { fallos: 0, hasta: 0 };
    this.data.sesion.userId = u.id;
    this.notificar();
    return exito({ usuario: u });
  },

  logout() {
    this.data.sesion.userId = null;
    this.notificar();
  },

  /** Responde SIEMPRE lo mismo si el formato es válido (RF-5): no revela si el correo existe. */
  solicitarRecuperacion(correo) {
    const errores = validate({ correo }, { correo: [required, institutionalEmail] });
    if (hayErrores(errores)) return fallo(errores);
    const u = this.data.usuarios.find((x) => normEmail(x.correo) === normEmail(correo));
    if (u && u.estado === 'Activo') {
      const t = token();
      const expira = this.ahora().getTime() + VIGENCIA_ENLACE_MIN * 60000;
      this.data.tokens.push({ token: t, userId: u.id, expira, usado: false });
      this.enviarCorreo({ para: u.correo, asunto: 'Restablecer su contraseña de AquaGest', cuerpo: `Use el enlace para elegir una nueva contraseña. Vence en ${VIGENCIA_ENLACE_MIN} minutos y solo sirve una vez.`, enlace: `#/restablecer/${t}` });
      this.notificar();
    }
    return exito({ mensaje: MENSAJE_RECUPERACION });
  },

  estadoToken(t) {
    const x = this.data.tokens.find((k) => k.token === t);
    if (!x) return 'invalido';
    if (x.usado) return 'usado';
    return this.ahora().getTime() > x.expira ? 'vencido' : 'valido';
  },

  /** RF-7 (🔴 una sola vez, 30 min) y RF-8 (política de contraseña). */
  restablecer(t, nueva, confirmacion) {
    const estado = this.estadoToken(t);
    if (estado !== 'valido') {
      const msg = { invalido: 'El enlace no es válido.', usado: 'Este enlace ya fue usado.', vencido: `El enlace venció (dura ${VIGENCIA_ENLACE_MIN} minutos). Solicite otro.` }[estado];
      return fallo({ _form: msg }, { estado });
    }
    const errores = validate({ nueva, confirmacion }, {
      nueva: [required, passwordPolicy],
      confirmacion: [required, (v, all) => (v !== all.nueva ? 'Las contraseñas no coinciden.' : null)],
    });
    if (hayErrores(errores)) return fallo(errores);
    const k = this.data.tokens.find((x) => x.token === t);
    this.usuarioPorId(k.userId).password = nueva;
    k.usado = true;
    this.notificar();
    return exito();
  },
};
