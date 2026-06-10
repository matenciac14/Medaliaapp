'use client'

import { useState } from 'react'

export function AICoachToggle({ userId, enabled }: { userId: string; enabled: boolean }) {
  const [active, setActive] = useState(enabled)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/ai-coach`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !active }),
      })
      if (res.ok) setActive((prev) => !prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        active ? 'bg-[#f97316]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
