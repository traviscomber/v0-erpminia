import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const navUrl = new URL('../components/layout/documentation-context-nav.tsx', import.meta.url);
const shellUrl = new URL('../components/layout/dashboard-shell.tsx', import.meta.url);
const libraryUrl = new URL('../app/dashboard/documentos/page.tsx', import.meta.url);
const controlUrl = new URL('../app/dashboard/documentos-gestion/page.tsx', import.meta.url);

test('Documentación exposes library and control as parallel contexts', async () => {
  const source = await readFile(navUrl, 'utf8');
  assert.match(source, /label: 'Biblioteca'/);
  assert.match(source, /label: 'Control documental'/);
  assert.doesNotMatch(source, /step:/);
});

test('shared documentation context is mounted once in the dashboard shell', async () => {
  const source = await readFile(shellUrl, 'utf8');
  assert.match(source, /<DocumentationContextNav \/>/);
});

test('library and control retain distinct responsibilities', async () => {
  const library = await readFile(libraryUrl, 'utf8');
  const control = await readFile(controlUrl, 'utf8');

  assert.match(library, /Subir documento/i);
  assert.match(library, /\/api\/documents/);
  assert.match(control, /Controla aprobaciones, vencimientos y categorías documentales/);
  assert.match(control, /\/api\/dashboard\/documentos-gestion/);
});
