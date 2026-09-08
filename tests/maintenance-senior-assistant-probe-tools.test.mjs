import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const probePath = new URL('../app/api/maintenance/senior-assistant/probe/route.ts', import.meta.url)

test('maintenance assistant probe remains ephemeral and exposes only sanitized tool provenance', async () => {
  const probe = await readFile(probePath, 'utf8')

  assert.match(probe, /ephemeral: true/)
  assert.match(probe, /toolsUsed/)
  assert.match(probe, /\{ name: tool\.name, mode: tool\.mode \}/)
  assert.match(probe, /\['read', 'prepare_only'\]/)
  assert.doesNotMatch(probe, /arguments|call_id|canonical_fact|evidence_for/)
})
