// Genera un PDF de DEMOSTRACIÓN para quien no tiene un certificado a mano. No es un documento real ni firmado.
import { fmtDateTime } from '../core/dates.js';

export function certificadoDemo(m, puntoNombre) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('CERTIFICADO DE DEMOSTRACION (no es un documento real)', 14, 22);
  doc.setFontSize(11);
  const lineas = [
    `Folio de la muestra: ${m.folio}`,
    `Punto o pozo: ${m.puntoId} - ${puntoNombre}`,
    `Toma de la muestra: ${fmtDateTime(m.fechaHora)}`,
    '',
    'Este archivo lo genero la demostracion de AquaGest MiAMBIENTE',
    '(proyecto universitario UTP, Ingenieria Ambiental) para poder',
    'probar la carga de un certificado PDF. No tiene firma ni validez.',
  ];
  lineas.forEach((l, i) => doc.text(l, 14, 40 + i * 8));
  const buf = doc.output('arraybuffer');
  const bytes = new Uint8Array(buf);
  const blob = new Blob([buf], { type: 'application/pdf' });
  return { name: `certificado_${m.folio}.pdf`, size: bytes.length, type: 'application/pdf', bytes: [...bytes.slice(0, 16)], url: URL.createObjectURL(blob), demo: true };
}
