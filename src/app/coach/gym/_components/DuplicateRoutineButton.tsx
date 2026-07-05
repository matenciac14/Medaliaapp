'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DuplicateRoutineButton({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDuplicate() {
    setLoading(true)
    const res = await fetch(`/api/coach/gym/routines/${templateId}/copy`, {
      method: 'POST',
    })
    setLoading(false)

    if (!res.ok) return

    const { id } = await res.json()
    router.push(`/coach/gym/routines/${id}`)
    router.refresh()
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {loading ? 'Copiando...' : 'Duplicar'}
    </button>
  )
}
