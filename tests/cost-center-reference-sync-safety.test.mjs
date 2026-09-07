import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/admin/seed-cost-centers/route.ts', import.meta.url);

test('reference cost-center sync preserves canonical ids and unrelated centers', async () => {
  const source = await readFile(routeUrl, 'utf8');

  assert.match(source, /requireAdmin\(request\)/);
  assert.match(source, /select\('id, code, created_at'\)/);
  assert.match(source, /upsert\(syncPayload, \{ onConflict: 'organization_id,code' \}\)/);
  assert.match(source, /preservedExistingIds/);
  assert.match(source, /sin borrar registros existentes/);

  assert.doesNotMatch(source, /\.from\('cost_centers'\)\s*\.delete\(\)/s);
  assert.doesNotMatch(source, /deleteError/);
});
