import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const documentsUrl = new URL('../app/api/documents/assistant/route.ts', import.meta.url);
const dataHealthUrl = new URL('../app/api/data-quality/assistant/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

for (const [label, url, target, refsPattern] of [
  ['Documents', documentsUrl, 'documents', /const refs = documentSourceRefs\(sources, toolsUsed\)/],
  ['Data Health', dataHealthUrl, 'data_health', /const canonicalRefs = dataHealthSourceRefs\(refs\)/],
]) {
  test(`${label} records advisory revalidation only after a grounded persisted answer`, async () => {
    const source = await read(url);
    assert.match(source, refsPattern);
    assert.match(source, /const persisted = await appendCoreMessage/);
    assert.match(source, /recordSupportAdvisoryRevalidation/);
    assert.match(source, new RegExp(`'${target}'`));
    assert.match(source, /decisionCaseRevalidation/);
  });
}

test('support metadata tracking does not mutate tenant-safe evidence sources', async () => {
  const [documents, dataHealth] = await Promise.all([read(documentsUrl), read(dataHealthUrl)]);
  assert.doesNotMatch(documents, /\.from\('documents'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(documents, /\.from\('contracts'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(dataHealth, /canonical_[^']+'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.match(documents, /READ_ONLY \+ tenant-safe/);
  assert.match(dataHealth, /READ_ONLY \+ permission-aware/);
});
