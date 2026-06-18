'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MappedAthlete } from '../_lib/map-athlete'

type Athlete = MappedAthlete

const TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'alerts', label: 'Con alertas' },
  { key: 'nocheckIn', label: 'Sin check-in reciente' },
]

const SPORT_LABELS: Record<string, string> = {
  RUNNING: '🏃 Running',
  CYCLING: '🚴 Ciclismo',
  SWIMMING: '🏊 Natación',
  TRIATHLON: '🏅 Triatlón',
  FOOTBALL: '⚽ Fútbol',
  STRENGTH: '🏋️ Fuerza',
}

function checkInColor(days: number): string {
  if (days < 3) return '#16a34a'
  if (days <= 7) return '#d97706'
  return '#dc2626'
}

function checkInLabel(days: number): string {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days >= 999) return 'Nunca'
  return `Hace ${days}d`
}

function statusBadge(planStatus: string) {
  const active = planStatus === 'ACTIVE'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={
        active
          ? { backgroundColor: '#dcfce7', color: '#16a34a' }
          : { backgroundColor: '#fff7ed', color: '#c2410c' }
      }
    >
      {active ? 'ACTIVO' : 'PENDIENTE'}
    </span>
  )
}

export default function AthleteTabs({
  athletes: initialAthletes,
  hasMore: initialHasMore,
  nextCursor: initialCursor,
}: {
  athletes: Athlete[]
  hasMore: boolean
  nextCursor: string | null
}) {
  const [tab, setTab] = useState('all')
  const [allAthletes, setAllAthletes] = useState<Athlete[]>(initialAthletes)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    if (!nextCursor || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/coach/dashboard/athletes?cursor=${nextCursor}`)
      if (!res.ok) throw new Error('Error cargando atletas')
      const data = await res.json()
      setAllAthletes((prev) => [...prev, ...data.athletes])
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false)
    }
  }

  const filtered =
    tab === 'all'
      ? allAthletes
      : tab === 'alerts'
      ? allAthletes.filter((a) => a.alerts.length > 0)
      : allAthletes.filter((a) => a.lastCheckInDaysAgo >= 3)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
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

      {filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No hay atletas en esta categoría</p>
      )}

      {/* Table — desktop */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deporte</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Semana</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-in</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Adherencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-gray-900">{a.name}</div>
                    {a.alerts.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {a.alerts.slice(0, 2).map((alert, i) => (
                          <span key={i} className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            ⚠ {alert}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {SPORT_LABELS[a.sport] ?? a.sport ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {a.totalWeeks > 0 ? (
                      <span className="font-medium text-gray-900">
                        {a.currentWeek}
                        <span className="text-gray-400 font-normal">/{a.totalWeeks}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="font-medium"
                      style={{ color: checkInColor(a.lastCheckInDaysAgo) }}
                    >
                      {checkInLabel(a.lastCheckInDaysAgo)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${a.adherencePct}%`,
                            backgroundColor:
                              a.adherencePct >= 70
                                ? '#16a34a'
                                : a.adherencePct >= 40
                                ? '#d97706'
                                : '#dc2626',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{a.adherencePct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">{statusBadge(a.planStatus)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/coach/athlete/${a.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#1e3a5f' }}
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map((athlete) => (
          <AthleteCard key={athlete.id} athlete={athlete} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && tab === 'all' && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Cargar más atletas'}
          </button>
        </div>
      )}
    </div>
  )
}

function AthleteCard({ athlete }: { athlete: Athlete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{athlete.name}</h3>
            {statusBadge(athlete.planStatus)}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{SPORT_LABELS[athlete.sport] ?? athlete.sport ?? '—'}</p>
        </div>
        <Link
          href={`/coach/athlete/${athlete.id}`}
          className="flex-shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          Ver →
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-3">
        <div>
          <span className="text-gray-400">Semana </span>
          <span className="font-semibold">{athlete.currentWeek}/{athlete.totalWeeks || '—'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: checkInColor(athlete.lastCheckInDaysAgo) }} />
          <span style={{ color: checkInColor(athlete.lastCheckInDaysAgo) }}>
            {checkInLabel(athlete.lastCheckInDaysAgo)}
          </span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Adherencia</span>
          <span className="font-medium">{athlete.adherencePct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${athlete.adherencePct}%`,
              backgroundColor:
                athlete.adherencePct >= 70
                  ? '#16a34a'
                  : athlete.adherencePct >= 40
                  ? '#d97706'
                  : '#dc2626',
            }}
          />
        </div>
      </div>

      {athlete.alerts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {athlete.alerts.map((alert, i) => (
            <span key={i} className="text-[10px] bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded">
              ⚠ {alert}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
