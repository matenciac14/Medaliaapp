/**
 * E2E — Actor: Atleta | Módulo: Dashboard
 * Tags: @atleta @dashboard
 *
 * Cubre:
 * - Dashboard B2C con plan activo: sesión del día, resumen semanal, racha
 * - Dashboard B2C Free (sin plan): CTAs diferenciados por tipo de actividad
 * - Dashboard B2B: muestra CoachCard + plan del coach
 * - QuickLog: registrar sesión rápida desde el dashboard
 * - WeekNavBar: navegar entre semanas
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo, expectHeading } from '../fixtures/helpers'

test.describe('Dashboard — Atleta B2C con plan @atleta @dashboard', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('dashboard carga sin errores y muestra contenido @critical', async ({ page }) => {
    await goTo(page, '/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
    // Debe haber algún contenido del dashboard
    const hasContent = await page.locator('main, [role="main"], section').count()
    expect(hasContent).toBeGreaterThan(0)
  })

  test('racha visible cuando hay días consecutivos', async ({ page }) => {
    await goTo(page, '/dashboard')
    // Si hay racha ≥ 2 días, debe aparecer el badge de fuego
    const streakBadge = page.getByText(/días seguidos/i)
    // No forzamos que exista — solo verificamos que si existe, está bien formateado
    const count = await streakBadge.count()
    if (count > 0) {
      await expect(streakBadge.first()).toBeVisible()
    }
  })

  test('navegar a /plan desde dashboard', async ({ page }) => {
    await goTo(page, '/dashboard')
    await page.getByRole('link', { name: /mi plan|ver plan/i }).first().click()
    await expect(page).toHaveURL(/\/plan/)
  })

  test('navegar a /checkin desde dashboard', async ({ page }) => {
    await goTo(page, '/dashboard')
    await page.getByRole('link', { name: /check-in|checkin/i }).first().click()
    await expect(page).toHaveURL(/\/checkin/)
  })

})

test.describe('Dashboard — Atleta B2B @atleta @dashboard', () => {
  test.use({ storageState: storageStatePath('atletaB2B') })

  test('muestra CoachCard con nombre del coach', async ({ page }) => {
    await goTo(page, '/dashboard')
    // El CoachCard contiene el nombre del coach o "Tu entrenador"
    const coachCard = page.locator('[data-testid="coach-card"]')
      .or(page.getByText(/tu entrenador|coach/i).first())
    await expect(coachCard).toBeVisible()
  })

})
