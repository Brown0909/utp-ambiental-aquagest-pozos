import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, como, avanzarA, resultadosValidos, archivo } from './helpers.js';

const listo = () => { const s = crear(); const folio = avanzarA(s, 'Recibida'); return { s, folio }; };

test('RF-48 solo se cargan resultados a una muestra «Recibida en laboratorio»', () => {
  const s = crear();
  const reg = avanzarA(s, 'Registrada');
  como(s, 'laboratorio');
  assert.match(s.guardarResultados(reg, resultadosValidos()).errores._form, /todavía no fue recibida/);
  const env = avanzarA(s, 'Enviada');
  como(s, 'laboratorio');
  assert.match(s.guardarResultados(env, resultadosValidos()).errores._form, /todavía no fue recibida/);
  assert.match(s.guardarResultados('AG-2026-999', resultadosValidos()).errores._form, /no existe/);
});

test('RF-48 y RF-49 exige cada parámetro SOLICITADO y la forma de nitrato; ignora los no solicitados', () => {
  const s = crear();
  const folio = avanzarA(s, 'Recibida');
  const vacio = s.guardarResultados(folio, { ...resultadosValidos(), nitrato: '', conductividad: '', coliformes_totales: '', e_coli: '', nitratoForma: '' });
  for (const k of ['nitrato', 'conductividad', 'coliformes_totales', 'e_coli', 'nitratoForma']) assert.ok(vacio.errores[k], k);
  const solo = avanzarA(s, 'Recibida', { solicitados: ['conductividad'] });
  como(s, 'laboratorio');
  const r = s.guardarResultados(solo, { conductividad: '300', nitrato: '999', fechaAnalisis: '2026-10-02', laboratorio: 'Lab X', certificado: archivo.pdf() });
  assert.equal(r.ok, true, 'sin nitrato ni forma porque no se pidió');
  assert.deepEqual(Object.keys(s.muestraPorFolio(solo).resultados.valores), ['conductividad']);
});

test('RF-50 rangos: nitrato 0–1000, conductividad 0–100000, coliformes y E. coli enteros', () => {
  const { s, folio } = listo();
  const e = s.guardarResultados(folio, resultadosValidos({ nitrato: '1001', conductividad: '100001', coliformes_totales: '1,5', e_coli: '-1' })).errores;
  for (const k of ['nitrato', 'conductividad', 'coliformes_totales', 'e_coli']) assert.ok(e[k], k);
  assert.match(e.nitrato, /entre 0 y 1000/);
  assert.match(e.coliformes_totales, /entero/);
  assert.ok(s.guardarResultados(folio, resultadosValidos({ nitrato: '-0,1' })).errores.nitrato);
  assert.ok(s.guardarResultados(folio, resultadosValidos({ nitrato: 'cuatro' })).errores.nitrato);
  assert.equal(s.guardarResultados(folio, resultadosValidos({ nitrato: '0', conductividad: '0', coliformes_totales: '0', e_coli: '0' })).ok, true, 'ceros válidos');
});

test('RF-51 el análisis no es anterior a la recepción ni futuro', () => {
  const { s, folio } = listo();                              // recepción: 02/10 10:00
  assert.match(s.guardarResultados(folio, resultadosValidos({ fechaAnalisis: '2026-10-01' })).errores.fechaAnalisis, /anterior a la recepción/);
  assert.match(s.guardarResultados(folio, resultadosValidos({ fechaAnalisis: '2026-10-03' })).errores.fechaAnalisis, /futura/);
  assert.match(s.guardarResultados(folio, resultadosValidos({ fechaAnalisis: '2026-02-30' })).errores.fechaAnalisis, /día real/);
  assert.ok(s.guardarResultados(folio, resultadosValidos({ fechaAnalisis: '' })).errores.fechaAnalisis);
  assert.ok(s.guardarResultados(folio, resultadosValidos({ laboratorio: '' })).errores.laboratorio);
  assert.equal(s.guardarResultados(folio, resultadosValidos({ fechaAnalisis: '2026-10-02' })).ok, true, 'el mismo día vale');
});

test('🔴 RF-52 el certificado es PDF verificado por contenido y de hasta 10 MB', () => {
  const { s, folio } = listo();
  assert.match(s.guardarResultados(folio, resultadosValidos({ certificado: null })).errores.certificado, /Seleccione/);
  assert.match(s.guardarResultados(folio, resultadosValidos({ certificado: archivo.png() })).errores.certificado, /PDF/);
  assert.match(s.guardarResultados(folio, resultadosValidos({ certificado: archivo.pdf({ bytes: [0x4d, 0x5a, 0x90, 0x00] }) })).errores.certificado, /contenido/);
  assert.match(s.guardarResultados(folio, resultadosValidos({ certificado: archivo.pdf({ name: 'cert.exe' }) })).errores.certificado, /extensión/);
  assert.match(s.guardarResultados(folio, resultadosValidos({ certificado: archivo.pdf({ size: 10 * 1048576 + 1 }) })).errores.certificado, /10 MB/);
  assert.equal(s.etapaDe(s.muestraPorFolio(folio)), 'Recibida en laboratorio', 'nada se guardó');
  assert.equal(s.guardarResultados(folio, resultadosValidos({ certificado: archivo.pdf({ size: 10 * 1048576 }) })).ok, true);
});

test('RF-53 guarda valor y forma TAL COMO se reportaron, avanza la etapa y no se puede repetir', () => {
  const { s, folio } = listo();
  const r = s.guardarResultados(folio, resultadosValidos({ nitrato: '12,5', nitratoForma: 'NO3' }));
  assert.equal(r.ok, true);
  const m = s.muestraPorFolio(folio);
  assert.deepEqual(m.resultados.valores.nitrato, { valor: 12.5, forma: 'NO3' }, 'no se convirtió');
  assert.equal(s.etapaDe(m), 'Pendiente de revisión técnica');
  assert.equal(m.resultados.certificado.nombre, 'certificado.pdf');
  assert.match(s.guardarResultados(folio, resultadosValidos()).errores._form, /ya tiene resultados/);
  assert.equal(m.resultados.valores.nitrato.valor, 12.5, 'el segundo intento no sobrescribió');
});

test('🔴 RF-16 el Técnico y quien no tiene sesión no cargan resultados', () => {
  const { s, folio } = listo();
  como(s, 'tecnico');
  assert.equal(s.guardarResultados(folio, resultadosValidos()).sinPermiso, true);
  s.logout();
  assert.equal(s.guardarResultados(folio, resultadosValidos()).sinPermiso, true);
  como(s, 'admin');
  assert.equal(s.guardarResultados(folio, resultadosValidos()).ok, true, 'el Administrador sí');
});
