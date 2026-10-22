// Avisos flotantes (se leen en voz alta por el lector de pantalla) — textContent: nunca HTML.
export function aviso(mensaje, tipo = 'ok') {
  const cont = document.getElementById('avisos');
  if (!cont) return;
  const el = document.createElement('div');
  el.className = `aviso-flotante af-${tipo}`;
  el.setAttribute('role', tipo === 'mal' ? 'alert' : 'status');
  el.textContent = mensaje;
  el.title = 'Clic para cerrar';
  el.addEventListener('click', () => el.remove());
  cont.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'mal' ? 8000 : 3500);   // los errores se leen con más calma
}
