// Servidor HTTP (módulo `node:http`, sin dependencias): sirve `docs/` y el API `/api/*` del contrato de plan.md.
// Límites (RF-97): cuerpo máximo 1,5 MB (413), solo JSON (400), rechaza `Origin` ajeno (403).
// Un rechazo de REGLA (permiso, validación) NO es error de transporte: llega con 200 y `{ok:false, ...}`.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Almacen, ACCIONES, argumentosValidos } from './almacen.js';
import { can } from '../docs/app/js/core/permissions.js';
import { NOMBRE_COOKIE, VIGENCIA_SESION_MS, datosCliente } from './auth.js';

export const MAX_CUERPO = 1.5 * 1024 * 1024;
const MAX_DRENAJE = 8 * 1024 * 1024;   // si alguien sigue mandando mucho más, se corta la conexión
const RAIZ_DOCS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'docs');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.map': 'application/json',
};

// Nada de esto sale jamás al navegador, ni por error (RF-88). Defensa extra: el almacén ya los quita.
const SECRETOS = new Set(['password', 'tokens', 'intentos', 'clave_cifrada']);
const sinSecretos = (clave, valor) => (SECRETOS.has(clave) ? undefined : valor);

function cabecerasBase(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function enviarJson(res, estado, cuerpo, extra = {}) {
  const texto = JSON.stringify(cuerpo, sinSecretos);
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(texto), 'Cache-Control': 'no-store', ...extra });
  res.end(texto);
}

const errorTransporte = (res, estado, mensaje, extra = {}) => enviarJson(res, estado, { ok: false, errores: { _form: mensaje }, ...extra });

const cookieDe = (req) => {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === NOMBRE_COOKIE) return parte.slice(i + 1).trim();
  }
  return null;
};
const ATRIBUTOS = 'HttpOnly; SameSite=Strict; Path=/';
const cookieNueva = (valor) => `${NOMBRE_COOKIE}=${valor}; ${ATRIBUTOS}; Max-Age=${VIGENCIA_SESION_MS / 1000}`;
const cookieBorrada = `${NOMBRE_COOKIE}=; ${ATRIBUTOS}; Max-Age=0`;

/** RF-97: una petición con `Origin` debe venir de la misma dirección que la sirvió. */
function origenPermitido(req) {
  const origen = req.headers.origin;
  if (origen === undefined) return true;   // peticiones del mismo sitio que el navegador no marca, y herramientas como curl
  try { return new URL(origen).host === req.headers.host; } catch { return false; }
}

/** Lee el cuerpo con tope. Si se pasa, sigue vaciando la conexión (para poder contestar 413) hasta un límite razonable. */
function leerCuerpo(req) {
  return new Promise((listo, fallo) => {
    let total = 0;
    let trozos = [];
    let excedido = false;
    req.on('data', (t) => {
      total += t.length;
      if (!excedido && total > MAX_CUERPO) { excedido = true; trozos = []; }
      if (!excedido) trozos.push(t);
      if (total > MAX_DRENAJE) { req.pause(); listo({ excedido: true, cortar: true }); }
    });
    req.on('end', () => listo(excedido ? { excedido: true } : { texto: Buffer.concat(trozos).toString('utf8') }));
    req.on('error', fallo);
  });
}

const DIRECCIONES_LOCALES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
/** La petición viene del mismo computador que corre el servidor (no de otra PC de la red). */
export const esPeticionLocal = (req) => DIRECCIONES_LOCALES.has(req.socket?.remoteAddress);

/** Los enlaces de recuperación sirven para tomar una cuenta: solo los ve quien está en el servidor o un Administrador con sesión. */
export function puedeVerBandeja(req, almacen, idSesion) {
  if (esPeticionLocal(req)) return true;
  return Boolean(idSesion) && can(almacen.store.usuarioPorId(idSesion), 'gestionar_usuarios');
}

