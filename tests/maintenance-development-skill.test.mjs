import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../skills/motil-maintenance-development/', import.meta.url);

const read = (path) => readFile(new URL(path, base), 'utf8');

test('MOTIL maintenance development skill has valid trigger metadata and no placeholders', async () => {
  const skill = await read('SKILL.md');
  assert.match(skill, /^---\nname: motil-maintenance-development\ndescription:/);
  assert.match(skill, /MOTIL Maintenance/);
  assert.match(skill, /DESIGN\.md/);
  assert.doesNotMatch(skill, /\bTODO\b/);
});

test('maintenance skill encodes canonical truth, human authority, security and release gates', async () => {
  const skill = await read('SKILL.md');
  for (const phrase of ['canonical', 'human', 'organization_id', 'RLS', 'PASS', 'HOLD', 'BLOCK']) {
    assert.match(skill.toLowerCase(), new RegExp(phrase.toLowerCase()));
  }
});

test('maintenance skill includes the required modular references', async () => {
  const files = [
    'references/maintenance-domain.md',
    'references/canonical-data.md',
    'references/ui-design.md',
    'references/ai-assistant.md',
    'references/release-workflow.md',
    'references/quality-standard.md',
  ];
  const contents = await Promise.all(files.map(read));
  for (const content of contents) assert.ok(content.trim().length > 500);
});

test('assistant reference keeps memory separate from canonical operational truth', async () => {
  const assistant = await read('references/ai-assistant.md');
  assert.match(assistant, /maintenance_ai_conversations/);
  assert.match(assistant, /maintenance_ai_messages/);
  assert.match(assistant, /maintenance_ai_user_memory/);
  assert.match(assistant, /must not override canonical operational data/i);
  assert.match(assistant, /Do not claim model weights are fine-tuned/i);
});
