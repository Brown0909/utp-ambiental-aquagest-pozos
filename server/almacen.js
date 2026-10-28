// El «almacén» del servidor: corre el MISMO núcleo de reglas que el navegador (docs/app/js/core, decisión D2) sobre los
// datos guardados en la base. Aquí se resuelve lo que el núcleo no sabe: quién es el usuario de CADA petición, cómo se
// guardan las claves (solo cifradas) y qué datos puede ver cada rol.
import { Store } from '../docs/app/js/core/store.js';
import { can } from '../docs/app/js/core/permissions.js';
import { normEmail } from '../docs/app/js/core/validators.js';
import { fallo } from '../docs/app/js/core/result.js';
import { MAX_BYTES_CSV } from '../docs/app/js/core/historico.js';
import { VERSION_ESQUEMA } from './db.js';
import { cifrarClave, verificarClave, claveFalsa, crearSesion, resolverSesion, cerrarSesion, anotar, sha256 } from './auth.js';

/**
 * Lista blanca de acciones que el navegador puede pedir (M-3…M-17 más «editarPunto», que comparte pantalla con M-10).
 * `tipos`: s = texto, o = objeto. `publica`: se puede pedir sin sesión (RF-87). Cualquier otra cosa se rechaza con 400.
 */
export const ACCIONES = {
  solicitarCuenta: { publica: true, tipos: 'o' },
  solicitarRecuperacion: { publica: true, tipos: 's' },
  restablecer: { publica: true, tipos: 'sss' },
  resolverSolicitud: { tipos: 'so' },
  invitarUsuario: { tipos: 'o' },
  cambiarRol: { tipos: 'ss' },
  cambiarEstado: { tipos: 'ss' },
  crearPunto: { tipos: 'o' },
  editarPunto: { tipos: 'so' },
  crearMuestra: { tipos: 'o' },
  registrarEnvio: { tipos: 'so' },
  confirmarRecepcion: { tipos: 'so' },
  guardarResultados: { tipos: 'so' },
  documentarConversion: { tipos: 'so' },
  confirmarRevision: { tipos: 'so' },
  importarHistorico: { tipos: 'ss' },
};

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** ¿Los argumentos tienen la forma que la acción espera? (Si no, el servidor responde 400 antes de tocar nada.) */
export function argumentosValidos(nombre, args) {
  const def = Object.hasOwn(ACCIONES, nombre) ? ACCIONES[nombre] : null;
  if (!def || !Array.isArray(args) || args.length !== def.tipos.length) return false;
  return [...def.tipos].every((t, i) => (t === 's' ? typeof args[i] === 'string' : esObjeto(args[i])));
}

/** Los archivos llegan como {name,size,type,bytes}. El servidor nunca acepta una `url` del navegador (sería un enlace a su propia memoria). */
function limpiarArchivo(a) {
  if (!esObjeto(a)) return a;
  const bytes = Array.isArray(a.bytes) ? a.bytes.slice(0, 16).map(Number) : [];
  return { name: String(a.name ?? '').slice(0, 200), size: Number.isFinite(Number(a.size)) ? Number(a.size) : 0, type: String(a.type ?? '').slice(0, 100), bytes, url: null, demo: a.demo === true };
}

const publico = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, estado: u.estado });
const MAX_INTENTOS_EN_MEMORIA = 5000;

export class Almacen {
  constructor({ base, demo = false, reloj = () => Date.now() }) {
    this.base = base;
    this.demo = demo;
    this.reloj = reloj;
    this.store = new Store({ ahora: () => new Date(this.reloj()) });
    this.claves = new Map();   // id de usuario -> clave cifrada (scrypt). Nunca sale del servidor.
    if (base.necesitaSiembra()) this.#sembrar(); else this.#recargar();
  }

