'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Code = {
  id: string
  code: string
  status: string
  expiresAt: Date
  createdAt: Date
  usedAt: Date | null
  coach: { id: string; name: string | null; email: string }
  usedByUser: { id: string; name: string | null; email: string } | null
}

type Coach = { id: string; name: string | null; email: string }

type Props = {
  codes: Code[]
  coaches: Coach[]
}

const STATUS_STYLE: Record<string, string> = {
  activo:  'bg-green-100 text-green-700',
  usado:   'bg-gray-100 text-gray-600',
  vencido: 'bg-red-100 text-red-600',
}

export function InviteCodesClient({ codes: initialCodes, coaches }: Props) {
  const [codes, setCodes]       = useState(initialCodes)
  const [selectedCoach, setSelectedCoach] = useState('')
  const [generating, setGenerating] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleRevoke(id: string) {
    if (!confirm('¿Revocar este código? El link de invitación dejará de funcionar.')) return
    const res = await fetch(`/api/admin/invite-codes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCodes((prev) => prev.filter((c) => c.id !== id))
    } else {
      alert('Error al revocar el código.')
    }
  }

  async function handleGenerate() {
    if (!selectedCoach) return
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: selectedCoach }),
      })
      if (res.ok) {
        const data = await res.json()
        const coach = coaches.find((c) => c.id === selectedCoach) ?? coaches[0]
        const newCode: Code = {
          id: data.invite.id,
          code: data.invite.code,
          status: 'activo',
          expiresAt: new Date(data.invite.expiresAt),
          createdAt: new Date(),
          usedAt: null,
          coach,
          usedByUser: null,
        }
        setCodes((prev) => [newCode, ...prev])
        setSelectedCoach('')
        startTransition(() => { router.refresh() })
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Error al generar el código.')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Generador */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Generar código para un coach</h2>
        <div className="flex gap-3">
          <select
            value={selectedCoach}
            onChange={(e) => setSelectedCoach(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          >
            <option value="">Selecciona un coach…</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.email} — {c.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={!selectedCoach || generating || isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {generating ? 'Generando…' : 'Generar código'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            {codes.length} código{codes.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {codes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            Sin códigos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Código</th>
                  <th className="px-5 py-3 text-left">Coach</th>
                  <th className="px-5 py-3 text-left">Estado</th>
                  <th className="px-5 py-3 text-left">Usado por</th>
                  <th className="px-5 py-3 text-left">Vence / Usó</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                        {c.code}
                      </code>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{c.coach.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{c.coach.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {c.usedByUser ? (
                        <>
                          <p className="font-medium text-gray-700">{c.usedByUser.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{c.usedByUser.email}</p>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {c.usedAt
                        ? new Date(c.usedAt).toLocaleDateString('es-CO')
                        : new Date(c.expiresAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.status === 'activo' && (
                        <button
                          onClick={() => handleRevoke(c.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
