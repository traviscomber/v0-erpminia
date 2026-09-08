import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const loopPath = new URL('../lib/maintenance/openai-tool-loop.ts', import.meta.url)

test('maintenance OpenAI tool loop uses only the bounded registry and returns tool outputs by call id', async () => {
  const source = await readFile(loopPath, 'utf8')

  assert.match(source, /tools: maintenanceSeniorTools/)
  assert.match(source, /tool_choice: 'auto'/)
  assert.match(source, /parallel_tool_calls: true/)
  assert.match(source, /executeMaintenanceSeniorTool/)
  assert.match(source, /type: 'function_call_output'/)
  assert.match(source, /call_id: call\.call_id/)
})

test('reasoning/output items are preserved and parallel multi-step tool use stays bounded', async () => {
  const source = await readFile(loopPath, 'utf8')

  assert.match(source, /Preserve every output item, including reasoning items/)
  assert.match(source, /payload\.output \|\| \[\]/)
  assert.match(source, /MAX_TOOL_ROUNDS = 8/)
  assert.match(source, /MAX_TOOL_CALLS = 12/)
  assert.match(source, /totalToolCalls \+ calls\.length > MAX_TOOL_CALLS/)
  assert.match(source, /resultCache/)
  assert.match(source, /Multiple bounded READ\/PREPARE_ONLY calls may be requested in one model round/)
})

test('tool loop does not expose an autonomous write path', async () => {
  const source = await readFile(loopPath, 'utf8')

  assert.doesNotMatch(source, /approve_work_order|close_work_order|execute_work_order|execute_sql|raw_sql/i)
  assert.match(source, /toolAudit/)
})
