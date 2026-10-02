// Avisos flotantes (se leen en voz alta por el lector de pantalla) — textContent: nunca HTML.
export function aviso(mensaje, tipo = 'ok') {
  const cont = document.getElementById('avisos');
  if (!cont) return;
  const el = document.createElement('div');
  el.className = `aviso-flotante af-${tipo}`;
  el.setAttribute('role', tipo === 'mal' ? 'alert' : 'status');
  el.textContent = mensaje;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 5500);
}
