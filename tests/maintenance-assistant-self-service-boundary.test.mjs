import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const context = fs.readFileSync('lib/api/organization-context.ts', 'utf8');
const assistant = fs.readFileSync('app/api/maintenance/senior-assistant/route.ts', 'utf8');

test('maintenance assistant can persist only its own non-canonical conversation state', () => {
  assert.match(context, /maintenanceSelfServiceMutationPaths/);
  assert.match(context, /'\/api\/maintenance\/senior-assistant'/);
  assert.match(context, /!isMaintenanceSelfServiceMutation\(request\)/);
  assert.match(assistant, /requireModuleAccess\(request, MODULE_KEYS\.MANT_OPERACIONES\)/);
  assert.match(assistant, /READ\/PREPARE_ONLY/);
});

test('real maintenance mutations remain behind the legacy write-role boundary', () => {
  assert.match(context, /isMutation\(request, '\/api\/maintenance\/'\)/);
  assert.match(context, /maintenanceWriteRoles\.has\(role\)/);
});
