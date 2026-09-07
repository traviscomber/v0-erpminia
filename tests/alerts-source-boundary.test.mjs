import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiUrl = new URL('../app/api/alertas/route.ts', import.meta.url);
const pageUrl = new URL('../app/dashboard/alertas/page.tsx', import.meta.url);

test('alert aggregation exposes incomplete source coverage instead of silently returning empty fallbacks', async () => {
  const api = await readFile(apiUrl, 'utf8');

  assert.match(api, /type SourceResult<T>/);
  assert.match(api, /available: false/);
  assert.match(api, /sourceStatus:/);
  assert.match(api, /complete: unavailable\.length === 0/);
  assert.match(api, /unavailable,/);
  assert.doesNotMatch(api, /async function safeQuery/);
});

test('alert recency stays null when the source has no real timestamp', async () => {
  const api = await readFile(apiUrl, 'utf8');
  const page = await readFile(pageUrl, 'utf8');

  assert.match(api, /function sourceDate/);
  assert.match(api, /if \(!value\) return null/);
  assert.match(api, /id: `contract-review-\$\{contract\.id\}`,[\s\S]*timestamp: null/s);
  assert.match(api, /id: `stock-\$\{stock\.id\}`,[\s\S]*timestamp: null/s);
  assert.match(page, /timestamp: string \| null/);
  assert.match(page, /Fecha fuente no disponible/);
  assert.doesNotMatch(api, /function safeDate/);
});

test('alert UI does not present partial aggregates or fabricated unread state as complete truth', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /aggregateUnavailable/);
  assert.match(page, /aggregateUnavailable \? '—' : value/);
  assert.match(page, /Vista parcial de señales/);
  assert.match(page, /Una señal no reemplaza el ciclo de gestión de un problema en Andon/);
  assert.doesNotMatch(page, /No leídas/);
  assert.doesNotMatch(page, /Nueva<\/Badge>/);
});
