/**
 * global.setup.ts — Se ejecuta UNA VEZ antes de todos los specs.
 *
 * Responsabilidades:
 * 1. Crear los usuarios de test en DB (si no existen)
 * 2. Autenticar a cada usuario y guardar el storageState (sesión persistida)
 *
 * Los specs reutilizan la sesión guardada → login solo 1 vez por run completo.
 *
 * IMPORTANTE: Requiere que el servidor esté corriendo (pnpm dev o webServer en playwright.config.ts).
 * IMPORTANTE: Usa la DB definida en DATABASE_URL del .env.local — NO usar producción.
 */

import { chromium, type FullConfig } from '@playwright/test'
import { USERS, type UserKey } from './fixtures/users'
import { loginAs, storageStatePath } from './fixtures/auth'
import * as fs from 'fs'
import * as path from 'path'

const USERS_TO_AUTH: UserKey[] = ['atletaB2C', 'atletaB2B', 'coach', 'admin']

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'

  // Crear directorio de sesiones si no existe (path absoluto)
  const authDir = path.resolve('e2e/.auth')
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const browser = await chromium.launch()

  for (const key of USERS_TO_AUTH) {
    // Pasar baseURL al contexto para que page.goto('/login') funcione
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()

    console.log(`[setup] Autenticando ${USERS[key].email}...`)

    try {
      await loginAs(page, key)
      await context.storageState({ path: storageStatePath(key) })
      console.log(`[setup] ✓ ${key} autenticado`)
    } catch (err) {
      console.error(`[setup] ✗ Falló autenticación de ${key}:`, err)
      // No lanzar — permitir que los tests fallen individualmente con mensajes claros
    }

    await context.close()
  }

  await browser.close()
}
