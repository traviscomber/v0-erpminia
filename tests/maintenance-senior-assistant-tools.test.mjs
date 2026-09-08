import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const toolsPath = new URL('../lib/maintenance/senior-assistant-tools.ts', import.meta.url)

test('senior maintenance tool registry exposes only READ and PREPARE_ONLY capabilities', async () => {
  const source = await readFile(toolsPath, 'utf8')

  assert.match(source, /MaintenanceSeniorToolMode = 'read' \| 'prepare_only'/)
  assert.match(source, /search_assets/)
  assert.match(source, /get_maintenance_attention_queue/)
  assert.match(source, /get_maintenance_attention_context/)
  assert.match(source, /get_asset_context/)
  assert.match(source, /get_asset_context_batch/)
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

test('batch asset context remains read-only and strictly bounded', async () => {
  const source = await readFile(toolsPath, 'utf8')

  assert.match(source, /name: 'get_asset_context_batch'/)
  assert.match(source, /maxItems: 8/)
  assert.match(source, /máximo de 8 activos por llamada/i)
  assert.match(source, /PREFIERE esta herramienta para comparar varios activos/i)
  assert.match(source, /canonicalAssetIds\.map\(\(canonicalAssetId\) => assetContext\(canonicalAssetId, context\)\)/)
  assert.match(source, /get_asset_context_batch: 'read'/)
})

test('attention context combines ranking and canonical evidence without expanding authority', async () => {
  const source = await readFile(toolsPath, 'utf8')

  assert.match(source, /name: 'get_maintenance_attention_context'/)
  assert.match(source, /maximum: 8/)
  assert.match(source, /PREFIERE esta herramienta para preguntas multi-activo/i)
  assert.match(source, /get_maintenance_attention_context: 'read'/)
  assert.match(source, /maintenanceAttentionRows\(limit, context\)/)
  assert.match(source, /context: assetContext\(attention\.canonical_asset_id, context\)/)
  assert.match(source, /NO es probabilidad de falla, diagnóstico, criticidad OEM ni autorización de prioridad/i)
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
  assert.match(source, /function requireAssetIds/)
  assert.match(source, /function byAsset/)
  assert.match(source, /function assetContext/)
  assert.match(source, /canonical_asset_id es obligatorio/)
  assert.match(source, /Herramienta no permitida/)
  assert.match(source, /Frecuencia observada en reportes; NO es probabilidad de falla/i)
  assert.match(source, /Score operacional determinístico para ordenar revisión humana/)
  assert.match(source, /NO es probabilidad de falla, criticidad OEM ni diagnóstico/i)
  assert.doesNotMatch(source, /Math\.random|failure_probability/i)
})
