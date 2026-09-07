import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/produccion/geologia/location-review/route.ts', import.meta.url);
const queueUrl = new URL('../components/production/geologia-pending-decision-queue.tsx', import.meta.url);
const createRpcMigrationUrl = new URL('../supabase/migrations/20260826221641_resolve_drill_hole_location_manual_review.sql', import.meta.url);
const syncMigrationUrl = new URL('../supabase/migrations/20260826222217_sync_drill_hole_location_into_intelligence_v2.sql', import.meta.url);
const hardenMigrationUrl = new URL('../supabase/migrations/20260829204403_harden_sondaje_location_review_rpc_execute.sql', import.meta.url);

test('human sector confirmation is write-authorized, tenant-scoped and cannot cross the evidenced mine', async () => {
  const route = await readFile(routeUrl, 'utf8');

  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA, true\)/);
  assert.match(route, /production_drill_hole_location_review_queue_v5/);
  assert.match(route, /eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /review\.review_lane !== 'mina_conocida_falta_sector'/);
  assert.match(route, /operational_bucket[\s\S]*historico/);
  assert.match(route, /sector\.mine_source_id !== review\.candidate_mine_source_id/);
  assert.match(route, /El sector seleccionado no pertenece a la mina respaldada por la evidencia fuente/);
  assert.match(route, /production_drill_hole_location_evidence/);
  assert.match(route, /eq\('status', 'candidate'\)/);
  assert.match(route, /confirmation === true/);
  assert.match(route, /resolve_drill_hole_location_manual_review/);
  assert.match(route, /p_reviewed_by: context\.userId/);
  assert.match(route, /La confirmación no quedó reflejada en el pozo canónico/);
});

test('geology queue shows evidence-backed sector selection while source conflicts remain blocked', async () => {
  const queue = await readFile(queueUrl, 'utf8');

  assert.match(queue, /\/api\/produccion\/geologia\/location-review/);
  assert.match(queue, /Confirmación humana de sector/);
  assert.match(queue, /No hay asignación automática/);
  assert.match(queue, /Confirmar sector/);
  assert.match(queue, /confirmation:true/);
  assert.match(queue, /Conflicto de fuente · asignación bloqueada/);
  assert.match(queue, /Motil no propone sector/);
  assert.match(queue, /Mina respaldada:/);
  assert.match(queue, /Fuente:/);
  assert.match(queue, /manual_review/);
});

test('manual location RPC remains security-invoker, synchronizes canonical evidence and is service-role only', async () => {
  const [createRpc, sync, harden] = await Promise.all([
    readFile(createRpcMigrationUrl, 'utf8'),
    readFile(syncMigrationUrl, 'utf8'),
    readFile(hardenMigrationUrl, 'utf8'),
  ]);

  assert.match(createRpc, /resolve_drill_hole_location_manual_review/);
  assert.match(createRpc, /security invoker/);
  assert.match(createRpc, /evidence_type[\s\S]*'manual_review'/);
  assert.match(createRpc, /mine_sector_id = p_mine_sector_id/);
  assert.match(sync, /production_drilling_source_reports/);
  assert.match(sync, /canonical_mine_sector_id=p_mine_sector_id/);
  assert.match(sync, /reconciliation_status='matched'/);
  assert.match(harden, /revoke execute[\s\S]*from public, anon, authenticated/);
  assert.match(harden, /grant execute[\s\S]*to service_role/);
});
