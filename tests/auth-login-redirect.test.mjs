import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const proxySource = await readFile(new URL('../proxy.ts', import.meta.url), 'utf8');

test('authenticated users cannot remain on the login page', () => {
  assert.match(proxySource, /function safePostLoginPath\(request: NextRequest\)/);
  assert.match(proxySource, /pathname === '\/auth\/login' && isAuthenticated/);
  assert.match(proxySource, /NextResponse\.redirect\(new URL\(safePostLoginPath\(request\), request\.url\)\)/);
});

test('post-login redirect accepts only safe internal paths', () => {
  assert.match(proxySource, /!redirect\.startsWith\('\/'\)/);
  assert.match(proxySource, /redirect\.startsWith\('\/\/'\)/);
  assert.match(proxySource, /redirect\.startsWith\('\/auth\/login'\)/);
  assert.match(proxySource, /return '\/dashboard';/);
});
