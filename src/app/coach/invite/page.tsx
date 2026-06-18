'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type InviteCode = {
  id: string
  code: string
  usedBy: string | null
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

function codeStatus(code: InviteCode): { label: string; color: string } {
  if (code.usedBy) return { label: 'Usado', color: '#16a34a' }
  if (new Date(code.expiresAt) < new Date()) return { label: 'Expirado', color: '#9ca3af' }
  return { label: 'Activo', color: '#f97316' }
}

export default function InvitePage() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCodes()
  }, [])

  async function fetchCodes() {
    try {
      const res = await fetch('/api/coach/invite')
      if (res.ok) {
        const data = await res.json()
        setCodes(data.codes ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/coach/invite', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al generar código.'); return }
      setCodes((prev) => [data.invite, ...prev])
    } catch {
      setError('Error de conexión.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy(code: InviteCode) {
    const url = `https://medaliq.com/join/${code.code}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(code.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* no-op */ }
  }

  const activeCodes = codes.filter((c) => !c.usedBy && new Date(c.expiresAt) >= new Date())

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/coach/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <span>←</span> Volver al panel
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Códigos de invitación</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Comparte el link para que un atleta se vincule a tu cuenta.
          </p>
        </div>
        <Link
          href="/coach/clients/new"
          className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
        >
          Crear atleta directo →
        </Link>
      </div>

      {/* Generate */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Generar nuevo código</h2>
            <p className="text-gray-500 text-sm">Válido por 7 días a partir de su creación.</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {generating ? 'Generando...' : 'Generar código'}
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {activeCodes.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Códigos activos</p>
            {activeCodes.map((code) => (
              <div
                key={code.id}
                className="flex items-center gap-3 p-4 rounded-xl border-2"
                style={{ borderColor: '#1e3a5f', backgroundColor: '#f0f4f9' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-lg tracking-widest truncate" style={{ color: '#1e3a5f' }}>
                    {code.code}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    medaliq.com/join/{code.code}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(code)}
                  className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: copiedId === code.id ? '#16a34a' : '#f97316' }}
                >
                  {copiedId === code.id ? '✓ Copiado' : 'Copiar link'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Historial de códigos</h2>

        {loading ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no has generado ningún código.</p>
        ) : (
          <div className="space-y-2">
            {codes.map((code) => {
              const status = codeStatus(code)
              return (
                <div key={code.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-mono text-sm font-semibold text-gray-800">{code.code}</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Creado {new Date(code.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      {' · '}
                      Expira {new Date(code.expiresAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: status.color + '20', color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
