import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, MATRIZ, ROLES, menuPara, accionRequerida, puedeVerRuta, esPublica } from '../docs/app/js/core/permissions.js';
import { siguienteIdPunto, siguienteFolio, esFolio, esIdPunto } from '../docs/app/js/core/ids.js';

const u = (rol, estado = 'Activo') => ({ rol, estado });

test('RF-16 matriz EXACTA de la lámina 19 (18 casillas)', () => {
  const esperado = {
    consultar: [true, true, true],
    registrar_puntos_muestras: [true, false, true],
    registrar_envio: [true, false, true],
    recepcion_resultados: [false, true, true],
    confirmar_revision: [false, false, true],
    gestionar_usuarios: [false, false, true],
  };
  for (const [accion, fila] of Object.entries(esperado)) {
    ROLES.forEach((rol, i) => assert.equal(can(u(rol), accion), fila[i], `${rol} / ${accion}`));
  }
  assert.equal(Object.keys(MATRIZ).length, 6);
});

test('🔴 RF-70 un usuario Inactivo no puede nada aunque conserve su rol, ni sin sesión', () => {
  for (const accion of Object.keys(MATRIZ)) {
    assert.equal(can(u('Administrador', 'Inactivo'), accion), false);
    assert.equal(can(null, accion), false);
    assert.equal(can(undefined, accion), false);
  }
  assert.equal(can(u('Administrador'), 'accion_inventada'), false);
});

test('RF-14 el menú depende del rol', () => {
  const rutas = (rol) => menuPara(u(rol)).map((p) => p.ruta);
  assert.equal(rutas('Administrador').length, 9);
  assert.ok(!rutas('Técnico').includes('laboratorio') && !rutas('Técnico').includes('usuarios'));
  assert.ok(rutas('Técnico').includes('muestras/nueva'));
  assert.ok(!rutas('Laboratorio').includes('muestras/nueva') && !rutas('Laboratorio').includes('usuarios'));
  assert.ok(rutas('Laboratorio').includes('laboratorio'));
  assert.deepEqual(menuPara(u('Técnico', 'Inactivo')), []);
});

test('RF-15 guardia de rutas por dirección', () => {
  assert.equal(accionRequerida('puntos/nuevo'), 'registrar_puntos_muestras');
  assert.equal(accionRequerida('puntos/PZ-018/editar'), 'registrar_puntos_muestras');
  assert.equal(accionRequerida('puntos/PZ-018'), 'consultar');
  assert.equal(accionRequerida('muestras/nueva'), 'registrar_puntos_muestras');
  assert.equal(accionRequerida('muestras/AG-2026-001'), 'consultar');
  assert.equal(accionRequerida('ruta-que-no-existe'), null);
  assert.equal(puedeVerRuta(u('Laboratorio'), 'puntos/nuevo'), false);
  assert.equal(puedeVerRuta(u('Técnico'), 'laboratorio'), false);
  assert.equal(puedeVerRuta(u('Técnico'), 'usuarios'), false);
  assert.equal(puedeVerRuta(u('Administrador'), 'usuarios'), true);
  assert.equal(puedeVerRuta(u('Administrador'), 'ruta-que-no-existe'), false);
  assert.equal(puedeVerRuta(null, 'panel'), false);
  assert.equal(puedeVerRuta(null, 'acceso'), true);
  assert.ok(['acceso', 'solicitud', 'recuperar', 'restablecer/abc', 'bandeja'].every(esPublica));
});

test('RF-18 y RF-27 IDs y folios consecutivos, sin reutilizar huecos', () => {
  const puntos = [{ id: 'PZ-018' }, { id: 'PT-001' }, { id: 'PT-002' }, { id: 'PT-004' }];
  assert.equal(siguienteIdPunto(puntos, 'Pozo'), 'PZ-019');
  assert.equal(siguienteIdPunto(puntos, 'Punto'), 'PT-005');
  assert.equal(siguienteIdPunto([], 'Pozo'), 'PZ-001');
  const muestras = [{ folio: 'AG-2026-001' }, { folio: 'AG-2026-081' }, { folio: 'AG-2025-200' }];
  assert.equal(siguienteFolio(muestras, 2026), 'AG-2026-082');
  assert.equal(siguienteFolio(muestras, 2027), 'AG-2027-001');
  assert.ok(esFolio('AG-2026-081') && !esFolio('PZ-018') && !esFolio('AG-26-1'));
  assert.ok(esIdPunto('PZ-018') && !esIdPunto('AG-2026-081'));
});
