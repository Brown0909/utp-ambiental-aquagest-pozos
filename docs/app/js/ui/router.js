// Rutas con «#/…» (GitHub Pages no reescribe rutas: una ruta sin «#» daría 404 al recargar).
// Las pantallas se cargan al usarse. El ORDEN importa: «nueva/nuevo» antes de «:folio/:id».
const TABLA = [
  ['acceso', () => import('../screens/acceso.js')],
  ['solicitud', () => import('../screens/solicitud.js')],
  ['recuperar', () => import('../screens/recuperar.js')],
  ['restablecer/:token', () => import('../screens/restablecer.js')],
  ['bandeja', () => import('../screens/bandeja.js')],
  ['panel', () => import('../screens/panel.js')],
  ['muestras/nueva', () => import('../screens/muestraNueva.js')],
  ['muestras/:folio/guardada', () => import('../screens/muestraGuardada.js')],
  ['muestras/:folio', () => import('../screens/muestraDetalle.js')],
  ['laboratorio', () => import('../screens/laboratorio.js')],
  ['evaluacion', () => import('../screens/evaluacion.js')],
  ['mapa', () => import('../screens/mapa.js')],
  ['historial', () => import('../screens/historial.js')],
  ['puntos', () => import('../screens/puntos.js')],
  ['puntos/nuevo', () => import('../screens/puntoForm.js')],
  ['puntos/:id/editar', () => import('../screens/puntoForm.js')],
  ['puntos/:id', () => import('../screens/puntoDetalle.js')],
  ['custodia', () => import('../screens/custodia.js')],
  ['usuarios', () => import('../screens/usuarios.js')],
];

const seguro = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

/** '#/puntos/PZ-018?x=1' -> { ruta: 'puntos/PZ-018', consulta: URLSearchParams } */
export function analizarHash(hash) {
  const sinMarca = String(hash ?? '').replace(/^#\/?/, '');
  const [ruta, q = ''] = sinMarca.split('?');
  return { ruta: ruta.replace(/\/+$/, ''), consulta: new URLSearchParams(q) };
}

export function resolver(ruta) {
  const segs = ruta.split('/');
  for (const [patron, cargar] of TABLA) {
    const p = patron.split('/');
    if (p.length !== segs.length) continue;
    const params = {};
    let coincide = true;
    p.forEach((s, i) => { if (s.startsWith(':')) params[s.slice(1)] = seguro(segs[i]); else if (s !== segs[i]) coincide = false; });
    if (coincide) return { cargar, params };
  }
  return null;
}
