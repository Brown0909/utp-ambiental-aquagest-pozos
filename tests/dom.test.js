import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, html, raw, aTexto } from '../docs/app/js/ui/dom.js';

test('🔴 RF-71 un <script> escrito por el usuario queda inofensivo', () => {
  const malo = '<script>alert(1)</script>';
  assert.equal(aTexto(html`<p>${malo}</p>`), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.ok(!aTexto(html`<p>${malo}</p>`).includes('<script'));
});

test('🔴 RF-71 las comillas no pueden salirse de un atributo', () => {
  const malo = '" onmouseover="alert(1)';
  const salida = aTexto(html`<input value="${malo}">`);
  assert.equal(salida, '<input value="&quot; onmouseover=&quot;alert(1)">');
  assert.ok(!/ onmouseover="/.test(salida));
  assert.equal(aTexto(html`<a title='${"' onclick='x"}'>`), '<a title=\'&#39; onclick=&#39;x\'>');
});

test('escapa & < > " \' y tolera null, undefined y números', () => {
  assert.equal(esc(`a&b<c>d"e'f`), 'a&amp;b&lt;c&gt;d&quot;e&#39;f');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(0), '0');
  assert.equal(aTexto(html`<b>${null}${undefined}${false}${true}</b>`), '<b></b>');
});

test('las plantillas anidadas y los arreglos NO se vuelven a escapar; raw() es explícito', () => {
  const items = ['<uno>', 'dos'].map((t) => html`<li>${t}</li>`);
  assert.equal(aTexto(html`<ul>${items}</ul>`), '<ul><li>&lt;uno&gt;</li><li>dos</li></ul>');
  assert.equal(aTexto(html`<p>${raw('<b>negrita</b>')}</p>`), '<p><b>negrita</b></p>');
  assert.equal(aTexto('texto <suelto>'), 'texto &lt;suelto&gt;', 'un texto plano se escapa');
  assert.equal(aTexto(html`<p>${'&lt;'}</p>`), '<p>&amp;lt;</p>', 'no hay doble interpretación');
});
