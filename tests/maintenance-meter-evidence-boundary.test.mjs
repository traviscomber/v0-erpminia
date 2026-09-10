import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const boardPath = new URL('../components/maintenance/preventive-plan-board.tsx', import.meta.url);

test('maintenance planning distinguishes operational readings from plan snapshots', async () => {
  const source = await readFile(boardPath, 'utf8');

  assert.match(source, /Lectura operacional/);
  assert.match(source, /Sin lectura operacional/);
  assert.match(source, /Revisar referencia del plan/);
  assert.match(source, /snapshot guardado en el plan, no de una lectura operacional vigente/);
  assert.match(source, /signal\.alert_due && observed/);
  assert.match(source, /signal\.alert_due && snapshotOnly/);
});

test('snapshot-only due state is not rendered as a confirmed destructive overdue', async () => {
  const source = await readFile(boardPath, 'utf8');

  const confirmedIndex = source.indexOf("signal.alert_due && observed ? <Badge variant=\"destructive\">Vencido por horas</Badge>");
  const referenceIndex = source.indexOf("signal.alert_due && snapshotOnly ? <Badge variant=\"secondary\">Revisar referencia del plan</Badge>");

  assert.notEqual(confirmedIndex, -1);
  assert.notEqual(referenceIndex, -1);
  assert.ok(referenceIndex > confirmedIndex);
});
