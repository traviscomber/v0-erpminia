import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL('../supabase/migrations/20260911024500_align_maintenance_execution_role_permissions.sql', import.meta.url);
const sql = await readFile(migrationPath, 'utf8');

test('terrain execution cargos receive only operational edit and document read access', () => {
  for (const cargo of [
    'Jefe de Taller Mina Don Jaime',
    'Jefe de Taller Mina Peumo',
    'Jefe de Taller Mina San Pedro',
    'Encargado de Camionetas y Camiones',
    'Soldador',
  ]) {
    assert.match(sql, new RegExp(cargo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(sql, /'mant_operaciones'::text, 'ED'::text/);
  assert.match(sql, /'mant_documentos'::text, 'LEC'::text/);
  assert.doesNotMatch(sql, /mant_gerencial/);
  assert.doesNotMatch(sql, /mant_recursos/);
  assert.doesNotMatch(sql, /fin_finanzas/);
  assert.match(sql, /on conflict \(cargo_id, module_key\)/i);
});
