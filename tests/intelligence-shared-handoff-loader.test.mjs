import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimeUrl = new URL('../lib/intelligence/persistent-operational-domain-assistant.ts', import.meta.url);
const helperUrl = new URL('../lib/intelligence/advisory-handoff-context.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('operational specialists use the same advisory loader as support and deep specialists', async () => {
  const runtime = await read(runtimeUrl);
  assert.match(runtime, /loadSupportAdvisoryHandoffs/);
  assert.match(runtime, /supportAdvisoryHandoffPrompt/);
  assert.match(runtime, /loadSupportAdvisoryHandoffs\(context, domain, message\)/);
  assert.doesNotMatch(runtime, /async function loadAdvisoryHandoffs/);
  assert.doesNotMatch(runtime, /const HANDOFF_REVIEW_HINT/);
});

test('shared loader remains the single user tenant and target scoping boundary', async () => {
  const helper = await read(helperUrl);
  assert.match(helper, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(helper, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(helper, /\.eq\('target_domain', targetDomain\)/);
  assert.match(helper, /\.eq\('status', 'open'\)/);
  assert.match(helper, /\.limit\(3\)/);
});

test('operational handoffs only define what to revalidate and preserve canonical runtime authority', async () => {
  const runtime = await read(runtimeUrl);
  assert.match(runtime, /No mantengas cifras, estados, causas, severidad ni prioridad sólo porque aparezcan en el handoff/);
  assert.match(runtime, /handleOperationalDomainAssistant/);
  assert.match(runtime, /decisionCaseRefs: advisoryHandoffs\.map/);
  assert.match(runtime, /contexto no canónico/);
});
