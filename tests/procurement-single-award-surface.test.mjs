import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const progressiveUrl = new URL('../components/procurement/progressive-procurement-workflow.tsx', import.meta.url);
const evidenceUrl = new URL('../components/procurement/award-evidence-panel.tsx', import.meta.url);

test('progressive procurement routes award intent to the canonical decision surface', async () => {
  const source = await readFile(progressiveUrl, 'utf8');

  assert.match(source, /document\.getElementById\('procurement-award-decision'\)/);
  assert.match(source, />Revisar adjudicación</);
  assert.doesNotMatch(source, /action:\s*'award_quotation'/);
  assert.doesNotMatch(source, /Confirmar adjudicación y emitir OC/);
});

test('canonical award evidence panel owns the decision anchor and structured reason capture', async () => {
  const source = await readFile(evidenceUrl, 'utf8');

  assert.match(source, /id="procurement-award-decision"/);
  assert.match(source, /Motivo principal/);
  assert.match(source, /body:\s*JSON\.stringify\(\{ quotationId: quote\.id, primaryReason, decisionNotes \}\)/);
  assert.match(source, /Adjudicar y emitir OC/);
});
