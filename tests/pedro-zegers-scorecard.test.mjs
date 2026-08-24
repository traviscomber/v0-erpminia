import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiPath = new URL('../app/api/desempeno/pedro-zegers/route.ts', import.meta.url);
const pagePath = new URL('../app/dashboard/desempeno/pedro-zegers/page.tsx', import.meta.url);

test('Pedro Zegers scorecard is organization scoped and uses attributable evidence', async () => {
  const source = await readFile(apiPath, 'utf8');
  assert.match(source, /requireModuleAccess\(request, MODULE_KEYS\.CORE_DESEMPENO\)/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /from\('people'\)/);
  assert.match(source, /from\('lean_kaizen_items'\)/);
  assert.match(source, /from\('contracts'\)/);
  assert.match(source, /belongsToPedro\(item\.owner_name\)/);
  assert.match(source, /belongsToPedro\(item\.responsible_person\)/);
});

test('Pedro Zegers scorecard stays a baseline and exposes evidence gaps', async () => {
  const api = await readFile(apiPath, 'utf8');
  const page = await readFile(pagePath, 'utf8');
  assert.match(api, /personalEvaluation: false/);
  assert.match(api, /project_portfolio/);
  assert.match(api, /approved_targets/);
  assert.match(api, /economic_benefit/);
  assert.match(page, /No evaluación personal/);
  assert.match(page, /grid gap-4 sm:grid-cols-2 xl:grid-cols-3/);
  assert.doesNotMatch(page, /xl:grid-cols-[456789]/);
});
