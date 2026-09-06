import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const assistantUrl = new URL('../app/api/produccion/geologia/assistant/route.ts', import.meta.url);
const contextUrl = new URL('../lib/geology-ai/corevision-context.ts', import.meta.url);

test('Senior Assistant receives CoreVision context explicitly', async () => {
  const assistant = await readFile(assistantUrl, 'utf8');
  assert.match(assistant, /buildCoreVisionAssistantContext/);
  assert.match(assistant, /COREVISION — EVIDENCIA VISUAL VALIDADA \+ DESCUBRIMIENTO EXPLORATORIO/);
  assert.match(assistant, /validated: coreVision\.counts\.validated/);
});

test('validated human reviews and discovery candidates remain separate', async () => {
  const context = await readFile(contextUrl, 'utf8');
  assert.match(context, /\['validated', 'edited'\]/);
  assert.match(context, /image\.status !== 'validated' && image\.status !== 'rejected'/);
  assert.match(context, /discovery_candidate_pending_geologist_review/);
  assert.match(context, /validated_visual_evidence/);
  assert.match(context, /discovery_candidates/);
});

test('human correction is part of the CoreVision learning loop', async () => {
  const context = await readFile(contextUrl, 'utf8');
  const assistant = await readFile(assistantUrl, 'utf8');
  assert.match(context, /learning_corrections/);
  assert.match(context, /ai_suggested_interpretation/);
  assert.match(context, /geologist_labels/);
  assert.match(context, /geologist_comment/);
  assert.match(assistant, /La decisión\/corrección del geólogo prevalece/);
  assert.match(assistant, /learning_corrections/);
});

test('visual confidence can never be presented as geological probability', async () => {
  const context = await readFile(contextUrl, 'utf8');
  const assistant = await readFile(assistantUrl, 'utf8');
  assert.match(context, /no probabilidad geológica/i);
  assert.match(assistant, /Nunca presentes classification_confidence o visual_similarity_score como probabilidad geológica/);
  assert.match(assistant, /Ningún resultado CoreVision permite por sí solo concluir ley, continuidad, contacto, control estructural, dominio, recurso o reserva/);
});
