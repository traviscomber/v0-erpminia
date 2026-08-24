import assert from 'node:assert/strict';
import test from 'node:test';

import { allQualityChecksPass } from '../lib/production/quality-status.mjs';

test('quality status is HOLD when no checks exist', () => {
  assert.equal(allQualityChecksPass([]), false);
});

test('quality status is PASS only when every check passes', () => {
  assert.equal(allQualityChecksPass([{ status: 'PASS' }, { status: 'PASS' }]), true);
  assert.equal(allQualityChecksPass([{ status: 'PASS' }, { status: 'HOLD' }]), false);
});
