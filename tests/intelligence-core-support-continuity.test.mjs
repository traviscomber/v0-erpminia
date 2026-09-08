import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const documentsUrl = new URL('../app/api/documents/assistant/route.ts', import.meta.url);
const dataHealthUrl = new URL('../app/api/data-quality/assistant/route.ts', import.meta.url);
const continuityUrl = new URL('../lib/intelligence/core-conversation.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Documents and Data Health use scoped Intelligence Core continuity', async () => {
  const [documents, dataHealth] = await Promise.all([read(documentsUrl), read(dataHealthUrl)]);
  for (const route of [documents, dataHealth]) {
    assert.match(route, /getCoreConversationState/);
    assert.match(route, /resolveCoreConversation/);
    assert.match(route, /getCoreConversationHistory/);
    assert.match(route, /appendCoreMessage/);
    assert.match(route, /archiveCoreConversation/);
    assert.match(route, /core_continuity_v1/);
  }
  assert.match(documents, /domain: 'documents'/);
  assert.match(dataHealth, /domain: 'data_health'/);
});

test('Documents keeps conversation history separate from tenant-safe canonical document evidence', async () => {
  const source = await read(documentsUrl);
  assert.match(source, /HISTORIAL CONVERSACIONAL es contexto NO CANÓNICO/);
  assert.match(source, /una mención previa nunca prueba que un documento exista ni cuál sea su estado actual/);
  assert.match(source, /EVIDENCIA MOTIL CANÓNICA\/AUTORIZADA/);
  assert.match(source, /\.from\('documents'\)/);
  assert.match(source, /\.from\('contracts'\)/);
  assert.match(source, /\.eq\('organization_id', org\)/);
  assert.match(source, /unavailable_tenant_safe_document_domains/);
  assert.doesNotMatch(source, /motil_ai_user_memory/);
});

test('Data Health never promotes prior warnings or diagnoses into current data-quality state', async () => {
  const source = await read(dataHealthUrl);
  assert.match(source, /HISTORIAL CONVERSACIONAL es contexto NO CANÓNICO/);
  assert.match(source, /una advertencia o diagnóstico previo nunca representa el estado actual sin nueva evidencia MOTIL/);
  assert.match(source, /EVIDENCIA MOTIL CANÓNICA\/AUTORIZADA/);
  assert.match(source, /Diferencia calidad, frescura, cobertura, conciliación e inconsistencia/);
  assert.match(source, /Un warning, excepción o cola de revisión no es automáticamente un error operativo ni una causa raíz/);
  assert.doesNotMatch(source, /motil_ai_user_memory/);
});

test('support specialists remain read only while only conversation metadata is persisted', async () => {
  const [documents, dataHealth, continuity] = await Promise.all([
    read(documentsUrl),
    read(dataHealthUrl),
    read(continuityUrl),
  ]);
  assert.match(documents, /READ_ONLY/);
  assert.match(dataHealth, /READ_ONLY/);
  assert.match(continuity, /motil_ai_conversations/);
  assert.match(continuity, /motil_ai_messages/);
  assert.doesNotMatch(documents, /\.from\('documents'\)\s*\.update\(/);
  assert.doesNotMatch(documents, /\.from\('contracts'\)\s*\.update\(/);
  assert.doesNotMatch(dataHealth, /\.from\('canonical_[^']+'\)\s*\.update\(/);
  assert.doesNotMatch(dataHealth, /\.from\('canonical_[^']+'\)\s*\.insert\(/);
});

test('refusals are persisted without granting action authority', async () => {
  const [documents, dataHealth] = await Promise.all([read(documentsUrl), read(dataHealthUrl)]);
  assert.match(documents, /route\.mode === 'action' \|\| route\.requiresExplicitAuthorization/);
  assert.match(dataHealth, /route\.mode === 'action' \|\| route\.requiresExplicitAuthorization/);
  assert.match(documents, /no aprueba, reemplaza, sube ni modifica documentos/);
  assert.match(dataHealth, /no corrige, concilia ni modifica fuentes/);
  assert.match(documents, /role: 'assistant'/);
  assert.match(dataHealth, /role: 'assistant'/);
});
