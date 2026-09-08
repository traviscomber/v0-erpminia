import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wrapperUrl = new URL('../lib/intelligence/persistent-operational-domain-assistant.ts', import.meta.url);
const inventoryUrl = new URL('../app/api/inventory/assistant/route.ts', import.meta.url);
const procurementUrl = new URL('../app/api/procurement/assistant/route.ts', import.meta.url);
const productionUrl = new URL('../app/api/production/assistant/route.ts', import.meta.url);
const financeUrl = new URL('../app/api/finance/assistant/route.ts', import.meta.url);
const runtimeUrl = new URL('../lib/intelligence/operational-domain-assistant.ts', import.meta.url);
const read = (url) => readFile(url, 'utf8');

test('Inventory and Procurement opt into scoped Core continuity without enabling it for Production or Finance yet', async () => {
  const [inventory, procurement, production, finance] = await Promise.all([
    read(inventoryUrl),
    read(procurementUrl),
    read(productionUrl),
    read(financeUrl),
  ]);

  assert.match(inventory, /handlePersistentOperationalDomainAssistant/);
  assert.match(procurement, /handlePersistentOperationalDomainAssistant/);
  assert.doesNotMatch(production, /handlePersistentOperationalDomainAssistant/);
  assert.doesNotMatch(finance, /handlePersistentOperationalDomainAssistant/);
});

test('supply continuity is isolated by organization user and local domain through the Core helper', async () => {
  const wrapper = await read(wrapperUrl);
  assert.match(wrapper, /scopeFor\(context, domain\)/);
  assert.match(wrapper, /organizationId: context\.organizationId/);
  assert.match(wrapper, /userId: context\.userId/);
  assert.match(wrapper, /domain,/);
  assert.match(wrapper, /getCoreConversationState/);
  assert.match(wrapper, /resolveCoreConversation/);
  assert.match(wrapper, /archiveCoreConversation/);
  assert.match(wrapper, /appendCoreMessage/);
  assert.match(wrapper, /core_continuity_v1/);
});

test('conversation history remains non-canonical and is only allowed to resolve follow-up references', async () => {
  const wrapper = await read(wrapperUrl);
  assert.match(wrapper, /HISTORIAL es contexto conversacional NO CANÓNICO/);
  assert.match(wrapper, /úsalo sólo para resolver referencias, nombres de temas, entidades o intención/);
  assert.match(wrapper, /No copies cifras, estados, causas, prioridades ni afirmaciones operacionales del historial como hechos/);
  assert.match(wrapper, /continuityPolicy:/);
  assert.doesNotMatch(wrapper, /motil_ai_user_memory/);
  assert.doesNotMatch(wrapper, /memory_type/);
});

test('canonical operational runtime remains the answer authority and read-only policy is preserved', async () => {
  const [wrapper, runtime] = await Promise.all([read(wrapperUrl), read(runtimeUrl)]);
  assert.match(wrapper, /handleOperationalDomainAssistant/);
  assert.match(wrapper, /allowedDomains: args\.allowedDomains/);
  assert.match(runtime, /READ_ONLY/);
  assert.match(runtime, /evidencia canónica/i);
  assert.doesNotMatch(wrapper, /\.from\('canonical_[^']+'\)\s*\.update\(/);
  assert.doesNotMatch(wrapper, /\.from\('canonical_[^']+'\)\s*\.insert\(/);
});

test('follow-up rewrite fails closed to the original user question', async () => {
  const wrapper = await read(wrapperUrl);
  assert.match(wrapper, /if \(!history\.length \|\| !FOLLOW_UP_HINT\.test\(message\)\) return message/);
  assert.match(wrapper, /if \(!apiKey\) return message/);
  assert.match(wrapper, /catch \{\s*return message;\s*\}/);
  assert.match(wrapper, /if \(!rewritten \|\| rewritten\.length > MAX_MESSAGE_CHARS\) return message/);
});
