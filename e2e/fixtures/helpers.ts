import { type Page, expect } from '@playwright/test'

/**
 * Helpers genéricos reutilizables en todos los specs.
 */

// ── Navegación ────────────────────────────────────────────────────────────────

/** Espera a que la página cargue y no haya indicadores de carga visibles. */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
}

/** Navega a una ruta y espera que cargue. */
export async function goTo(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await waitForPageReady(page)
}

// ── Formularios ───────────────────────────────────────────────────────────────

/** Rellena un campo por su label (case-insensitive). */
export async function fillField(page: Page, label: string | RegExp, value: string): Promise<void> {
  await page.getByLabel(label).fill(value)
}

/** Hace clic en un botón por su texto (case-insensitive). */
export async function clickButton(page: Page, name: string | RegExp): Promise<void> {
  await page.getByRole('button', { name }).click()
}

/** Espera que un botón esté habilitado y hace clic. */
export async function clickButtonWhenEnabled(page: Page, name: string | RegExp): Promise<void> {
  const btn = page.getByRole('button', { name })
  await btn.waitFor({ state: 'visible' })
  await expect(btn).toBeEnabled()
  await btn.click()
}

// ── Assertions ────────────────────────────────────────────────────────────────

/** Verifica que aparece un toast/alert de éxito. */
export async function expectSuccess(page: Page, text?: string | RegExp): Promise<void> {
  const locator = text
    ? page.getByText(text)
    : page.locator('[role="alert"]').filter({ hasText: /éxito|guardado|completado|listo/i })
  await expect(locator).toBeVisible({ timeout: 8_000 })
}

/** Verifica que aparece un mensaje de error. */
export async function expectError(page: Page, text?: string | RegExp): Promise<void> {
  const locator = text
    ? page.getByText(text)
    : page.locator('[role="alert"]').filter({ hasText: /error|falló|inválido/i })
  await expect(locator).toBeVisible({ timeout: 8_000 })
}

/** Verifica URL actual. */
export async function expectUrl(page: Page, pattern: string | RegExp): Promise<void> {
  await expect(page).toHaveURL(pattern)
}

/** Verifica que un heading esté visible. */
export async function expectHeading(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByRole('heading', { name: text })).toBeVisible()
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** Llama a un endpoint de la API y retorna el JSON. */
export async function apiGet<T = unknown>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(path)
  return res.json() as Promise<T>
}

export async function apiPost<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const res = await page.request.post(path, { data: body })
  return res.json() as Promise<T>
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Retorna la fecha de hoy en formato YYYY-MM-DD (timezone Bogotá). */
export function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

/** Retorna fecha de hace N días en formato YYYY-MM-DD. */
export function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}
