import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRealDate, isRealTime, parseIso, toIso, addMinutes, minutesBetween, fmtDate, fmtDateTime, fmtLong } from '../docs/app/js/core/dates.js';

test('isRealDate rechaza días que no existen (31 de febrero) y acepta 29 de febrero bisiesto', () => {
  assert.equal(isRealDate('2026-02-31'), false);
  assert.equal(isRealDate('2026-02-29'), false);
  assert.equal(isRealDate('2028-02-29'), true);
  assert.equal(isRealDate('2026-13-01'), false);
  assert.equal(isRealDate('26-01-01'), false);
  assert.equal(isRealDate(''), false);
  assert.equal(isRealDate(undefined), false);
});

test('isRealTime acepta 00:00 y 23:59 y rechaza 24:00 y 9:5', () => {
  assert.equal(isRealTime('00:00'), true);
  assert.equal(isRealTime('23:59'), true);
  assert.equal(isRealTime('24:00'), false);
  assert.equal(isRealTime('9:5'), false);
  assert.equal(isRealTime('12:60'), false);
});

test('parseIso e iso ida y vuelta; devuelve null si el instante no es real', () => {
  const d = parseIso('2026-10-02T09:30');
  assert.equal(d.getHours(), 9);
  assert.equal(toIso(d), '2026-10-02T09:30');
  assert.equal(parseIso('2026-02-30T09:30'), null);
  assert.equal(parseIso('2026-10-02 09:30'), null);
  assert.equal(parseIso(null), null);
});

test('addMinutes y minutesBetween cruzan medianoche y fin de mes', () => {
  assert.equal(addMinutes('2026-10-31T23:30', 60), '2026-11-01T00:30');
  assert.equal(minutesBetween('2026-10-02T09:00', '2026-10-02T10:30'), 90);
  assert.equal(minutesBetween('2026-10-02T10:30', '2026-10-02T09:00'), -90);
});

test('formatos en español', () => {
  assert.equal(fmtDate('2026-10-02T09:30'), '02/10/2026');
  assert.equal(fmtDateTime('2026-10-02T09:30'), '02/10/2026 · 09:30');
  assert.equal(fmtLong(new Date(2026, 9, 2)), '2 Oct, 2026');
});
