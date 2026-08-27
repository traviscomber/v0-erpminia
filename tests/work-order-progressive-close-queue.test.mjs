import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260827220000_work_order_close_readiness_queue_v1.sql', 'utf8');
const api = fs.readFileSync('app/api/maintenance/work-order-close-queue/route.ts', 'utf8');
const component = fs.readFileSync('components/maintenance/progressive-work-order-close-queue.tsx', 'utf8');
const page = fs.readFileSync('app/dashboard/mantenimiento/ordenes-trabajo/cierre/page.tsx', 'utf8');

test('closure readiness mirrors the safe close blockers', () => {
  assert.match(migration, /open_procurement_orders/);
  assert.match(migration, /pending_parts/);
  assert.match(migration, /unmet_material_requirements/);
  assert.match(migration, /pending_external_services/);
  assert.match(migration, /open_labor_entries/);
  assert.match(migration, /external_cost_conflict/);
  assert.match(migration, /record_root_cause/);
  assert.match(migration, /record_preventive_actions/);
  assert.match(migration, /record_actual_hours/);
  assert.match(migration, /close_work_order/);
});

test('closure readiness stays backend only and security invoker', () => {
  assert.match(migration, /security_invoker=true/i);
  assert.match(migration, /revoke select .* from public, anon, authenticated/i);
  assert.match(migration, /grant select .* to service_role/i);
});

test('closure queue API is maintenance authorized and tenant scoped', () => {
  assert.match(api, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(api, /eq\('organization_id', context\.organizationId\)/);
  assert.match(api, /work_order_close_readiness_v1/);
});

test('progressive closure exposes one next action and never auto closes', () => {
  assert.match(component, /Siguiente acción/);
  assert.match(component, /Guardar y continuar/);
  assert.match(component, /Cerrar OT y congelar costo/);
  assert.match(component, /status: 'completed'/);
  assert.doesNotMatch(component, /useEffect\([\s\S]*status: 'completed'/);
  assert.match(page, /Cierre progresivo de OT/);
});
