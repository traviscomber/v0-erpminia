import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/intelligence/decision-cases/route.ts', import.meta.url);
const panelUrl = new URL('../components/dashboard/decision-cases-panel.tsx', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260908153000_add_decision_case_revalidation_metadata.sql', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Decision Case API exposes advisory revalidation provenance without changing authority', async () => {
  const [route, migration] = await Promise.all([read(routeUrl), read(migrationUrl)]);
  assert.match(route, /last_revalidated_at/);
  assert.match(route, /last_revalidated_by_user_id/);
  assert.match(route, /last_revalidation_evidence_refs/);
  assert.match(route, /authority: 'advisory_only'/);
  assert.match(route, /no sustituyen datos canónicos ni autorizan acciones operacionales/);
  assert.match(migration, /Never operational truth, approval, or authorization/i);
});

test('Decision Case panel distinguishes pending from last recorded specialist revalidation', async () => {
  const panel = await read(panelUrl);
  assert.match(panel, /Última revalidación registrada:/);
  assert.match(panel, /Pendiente de revalidación en destino\./);
  assert.match(panel, /puede quedar desactualizado si cambian las fuentes/);
  assert.match(panel, /last_revalidation_evidence_refs/);
  assert.doesNotMatch(panel, /revalidado actualmente|vigente automáticamente/i);
});