  /** RF-85: solo la primera vez, con la base vacía, se guardan los datos de ejemplo (ficticios, RF-81). */
  #sembrar() {
    this.#normalizarSecretos();
    this.base.guardar(this.store.data, this.claves, { sembrada: new Date(this.reloj()).toISOString(), esquema: VERSION_ESQUEMA });
  }

  /** Vuelve a lo que hay en la base (al arrancar, o si una acción falló a la mitad). */
  #recargar() {
    const { data, claves } = this.base.cargar();
    this.claves = claves;
    this.store.data = { ...data, sesion: { userId: null }, intentos: this.store.data.intentos ?? {} };
  }

  /**
   * RF-88. El núcleo escribe `password` en claro (siembra, invitación, aprobación, restablecimiento) y guarda el enlace de
   * recuperación sin proteger. Aquí, después de CADA acción: se cifra la contraseña y se borra el texto claro, y el enlace
   * pasa a ser su hash (el hash mide 64 caracteres; el enlace en claro, 32).
   */
  #normalizarSecretos() {
    const d = this.store.data;
    for (const u of d.usuarios) {
      if (!Object.hasOwn(u, 'password')) continue;
      if (typeof u.password === 'string' && u.password) this.claves.set(u.id, cifrarClave(u.password));
      delete u.password;
    }
    for (const t of d.tokens) if (t.token.length !== 64) t.token = sha256(t.token);
    // Sin la demostración activa, la bandeja simulada no debe conservar enlaces de recuperación utilizables.
    if (!this.demo) for (const c of d.correos) if (String(c.enlace ?? '').startsWith('#/restablecer/')) c.enlace = null;
  }

  /** Corre `fn` con `userId` como usuario de la sesión del núcleo. Es síncrono: dos peticiones nunca se mezclan (M-18). */
  #como(userId, fn) {
    const sesion = this.store.data.sesion;
    sesion.userId = userId;
    try { return fn(); } finally { sesion.userId = null; }
  }

  /** Quién es el usuario de esta cookie (RF-87, 91). null si no hay sesión válida, venció o la cuenta está inactiva. */
  sesionDe(cookie, cliente) {
    const s = resolverSesion(this.base, cookie, this.reloj());
    if (s.estado === 'vencida') { anotar(this.base, { evento: 'sesion_vencida', cuentaId: s.usuarioId, cliente, fechaMs: s.venceMs }); return null; }
    if (s.estado !== 'ok') return null;
    const u = this.store.usuarioPorId(s.usuarioId);
    return u && u.estado === 'Activo' ? u.id : null;
  }

  /**
   * Entrada. Se verifica la clave cifrada con scrypt y el núcleo pone el resto: bloqueo de 5 intentos / 60 s, política y
   * mensajes. Para reutilizarlo sin guardar nada en claro, durante UN instante síncrono el usuario lleva la clave recién
   * escrita (si coincide) o una imposible (si no), y se borra de inmediato.
   */
  async login(correo, password, cliente, cookieAnterior = null) {
    const incorrecto = () => ({ resultado: fallo({ _form: 'Correo o contraseña incorrectos.' }) });
    if (correo.length > 254 || password.length > 256) return incorrecto();
    const clave = normEmail(correo);
    const previo = this.store.data.usuarios.find((x) => normEmail(x.correo) === clave);
    const coincide = await verificarClave(password, previo ? this.claves.get(previo.id) : claveFalsa());
    const store = this.store;
    const u = store.data.usuarios.find((x) => normEmail(x.correo) === clave);
    if (u) u.password = coincide && previo?.id === u.id ? password : `${password}\u0000`;
    let r;
    try { r = this.#como(null, () => store.login(correo, password)); } finally { if (u) delete u.password; }
    store.data.sesion.userId = null;
    const ahora = this.reloj();
    const nota = (evento) => anotar(this.base, { evento, cuentaId: u?.id ?? null, cliente, fechaMs: ahora });
    this.#podarIntentos();
    if (!r.ok) {
      if (r.inactivo) nota('cuenta_inactiva');
      else if (!r.bloqueado && !r.errores.correo && !r.errores.password) {
        nota('contrasena_incorrecta');
        if ((store.data.intentos[clave]?.hasta ?? 0) > ahora) nota('bloqueo');   // el intento que activó el bloqueo
      }
      return { resultado: r };
    }
    if (cookieAnterior) cerrarSesion(this.base, cookieAnterior);
    const valor = crearSesion(this.base, u.id, ahora);
    nota('entrada');
    return { resultado: { ok: true, datos: { usuario: publico(u) } }, sesionValor: valor, userId: u.id };
  }

  /** Los intentos fallidos viven en memoria; si alguien inventa miles de correos, se descartan los más viejos. */
  #podarIntentos() {
    const intentos = this.store.data.intentos;
    const claves = Object.keys(intentos);
    if (claves.length <= MAX_INTENTOS_EN_MEMORIA) return;
    for (const k of claves.slice(0, claves.length >> 1)) delete intentos[k];
  }

  logout(cookie, cliente) {
    const userId = this.sesionDe(cookie, cliente);
    if (userId) anotar(this.base, { evento: 'salida', cuentaId: userId, cliente, fechaMs: this.reloj() });
    cerrarSesion(this.base, cookie);
  }

  /** Corre una acción del núcleo (ya validada contra la lista blanca) y guarda lo que cambió. Devuelve el resultado. */
  ejecutar(userId, nombre, args) {
    let aplicar = [...args];
    let usuarioDelEnlace = null;
    if (nombre === 'restablecer') {
      // El enlace llega en claro; el núcleo lo compara con el hash que guardamos.
      const hash = sha256(args[0]);
      usuarioDelEnlace = this.store.data.tokens.find((t) => t.token === hash)?.userId ?? null;
      aplicar[0] = hash;
    } else if (nombre === 'importarHistorico' && Buffer.byteLength(args[1], 'utf8') > MAX_BYTES_CSV) {
      return fallo({ _form: 'El archivo supera 1 MB.' });   // RF-96: el mismo límite también aquí
    } else if (nombre === 'crearMuestra') aplicar = [{ ...args[0], foto: limpiarArchivo(args[0].foto) }];
    else if (nombre === 'guardarResultados') aplicar = [args[0], { ...args[1], certificado: limpiarArchivo(args[1].certificado) }];
    try {
      const r = this.#como(userId, () => this.store[nombre](...aplicar));
      this.#normalizarSecretos();
      this.base.guardar(this.store.data, this.claves);
      // Con la contraseña nueva, las sesiones abiertas de esa cuenta dejan de valer.
      if (nombre === 'restablecer' && r.ok && usuarioDelEnlace) this.base.cerrarSesionesDe(usuarioDelEnlace);
      return r;
    } catch (err) {
      this.#recargar();   // la memoria nunca queda distinta de lo guardado
      throw err;
    }
  }

  /** M-19: estado de un enlace de recuperación. El navegador manda el enlace en claro; aquí se compara su hash. */
  estadoToken(token) {
    return this.store.estadoToken(sha256(token));
  }

  /** RF-88 y RF-87: lo que cada persona recibe. Nunca contraseñas, enlaces con vida, tokens ni intentos. */
  estado(userId) {
    const d = this.store.data;
    const u = userId ? this.store.usuarioPorId(userId) : null;
    const usuario = u ? publico(u) : null;
    const admin = can(u, 'gestionar_usuarios');
    const datos = u
      ? { usuarios: d.usuarios.map(publico), puntos: d.puntos, muestras: d.muestras, solicitudes: admin ? d.solicitudes : [], correos: admin ? d.correos : [], historico: d.historico }
      : { usuarios: [], puntos: [], muestras: [], solicitudes: [], correos: [], historico: [] };
    const cuerpo = { ok: true, ahoraServidor: new Date(this.reloj()).toISOString(), usuario, datos };
    // Una huella de lo que se ve: el navegador solo redibuja cuando cambia (RF-92).
    cuerpo.version = sha256(JSON.stringify({ usuario, datos }));
    return cuerpo;
  }

  /** D7: bandeja simulada pública, solo con la demostración activa. */
  bandeja() {
    return { ok: true, correos: this.store.data.correos };
  }
}
