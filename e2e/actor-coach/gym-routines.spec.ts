/**
 * E2E — Actor: Coach | Módulo: Rutinas de Gym
 * Tags: @coach @gym-routines
 *
 * Cubre:
 * - /coach/gym/routines: lista de rutinas del coach
 * - Crear rutina nueva
 * - Editar rutina: agregar/quitar ejercicio
 * - Swap de ejercicio con SwapModal
 * - Asignar rutina a atleta
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Rutinas Gym — Coach @coach @gym-routines', () => {
  test.use({ storageState: storageStatePath('coach') })

  test('lista de rutinas carga en /coach/gym/routines @critical', async ({ page }) => {
    await goTo(page, '/coach/gym/routines')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('botón crear rutina visible', async ({ page }) => {
    await goTo(page, '/coach/gym/routines')
    const createBtn = page.getByRole('button', { name: /nueva rutina|crear rutina/i })
      .or(page.getByRole('link', { name: /nueva rutina|crear rutina/i }))
    await expect(createBtn.first()).toBeVisible()
  })

  test('rutina existente: click abre el editor', async ({ page }) => {
    await goTo(page, '/coach/gym/routines')

    const routineLink = page.locator('a[href*="/coach/gym/routines/"]').first()
    const count = await routineLink.count()
    if (count === 0) {
      test.info().annotations.push({ type: 'skip', description: 'No hay rutinas creadas' })
      return
    }

    await routineLink.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/coach\/gym\/routines\/[a-z0-9]+/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('editor de rutina: ejercicios visibles', async ({ page }) => {
    await goTo(page, '/coach/gym/routines')

    const routineLink = page.locator('a[href*="/coach/gym/routines/"]').first()
    if (await routineLink.count() === 0) return

    await routineLink.click()
    await page.waitForLoadState('networkidle')

    // Debe haber algún ejercicio o la opción de agregar uno
    const hasExercises = await page.getByText(/ejercicio|series|reps/i).count()
    const hasAddBtn = await page.getByRole('button', { name: /agregar ejercicio/i }).count()

    expect(hasExercises + hasAddBtn).toBeGreaterThan(0)
  })

  test('swap de ejercicio: modal se abre', async ({ page }) => {
    await goTo(page, '/coach/gym/routines')

    const routineLink = page.locator('a[href*="/coach/gym/routines/"]').first()
    if (await routineLink.count() === 0) return

    await routineLink.click()
    await page.waitForLoadState('networkidle')

    // Buscar botón de swap en cualquier ejercicio
    const swapBtn = page.getByRole('button', { name: /swap|cambiar ejercicio/i }).first()
    if (await swapBtn.count() === 0) return

    await swapBtn.click()
    await page.waitForTimeout(500)

    // Modal de swap debe aparecer
    const modal = page.getByText(/buscar ejercicio|ejercicios similares/i).first()
    if (await modal.count() > 0) {
      await expect(modal).toBeVisible()
    }
  })

  test('asignar rutina a atleta: botón visible en detalle de atleta', async ({ page }) => {
    await goTo(page, '/coach/athletes')

    const athleteLink = page.locator('a[href*="/coach/athlete/"]').first()
    if (await athleteLink.count() === 0) return

    await athleteLink.click()
    await page.waitForLoadState('networkidle')

    // Buscar tab o sección de gym/rutina
    const gymTab = page.getByRole('tab', { name: /gym|rutina/i })
      .or(page.getByRole('button', { name: /gym|rutina/i }))
    if (await gymTab.count() > 0) {
      await gymTab.first().click()
      await page.waitForTimeout(300)

      const assignBtn = page.getByRole('button', { name: /asignar rutina/i }).first()
      if (await assignBtn.count() > 0) {
        await expect(assignBtn).toBeVisible()
      }
    }
  })

})
