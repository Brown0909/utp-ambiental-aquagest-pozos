// Ayudas para las pruebas del servidor (Spec 004): arranca el servidor REAL en el puerto 0 con una base en memoria
// (o en un archivo temporal) y da clientes HTTP con su propia «cookie jar», como dos navegadores distintos.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Base } from '../server/db.js';
import { crearServidor } from '../server/http.js';
import { CORREOS, CLAVE_DEMO } from './helpers.js';

export { CORREOS, CLAVE_DEMO };

/** Reloj controlable: `reloj()` es lo que el servidor cree que es «ahora»; `reloj.avanzar(min)` lo adelanta. */
export function crearReloj() {
  let t = Date.now();
  const reloj = () => t;
  reloj.avanzar = (minutos) => { t += minutos * 60000; };
  return reloj;
}

const abiertos = new Set();

export async function arrancar({ ruta = ':memory:', demo = true, reloj = crearReloj() } = {}) {
  const base = new Base(ruta);
  const { servidor, almacen } = crearServidor({ base, demo, reloj });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${servidor.address().port}`;
  let cerrado = false;
  const cerrar = async () => {
    if (cerrado) return;
    cerrado = true;
    abiertos.delete(cerrar);
    servidor.closeAllConnections?.();
    await new Promise((ok) => servidor.close(ok));
    base.cerrar();
  };
  abiertos.add(cerrar);
  return { url, base, almacen, servidor, reloj, cerrar, cliente: (opciones) => crearCliente(url, opciones) };
}

/** Carpeta temporal para la base en archivo; `limpiar()` cierra lo que haya quedado abierto y borra lo que las PRUEBAS crearon allí. */
export function carpetaTemporal() {
  const dir = mkdtempSync(join(tmpdir(), 'aquagest-prueba-'));
  return { ruta: join(dir, 'aquagest.db'), limpiar: async () => { for (const cerrar of [...abiertos]) await cerrar(); rmSync(dir, { recursive: true, force: true }); } };
}

/** Un «navegador»: guarda la cookie de sesión que el servidor le da y la manda de vuelta. */
export function crearCliente(url, { navegador = 'PruebaNavegador/1.0', origen } = {}) {
  const galleta = new Map();
  const encabezados = (extra = {}) => ({
    'User-Agent': navegador,
    ...(galleta.size ? { Cookie: [...galleta].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
    ...(origen ? { Origin: origen } : {}),
    ...extra,
  });
  const guardar = (res) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [par] = c.split(';');
      const i = par.indexOf('=');
      const nombre = par.slice(0, i);
      const valor = par.slice(i + 1);
      if (!valor || /Max-Age=0/i.test(c)) galleta.delete(nombre); else galleta.set(nombre, valor);
    }
  };
  const llamar = async (metodo, ruta, cuerpo, extra = {}) => {
    const res = await fetch(url + ruta, {
      method: metodo,
      headers: encabezados(cuerpo === undefined ? extra : { 'Content-Type': 'application/json', ...extra }),
      ...(cuerpo === undefined ? {} : { body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) }),
    });
    guardar(res);
    const texto = await res.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* no era JSON */ }
    return { status: res.status, json, texto, headers: res.headers };
  };
  const c = {
    url,
    galleta,
    get: (ruta, extra) => llamar('GET', ruta, undefined, extra),
    post: (ruta, cuerpo, extra) => llamar('POST', ruta, cuerpo, extra),
    login: (correo, password = CLAVE_DEMO) => c.post('/api/login', { correo, password }),
    entrar: async (rol) => { const r = await c.login(CORREOS[rol]); if (!r.json?.ok) throw new Error(`no pudo entrar como ${rol}: ${r.texto}`); return r; },
    /** Pide una acción y devuelve solo el `resultado` del servidor. */
    accion: async (accion, ...args) => { const r = await c.post('/api/accion', { accion, args }); return r.json?.resultado ?? r; },
    estado: async () => (await c.get('/api/estado')).json,
    salir: () => c.post('/api/logout', {}),
  };
  return c;
}

export const fechaLocal = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return { fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}` };
};

/** Todo lo que hay en la base, como texto (para comprobar que no quedó ninguna contraseña ni correo tecleado). */
export function volcarBase(base) {
  const tablas = ['meta', 'usuarios', 'puntos', 'muestras', 'solicitudes', 'correos', 'historico', 'tokens', 'sesiones', 'accesos'];
  return Object.fromEntries(tablas.map((t) => [t, base.db.prepare(`SELECT * FROM ${t}`).all()]));
}
