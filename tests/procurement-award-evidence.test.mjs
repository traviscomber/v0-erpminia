import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/procurement/award-evidence/route.ts','utf8');
const panel = fs.readFileSync('components/procurement/award-evidence-panel.tsx','utf8');
const page = fs.readFileSync('app/dashboard/compras/flujo/page.tsx','utf8');

test('award evidence is tenant scoped and uses supplier score v2',()=>{
  assert.match(route,/getOrganizationContext/);
  assert.match(route,/supplier_operational_score_v2/);
  assert.match(route,/\.eq\('organization_id', context\.organizationId\)/);
});

test('award decision keeps price lead time and performance separate',()=>{
  assert.match(panel,/Menor precio/);
  assert.match(panel,/Menor plazo/);
  assert.match(panel,/Score operacional/);
  assert.match(panel,/Evidencia/);
  assert.match(panel,/no combina estos factores en un ranking oculto/i);
});

test('award evidence refuses direct price comparison across currencies',()=>{
  assert.match(panel,/Monedas distintas: no comparar precio directo/);
  assert.match(panel,/currencies\.size === 1/);
});

test('procurement workflow surfaces award evidence before operational actions',()=>{
  assert.match(page,/AwardEvidencePanel/);
  assert.match(page,/ProgressiveProcurementWorkflow/);
});
