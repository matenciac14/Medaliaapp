/**
 * Tests unitarios para la lógica de visibilidad del WhatsAppButton.
 * Extrae y prueba la función isPublicRoute directamente.
 */
import { describe, it, expect } from 'vitest'

// Replica de la lógica interna del componente
const PUBLIC_PREFIXES = ['/', '/coaches', '/login', '/register', '/p/']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? pathname === prefix || pathname.startsWith(prefix) : pathname === prefix
  )
}

describe('WhatsAppButton — visibilidad por ruta', () => {
  it('visible en /', () => expect(isPublicRoute('/')).toBe(true))
  it('visible en /coaches', () => expect(isPublicRoute('/coaches')).toBe(true))
  it('visible en /login', () => expect(isPublicRoute('/login')).toBe(true))
  it('visible en /register', () => expect(isPublicRoute('/register')).toBe(true))
  it('visible en /p/carlos', () => expect(isPublicRoute('/p/carlos')).toBe(true))
  it('visible en /p/cualquier-slug', () => expect(isPublicRoute('/p/coach-nombre')).toBe(true))

  it('oculto en /dashboard', () => expect(isPublicRoute('/dashboard')).toBe(false))
  it('oculto en /coach/dashboard', () => expect(isPublicRoute('/coach/dashboard')).toBe(false))
  it('oculto en /admin', () => expect(isPublicRoute('/admin')).toBe(false))
  it('oculto en /checkin', () => expect(isPublicRoute('/checkin')).toBe(false))
  it('oculto en /plan', () => expect(isPublicRoute('/plan')).toBe(false))
  it('oculto en /nutrition', () => expect(isPublicRoute('/nutrition')).toBe(false))
})
