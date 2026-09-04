import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../app/api/produccion/geologia/assistant/route.ts', import.meta.url);
const organizationContextUrl = new URL('../lib/api/organization-context.ts', import.meta.url);
const contextUrl = new URL('../lib/geology-ai/canonical-context.ts', import.meta.url);
const promptUrl = new URL('../lib/geology-ai/prompt.ts', import.meta.url);
const chatUrl = new URL('../components/production/geologia-ai-floating-chat.tsx', import.meta.url);
const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260904173000_add_geology_ai_conversations.sql', import.meta.url);

test('geology AI uses server-side OPENAI_API_KEY directly and enforces geology access', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /requireModuleAccess\(request, MODULE_KEYS\.PROD_GEOLOGIA\)/);
  assert.match(route, /process\.env\.OPENAI_API_KEY/);
  assert.match(route, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(route, /Authorization: `Bearer \$\{apiKey\}`/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_OPENAI/i);
});

test('geology assistant POST is a scoped self-service write, not a production operation write', async () => {
  const orgContext = await readFile(organizationContextUrl, 'utf8');
  assert.match(orgContext, /productionSelfServiceMutationPaths/);
  assert.match(orgContext, /'\/api\/produccion\/geologia\/assistant'/);
  assert.match(orgContext, /!isProductionSelfServiceMutation\(request\)/);
  assert.match(orgContext, /Forbidden: production write role required/);
});

test('floating geology chat is fixed, transparent, alive, accessible and never exposes the OpenAI key', async () => {
  const [chat, shell] = await Promise.all([readFile(chatUrl, 'utf8'), readFile(shellUrl, 'utf8')]);
  assert.match(chat, /fixed bottom-4 right-4/);
  assert.match(chat, /bg-transparent/);
  assert.match(chat, /border-0/);
  assert.match(chat, /geology-ai-launcher/);
  assert.match(chat, /geology-ai-alive/);
  assert.match(chat, /geology-ai-aura/);
  assert.match(chat, /aria-label="Abrir Asistente Senior de Geología"/);
  assert.match(chat, /GeologyAiIcon/);
  assert.match(chat, /\/api\/produccion\/geologia\/assistant/);
  assert.doesNotMatch(chat, /OPENAI_API_KEY/);
  assert.doesNotMatch(shell, /GEOLOGY_CHAT_ICON|data:image\/webp|background-image/);
  assert.match(shell, /GeologiaAiFloatingChat/);
});

test('agent canonical context is tenant scoped and La Patagua only', async () => {
  const context = await readFile(contextUrl, 'utf8');
  for (const source of [
    'production_drilling_source_reports',
    'production_drill_holes',
    'production_chemistry_samples',
    'production_chemistry_results',
    'production_monthly_plans',
    'production_monthly_plan_lines',
    'production_metallurgy_automatic_v1',
  ]) {
    assert.match(context, new RegExp(source));
  }
  assert.match(context, /eq\('organization_id', organizationId\)/);
  assert.match(context, /chronology: 'newest_first'/);
  assert.match(context, /La Patagua canonical only/);
  assert.doesNotMatch(context, /SERNAGEOMIN/i);
});

test('senior geology policy separates canonical facts, interpretation and recommendation', async () => {
  const prompt = await readFile(promptUrl, 'utf8');
  assert.match(prompt, /DATO CANÓNICO/);
  assert.match(prompt, /INTERPRETACIÓN PROFESIONAL/);
  assert.match(prompt, /RECOMENDACIÓN/);
  assert.match(prompt, /No inventes litología/);
  assert.match(prompt, /ley cabeza mina, ley programada, ley ingeniería, ley geológica/);
  assert.match(prompt, /cargo del usuario/);
});

test('conversation memory is isolated by organization and user', async () => {
  const migration = await readFile(migrationUrl, 'utf8');
  assert.match(migration, /geology_ai_conversations/);
  assert.match(migration, /geology_ai_messages/);
  assert.match(migration, /geology_ai_user_memory/);
  assert.match(migration, /organization_id uuid not null/);
  assert.match(migration, /user_id uuid not null/);
  assert.match(migration, /user-authored conversation turns|user-specific working context/i);
});
