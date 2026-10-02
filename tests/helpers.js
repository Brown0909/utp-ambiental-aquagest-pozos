import { Store } from '../docs/app/js/core/store.js';
import { CLAVE_DEMO } from '../docs/app/js/core/seed.js';

export const CORREOS = {
  tecnico: 'carlos.chen@miambiente.gob.pa',
  laboratorio: 'ana.rodriguez@miambiente.gob.pa',
  admin: 'maria.castillo@miambiente.gob.pa',
  inactivo: 'luis.mendoza@miambiente.gob.pa',
};

/** Store con reloj controlable: ahora = 2 Oct 2026 12:00; avanzar(min) lo adelanta. */
export function crear(rol = null) {
  const reloj = { t: new Date(2026, 9, 2, 12, 0) };
  const s = new Store({ ahora: () => new Date(reloj.t) });
  s.avanzar = (min) => { reloj.t = new Date(reloj.t.getTime() + min * 60000); };
  if (rol) { const r = s.login(CORREOS[rol], CLAVE_DEMO); if (!r.ok) throw new Error('no pudo entrar: ' + JSON.stringify(r)); }
  return s;
}

export const archivo = {
  pdf: (extra = {}) => ({ name: 'certificado.pdf', size: 2048, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34], ...extra }),
  png: (extra = {}) => ({ name: 'foto.png', size: 4096, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], ...extra }),
  jpg: (extra = {}) => ({ name: 'foto.jpg', size: 4096, bytes: [0xff, 0xd8, 0xff, 0xe0], ...extra }),
};

export const muestraValida = (extra = {}) => ({
  puntoId: 'PZ-018', fecha: '2026-10-02', hora: '09:30', tecnicoId: 'U1', tipoAgua: 'Subterránea/Pozo', objetivo: 'Solo monitoreo',
  clasificacion: 'referencia', referenciaFolio: '', solicitados: ['nitrato', 'conductividad', 'coliformes_totales', 'e_coli'], ...extra,
});

export const puntoValido = (extra = {}) => ({ tipo: 'Pozo', nombre: 'Pozo La Esperanza', comunidad: 'Cerro Punta', profundidad: '12', lat: '8.858', lng: '-82.573', ...extra });
export { CLAVE_DEMO };

/** Cambia de usuario en la sesión (cierra y vuelve a entrar). */
export function como(s, rol) {
  s.logout();
  const r = s.login(CORREOS[rol], CLAVE_DEMO);
  if (!r.ok) throw new Error('no pudo entrar: ' + JSON.stringify(r));
}

export const envioValido = (extra = {}) => ({ fecha: '2026-10-02', hora: '09:00', destino: 'Laboratorio — MiAMBIENTE', ...extra });
export const recepcionValida = (extra = {}) => ({ responsableId: 'U2', fecha: '2026-10-02', hora: '10:00', condicion: 'Envases íntegros y rotulados', incidencias: '', ...extra });
export const resultadosValidos = (extra = {}) => ({
  nitrato: '4,8', nitratoForma: 'NO3-N', conductividad: '420', coliformes_totales: '0', e_coli: '0',
  fechaAnalisis: '2026-10-02', laboratorio: 'Laboratorio — MiAMBIENTE', certificado: archivo.pdf(), ...extra,
});

/** Crea una muestra (08:00 de hoy) y la lleva hasta la etapa pedida. Devuelve su folio. */
export function avanzarA(s, etapa, extraMuestra = {}) {
  como(s, 'tecnico');
  const folio = s.crearMuestra(muestraValida({ hora: '08:00', ...extraMuestra })).datos.folio;
  if (etapa === 'Registrada') return folio;
  s.registrarEnvio(folio, envioValido());
  if (etapa === 'Enviada') return folio;
  como(s, 'laboratorio');
  s.confirmarRecepcion(folio, recepcionValida());
  if (etapa === 'Recibida') return folio;
  s.guardarResultados(folio, resultadosValidos());
  return folio;
}
