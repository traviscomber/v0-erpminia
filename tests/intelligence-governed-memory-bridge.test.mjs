import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/intelligence/memory/route.ts', import.meta.url), 'utf8');

test('governed memory includes maintenance and geology without changing operational truth', () => {
  assert.match(route, /'maintenance'/);
  assert.match(route, /'geology'/);
  assert.match(route, /maintenance_ai_user_memory/);
  assert.match(route, /geology_ai_user_memory/);
  assert.match(route, /motil_ai_user_memory/);
  assert.match(route, /specialist:.*maintenance.*geology|maintenance\|geology/);
  assert.match(route, /operationalMutationExecuted: false/);
  assert.match(route, /Memoria laboral no canónica/);
});

test('specialist memory mutations remain tenant and user scoped', () => {
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('user_id', context\.userId\)/);
  assert.match(route, /action !== 'set_active'/);
  assert.doesNotMatch(route, /\.delete\(/);
  assert.doesNotMatch(route, /\.insert\(/);
});
