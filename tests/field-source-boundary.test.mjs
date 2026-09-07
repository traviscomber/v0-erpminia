import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/terreno/page.tsx', import.meta.url);

test('field workspace never renders missing planned duration or labor hours as zero', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /current\.planned_duration_hours == null \? '—'/);
  assert.match(page, /row\.hours == null \? 'Horas no informadas'/);
  assert.doesNotMatch(page, /Number\(current\.planned_duration_hours \|\| 0\)/);
  assert.doesNotMatch(page, /Number\(row\.hours \|\| 0\)/);
});
