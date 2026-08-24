import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sidebarUrl = new URL('../components/layout/sidebar.tsx', import.meta.url);
const productionLayoutUrl = new URL('../app/dashboard/produccion/layout.tsx', import.meta.url);

test('Sondaje remains inside Produccion and not in the global sidebar', async () => {
  const [sidebar, productionLayout] = await Promise.all([
    readFile(sidebarUrl, 'utf8'),
    readFile(productionLayoutUrl, 'utf8'),
  ]);

  assert.doesNotMatch(
    sidebar,
    /label:'Sondaje'.*group:'Áreas'/,
    'Sondaje must not be a standalone global navigation category',
  );
  assert.match(
    productionLayout,
    /href: '\/dashboard\/produccion\/sondaje', label: 'Sondaje'/,
    'Sondaje must remain available within Produccion',
  );
});
