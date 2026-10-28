// Contraseñas, sesiones y registro de accesos (RF-87, 88, 90, 91). No contiene SQL: usa los métodos de db.js.
import { scrypt, scryptSync, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export const VIGENCIA_SESION_MS = 8 * 60 * 60 * 1000;   // RF-91: 8 horas
export const NOMBRE_COOKIE = 'aquagest_sesion';
const N = 16384;
const R = 8;
const P = 1;
const LARGO = 64;
const scryptAsync = promisify(scrypt);

export const sha256 = (texto) => createHash('sha256').update(String(texto)).digest('hex');

/** Cifra una contraseña con scrypt y una sal propia: `scrypt$N$r$p$sal$hash` (RF-88). */
export function cifrarClave(password) {
  const sal = randomBytes(16);
  const hash = scryptSync(password, sal, LARGO, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString('base64')}$${hash.toString('base64')}`;
}

/** Compara en tiempo constante. Es asíncrona para no frenar al servidor mientras scrypt trabaja. */
export async function verificarClave(password, cifrada) {
  const [tipo, n, r, p, sal, hash] = String(cifrada ?? '').split('$');
  if (tipo !== 'scrypt' || !hash) return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = await scryptAsync(password, Buffer.from(sal, 'base64'), esperado.length, { N: Number(n), r: Number(r), p: Number(p) });
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

let falsa = null;
/** Cuando el correo no existe se verifica contra una clave inventada, para que tarde lo mismo (no revela cuentas). */
export const claveFalsa = () => (falsa ??= cifrarClave(randomBytes(8).toString('hex')));

/** Crea la sesión y devuelve el valor de la cookie. En la base queda solo su hash. */
export function crearSesion(base, usuarioId, ahoraMs) {
  const valor = randomBytes(32).toString('base64url');
  base.crearSesion(sha256(valor), usuarioId, new Date(ahoraMs).toISOString(), ahoraMs + VIGENCIA_SESION_MS);
  return valor;
}

/**
 * Busca la sesión de una cookie. Devuelve `{estado:'ok', usuarioId}`, `{estado:'vencida', usuarioId, venceMs}` (la primera
 * vez que se nota; queda cerrada) o `{estado:'ninguna'}`.
 */
export function resolverSesion(base, valor, ahoraMs) {
  if (typeof valor !== 'string' || valor.length < 20 || valor.length > 100) return { estado: 'ninguna' };
  const hash = sha256(valor);
  const s = base.sesion(hash);
  if (!s || s.cerrada) return { estado: 'ninguna' };
  if (s.vence <= ahoraMs) {
    base.cerrarSesion(hash);
    return { estado: 'vencida', usuarioId: s.usuario_id, venceMs: s.vence };
  }
  return { estado: 'ok', usuarioId: s.usuario_id };
}

export function cerrarSesion(base, valor) {
  if (typeof valor === 'string' && valor) base.cerrarSesion(sha256(valor));
}

/** Datos del cliente para el registro: IP y navegador. Nunca la contraseña ni el correo escrito. */
export function datosCliente(req) {
  const ip = String(req.socket?.remoteAddress ?? '').replace(/^::ffff:/, '');
  const navegador = String(req.headers['user-agent'] ?? '').slice(0, 200);
  return { ip, navegador };
}

/**
 * Anota un acceso. RF-90: si anotar falla o tarda, la persona entra igual; el error va a la consola del servidor.
 * (SQLite es síncrono: «tarda» se detecta al terminar y se avisa en consola.)
 */
export function anotar(base, { evento, cuentaId = null, cliente, fechaMs }) {
  const ini = Date.now();
  try {
    base.anotarAcceso(new Date(fechaMs).toISOString(), evento, cuentaId, cliente?.ip ?? null, cliente?.navegador ?? null);
  } catch (err) {
    console.error(`[accesos] No se pudo anotar «${evento}»: ${err.message}`);
  }
  if (Date.now() - ini > 3000) console.error(`[accesos] Anotar «${evento}» tardó más de 3 s.`);
}
