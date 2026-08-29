import { test, expect } from '@playwright/test';

function browserHealth(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function assertNoOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function loginIfConfigured(page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) return false;

  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 30_000 });
  return true;
}

test('public login is presentation-ready', async ({ page }, testInfo) => {
  const health = browserHealth(page);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Gestión operacional conectada y trazable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeEditable();
  await expect(page.getByLabel('Contraseña')).toBeEditable();
  await assertNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('01-login.png'), fullPage: true });
  expect(health.pageErrors).toEqual([]);
  expect(health.consoleErrors).toEqual([]);
});

test('protected modules either enforce auth or render read-only demo surfaces', async ({ page }, testInfo) => {
  const authenticated = await loginIfConfigured(page);
  const modules = [
    ['/dashboard/work-orders', '02-mantenimiento.png'],
    ['/dashboard/compras', '03-compras.png'],
    ['/dashboard/bodega', '04-inventario.png'],
    ['/dashboard/finanzas', '05-finanzas.png'],
  ];

  for (const [path, screenshot] of modules) {
    const health = browserHealth(page);
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    if (!authenticated) {
      await expect(page).toHaveURL(/\/auth\/login/);
    } else {
      await expect(page).not.toHaveURL(/\/auth\/login/);
      await expect(page.locator('body')).not.toBeEmpty();
      await assertNoOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(screenshot), fullPage: true });
    }

    expect(health.pageErrors).toEqual([]);
    expect(health.consoleErrors).toEqual([]);
  }
});
