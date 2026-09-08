import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperUrl = new URL('../lib/intelligence/advisory-handoff-context.ts', import.meta.url);
const executiveUrl = new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Executive Center is an allowed advisory handoff target without changing module permissions', async () => {
  const [helper, executive] = await Promise.all([read(helperUrl), read(executiveUrl)]);
  for (const domain of ['documents', 'data_health', 'executive']) {
    assert.match(helper, new RegExp(`'${domain}'`));
  }
  assert.match(executive, /resolveExecutiveAccess/);
  assert.match(executive, /loadSupportAdvisoryHandoffs\(context, 'executive', message\)/);
  assert.doesNotMatch(helper, /MODULE_KEYS/);
});

test('Executive handoffs are non canonical and must be reprioritized from current evidence', async () => {
  const source = await read(executiveUrl);
  assert.match(source, /HANDOFF ADVISORY es contexto NO CANÓNICO/);
  assert.match(source, /Una prioridad o recomendación previa nunca mantiene vigencia, severidad, causalidad ni prioridad sin respaldo de la evidencia actual/);
  assert.match(source, /Reevalúa impacto, frescura, permisos, contradicciones y evidencia faltante/);
  assert.match(source, /Si el caso ya no está respaldado, dilo y no lo priorices/);
});

test('Executive Decision Case references remain separate from canonical provenance', async () => {
  const source = await read(executiveUrl);
  assert.match(source, /const refs = sourceRefs\(sources, toolsUsed\)/);
  assert.match(source, /sourceRefs: refs/);
  assert.match(source, /decisionCaseRefs: advisoryHandoffs\.map/);
  assert.doesNotMatch(source, /sourceRefs:\s*advisoryHandoffs/);
});

test('Executive handoff revalidation remains read only', async () => {
  const source = await read(executiveUrl);
  assert.match(source, /READ_ONLY/);
  assert.doesNotMatch(source, /motil_ai_decision_cases[\s\S]{0,260}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /maintenance_work_orders[\s\S]{0,260}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /canonical_purchase_orders_current[\s\S]{0,260}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /canonical_inventory_current[\s\S]{0,260}\.(insert|update|delete)\(/);
});
