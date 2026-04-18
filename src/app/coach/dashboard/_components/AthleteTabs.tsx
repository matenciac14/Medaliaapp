'use client'

import { useState } from 'react'
import Link from 'next/link'

type Athlete = {
  id: string
  name: string
  email: string
  goal: string
  currentWeek: number
  totalWeeks: number
  phase: string
  lastCheckInDaysAgo: number
  weightKg: number
  weightGoalKg: number
  hrResting: number
  adherencePct: number
  alerts: string[]
  planStatus: string
}

const TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'alerts', label: 'Con alertas' },
  { key: 'nocheckIn', label: 'Sin check-in reciente' },
]

function checkInColor(days: number): string {
  if (days < 3) return '#16a34a'
  if (days <= 7) return '#d97706'
  return '#dc2626'
}

function checkInLabel(days: number): string {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

export default function AthleteTabs({ athletes }: { athletes: Athlete[] }) {
  const [tab, setTab] = useState('all')

  const filtered =
    tab === 'all'
      ? athletes
      : tab === 'alerts'
      ? athletes.filter((a) => a.alerts.length > 0)
      : athletes.filter((a) => a.lastCheckInDaysAgo >= 3)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors"
            style={
              tab === t.key
                ? { color: '#1e3a5f', borderBottom: '2px solid #1e3a5f', marginBottom: '-1px' }
                : { color: '#6b7280' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Athlete cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No hay atletas en esta categoría</p>
        )}
        {filtered.map((athlete) => (
          <AthleteCard key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}

function AthleteCard({ athlete }: { athlete: Athlete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base">{athlete.name}</h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#1e3a5f', color: 'white' }}
            >
              {athlete.phase}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3">{athlete.goal}</p>

          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            {/* Semana */}
            <div>
              <span className="text-gray-400">Semana </span>
              <span className="font-semibold">
                {athlete.currentWeek}/{athlete.totalWeeks}
              </span>
            </div>

            {/* Último check-in */}
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: checkInColor(athlete.lastCheckInDaysAgo) }}
              />
              <span style={{ color: checkInColor(athlete.lastCheckInDaysAgo) }}>
                {checkInLabel(athlete.lastCheckInDaysAgo)}
              </span>
            </div>
          </div>

          {/* Adherencia */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Adherencia</span>
              <span className="font-medium">{athlete.adherencePct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${athlete.adherencePct}%`,
                  backgroundColor: athlete.adherencePct >= 70 ? '#16a34a' : athlete.adherencePct >= 40 ? '#d97706' : '#dc2626',
                }}
              />
            </div>
          </div>

          {/* Alertas */}
          {athlete.alerts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {athlete.alerts.map((alert, i) => (
                <span
                  key={i}
                  className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full"
                >
                  ⚠ {alert}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          <Link
            href={`/coach/athlete/${athlete.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Ver detalle
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
