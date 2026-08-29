import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  evidence: new URL('../app/api/procurement/award-evidence/route.ts', import.meta.url),
  outcomes: new URL('../app/api/procurement/award-outcomes/route.ts', import.meta.url),
  candidates: new URL('../app/api/procurement/supplier-candidates/route.ts', import.meta.url),
};

function handler(source, method, nextMethod = null) {
  const start = source.indexOf(`export async function ${method}`);
  assert.notEqual(start, -1, `${method} handler must exist`);
  const end = nextMethod ? source.indexOf(`export async function ${nextMethod}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

function assertReadGate(source, method, nextMethod = null) {
  const body = handler(source, method, nextMethod);
  assert.match(body, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS\)/);
  assert.doesNotMatch(body, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  assert.ok(body.indexOf('requireModuleAccess') < body.indexOf('getOrganizationContext') || body.indexOf('getOrganizationContext') === -1);
}

function assertWriteGate(source, method, nextMethod = null) {
  const body = handler(source, method, nextMethod);
  assert.match(body, /requireModuleAccess\(request,\s*MODULE_KEYS\.FIN_COMPRAS,\s*true\)/);
  const firstSensitiveCall = ['getOrganizationContext', 'requireAuth', ".rpc('", '.insert(']
    .map((needle) => body.indexOf(needle))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  assert.ok(firstSensitiveCall === undefined || body.indexOf('requireModuleAccess') < firstSensitiveCall);
}

test('award evidence requires FIN_COMPRAS read/write access', async () => {
  const source = await readFile(files.evidence, 'utf8');
  assertReadGate(source, 'GET', 'POST');
  assertWriteGate(source, 'POST');
});

test('award outcomes requires FIN_COMPRAS read access', async () => {
  const source = await readFile(files.outcomes, 'utf8');
  assertReadGate(source, 'GET');
});

test('supplier candidates requires FIN_COMPRAS access for every method', async () => {
  const source = await readFile(files.candidates, 'utf8');
  assertReadGate(source, 'GET', 'POST');
  assertWriteGate(source, 'POST', 'PATCH');
  assertWriteGate(source, 'PATCH');
  assert.match(handler(source, 'GET', 'POST'), /const canApprove = access\.canWrite &&/);
});
