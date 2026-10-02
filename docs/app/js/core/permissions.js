// Matriz de permisos de la lámina 19 de Figma: ÚNICA fuente de verdad. La pantalla la usa para ocultar
// y el store la vuelve a comprobar en cada acción (principio 11: doble candado).
export const ROLES = ['Técnico', 'Laboratorio', 'Administrador'];
export const ESTADOS_USUARIO = ['Activo', 'Inactivo'];

export const ACCIONES = {
  consultar: 'Consultar puntos, muestras y reportes',
  registrar_puntos_muestras: 'Registrar puntos, pozos y muestras',
  registrar_envio: 'Registrar envío de muestras',
  recepcion_resultados: 'Confirmar recepción y cargar resultados',
  confirmar_revision: 'Confirmar revisión técnica',
  gestionar_usuarios: 'Invitar usuarios y asignar roles',
};

export const MATRIZ = {
  consultar: { 'Técnico': true, 'Laboratorio': true, 'Administrador': true },
  registrar_puntos_muestras: { 'Técnico': true, 'Laboratorio': false, 'Administrador': true },
  registrar_envio: { 'Técnico': true, 'Laboratorio': false, 'Administrador': true },
  recepcion_resultados: { 'Técnico': false, 'Laboratorio': true, 'Administrador': true },
  confirmar_revision: { 'Técnico': false, 'Laboratorio': false, 'Administrador': true },
  gestionar_usuarios: { 'Técnico': false, 'Laboratorio': false, 'Administrador': true },
};

/** Un usuario Inactivo no puede nada, aunque conserve su rol. */
export function can(user, accion) {
  return !!user && user.estado === 'Activo' && MATRIZ[accion]?.[user.rol] === true;
}

export const PANTALLAS = [
  { ruta: 'panel', etiqueta: 'Dashboard', icono: 'panel', accion: 'consultar' },
  { ruta: 'muestras/nueva', etiqueta: 'Registrar Muestra', icono: 'mas', accion: 'registrar_puntos_muestras' },
  { ruta: 'laboratorio', etiqueta: 'Resultados Lab', icono: 'frasco', accion: 'recepcion_resultados' },
  { ruta: 'evaluacion', etiqueta: 'Evaluación Normativa', icono: 'check', accion: 'consultar' },
  { ruta: 'mapa', etiqueta: 'Mapa de Muestreos', icono: 'pin', accion: 'consultar' },
  { ruta: 'historial', etiqueta: 'Historial y Reportes', icono: 'carpeta', accion: 'consultar' },
  { ruta: 'puntos', etiqueta: 'Puntos y pozos', icono: 'pin', accion: 'consultar' },
  { ruta: 'custodia', etiqueta: 'Recepción y traslado', icono: 'camion', accion: 'consultar' },
  { ruta: 'usuarios', etiqueta: 'Usuarios y roles', icono: 'usuarios', accion: 'gestionar_usuarios' },
];

export const menuPara = (user) => PANTALLAS.filter((p) => can(user, p.accion));

const PUBLICAS = ['acceso', 'solicitud', 'recuperar', 'restablecer', 'bandeja'];
export const esPublica = (ruta) => PUBLICAS.includes(String(ruta).split('/')[0]);

/** Acción que exige abrir una ruta; null si la ruta no existe. */
export function accionRequerida(ruta) {
  const [a, b, c] = String(ruta).split('/');
  switch (a) {
    case 'panel': case 'evaluacion': case 'mapa': case 'historial': case 'custodia': return 'consultar';
    case 'laboratorio': return 'recepcion_resultados';
    case 'usuarios': return 'gestionar_usuarios';
    case 'muestras': return b === 'nueva' ? 'registrar_puntos_muestras' : 'consultar';
    case 'puntos': return b === 'nuevo' || c === 'editar' ? 'registrar_puntos_muestras' : 'consultar';
    default: return null;
  }
}

export function puedeVerRuta(user, ruta) {
  if (esPublica(ruta)) return true;
  const accion = accionRequerida(ruta);
  return accion !== null && can(user, accion);
}
