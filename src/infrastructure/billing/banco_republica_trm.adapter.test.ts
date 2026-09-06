import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BancoRepublicaTrmAdapter } from './banco_republica_trm.adapter'

const adapter = new BancoRepublicaTrmAdapter()

describe('BancoRepublicaTrmAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parsea correctamente la respuesta de la API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          valor: '3128.65',
          vigenciadesde: '2026-08-15T00:00:00.000',
          vigenciahasta: '2026-08-15T00:00:00.000',
          unidad: 'COP',
        },
      ],
    }))

    const result = await adapter.getCurrentTrm()

    expect(result.value).toBe(3128.65)
    expect(result.date).toBe('2026-08-15')
  })

  it('lanza error si la API responde con status !== 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    }))

    await expect(adapter.getCurrentTrm()).rejects.toThrow('BancoRepublica API error 503')
  })

  it('lanza error si la respuesta está vacía', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))

    await expect(adapter.getCurrentTrm()).rejects.toThrow('respuesta vacía')
  })

  it('lanza error si el valor no es un número válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ valor: 'N/A', vigenciadesde: '2026-08-15T00:00:00.000', unidad: 'COP' }],
    }))

    await expect(adapter.getCurrentTrm()).rejects.toThrow('valor inválido')
  })

  it('extrae solo la fecha (YYYY-MM-DD) ignorando la hora', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ valor: '3100.00', vigenciadesde: '2026-08-15T00:00:00.000', unidad: 'COP' }],
    }))

    const result = await adapter.getCurrentTrm()
    expect(result.date).toBe('2026-08-15')
    expect(result.date).toHaveLength(10)
  })
})
