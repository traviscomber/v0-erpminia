import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routePath = new URL('../app/api/inventory/intelligence/route.ts', import.meta.url);
const pagePath = new URL('../app/dashboard/bodega/page.tsx', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20260911181000_fix_canonical_inventory_source_recency.sql', import.meta.url);

test('inventory API exposes diesel from the tenant-scoped canonical position', async () => {
  const route = await readFile(routePath, 'utf8');
  assert.match(route, /\.eq\('organization_id', organizationId\)/);
  assert.match(route, /\.eq\('product_code', 'Combustible001'\)/);
  assert.match(route, /diesel: dieselResult\.data \|\| null/);
});

test('bodega makes current diesel evidence explicit without treating history as current stock', async () => {
  const page = await readFile(pagePath, 'utf8');
  assert.match(page, /Petróleo Diesel/);
  assert.match(page, /Stock vigente según la evidencia canónica más reciente/);
  assert.match(page, /No se mezclan snapshots históricos con disponibilidad actual/);
  assert.match(page, /Última evidencia/);
});

test('canonical inventory normalizes product codes and prefers newer source evidence', async () => {
  const migration = await readFile(migrationPath, 'utf8');
  assert.match(migration, /distinct on \(inventory_snapshots\.organization_id, upper\(trim\(inventory_snapshots\.product_code\)\)\)/i);
  assert.match(migration, /oi\.source_at::date >= s\.snapshot_date/i);
  assert.match(migration, /security_invoker = true/i);
});
