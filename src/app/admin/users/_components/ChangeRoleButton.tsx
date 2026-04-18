'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = ['ATHLETE', 'COACH', 'ADMIN']

interface Props {
  userId: string
  currentRole: string
}

export function ChangeRoleButton({ userId, currentRole }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(newRole: string) {
    if (newRole === currentRole) return
    setLoading(true)
    try {
      await fetch(`/api/admin/user/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      disabled={loading}
      defaultValue={currentRole}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-700 disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  )
}
