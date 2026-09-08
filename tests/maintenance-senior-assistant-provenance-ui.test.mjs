import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url)

test('global senior assistant surfaces sanitized maintenance evidence provenance', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /Canónico/)
  assert.match(source, /get_maintenance_attention_queue: 'Cola de atención'/)
  assert.match(source, /get_asset_context: 'Contexto del activo'/)
  assert.match(source, /prepare_maintenance_decision_case: 'Caso preparado'/)
  assert.match(source, /Las recomendaciones se separan de la evidencia\. Las acciones operacionales requieren confirmación humana\./)
})

test('assistant UI keeps raw tool internals out of the rendered provenance surface', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /type SourceRef/)
  assert.match(source, /tool\?: string/)
  assert.match(source, /mode\?: 'read' \| 'prepare_only'/)
  assert.doesNotMatch(source, /call_id|tool arguments|raw JSON/i)
  assert.match(source, /payload\.toolsUsed/)
  assert.match(source, /uniqueToolRefs/)
})

test('assistant progress state explains that canonical evidence is being analyzed', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /Analizando evidencia canónica/)
})
