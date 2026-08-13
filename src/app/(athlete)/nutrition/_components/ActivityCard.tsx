// NUT-DASH-01 — Sesión del día visible en pantalla de nutrición
// Muestra tipo, duración y kcal estimadas quemadas cuando el atleta tiene sesión planificada o de gym hoy.

import { Dumbbell, Timer, Flame } from 'lucide-react'

type Props = {
  sessionType: string | null   // PlannedSession.type (e.g. RODAJE_Z2, FUERZA)
  intensity: string | null     // PlannedSession.intensity (HIGH/MODERATE/LOW/REST)
  durationMin: number | null
  isGymDay: boolean
}

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2:    'Rodaje Z2',
  FARTLEK:      'Fartlek',
  TEMPO:        'Tempo',
  INTERVALOS:   'Intervalos',
  TIRADA_LARGA: 'Tirada larga',
  FUERZA:       'Entrenamiento de fuerza',
  CICLA:        'Entrenamiento en bici',
  NATACION:     'Natación',
  TEST:         'Test de rendimiento',
  SIMULACRO:    'Simulacro de carrera',
  OTRO:         'Sesión de entrenamiento',
}

const INTENSITY_KCAL: Record<string, number> = {
  HIGH:     520,
  MODERATE: 360,
  LOW:      200,
}

const INTENSITY_COLOR: Record<string, string> = {
  HIGH:     'border-red-200 bg-red-50',
  MODERATE: 'border-orange-200 bg-orange-50',
  LOW:      'border-blue-200 bg-blue-50',
}

export default function ActivityCard({ sessionType, intensity, durationMin, isGymDay }: Props) {
  const label = sessionType ? (SESSION_LABELS[sessionType] ?? 'Sesión de entrenamiento') : (isGymDay ? 'Entrenamiento de fuerza' : null)

  if (!label) return null

  const estKcal = intensity ? (INTENSITY_KCAL[intensity] ?? null) : (isGymDay ? 360 : null)
  const borderBg = intensity ? (INTENSITY_COLOR[intensity] ?? 'border-gray-200 bg-gray-50') : 'border-orange-200 bg-orange-50'

  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${borderBg}`}>
      <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
        <Dumbbell size={18} className="text-gray-600" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Día de entrenamiento</p>
        <p className="text-sm font-bold text-gray-900 truncate">{label}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
        {durationMin && durationMin > 0 && (
          <span className="flex items-center gap-1">
            <Timer size={13} />
            {durationMin} min
          </span>
        )}
        {estKcal && (
          <span className="flex items-center gap-1 text-orange-600 font-semibold">
            <Flame size={13} />
            ~{estKcal} kcal
          </span>
        )}
      </div>
    </div>
  )
}
