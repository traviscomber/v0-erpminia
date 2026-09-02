import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migration = 'supabase/migrations/20260902043500_capture_runtime_evidence_on_all_work_order_closures.sql';

test('closure audit captures runtime evidence whenever it exists', async () => {
  const sql = await readFile(migration, 'utf8');
  assert.match(sql, /from public\.work_order_runtime_evidence re/);
  assert.match(sql, /v_has_runtime_evidence := found/);
  assert.match(sql, /'runtime_evidence_status',v_runtime_evidence_status/);
  assert.match(sql, /'runtime_reading_id',v_runtime_reading_id/);
});

test('corrective orders still require runtime evidence in Spanish and canonical English type', async () => {
  const sql = await readFile(migration, 'utf8');
  assert.match(sql, /in \('correctivo','corrective'\) and not v_has_runtime_evidence/);
  assert.match(sql, /Registra el horómetro o documenta por qué no está disponible antes de cerrar/);
});
