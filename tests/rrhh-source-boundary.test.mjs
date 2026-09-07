import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/rrhh/page.tsx', import.meta.url);
const apiUrl = new URL('../app/api/rrhh/people/route.ts', import.meta.url);

test('RRHH keeps unavailable counts distinct from zero and only surfaces real reconciliation work', async () => {
  const page = await readFile(pageUrl, 'utf8');
  const api = await readFile(apiUrl, 'utf8');

  assert.match(page, /const countsUnavailable = loading \|\| Boolean\(error\)/);
  assert.match(page, /countsUnavailable \? '—' : value/);
  assert.match(page, /withoutProfile > 0 \? <StatePanel/);
  assert.match(page, /Los conteos permanecen sin dato hasta recuperar la fuente/);
  assert.match(api, /row\.status === 'finalized'/);
  assert.match(api, /latestScore: latest\?\.overall_score \?\? null/);
});
