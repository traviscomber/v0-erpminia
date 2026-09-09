import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/calidad-datos/page.tsx', import.meta.url);

test('data quality never renders unavailable reconciliation counts as zero', async () => {
  const source = await readFile(pageUrl, 'utf8');
  assert.match(source, /const sourceUnavailable = isLoading \|\| Boolean\(error\) \|\| !counts/);
  assert.match(source, /sourceUnavailable \|\| value == null \? '—'/);
  assert.match(source, /Cola de conciliación · \{sourceUnavailable \? '—'/);
  assert.doesNotMatch(source, /counts\?\.total_records \|\| 0/);
  assert.doesNotMatch(source, /counts\?\.active_issues \|\| 0/);
});
