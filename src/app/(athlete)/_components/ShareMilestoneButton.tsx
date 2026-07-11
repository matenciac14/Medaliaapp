'use client'

import { useState } from 'react'

interface Props {
  type: 'PR' | 'STREAK' | 'PERFECT_WEEK'
  context: {
    exerciseName?: string | null
    weightKg?: number | null
    streakDays?: number
    weekLabel?: string
    completedSessions?: number
  }
}

const APP_URL = 'https://medaliq.com'

function buildShareText(type: Props['type'], ctx: Props['context']): string {
  if (type === 'PR') {
    return `¡Nuevo PR en ${ctx.exerciseName}! 🏋️ ${ctx.weightKg}kg en Medaliq. #EntrenamientoInteligente`
  }
  if (type === 'STREAK') {
    return `¡${ctx.streakDays} días seguidos entrenando! 🔥 Racha activa en Medaliq. #Consistencia`
  }
  // PERFECT_WEEK
  return `¡Semana perfecta completada! ✅ ${ctx.completedSessions} sesiones esta semana en Medaliq. #MedalIQ`
}

export default function ShareMilestoneButton({ type, context }: Props) {
  const [label, setLabel] = useState('Compartir 📤')

  async function handleShare() {
    const text = buildShareText(type, context)
    const url = APP_URL

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'MedalIQ', text, url })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setLabel('¡Copiado al portapapeles!')
      setTimeout(() => setLabel('Compartir 📤'), 2500)
    } catch {
      // clipboard also unavailable — silent fail
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-[#ea580c] hover:text-[#ea580c] transition-colors"
    >
      {label}
    </button>
  )
}
