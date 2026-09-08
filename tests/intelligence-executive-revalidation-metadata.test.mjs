import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Executive records Decision Case revalidation only after a grounded persisted answer', async () => {
  const source = await read(routeUrl);
  assert.match(source, /const refs = sourceRefs\(sources, toolsUsed\)/);
  assert.match(source, /const persisted = await appendCoreMessage/);
  assert.match(source, /persisted && advisoryHandoffs\.length && refs\.length/);
  assert.match(source, /recordSupportAdvisoryRevalidation/);
  assert.match(source, /'executive'/);
  assert.match(source, /decisionCaseRevalidation/);
});

test('Executive remains read only while advisory metadata is updated separately', async () => {
  const source = await read(routeUrl);
  assert.match(source, /READ_ONLY \+ permission-aware/);
  assert.doesNotMatch(source, /maintenance_work_orders[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /canonical_purchase_orders_current[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(source, /canonical_inventory_current[\s\S]{0,220}\.(insert|update|delete)\(/);
});
