import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routePath = new URL('../app/api/dashboard/ia-operacional/route.ts', import.meta.url);

test('executive feed consolidates document expiry into one traceable exception', async () => {
  const route = await readFile(routePath, 'utf8');

  assert.match(route, /const expiredDocuments = expiringDocuments\.filter/);
  assert.match(route, /const upcomingDocuments = expiringDocuments\.filter/);
  assert.match(route, /id: 'document-expiry-attention'/);
  assert.match(route, /sourceId: 'document-expiry-attention'/);
  assert.match(route, /El detalle y la resolución permanecen en Gestión documental/);
  assert.doesNotMatch(route, /expiringDocuments\.forEach/);
  assert.match(route, /documentsAtRiskObserved: expiringDocuments\.length/);
  assert.match(route, /documentsAtRiskMayBeCapped: expiringDocuments\.length >= 25/);
});

test('executive feed consolidates overdue finance without inferring payment priority from amount', async () => {
  const route = await readFile(routePath, 'utf8');

  assert.match(route, /id: 'finance-overdue-attention'/);
  assert.match(route, /sourceId: 'finance-overdue-attention'/);
  assert.match(route, /no se infiere prioridad de pago desde el monto/i);
  assert.doesNotMatch(route, /overdueFinancial\.forEach/);
  assert.match(route, /overdueFinancial: overdueFinancial\.length/);
  assert.match(route, /financialPendingAmount/);
});

test('executive feed consolidates upcoming contracts separately from overdue finance', async () => {
  const route = await readFile(routePath, 'utf8');

  assert.match(route, /const financeOverdueIds = new Set\(overdueFinancial\.map/);
  assert.match(route, /const upcomingContracts = expiringContracts\.filter/);
  assert.match(route, /id: 'contract-expiry-attention'/);
  assert.match(route, /sourceId: 'contract-expiry-attention'/);
  assert.doesNotMatch(route, /expiringContracts\.forEach/);
});
