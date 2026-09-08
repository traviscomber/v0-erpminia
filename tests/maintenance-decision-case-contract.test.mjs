import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const routePath = new URL('../app/api/maintenance/decision-intelligence/route.ts', import.meta.url)
const contractPath = new URL('../lib/maintenance/decision-case.ts', import.meta.url)
const pagePath = new URL('../app/dashboard/mantenimiento/decision-intelligence/page.tsx', import.meta.url)

test('maintenance decision intelligence exposes derived cases without autonomous writes', async () => {
  const [route, contract] = await Promise.all([
    readFile(routePath, 'utf8'),
    readFile(contractPath, 'utf8'),
  ])

  assert.match(route, /buildMaintenanceDecisionCase/)
  assert.match(route, /const cases = rows\.map/)
  assert.match(route, /execution: 'human_only'/)
  assert.match(route, /persistence: 'derived_from_canonical_signals'/)
  assert.doesNotMatch(route, /export async function POST/)

  assert.match(contract, /decision_state: 'awaiting_human_review'/)
  assert.match(contract, /execution_policy: 'human_only'/)
  assert.match(contract, /status: 'not_measured'/)
  assert.match(contract, /expected: null/)
  assert.match(contract, /observed: null/)
})

test('maintenance decision cockpit makes human review and unmeasured impact explicit', async () => {
  const page = await readFile(pagePath, 'utf8')

  assert.match(page, /Decisiones que requieren validación humana/)
  assert.match(page, /La IA no aprueba, ejecuta ni cierra trabajo/)
  assert.match(page, /Revisión humana/)
  assert.match(page, /Impacto aún no medido/)
  assert.match(page, /sin beneficio atribuido/i)
})
