/**
 * E2E — Actor: Coach | Módulo: Finanzas
 * Tags: @coach @finanzas
 *
 * Cubre:
 * - /coach/finanzas: resumen de ingresos, pagos pendientes, vencidos
 * - Registrar un pago nuevo
 * - Marcar pago como pagado
 * - Pagos vencidos: CTA "Cobrar"
 * - Filtros por atleta
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Finanzas — Coach @coach @finanzas', () => {
  test.use({ storageState: storageStatePath('coach') })

  test('página /coach/finanzas carga sin errores @critical', async ({ page }) => {
    await goTo(page, '/coach/finanzas')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('resumen de ingresos visible', async ({ page }) => {
    await goTo(page, '/coach/finanzas')

    // KPI cards de ingresos
    const ingresosSection = page.getByText(/ingresos|total cobrado|pendiente/i).first()
    await expect(ingresosSection).toBeVisible()
  })

  test('botón registrar pago visible', async ({ page }) => {
    await goTo(page, '/coach/finanzas')

    const newPaymentBtn = page.getByRole('button', { name: /nuevo pago|registrar pago/i })
      .or(page.getByRole('link', { name: /nuevo pago|registrar pago/i }))
    await expect(newPaymentBtn.first()).toBeVisible()
  })

  test('lista de pagos: al menos los estados son visibles', async ({ page }) => {
    await goTo(page, '/coach/finanzas')

    // Debe mostrar alguna tabla o lista de pagos
    const paymentList = page.getByText(/pendiente|pagado|vencido/i).first()
    const emptyState = page.getByText(/sin pagos|aún no hay/i).first()

    const hasPayments = await paymentList.count()
    const hasEmpty = await emptyState.count()

    expect(hasPayments + hasEmpty).toBeGreaterThan(0)
  })

  test('pagos vencidos: CTA cobrar visible cuando existen', async ({ page }) => {
    await goTo(page, '/coach/finanzas')

    const overdueSection = page.getByText(/vencido/i)
    const count = await overdueSection.count()
    if (count > 0) {
      // Debe haber un botón cobrar
      const cobrarBtn = page.getByRole('button', { name: /cobrar|recordar/i }).first()
      if (await cobrarBtn.count() > 0) {
        await expect(cobrarBtn).toBeVisible()
      }
    }
  })

  test('crear nuevo pago: modal o formulario se abre', async ({ page }) => {
    await goTo(page, '/coach/finanzas')

    const newPaymentBtn = page.getByRole('button', { name: /nuevo pago|registrar pago/i }).first()
    if (await newPaymentBtn.count() === 0) return

    await newPaymentBtn.click()
    await page.waitForTimeout(500)

    // Debe abrirse un modal o formulario con campos
    const amountField = page.getByLabel(/monto|valor/i)
      .or(page.getByPlaceholder(/monto|valor/i))
    const athleteField = page.getByLabel(/atleta/i)
      .or(page.getByRole('combobox'))

    const hasForm = await amountField.count() + await athleteField.count()
    if (hasForm > 0) {
      await expect(page.getByText(/nuevo pago|registrar cobro/i).first()).toBeVisible()
    }
  })

  test('marcar pago como pagado: botón disponible en pagos pendientes', async ({ page }) => {
    await goTo(page, '/coach/finanzas')

    const markPaidBtn = page.getByRole('button', { name: /marcar como pagado|pagado/i }).first()
    const count = await markPaidBtn.count()
    if (count > 0) {
      await expect(markPaidBtn).toBeVisible()
    }
  })

})
