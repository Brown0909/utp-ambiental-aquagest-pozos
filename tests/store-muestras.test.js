import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crear, muestraValida } from './helpers.js';

test('RF-27 una muestra válida recibe folio único AG-AAAA-NNN y queda «Registrada»', () => {
  const s = crear('tecnico');
  const a = s.crearMuestra(muestraValida());
  const b = s.crearMuestra(muestraValida({ hora: '10:00' }));
  assert.equal(a.ok, true);
  assert.equal(a.datos.folio, 'AG-2026-082');
  assert.equal(b.datos.folio, 'AG-2026-083');
  assert.equal(s.etapaDe(a.datos), 'Registrada');
  assert.equal(s.data.muestras.length, 13);
  assert.equal(a.datos.creadaPorId, 'U1');
});

test('RF-28 el punto o pozo sale de la lista registrada (no texto libre)', () => {
  const s = crear('tecnico');
  assert.ok(s.crearMuestra(muestraValida({ puntoId: '' })).errores.puntoId);
  assert.match(s.crearMuestra(muestraValida({ puntoId: 'Pozo inventado' })).errores.puntoId, /lista registrada/);
  assert.match(s.crearMuestra(muestraValida({ puntoId: 'PZ-999' })).errores.puntoId, /lista registrada/);
});

test('RF-29 fecha y hora: no futura, no de hace más de 30 días, día real', () => {
  const s = crear('tecnico');   // ahora = 02/10/2026 12:00
  assert.equal(s.crearMuestra(muestraValida({ hora: '12:00' })).ok, true, 'justo ahora vale');
  assert.match(s.crearMuestra(muestraValida({ hora: '12:01' })).errores.fecha, /futura/);
  assert.match(s.crearMuestra(muestraValida({ fecha: '2026-10-03' })).errores.fecha, /futura/);
  assert.equal(s.crearMuestra(muestraValida({ fecha: '2026-09-02', hora: '12:00' })).ok, true, 'exactamente 30 días');
  assert.match(s.crearMuestra(muestraValida({ fecha: '2026-09-01' })).errores.fecha, /anterior a 30 días/);
  assert.match(s.crearMuestra(muestraValida({ fecha: '2026-02-31' })).errores.fecha, /día real/);
  assert.ok(s.crearMuestra(muestraValida({ hora: '25:00' })).errores.hora);
  assert.ok(s.crearMuestra(muestraValida({ fecha: '', hora: '' })).errores.fecha);
});

test('RF-30 el técnico responsable es un usuario activo Técnico o Administrador', () => {
  const s = crear('tecnico');
  assert.equal(s.crearMuestra(muestraValida({ tecnicoId: 'U3' })).ok, true, 'Administrador sirve');
  for (const id of ['U2', 'U4', 'U999', '']) assert.ok(s.crearMuestra(muestraValida({ tecnicoId: id })).errores.tecnicoId, id);
});

test('RF-31 y RF-32 compatibilidad de tipo de agua con el registro y con el objetivo', () => {
  const s = crear('tecnico');
  assert.match(s.crearMuestra(muestraValida({ tipoAgua: 'Agua residual', objetivo: 'Solo monitoreo' })).errores.tipoAgua, /pozo solo admite/);
  assert.match(s.crearMuestra(muestraValida({ puntoId: 'PT-001' })).errores.tipoAgua, /solo se usa en pozos/);
  assert.equal(s.crearMuestra(muestraValida({ tipoAgua: 'Agua potable', objetivo: 'Consumo humano' })).ok, true);
  assert.match(s.crearMuestra(muestraValida({ puntoId: 'PT-001', tipoAgua: 'Agua residual', objetivo: 'Consumo humano' })).errores.objetivo, /residuales/);
  assert.match(s.crearMuestra(muestraValida({ puntoId: 'PT-001', tipoAgua: 'Agua superficial', objetivo: 'Descarga' })).errores.objetivo, /Descarga/);
  assert.match(s.crearMuestra(muestraValida({ puntoId: 'PT-001', tipoAgua: 'Agua residual', objetivo: 'Reutilización' })).errores.objetivo, /tratada/);
  assert.equal(s.crearMuestra(muestraValida({ puntoId: 'PT-001', tipoAgua: 'Agua residual tratada', objetivo: 'Reutilización' })).ok, true);
  assert.ok(s.crearMuestra(muestraValida({ tipoAgua: 'Agua mineral' })).errores.tipoAgua);
  assert.ok(s.crearMuestra(muestraValida({ objetivo: 'Beber' })).errores.objetivo);
});

test('🔴 RF-16 Laboratorio y sin sesión no registran muestras', () => {
  const lab = crear('laboratorio');
  const r = lab.crearMuestra(muestraValida());
  assert.equal(r.sinPermiso, true);
  assert.equal(lab.data.muestras.length, 11);
  assert.equal(crear().crearMuestra(muestraValida()).sinPermiso, true);
});
