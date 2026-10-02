import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, muestraValida, archivo } from './helpers.js';

test('RF-34 seguimiento: exige una referencia del mismo punto, de clase referencia y anterior', () => {
  const s = crear('tecnico');
  const seg = (extra) => s.crearMuestra(muestraValida({ clasificacion: 'seguimiento', ...extra }));
  assert.match(seg({ referenciaFolio: '' }).errores.referenciaFolio, /Elija la muestra de referencia/);
  assert.match(seg({ referenciaFolio: 'AG-2026-999' }).errores.referenciaFolio, /no existe/);
  assert.match(seg({ referenciaFolio: 'AG-2026-001' }).errores.referenciaFolio, /mismo punto/);        // es de PT-001
  assert.match(seg({ referenciaFolio: 'AG-2026-081' }).errores.referenciaFolio, /clasificación referencia/); // es un seguimiento
  assert.match(seg({ referenciaFolio: 'AG-2026-080', fecha: '2026-09-29' }).errores.referenciaFolio, /posterior/);
  const ok = seg({ referenciaFolio: 'AG-2026-080' });
  assert.equal(ok.ok, true);
  assert.equal(ok.datos.referenciaFolio, 'AG-2026-080');
  assert.match(s.crearMuestra(muestraValida({ referenciaFolio: 'AG-2026-080' })).errores.referenciaFolio, /no lleva referencia/);
  assert.deepEqual(s.referenciasDe('PZ-018').map((m) => m.folio), ['AG-2026-080']);
});

test('RF-35 lluvia: los tres datos o ninguno; si no hay, queda «Sin dato»', () => {
  const s = crear('tecnico');
  assert.equal(s.crearMuestra(muestraValida()).datos.lluvia, null);
  const parcial = s.crearMuestra(muestraValida({ lluviaMm: '20' }));
  assert.ok(parcial.errores.lluviaPeriodo && parcial.errores.lluviaFuente && parcial.errores._lluvia);
  assert.match(s.crearMuestra(muestraValida({ lluviaMm: '1001', lluviaPeriodo: '24 h', lluviaFuente: 'ETESA' })).errores.lluviaMm, /entre 0 y 1000/);
  assert.ok(s.crearMuestra(muestraValida({ lluviaMm: '-1', lluviaPeriodo: '24 h', lluviaFuente: 'ETESA' })).errores.lluviaMm);
  assert.ok(s.crearMuestra(muestraValida({ lluviaMm: '5', lluviaPeriodo: '3 años', lluviaFuente: 'ETESA' })).errores.lluviaPeriodo);
  const bien = s.crearMuestra(muestraValida({ lluviaMm: '12,5', lluviaPeriodo: '72 h', lluviaFuente: ' ETESA Hidrometeorología ' }));
  assert.deepEqual(bien.datos.lluvia, { mm: 12.5, periodo: '72 h', fuente: 'ETESA Hidrometeorología' });
});

test('RF-36 parámetros de campo con su rango físico; opcionales; coma decimal', () => {
  const s = crear('tecnico');
  const mal = s.crearMuestra(muestraValida({ ph: '15', temperatura: '61', oxigeno: '26', turbidez: '1001', conductividad: '100001' }));
  for (const k of ['ph', 'temperatura', 'oxigeno', 'turbidez', 'conductividad']) assert.ok(mal.errores[k], k);
  assert.ok(s.crearMuestra(muestraValida({ ph: '-0,1' })).errores.ph);
  assert.ok(s.crearMuestra(muestraValida({ ph: 'ácido' })).errores.ph);
  const bien = s.crearMuestra(muestraValida({ ph: '7,4', temperatura: '26,5', oxigeno: '6,8', turbidez: '4,2', conductividad: '150' }));
  assert.deepEqual(bien.datos.campo, { ph: 7.4, temperatura: 26.5, oxigeno: 6.8, turbidez: 4.2, conductividad: 150 });
  assert.deepEqual(s.crearMuestra(muestraValida()).datos.campo, { ph: null, temperatura: null, oxigeno: null, turbidez: null, conductividad: null });
  assert.equal(s.crearMuestra(muestraValida({ ph: '0', temperatura: '0' })).ok, true, 'los extremos valen');
});

test('RF-37 al menos un parámetro solicitado, y de los conocidos', () => {
  const s = crear('tecnico');
  assert.ok(s.crearMuestra(muestraValida({ solicitados: [] })).errores.solicitados);
  assert.ok(s.crearMuestra(muestraValida({ solicitados: undefined })).errores.solicitados);
  assert.ok(s.crearMuestra(muestraValida({ solicitados: ['plutonio'] })).errores.solicitados);
  assert.equal(s.crearMuestra(muestraValida({ solicitados: ['nitrato'] })).ok, true);
});

test('🔴 RF-38 la foto se verifica por su contenido y por su peso', () => {
  const s = crear('tecnico');
  assert.equal(s.crearMuestra(muestraValida({ foto: archivo.png() })).datos.foto.nombre, 'foto.png');
  assert.equal(s.crearMuestra(muestraValida({ foto: archivo.jpg() })).ok, true);
  assert.match(s.crearMuestra(muestraValida({ foto: archivo.pdf() })).errores.foto, /JPG o PNG/);
  assert.match(s.crearMuestra(muestraValida({ foto: archivo.jpg({ bytes: [0x4d, 0x5a, 0x90] }) })).errores.foto, /contenido/);
  assert.match(s.crearMuestra(muestraValida({ foto: archivo.png({ name: 'foto.gif' }) })).errores.foto, /extensión/);
  assert.match(s.crearMuestra(muestraValida({ foto: archivo.png({ size: 5 * 1048576 + 1 }) })).errores.foto, /5 MB/);
  assert.equal(s.crearMuestra(muestraValida({ foto: archivo.png({ size: 5 * 1048576 }) })).ok, true, 'justo 5 MB vale');
});

test('RF-39 GPS capturado lejos del punto: advierte pero no bloquea; coordenadas inválidas sí bloquean', () => {
  const s = crear('tecnico');
  const cerca = s.crearMuestra(muestraValida({ lat: '9.0334', lng: '-79.5334' }));
  assert.deepEqual(cerca.advertencias, []);
  const lejos = s.crearMuestra(muestraValida({ lat: '9.2', lng: '-79.5' }));
  assert.equal(lejos.ok, true);
  assert.match(lejos.advertencias[0], /a 1\d,\d km del punto|a \d+,\d km/);
  assert.deepEqual(lejos.datos.gps, { lat: 9.2, lng: -79.5 });
  assert.ok(s.crearMuestra(muestraValida({ lat: '9.2' })).errores.lng, 'solo una coordenada');
  assert.match(s.crearMuestra(muestraValida({ lat: '40', lng: '-74' })).errores.lat, /fuera de Panamá/);
  assert.equal(s.crearMuestra(muestraValida()).datos.gps, null);
});
