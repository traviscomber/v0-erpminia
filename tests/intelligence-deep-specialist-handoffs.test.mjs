import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperUrl = new URL('../lib/intelligence/advisory-handoff-context.ts', import.meta.url);
const maintenanceUrl = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url);
const geologyUrl = new URL('../app/api/produccion/geologia/assistant/route.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('shared advisory loader supports Maintenance and Geology while remaining user and tenant scoped', async () => {
  const source = await read(helperUrl);
  assert.match(source, /'maintenance'/);
  assert.match(source, /'geology'/);
  assert.match(source, /\.eq\('organization_id', context\.organizationId\)/);
  assert.match(source, /\.eq\('created_by_user_id', context\.userId\)/);
  assert.match(source, /\.eq\('target_domain', targetDomain\)/);
  assert.match(source, /\.eq\('status', 'open'\)/);
  assert.match(source, /HANDOFF_REVIEW_HINT/);
});

test('Maintenance revalidates advisory cases through current canonical context and bounded tools', async () => {
  const source = await read(maintenanceUrl);
  assert.match(source, /loadSupportAdvisoryHandoffs\(context, 'maintenance', message\)/);
  assert.match(source, /supportAdvisoryHandoffPrompt/);
  assert.match(source, /HANDOFF ADVISORY es contexto NO CANÓNICO/);
  assert.match(source, /herramientas READ\/PREPARE_ONLY/);
  assert.match(source, /Un caso previo no confirma diagnóstico, causa raíz, criticidad, probabilidad de falla ni prioridad de intervención/);
  assert.match(source, /decisionCaseRefs: advisoryHandoffs\.map/);
  assert.match(source, /CONTEXTO CANÓNICO MOTIL/);
  assert.doesNotMatch(source, /\.from\('motil_ai_decision_cases'\)\s*\.update/);
});

test('Geology revalidates advisory cases against La Patagua provenance boundaries', async () => {
  const source = await read(geologyUrl);
  assert.match(source, /loadSupportAdvisoryHandoffs\(context, 'geology', message\)/);
  assert.match(source, /supportAdvisoryHandoffPrompt/);
  assert.match(source, /Decision Case es contexto NO CANÓNICO/);
  assert.match(source, /Nunca heredes desde el caso ley, continuidad, contacto, control estructural, dominio, orientación, recurso, reserva ni probabilidad geológica/);
  assert.match(source, /FRONTERA DE PROCEDENCIA DE INTERVALOS/);
  assert.match(source, /COREVISION — EVIDENCIA VISUAL VALIDADA/);
  assert.match(source, /decisionCaseRefs: advisoryHandoffs\.map/);
  assert.doesNotMatch(source, /\.from\('motil_ai_decision_cases'\)\s*\.update/);
});

test('deep specialist conversations and memories remain on their established stores', async () => {
  const [maintenance, geology] = await Promise.all([read(maintenanceUrl), read(geologyUrl)]);
  assert.match(maintenance, /maintenance_ai_conversations/);
  assert.match(maintenance, /maintenance_ai_messages/);
  assert.match(maintenance, /maintenance_ai_user_memory/);
  assert.match(geology, /geology_ai_conversations/);
  assert.match(geology, /geology_ai_messages/);
  assert.match(geology, /geology_ai_user_memory/);
  assert.doesNotMatch(maintenance, /resolveCoreConversation/);
  assert.doesNotMatch(geology, /resolveCoreConversation/);
});
