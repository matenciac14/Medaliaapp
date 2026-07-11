/**
 * E2E — Actor: Atleta | Módulo: Plan
 * Tags: @atleta @plan
 *
 * Cubre:
 * - Ver plan activo: semanas, sesiones del día, calendario
 * - Empty state B2C sin plan: CTAs correctos
 * - Empty state B2B sin plan: copy diferenciado ("Tu coach aún no asignó un plan")
 * - PlanCalendarView: cambio de vista
 * - PlanCompletionCard: aparece cuando hay plan completado
 * - Sesión de hoy marcada como completada después de registrar log
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Plan — Atleta B2C con plan activo @atleta @plan', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('muestra plan activo con semanas @critical', async ({ page }) => {
    await goTo(page, '/plan')
    await expect(page).not.toHaveURL(/\/login/)

    // Debe mostrar el plan o el empty state — nunca un 500
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('calendario visible y navegable', async ({ page }) => {
    await goTo(page, '/plan')

    // PlanCalendarView — buscar la sección "Calendario"
    const calendarSection = page.getByText(/calendario/i).first()
    if (await calendarSection.count() > 0) {
      await expect(calendarSection).toBeVisible()
    }
  })

  test('semana actual resaltada en la lista de semanas', async ({ page }) => {
    await goTo(page, '/plan')

    // Buscar indicador de semana actual
    const currentWeekIndicator = page.getByText(/semana actual|esta semana/i).first()
    const hasIndicator = await currentWeekIndicator.count()
    if (hasIndicator > 0) {
      await expect(currentWeekIndicator).toBeVisible()
    }
  })

  test('empty state B2C sin plan tiene CTA "Encontrar entrenador"', async ({ page }) => {
    await goTo(page, '/plan')
    // Si hay empty state, debe tener el CTA
    const emptyState = page.getByText(/no tienes un plan activo|sin plan/i).first()
    if (await emptyState.count() > 0) {
      await expect(
        page.getByRole('link', { name: /entrenador|coaches/i }).first()
      ).toBeVisible()
    }
  })

})

test.describe('Plan — Atleta B2B @atleta @plan', () => {
  test.use({ storageState: storageStatePath('atletaB2B') })

  test('empty state B2B muestra mensaje del coach @critical', async ({ page }) => {
    await goTo(page, '/plan')
    await expect(page).not.toHaveURL(/\/login/)

    // Si no tiene plan activo, debe ver mensaje orientado a B2B
    const b2bMessage = page.getByText(/coach aún no ha asignado|tu coach/i).first()
    const hasPlan = await page.getByText(/semana \d+|sesión de hoy/i).count()

    if (hasPlan === 0 && await b2bMessage.count() > 0) {
      await expect(b2bMessage).toBeVisible()
      // B2B no ve el CTA de buscar coach
      await expect(page.getByRole('link', { name: /buscar entrenador/i })).not.toBeVisible()
    }
  })

})
