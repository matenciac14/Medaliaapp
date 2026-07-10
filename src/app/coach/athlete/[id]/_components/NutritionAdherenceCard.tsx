export type DayAdherence = {
  date: string
  kcalLogged: number
  targetKcal: number | null
  adherencePct: number | null
}

type Props = {
  data: DayAdherence[]
  loaded: boolean
}

function badgeColor(avgPct: number | null): { bg: string; text: string; label: string } {
  if (avgPct === null) return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Sin datos' }
  if (avgPct >= 80) return { bg: 'bg-green-100', text: 'text-green-700', label: `${avgPct}% promedio` }
  if (avgPct >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `${avgPct}% promedio` }
  return { bg: 'bg-red-100', text: 'text-red-700', label: `${avgPct}% promedio` }
}

export default function NutritionAdherenceCard({ data, loaded }: Props) {
  if (!loaded) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400">Sin registros de alimentación en las últimas 4 semanas.</p>
    )
  }

  // Dividir 28 días en 4 semanas (más reciente = semana 1)
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
  const weeks: DayAdherence[][] = [[], [], [], []]
  sorted.forEach((d, i) => {
    const weekIdx = Math.min(Math.floor(i / 7), 3)
    weeks[weekIdx].push(d)
  })

  const weekStats = weeks.map((week) => {
    const withData = week.filter((d) => d.adherencePct !== null)
    const daysLogged = week.filter((d) => d.kcalLogged > 0).length
    const avgPct =
      withData.length > 0
        ? Math.round(withData.reduce((s, d) => s + (d.adherencePct ?? 0), 0) / withData.length)
        : null
    return { avgPct, daysLogged }
  })

  const current = weekStats[0]
  const badge = badgeColor(current.avgPct)

  return (
    <div className="space-y-4">
      {/* Semana actual */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Esta semana</p>
          <p className="text-xs text-gray-400 mt-0.5">{current.daysLogged} de 7 días registrados</p>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Sparkline 4 semanas */}
      <div>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Tendencia 4 semanas</p>
        <div className="flex items-end gap-2 h-16">
          {weekStats.map((w, i) => {
            const heightPct = w.avgPct !== null ? Math.max(w.avgPct, 4) : 4
            const color = w.avgPct !== null && w.avgPct >= 80 ? '#ea580c' : '#d1d5db'
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${heightPct}%`, backgroundColor: color, minHeight: 4 }}
                    title={w.avgPct !== null ? `${w.avgPct}%` : 'Sin datos'}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {i === 0 ? 'Ahora' : `S${i + 1}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
