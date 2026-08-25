import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260825003040_enforce_role_matrix_rejection_authorization.sql', import.meta.url),
  'utf8',
);

test('role matrix rejection validates the area-manager approver before rejecting', () => {
  const stage = migration.indexOf("if p_stage='area_manager' then");
  const authorization = migration.indexOf("raise exception 'area manager approval required'", stage);
  const rejection = migration.indexOf('if not p_approve then', authorization);

  assert.ok(stage >= 0, 'area-manager stage is missing');
  assert.ok(authorization > stage, 'area-manager authorization is missing');
  assert.ok(rejection > authorization, 'rejection must happen after area-manager authorization');
  assert.match(migration, /requester cannot self-approve/);
});

test('role matrix rejection validates the management approver before rejecting', () => {
  const stage = migration.indexOf("elsif p_stage='management' then");
  const authorization = migration.indexOf("raise exception 'management approval required'", stage);
  const rejection = migration.indexOf('if not p_approve then', authorization);

  assert.ok(stage >= 0, 'management stage is missing');
  assert.ok(authorization > stage, 'management authorization is missing');
  assert.ok(rejection > authorization, 'rejection must happen after management authorization');
  assert.match(migration, /management approval must be a distinct approver/);
});

test('operational maintenance reviews remain RLS protected', () => {
  const rlsMigration = readFileSync(
    new URL('../supabase/migrations/20260825002548_enable_rls_on_operational_maintenance_reviews.sql', import.meta.url),
    'utf8',
  );

  assert.match(
    rlsMigration,
    /alter table public\.operational_maintenance_reviews enable row level security;/i,
  );
});
