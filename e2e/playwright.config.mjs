import { defineConfig } from '@playwright/test'

const desktop = { width: 1365, height: 900 }
const mobile = { width: 390, height: 844 }

export default defineConfig({
  testDir: '.',
  testMatch: ['cloud-browser.spec.mjs', 'authenticated-modules.spec.mjs'],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://www.motil.app',
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: desktop } },
    { name: 'chromium-mobile', use: { browserName: 'chromium', viewport: mobile, isMobile: true } },
    { name: 'firefox-desktop', use: { browserName: 'firefox', viewport: desktop } },
    { name: 'firefox-mobile', use: { browserName: 'firefox', viewport: mobile } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: desktop } },
    { name: 'webkit-mobile', use: { browserName: 'webkit', viewport: mobile, isMobile: true } },
  ],
})
