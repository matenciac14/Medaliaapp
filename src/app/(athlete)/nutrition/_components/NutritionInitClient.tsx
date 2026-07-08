'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Dispara POST /api/nutrition/init en el cliente y refresca la página cuando termina.
// Renderizado solo cuando el Server Component detecta que falta el NutritionPlan base.
export default function NutritionInitClient() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/nutrition/init', { method: 'POST' })
      .then(() => router.refresh())
      .catch(() => {})
  }, [router])

  return null
}
