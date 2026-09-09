import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/admin/assign-cargo/route.ts', import.meta.url);
const tabUrl = new URL('../components/admin/assign-cargo-tab.tsx', import.meta.url);

test('cargo assignment validates cargo and tenant-scoped target before success', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /from\('cargos'\)/);
  assert.match(route, /Cargo no encontrado/);
  assert.match(route, /eq\('organization_id', auth\.organizationId\)/);
  assert.match(route, /select\('id,cargo_id'\)/);
  assert.match(route, /Usuario no encontrado en esta organización/);
});

test('cargo assignment UI waits for server truth and exposes source failures', async () => {
  const source = await readFile(tabUrl, 'utf8');
  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /La falla de la fuente no se interpreta como ausencia de usuarios o cargos/);
  assert.match(source, /await mutate\(\)/);
  assert.doesNotMatch(source, /Optimistic update/);
});
