'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MappedAthlete } from '../_lib/map-athlete'

type Athlete = MappedAthlete

const TABS = [
  { key: 'all',        label: 'Todos' },
  { key: 'alerts',     label: 'Con alertas' },
  { key: 'adherencia', label: 'Por adherencia' },
  { key: 'nocheckIn',  label: 'Sin check-in reciente' },
  { key: 'paused',     label: 'Pausados' },
]

const SPORT_LABELS: Record<string, string> = {
  RUNNING:    '🏃 Running',
  STRENGTH:   '🏋️ Fuerza',
  CYCLING:    '🚴 Ciclismo',
  SWIMMING:   '🏊 Natación',
  TRIATHLON:  '🏅 Triatlón',
  FOOTBALL:   '⚽ Fútbol',
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

function StatusBadge({ status }: { status: 'ACTIVE' | 'PAUSED' }) {
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={
        status === 'ACTIVE'
          ? { backgroundColor: '#dcfce7', color: '#16a34a' }
          : { backgroundColor: '#fef3c7', color: '#92400e' }
      }
    >
      {status === 'ACTIVE' ? 'ACTIVO' : 'PAUSADO'}
    </span>
  )
}

export default function AthleteTabs({
  athletes: initialAthletes,
  hasMore: initialHasMore,
  nextCursor: initialCursor,
  overdueAthleteIds = [],
}: {
  athletes: Athlete[]
  hasMore: boolean
  nextCursor: string | null
  overdueAthleteIds?: string[]
}) {
  const overdueSet = new Set(overdueAthleteIds)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [allAthletes, setAllAthletes] = useState<Athlete[]>(initialAthletes)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor)
  const [loading, setLoading] = useState(false)

  // Optimistic status — key: athleteId → 'ACTIVE' | 'PAUSED'
  const [statuses, setStatuses] = useState<Record<string, 'ACTIVE' | 'PAUSED'>>(() =>
    Object.fromEntries(initialAthletes.map((a) => [a.id, a.status]))
  )
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

  async function handleToggleStatus(athleteId: string) {
    const current = statuses[athleteId] ?? 'ACTIVE'
    const next: 'ACTIVE' | 'PAUSED' = current === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setToggling((p) => ({ ...p, [athleteId]: true }))
    setStatuses((p) => ({ ...p, [athleteId]: next }))
    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) setStatuses((p) => ({ ...p, [athleteId]: current }))
    } catch {
      setStatuses((p) => ({ ...p, [athleteId]: current }))
    } finally {
      setToggling((p) => ({ ...p, [athleteId]: false }))
    }
  }

  async function loadMore() {
    if (!nextCursor || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/coach/dashboard/athletes?cursor=${nextCursor}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAllAthletes((prev) => [...prev, ...data.athletes])
      setStatuses((prev) => ({
        ...prev,
        ...Object.fromEntries((data.athletes as Athlete[]).map((a) => [a.id, a.status])),
      }))
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch { /* silently fail */ } finally {
      setLoading(false)
    }
  }

  const q = search.trim().toLowerCase()
  const searched = q
    ? allAthletes.filter(
        (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      )
    : allAthletes

  const filtered = (() => {
    if (tab === 'alerts')     return searched.filter((a) => a.alertFlags.noCheckin || a.alertFlags.highRpe || a.alertFlags.weightDrop || a.alertFlags.adjustments.includes('fatiga_acumulada'))
    if (tab === 'nocheckIn')  return searched.filter((a) => a.lastCheckInDaysAgo >= 3)
    if (tab === 'paused')     return searched.filter((a) => (statuses[a.id] ?? a.status) === 'PAUSED')
    if (tab === 'adherencia') return [...searched].sort((a, b) => a.adherencePct - b.adherencePct)  // ascendente: peor adherencia primero
    return searched
  })()

  const pausedCount = allAthletes.filter((a) => (statuses[a.id] ?? a.status) === 'PAUSED').length

  return (
    <div>
      {/* Search + Tab bar */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full sm:w-72 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30 transition-shadow"
        />
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0"
              style={
                tab === t.key
                  ? { color: '#1e3a5f', borderBottom: '2px solid #1e3a5f', marginBottom: '-1px' }
                  : { color: '#6b7280' }
              }
            >
              {t.label}
              {t.key === 'paused' && pausedCount > 0 && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full leading-none">
                  {pausedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          {q ? `Sin resultados para "${search}"` : 'No hay atletas en esta categoría'}
        </p>
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
              {filtered.map((a) => {
                const currentStatus = statuses[a.id] ?? a.status
                const isToggling = toggling[a.id] ?? false
                return (
                  <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${currentStatus === 'PAUSED' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{a.name}</div>
                      {(a.alertFlags.noCheckin || a.alertFlags.highRpe || a.alertFlags.weightDrop || overdueSet.has(a.id) || a.alertFlags.adjustments.includes('fatiga_acumulada')) && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {a.alertFlags.adjustments.includes('fatiga_acumulada') && <span className="text-[10px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-bold">⚠ Fatiga</span>}
                          {a.alertFlags.noCheckin  && <span className="text-[10px] text-red-600    bg-red-50    px-1.5 py-0.5 rounded">⚠ Sin CI</span>}
                          {a.alertFlags.highRpe    && <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">⚠ Carga alta</span>}
                          {a.alertFlags.weightDrop && <span className="text-[10px] text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">⚠ Peso</span>}
                          {overdueSet.has(a.id)    && <span className="text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded font-semibold">💰 Mora</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {SPORT_LABELS[a.sport] ?? a.sport ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {a.totalWeeks > 0 ? (
                        <span className="font-medium text-gray-900">
                          {a.currentWeek}<span className="text-gray-400 font-normal">/{a.totalWeeks}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium" style={{ color: checkInColor(a.lastCheckInDaysAgo) }}>
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
                              backgroundColor: a.adherencePct >= 80 ? '#16a34a' : a.adherencePct >= 60 ? '#d97706' : '#dc2626',
                            }}
                          />
                        </div>
                        <span
          className="text-xs font-semibold"
          style={{ color: a.adherencePct >= 80 ? '#16a34a' : a.adherencePct >= 60 ? '#d97706' : '#dc2626' }}
        >{a.adherencePct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={currentStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(a.id)}
                          disabled={isToggling}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors disabled:opacity-40"
                        >
                          {isToggling ? '...' : currentStatus === 'ACTIVE' ? 'Pausar' : 'Reactivar'}
                        </button>
                        <Link
                          href={`/coach/athlete/${a.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#1e3a5f' }}
                        >
                          Ver →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards — mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map((athlete) => (
          <AthleteCard
            key={athlete.id}
            athlete={athlete}
            currentStatus={statuses[athlete.id] ?? athlete.status}
            isToggling={toggling[athlete.id] ?? false}
            onToggleStatus={() => handleToggleStatus(athlete.id)}
            hasOverdue={overdueSet.has(athlete.id)}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && tab === 'all' && !q && (
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

function AthleteCard({
  athlete,
  currentStatus,
  isToggling,
  onToggleStatus,
  hasOverdue = false,
}: {
  athlete: Athlete
  currentStatus: 'ACTIVE' | 'PAUSED'
  isToggling: boolean
  onToggleStatus: () => void
  hasOverdue?: boolean
}) {
  const hasFatiga = athlete.alertFlags.adjustments.includes('fatiga_acumulada')
  const hasAlerts = athlete.alertFlags.noCheckin || athlete.alertFlags.highRpe || athlete.alertFlags.weightDrop || hasOverdue || hasFatiga
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${currentStatus === 'PAUSED' ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">{athlete.name}</h3>
            <StatusBadge status={currentStatus} />
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

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Adherencia</span>
          <span className="font-medium">{athlete.adherencePct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${athlete.adherencePct}%`,
              backgroundColor: athlete.adherencePct >= 80 ? '#16a34a' : athlete.adherencePct >= 60 ? '#d97706' : '#dc2626',
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {hasAlerts ? (
          <div className="flex flex-wrap gap-1">
            {hasFatiga                         && <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">⚠ Fatiga</span>}
            {athlete.alertFlags.noCheckin      && <span className="text-[10px] bg-red-50    text-red-700    border border-red-100    px-1.5 py-0.5 rounded">⚠ Sin CI</span>}
            {athlete.alertFlags.highRpe        && <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-1.5 py-0.5 rounded">⚠ Carga alta</span>}
            {athlete.alertFlags.weightDrop     && <span className="text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-100 px-1.5 py-0.5 rounded">⚠ Peso</span>}
            {hasOverdue                        && <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-1.5 py-0.5 rounded font-semibold">💰 Mora</span>}
          </div>
        ) : <div />}
        <button
          onClick={onToggleStatus}
          disabled={isToggling}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors disabled:opacity-40 shrink-0"
        >
          {isToggling ? '...' : currentStatus === 'ACTIVE' ? 'Pausar' : 'Reactivar'}
        </button>
      </div>
    </div>
  )
}
