// Código QR del folio (RF-27). El SVG lo genera la librería a partir de celdas; no incluye texto del usuario.
import { raw } from './dom.js';

export function qrDeFolio(folio) {
  const direccion = `${location.origin}${location.pathname}#/muestras/${folio}`;
  const q = window.qrcode(0, 'M');
  q.addData(direccion);
  q.make();
  return { direccion, svg: raw(q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })) };
}
