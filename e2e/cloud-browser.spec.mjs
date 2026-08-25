import { test, expect } from '@playwright/test'

const routes = [
  '/',
  '/auth/login',
  '/modulos/produccion',
  '/modulos/mantenimiento',
  '/modulos/inventario',
  '/modulos/compras',
  '/modulos/finanzas',
  '/modulos/rrhh',
  '/modulos/sostenibilidad',
  '/modulos/legal',
]

// Live mode is explicit and runs the side-effecting authenticated journey once in Chromium.
const RUN_LIVE = process.env.E2E_LIVE === '1'

function attachHealth(page) {
  const sameOriginConsoleErrors = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const url = message.location()?.url || ''
    if (!url || url.includes('motil.app')) sameOriginConsoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  return { sameOriginConsoleErrors, pageErrors }
}

for (const route of routes) {
  test(`${route} renders without browser/runtime breakage`, async ({ page }, testInfo) => {
    const health = attachHealth(page)
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response, `missing navigation response for ${route}`).not.toBeNull()
    expect(response.status(), `HTTP ${response.status()} for ${route}`).toBeLessThan(400)

    await page.locator('body').waitFor({ state: 'visible' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    const bodyText = (await page.locator('body').innerText()).trim()
    expect(bodyText.length, `blank or near-blank page at ${route}`).toBeGreaterThan(30)
    expect(bodyText).not.toMatch(/Application error|Internal Server Error|This page could not be found/i)

    const title = await page.title()
    expect(title.trim().length, `empty document title at ${route}`).toBeGreaterThan(0)

    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }))
    expect(overflow.documentWidth, `document horizontal overflow at ${route}`).toBeLessThanOrEqual(overflow.viewport + 2)
    expect(overflow.bodyWidth, `body horizontal overflow at ${route}`).toBeLessThanOrEqual(overflow.viewport + 2)

    expect(health.pageErrors, `page errors at ${route}`).toEqual([])
    expect(health.sameOriginConsoleErrors, `same-origin console errors at ${route}`).toEqual([])

    if (testInfo.project.name === 'chromium-desktop') {
      const safeName = route === '/' ? 'home' : route.replaceAll('/', '-').replace(/^-/, '')
      await page.screenshot({ path: testInfo.outputPath(`${safeName}.png`), fullPage: true })
    }
  })
}

test('login form hydrates and accepts safe input without submit', async ({ page }) => {
  const health = attachHealth(page)
  const response = await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  expect(response).not.toBeNull()
  expect(response.status()).toBeLessThan(400)
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

  const email = page.locator('input[type="email"]').first()
  await expect(email).toBeVisible()
  await email.fill('browserin-smoke@example.invalid')
  await expect(email).toHaveValue('browserin-smoke@example.invalid')
  await email.clear()

  const password = page.locator('input[type="password"]').first()
  await expect(password).toBeVisible()
  await password.fill('BrowserinSmokeOnly-NotSubmitted')
  await expect(password).toHaveValue('BrowserinSmokeOnly-NotSubmitted')
  await password.clear()

  expect(health.pageErrors).toEqual([])
  expect(health.sameOriginConsoleErrors).toEqual([])
})

