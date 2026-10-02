// Descarga de PDF y Excel (RF-62), 100 % en el navegador con las librerías de /vendor. Exporta SOLO las muestras filtradas.
import { filasMuestras, filasResultados, filasCustodia, textoFiltros, nombreArchivo, lineasPdfMuestra, aTextoPdf } from '../core/exports.js';
import { fmtDateTime, toIso } from '../core/dates.js';

function hoja(XLSX, wb, nombre, filas, vacio) {
  const ws = filas.length ? XLSX.utils.json_to_sheet(filas) : XLSX.utils.aoa_to_sheet([[vacio]]);
  if (filas.length) {
    ws['!cols'] = Object.keys(filas[0]).map((k) => ({ wch: Math.min(48, Math.max(k.length + 2, ...filas.map((f) => String(f[k] ?? '').length + 2))) }));
  }
  XLSX.utils.book_append_sheet(wb, ws, nombre);
}

export function exportarExcel(store, muestras, filtros) {
  const XLSX = window.XLSX;
  const wb = XLSX.utils.book_new();
  const meta = [
    ['AquaGest MiAMBIENTE — Historial y reportes'], ['Generado', fmtDateTime(toIso(store.ahora()))], ['Usuario', `${store.usuario.nombre} (${store.usuario.rol})`],
    ['Filtros', textoFiltros(store, filtros)], ['Muestras exportadas', muestras.length],
    ['Nota', 'Datos ficticios de una demostración. Cumple / No cumple solo aparece tras la revisión técnica confirmada.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Resumen');
  hoja(XLSX, wb, 'Muestras', filasMuestras(store, muestras), 'No hay muestras con estos filtros.');
  hoja(XLSX, wb, 'Resultados', filasResultados(store, muestras), 'Sin resultados de laboratorio en estas muestras.');
  hoja(XLSX, wb, 'Cadena de custodia', filasCustodia(store, muestras), 'Sin envíos registrados en estas muestras.');
  XLSX.writeFile(wb, nombreArchivo('AquaGest_Historial', store.ahora(), 'xlsx'));
}

export function exportarPdf(store, muestras, filtros) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 14;
  const ancho = 210 - 2 * M;
  let y = M;
  const asegurar = (alto) => { if (y + alto > 284) { doc.addPage(); y = M; } };
  const escribir = (texto, { tam = 9, negrita = false, sangria = 0, alto = 4.3 } = {}) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
    doc.setFontSize(tam);
    for (const linea of doc.splitTextToSize(aTextoPdf(texto), ancho - sangria)) { asegurar(alto); doc.text(linea, M + sangria, y); y += alto; }
  };
  escribir('AquaGest MiAMBIENTE - Historial y reportes', { tam: 15, negrita: true, alto: 7 });
  escribir(`Generado: ${fmtDateTime(toIso(store.ahora()))} por ${store.usuario.nombre} (${store.usuario.rol})`);
  escribir(`Filtros: ${textoFiltros(store, filtros)}`);
  escribir(`${muestras.length} muestra${muestras.length === 1 ? '' : 's'} · Demostración con datos ficticios. Cumple / No cumple solo tras la revisión técnica confirmada.`);
  y += 3;
  if (muestras.length === 0) escribir('No hay muestras con estos filtros.', { tam: 11 });
  for (const m of muestras) {
    const { titulo, lineas } = lineasPdfMuestra(store, m);
    asegurar(16);
    doc.setDrawColor(200, 210, 222); doc.line(M, y, M + ancho, y); y += 5;
    escribir(titulo, { tam: 11, negrita: true, alto: 5.5 });
    lineas.forEach((l) => escribir(l, { sangria: l.startsWith('  ') ? 4 : 0 }));
    y += 2;
  }
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(`Página ${i} de ${paginas}`, 210 - M, 291, { align: 'right' }); }
  doc.save(nombreArchivo('AquaGest_Historial', store.ahora(), 'pdf'));
}
