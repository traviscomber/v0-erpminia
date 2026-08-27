import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260827145500_close_client_grants_rls_no_policy.sql', import.meta.url);

test('RLS tables without policies remain server-only', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const tables = [
    'contract_amendments',
    'equipment_fault_analytics',
    'maintenance_analytics_daily',
    'permissions',
    'person_competencies',
    'person_credentials',
    'person_epp_assignments',
    'production_drill_hole_location_evidence',
    'role_permissions',
    'roles',
    'technician_performance_analytics',
    'tire_lifecycle_analytics',
    'work_order_type_analytics',
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`));
  }
  assert.match(sql, /to service_role;/);
});
