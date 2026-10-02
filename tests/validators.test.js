import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../docs/app/js/core/validators.js';

test('número: acepta punto y coma decimal, rechaza texto y rangos', () => {
  assert.equal(V.parseNumber('9,0333'), 9.0333);
  assert.equal(V.parseNumber('9.0333'), 9.0333);
  assert.ok(Number.isNaN(V.parseNumber('9,0,3')));
  assert.ok(Number.isNaN(V.parseNumber('abc')));
  assert.ok(Number.isNaN(V.parseNumber('1e3')));
  assert.equal(V.number('', { min: 0, max: 14 }), null, 'vacío es opcional');
  assert.match(V.number('15', { min: 0, max: 14 }), /entre 0 y 14/);
  assert.match(V.number('x', { min: 0, max: 14 }), /número válido/);
  assert.equal(V.number('7,4', { min: 0, max: 14 }), null);
});

test('entero: rechaza decimales y negativos', () => {
  assert.equal(V.integer('3', { min: 0, max: 100 }), null);
  assert.match(V.integer('3.5'), /entero/);
  assert.match(V.integer('-1', { min: 0 }), /entre/);
});

test('correo institucional: formato y dominio, sin importar mayúsculas', () => {
  assert.equal(V.institutionalEmail('Carlos.Chen@MiAmbiente.gob.pa'), null);
  assert.match(V.institutionalEmail('carlos@gmail.com'), /institucional/);
  assert.match(V.institutionalEmail('sin-arroba'), /válido/);
  assert.match(V.institutionalEmail('a@miambiente.gob.pa.evil.com'), /institucional/);
  assert.match(V.institutionalEmail('a@evil.com@miambiente.gob.pa'), /válido|institucional/);
});

test('contraseña: 8+ con mayúscula, minúscula y número', () => {
  assert.equal(V.passwordPolicy('Aqua2026!'), null);
  assert.ok(V.passwordPolicy('aqua2026!'));
  assert.ok(V.passwordPolicy('AQUA2026!'));
  assert.ok(V.passwordPolicy('Aquaaaaa'));
  assert.ok(V.passwordPolicy('Aq1'));
});

test('nombre completo: dos palabras de letras, con tildes y apóstrofo', () => {
  assert.equal(V.fullName('Elena Torres'), null);
  assert.equal(V.fullName("María O'Brien-Pérez"), null);
  assert.ok(V.fullName('Elena'));
  assert.ok(V.fullName('Elena 123'));
  assert.ok(V.fullName('<b>Elena</b> Torres'));
});

test('coordenadas: coma decimal, rango global y 🔴 fuera de Panamá', () => {
  assert.deepEqual(V.coordinates('9,0333', '-79,5333').errors, {});
  assert.equal(V.coordinates('9.0333', '-79.5333').lat, 9.0333);
  assert.ok(V.coordinates('', '-79').errors.lat);
  assert.ok(V.coordinates('95', '-79').errors.lat);
  assert.match(V.coordinates('40.7', '-74.0').errors.lat, /fuera de Panamá/);   // Nueva York
  assert.match(V.coordinates('9.0333', '79.5333').errors.lng, /fuera de Panamá/); // signo olvidado
});

test('archivo: se identifica por contenido; un .pdf renombrado NO pasa (🔴)', () => {
  const pdf = { name: 'cert.pdf', size: 1000, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31] };
  const png = { name: 'foto.png', size: 1000, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] };
  const jpg = { name: 'foto.JPG', size: 1000, bytes: [0xff, 0xd8, 0xff, 0xe0] };
  assert.equal(V.checkFile(pdf, { kinds: ['pdf'], maxBytes: 10485760 }), null);
  assert.equal(V.checkFile(png, { kinds: ['jpg', 'png'], maxBytes: 5242880 }), null);
  assert.equal(V.checkFile(jpg, { kinds: ['jpg', 'png'], maxBytes: 5242880 }), null);
  const falso = { name: 'cert.pdf', size: 1000, bytes: [0x4d, 0x5a, 0x90, 0x00] }; // un .exe renombrado
  assert.match(V.checkFile(falso, { kinds: ['pdf'], maxBytes: 10485760 }), /contenido/);
  assert.match(V.checkFile({ ...png, name: 'foto.pdf' }, { kinds: ['jpg', 'png'], maxBytes: 5242880 }), /extensión/);
  assert.match(V.checkFile({ ...png, size: 6 * 1048576 }, { kinds: ['png'], maxBytes: 5242880 }), /supera 5 MB/);
  assert.match(V.checkFile({ ...png, size: 0 }, { kinds: ['png'], maxBytes: 5242880 }), /vacío/);
  assert.match(V.checkFile(null, { kinds: ['png'], maxBytes: 1 }), /Seleccione/);
});

test('notFuture compara contra «ahora»', () => {
  const ahora = new Date(2026, 9, 2, 12, 0);
  assert.equal(V.notFuture('2026-10-02T11:59', ahora), null);
  assert.equal(V.notFuture('2026-10-02T12:00', ahora), null);
  assert.match(V.notFuture('2026-10-02T12:01', ahora), /futura/);
});

test('validate devuelve solo el primer error de cada campo', () => {
  const errs = V.validate({ a: '', b: 'x' }, { a: [V.required, V.email], b: [V.required, V.email] });
  assert.equal(errs.a, 'Este campo es obligatorio.');
  assert.equal(errs.b, 'Escriba un correo válido.');
});
