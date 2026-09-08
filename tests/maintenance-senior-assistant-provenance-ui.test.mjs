import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const componentPath = new URL('../components/maintenance/maintenance-senior-assistant.tsx', import.meta.url)

test('senior maintenance assistant surfaces sanitized evidence provenance', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /Evidencia consultada/)
  assert.match(source, /Consultas operacionales/)
  assert.match(source, /Fuentes canónicas/)
  assert.match(source, /Las consultas son de lectura o preparación\. La decisión y ejecución permanecen humanas\./)
  assert.match(source, /get_maintenance_attention_queue: 'Cola de atención'/)
  assert.match(source, /get_asset_context: 'Contexto del activo'/)
  assert.match(source, /prepare_maintenance_decision_case: 'Caso preparado'/)
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

test('assistant progress state explains that canonical evidence is being consulted', async () => {
  const source = await readFile(componentPath, 'utf8')

  assert.match(source, /Consultando evidencia canónica y contrastando señales/)
  assert.match(source, /SearchCheck/)
})
