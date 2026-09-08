import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const widget = readFileSync(new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../components/layout/dashboard-shell.tsx', import.meta.url), 'utf8');

test('senior assistant follows the MOTIL semantic color contract', () => {
  assert.match(widget, /fill-primary/);
  assert.match(widget, /stroke-secondary/);
  assert.match(widget, /bg-card/);
  assert.doesNotMatch(widget, /gradient|blue-|purple-|violet-|#[0-9a-f]{3,8}/i);
});

test('senior assistant is mounted exactly once in the authenticated dashboard shell', () => {
  assert.match(shell, /SeniorAssistantWidget/);
  assert.equal((shell.match(/<SeniorAssistantWidget\s*\/>/g) || []).length, 1);
});

test('senior assistant exposes accessible contextual open and close controls', () => {
  assert.match(widget, /aria-expanded={open}/);
  assert.match(widget, /aria-label={`Cerrar \$\{context\.title\}`}/);
  assert.match(widget, /aria-label={open \? `Cerrar \$\{context\.title\}` : `Abrir \$\{context\.title\}`}/);
  assert.match(widget, /<span className="sr-only">{context\.title}<\/span>/);
});
