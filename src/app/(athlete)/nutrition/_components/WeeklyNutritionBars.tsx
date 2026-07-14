/**
 * NUT-F-03 — Gráfica de adherencia calórica diaria (barras 7 días).
 * Verde >90%, naranja 70-90%, rojo <70%, gris = sin datos.
 */
type DayBar = {
  label: string  // "Lun", "Mar"...
  pct: number | null  // null = sin logs
  isToday: boolean
}

export default function WeeklyNutritionBars({ days }: { days: DayBar[] }) {
  const MAX_BAR_H = 56  // px

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        📊 Adherencia calórica — últimos 7 días
      </p>
      <div className="flex items-end justify-between gap-1">
        {days.map((day, i) => {
          const h = day.pct !== null ? Math.max(4, Math.round((Math.min(day.pct, 100) / 100) * MAX_BAR_H)) : 0
          const color = day.pct === null
            ? '#e5e7eb'
            : day.pct >= 90
              ? '#22c55e'
              : day.pct >= 70
                ? '#f97316'
                : '#ef4444'
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {/* pct label — solo si hay datos */}
              <p className={`text-[9px] font-semibold ${day.pct !== null ? 'text-gray-500' : 'text-transparent'}`}>
                {day.pct !== null ? `${day.pct}%` : '—'}
              </p>
              {/* barra */}
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: `${h}px`, backgroundColor: color, minHeight: day.pct !== null ? '4px' : '0' }}
              />
              {/* etiqueta día */}
              <p className={`text-[10px] font-medium ${day.isToday ? 'text-[#ea580c] font-bold' : 'text-gray-400'}`}>
                {day.label}
              </p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {[
          { color: '#22c55e', label: '≥ 90%' },
          { color: '#f97316', label: '70–89%' },
          { color: '#ef4444', label: '< 70%' },
          { color: '#e5e7eb', label: 'Sin registro' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
