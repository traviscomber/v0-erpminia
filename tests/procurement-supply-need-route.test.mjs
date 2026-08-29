import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/procurement/supply-needs/route.ts', 'utf8');

test('supply need conversion reads the created intake through the hardened public view', () => {
  assert.match(route, /\.from\('procurement_intake_flow'\)/);
  assert.doesNotMatch(route, /\.schema\('intelligence'\)\s*\.from\('procurement_intake_flow'\)/);
  assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(route, /\.eq\('id', data\)/);
  assert.match(route, /\.single\(\)/);
});
