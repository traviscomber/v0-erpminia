import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const api = await readFile(new URL('../app/api/planificacion/route.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/dashboard/planificacion/page.tsx', import.meta.url), 'utf8');
const contextNav = await readFile(new URL('../components/layout/operational-attention-context-nav.tsx', import.meta.url), 'utf8');

test('planning feed is tenant scoped and derives from canonical operational sources', () => {
  assert.match(api, /operational_attention_global_v1/);
  assert.match(api, /preventive_maintenance_hour_status_v1/);
  assert.match(api, /planning_maintenance_priority_v1/);
  assert.match(api, /production_monthly_plans/);
  assert.match(api, /\.eq\('organization_id', context\.organizationId\)/);
});

test('planning center preserves human planning authority', () => {
  assert.match(page, /MOTIL calcula; Ariel valida y programa/);
  assert.match(api, /Ariel confirma la programación, ventana, responsable y siguiente acción/);
  assert.doesNotMatch(api, /export async function (POST|PATCH|DELETE)/);
});

test('planning is a transversal operational-attention context, not a maintenance-only duplicate', () => {
  assert.match(contextNav, /\/dashboard\/planificacion/);
  assert.match(api, /scope:\s*\['Mantenimiento', 'Producción', 'Bodega', 'Compras'\]/);
  assert.match(page, /Plan maestro Ariel/);
  assert.match(page, /\/dashboard\/mantenimiento\/planificacion/);
});
