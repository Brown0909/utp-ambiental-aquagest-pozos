// Selección de archivos: se leen los primeros bytes para que el store verifique el CONTENIDO (RF-38, RF-52).
import { html, raw } from './dom.js';
import { icono } from './icons.js';

export const tamanoTexto = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export async function leerArchivo(file) {
  const cabecera = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return { name: file.name, size: file.size, type: file.type, bytes: [...cabecera], url: URL.createObjectURL(file) };
}

export function zonaArchivo(nombre, etiqueta, { accept, ayuda, requerido = false, extra = '' }) {
  return html`<div class="campo" data-campo="${nombre}"><span class="campo-titulo">${etiqueta} ${requerido ? html`<span class="req" aria-hidden="true">*</span>` : ''}</span>
    <div class="zona-archivo" data-archivo="${nombre}">${icono('camara', 28)}
      <strong>Arrastre un archivo o selecciónelo desde su dispositivo</strong><span class="chico">${ayuda}</span>
      <input type="file" id="f-${nombre}" accept="${accept}" tabindex="-1" aria-describedby="err-${nombre}">
      <div class="fila" style="justify-content:center;margin-top:10px"><button type="button" class="btn btn-sec btn-chico" data-elegir>Seleccionar archivo</button>${raw(extra)}</div>
      <p class="archivo-info chico negrita" aria-live="polite"></p><img class="vista-foto" alt="Vista previa de la foto" hidden></div>
    <p class="error" id="err-${nombre}" role="alert"></p></div>`;
}

/** Conecta la zona: clic, teclado y arrastrar. Devuelve un control para leer o cambiar el archivo elegido. */
export function enlazarArchivo(raiz, nombre, { vista = false } = {}) {
  const zona = raiz.querySelector(`[data-archivo="${nombre}"]`);
  const input = zona.querySelector('input[type=file]');
  const info = zona.querySelector('.archivo-info');
  const img = zona.querySelector('.vista-foto');
  let actual = null;
  const poner = (obj) => {
    if (actual?.url && actual.url !== obj?.url) URL.revokeObjectURL(actual.url);
    actual = obj;
    info.textContent = obj ? `${obj.name} · ${tamanoTexto(obj.size)}` : '';
    if (vista && img) { if (obj && obj.type?.startsWith('image/')) { img.src = obj.url; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); } }
  };
  const tomar = async (file) => { poner(file ? await leerArchivo(file) : null); };
  zona.querySelector('[data-elegir]').addEventListener('click', () => input.click());
  input.addEventListener('change', () => tomar(input.files[0]));
  zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('arrastrando'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('arrastrando'));
  zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('arrastrando'); if (e.dataTransfer.files[0]) tomar(e.dataTransfer.files[0]); });
  return { obtener: () => actual, poner, limpiar: () => { input.value = ''; poner(null); } };
}
