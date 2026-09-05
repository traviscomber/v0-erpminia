import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const canonicalUrl = new URL('../lib/geology-ai/canonical-context.ts', import.meta.url);
const promptUrl = new URL('../lib/geology-ai/prompt.ts', import.meta.url);

test('geology assistant receives the same current-year and reconciliation truth as the UI', async () => {
  const [canonical, prompt] = await Promise.all([
    readFile(canonicalUrl, 'utf8'),
    readFile(promptUrl, 'utf8'),
  ]);

  assert.match(canonical, /production_drill_hole_location_review_queue_v5/);
  assert.match(canonical, /\.order\('operational_priority', \{ ascending: true \}\)/);
  assert.doesNotMatch(canonical.match(/production_drill_hole_location_review_queue_v5[\s\S]*?\n\s*\],/)?.[0] || '', /\.limit\(/);
  assert.match(canonical, /year_snapshot: currentYearSnapshot/);
  assert.match(canonical, /pending_reconciliation_count: unresolvedReview\.length/);
  assert.match(canonical, /top_pending_reconciliation/);
  assert.match(canonical, /pending_reconciliation: pendingReconciliation/);
  assert.match(canonical, /with_mine/);
  assert.match(canonical, /with_sector/);
  assert.match(canonical, /with_depth/);
  assert.match(canonical, /source_inclination/);
  assert.match(prompt, /latest-first/i);
});
