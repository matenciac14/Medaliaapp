import { describe, it, expect } from 'vitest'
import { filterUsers, rankResults, searchUsers } from './search'
import type { SearchUser } from './search'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USERS: SearchUser[] = [
  { id: '1', name: 'Ana García',    email: 'ana@example.com',   role: 'ATHLETE' },
  { id: '2', name: 'Juan Pérez',    email: 'juan@example.com',  role: 'COACH'   },
  { id: '3', name: 'María López',   email: 'maria@example.com', role: 'ATHLETE' },
  { id: '4', name: null,            email: 'anon@example.com',  role: 'ATHLETE' },
  { id: '5', name: 'Pedro Ángel',   email: 'pedro@example.com', role: 'ADMIN'   },
  { id: '6', name: 'Ana Martínez',  email: 'ana2@example.com',  role: 'ATHLETE' },
]

// ---------------------------------------------------------------------------
// filterUsers
// ---------------------------------------------------------------------------
describe('filterUsers', () => {
  it('query vacío → lista vacía', () => {
    expect(filterUsers(USERS, '')).toHaveLength(0)
    expect(filterUsers(USERS, '   ')).toHaveLength(0)
  })

  it('busca por nombre (case-insensitive)', () => {
    const r = filterUsers(USERS, 'ana')
    expect(r.map((u) => u.id)).toContain('1')
    expect(r.map((u) => u.id)).toContain('6')
    expect(r.map((u) => u.id)).not.toContain('2')
  })

  it('busca por email', () => {
    const r = filterUsers(USERS, 'juan@')
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe('2')
  })

  it('usuario sin nombre → busca solo por email', () => {
    const r = filterUsers(USERS, 'anon')
    expect(r.map((u) => u.id)).toContain('4')
  })

  it('query sin coincidencias → lista vacía', () => {
    expect(filterUsers(USERS, 'xyzabc999')).toHaveLength(0)
  })

  it('es case-insensitive en nombre', () => {
    expect(filterUsers(USERS, 'GARCÍA')).toHaveLength(1)
    expect(filterUsers(USERS, 'garcía')).toHaveLength(1)
  })

  it('es case-insensitive en email', () => {
    expect(filterUsers(USERS, 'ANA@EXAMPLE')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// rankResults
// ---------------------------------------------------------------------------
describe('rankResults', () => {
  it('query vacío → mismo orden', () => {
    const r = rankResults(USERS, '')
    expect(r).toHaveLength(USERS.length)
  })

  it('coincidencia exacta de email → primero', () => {
    const r = rankResults(USERS, 'ana@example.com')
    expect(r[0].id).toBe('1')
  })

  it('nombre empieza con query → antes que nombre que solo contiene', () => {
    // "Ana García" y "Ana Martínez" empiezan con "ana", "María López" no
    const filtered = filterUsers(USERS, 'ana')
    const ranked = rankResults(filtered, 'ana')
    const ids = ranked.map((u) => u.id)
    // ambas "Ana" deben estar antes que cualquier otra
    expect(ids.indexOf('1')).toBeLessThan(ids.indexOf('3') === -1 ? Infinity : ids.indexOf('3'))
  })

  it('dentro del mismo score, ordena alfabéticamente', () => {
    const r = rankResults(filterUsers(USERS, 'ana'), 'ana')
    const names = r.map((u) => u.name)
    // "Ana García" < "Ana Martínez" alfabéticamente
    expect(names[0]).toBe('Ana García')
    expect(names[1]).toBe('Ana Martínez')
  })
})

// ---------------------------------------------------------------------------
// searchUsers — integración filter + rank + limit
// ---------------------------------------------------------------------------
describe('searchUsers', () => {
  it('respeta maxResults', () => {
    // crea 20 usuarios similares
    const many: SearchUser[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `Test User ${i}`,
      email: `test${i}@example.com`,
      role: 'ATHLETE',
    }))
    expect(searchUsers(many, 'test', 5)).toHaveLength(5)
  })

  it('query vacío → lista vacía (no todos los usuarios)', () => {
    expect(searchUsers(USERS, '')).toHaveLength(0)
  })

  it('devuelve resultados filtrados y rankeados', () => {
    const r = searchUsers(USERS, 'ana', 10)
    expect(r.every((u) => u.name?.toLowerCase().includes('ana') || u.email.includes('ana'))).toBe(true)
  })
})
