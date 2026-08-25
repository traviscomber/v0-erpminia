import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pipelineUrl=new URL('../app/api/procurement/operational-pipeline/route.ts',import.meta.url);
const workflowUrl=new URL('../app/api/procurement/workflow/route.ts',import.meta.url);

test('optional maintenance procurement projection does not crash Compras',async()=>{
  const source=await readFile(pipelineUrl,'utf8');
  assert.match(source,/if \(pipelineError\)[\s\S]*unavailable: true/);
  assert.match(source,/typeof error === 'object'[\s\S]*'message' in error/);
});

test('procurement workflow preserves valid canonical sections when one projection fails',async()=>{
  const source=await readFile(workflowUrl,'utf8');
  assert.match(source,/const warnings = \[requestsResult/);
  assert.doesNotMatch(source,/if \(firstError\) throw firstError/);
  assert.match(source,/partial: warnings\.length > 0/);
  assert.match(source,/requests: requestsResult\.data \|\| \[\]/);
  assert.match(source,/purchaseOrders: ordersResult\.data \|\| \[\]/);
});
