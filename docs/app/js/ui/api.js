// El navegador habla con el servidor (Spec 004). Decide el modo al arrancar:
//  - Servidor (npm start): `AlmacenRemoto` guarda una COPIA DE LECTURA de los datos y manda las escrituras al servidor.
//  - Demostración (GitHub Pages, sin /api): el `Store` en memoria de siempre (RF-72). Sin avisos de error.
// No toca el DOM: se prueba con `node --test` (recibe `fetchFn` y `avisar` desde afuera).
import { Store } from '../core/store.js';
import { fallo } from '../core/result.js';

export const INTERVALO_MS = 5000;           // RF-92: refresco cada 5 segundos
const ESPERA_ESCRITURA_MS = 15000;
const ESPERA_SALUD_MS = 3000;

/** Las 16 escrituras que viajan al servidor (la lista blanca del servidor es la misma; allí se vuelve a comprobar). */
export const ACCIONES_REMOTAS = [
  'solicitarCuenta', 'solicitarRecuperacion', 'restablecer', 'resolverSolicitud', 'invitarUsuario', 'cambiarRol', 'cambiarEstado',
  'crearPunto', 'editarPunto', 'crearMuestra', 'registrarEnvio', 'confirmarRecepcion', 'guardarResultados', 'documentarConversion',
  'confirmarRevision', 'importarHistorico',
];

const datosVacios = () => ({
  usuarios: [], puntos: [], muestras: [], solicitudes: [], correos: [], historico: [],
  sesion: { userId: null }, intentos: {}, tokens: [], contador: { solicitud: 0, correo: 0, historico: 0 },
});

const MENSAJE_SIN_CONEXION = 'No hay conexión con el servidor. Lo que escribió sigue aquí: intente de nuevo en unos segundos.';
const senal = (ms) => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

/** Una `url` de archivo es un enlace temporal de ESTE navegador: no sirve en el servidor ni en otra computadora. */
const sinUrl = (a) => (a && typeof a === 'object' ? { ...a, url: null } : a);

export class AlmacenRemoto extends Store {
  constructor({ base, fetchFn = (...a) => globalThis.fetch(...a), avisar = () => {}, alActualizar = () => {} }) {
    super();
    this.base = base;
    this.fetchFn = fetchFn;
    this.avisar = avisar;
    this.alActualizar = alActualizar;
    this.desfase = 0;                       // servidor − este navegador, en ms (decisión D8)
    this.ahora = () => new Date(Date.now() + this.desfase);
    this.version = null;
    this.secuencia = 0;                     // cada petición que trae datos toma un número; una respuesta vieja no pisa a una nueva
    this.aplicada = 0;
    this.enVuelo = new Map();               // la misma acción pedida dos veces a la vez (doble clic) viaja una sola vez
    this.sinConexion = false;
    this.temporizador = null;
    this.ocupado = false;
  }

  /** Antes de recibir algo del servidor no hay datos (el servidor es el dueño de los registros). */
  reiniciar() {
    this.data = datosVacios();
  }

