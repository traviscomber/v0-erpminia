import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const persistentUrl = new URL('../lib/intelligence/persistent-operational-domain-assistant.ts', import.meta.url);
const helperUrl = new URL('../lib/intelligence/advisory-handoff-context.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Core specialists load only open advisory handoffs scoped to the current tenant user and target domain', async () => {
  const [runtime, helper] = await Promise.all([read(persistentUrl), read(helperUrl)]);
  assert.match(runtime, /loadSupportAdvisoryHandoffs\(context, domain, message\)/);
  assert.match(helper, /\.from\('motil_ai_decision_cases'\)/);
  assert.match(helper, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(helper, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(helper, /\.eq\('target_domain', targetDomain\)/);
  assert.match(helper, /\.eq\('status', 'open'\)/);
  assert.match(helper, /\.limit\(3\)/);
});

test('handoff content is explicitly non canonical and can only define what to revalidate', async () => {
  const [runtime, helper] = await Promise.all([read(persistentUrl), read(helperUrl)]);
  assert.match(helper, /HANDOFF ADVISORY NO CANÓNICO — SÓLO DEFINE QUÉ REVALIDAR/);
  assert.match(helper, /no uses cifras, estados, causas, prioridades ni conclusiones del handoff como hechos/);
  assert.match(helper, /Vuelve a comprobar todo únicamente contra EVIDENCIA MOTIL actual y autorizada/);
  assert.match(runtime, /Si el caso ya no está respaldado o contradice la evidencia operacional actual, dilo explícitamente/);
});

test('handoff review remains read only and does not mutate Decision Cases or operational tables', async () => {
  const [runtime, helper] = await Promise.all([read(persistentUrl), read(helperUrl)]);
  const source = `${runtime}\n${helper}`;
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

test('handoffs are only consulted for review or prioritization style questions through the shared helper', async () => {
  const [runtime, helper] = await Promise.all([read(persistentUrl), read(helperUrl)]);
  assert.match(runtime, /loadSupportAdvisoryHandoffs\(context, domain, message\)/);
  assert.match(runtime, /advisoryHandoffs\.length/);
  assert.match(helper, /HANDOFF_REVIEW_HINT/);
  assert.match(helper, /if \(!HANDOFF_REVIEW_HINT\.test\(message\)\) return \[\]/);
});