test('authenticated demo can create preventive plan and generate a work order', async ({ page }, testInfo) => {
  test.skip(!RUN_LIVE, 'Authenticated live journey is explicit opt-in only')
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run the live production mutation once')

  const emailValue = process.env.E2E_EMAIL || ''
  const passwordValue = process.env.E2E_PASSWORD || ''
  expect(emailValue, 'missing masked demo email').not.toBe('')
  expect(passwordValue, 'missing masked demo password').not.toBe('')

  const health = attachHealth(page)
  const marker = `BROWSERIN-E2E-${process.env.GITHUB_RUN_ID || Date.now()}`
  const scheduledDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  await page.goto('/auth/login?redirect=/dashboard/mantenimiento/planificacion', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

  await page.getByLabel('Correo electrónico').fill(emailValue)
  await page.getByLabel('Contraseña').fill(passwordValue)
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()

  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  const loginResponse = await loginResponsePromise
  expect(loginResponse.status(), 'login API did not accept demo account').toBe(200)

  await expect(page).toHaveURL(/\/dashboard\/mantenimiento\/planificacion(?:\?|$)/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'Planificación preventiva' })).toBeVisible()

  const planningApi = await page.evaluate(async () => {
    const response = await fetch('/api/maintenance/preventive', { credentials: 'include' })
    const payload = await response.json().catch(() => null)
    return { status: response.status, assets: payload?.assets?.length || 0 }
  })
  expect(planningApi.status, 'authenticated preventive API failed').toBe(200)
  expect(planningApi.assets, 'demo organization has no maintenance assets').toBeGreaterThan(0)

  await page.screenshot({ path: testInfo.outputPath('authenticated-planification-before.png'), fullPage: true })

  await page.getByRole('button', { name: 'Nuevo plan' }).click()
  await expect(page.getByText('Nuevo plan preventivo')).toBeVisible()

  const equipmentSelect = page.getByRole('combobox').first()
  await equipmentSelect.click()
  await page.getByRole('option').first().click()
  await page.getByPlaceholder('Tarea').fill(marker)
  await page.locator('input[type="date"]').fill(scheduledDate)
  await page.getByPlaceholder('Frecuencia en días').fill('30')
  await page.getByPlaceholder('Duración estimada').fill('1')
  await page.getByPlaceholder('Descripción').fill('Registro temporal creado por Browserin E2E; debe limpiarse al finalizar la verificación.')

  const createResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/maintenance/preventive') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Guardar plan' }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.status(), 'preventive plan POST failed').toBe(201)
  await expect(page.getByText('Plan preventivo creado.')).toBeVisible()

  const planCard = page.locator('[data-slot="card"]').filter({ hasText: marker })
  await expect(planCard).toHaveCount(1)
  await expect(planCard.getByRole('button', { name: 'Crear OT' })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('authenticated-plan-created.png'), fullPage: true })

  const generateResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/maintenance/preventive') && response.request().method() === 'PATCH',
  )
  await planCard.getByRole('button', { name: 'Crear OT' }).click()
  const generateResponse = await generateResponsePromise
  expect(generateResponse.status(), 'work-order generation PATCH failed').toBe(200)
  await expect(page.getByText('Orden de trabajo creada desde el plan.')).toBeVisible()
  await expect(planCard.getByRole('link', { name: 'Abrir OT' })).toBeVisible()

  const detailApiResponses = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/api/maintenance/work-orders/') || url.pathname.startsWith('/api/timeline/work_order/')) {
      detailApiResponses.push({ path: url.pathname, method: response.request().method(), status: response.status() })
    }
  })

  await planCard.getByRole('link', { name: 'Abrir OT' }).click()
  await expect(page).toHaveURL(/\/dashboard\/mantenimiento\/ordenes-trabajo\/[0-9a-f-]+$/i, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: marker })).toBeVisible({ timeout: 20_000 })
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  await expect(page.getByText('Preventiva', { exact: true })).toBeVisible()

  const plannedStatusBadge = page.locator('[data-slot="badge"]').filter({ hasText: /^(Planificada|planned)$/ })
  await expect(plannedStatusBadge).toHaveCount(1)
  await expect(plannedStatusBadge).toBeVisible()

  const workOrderId = new URL(page.url()).pathname.split('/').pop()
  const expectedApiChecks = [
    `/api/maintenance/work-orders/${workOrderId}`,
    `/api/maintenance/work-orders/${workOrderId}/materials`,
    `/api/maintenance/work-orders/${workOrderId}/execution`,
    `/api/maintenance/work-orders/${workOrderId}/reserve-parts`,
    `/api/maintenance/work-orders/${workOrderId}/timer`,
    `/api/timeline/work_order/${workOrderId}`,
  ]
  for (const path of expectedApiChecks) {
    const matches = detailApiResponses.filter((entry) => entry.path === path && entry.method === 'GET')
    expect(matches.length, `expected browser GET was not observed: ${path}`).toBeGreaterThan(0)
    expect(matches.every((entry) => entry.status >= 200 && entry.status < 400), `non-success response for ${path}: ${JSON.stringify(matches)}`).toBe(true)
  }

  await expect(page.getByText(/Estado: .*Detenido/)).toBeVisible()

  const startTimerResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/api/maintenance/work-orders/${workOrderId}/timer`) && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click()
  const startTimerResponse = await startTimerResponsePromise
  expect(startTimerResponse.status(), 'timer play failed').toBe(200)
  await expect(page.getByText(/Estado: .*En progreso/)).toBeVisible()

  const pauseTimerResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/api/maintenance/work-orders/${workOrderId}/timer`) && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Pausa', exact: true }).click()
  const pauseTimerResponse = await pauseTimerResponsePromise
  expect(pauseTimerResponse.status(), 'timer pause failed').toBe(200)
  await expect(page.getByText(/Estado: .*Pausado/)).toBeVisible()

  const terminateTimerResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/api/maintenance/work-orders/${workOrderId}/timer`) && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  const terminateTimerResponse = await terminateTimerResponsePromise
  expect(terminateTimerResponse.status(), 'timer terminate failed').toBe(200)
  await expect(page.getByText(/Estado: .*Detenido/)).toBeVisible()

  const timerPosts = detailApiResponses.filter((entry) => entry.path === `/api/maintenance/work-orders/${workOrderId}/timer` && entry.method === 'POST')
  expect(timerPosts.map((entry) => entry.status), 'timer actions must all succeed').toEqual([200, 200, 200])

  const detailBody = (await page.locator('body').innerText()).trim()
  expect(detailBody).not.toMatch(/Application error|Internal Server Error|No se pudo cargar la orden|No se pudo cargar la cobertura de materiales|No se pudo cargar la línea de tiempo/i)
  await page.screenshot({ path: testInfo.outputPath('authenticated-work-order-detail.png'), fullPage: true })

  expect(health.pageErrors, 'page errors during authenticated journey').toEqual([])
  expect(health.sameOriginConsoleErrors, 'same-origin console errors during authenticated journey').toEqual([])
})
