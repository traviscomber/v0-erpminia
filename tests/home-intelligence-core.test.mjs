import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const contextUrl = new URL('../lib/intelligence/assistant-context.ts', import.meta.url);
const widgetUrl = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url);
const accessUrl = new URL('../lib/intelligence/executive-access.ts', import.meta.url);

test('dashboard home resolves to the persistent executive Intelligence Core', async () => {
  const source = await readFile(contextUrl, 'utf8');
  assert.match(source, /const HOME_CONTEXT:[\s\S]*domain: 'executive'/);
  assert.match(source, /normalized === '\/dashboard'/);
  assert.match(source, /return HOME_CONTEXT/);
});

test('home Intelligence Core is the same role-aware assistant used by executive context', async () => {
  const widget = await readFile(widgetUrl, 'utf8');
  assert.match(widget, /executive:[\s\S]*endpoint: '\/api\/intelligence\/executive-assistant'/);
  assert.match(widget, /controlledMemoryDomains[\s\S]*'executive'/);
});

test('executive assistant limits evidence to effective module permissions', async () => {
  const access = await readFile(accessUrl, 'utf8');
  assert.match(access, /entries\.filter\(\(\[, result\]\) => result\.authorized\)/);
  assert.match(access, /canRead: \(domain: ExecutiveDomain\) => effectiveDomains\.includes\(domain\)/);
});
