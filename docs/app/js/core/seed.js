// Datos de ejemplo (FICTICIOS). Las fechas son relativas a «ahora» (decisión D8): así nunca caen en el futuro.
import { addMinutes, toIso } from './dates.js';

export const CLAVE_DEMO = 'Aqua2026!';
export const LABORATORIOS = ['Laboratorio — MiAMBIENTE', 'Laboratorio externo acreditado'];
export const CONDICIONES_RECEPCION = ['Envases íntegros y rotulados', 'Envases dañados', 'Muestra sin rotular', 'Temperatura inadecuada', 'Otra incidencia'];
export const CONDICION_OK = CONDICIONES_RECEPCION[0];
export const PERIODOS_LLUVIA = ['24 h', '48 h', '72 h', '7 días'];

const todos = ['nitrato', 'conductividad', 'coliformes_totales', 'e_coli'];

export function construirSeed(ahora = new Date()) {
  const hace = (min) => addMinutes(toIso(ahora), -min);
  const H = 60;
  const usuarios = [
    { id: 'U1', nombre: 'Ing. Carlos Chen', correo: 'carlos.chen@miambiente.gob.pa', rol: 'Técnico', estado: 'Activo', password: CLAVE_DEMO },
    { id: 'U2', nombre: 'Lic. Ana Rodríguez', correo: 'ana.rodriguez@miambiente.gob.pa', rol: 'Laboratorio', estado: 'Activo', password: CLAVE_DEMO },
    { id: 'U3', nombre: 'María Castillo', correo: 'maria.castillo@miambiente.gob.pa', rol: 'Administrador', estado: 'Activo', password: CLAVE_DEMO },
    { id: 'U4', nombre: 'Luis Mendoza', correo: 'luis.mendoza@miambiente.gob.pa', rol: 'Técnico', estado: 'Inactivo', password: CLAVE_DEMO },
  ];
  const puntos = [
    { id: 'PZ-018', tipo: 'Pozo', nombre: 'Pozo Alajuela Norte', comunidad: 'Alajuela', profundidad: 9.0, lat: 9.0333, lng: -79.5333, creadoEn: hace(90 * H) },
    { id: 'PT-001', tipo: 'Punto', nombre: 'Río Chagres - Estación Alajuela', comunidad: 'Alajuela', profundidad: null, lat: 9.12, lng: -79.62, creadoEn: hace(300 * H) },
    { id: 'PT-002', tipo: 'Punto', nombre: 'Planta Potabilizadora Chilibre', comunidad: 'Chilibre', profundidad: null, lat: 9.15, lng: -79.61, creadoEn: hace(300 * H) },
    { id: 'PT-004', tipo: 'Punto', nombre: 'Río Cabra', comunidad: 'Pacora', profundidad: null, lat: 9.1, lng: -79.3, creadoEn: hace(300 * H) },
    { id: 'PZ-019', tipo: 'Pozo', nombre: 'Pozo Comunitario Alto Boquete', comunidad: 'Boquete', profundidad: 14.0, lat: 8.7799, lng: -82.4418, creadoEn: hace(200 * H) },
    { id: 'PT-003', tipo: 'Punto', nombre: 'Salida Residual - Zona Libre Colón', comunidad: 'Colón', profundidad: null, lat: 9.3547, lng: -79.9, creadoEn: hace(300 * H) },
    { id: 'PT-005', tipo: 'Punto', nombre: 'Acueducto Rural Cerro Punta', comunidad: 'Cerro Punta', profundidad: null, lat: 8.8467, lng: -82.5667, creadoEn: hace(200 * H) },
  ];
  const base = (folio, puntoId, tipoAgua, objetivo, minAtras, extra = {}) => ({
    folio, puntoId, tipoAgua, objetivo, clasificacion: 'referencia', referenciaFolio: null, fechaHora: hace(minAtras), tecnicoId: 'U1',
    gps: null, lluvia: null, campo: { ph: null, temperatura: null, oxigeno: null, turbidez: null, conductividad: null },
    solicitados: todos, foto: null, custodia: { envio: null, recepcion: null }, resultados: null, revision: null, conversion: null, ...extra,
  });
  const envio = (min, destino = LABORATORIOS[0]) => ({ fechaHora: hace(min), responsableId: 'U1', origen: null, destino });
  const recep = (min) => ({ fechaHora: hace(min), responsableId: 'U2', laboratorio: LABORATORIOS[0], condicion: CONDICION_OK, incidencias: '' });
  const resu = (min, valores) => ({ fechaAnalisis: hace(min).slice(0, 10), laboratorio: LABORATORIOS[0], certificado: { nombre: 'certificado.pdf', tamano: 2048, url: null, demo: true }, valores, cargadoPorId: 'U2', cargadoEn: hace(min) });
  const vals = (nit, forma, cond, col, eco) => ({ nitrato: { valor: nit, forma }, conductividad: { valor: cond }, coliformes_totales: { valor: col }, e_coli: { valor: eco } });
  const revision = (min, dictamen, obs, parcial = false) => ({ dictamen, parcial, analistaId: 'U3', fecha: hace(min), observaciones: obs });
  const muestras = [
    base('AG-2026-003', 'PT-002', 'Agua potable', 'Consumo humano', 20 * 24 * H, { campo: { ph: 7.2, temperatura: 25, oxigeno: 6.5, turbidez: 0.8, conductividad: 310 },
      custodia: { envio: envio(20 * 24 * H - 60), recepcion: recep(20 * 24 * H - 180) }, resultados: resu(20 * 24 * H - 400, vals(2.1, 'NO3-N', 310, 0, 0)),
      revision: revision(20 * 24 * H - 900, 'Cumple', 'Parámetros con límite cargado dentro de lo permitido.', true) }),
    base('AG-2026-005', 'PT-002', 'Agua potable', 'Consumo humano', 12 * 24 * H, { campo: { ph: 5.2, temperatura: 26, oxigeno: 6.0, turbidez: 2.0, conductividad: 650 },
      custodia: { envio: envio(12 * 24 * H - 60), recepcion: recep(12 * 24 * H - 180) }, resultados: resu(12 * 24 * H - 400, vals(12.4, 'NO3-N', 650, 5, 2)),
      revision: revision(12 * 24 * H - 900, 'No cumple', 'Nitrato, coliformes totales, E. coli y pH fuera de límite.', true) }),
    base('AG-2026-001', 'PT-001', 'Agua superficial', 'Solo monitoreo', 8 * 24 * H, { campo: { ph: 7.1, temperatura: 27, oxigeno: 7.0, turbidez: 12, conductividad: 180 },
      custodia: { envio: envio(8 * 24 * H - 60), recepcion: recep(8 * 24 * H - 180) }, resultados: resu(8 * 24 * H - 400, vals(1.2, 'NO3-N', 180, 120, 14)),
      revision: revision(8 * 24 * H - 900, 'Sin criterio aplicable', 'Solo monitoreo: sin dictamen de cumplimiento.') }),
    base('AG-2026-004', 'PT-004', 'Agua superficial', 'Solo monitoreo', 5 * 24 * H, { campo: { ph: 7.5, temperatura: 26, oxigeno: 7.2, turbidez: 8, conductividad: 160 },
      custodia: { envio: envio(5 * 24 * H - 60), recepcion: recep(5 * 24 * H - 180) }, resultados: resu(5 * 24 * H - 400, vals(0.9, 'NO3-N', 160, 80, 9)),
      revision: revision(5 * 24 * H - 900, 'Sin criterio aplicable', 'Solo monitoreo: sin dictamen de cumplimiento.') }),
  ];
  const campoPozo = (ph, t, o, tu, c) => ({ ph, temperatura: t, oxigeno: o, turbidez: tu, conductividad: c });
  muestras.push(
    // Pozo PZ-018: una referencia y un seguimiento, ambos con resultados recibidos y SIN revisión confirmada (como en el diseño)
    base('AG-2026-080', 'PZ-018', 'Subterránea/Pozo', 'Solo monitoreo', 50 * H, { campo: campoPozo(7.3, 26, 6.9, 3.8, 145),
      custodia: { envio: envio(50 * H - 180), recepcion: recep(50 * H - 360) }, resultados: resu(50 * H - 700, vals(3.9, 'NO3-N', 410, 0, 0)) }),
    base('AG-2026-081', 'PZ-018', 'Subterránea/Pozo', 'Solo monitoreo', 10 * H, { clasificacion: 'seguimiento', referenciaFolio: 'AG-2026-080',
      campo: campoPozo(7.4, 26.5, 6.8, 4.2, 150), custodia: { envio: envio(9 * H), recepcion: recep(7 * H) }, resultados: resu(5 * H, vals(4.8, 'NO3-N', 420, 0, 0)) }),
    // Pendiente de laboratorio (registrada, sin envío)
    base('AG-2026-002', 'PT-002', 'Agua potable', 'Consumo humano', 3 * H, { campo: { ph: 7.0, temperatura: 25, oxigeno: 6.4, turbidez: 0.9, conductividad: 300 } }),
    // Enviada hace más de 24 h y sin recepción -> alerta
    base('AG-2026-006', 'PT-003', 'Agua residual tratada', 'Descarga', 32 * H, { custodia: { envio: envio(30 * H), recepcion: null } }),
    // Recibida hace más de 48 h y sin resultados -> alerta de análisis retrasado
    base('AG-2026-007', 'PT-003', 'Agua residual tratada', 'Descarga', 60 * H, { custodia: { envio: envio(58 * H), recepcion: recep(52 * H) } }),
  );
  muestras.push(
    // Pozo de Chiriquí que NO cumple (nitrato, coliformes y E. coli por encima de lo permitido) — revisión ya confirmada
    base('AG-2026-008', 'PZ-019', 'Subterránea/Pozo', 'Consumo humano', 6 * 24 * H, { campo: campoPozo(7.0, 24, 5.5, 3.0, 520),
      custodia: { envio: envio(6 * 24 * H - 60), recepcion: recep(6 * 24 * H - 180) }, resultados: resu(6 * 24 * H - 400, vals(14.2, 'NO3-N', 520, 12, 3)),
      revision: revision(6 * 24 * H - 900, 'No cumple', 'Nitrato, coliformes totales y E. coli fuera de límite en un pozo de consumo humano.', true) }),
    // Acueducto que cumple
    base('AG-2026-009', 'PT-005', 'Agua potable', 'Consumo humano', 4 * 24 * H, { campo: campoPozo(7.3, 22, 7.0, 0.6, 280),
      custodia: { envio: envio(4 * 24 * H - 60), recepcion: recep(4 * 24 * H - 180) }, resultados: resu(4 * 24 * H - 400, vals(1.8, 'NO3-N', 280, 0, 0)),
      revision: revision(4 * 24 * H - 900, 'Cumple', 'Parámetros con límite cargado dentro de lo permitido.', true) }),
  );
  return { usuarios, puntos, muestras, solicitudes: [], correos: [] };
}
