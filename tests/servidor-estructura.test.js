// Spec 004 · vigilantes de estructura: lo que se publica en GitHub Pages y lo que el servidor nunca debe hacer (RF-94, M-28, M-33).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archivosDe = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? archivosDe(p) : [p]; });
const codigoDelServidor = () => archivosDe(join(raiz, 'server')).filter((p) => p.endsWith('.js'));

test('M-28 🔴 server/ y data/ están en la raíz, FUERA de docs/ (GitHub Pages publica todo docs/)', () => {
  assert.ok(existsSync(join(raiz, 'server', 'index.js')), 'server/ existe en la raíz');
  assert.ok(!existsSync(join(raiz, 'docs', 'server')), 'no hay docs/server');
  assert.ok(!existsSync(join(raiz, 'docs', 'data')), 'no hay docs/data');
  for (const f of codigoDelServidor()) assert.ok(relative(join(raiz, 'docs'), f).startsWith('..'), `${f} no está dentro de docs/`);
  const dentroDeDocs = archivosDe(join(raiz, 'docs')).filter((p) => /\.(db|sqlite|sqlite3|db-journal|db-wal)$/i.test(p));
  assert.deepEqual(dentroDeDocs, [], 'ninguna base de datos dentro de docs/');
});

test('M-28 🔴 `data/` está en .gitignore (la base nunca se sube)', () => {
  const lineas = readFileSync(join(raiz, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
  assert.ok(lineas.includes('data/'), '.gitignore lista data/');
});

test('RF-94 🔴 ninguna ruta del código del servidor borra filas: no hay DELETE FROM (el único DELETE es el disparador que lo prohíbe)', () => {
  const archivos = codigoDelServidor();
  assert.ok(archivos.length >= 5, 'se revisan los archivos del servidor');
  for (const f of archivos) {
    const texto = readFileSync(f, 'utf8');
    assert.ok(!/DELETE\s+FROM/i.test(texto), `${relative(raiz, f)} contiene DELETE FROM`);
    assert.ok(!/\bTRUNCATE\b|\bDROP\s+(TABLE|TRIGGER)\b/i.test(texto), `${relative(raiz, f)} contiene TRUNCATE o DROP`);
    for (const m of texto.matchAll(/\bDELETE\b/g)) {   // en mayúsculas: el `delete` de JavaScript (quitar una propiedad) no es SQL
      const antes = texto.slice(Math.max(0, m.index - 7), m.index);
      assert.equal(antes, 'BEFORE ', `${relative(raiz, f)}: un DELETE que no es el disparador de accesos`);
    }
  }
});

test('M-31 🔴 todas las consultas son preparadas: ningún texto del usuario se pega dentro del SQL', () => {
  const texto = readFileSync(join(raiz, 'server', 'db.js'), 'utf8');
  // Argumento completo de cada .prepare( ... ), contando paréntesis.
  const argumentos = [];
  for (const m of texto.matchAll(/\.prepare\(/g)) {
    let nivel = 1;
    let k = m.index + m[0].length;
    while (nivel > 0 && k < texto.length) { if (texto[k] === '(') nivel++; else if (texto[k] === ')') nivel--; k++; }
    argumentos.push(texto.slice(m.index + m[0].length, k - 1).trim());
  }
  assert.ok(argumentos.length >= 8, 'se revisan las consultas de db.js');
  for (const a of argumentos) {
    const literal = /^'[^'$]*'$/.test(a);
    const arma = a === 'upsert(t, cols)' || a === "upsert('meta', ['clave', 'valor'])";
    const lectura = a === '`SELECT * FROM ${tabla} ORDER BY ${orden}`';   // tabla y orden salen de constantes del propio archivo
    assert.ok(literal || arma || lectura, `consulta que arma SQL con variables: ${a}`);
  }
  for (const m of texto.matchAll(/\bleer\(([^)]*)\)/g)) assert.match(m[1], /^('[^']*'(, '[^']*')?|tabla, orden)$/, `leer() solo se llama con textos fijos: ${m[0]}`);
  for (const f of codigoDelServidor().filter((p) => !p.endsWith('db.js'))) {
    assert.ok(!/\.(exec|prepare)\(/.test(readFileSync(f, 'utf8')), `${relative(raiz, f)}: el SQL vive solo en db.js`);
  }
});

test('RF-99 package.json: `start` arranca el servidor, `test` sigue siendo node --test y se pide Node ≥ 22.13', () => {
  const p = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  assert.equal(p.scripts.start, 'node server/index.js');
  assert.equal(p.scripts.test, 'node --test');
  assert.equal(p.engines.node, '>=22.13');
  assert.ok(!p.dependencies && !p.devDependencies, 'el proyecto sigue sin dependencias npm (D1)');
});
