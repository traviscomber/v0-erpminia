import { test, expect } from '@playwright/test'

const RUN_LIVE = process.env.E2E_LIVE === '1'

const authenticatedRoutes = [
  ['/dashboard/produccion', 'produccion'],
  ['/dashboard/mantenimiento', 'mantenimiento'],
  ['/dashboard/inventario', 'inventario'],
  ['/dashboard/bodega', 'bodega'],
  ['/dashboard/compras', 'compras'],
  ['/dashboard/finanzas', 'finanzas'],
  ['/dashboard/rrhh', 'rrhh'],
  ['/dashboard/sostenibilidad', 'sostenibilidad'],
  ['/dashboard/legal', 'legal'],
]

test('authenticated admin can render every operational module cleanly', async ({ page }, testInfo) => {
  test.skip(!RUN_LIVE, 'Authenticated module sweep is explicit opt-in only')
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run authenticated module sweep once')

  const emailValue = process.env.E2E_EMAIL || ''
  const passwordValue = process.env.E2E_PASSWORD || ''
  expect(emailValue, 'missing masked demo email').not.toBe('')
  expect(passwordValue, 'missing masked demo password').not.toBe('')

  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const url = message.location()?.url || ''
    if (!url || url.includes('motil.app')) consoleErrors.push({ text: message.text(), url })
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/auth/login?redirect=/dashboard', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo electrónico').fill(emailValue)
  await page.getByLabel('Contraseña').fill(passwordValue)

  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  const loginResponse = await loginResponsePromise
  expect(loginResponse.status(), 'login API did not accept demo account').toBe(200)
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 })

  for (const [route, name] of authenticatedRoutes) {
    const consoleStart = consoleErrors.length
    const pageErrorStart = pageErrors.length

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response, `missing navigation response for ${route}`).not.toBeNull()
    expect(response.status(), `HTTP ${response.status()} for ${route}`).toBeLessThan(400)
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}(?:\\?|$)`), { timeout: 20_000 })
    await page.locator('body').waitFor({ state: 'visible' })
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {})

    const bodyText = (await page.locator('body').innerText()).trim()
    expect(bodyText.length, `blank or near-blank authenticated module ${route}`).toBeGreaterThan(50)
    expect(bodyText, `fatal UI message at ${route}`).not.toMatch(/Application error|Internal Server Error|This page could not be found|No autorizado|Forbidden/i)

    if (route === '/dashboard/produccion') {
      expect(bodyText).toContain('Cobertura real por área')
      expect(bodyText).toContain('Ausencia de una fuente no equivale a valor cero.')
    }

    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }))
    expect(overflow.documentWidth, `document horizontal overflow at ${route}`).toBeLessThanOrEqual(overflow.viewport + 2)
    expect(overflow.bodyWidth, `body horizontal overflow at ${route}`).toBeLessThanOrEqual(overflow.viewport + 2)

    expect(pageErrors.slice(pageErrorStart), `page errors at ${route}`).toEqual([])
    expect(consoleErrors.slice(consoleStart), `same-origin console errors at ${route}`).toEqual([])

    await page.screenshot({ path: testInfo.outputPath(`authenticated-${name}.png`), fullPage: true })
  }
})
