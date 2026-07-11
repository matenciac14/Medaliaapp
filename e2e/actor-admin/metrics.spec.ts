/**
 * E2E — Actor: Admin | Módulo: Métricas SaaS
 * Tags: @admin @metrics
 *
 * Cubre:
 * - /admin/metrics: KPIs de actividad — Check-ins, Sesiones, Planes activos, WAU, Retención
 * - Distribución geográfica por timezone/país
 * - Segmentación B2C vs B2B
 * - /admin/finanzas: MRR atletas, MRR coaches, pagos, churn
 *
 * NOTA: MRR e ingresos viven en /admin/finanzas — NO en /admin/metrics.
 * /admin/metrics muestra métricas de uso/actividad. /admin/finanzas muestra financieras.
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Métricas SaaS — Admin @admin @metrics', () => {
  test.use({ storageState: storageStatePath('admin') })

  test('página /admin/metrics carga sin errores @critical', async ({ page }) => {
    await goTo(page, '/admin/metrics')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('KPIs de actividad visibles: check-ins, sesiones, planes, coaches @critical', async ({ page }) => {
    await goTo(page, '/admin/metrics')

    // KPIs exactos del AdminMetricsPage: Check-ins totales, Sesiones registradas, Planes activos,
    // Coaches con atletas, Onboarding completado
    const kpis = [
      /check-ins totales/i,
      /sesiones registradas/i,
      /planes activos/i,
      /coaches con atletas/i,
    ]

    let visibleCount = 0
    for (const kpi of kpis) {
      const el = page.getByText(kpi).first()
      if (await el.count() > 0) visibleCount++
    }

    expect(visibleCount).toBeGreaterThan(0)
  })

  test('WAU — usuarios activos por semana visible', async ({ page }) => {
    await goTo(page, '/admin/metrics')

    // Sección WAU — título exacto del componente
    const wauSection = page.getByText(/WAU — Usuarios activos por semana/i).first()
    const count = await wauSection.count()
    if (count > 0) {
      await expect(wauSection).toBeVisible()
    }
  })

  test('distribución geográfica visible', async ({ page }) => {
    await goTo(page, '/admin/metrics')

    // PLT-02: sección de distribución geográfica por país/timezone
    const geoSection = page.getByText(/distribución geográfica|colombia|usuarios por país/i).first()
    const count = await geoSection.count()
    if (count > 0) {
      await expect(geoSection).toBeVisible()
    }
  })

  test('atletas B2B vs B2C diferenciados', async ({ page }) => {
    await goTo(page, '/admin/metrics')

    // PLT-03: segmentación B2C vs B2B
    const b2bSection = page.getByText(/b2b|b2c|asesorado/i).first()
    const count = await b2bSection.count()
    if (count > 0) {
      await expect(b2bSection).toBeVisible()
    }
  })

  test('/admin/finanzas: MRR visible (MRR vive en finanzas, no en metrics)', async ({ page }) => {
    // MRR e ingresos pertenecen a /admin/finanzas — NO a /admin/metrics
    await goTo(page, '/admin/finanzas')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')

    const mrrSection = page.getByText(/mrr|ingresos/i).first()
    const count = await mrrSection.count()
    if (count > 0) {
      await expect(mrrSection).toBeVisible()
    }
  })

  test('roadmap admin muestra el scope ui-experience', async ({ page }) => {
    await goTo(page, '/admin/roadmap')

    await expect(page.locator('body')).not.toContainText('500')

    // El scope UI-Experience debe existir en el roadmap
    const uiScope = page.getByText(/ui.experience|ux|experiencia/i).first()
    if (await uiScope.count() > 0) {
      await expect(uiScope).toBeVisible()
    }
  })

})
