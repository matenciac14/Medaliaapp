'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DowngradeButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDowngrade() {
    setLoading(true)
    await fetch('/api/athlete/upgrade/downgrade', { method: 'POST' })
    router.push('/dashboard')
  }

  return (
    <button
      onClick={handleDowngrade}
      disabled={loading}
      className="block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {loading ? 'Procesando...' : 'Continuar gratis'}
    </button>
  )
}
