// Estado en memoria + todas las acciones. NO toca el DOM (se prueba con `node --test`).
// Cada acción de escritura: 1) comprueba el permiso, 2) valida, 3) cambia datos, 4) avisa a la pantalla.
// Nada se guarda entre visitas (RF-72): al recargar la página todo vuelve a los datos de ejemplo.
import { construirSeed } from './seed.js';
import { can } from './permissions.js';
import { toIso } from './dates.js';
import { fallo, exito, hayErrores } from './result.js';
import acceso from './store-acceso.js';
import usuarios from './store-usuarios.js';
import puntos from './store-puntos.js';
import muestras from './store-muestras.js';
import flujo from './store-flujo.js';
import lab from './store-lab.js';
import revision from './store-revision.js';
import selectores from './store-selectores.js';
import alertas from './store-alertas.js';

export { fallo, exito, hayErrores };

export class Store {
  constructor({ ahora = () => new Date() } = {}) {
    this.ahora = ahora;
    this.listeners = new Set();
    this.reiniciar();
  }

  reiniciar() {
    this.data = { ...construirSeed(this.ahora()), sesion: { userId: null }, intentos: {}, tokens: [], contador: { solicitud: 0, correo: 0 } };
    this.notificar();
  }

  suscribir(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notificar() {
    for (const fn of this.listeners) fn();
  }

  get usuario() {
    return this.data.usuarios.find((u) => u.id === this.data.sesion.userId) ?? null;
  }

  ahoraIso() {
    return toIso(this.ahora());
  }

  usuarioPorId(id) {
    return this.data.usuarios.find((u) => u.id === id) ?? null;
  }

  nombreDe(id) {
    return this.usuarioPorId(id)?.nombre ?? '—';
  }

  /** Doble candado (RF-16): devuelve un fallo si el usuario de la sesión no puede; null si puede. */
  exigir(accion) {
    return can(this.usuario, accion) ? null : fallo({ _form: 'No tiene permiso para realizar esta acción.' }, { sinPermiso: true });
  }

  /** Deja un correo en la bandeja simulada (no se envía nada real). */
  enviarCorreo({ para, asunto, cuerpo, enlace = null }) {
    this.data.contador.correo += 1;
    this.data.correos.unshift({ id: `C${this.data.contador.correo}`, para, asunto, cuerpo, enlace, fecha: this.ahoraIso() });
  }
}

Object.assign(Store.prototype, acceso, usuarios, puntos, muestras, flujo, lab, revision, selectores, alertas);
