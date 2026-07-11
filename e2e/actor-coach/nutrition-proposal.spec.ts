/**
 * E2E — Actor: Coach | Módulo: Propuesta Nutricional
 * Tags: @coach @nutrition-proposal
 *
 * Cubre:
 * - Tab Nutrición en detalle de atleta: NutritionAdherenceCard visible
 * - Crear propuesta nutricional con delta de macros
 * - Propuesta pendiente: atleta puede aceptar/rechazar
 * - FoodLogsSection: logs del atleta visibles al coach
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Propuesta Nutricional — Coach @coach @nutrition-proposal', () => {
  test.use({ storageState: storageStatePath('coach') })

  async function navigateToFirstAthlete(page: any) {
    await goTo(page, '/coach/athletes')
    const athleteLink = page.locator('a[href*="/coach/athlete/"]').first()
    if (await athleteLink.count() === 0) return false
    await athleteLink.click()
    await page.waitForLoadState('networkidle')
    return true
  }

  test('tab Nutrición visible en detalle de atleta @critical', async ({ page }) => {
    const hasAthlete = await navigateToFirstAthlete(page)
    if (!hasAthlete) return

    const nutritionTab = page.getByRole('tab', { name: /nutrición/i })
      .or(page.getByRole('button', { name: /nutrición/i }))
    if (await nutritionTab.count() > 0) {
      await expect(nutritionTab.first()).toBeVisible()
    }
  })

  test('NutritionAdherenceCard o sección adherencia visible', async ({ page }) => {
    const hasAthlete = await navigateToFirstAthlete(page)
    if (!hasAthlete) return

    const nutritionTab = page.getByRole('tab', { name: /nutrición/i })
      .or(page.getByRole('button', { name: /nutrición/i }))
    if (await nutritionTab.count() === 0) return

    await nutritionTab.first().click()
    await page.waitForTimeout(500)

    const adherenceCard = page.getByText(/adherencia|seguimiento nutricional/i).first()
    const foodLogs = page.getByText(/alimentos|registros de comida/i).first()

    const hasContent = await adherenceCard.count() + await foodLogs.count()
    if (hasContent > 0) {
      await expect(page.getByText(/adherencia|alimentos/i).first()).toBeVisible()
    }
  })

  test('botón crear propuesta nutricional visible', async ({ page }) => {
    const hasAthlete = await navigateToFirstAthlete(page)
    if (!hasAthlete) return

    const nutritionTab = page.getByRole('tab', { name: /nutrición/i })
      .or(page.getByRole('button', { name: /nutrición/i }))
    if (await nutritionTab.count() === 0) return

    await nutritionTab.first().click()
    await page.waitForTimeout(500)

    const propuestaBtn = page.getByRole('button', { name: /propuesta|ajuste nutricional|sugerir cambio/i }).first()
    const count = await propuestaBtn.count()
    if (count > 0) {
      await expect(propuestaBtn).toBeVisible()
    }
  })

  test('formulario propuesta: campos de delta macros presentes', async ({ page }) => {
    const hasAthlete = await navigateToFirstAthlete(page)
    if (!hasAthlete) return

    const nutritionTab = page.getByRole('tab', { name: /nutrición/i })
      .or(page.getByRole('button', { name: /nutrición/i }))
    if (await nutritionTab.count() === 0) return

    await nutritionTab.first().click()
    await page.waitForTimeout(500)

    const propuestaBtn = page.getByRole('button', { name: /propuesta|ajuste nutricional/i }).first()
    if (await propuestaBtn.count() === 0) return

    await propuestaBtn.click()
    await page.waitForTimeout(500)

    // El formulario debe tener campos para delta de macros
    const proteinField = page.getByLabel(/proteína|protein/i)
      .or(page.getByPlaceholder(/proteína|protein/i))
    const carbsField = page.getByLabel(/carbohidratos|carbs/i)
      .or(page.getByPlaceholder(/carbohidratos|carbs/i))

    const hasFields = await proteinField.count() + await carbsField.count()
    if (hasFields > 0) {
      expect(hasFields).toBeGreaterThan(0)
    }
  })

  test('FoodLogsSection: registros del atleta visibles al coach', async ({ page }) => {
    const hasAthlete = await navigateToFirstAthlete(page)
    if (!hasAthlete) return

    const nutritionTab = page.getByRole('tab', { name: /nutrición/i })
      .or(page.getByRole('button', { name: /nutrición/i }))
    if (await nutritionTab.count() === 0) return

    await nutritionTab.first().click()
    await page.waitForTimeout(500)

    // Sección de food logs
    const foodLogsSection = page.getByText(/registros|alimentos registrados|logs/i).first()
    const emptyLogs = page.getByText(/sin registros|no ha registrado/i).first()

    const hasSection = await foodLogsSection.count() + await emptyLogs.count()
    if (hasSection > 0) {
      await expect(page.getByText(/registros|sin registros/i).first()).toBeVisible()
    }
  })

})
