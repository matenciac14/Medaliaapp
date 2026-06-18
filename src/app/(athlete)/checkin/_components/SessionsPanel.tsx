import { SESSION_NAMES, SESSION_ICONS, DAY_LABELS } from '@/lib/constants/sessions'

export interface WeekSession {
  id: string
  dayOfWeek: number
  type: string
  durationMin: number
  completed: boolean
}

interface SessionsPanelProps {
  sessions: WeekSession[]
  showHeader?: boolean  // false = el parent ya renderiza el header (para embedding)
}

export default function SessionsPanel({ sessions, showHeader = true }: SessionsPanelProps) {
  const completedCount = sessions.filter((s) => s.completed && s.type !== 'DESCANSO').length
  const totalCount = sessions.filter((s) => s.type !== 'DESCANSO').length

  return (
    <div className={showHeader ? 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden' : ''}>
      {showHeader && (
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Sesiones de la semana
        </h3>
        {totalCount > 0 && (
          <span className="text-xs font-semibold text-[#1e3a5f]">
            {completedCount}/{totalCount}
          </span>
        )}
      </div>
      )}

      {sessions.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          Sin sesiones esta semana
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {sessions.map((s) => {
            const isRest = s.type === 'DESCANSO'
            const icon = SESSION_ICONS[s.type] ?? '🏅'
            const name = SESSION_NAMES[s.type] ?? s.type.replace(/_/g, ' ')
            const dayLabel = DAY_LABELS[s.dayOfWeek] ?? `Día ${s.dayOfWeek}`

            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-lg w-7 text-center shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-400">
                    {dayLabel}
                    {!isRest && ` · ${s.durationMin} min`}
                  </p>
                </div>
                <div className="shrink-0">
                  {isRest ? (
                    <span className="text-xs text-gray-400">Descanso</span>
                  ) : s.completed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      ✓ Listo
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Pendiente</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
