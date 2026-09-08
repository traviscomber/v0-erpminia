import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const widgetPath = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url)
const bodyPath = new URL('../components/intelligence/specialist-assistant-body.tsx', import.meta.url)

test('global senior assistant surfaces sanitized maintenance evidence provenance', async () => {
  const widget = await readFile(widgetPath, 'utf8')
  const body = await readFile(bodyPath, 'utf8')

  assert.match(body, /Canónico/)
  assert.match(widget, /get_maintenance_attention_queue: 'Cola de atención'/)
  assert.match(widget, /get_asset_context: 'Contexto del activo'/)
  assert.match(widget, /prepare_maintenance_decision_case: 'Caso preparado'/)
  assert.match(body, /Las recomendaciones se separan de la evidencia\. Las acciones operacionales requieren confirmación humana\./)
})

test('assistant UI keeps raw tool internals out of the rendered provenance surface', async () => {
  const source = await readFile(bodyPath, 'utf8')

  assert.match(source, /type SourceRef/)
  assert.match(source, /tool\?: string/)
  assert.match(source, /mode\?: 'read' \| 'prepare_only'/)
  assert.doesNotMatch(source, /call_id|tool arguments|raw JSON/i)
  assert.match(source, /payload\.toolsUsed/)
  assert.match(source, /uniqueEvidenceRefs/)
})

test('assistant progress state explains that canonical evidence is being analyzed', async () => {
  const source = await readFile(bodyPath, 'utf8')

  assert.match(source, /Analizando evidencia canónica/)
})
