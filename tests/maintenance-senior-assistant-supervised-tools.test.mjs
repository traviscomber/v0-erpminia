import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const routePath = new URL('../app/api/maintenance/senior-assistant/route.ts', import.meta.url)
const wrapperPath = new URL('../lib/maintenance/senior-assistant-openai.ts', import.meta.url)
const loopPath = new URL('../lib/maintenance/openai-tool-loop.ts', import.meta.url)

test('operational assistant uses supervised tools while durable memory stays text-only', async () => {
  const [route, wrapper] = await Promise.all([
    readFile(routePath, 'utf8'),
    readFile(wrapperPath, 'utf8'),
  ])

  assert.match(route, /callMaintenanceOperationalAI/)
  assert.match(route, /context: canonical\.context/)
  assert.match(route, /available_evidence_counts/)
  assert.match(route, /PREPARE_ONLY puede estructurar un borrador de Decision Case/)
  assert.match(route, /no lo aprueba, no autoriza y no ejecuta ninguna acción/i)
  assert.match(route, /No muestres al usuario call_id/)

  assert.match(route, /extractDurableMemory/)
  assert.match(route, /model: process\.env\.OPENAI_MAINTENANCE_MEMORY_MODEL \|\| DEFAULT_MEMORY_MODEL/)
  assert.match(route, /const result = await callOpenAI\(\{/)

  assert.match(wrapper, /runMaintenanceOpenAIToolLoop/)
  assert.match(wrapper, /OPENAI_MAINTENANCE_MODEL/)
  assert.match(wrapper, /FALLBACK_MODELS/)
})

test('tool provenance is persisted and returned without exposing raw call ids', async () => {
  const route = await readFile(routePath, 'utf8')

  assert.match(route, /const toolsUsed = result\.toolAudit\.map\(\(\{ name, mode \}\) => \(\{ name, mode \}\)\)/)
  assert.match(route, /toolsUsed\.map\(\(tool\) => \(\{ tool: tool\.name, mode: tool\.mode \}\)\)/)
  assert.match(route, /source_refs: sourceRefs/)
  assert.match(route, /toolsUsed,/)
  assert.doesNotMatch(route, /call_id:/)
})

test('OpenAI loop preserves response items and returns matching function outputs', async () => {
  const loop = await readFile(loopPath, 'utf8')

  assert.match(loop, /const responseItems = Array\.isArray\(payload\?\.output\) \? payload\.output : \[\]/)
  assert.match(loop, /type: 'function_call_output'/)
  assert.match(loop, /call_id: call\.call_id/)
  assert.match(loop, /input: \[\.\.\.responseItems, \.\.\.toolOutputs\]/)
  assert.match(loop, /parallel_tool_calls: false/)
  assert.match(loop, /MAX_TOOL_ROUNDS = 4/)
})
