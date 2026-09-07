import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/page.tsx', import.meta.url);

test('dashboard never turns an unavailable role inbox into zero work or an empty-action claim', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /const roleValue = \(summary: InboxSummary \| undefined/);
  assert.match(page, /summary \? summary\[key\] : '—'/);
  assert.match(page, /const inboxUnavailable = Boolean\(inbox\.error\)/);
  assert.match(page, /Trabajo del cargo no disponible/);
  assert.match(page, /No se puede afirmar que no haya acciones pendientes/);
  assert.match(page, /Fuente de acciones no disponible/);
  assert.doesNotMatch(page, /value: summary\?\.critical \?\? 0/);
  assert.doesNotMatch(page, /value: summary\?\.owners \?\? 0/);
});
