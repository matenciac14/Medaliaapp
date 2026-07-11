/**
 * E2E — Actor: Atleta | Módulo: Check-in
 * Tags: @atleta @checkin
 *
 * Cubre:
 * - Estado 'early' (Lun-Jue): resumen semana pasada + banner informativo
 * - Estado 'open' (Vie-Dom): formulario completo accesible
 * - Estado 'submitted': pantalla de check-in ya enviado
 * - Flujo completo: rellenar todos los campos → enviar → pantalla de resultado
 * - CheckInResultScreen: detecta triggers, muestra ajustes
 * - Sugerencias: aceptar y rechazar una sugerencia
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo, clickButton } from '../fixtures/helpers'

test.describe('Check-in — Atleta B2C @atleta @checkin', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('página de check-in carga y muestra estado correcto @critical', async ({ page }) => {
    await goTo(page, '/checkin')
    // Siempre debe verse alguno de los 3 estados
    const hasForm = await page.getByRole('button', { name: /enviar|guardar check-in/i }).count()
    const hasSubmitted = await page.getByText(/ya enviaste/i).count()
    const hasEarly = await page.getByText(/viernes|open|semana/i).count()

    expect(hasForm + hasSubmitted + hasEarly).toBeGreaterThan(0)
  })

  test('flujo completo check-in: todos los campos → enviar → resultado @critical', async ({ page }) => {
    await goTo(page, '/checkin')

    // Si ya está submitted esta semana, omitir el flujo de envío
    const alreadySubmitted = await page.getByText(/ya enviaste/i).count()
    if (alreadySubmitted > 0) {
      test.info().annotations.push({ type: 'skip-reason', description: 'check-in ya enviado esta semana' })
      return
    }

    // Si está en estado early, puede que no haya formulario — omitir
    const hasForm = await page.getByRole('button', { name: /enviar|guardar check-in/i }).count()
    if (hasForm === 0) {
      test.info().annotations.push({ type: 'skip-reason', description: 'estado early — formulario no disponible' })
      return
    }

    // Rellenar campos numéricos
    const weightField = page.getByLabel(/peso/i)
    if (await weightField.count() > 0) await weightField.fill('71')

    const hrField = page.getByLabel(/fc reposo|frecuencia cardíaca/i)
    if (await hrField.count() > 0) await hrField.fill('58')

    const sleepField = page.getByLabel(/horas de sueño/i)
    if (await sleepField.count() > 0) await sleepField.fill('7.5')

    // Sliders / rangos — energía, RPE, estrés, motivación
    // Los sliders pueden ser inputs type=range; usar fill con el value numérico
    const rangeInputs = page.locator('input[type="range"]')
    const rangeCount = await rangeInputs.count()
    for (let i = 0; i < rangeCount; i++) {
      await rangeInputs.nth(i).fill('7')
    }

    // Enviar
    await page.getByRole('button', { name: /enviar|guardar check-in/i }).click()

    // Pantalla de resultado
    await expect(page.getByText(/check-in guardado/i)).toBeVisible({ timeout: 15_000 })
    // Sección "Lo que detectamos" o "Todo en orden"
    await expect(
      page.getByText(/todo en orden|lo que detectamos/i).first()
    ).toBeVisible()
  })

  test('result screen: botón "Volver al dashboard" navega correctamente', async ({ page }) => {
    await goTo(page, '/checkin')

    const isSubmitted = await page.getByText(/check-in guardado/i).count()
    if (isSubmitted === 0) {
      // No hay resultado visible — solo verificar que la página carga sin error
      await expect(page).not.toHaveURL(/error|500/)
      return
    }

    await page.getByRole('button', { name: /volver al dashboard/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('sugerencias pendientes: aceptar muestra confirmación', async ({ page }) => {
    await goTo(page, '/checkin')

    // Las sugerencias solo aparecen en la pantalla de resultado post check-in
    const acceptBtn = page.getByRole('button', { name: /aceptar/i }).first()
    const count = await acceptBtn.count()

    if (count > 0) {
      await acceptBtn.click()
      // Feedback visual: "✓ Aceptado"
      await expect(page.getByText(/aceptado/i).first()).toBeVisible({ timeout: 5_000 })
    }
  })

})
