import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const evidenceUrl = new URL('../components/production/geologia-hole-evidence-readiness.tsx', import.meta.url);
const workspaceUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);

test('hole dossier shows known facts first and keeps source gaps separate from quality or task semantics', async () => {
  const source = await readFile(evidenceUrl, 'utf8');
  const workspace = await readFile(workspaceUrl, 'utf8');

  assert.match(source, /Expediente geológico del sondaje canónico/);
  assert.match(source, /Primero se muestran hechos presentes en la fuente/);
  assert.match(source, /Profundidad perforada/);
  assert.match(source, /Procedencia/);
  assert.match(source, /Evidencia técnica acreditada/);
  assert.match(source, /Límites de la fuente actual/);
  assert.match(source, /no se interpreta como defecto del sondaje ni como trabajo pendiente/i);
  assert.match(source, /no se convierte en una tarea automática ni en un score de calidad/i);
  assert.match(workspace, /geologia-holes-focus aside > section:first-child/);
  assert.doesNotMatch(source, /Preparación de evidencia/);
  assert.doesNotMatch(source, /Siguiente acción de datos/);
  assert.doesNotMatch(source, /readiness/);
  assert.doesNotMatch(source, />Pendiente</);
});

test('hole map is hidden only while the current source has no georeferenced collars', async () => {
  const workspace = await readFile(workspaceUrl, 'utf8');

  assert.match(workspace, /section:first-child:has\(\.border-dashed\)/);
  assert.match(workspace, /geologia-holes-focus/);
  assert.doesNotMatch(workspace, /Mapa de sondajes[^]*display:\s*none/i);
});
