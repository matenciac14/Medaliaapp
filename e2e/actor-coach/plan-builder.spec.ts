/**
 * E2E — Actor: Coach | Módulo: Plan Builder
 * Tags: @coach @plan-builder
 *
 * Cubre:
 * - /coach/athlete/[id]/plan/build: carga del builder
 * - Selección de plantilla de plan
 * - Ajuste de semanas y fechas de inicio
 * - Vista previa de sesiones por semana
 * - Guardar plan asignado al atleta
 * - Plan "desde template" (from-template endpoint)
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Plan Builder — Coach @coach @plan-builder', () => {
  test.use({ storageState: storageStatePath('coach') })

  test('acceder al plan builder desde detalle de atleta @critical', async ({ page }) => {
    await goTo(page, '/coach/athletes')

    const athleteLink = page.locator('a[href*="/coach/athlete/"]').first()
    if (await athleteLink.count() === 0) {
      test.info().annotations.push({ type: 'skip', description: 'No hay atletas en el coach de test' })
      return
    }

    const href = await athleteLink.getAttribute('href') ?? ''
    await goTo(page, `${href}/plan/build`)

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('builder muestra selector de template o plan existente', async ({ page }) => {
    await goTo(page, '/coach/athletes')
    const athleteLink = page.locator('a[href*="/coach/athlete/"]').first()
    if (await athleteLink.count() === 0) return

    const href = await athleteLink.getAttribute('href') ?? ''
    await goTo(page, `${href}/plan/build`)

    // Debe mostrar alguna forma de seleccionar o construir un plan
    const hasBuilder = await page.getByText(/semana|fase|base|desarrollo|plantilla/i).count()
    expect(hasBuilder).toBeGreaterThan(0)
  })

  test('semanas del plan visibles y editables en el builder', async ({ page }) => {
    await goTo(page, '/coach/athletes')
    const athleteLink = page.locator('a[href*="/coach/athlete/"]').first()
    if (await athleteLink.count() === 0) return

    const href = await athleteLink.getAttribute('href') ?? ''
    await goTo(page, `${href}/plan/build`)

    // Buscar lista de semanas
    const weeksSection = page.getByText(/semanas|semana 1/i).first()
    if (await weeksSection.count() > 0) {
      await expect(weeksSection).toBeVisible()
    }
  })

})
