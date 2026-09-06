import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promptUrl = new URL('../lib/geology-ai/prompt.ts', import.meta.url);
const externalUrl = new URL('../lib/geology-ai/external-context.ts', import.meta.url);

test('SERNAGEOMIN context remains district/regional and never becomes local canonical evidence', async () => {
  const prompt = await readFile(promptUrl, 'utf8');
  assert.match(prompt, /CONTEXTO GEOLÓGICO REGIONAL — SERNAGEOMIN/);
  assert.match(prompt, /compatible con el contexto distrital descrito/i);
  assert.match(prompt, /No permite decir que la observación pertenece al mismo sistema/i);
  assert.match(prompt, /NO-SE, N-S, NE-SO y subordinadamente E-O/);
  assert.match(prompt, /NO reemplaza collares, elevaciones, CRS ni coordenadas de sondajes/i);
});

test('external geology context admits only human-verified source records', async () => {
  const source = await readFile(externalUrl, 'utf8');
  assert.match(source, /TRUSTED_STATUSES/);
  assert.match(source, /verified/);
  assert.match(source, /validated/);
  assert.match(source, /approved/);
  assert.match(source, /Regional\/district context only/);
  assert.match(source, /cannot prove a local lithology, structure, mineralized control, continuity, grade, domain, resource or reserve/i);
});
