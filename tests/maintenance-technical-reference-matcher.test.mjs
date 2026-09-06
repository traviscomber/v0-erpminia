import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const matcher = fs.readFileSync('lib/maintenance/technical-reference-matcher.ts', 'utf8');
const readiness = fs.readFileSync('app/api/maintenance/data-readiness/route.ts', 'utf8');
const technicalSheet = fs.readFileSync('app/api/maintenance/assets/[id]/technical-sheet/route.ts', 'utf8');
const library = fs.readFileSync('lib/maintenance/technical-sheet-library.ts', 'utf8');

test('technical reference candidates require explicit identity signals instead of family fallback', () => {
  assert.match(matcher, /signalScore/);
  assert.match(matcher, /modelKey\.length >= 4/);
  assert.match(matcher, /sufficientlySpecific/);
  assert.match(matcher, /brandsCompatible/);
  assert.doesNotMatch(matcher, /family\?:|normalizedFamily|reference\.family\).*score/);
  assert.match(readiness, /resolveExplicitTechnicalReference\(recoveryText\)/);
  assert.match(technicalSheet, /resolveExplicitTechnicalReference\(assetText\)/);
});

test('known ambiguous fleet identities retain specific library references', () => {
  assert.match(library, /model: '928G'[\s\S]*?aliases: \['928g', '928 g', 'cat 928g'/);
  assert.match(library, /model: '938G'[\s\S]*?aliases: \['938g', 'cat 938g'/);
  assert.match(library, /model: '938H'[\s\S]*?aliases: \['938h', 'cat 938h'/);
  assert.match(library, /model: '938K'[\s\S]*?aliases: \['938k', 'cat 938k'/);
  assert.match(library, /brand: 'Ford'[\s\S]*?model: 'Transit'/);
  assert.match(library, /brand: 'Chevrolet'[\s\S]*?model: 'NKR Euro VI'/);
  assert.match(library, /brand: 'Mitsubishi Fuso'[\s\S]*?model: 'Canter'/);
});

test('candidate matching rejects explicit brand conflicts and preserves human validation boundary', () => {
  assert.match(matcher, /explicit\.length === 0/);
  assert.match(matcher, /explicit\.some\(\(group\) => group === referenceGroup\)/);
  assert.match(readiness, /requiere una señal explícita de modelo o alias/i);
  assert.match(readiness, /no materializa fabricante, modelo, tipo, criticidad, estado, ubicación ni especificaciones/i);
  assert.match(technicalSheet, /Only an explicit model or alias signal can propose an OEM\/model reference/);
  assert.match(technicalSheet, /cannot materialize specifications, preventive alerts, operational status, or canonical identity/);
});
