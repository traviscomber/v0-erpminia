import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const persistentUrl = new URL('../lib/intelligence/persistent-operational-domain-assistant.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Core specialists load only open advisory handoffs scoped to the current tenant user and target domain', async () => {
  const source = await read(persistentUrl);
  assert.match(source, /\.from\('motil_ai_decision_cases'\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(source, /\.eq\('target_domain', domain\)/);
  assert.match(source, /\.eq\('status', 'open'\)/);
  assert.match(source, /\.limit\(3\)/);
});

test('handoff content is explicitly non canonical and can only define what to revalidate', async () => {
  const source = await read(persistentUrl);
  assert.match(source, /HANDOFF ADVISORY NO CANÓNICO — SÓLO DEFINE QUÉ REVALIDAR/);
  assert.match(source, /no uses cifras, estados, causas ni prioridades del handoff como hechos/);
  assert.match(source, /Vuelve a comprobarlos únicamente contra EVIDENCIA MOTIL actual/);
  assert.match(source, /Si el caso ya no está respaldado o contradice la evidencia actual, dilo explícitamente/);
});

test('handoff review remains read only and does not mutate Decision Cases or operational tables', async () => {
  const source = await read(persistentUrl);
  assert.doesNotMatch(source, /motil_ai_decision_cases[\s\S]{0,260}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /maintenance_work_orders[\s\S]{0,260}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /canonical_purchase_orders_current[\s\S]{0,260}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /canonical_inventory_current[\s\S]{0,260}\.(insert|update|delete)\(/);
});

test('Decision Case references never become canonical source refs', async () => {
  const source = await read(persistentUrl);
  assert.match(source, /decisionCaseRefs: advisoryHandoffs\.map\(\(row\) => row\.id\)/);
  assert.match(source, /sourceRefs: refsFromPayload\(payload\)/);
  assert.doesNotMatch(source, /sourceRefs:\s*advisoryHandoffs/);
  assert.match(source, /El historial y los Decision Cases son contexto no canónico/);
});

test('handoffs are only consulted for review or prioritization style questions', async () => {
  const source = await read(persistentUrl);
  assert.match(source, /HANDOFF_REVIEW_HINT/);
  assert.match(source, /if \(!HANDOFF_REVIEW_HINT\.test\(message\)\) return \[\]/);
  assert.match(source, /questionWithAdvisoryHandoffs\(standaloneMessage, advisoryHandoffs\)/);
});
