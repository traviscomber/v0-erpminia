import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sidebarUrl = new URL('../components/layout/sidebar.tsx', import.meta.url);
const productionLayoutUrl = new URL('../app/dashboard/produccion/layout.tsx', import.meta.url);
const drillingHomeUrl = new URL('../app/dashboard/produccion/sondaje/page.tsx', import.meta.url);

test('drilling stays inside Produccion while geology owns the geological drill-hole view', async () => {
  const [sidebar, productionLayout, drillingHome] = await Promise.all([
    readFile(sidebarUrl, 'utf8'),
    readFile(productionLayoutUrl, 'utf8'),
    readFile(drillingHomeUrl, 'utf8'),
  ]);

  assert.doesNotMatch(
    sidebar,
    /label:'Sondaje'.*group:'Áreas'/,
    'Sondaje must not be a standalone global navigation category',
  );
  assert.match(
    productionLayout,
    /href: '\/dashboard\/produccion\/sondaje', label: 'Perforación'/,
    'Operational drilling must remain available inside Produccion without presenting a second geology domain',
  );
  assert.match(productionLayout, /label: 'Geología'.*group: 'technical'/);
  assert.match(productionLayout, /Flujo operacional/);
  assert.match(productionLayout, /Control técnico/);
  assert.match(drillingHome, /Un sondaje, dos responsabilidades/);
  assert.match(drillingHome, /no son dos bases de datos distintas/i);
  assert.match(drillingHome, /\/dashboard\/produccion\/geologia\?tab=holes/);
});
