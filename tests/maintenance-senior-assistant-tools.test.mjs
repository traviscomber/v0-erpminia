import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const toolsPath = new URL('../lib/maintenance/senior-assistant-tools.ts', import.meta.url)

test('senior maintenance tool registry exposes only READ and PREPARE_ONLY capabilities', async () => {
  const source = await readFile(toolsPath, 'utf8')

  assert.match(source, /MaintenanceSeniorToolMode = 'read' \| 'prepare_only'/)
  assert.match(source, /search_assets/)
  assert.match(source, /get_maintenance_attention_queue/)
  assert.match(source, /get_asset_context/)
  assert.match(source, /get_open_work_orders/)
  assert.match(source, /get_maintenance_plan/)
  assert.match(source, /get_observed_condition_history/)
  assert.match(source, /get_closure_readiness/)
  assert.match(source, /prepare_maintenance_decision_case/)

  assert.doesNotMatch(source, /approve_work_order/)
  assert.doesNotMatch(source, /close_work_order/)
  assert.doesNotMatch(source, /execute_work_order/)
  assert.doesNotMatch(source, /prioritize_work_order/)
  assert.doesNotMatch(source, /general_sql|execute_sql|raw_sql/i)
})

test('prepared maintenance decision cases remain derived and human-controlled', async () => {
  const source = await readFile(toolsPath, 'utf8')

  assert.match(source, /decision_state: 'awaiting_human_review'/)
  assert.match(source, /execution_policy: 'human_only'/)
  assert.match(source, /mode: 'prepare_only'/)
  assert.match(source, /expected: null/)
  assert.match(source, /observed: null/)
  assert.match(source, /status: 'not_measured'/)
  assert.match(source, /No persiste verdad operacional|no aprueba y no ejecuta/i)
})

test('READ tools stay bounded to canonical context and discovery remains non-probabilistic', async () => {
  const source = await readFile(toolsPath, 'utf8')

  assert.match(source, /function requireAssetId/)
  assert.match(source, /function byAsset/)
  assert.match(source, /canonical_asset_id es obligatorio/)
  assert.match(source, /Herramienta no permitida/)
  assert.match(source, /Frecuencia observada en reportes; NO es probabilidad de falla/i)
  assert.match(source, /Score operacional determinístico para ordenar revisión humana/)
  assert.match(source, /NO es probabilidad de falla, criticidad OEM ni diagnóstico/i)
  assert.doesNotMatch(source, /Math\.random|probability|failure_probability/i)
})
