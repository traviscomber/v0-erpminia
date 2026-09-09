import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const memoryUiUrl = new URL('../components/intelligence/controlled-memory-popover.tsx', import.meta.url);
const assistantWidgetUrl = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url);

test('controlled memory stays inside the Senior Assistant and uses reversible deactivation', async () => {
  const memoryUi = await readFile(memoryUiUrl, 'utf8');
  const assistantWidget = await readFile(assistantWidgetUrl, 'utf8');

  assert.match(memoryUi, /fetch\('\/api\/intelligence\/memory'/);
  assert.match(memoryUi, /action: 'set_active'/);
  assert.match(memoryUi, /active: false/);
  assert.doesNotMatch(memoryUi, /method: 'DELETE'/);
  assert.match(memoryUi, /Lo que MOTIL recuerda/);
  assert.match(memoryUi, /Aún no hay recuerdos activos/);
  assert.match(memoryUi, /memory\.memory_text/);

  assert.match(assistantWidget, /ControlledMemoryPopover/);
  assert.match(assistantWidget, /showsControlledMemory \? <ControlledMemoryPopover \/> : null/);
});

test('shared memory is limited to the canonical cross-domain intelligence capabilities', async () => {
  const assistantWidget = await readFile(assistantWidgetUrl, 'utf8');
  const memoryUi = await readFile(memoryUiUrl, 'utf8');

  for (const domain of ['executive', 'inventory', 'procurement', 'production', 'finance', 'documents', 'data_health']) {
    assert.match(assistantWidget, new RegExp(`'${domain}'`));
  }

  const controlledDomainsBlock = assistantWidget.match(/const controlledMemoryDomains = new Set<string>\(\[([\s\S]*?)\]\);/)?.[1] || '';
  assert.doesNotMatch(controlledDomainsBlock, /'maintenance'/);
  assert.doesNotMatch(controlledDomainsBlock, /'geology'/);
  assert.doesNotMatch(memoryUi, /maintenance:\s*'/);
  assert.doesNotMatch(memoryUi, /geology:\s*'/);
});
