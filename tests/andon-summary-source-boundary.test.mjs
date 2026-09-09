import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/andon/page.tsx', import.meta.url);

test('Andon summary keeps unavailable source distinct from zero', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /const summaryReady = !isLoading && !error && Array\.isArray\(data\?\.data\)/);
  assert.match(source, /openCount == null \? '—'/);
  assert.match(source, /criticalCount == null \? '—'/);
  assert.match(source, /newCount == null \? '—'/);
});

test('Andon does not invent zero-minute response without acknowledged evidence', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /const avgResponse = answered\.length/);
  assert.match(source, /: null;/);
  assert.match(source, /avgResponse == null \? '—' : `\$\{avgResponse\} min`/);
});
