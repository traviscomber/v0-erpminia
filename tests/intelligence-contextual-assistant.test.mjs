import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const contextPath = new URL('../lib/intelligence/assistant-context.ts', import.meta.url)
const routerPath = new URL('../lib/intelligence/query-router.ts', import.meta.url)
const widgetPath = new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url)
const geologyWorkspacePath = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url)

test('assistant context maps the real geology route before generic production', async () => {
  const source = await readFile(contextPath, 'utf8')
  const geologyIndex = source.indexOf("prefixes: ['/dashboard/produccion/geologia'")
  const productionIndex = source.indexOf("prefixes: ['/dashboard/produccion'")

  assert.ok(geologyIndex >= 0)
  assert.ok(productionIndex > geologyIndex)
  assert.match(source, /title: 'Asistente de Geología'/)
  assert.match(source, /title: 'Asistente de Mantenimiento'/)
  assert.match(source, /title: 'Asistente de Inventario'/)
  assert.match(source, /title: 'Asistente de Compras'/)
})

test('query router keeps local scope and avoids ambiguous purchase mutations', async () => {
  const source = await readFile(routerPath, 'utf8')

  assert.doesNotMatch(source, /ACTION_PATTERN[^\n]*\|compra\|/)
  assert.match(source, /CROSS_DOMAIN_PATTERN/)
  assert.match(source, /explicitCapabilities\.length > 1/)
  assert.match(source, /La consulta se mantiene en el módulo actual/)
  assert.match(source, /scope,/)
  assert.match(source, /broadened:/)
})

test('global widget delegates mature specialist runtimes without duplicate geology launcher', async () => {
  const [widget, geologyWorkspace] = await Promise.all([
    readFile(widgetPath, 'utf8'),
    readFile(geologyWorkspacePath, 'utf8'),
  ])

  assert.match(widget, /\/api\/maintenance\/senior-assistant/)
  assert.match(widget, /\/api\/produccion\/geologia\/assistant/)
  assert.match(widget, /resolveAssistantContext/)
  assert.doesNotMatch(geologyWorkspace, /GeologiaAiFloatingChat/)
})
