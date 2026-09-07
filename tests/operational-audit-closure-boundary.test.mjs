import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/audit/operational/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/auditoria-operacional/page.tsx', import.meta.url);

test('operational audit requires explicit evidence before traced closure', async () => {
  const api = await readFile(apiUrl, 'utf8');
  const page = await readFile(pageUrl, 'utf8');

  assert.match(api, /!id \|\| !resolutionNote \|\| !evidenceReference/);
  assert.match(api, /resolución e indica una referencia de evidencia verificable/);
  assert.match(api, /evidence_reference: evidenceReference/);
  assert.match(page, /!resolutionNote\.trim\(\) \|\| !evidenceReference\.trim\(\)/);
  assert.match(page, /El hallazgo no puede cerrarse sin una referencia de evidencia verificable/);
});

test('operational audit never renders unavailable canonical findings as zero', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /summaryUnavailable = isLoading \|\| Boolean\(error\) \|\| !data/);
  assert.match(page, /summaryUnavailable \? '—' : value/);
  assert.match(page, /Auditoría no disponible/);
});
