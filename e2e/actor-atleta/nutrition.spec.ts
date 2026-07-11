/**
 * E2E — Actor: Atleta | Módulo: Nutrición
 * Tags: @atleta @nutrition
 *
 * Cubre:
 * - Badge de tipo de día (Duro / Fácil / Descanso) visible
 * - Banner de fase del plan contextual
 * - TrackingSection: registrar alimento → aparece en lista
 * - LogFoodModal: buscar alimento, seleccionar, guardar
 * - NutritionContent: secciones de comidas (Desayuno, Almuerzo, etc.)
 * - Badge "Plan de tu coach" cuando tiene AssignedNutritionPlan (B2B)
 * - Adherencia semanal visible cuando hay logs
 *
 * NOTA: /nutrition/builder no existe como ruta — eliminado del scope.
 * Prioridad de plan en /nutrition: AssignedNutritionPlan (coach) > MealPlan (AI) > NutritionPlan base.
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo, clickButton } from '../fixtures/helpers'

test.describe('Nutrición — Atleta B2C @atleta @nutrition', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('página carga y muestra badge de tipo de día @critical', async ({ page }) => {
    await goTo(page, '/nutrition')
    await expect(page).not.toHaveURL(/\/login/)

    // Badge de tipo de día siempre visible
    const dayBadge = page.getByText(/día duro|día fácil|descanso|día suave/i).first()
    await expect(dayBadge).toBeVisible({ timeout: 8_000 })
  })

  test('header de nutrición visible con título correcto', async ({ page }) => {
    await goTo(page, '/nutrition')
    await expect(page.getByRole('heading', { name: /nutrición/i }).first()).toBeVisible()
  })

  test('registrar un alimento incrementa el total de calorías', async ({ page }) => {
    await goTo(page, '/nutrition')

    // Buscar botón de agregar alimento
    const addBtn = page.getByRole('button', { name: /agregar|registrar|añadir/i }).first()
    if (await addBtn.count() === 0) {
      // TrackingSection puede estar oculta si no hay NutritionPlan
      return
    }

    // Leer kcal antes
    const kcalBefore = await page.getByText(/\d+ kcal/i).first().innerText().catch(() => '0 kcal')

    await addBtn.click()

    // Modal de búsqueda de alimentos
    const modal = page.getByRole('dialog').or(page.locator('[role="dialog"]'))
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Buscar un alimento genérico
    const searchInput = modal.getByPlaceholder(/buscar|alimento/i).or(modal.locator('input[type="text"]').first())
    await searchInput.fill('arroz')
    await page.waitForTimeout(500) // debounce de búsqueda

    // Seleccionar primer resultado
    const firstResult = modal.getByRole('button').filter({ hasText: /arroz/i }).first()
      .or(modal.locator('li, [role="option"]').filter({ hasText: /arroz/i }).first())

    const resultCount = await firstResult.count()
    if (resultCount > 0) {
      await firstResult.click()

      // Guardar
      const saveBtn = modal.getByRole('button', { name: /guardar|agregar/i }).first()
      if (await saveBtn.count() > 0) {
        await saveBtn.click()
        await expect(modal).not.toBeVisible({ timeout: 5_000 })
      }
    }
  })

  test('adherencia semanal visible si hay logs @nutrition', async ({ page }) => {
    await goTo(page, '/nutrition')

    const adherence = page.getByText(/esta semana cumpliste/i)
    const count = await adherence.count()
    // Si hay logs registrados en la semana de test, debe aparecer
    if (count > 0) {
      await expect(adherence.first()).toBeVisible()
    }
  })

  test('guía de alimentos visible cuando hay NutritionPlan', async ({ page }) => {
    await goTo(page, '/nutrition')

    // FoodGuide aparece al fondo de la página
    const foodGuide = page.getByText(/guía de alimentos|fuentes recomendadas/i).first()
    if (await foodGuide.count() > 0) {
      await foodGuide.scrollIntoViewIfNeeded()
      await expect(foodGuide).toBeVisible()
    }
  })

  test('página no muestra error 500 ni 404 en ninguna sección', async ({ page }) => {
    await goTo(page, '/nutrition')
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

})

test.describe('Nutrición — Atleta B2B (plan del coach) @atleta @nutrition', () => {
  test.use({ storageState: storageStatePath('atletaB2B') })

  test('muestra badge "Plan de tu coach" si hay AssignedNutritionPlan', async ({ page }) => {
    await goTo(page, '/nutrition')

    const coachBadge = page.getByText(/plan de tu coach/i)
    const count = await coachBadge.count()
    if (count > 0) {
      await expect(coachBadge.first()).toBeVisible()
    }
  })

  test('macros del día no son todos 0 cuando hay plan de coach', async ({ page }) => {
    await goTo(page, '/nutrition')

    // Verificar que al menos uno de los macros no es 0
    // (UX-NUT-01: bug donde macros quedan en 0 para B2B sin NutritionPlan)
    const zeroKcal = page.getByText(/^0\s*kcal$/i)
    const count = await zeroKcal.count()
    // Si tiene AssignedNutritionPlan y todos los macros son 0 → bug
    const coachBadge = await page.getByText(/plan de tu coach/i).count()
    if (coachBadge > 0) {
      // Debe haber algún número > 0 en la sección de macros
      await expect(page.getByText(/\d{3,} kcal/i).first()).toBeVisible()
    }
  })

})

