import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const continuityUrl = new URL('../lib/intelligence/core-conversation.ts', import.meta.url);
const executiveUrl = new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260908150000_add_motil_ai_core_continuity.sql', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Intelligence Core continuity is isolated by organization, user and domain', async () => {
  const source = await read(continuityUrl);
  assert.match(source, /\.eq\('organization_id', scope\.organizationId\)/);
  assert.match(source, /\.eq\('user_id', scope\.userId\)/);
  assert.match(source, /\.eq\('domain', scope\.domain\)/);
  assert.match(source, /motil_ai_conversations/);
  assert.match(source, /motil_ai_messages/);
});

test('core continuity v1 persists transcript but does not learn durable memory automatically', async () => {
  const source = await read(continuityUrl);
  assert.match(source, /memoryCount: 0/);
  assert.doesNotMatch(source, /from\('motil_ai_user_memory'\)/);
  assert.doesNotMatch(source, /memory_type:/);
});

test('Executive assistant separates non-canonical transcript from canonical evidence', async () => {
  const source = await read(executiveUrl);
  assert.match(source, /HISTORIAL CONVERSACIONAL es contexto no canónico/);
  assert.match(source, /HISTORIAL CONVERSACIONAL NO CANÓNICO/);
  assert.match(source, /EVIDENCIA MOTIL CANÓNICA\/AUTORIZADA/);
  assert.match(source, /core_continuity_v1/);
  assert.match(source, /getCoreConversationHistory/);
  assert.match(source, /appendCoreMessage/);
});

test('Executive operational policy remains read only while conversation metadata can be archived', async () => {
  const [route, continuity] = await Promise.all([read(executiveUrl), read(continuityUrl)]);
  assert.match(route, /route\.mode === 'action'/);
  assert.match(route, /no ejecuta aprobaciones, compras, cierres, ajustes ni otras mutaciones/);
  assert.match(continuity, /status: 'archived'/);
  assert.doesNotMatch(route, /\.from\('canonical_[^']+'\)\s*\.update\(/);
  assert.doesNotMatch(route, /\.from\('canonical_[^']+'\)\s*\.insert\(/);
});

test('continuity schema declares the generic core domains and non-canonical boundary', async () => {
  const migration = await read(migrationUrl);
  for (const domain of ['executive', 'inventory', 'procurement', 'production', 'finance', 'documents', 'data_health']) {
    assert.match(migration, new RegExp(`'${domain}'::text`));
  }
  assert.match(migration, /Never an operational source of truth/);
  assert.match(migration, /enable row level security/);
});
