import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bodyUrl = new URL('../components/intelligence/specialist-assistant-body.tsx', import.meta.url);
const routeUrl = new URL('../app/api/intelligence/decision-cases/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('grounded Core answers expose a direct advisory handoff to the Executive Center', async () => {
  const source = await read(bodyUrl);
  assert.match(source, /DIRECT_EXECUTIVE_HANDOFF_ENDPOINTS/);
  assert.match(source, /'\/api\/inventory\/assistant'/);
  assert.match(source, /'\/api\/procurement\/assistant'/);
  assert.match(source, /'\/api\/production\/assistant'/);
  assert.match(source, /'\/api\/finance\/assistant'/);
  assert.match(source, /'\/api\/documents\/assistant'/);
  assert.match(source, /'\/api\/data-quality\/assistant'/);
  assert.match(source, /Derivar a Centro Ejecutivo/);
  assert.match(source, /evidenceRefs\.length > 0/);
});

test('direct handoff references the persisted conversation and assistant message rather than client evidence', async () => {
  const source = await read(bodyUrl);
  assert.match(source, /sourceConversationId: conversationId/);
  assert.match(source, /sourceMessageId: item\.id/);
  assert.match(source, /targetDomain: 'executive'/);
  assert.match(source, /action: 'create'/);
  assert.doesNotMatch(source, /evidenceRefs:/);
  assert.doesNotMatch(source, /source_refs:\s*item/);
});

test('Maintenance and Geology specialists do not gain direct Core handoff source authority', async () => {
  const source = await read(bodyUrl);
  const setStart = source.indexOf('const DIRECT_EXECUTIVE_HANDOFF_ENDPOINTS');
  const setEnd = source.indexOf(']);', setStart);
  const endpoints = source.slice(setStart, setEnd);
  assert.doesNotMatch(endpoints, /maintenance/);
  assert.doesNotMatch(endpoints, /geolog/);
});

test('server remains authoritative for permissions provenance and advisory-only semantics', async () => {
  const route = await read(routeUrl);
  assert.match(route, /canAccessDecisionCaseDomain\(request, message\.domain\)/);
  assert.match(route, /canAccessDecisionCaseDomain\(request, targetDomain\)/);
  assert.match(route, /const evidenceRefs = Array\.isArray\(message\.source_refs\)/);
  assert.match(route, /authority: 'advisory_only'/);
  assert.match(route, /operationalMutationExecuted: false/);
});
