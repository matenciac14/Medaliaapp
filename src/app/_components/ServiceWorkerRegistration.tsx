'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      // En desarrollo: des-registrar el SW para evitar que sirva chunks viejos
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister())
      })
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {})
  }, [])

  return null
}
