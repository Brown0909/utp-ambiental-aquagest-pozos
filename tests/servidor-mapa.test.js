// Regresión (11-nov-2026): el servidor mandaba «Referrer-Policy: no-referrer» y OpenStreetMap devolvía 403 a los mosaicos del mapa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrancar } from './servidor-helpers.js';

test('el servidor no manda no-referrer: el mapa de OpenStreetMap necesita el dominio de origen', async () => {
  const s = await arrancar();
  try {
    for (const ruta of ['/app/index.html', '/api/salud']) {
      const r = await fetch(`${s.url}${ruta}`);
      const pol = r.headers.get('referrer-policy');
      assert.equal(pol, 'strict-origin-when-cross-origin', `${ruta}: política de referrer`);
      assert.notEqual(pol, 'no-referrer');
      assert.notEqual(pol, 'unsafe-url', 'nunca la URL completa hacia sitios externos');
    }
  } finally { await s.cerrar(); }
});
