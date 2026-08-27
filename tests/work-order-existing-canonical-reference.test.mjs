import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260827174500_backfill_work_order_canonical_asset_from_existing_reference_v1.sql', import.meta.url), 'utf8');

test('legacy work-order asset references backfill only when the canonical asset exists in the same organization', () => {
  assert.match(migration, /join public\.maintenance_canonical_assets_v1 a/i);
  assert.match(migration, /a\.id = wo\.asset_id/i);
  assert.match(migration, /a\.organization_id = wo\.organization_id/i);
  assert.match(migration, /wo\.canonical_asset_id is null/i);
  assert.match(migration, /set canonical_asset_id = e\.asset_id/i);
});
