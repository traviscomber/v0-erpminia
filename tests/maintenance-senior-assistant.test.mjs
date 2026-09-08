import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url);
const probeUrl = new URL('../app/api/maintenance/senior-assistant/probe/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/mantenimiento/page.tsx', import.meta.url);
const componentUrl = new URL('../components/maintenance/maintenance-senior-assistant.tsx', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260906182000_add_maintenance_ai_continuity.sql', import.meta.url);

test('maintenance senior assistant is authorized and tenant scoped', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  for (const source of ['maintenance_canonical_assets_v1','drilling_maintenance_review_queue_v1','production_drilling_source_reports','preventive_maintenance_hour_status_v1','maintenance_work_orders','maintenance_reliability_base_v1','work_order_close_readiness_v2']) assert.match(route, new RegExp(source));
});

test('assistant derives 90d operational evidence directly instead of the heavy availability view', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /production_drilling_source_reports/);
  assert.match(route, /observedConditions90d/);
  assert.match(route, /out_of_service_reports/);
  assert.match(route, /operational_with_observations_reports/);
  assert.doesNotMatch(route, /from\('drill_asset_operational_evidence_90d_v1'\)/);
});

test('assistant excludes synthetic UAT evidence from reliability learning', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /isSynthetic/);
  assert.match(route, /audited_non_synthetic_reliability/);
  assert.match(route, /No uses UAT, simulaciones o pruebas como evidencia de confiabilidad real/);
});

test('assistant keeps operational frequency separate from failure probability and human authority', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /NO es probabilidad de falla/);
  assert.match(route, /no crea ni cierra OT/i);
  assert.match(route, /DATO CANÓNICO, INTERPRETACIÓN PROFESIONAL, HIPÓTESIS A REVISAR/);
  assert.match(route, /una afirmación previa del usuario no se transforma por repetición en dato canónico/i);
});

test('assistant persists per-user conversation history with an explicit idle boundary', async () => {
  const route = await readFile(routeUrl, 'utf8');
  for (const table of ['maintenance_ai_conversations','maintenance_ai_messages','maintenance_ai_user_memory']) assert.match(route, new RegExp(table));
  assert.match(route, /SESSION_IDLE_MS = 8 \* 60 \* 60 \* 1000/);
  assert.match(route, /conversationTranscript/);
  assert.match(route, /action === 'archive'/);
  assert.match(route, /source_refs: sourceRefs/);
});

test('assistant memory stays separate from canonical operational truth', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /extractDurableMemory/);
  assert.match(route, /Nunca conviertas una afirmación del usuario sobre una máquina, falla, causa, repuesto, prioridad o intervención en evidencia canónica/i);
  assert.match(route, /Memoria de trabajo declarada por el usuario/);
  assert.match(route, /memoria laboral separada de la verdad operacional/i);
});

test('maintenance control center exposes persistent history sources and new-conversation control', async () => {
  const [page, component] = await Promise.all([readFile(pageUrl, 'utf8'), readFile(componentUrl, 'utf8')]);
  assert.match(page, /MaintenanceSeniorAssistant/);
  assert.match(page, /Decision Intelligence/);
  assert.match(component, /\/api\/maintenance\/senior-assistant/);
  assert.match(component, /conversationId/);
  assert.match(component, /Ver mensajes anteriores/);
  assert.match(component, /fuentes canónicas/i);
  assert.match(component, /Nueva conversación/);
  assert.match(component, /Memoria \{memoryCount\}/);
  assert.match(component, /dato faltante tendría más valor para decidir mejor/i);
});

test('maintenance assistant launcher is a transparent in-code corporate mark', async () => {
  const component = await readFile(componentUrl, 'utf8');
  assert.match(component, /function MaintenanceAiMark/);
  assert.match(component, /bg-transparent/);
  assert.match(component, /var\(--primary\)/);
  assert.match(component, /var\(--secondary\)/);
  assert.doesNotMatch(component, /<img\b/i);
  assert.doesNotMatch(component, /bg-primary[^-]/);
});

test('maintenance assistant continuity storage remains backend-only', async () => {
  const migration = await readFile(migrationUrl, 'utf8');
  for (const table of ['maintenance_ai_conversations','maintenance_ai_messages','maintenance_ai_user_memory']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
    assert.match(migration, new RegExp(`grant all on table public\\.${table} to service_role`, 'i'));
  }
});

test('authenticated production probe does not pollute conversation history', async () => {
  const probe = await readFile(probeUrl, 'utf8');
  assert.match(probe, /ephemeral: true/);
  assert.match(probe, /POST\(probeRequest\)/);
});
