'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, Globe } from 'lucide-react'

type Proposal = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  country: string | null
  notes: string | null
  status: string
  reviewNote: string | null
  foodId: string | null
  createdAt: Date
  submittedBy?: { name: string | null } | null
}

function formatRelative(d: Date): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `hace ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export function ProposalsClient({ proposals: initial }: { proposals: Proposal[] }) {
  const router = useRouter()
  const [proposals, setProposals] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})
  const [showRejectInput, setShowRejectInput] = useState<Record<string, boolean>>({})

  async function review(proposalId: string, action: 'APPROVE' | 'REJECT') {
    setBusy(proposalId)
    try {
      await fetch(`/api/admin/nutrition/proposals/${proposalId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, reviewNote: rejectNote[proposalId] }),
      })
      setProposals(prev => prev.filter(p => p.id !== proposalId))
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const pending = proposals.filter(p => p.status === 'PENDING')

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle size={48} className="text-green-300 mb-4" />
        <p className="text-gray-500 font-medium">Sin propuestas pendientes</p>
        <p className="text-sm text-gray-400 mt-1">Todas las propuestas de alimentos han sido revisadas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pending.map((p) => (
        <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.category}</span>
                {p.country && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                    <Globe size={10} />
                    {p.country}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelative(p.createdAt)}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                <span><strong>{Math.round(p.kcalPer100g)}</strong> kcal</span>
                <span>P <strong>{p.proteinPer100g.toFixed(1)}g</strong></span>
                <span>C <strong>{p.carbsPer100g.toFixed(1)}g</strong></span>
                <span>G <strong>{p.fatPer100g.toFixed(1)}g</strong></span>
                <span className="text-gray-400">por 100g</span>
              </div>

              {p.notes && (
                <p className="mt-1.5 text-sm text-gray-500 italic">"{p.notes}"</p>
              )}
              {p.submittedBy?.name && (
                <p className="mt-1 text-xs text-gray-400">Propuesto por: {p.submittedBy.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => review(p.id, 'APPROVE')}
                disabled={busy === p.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <CheckCircle size={14} />
                Aprobar
              </button>
              <button
                onClick={() => setShowRejectInput(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                disabled={busy === p.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <XCircle size={14} />
                Rechazar
              </button>
            </div>
          </div>

          {showRejectInput[p.id] && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Motivo del rechazo (opcional)"
                value={rejectNote[p.id] ?? ''}
                onChange={(e) => setRejectNote(prev => ({ ...prev, [p.id]: e.target.value }))}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <button
                onClick={() => review(p.id, 'REJECT')}
                disabled={busy === p.id}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
