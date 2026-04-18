'use client'

import { useState } from 'react'

export function JoinProgramButton({
  profileId,
  programId,
}: {
  profileId: string
  programId: string
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleJoin() {
    setStatus('loading')
    try {
      const res = await fetch('/api/coach/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, programId }),
      })
      if (res.ok) {
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <span className="inline-block text-green-700 bg-green-50 text-sm font-semibold px-5 py-2 rounded-xl">
        Solicitud enviada
      </span>
    )
  }

  return (
    <button
      onClick={handleJoin}
      disabled={status === 'loading'}
      className="bg-[#f97316] hover:bg-[#ea6c0a] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
    >
      {status === 'loading' ? 'Procesando…' : 'Unirme a este programa'}
    </button>
  )
}
