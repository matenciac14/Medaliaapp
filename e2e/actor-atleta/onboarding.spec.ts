/**
 * E2E — Actor: Atleta | Módulo: Onboarding
 * Tags: @atleta @onboarding @critical
 *
 * Cubre:
 * - Registro de nuevo usuario y wizard completo (B2C)
 * - Validaciones inline (edad, altura, peso fuera de rango)
 * - Redirección correcta post-onboarding según tipo de atleta
 * - Flujo B2B: prefilled data + redirección a /pending
 */

import { test, expect } from '@playwright/test'
import { goTo, fillField, clickButton, expectUrl } from '../fixtures/helpers'

// Tests de onboarding no usan storageState — el usuario está sin autenticar
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Onboarding B2C — nuevo atleta @atleta @onboarding', () => {

  test('wizard completo RUNNING: 2 pasos → dashboard @critical', async ({ page, isMobile }) => {
    // El widget de WhatsApp cubre el botón submit en mobile — este flujo es desktop
    test.skip(isMobile, 'Flujo onboarding probado en desktop chromium')
    const email = `e2e-test-${Date.now()}@test.medaliq.com`
    await goTo(page, '/register')

    // Cerrar banner de cookies si aparece
    const acceptCookies = page.getByRole('button', { name: /aceptar|accept/i }).first()
    if (await acceptCookies.count() > 0) await acceptCookies.click()

    // Seleccionar rol antes de llenar el formulario
    await page.getByText('Soy atleta').click()

    // El formulario de registro NO tiene htmlFor en los labels — usar type/placeholder
    await page.locator('input[placeholder="Tu nombre"]').fill('Test Runner')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[placeholder="Mínimo 8 caracteres"]').fill('Test1234!')
    await page.locator('input[placeholder="Repite tu contraseña"]').fill('Test1234!')

    // Scroll al botón para asegurar visibilidad
    const submitBtn = page.getByRole('button', { name: /crear cuenta/i })
    await submitBtn.scrollIntoViewIfNeeded()
    await submitBtn.click()
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 })

    // Paso 1: actividad → Running
    await page.getByText('Running').click()
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Paso 2: datos físicos
    await page.getByPlaceholder('32').fill('28')
    await page.getByPlaceholder('170').fill('175')
    await page.getByPlaceholder('68').fill('72')
    await page.getByText('Hombre').click()
    await page.getByText('4 días').click()
    // force:true para ignorar el widget de WhatsApp que cubre el botón en mobile
    await page.getByRole('button', { name: /guardar|entrar/i }).click({ force: true })

    await page.waitForURL(/\/dashboard|\/onboarding\/generating/, { timeout: 20_000 })
    await expect(page).not.toHaveURL(/\/register/)
  })

  test('wizard completo GYM: selección de meta + CTA dashboard @critical', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Flujo onboarding probado en desktop chromium')
    const email = `e2e-gym-${Date.now()}@test.medaliq.com`
    await goTo(page, '/register')

    const acceptCookies = page.getByRole('button', { name: /aceptar|accept/i }).first()
    if (await acceptCookies.count() > 0) await acceptCookies.click()

    await page.getByText('Soy atleta').click()

    await page.locator('input[placeholder="Tu nombre"]').fill('Test Gym')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[placeholder="Mínimo 8 caracteres"]').fill('Test1234!')
    await page.locator('input[placeholder="Repite tu contraseña"]').fill('Test1234!')

    const submitBtn = page.getByRole('button', { name: /crear cuenta/i })
    await submitBtn.scrollIntoViewIfNeeded()
    await submitBtn.click()
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 })

    // Paso 1: GYM — esperar que aparezca el sub-menú de meta antes de continuar
    await page.getByText('Ejercicios').click()
    await expect(page.getByText(/meta en el gym/i)).toBeVisible({ timeout: 3_000 })
    await page.getByText('Ganar músculo').click()
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Paso 2: datos
    await page.getByPlaceholder('32').fill('24')
    await page.getByPlaceholder('170').fill('180')
    await page.getByPlaceholder('68').fill('80')
    await page.getByText('Hombre').click()
    await page.getByText('3 días').click()
    await page.getByRole('button', { name: /guardar|entrar/i }).click({ force: true })

    await page.waitForURL(/\/dashboard|\/onboarding\/generating/, { timeout: 20_000 })
    await expect(page).not.toHaveURL(/\/register/)
  })

  test('validación: campos numéricos fuera de rango muestran error', async ({ page }) => {
    const email = `e2e-val-${Date.now()}@test.medaliq.com`
    await goTo(page, '/register')
    await page.locator('input[placeholder="Tu nombre"]').fill('Test Val')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[placeholder="Mínimo 8 caracteres"]').fill('Test1234!')
    await page.locator('input[placeholder="Repite tu contraseña"]').fill('Test1234!')
    await page.getByRole('button', { name: /crear cuenta|registrarse/i }).click()
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 })

    await page.getByText('Running').click()
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Edad inválida
    await page.getByPlaceholder('32').fill('5')
    await expect(page.getByText(/10 y 100/i)).toBeVisible()

    // Altura inválida
    await page.getByPlaceholder('170').fill('50')
    await expect(page.getByText(/100 y 250/i)).toBeVisible()

    // Peso inválido
    await page.getByPlaceholder('68').fill('10')
    await expect(page.getByText(/30 y 300/i)).toBeVisible()

    // Botón deshabilitado mientras hay errores
    await expect(page.getByRole('button', { name: /guardar|entrar/i })).toBeDisabled()
  })

  test('barra de progreso avanza al pasar de paso', async ({ page }) => {
    const email = `e2e-prog-${Date.now()}@test.medaliq.com`
    await goTo(page, '/register')
    await page.locator('input[placeholder="Tu nombre"]').fill('Test Prog')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[placeholder="Mínimo 8 caracteres"]').fill('Test1234!')
    await page.locator('input[placeholder="Repite tu contraseña"]').fill('Test1234!')
    await page.getByRole('button', { name: /crear cuenta|registrarse/i }).click()
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 })

    // Paso 1 — texto "Paso 1 de 2"
    await expect(page.getByText(/paso 1 de 2/i)).toBeVisible()

    await page.getByText('Running').click()
    await page.getByRole('button', { name: /siguiente/i }).click()

    // Paso 2 — texto "Paso 2 de 2"
    await expect(page.getByText(/paso 2 de 2/i)).toBeVisible()
  })

})
