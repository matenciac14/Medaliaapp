'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

export default function QuickLog({
  sessionId,
  initialCompleted,
}: {
  sessionId: string
  initialCompleted: boolean
}) {
  const router = useRouter()
  const [done, setDone] = useState(initialCompleted)
  const [loading, setLoading] = useState(false)

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg">
        <CheckCircle2 size={16} className="text-[#22c55e] shrink-0" />
        <span className="text-sm font-semibold text-[#16a34a]">Sesión completada</span>
      </div>
    )
  }

  async function complete() {
    setLoading(true)
    try {
      await fetch('/api/athlete/log/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedSessionId: sessionId }),
      })
      setDone(true)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={complete}
      disabled={loading}
      className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 bg-[#22c55e] hover:opacity-90 active:opacity-80 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-opacity disabled:opacity-60"
    >
      {loading
        ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
        : <><CheckCircle2 size={15} /> ¡Completé!</>
      }
    </button>
  )
}
