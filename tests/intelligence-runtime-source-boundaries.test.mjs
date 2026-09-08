import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshotPath = new URL('../lib/api/dashboard-snapshot.ts', import.meta.url);
const rootCausePath = new URL('../app/api/intelligence/root-cause/route.ts', import.meta.url);
const escalationRoutePath = new URL('../app/api/dashboard/executive-escalations/route.ts', import.meta.url);
const escalationPanelPath = new URL('../components/dashboard/executive-escalations-panel.tsx', import.meta.url);

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

test('executive escalations converts only statement timeout into explicit unavailable state', async () => {
  const source = await readFile(escalationRoutePath, 'utf8');

  assert.match(source, /error\.code === '57014'/);
  assert.match(source, /available: false/);
  assert.match(source, /summary: null/);
  assert.match(source, /reason: 'source_timeout'/);
  assert.match(source, /status: 500/);
  assert.match(source, /available: true/);
});

test('executive escalations UI never interprets unavailable source as zero escalations', async () => {
  const source = await readFile(escalationPanelPath, 'utf8');

  assert.match(source, /data\?\.available===false/);
  assert.match(source, /no se interpreta la ausencia de datos como cero escalaciones/);
  assert.match(source, /Sin escalaciones activas\./);
});