  async _pedir(ruta, { metodo = 'GET', cuerpo, espera = ESPERA_ESCRITURA_MS } = {}) {
    const r = await this.fetchFn(new URL(ruta, this.base), {
      method: metodo, credentials: 'same-origin', cache: 'no-store', signal: senal(espera),
      ...(cuerpo === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
    });
    let json = null;
    try { json = await r.json(); } catch { /* el servidor siempre contesta JSON; si no, queda null */ }
    this._recuperado();
    return { status: r.status, json };
  }

  _caido() {
    if (this.sinConexion) return;
    this.sinConexion = true;
    this.avisar('El servidor no responde. Lo que escriba en los formularios no se pierde; se reintentará solo.', 'mal');
  }

  _recuperado() {
    if (!this.sinConexion) return;
    this.sinConexion = false;
    this.avisar('Conexión con el servidor recuperada.');
  }

  /** Pone en la copia local lo que mandó el servidor. Devuelve true si algo cambió respecto a lo anterior. */
  aplicar(estado, numero = ++this.secuencia) {
    if (numero < this.aplicada) return false;
    this.aplicada = numero;
    const reloj = Date.parse(estado.ahoraServidor);
    if (Number.isFinite(reloj)) this.desfase = reloj - Date.now();
    this.data = { ...datosVacios(), ...estado.datos, sesion: { userId: estado.usuario?.id ?? null } };
    const cambio = estado.version !== this.version;
    this.version = estado.version;
    return cambio;
  }

  /** Pide el estado al servidor. Devuelve {ok, cambio}. Sin respuesta, conserva lo que había (RF-95). */
  async refrescar() {
    const numero = ++this.secuencia;
    try {
      const { json } = await this._pedir('estado', { espera: 8000 });
      if (!json?.ok) throw new Error('respuesta inesperada');
      return { ok: true, cambio: this.aplicar(json, numero) };
    } catch {
      return { ok: false, cambio: false };
    }
  }

  /** RF-92: cada 5 s pregunta si algo cambió; si cambió, avisa a la pantalla (main.js decide si es seguro redibujar). */
  iniciarSondeo() {
    if (this.temporizador) return;
    this.temporizador = setInterval(async () => {
      if (this.ocupado || globalThis.document?.visibilityState === 'hidden') return;
      this.ocupado = true;
      try {
        const tenia = !!this.data.sesion.userId;
        const r = await this.refrescar();
        if (!r.ok) this._caido();
        else if (r.cambio) this.alActualizar({ sesionPerdida: tenia && !this.data.sesion.userId });
      } finally { this.ocupado = false; }
    }, INTERVALO_MS);
    this.temporizador.unref?.();
  }

  detenerSondeo() {
    clearInterval(this.temporizador);
    this.temporizador = null;
  }

  _sinConexion() {
    return fallo({ _form: MENSAJE_SIN_CONEXION }, { sinConexion: true });
  }

  /** Manda una escritura al servidor y devuelve lo mismo que devolvería el Store local: {ok, datos} o {ok:false, errores}. */
  _accion(nombre, args) {
    const clave = nombre + JSON.stringify(args);
    if (!this.enVuelo.has(clave)) this.enVuelo.set(clave, this._accionReal(nombre, args).finally(() => this.enVuelo.delete(clave)));
    return this.enVuelo.get(clave);
  }

  async _accionReal(nombre, args) {
    const numero = ++this.secuencia;
    let r;
    try { r = await this._pedir('accion', { metodo: 'POST', cuerpo: { accion: nombre, args } }); } catch { return this._sinConexion(); }
    if (r.status === 401) {
      await this.refrescar();
      this.alActualizar({ sesionPerdida: true });
      return fallo({ _form: 'Su sesión terminó. Entre de nuevo.' }, { sinSesion: true });
    }
    if (!r.json?.resultado) return fallo({ _form: r.json?.errores?._form ?? 'El servidor no pudo completar la acción. Intente de nuevo.' }, { errorServidor: true });
    this.aplicar(r.json.estado, numero);
    return r.json.resultado;
  }

  async login(correo, password) {
    let r;
    try { r = await this._pedir('login', { metodo: 'POST', cuerpo: { correo, password } }); } catch { return this._sinConexion(); }
    if (!r.json) return fallo({ _form: 'El servidor no pudo completar la acción. Intente de nuevo.' }, { errorServidor: true });
    if (!r.json.ok) return r.json;
    const e = await this.refrescar();
    if (!e.ok) return this._sinConexion();
    return r.json;
  }

  async logout() {
    try { await this._pedir('logout', { metodo: 'POST', cuerpo: {} }); } catch { return this._sinConexion(); }
    await this.refrescar();
    return { ok: true };
  }

  /** M-19: la pantalla de restablecer espera al servidor antes de dibujarse. */
  async estadoToken(token) {
    try {
      const r = await this._pedir(`token/${encodeURIComponent(token)}`);
      return r.json?.estado ?? 'invalido';
    } catch { return 'sinconexion'; }
  }

  /** M-20: la bandeja simulada es del servidor (solo existe con la demostración activa). */
  async cargarBandeja() {
    try {
      const r = await this._pedir('bandeja');
      return Array.isArray(r.json?.correos) ? r.json.correos : [];
    } catch { return []; }
  }
}

// Las 16 escrituras: se arman una sola vez, todas iguales (las dos que llevan archivos les quitan su `url` local).
for (const nombre of ACCIONES_REMOTAS) {
  AlmacenRemoto.prototype[nombre] = function remota(...args) { return this._accion(nombre, args); };
}
AlmacenRemoto.prototype.crearMuestra = function crearMuestra(v) { return this._accion('crearMuestra', [{ ...v, foto: sinUrl(v?.foto) }]); };
AlmacenRemoto.prototype.guardarResultados = function guardarResultados(folio, v) { return this._accion('guardarResultados', [folio, { ...v, certificado: sinUrl(v?.certificado) }]); };

/** La API vive en `../api/` respecto a la página (en GitHub Pages esa ruta da 404 y se entra en modo demostración). */
function baseDelApi() {
  const l = globalThis.location;
  if (!l || !/^https?:$/.test(l.protocol)) return null;
  return new URL('../api/', l.href).href;
}

/**
 * Decide el modo. Devuelve el `Store` local (demostración) o un `AlmacenRemoto` con la sesión ya recuperada
 * (M-21: así la primera pantalla ya sabe quién es el usuario).
 */
export async function crearAlmacen({ base = baseDelApi(), fetchFn = (...a) => globalThis.fetch(...a), avisar, alActualizar } = {}) {
  if (!base) return new Store();
  try {
    const r = await fetchFn(new URL('salud', base), { credentials: 'same-origin', cache: 'no-store', signal: senal(ESPERA_SALUD_MS) });
    const j = r.ok ? await r.json() : null;
    if (!j || j.ok !== true || j.modo !== 'servidor') return new Store();
  } catch { return new Store(); }
  const almacen = new AlmacenRemoto({ base, fetchFn, avisar, alActualizar });
  await almacen.refrescar();
  almacen.iniciarSondeo();
  return almacen;
}
