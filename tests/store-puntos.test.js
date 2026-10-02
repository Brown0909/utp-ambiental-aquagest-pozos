import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, puntoValido } from './helpers.js';

test('RF-18 el ID es permanente y consecutivo por tipo (PZ-020, PT-006)', () => {
  const s = crear('tecnico');
  const pozo = s.crearPunto(puntoValido());
  assert.equal(pozo.ok, true);
  assert.equal(pozo.datos.id, 'PZ-020');
  const punto = s.crearPunto(puntoValido({ tipo: 'Punto', nombre: 'Río Caimito', profundidad: '' }));
  assert.equal(punto.datos.id, 'PT-006');
  assert.equal(punto.datos.profundidad, null);
  assert.equal(s.data.puntos.length, 9);
});

test('RF-19 nombre, comunidad y coordenadas obligatorios y con largo válido', () => {
  const s = crear('tecnico');
  const vacio = s.crearPunto({ tipo: 'Punto' });
  for (const c of ['nombre', 'comunidad', 'lat', 'lng']) assert.ok(vacio.errores[c], c);
  assert.match(s.crearPunto(puntoValido({ nombre: 'ab' })).errores.nombre, /al menos 3/);
  assert.match(s.crearPunto(puntoValido({ nombre: 'x'.repeat(81) })).errores.nombre, /máximo 80/);
  assert.match(s.crearPunto(puntoValido({ comunidad: 'a' })).errores.comunidad, /al menos 2/);
  assert.ok(s.crearPunto({ ...puntoValido(), tipo: 'Laguna' }).errores.tipo);
  assert.equal(s.data.puntos.length, 7, 'nada se guardó');
});

test('RF-20 la profundidad solo se pide a los pozos (0,5 a 500 m)', () => {
  const s = crear('tecnico');
  assert.match(s.crearPunto(puntoValido({ profundidad: '' })).errores.profundidad, /obligatoria/);
  assert.match(s.crearPunto(puntoValido({ profundidad: '0,2' })).errores.profundidad, /entre 0,5 y 500/);
  assert.match(s.crearPunto(puntoValido({ profundidad: '501' })).errores.profundidad, /entre/);
  assert.ok(s.crearPunto(puntoValido({ profundidad: 'honda' })).errores.profundidad);
  assert.equal(s.crearPunto(puntoValido({ profundidad: '9,5' })).datos.profundidad, 9.5);
  const punto = s.crearPunto(puntoValido({ tipo: 'Punto', nombre: 'Quebrada Seca', profundidad: '' }));
  assert.equal(punto.ok, true, 'un punto no pide profundidad');
  assert.equal(s.crearPunto(puntoValido({ tipo: 'Punto', nombre: 'Quebrada Fría', profundidad: '999' })).datos.profundidad, null, 'si la escriben en un punto se ignora');
});

test('🔴 RF-21 coordenadas fuera de Panamá se rechazan (Nueva York, signo olvidado, lat/lng invertidas)', () => {
  const s = crear('tecnico');
  assert.match(s.crearPunto(puntoValido({ lat: '40.7128', lng: '-74.0060' })).errores.lat, /fuera de Panamá/);
  assert.match(s.crearPunto(puntoValido({ lat: '8.858', lng: '82.573' })).errores.lng, /fuera de Panamá/);
  assert.ok(s.crearPunto(puntoValido({ lat: '-82.573', lng: '8.858' })).errores.lat);
  assert.ok(s.crearPunto(puntoValido({ lat: '95', lng: '-80' })).errores.lat);
  assert.ok(s.crearPunto(puntoValido({ lat: 'norte', lng: '-80' })).errores.lat);
  const bien = s.crearPunto(puntoValido({ lat: '8,858', lng: '-82,573' }));
  assert.equal(bien.ok, true, 'con coma decimal');
  assert.equal(bien.datos.lat, 8.858);
  assert.equal(s.data.puntos.length, 8, 'solo el válido se guardó');
});

test('RF-22 no se repite nombre + comunidad (sin importar mayúsculas ni espacios)', () => {
  const s = crear('tecnico');
  const dup = s.crearPunto(puntoValido({ nombre: '  pozo   ALAJUELA norte ', comunidad: 'alajuela' }));
  assert.match(dup.errores.nombre, /Ya existe/);
  assert.equal(s.crearPunto(puntoValido({ nombre: 'Pozo Alajuela Norte', comunidad: 'Otra' })).ok, true, 'mismo nombre en otra comunidad sí');
});

test('🔴 RF-16 Laboratorio y sin sesión no pueden crear ni editar', () => {
  const lab = crear('laboratorio');
  assert.equal(lab.crearPunto(puntoValido()).sinPermiso, true);
  assert.equal(lab.editarPunto('PZ-018', puntoValido()).sinPermiso, true);
  assert.equal(lab.data.puntos.length, 7);
  assert.equal(crear().crearPunto(puntoValido()).sinPermiso, true);
});
