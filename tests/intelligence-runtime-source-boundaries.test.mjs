import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshotPath = new URL('../lib/api/dashboard-snapshot.ts', import.meta.url);
const rootCausePath = new URL('../app/api/intelligence/root-cause/route.ts', import.meta.url);

test('dashboard snapshot unwraps Supabase response data before array operations', async () => {
  const source = await readFile(snapshotPath, 'utf8');

  assert.match(source, /typeof result === 'object' && 'data' in result/);
  assert.match(source, /if \(result\.error\) return fallback/);
  assert.match(source, /return \(result\.data \?\? fallback\) as T/);
  assert.match(source, /productionEquipment\.map/);
  assert.match(source, /workOrders\.filter/);
});

test('root cause intelligence uses the tenant-scoped canonical procurement intake table', async () => {
  const source = await readFile(rootCausePath, 'utf8');

  assert.match(source, /getOrganizationContext\(request\)/);
  assert.match(source, /context\.supabase\.from\('procurement_intake_requests'\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.doesNotMatch(source, /procurement_intake_flow/);
  assert.doesNotMatch(source, /getSupabaseAdmin/);
});
