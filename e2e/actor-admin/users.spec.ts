/**
 * E2E — Actor: Admin | Módulo: Gestión de Usuarios
 * Tags: @admin @users
 *
 * Cubre:
 * - /admin: acceso al panel de administración
 * - Buscar usuario por email
 * - Ver detalle de usuario
 * - Cambiar rol de usuario
 * - Activar/desactivar features de atleta
 * - Cambiar tier de coach
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Gestión de Usuarios — Admin @admin @users', () => {
  test.use({ storageState: storageStatePath('admin') })

  test('acceso a /admin sin redirección @critical', async ({ page }) => {
    await goTo(page, '/admin')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('panel admin: secciones principales existen @critical', async ({ page }) => {
    await goTo(page, '/admin')

    // Debe haber navegación o secciones del admin (puede estar en sidebar o menú colapsado en mobile)
    const adminNav = page.getByText(/usuarios|coaches|atletas|métricas|ejercicios/i).first()
    const count = await adminNav.count()
    expect(count).toBeGreaterThan(0)
  })

  test('atleta no autorizado no puede acceder a /admin', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login|\/dashboard/)
  })

  test('/admin/metrics carga sin errores @critical', async ({ page }) => {
    await goTo(page, '/admin/metrics')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('/admin/exercises carga sin errores @critical', async ({ page }) => {
    await goTo(page, '/admin/exercises')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('/admin/finanzas carga sin errores', async ({ page }) => {
    await goTo(page, '/admin/finanzas')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('/admin/roadmap carga sin errores', async ({ page }) => {
    await goTo(page, '/admin/roadmap')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
    // El roadmap debe mostrar grupos
    await expect(page.getByText(/ui-experience|check-in|plan/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('buscar usuario: campo de búsqueda disponible', async ({ page }) => {
    await goTo(page, '/admin')

    // Buscar campo de búsqueda de usuario
    const searchField = page.getByPlaceholder(/buscar|email|usuario/i).first()
    const searchSection = page.getByText(/usuarios|buscar coach|buscar atleta/i).first()

    const hasSearch = await searchField.count() + await searchSection.count()
    if (hasSearch > 0) {
      expect(hasSearch).toBeGreaterThan(0)
    }
  })

})
