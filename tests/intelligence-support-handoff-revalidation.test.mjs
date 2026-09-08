import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperUrl = new URL('../lib/intelligence/advisory-handoff-context.ts', import.meta.url);
const documentsUrl = new URL('../app/api/documents/assistant/route.ts', import.meta.url);
const dataHealthUrl = new URL('../app/api/data-quality/assistant/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('support handoff loader is tenant user target and status scoped', async () => {
  const helper = await read(helperUrl);
  assert.match(helper, /\.from\('motil_ai_decision_cases'\)/);
  assert.match(helper, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(helper, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(helper, /\.eq\('target_domain', targetDomain\)/);
  assert.match(helper, /\.eq\('status', 'open'\)/);
  assert.match(helper, /\.limit\(3\)/);
  assert.doesNotMatch(helper, /\.(insert|update|delete)\(/);
});

test('Documents revalidates advisory context only against tenant-safe document evidence', async () => {
  const source = await read(documentsUrl);
  assert.match(source, /loadSupportAdvisoryHandoffs\(context, 'documents', message\)/);
  assert.match(source, /HANDOFF ADVISORY es contexto NO CANÓNICO/);
  assert.match(source, /Nunca acredita existencia, vigencia, vencimiento, aprobación, renovación, cumplimiento ni prioridad documental/);
  assert.match(source, /Un caso previo nunca prueba que un documento o contrato exista/);
  assert.match(source, /\.from\('documents'\)/);
  assert.match(source, /\.from\('contracts'\)/);
  assert.match(source, /\.eq\('organization_id', org\)/);
  assert.match(source, /sourceRefs: documentSourceRefs\(sources, toolsUsed\)/);
  assert.match(source, /decisionCaseRefs: advisoryHandoffs\.map/);
  assert.doesNotMatch(source, /sourceRefs:\s*advisoryHandoffs/);
});

test('Data Health treats prior findings as hypotheses to recheck rather than current state', async () => {
  const source = await read(dataHealthUrl);
  assert.match(source, /loadSupportAdvisoryHandoffs\(context, 'data_health', message\)/);
  assert.match(source, /HANDOFF ADVISORY es contexto NO CANÓNICO/);
  assert.match(source, /Nunca transforma un warning, diagnóstico o inconsistencia previa en estado actual/);
  assert.match(source, /Una advertencia, inconsistencia o diagnóstico previo nunca representa la calidad, frescura, cobertura o conciliación actual/);
  assert.match(source, /sourceRefs: dataHealthSourceRefs\(refs\)/);
  assert.match(source, /decisionCaseRefs: advisoryHandoffs\.map/);
  assert.doesNotMatch(source, /sourceRefs:\s*advisoryHandoffs/);
});

test('support assistants remain read only while revalidating handoffs', async () => {
  const [documents, dataHealth] = await Promise.all([read(documentsUrl), read(dataHealthUrl)]);
  assert.match(documents, /READ_ONLY/);
  assert.match(dataHealth, /READ_ONLY/);
  assert.doesNotMatch(documents, /\.from\('documents'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(documents, /\.from\('contracts'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(dataHealth, /\.from\('motil_ai_decision_cases'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
  assert.doesNotMatch(dataHealth, /canonical_[^']+'\)[\s\S]{0,220}\.(insert|update|delete)\(/);
});
