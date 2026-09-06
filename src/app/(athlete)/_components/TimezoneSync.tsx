'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'tz-synced'

export default function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz || sessionStorage.getItem(STORAGE_KEY) === tz) return

    fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    }).then(res => {
      if (res.ok) sessionStorage.setItem(STORAGE_KEY, tz)
    }).catch(() => {})
  }, [])

  return null
}
