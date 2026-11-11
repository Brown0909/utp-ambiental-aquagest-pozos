// Archivos subidos (Spec 005): el certificado PDF y la foto de campo se guardan DE VERDAD en `data/archivos/`.
// Reglas que este archivo hace cumplir:
//  - RF-101: el tipo se decide por el CONTENIDO (sniffFileType del núcleo), nunca por la extensión ni lo que diga el navegador.
//  - RF-104: el nombre en disco es un id aleatorio de 32 hex que crea el servidor; jamás se arma una ruta con texto del usuario.
//  - RF-109: no se borra ni se reemplaza nada. Un archivo subido que no llega a usarse queda en disco sin referencia.
// El SQL vive solo en db.js; aquí solo se llama a sus métodos.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { sniffFileType, checkFile } from '../docs/app/js/core/validators.js';
import { MAX_FOTO } from '../docs/app/js/core/store-muestras.js';
import { MAX_CERTIFICADO } from '../docs/app/js/core/store-lab.js';

/** Qué se acepta por tipo de subida, su tope (los mismos del núcleo, no se duplican) y el permiso de la acción que lo usa (RF-103). */
export const TIPOS = {
  foto: { kinds: ['jpg', 'png'], max: MAX_FOTO, permiso: 'registrar_puntos_muestras' },
  certificado: { kinds: ['pdf'], max: MAX_CERTIFICADO, permiso: 'recepcion_resultados' },
};
export const MIME = { jpg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
export const MAX_NOMBRE = 200;
const FORMATO_ID = /^[0-9a-f]{32}$/;
const MENSAJE_INVALIDO = 'El archivo subido no es válido o ya se usó. Súbalo de nuevo.';

export const idValido = (id) => typeof id === 'string' && FORMATO_ID.test(id);

/** Nombre apto para la cabecera `Content-Disposition`: solo letras, números, punto, guion y guion bajo. */
export function nombreSeguro(nombre, extension) {
  const limpio = String(nombre ?? '').replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 100);
  return limpio || `archivo.${extension}`;
}

export class Archivos {
  constructor({ base, carpeta }) {
    this.base = base;
    this.carpeta = resolve(carpeta);
  }

  /** Ruta en disco de un id YA validado; comprueba además que no se salga de la carpeta. */
  #ruta(id) {
    if (!idValido(id)) throw new Error('id de archivo no válido');
    const ruta = join(this.carpeta, id);
    if (!ruta.startsWith(this.carpeta + sep)) throw new Error('ruta fuera de la carpeta de archivos');
    return ruta;
  }

  /**
   * Verifica y guarda. `buffer` es el cuerpo completo (el servidor ya cortó lo que pasaba del tope).
   * Devuelve {ok:true, archivo:{id,name,size,type}} o {ok:false, error}.
   */
  guardar({ tipo, nombre, buffer, subidoPor, fecha }) {
    const def = Object.hasOwn(TIPOS, tipo) ? TIPOS[tipo] : null;
    if (!def) return { ok: false, error: 'Tipo de archivo no válido.' };
    const limpio = String(nombre ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!limpio) return { ok: false, error: 'Falta el nombre del archivo.' };
    if (limpio.length > MAX_NOMBRE) return { ok: false, error: `El nombre del archivo supera ${MAX_NOMBRE} caracteres.` };
    // El mismo validador del núcleo: vacío, tope, tipo por contenido y extensión que coincida con el contenido.
    const cabecera = [...buffer.subarray(0, 16)];
    const error = checkFile({ name: limpio, size: buffer.length, bytes: cabecera }, { kinds: def.kinds, maxBytes: def.max });
    if (error) return { ok: false, error };
    const tipoReal = sniffFileType(cabecera);
    const id = randomBytes(16).toString('hex');
    mkdirSync(this.carpeta, { recursive: true });
    writeFileSync(this.#ruta(id), buffer, { flag: 'wx', mode: 0o600 });   // 'wx': nunca pisa un archivo que ya exista
    this.base.archivoNuevo({ id, tipo, tipoReal, tamano: buffer.length, nombre: limpio, subidoPor, fecha });
    return { ok: true, archivo: { id, name: limpio, size: buffer.length, type: MIME[tipoReal] } };
  }

  /** Para la descarga: {meta, datos} o null si el id no tiene el formato, no está en la base o falta en disco. */
  async leer(id) {
    if (!idValido(id)) return null;
    const meta = this.base.archivo(id);
    if (!meta) return null;
    try { return { meta, datos: await readFile(this.#ruta(id)) }; } catch { return null; }
  }

  /**
   * RF-105: convierte `{archivoId}` en el archivo que se le entrega al núcleo, con tipo, tamaño y primeros bytes tomados
   * del ARCHIVO GUARDADO. Debe existir, ser del tipo pedido, haberlo subido esta misma persona y no estar usado.
   * Todos los fallos dan el mismo mensaje (no se revela si un id ajeno existe).
   */
  resolver(id, tipo, usuarioId) {
    const meta = idValido(id) ? this.base.archivo(id) : null;
    if (!meta || meta.tipo !== tipo || meta.subido_por !== usuarioId || meta.usado !== 0) return { ok: false, error: MENSAJE_INVALIDO };
    let fd;
    try {
      fd = openSync(this.#ruta(id), 'r');
      const tamano = fstatSync(fd).size;
      const buf = Buffer.alloc(16);
      const leidos = readSync(fd, buf, 0, 16, 0);
      return { ok: true, id, archivo: { name: meta.nombre, size: tamano, type: MIME[meta.tipo_real] ?? '', bytes: [...buf.subarray(0, leidos)], url: `../api/archivo/${id}` } };
    } catch {
      return { ok: false, error: 'El archivo subido ya no está disponible. Súbalo de nuevo.' };
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }

  /** Marca el archivo como usado (la acción que lo referenciaba ya se guardó). */
  marcarUsado(id) { return this.base.archivoUsar(id); }
}
