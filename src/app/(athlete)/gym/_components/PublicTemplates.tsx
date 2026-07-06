'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, Users, BarChart2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type PublicTemplate = {
  id: string
  name: string
  description: string | null
  goal: string | null
  level: string | null
  daysPerWeek: number
  category: string | null
  days: { isRestDay: boolean }[]
}

const GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Fuerza',
  TONING: 'Tonificación',
  FUNCTIONAL: 'Funcional',
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER:     'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED:     'bg-red-100 text-red-700',
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER:     'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED:     'Avanzado',
}

const CATEGORY_ICONS: Record<string, string> = {
  PPL:         '🔄',
  FULL_BODY:   '💪',
  UPPER_LOWER: '↕️',
  STRENGTH:    '🏋️',
  BEGINNER:    '🌱',
}

export default function PublicTemplates({ templates }: { templates: PublicTemplate[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  async function handleSelect(templateId: string) {
    setLoading(templateId)
    try {
      const res = await fetch('/api/gym/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      if (res.ok) {
        setSelected(templateId)
        setTimeout(() => router.refresh(), 800)
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Elige tu rutina</h2>
        <p className="text-sm text-gray-500 mt-0.5">Selecciona una plantilla y empieza hoy mismo — sin coach, sin configuración extra.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map((tmpl) => {
          const trainingDays = tmpl.days.filter(d => !d.isRestDay).length
          const isLoading = loading === tmpl.id
          const isDone = selected === tmpl.id

          return (
            <div
              key={tmpl.id}
              className={cn(
                'bg-white border rounded-2xl shadow-sm overflow-hidden transition-all',
                isDone ? 'border-[#22c55e]' : 'border-gray-200 hover:border-[#1e3a5f]/40'
              )}
            >
              {/* Header */}
              <div className="bg-[#1e3a5f] px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-2xl">{CATEGORY_ICONS[tmpl.category ?? ''] ?? '💪'}</span>
                    <h3 className="text-white font-bold text-base mt-1 leading-tight">{tmpl.name}</h3>
                  </div>
                  {tmpl.level && (
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-1', LEVEL_COLORS[tmpl.level] ?? 'bg-gray-100 text-gray-600')}>
                      {LEVEL_LABELS[tmpl.level] ?? tmpl.level}
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-gray-600 leading-relaxed">{tmpl.description}</p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Dumbbell size={13} />
                    {GOAL_LABELS[tmpl.goal ?? ''] ?? tmpl.goal}
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart2 size={13} />
                    {trainingDays} días/semana
                  </span>
                </div>

                <button
                  onClick={() => handleSelect(tmpl.id)}
                  disabled={isLoading || !!selected}
                  className={cn(
                    'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                    isDone
                      ? 'bg-[#22c55e] text-white'
                      : 'bg-[#ea580c] hover:bg-orange-600 text-white disabled:opacity-50'
                  )}
                >
                  {isDone ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 size={15} /> Seleccionada
                    </span>
                  ) : isLoading ? 'Aplicando...' : 'Elegir esta rutina →'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Users size={16} className="text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700">
          ¿Tienes un coach? Tu coach puede asignarte una rutina personalizada que reemplazará la plantilla pública.
        </p>
      </div>
    </div>
  )
}
