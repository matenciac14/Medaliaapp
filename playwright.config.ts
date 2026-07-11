import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config — MedalIQ
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * Uso:
 *   pnpm e2e                          → todos los tests (headless)
 *   pnpm e2e:ui                       → Playwright UI (debug visual)
 *   pnpm e2e --grep "@atleta"         → solo tests de atleta
 *   pnpm e2e --grep "@coach"          → solo tests de coach
 *   pnpm e2e --grep "@critical"       → solo P0 críticos
 *   pnpm e2e e2e/actor-atleta/checkin.spec.ts → un archivo
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,       // false: los tests comparten seed DB — no correr en paralelo
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                 // 1 worker: tests secuenciales — evita race conditions en DB de test
  globalSetup: './e2e/global.setup.ts', // corre siempre, antes de cualquier spec (ignora --grep)
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Levanta Next.js en modo test automáticamente si no hay servidor corriendo
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
