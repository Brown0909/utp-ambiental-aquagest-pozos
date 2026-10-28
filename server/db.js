// Base de datos SQLite (módulo `node:sqlite`, sin dependencias). TODO el SQL del servidor vive en este archivo.
// Reglas que este archivo hace cumplir:
//  - RF-94 / principio 4: nada se borra. Aquí solo hay INSERT y UPDATE (una prueba lee los archivos y lo vigila).
//  - RF-90: la tabla `accesos` es de solo agregar; sus disparadores rechazan cualquier cambio o borrado.
//  - Todas las consultas son preparadas: ningún texto del usuario se pega dentro del SQL.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { etapaDe } from '../docs/app/js/core/store-flujo.js';

export const VERSION_ESQUEMA = '1';

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS meta (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, correo TEXT NOT NULL UNIQUE, rol TEXT NOT NULL, estado TEXT NOT NULL, clave_cifrada TEXT, datos TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS puntos (id TEXT PRIMARY KEY, tipo TEXT NOT NULL, datos TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS muestras (folio TEXT PRIMARY KEY, punto_id TEXT NOT NULL, etapa TEXT NOT NULL, fecha_hora TEXT NOT NULL, datos TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS solicitudes (id TEXT PRIMARY KEY, estado TEXT NOT NULL, datos TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS correos (id TEXT PRIMARY KEY, datos TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS historico (id TEXT PRIMARY KEY, punto_id TEXT NOT NULL, periodo TEXT NOT NULL, datos TEXT NOT NULL, UNIQUE (punto_id, periodo));
CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, usuario_id TEXT NOT NULL, vence INTEGER NOT NULL, usado INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sesiones (hash TEXT PRIMARY KEY, usuario_id TEXT NOT NULL, creada TEXT NOT NULL, vence INTEGER NOT NULL, cerrada INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS accesos (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, evento TEXT NOT NULL, cuenta_id TEXT, ip TEXT, navegador TEXT);
CREATE TRIGGER IF NOT EXISTS accesos_sin_cambios BEFORE UPDATE ON accesos BEGIN SELECT RAISE(ABORT, 'accesos es de solo agregar: no se puede modificar'); END;
CREATE TRIGGER IF NOT EXISTS accesos_sin_borrado BEFORE DELETE ON accesos BEGIN SELECT RAISE(ABORT, 'accesos es de solo agregar: no se puede borrar'); END;
`;

const json = (v) => JSON.stringify(v);

/**
 * Cómo se convierte cada parte de los datos del almacén en filas. `cols` son las columnas (la primera es la clave);
 * `fila(obj, ctx)` devuelve los valores en ese orden. Lo que no se busca va en `datos` (JSON).
 */
const TABLAS = {
  usuarios: { cols: ['id', 'correo', 'rol', 'estado', 'clave_cifrada', 'datos'], fila: (u, c) => [u.id, u.correo, u.rol, u.estado, c.claves.get(u.id) ?? null, json(u)] },
  puntos: { cols: ['id', 'tipo', 'datos'], fila: (p) => [p.id, p.tipo, json(p)] },
  muestras: { cols: ['folio', 'punto_id', 'etapa', 'fecha_hora', 'datos'], fila: (m) => [m.folio, m.puntoId, etapaDe(m), m.fechaHora, json(m)] },
  solicitudes: { cols: ['id', 'estado', 'datos'], fila: (s) => [s.id, s.estado, json(s)] },
  correos: { cols: ['id', 'datos'], fila: (x) => [x.id, json(x)] },
  historico: { cols: ['id', 'punto_id', 'periodo', 'datos'], fila: (h) => [h.id, h.puntoId, h.periodo, json(h)] },
  // Del enlace de recuperación solo se guarda su hash (el valor en memoria ya es el hash).
  tokens: { cols: ['hash', 'usuario_id', 'vence', 'usado'], fila: (t) => [t.token, t.userId, t.expira, t.usado ? 1 : 0] },
};

/** Contadores de folios/ids que no se pueden deducir de las filas. */
const CONTADORES = ['solicitud', 'correo', 'historico'];

const upsert = (tabla, cols) => `INSERT INTO ${tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT(${cols[0]}) DO UPDATE SET ${cols.slice(1).map((c) => `${c} = excluded.${c}`).join(', ')}`;

export class Base {
  constructor(ruta = ':memory:') {
    if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
    this.ruta = ruta;
    this.db = new DatabaseSync(ruta);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec(ESQUEMA);
    this.firmas = new Map();   // «tabla|clave» -> JSON de la fila ya guardada (para escribir solo lo que cambió)
    this.sql = {};
    for (const [t, { cols }] of Object.entries(TABLAS)) this.sql[t] = this.db.prepare(upsert(t, cols));
    this.sql.meta = this.db.prepare(upsert('meta', ['clave', 'valor']));
    this.q = {
      meta: this.db.prepare('SELECT valor FROM meta WHERE clave = ?'),
      cuenta: this.db.prepare('SELECT COUNT(*) AS n FROM usuarios'),
      sesionNueva: this.db.prepare('INSERT INTO sesiones (hash, usuario_id, creada, vence, cerrada) VALUES (?, ?, ?, ?, 0)'),
      sesion: this.db.prepare('SELECT usuario_id, vence, cerrada FROM sesiones WHERE hash = ?'),
      sesionCerrar: this.db.prepare('UPDATE sesiones SET cerrada = 1 WHERE hash = ?'),
      sesionesCerrarDe: this.db.prepare('UPDATE sesiones SET cerrada = 1 WHERE usuario_id = ?'),
      acceso: this.db.prepare('INSERT INTO accesos (fecha, evento, cuenta_id, ip, navegador) VALUES (?, ?, ?, ?, ?)'),
    };
  }

  cerrar() { this.db.close(); }

  meta(clave) { return this.q.meta.get(clave)?.valor ?? null; }

  /** ¿Hay que sembrar los datos de ejemplo? Solo si nunca se sembró y no hay usuarios (RF-85). */
  necesitaSiembra() { return this.meta('sembrada') === null && this.q.cuenta.get().n === 0; }

  /** Lee todo lo guardado y lo devuelve con la forma de `store.data` (sin sesión, intentos ni contraseñas). */
  cargar() {
    const leer = (tabla, orden) => this.db.prepare(`SELECT * FROM ${tabla} ORDER BY ${orden}`).all();
    const claves = new Map();
    const usuarios = leer('usuarios', 'rowid').map((r) => {
      if (r.clave_cifrada) claves.set(r.id, r.clave_cifrada);
      // Las columnas mandan sobre el JSON: rol y estado deciden permisos.
      return { ...JSON.parse(r.datos), id: r.id, correo: r.correo, rol: r.rol, estado: r.estado };
    });
    const datos = (tabla, orden = 'rowid') => leer(tabla, orden).map((r) => JSON.parse(r.datos));
    const data = {
      usuarios, puntos: datos('puntos'), muestras: datos('muestras'), solicitudes: datos('solicitudes'),
      // La bandeja se muestra del más nuevo al más viejo (el núcleo usa unshift).
      correos: datos('correos', 'CAST(substr(id, 2) AS INTEGER) DESC'), historico: datos('historico'),
      tokens: leer('tokens', 'rowid').map((t) => ({ token: t.hash, userId: t.usuario_id, expira: t.vence, usado: t.usado === 1 })),
      contador: Object.fromEntries(CONTADORES.map((c) => [c, Number(this.meta(`contador_${c}`) ?? 0)])),
    };
    this.firmas = new Map();
    this.#filas(data, claves, () => {}, (t, k, firma) => this.firmas.set(`${t}|${k}`, firma));
    return { data, claves };
  }

  /** Recorre todas las filas que corresponden a `data`; llama a `cambiada` solo con las que difieren de lo guardado. */
  #filas(data, claves, cambiada, registrar) {
    const ctx = { claves };
    const ver = (tabla, k, valores) => {
      const firma = json(valores);
      if (this.firmas.get(`${tabla}|${k}`) !== firma) cambiada(tabla, k, valores, firma);
      registrar?.(tabla, k, firma);
    };
    for (const [tabla, def] of Object.entries(TABLAS)) {
      for (const obj of data[tabla] ?? []) { const v = def.fila(obj, ctx); ver(tabla, v[0], v); }
    }
    for (const c of CONTADORES) ver('meta', `contador_${c}`, [`contador_${c}`, String(data.contador?.[c] ?? 0)]);
  }

  /**
   * Guarda SOLO lo que cambió desde la última vez, todo en una transacción (o nada). RF-94: solo INSERT/UPDATE.
   * `extraMeta` permite marcar cosas como la siembra en la misma transacción.
   */
  guardar(data, claves, extraMeta = {}) {
    const pendientes = [];
    this.#filas(data, claves, (t, k, valores, firma) => pendientes.push([t, k, valores, firma]));
    for (const [clave, valor] of Object.entries(extraMeta)) pendientes.push(['meta', clave, [clave, String(valor)], null]);
    if (!pendientes.length) return 0;
    this.db.exec('BEGIN');
    try {
      for (const [t, , valores] of pendientes) this.sql[t].run(...valores);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    for (const [t, k, , firma] of pendientes) if (firma) this.firmas.set(`${t}|${k}`, firma);
    return pendientes.length;
  }

  // --- Sesiones y accesos (los usa auth.js) ---
  crearSesion(hash, usuarioId, creadaIso, venceMs) { this.q.sesionNueva.run(hash, usuarioId, creadaIso, venceMs); }
  sesion(hash) { return this.q.sesion.get(hash) ?? null; }
  cerrarSesion(hash) { this.q.sesionCerrar.run(hash); }
  cerrarSesionesDe(usuarioId) { this.q.sesionesCerrarDe.run(usuarioId); }
  anotarAcceso(fechaIso, evento, cuentaId, ip, navegador) { this.q.acceso.run(fechaIso, evento, cuentaId, ip, navegador); }
}
