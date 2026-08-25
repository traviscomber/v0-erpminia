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