async function api(req, res, ruta, almacen, demo) {
  const metodo = req.method;
  const cliente = datosCliente(req);
  const cookie = cookieDe(req);
  if (!origenPermitido(req)) return errorTransporte(res, 403, 'Origen no permitido.');

  const soloGet = () => { if (metodo !== 'GET') { errorTransporte(res, 405, 'Método no permitido.'); return false; } return true; };
  const soloPost = () => { if (metodo !== 'POST') { errorTransporte(res, 405, 'Método no permitido.'); return false; } return true; };

  if (ruta === '/api/salud') { if (soloGet()) enviarJson(res, 200, { ok: true, modo: 'servidor', demo }); return; }
  if (ruta === '/api/estado') { if (soloGet()) enviarJson(res, 200, almacen.estado(almacen.sesionDe(cookie, cliente))); return; }
  if (ruta === '/api/bandeja') {
    if (!demo) return errorTransporte(res, 404, 'No encontrado.');
    if (!puedeVerBandeja(req, almacen, almacen.sesionDe(cookie, cliente))) return errorTransporte(res, 403, 'La bandeja solo se ve desde el computador del servidor o con sesión de Administrador.');
    if (soloGet()) enviarJson(res, 200, almacen.bandeja());
    return;
  }
  if (ruta.startsWith('/api/token/')) {
    if (!soloGet()) return;
    let token = '';
    try { token = decodeURIComponent(ruta.slice('/api/token/'.length)); } catch { /* queda vacío y se rechaza abajo */ }
    if (!token || token.length > 200) return errorTransporte(res, 400, 'Enlace no válido.');
    return enviarJson(res, 200, { ok: true, estado: almacen.estadoToken(token) });
  }
  if (ruta !== '/api/login' && ruta !== '/api/logout' && ruta !== '/api/accion') return errorTransporte(res, 404, 'No encontrado.');
  if (!soloPost()) return;

  const cuerpo = await leerCuerpo(req);
  if (cuerpo.excedido) {
    res.setHeader('Connection', 'close');
    errorTransporte(res, 413, 'La petición es demasiado grande (máximo 1,5 MB).');
    if (cuerpo.cortar) res.on('finish', () => req.destroy());
    return;
  }
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] ?? ''))) return errorTransporte(res, 400, 'Solo se acepta JSON.');
  let datos;
  try { datos = cuerpo.texto.trim() === '' ? {} : JSON.parse(cuerpo.texto); } catch { return errorTransporte(res, 400, 'El cuerpo no es JSON válido.'); }
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) return errorTransporte(res, 400, 'El cuerpo debe ser un objeto JSON.');

  if (ruta === '/api/logout') {
    almacen.logout(cookie, cliente);
    return enviarJson(res, 200, { ok: true }, { 'Set-Cookie': cookieBorrada });
  }
  if (ruta === '/api/login') {
    if (typeof datos.correo !== 'string' || typeof datos.password !== 'string') return errorTransporte(res, 400, 'Faltan el correo o la contraseña.');
    const { resultado, sesionValor } = await almacen.login(datos.correo, datos.password, cliente, cookie);
    return enviarJson(res, 200, resultado, sesionValor ? { 'Set-Cookie': cookieNueva(sesionValor) } : {});
  }
  // /api/accion
  const { accion, args } = datos;
  if (typeof accion !== 'string' || !argumentosValidos(accion, args)) return errorTransporte(res, 400, 'Acción no válida.');
  const userId = almacen.sesionDe(cookie, cliente);
  if (!userId && !ACCIONES[accion].publica) return errorTransporte(res, 401, 'Debe iniciar sesión para hacer esto.', { sinSesion: true });
  const resultado = almacen.ejecutar(userId, accion, args);
  enviarJson(res, 200, { resultado, estado: almacen.estado(userId) });
}

/** Sirve `docs/` (la app queda en /app/). Nunca sale nada de fuera de esa carpeta. */
async function estatico(req, res, ruta, raiz) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  let decodificada;
  try { decodificada = decodeURIComponent(ruta); } catch { res.writeHead(400); return res.end('Dirección no válida.'); }
  if (decodificada.includes('\0') || decodificada.split(/[\\/]/).some((p) => p.startsWith('.') && p !== '')) { res.writeHead(404); return res.end('No encontrado.'); }
  let archivo = resolve(raiz, '.' + decodificada);
  if (archivo !== raiz && !archivo.startsWith(raiz + sep)) { res.writeHead(404); return res.end('No encontrado.'); }
  let info = await stat(archivo).catch(() => null);
  if (info?.isDirectory()) {
    if (!ruta.endsWith('/')) { res.writeHead(301, { Location: `${ruta}/` }); return res.end(); }
    archivo = resolve(archivo, 'index.html');
    info = await stat(archivo).catch(() => null);
  }
  if (!info?.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado.'); }
  res.writeHead(200, { 'Content-Type': MIME[extname(archivo).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') return res.end();
  createReadStream(archivo).on('error', () => res.destroy()).pipe(res);
}

/** Crea el servidor. `base` es una Base de db.js; `reloj` se puede cambiar en las pruebas. */
export function crearServidor({ base, demo = false, reloj = () => Date.now(), raizDocs = RAIZ_DOCS }) {
  const almacen = new Almacen({ base, demo, reloj });
  const servidor = http.createServer(async (req, res) => {
    cabecerasBase(res);
    try {
      const ruta = new URL(req.url, 'http://servidor').pathname;
      if (ruta === '/api' || ruta.startsWith('/api/')) await api(req, res, ruta, almacen, demo);
      else await estatico(req, res, ruta, raizDocs);
    } catch (err) {
      // RF-97: el navegador no recibe detalles; el detalle queda en la consola del servidor.
      console.error(`[servidor] Error interno en ${req.method} ${String(req.url).slice(0, 100)}:`, err);
      if (!res.headersSent) errorTransporte(res, 500, 'Error interno del servidor.'); else res.destroy();
    }
  });
  servidor.headersTimeout = 10000;
  servidor.requestTimeout = 30000;
  return { servidor, almacen };
}
