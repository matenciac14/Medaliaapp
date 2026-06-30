import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'

const ADMIN_SESSION = { user: { id: 'admin-1' } }

function makeGet(q: string) {
  return new NextRequest(new URL(`/api/admin/search?q=${encodeURIComponent(q)}`, 'http://localhost'))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/search', () => {
  it('retorna 401 si no hay sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET(makeGet('john'))
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el usuario no es ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ATHLETE' } as any)
    const res = await GET(makeGet('john'))
    expect(res.status).toBe(403)
  })

  it('retorna users vacío si q < 2 caracteres', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const res = await GET(makeGet('a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toEqual([])
  })

  it('retorna users vacío si q está vacío', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const res = await GET(makeGet(''))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toEqual([])
  })

  it('retorna usuarios que coinciden con la búsqueda', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    const users = [
      { id: 'u1', name: 'John Doe', email: 'john@test.com', role: 'ATHLETE' },
    ]
    vi.mocked(prisma.user.findMany).mockResolvedValue(users as any)
    const res = await GET(makeGet('john'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.users).toEqual(users)
  })

  it('llama a findMany con los parámetros correctos', async () => {
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any)
    await GET(makeGet('Ana'))
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
        take: 10,
      })
    )
  })
})
