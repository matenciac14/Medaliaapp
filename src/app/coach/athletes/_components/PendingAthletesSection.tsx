'use client'

import { useState } from 'react'
import Link from 'next/link'

export type PendingAthlete = {
  athleteId: string
  name: string
  email: string
  addedAt: string // ISO string
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  return `hace ${days} días`
}

function CopyLinkButton({ athleteId }: { athleteId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')

  async function handleCopy() {
    setState('loading')
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/invite-link`)
      if (!res.ok) throw new Error()
      const { link } = await res.json()
      await navigator.clipboard.writeText(link).catch(() => {
        const el = document.createElement('textarea')
        el.value = link
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      })
      setState('copied')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={state === 'loading'}
      className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
      style={
        state === 'copied'
          ? { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }
          : state === 'error'
          ? { backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }
          : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#374151' }
      }
    >
      {state === 'loading' ? '…' : state === 'copied' ? '✓ Copiado' : state === 'error' ? 'Error' : '📋 Copiar link'}
    </button>
  )
}

export default function PendingAthletesSection({ athletes }: { athletes: PendingAthlete[] }) {
  if (athletes.length === 0) return null

  return (
    <div className="mb-6 bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
        <span className="text-amber-600">⏳</span>
        <h2 className="font-semibold text-amber-900 text-sm">Pendientes de onboarding</h2>
        <span className="ml-auto text-xs text-amber-600 font-medium">{athletes.length}</span>
      </div>
      <ul className="divide-y divide-amber-100">
        {athletes.map((a) => (
          <li key={a.athleteId} className="px-5 py-3.5 flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{a.name}</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Sin activar
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{a.email} · Invitado {daysAgo(a.addedAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CopyLinkButton athleteId={a.athleteId} />
              <Link
                href={`/coach/athlete/${a.athleteId}`}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Ver →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
