'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MappedAthlete } from '../_lib/map-athlete'
import AthleteDropdown from './AthleteDropdown'

type Athlete = MappedAthlete

const SPORT_LABELS: Record<string, string> = {
  RUNNING:   'Running',
  STRENGTH:  'Fuerza',
  CYCLING:   'Ciclismo',
  SWIMMING:  'Natación',
  TRIATHLON: 'Triatlón',
  FOOTBALL:  'Fútbol',
}

const AVATAR_COLORS = [
  '#1e3a5f', '#16a34a', '#ea580c', '#7c3aed',
  '#0891b2', '#dc2626', '#d97706', '#0d9488',
]
function avatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
}

// Figma: ≤1d = #218c21 · 2-6d = #6b737d · ≥7d = #db2626
function checkInColor(days: number): string {
  if (days <= 1) return '#218c21'
  if (days < 7)  return '#6b737d'
  return '#db2626'
}
function checkInLabel(days: number): string {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days >= 999) return 'Nunca'
  return `Hace ${days}d`
}

// Figma: ≥75% = #1e3a5f · 50-74% = #ea580c · <50% = #db2626
function adherenceColor(pct: number): string {
  if (pct >= 75) return '#1e3a5f'
  if (pct >= 50) return '#ea580c'
  return '#db2626'
}

function hasAlerts(a: Athlete): boolean {
  return a.alertFlags.noCheckin || a.alertFlags.highRpe || a.alertFlags.weightDrop
}

export default function AthleteTabs({
  athletes: initialAthletes,
  hasMore: initialHasMore,
  nextCursor: initialCursor,
  overdueAthleteIds = [],
  totalCount,
}: {
  athletes: Athlete[]
  hasMore: boolean
  nextCursor: string | null
  overdueAthleteIds?: string[]
  totalCount: number
}) {
  const overdueSet = new Set(overdueAthleteIds)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [allAthletes, setAllAthletes] = useState<Athlete[]>(initialAthletes)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor)
  const [loading, setLoading] = useState(false)

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
      const res = await fetch(`/api/coach/athletes/${athleteId}/status`, {
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
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const q = search.trim().toLowerCase()
  const searched = q
    ? allAthletes.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
    : allAthletes

  const pausedCount    = allAthletes.filter((a) => (statuses[a.id] ?? a.status) === 'PAUSED').length
  const alertsCount    = allAthletes.filter(hasAlerts).length
  const noCheckInCount = allAthletes.filter((a) => a.lastCheckInDaysAgo >= 7).length

  const TABS = [
    { key: 'all',        label: 'Todos',          count: allAthletes.length },
    { key: 'alerts',     label: 'Con alertas',    count: alertsCount },
    { key: 'adherencia', label: 'Por adherencia', count: null },
    { key: 'nocheckIn',  label: 'Sin check-in',   count: noCheckInCount },
    { key: 'paused',     label: 'Pausados',       count: pausedCount },
  ]

  const filtered = (() => {
    if (tab === 'alerts')     return searched.filter(hasAlerts)
    if (tab === 'nocheckIn')  return searched.filter((a) => a.lastCheckInDaysAgo >= 7)
    if (tab === 'paused')     return searched.filter((a) => (statuses[a.id] ?? a.status) === 'PAUSED')
    if (tab === 'adherencia') return [...searched].sort((a, b) => a.adherencePct - b.adherencePct)
    return searched
  })()

  return (
    <div className="flex flex-col gap-4">
      {/* Search input — standalone */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email..."
        className="focus:outline-none"
        style={{
          width: 280,
          height: 36,
          border: '1px solid #e5e8eb',
          borderRadius: 8,
          padding: '9px 12px',
          fontSize: 13,
          color: '#525963',
          backgroundColor: '#ffffff',
        }}
      />

      {/* Tabs row — standalone, outside the table card */}
      <div className="flex flex-col">
        <div className="flex items-end overflow-x-auto" style={{ gap: 28, paddingBottom: 10 }}>
          {TABS.map((t) => {
            const active = tab === t.key
            const label = t.count !== null ? `${t.label} (${t.count})` : t.label
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex flex-col items-start shrink-0 transition-colors"
                style={{ gap: 6 }}
              >
                <span
                  className="whitespace-nowrap"
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? '#1e3a5f' : '#6b737d',
                  }}
                >
                  {label}
                </span>
                {active && (
                  <div style={{ height: 2, width: '100%', backgroundColor: '#ea580c', borderRadius: 1 }} />
                )}
              </button>
            )
          })}
        </div>
        {/* Tab separator */}
        <div style={{ height: 1, backgroundColor: '#e5e8eb', width: '100%' }} />
      </div>

      {/* Table card */}
      <div
        className="bg-white w-full"
        style={{ border: '1px solid #e5e8eb', borderRadius: 12 }}
      >
        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p style={{ fontSize: 13, color: '#9ea6b0' }}>
              {q ? `Sin resultados para "${search}"` : 'No hay atletas en esta categoría'}
            </p>
          </div>
        )}

        {/* Table — desktop */}
        {filtered.length > 0 && (
          <div className="hidden md:block">
            <table className="w-full table-fixed" style={{ fontSize: 13 }}>
              <colgroup>
                <col style={{ width: '22%' }} />  {/* NOMBRE */}
                <col style={{ width: '8%' }} />   {/* DEPORTE */}
                <col style={{ width: '6%' }} />   {/* HOY */}
                <col style={{ width: '9%' }} />   {/* SEMANA */}
                <col style={{ width: '9%' }} />   {/* CHECK-IN */}
                <col style={{ width: '9%' }} />   {/* PESO */}
                <col style={{ width: '16%' }} />  {/* ADHERENCIA */}
                <col style={{ width: '8%' }} />   {/* ESTADO */}
                <col style={{ width: '13%' }} />  {/* ACCIONES */}
              </colgroup>

              {/* Header */}
              <thead>
                <tr style={{ backgroundColor: '#f2f5f7' }}>
                  <th className="text-left" style={{ padding: '14px 20px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>NOMBRE</th>
                  <th className="text-left whitespace-nowrap" style={{ padding: '14px 8px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>DEPORTE</th>
                  <th className="text-left whitespace-nowrap" style={{ padding: '14px 8px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>HOY</th>
                  <th className="text-left whitespace-nowrap" style={{ padding: '14px 8px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>SEMANA</th>
                  <th className="text-left whitespace-nowrap" style={{ padding: '14px 8px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>
                    CHECK-IN <span style={{ fontSize: 10, color: '#9ea6b0', fontWeight: 500 }}>↕</span>
                  </th>
                  <th className="text-left whitespace-nowrap" style={{ padding: '14px 8px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>
                    PESO <span style={{ fontSize: 10, color: '#9ea6b0', fontWeight: 500 }}>↕</span>
                  </th>
                  <th className="text-left whitespace-nowrap" style={{ padding: '14px 8px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>
                    ADHERENCIA <span style={{ fontSize: 10, color: '#9ea6b0', fontWeight: 500 }}>↕</span>
                  </th>
                  <th className="text-left whitespace-nowrap" style={{ padding: '14px 8px', fontSize: 11, fontWeight: 600, color: '#6b737d' }}>ESTADO</th>
                  <th style={{ padding: '14px 8px' }} />
                </tr>
              </thead>

              {/* Header separator */}
              <tbody>
                {filtered.map((a) => {
                  const currentStatus = statuses[a.id] ?? a.status
                  const isToggling    = toggling[a.id] ?? false
                  const rowAlert      = hasAlerts(a)
                  const atPlanEnd     = a.totalWeeks > 0 && a.currentWeek >= a.totalWeeks

                  // Weight trend — Figma: ↓ red, ↑ green, = gray
                  const drop = a.alertFlags.weightDropKg
                  const trendChar  = drop > 0.2 ? '↓' : drop < -0.2 ? '↑' : '='
                  const trendColor = drop > 0.2 ? '#db2626' : drop < -0.2 ? '#218c21' : '#6b737d'

                  return (
                    <tr
                      key={a.id}
                      style={{
                        backgroundColor: rowAlert ? '#fef2f2' : '#ffffff',
                        borderTop: '1px solid #e5e8eb',
                      }}
                    >
                      {/* NOMBRE */}
                      <td style={{ padding: '12px 20px' }}>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <div
                            className="flex items-center justify-center text-white font-semibold shrink-0"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: avatarColor(a.name),
                              fontSize: 13,
                            }}
                          >
                            {a.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex flex-col" style={{ gap: 3 }}>
                            {/* Figma: name color #525963 font-medium */}
                            <p className="whitespace-nowrap font-medium" style={{ fontSize: 13, color: '#525963' }}>{a.name}</p>
                            <div className="flex flex-wrap" style={{ gap: 4 }}>
                              {/* Figma: ALL badges neutral — #f2f5f7 bg / #6b737d text */}
                              {a.alertFlags.noCheckin && (
                                <span className="font-medium" style={{ fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '2px 5px', borderRadius: 4 }}>Sin CI</span>
                              )}
                              {a.alertFlags.highRpe && (
                                <span className="font-medium" style={{ fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '2px 5px', borderRadius: 4 }}>RPE alto</span>
                              )}
                              {a.alertFlags.weightDrop && a.alertFlags.weightDropKg > 0 && (
                                <span className="font-medium" style={{ fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '2px 5px', borderRadius: 4 }}>
                                  -{a.alertFlags.weightDropKg.toFixed(1)}kg
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* DEPORTE — Figma: text-12px regular #6b737d */}
                      <td className="whitespace-nowrap" style={{ padding: '12px 8px', fontSize: 12, color: '#6b737d' }}>
                        {SPORT_LABELS[a.sport] ?? a.sport ?? '—'}
                      </td>

                      {/* HOY — Figma: ALL orange #ea580c font-semibold text-11px */}
                      <td className="whitespace-nowrap" style={{ padding: '12px 8px' }}>
                        {a.todaySession ? (
                          <span className="font-semibold" style={{ fontSize: 11, color: '#ea580c' }}>
                            {a.todaySession.label}
                          </span>
                        ) : (
                          <span className="font-semibold" style={{ fontSize: 11, color: '#9ea6b0' }}>—</span>
                        )}
                      </td>

                      {/* SEMANA — Figma: single text, #525963 normal, #ea580c semibold when at end */}
                      <td className="whitespace-nowrap" style={{ padding: '12px 8px' }}>
                        {a.totalWeeks > 0 ? (
                          <span
                            style={{
                              fontSize: 13,
                              color: atPlanEnd ? '#ea580c' : '#525963',
                              fontWeight: atPlanEnd ? 600 : 400,
                            }}
                          >
                            Sem {a.currentWeek}/{a.totalWeeks}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: '#9ea6b0' }}>—</span>
                        )}
                      </td>

                      {/* CHECK-IN — Figma: font-regular text-12px */}
                      <td className="whitespace-nowrap" style={{ padding: '12px 8px' }}>
                        <span style={{ fontSize: 12, color: checkInColor(a.lastCheckInDaysAgo) }}>
                          {checkInLabel(a.lastCheckInDaysAgo)}
                        </span>
                      </td>

                      {/* PESO — Figma: two lines gap-px, text-12px regular */}
                      <td className="whitespace-nowrap" style={{ padding: '12px 8px' }}>
                        {a.weightKg != null ? (
                          <div className="flex flex-col" style={{ gap: 1 }}>
                            <span style={{ fontSize: 12, color: '#525963' }}>{a.weightKg.toFixed(1)} kg</span>
                            <span style={{ fontSize: 11, color: trendColor }}>{trendChar}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: '#9ea6b0' }}>—</span>
                        )}
                      </td>

                      {/* ADHERENCIA — Figma: bar bg #e5e8eb w-80px, gap-8px, % font-medium text-11px */}
                      <td style={{ padding: '12px 8px' }}>
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <div
                            className="overflow-hidden shrink-0"
                            style={{ width: 80, height: 6, backgroundColor: '#e5e8eb', borderRadius: 3 }}
                          >
                            <div
                              style={{
                                width: `${a.adherencePct}%`,
                                height: '100%',
                                backgroundColor: '#1e3a5f',
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span className="font-medium whitespace-nowrap" style={{ fontSize: 11, color: adherenceColor(a.adherencePct) }}>
                            {a.adherencePct}%
                          </span>
                        </div>
                      </td>

                      {/* ESTADO — Figma: rounded-4px (not full), ACTIVO bg #edf7ed text #218c21 */}
                      <td className="whitespace-nowrap" style={{ padding: '12px 8px' }}>
                        <span
                          className="font-semibold"
                          style={
                            currentStatus === 'ACTIVE'
                              ? { fontSize: 10, backgroundColor: '#edf7ed', color: '#218c21', padding: '4px 8px', borderRadius: 4 }
                              : { fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '4px 8px', borderRadius: 4 }
                          }
                        >
                          {currentStatus === 'ACTIVE' ? 'ACTIVO' : 'PAUSADO'}
                        </span>
                      </td>

                      {/* ACCIONES — Figma: gap-8px, "..." px-8px py-4px text-16px rounded-6px, "Ver →" px-10px py-6px text-11px rounded-6px */}
                      <td style={{ padding: '12px 8px' }}>
                        <div className="flex items-center justify-end" style={{ gap: 8 }}>
                          <AthleteDropdown
                            athleteId={a.id}
                            status={currentStatus}
                            isToggling={isToggling}
                            onToggleStatus={() => handleToggleStatus(a.id)}
                          />
                          <Link
                            href={`/coach/athletes/${a.id}`}
                            className="font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                            style={{ fontSize: 11, backgroundColor: '#1e3a5f', padding: '6px 10px', borderRadius: 6 }}
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

        {/* Footer — Figma: px-20px py-12px, "Cargar más →" text-11px #1e3a5f border #e5e8eb */}
        {filtered.length > 0 && (
          <div
            className="flex items-center justify-between"
            style={{ padding: '12px 20px', borderTop: '1px solid #e5e8eb' }}
          >
            <p style={{ fontSize: 12, color: '#9ea6b0' }}>
              Mostrando {filtered.length} de {totalCount} atletas
            </p>
            {hasMore && tab === 'all' && !q && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
                style={{
                  fontSize: 11,
                  color: '#1e3a5f',
                  border: '1px solid #e5e8eb',
                  padding: '6px 14px',
                  borderRadius: 6,
                  backgroundColor: '#ffffff',
                }}
              >
                {loading ? 'Cargando...' : 'Cargar más →'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden flex flex-col" style={{ gap: 12 }}>
        {filtered.map((athlete) => (
          <MobileAthleteCard
            key={athlete.id}
            athlete={athlete}
            currentStatus={statuses[athlete.id] ?? athlete.status}
            isToggling={toggling[athlete.id] ?? false}
            onToggleStatus={() => handleToggleStatus(athlete.id)}
            hasOverdue={overdueSet.has(athlete.id)}
          />
        ))}
        {hasMore && tab === 'all' && !q && (
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full font-medium disabled:opacity-50 hover:opacity-80 transition-opacity"
            style={{ padding: '12px 0', fontSize: 13, border: '1px solid #e5e8eb', borderRadius: 10, color: '#6b737d', backgroundColor: '#ffffff' }}
          >
            {loading ? 'Cargando...' : 'Cargar más atletas'}
          </button>
        )}
      </div>
    </div>
  )
}

function MobileAthleteCard({
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
  const rowAlert = hasAlerts(athlete)
  const drop = athlete.alertFlags.weightDropKg
  const trendChar  = drop > 0.2 ? '↓' : drop < -0.2 ? '↑' : '='
  const trendColor = drop > 0.2 ? '#db2626' : drop < -0.2 ? '#218c21' : '#6b737d'

  return (
    <div
      className="bg-white"
      style={{
        border: rowAlert ? '1px solid #fecaca' : '1px solid #e5e8eb',
        borderRadius: 10,
        padding: 16,
        backgroundColor: rowAlert ? '#fef2f2' : '#ffffff',
      }}
    >
      <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 12 }}>
        <div className="flex items-center min-w-0" style={{ gap: 10 }}>
          <div
            className="flex items-center justify-center text-white font-semibold shrink-0"
            style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: avatarColor(athlete.name), fontSize: 13 }}
          >
            {athlete.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex flex-col" style={{ gap: 3 }}>
            <p className="font-medium truncate" style={{ fontSize: 13, color: '#525963' }}>{athlete.name}</p>
            <div className="flex flex-wrap" style={{ gap: 4 }}>
              {athlete.alertFlags.noCheckin && (
                <span className="font-medium" style={{ fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '2px 5px', borderRadius: 4 }}>Sin CI</span>
              )}
              {athlete.alertFlags.highRpe && (
                <span className="font-medium" style={{ fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '2px 5px', borderRadius: 4 }}>RPE alto</span>
              )}
              {athlete.alertFlags.weightDrop && athlete.alertFlags.weightDropKg > 0 && (
                <span className="font-medium" style={{ fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '2px 5px', borderRadius: 4 }}>
                  -{athlete.alertFlags.weightDropKg.toFixed(1)}kg
                </span>
              )}
              {hasOverdue && (
                <span className="font-medium" style={{ fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '2px 5px', borderRadius: 4 }}>Mora</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <span
            className="font-semibold"
            style={
              currentStatus === 'ACTIVE'
                ? { fontSize: 10, backgroundColor: '#edf7ed', color: '#218c21', padding: '4px 8px', borderRadius: 4 }
                : { fontSize: 10, backgroundColor: '#f2f5f7', color: '#6b737d', padding: '4px 8px', borderRadius: 4 }
            }
          >
            {currentStatus === 'ACTIVE' ? 'ACTIVO' : 'PAUSADO'}
          </span>
          <Link
            href={`/coach/athletes/${athlete.id}`}
            className="font-semibold text-white hover:opacity-90"
            style={{ fontSize: 11, backgroundColor: '#1e3a5f', padding: '6px 10px', borderRadius: 6 }}
          >
            Ver →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '8px 16px', marginBottom: 12 }}>
        <div className="flex flex-col" style={{ gap: 2 }}>
          <p style={{ fontSize: 11, color: '#9ea6b0' }}>Semana</p>
          <p className="font-medium" style={{ fontSize: 13, color: '#525963' }}>
            {athlete.totalWeeks > 0 ? `Sem ${athlete.currentWeek}/${athlete.totalWeeks}` : '—'}
          </p>
        </div>
        <div className="flex flex-col" style={{ gap: 2 }}>
          <p style={{ fontSize: 11, color: '#9ea6b0' }}>Check-in</p>
          <p style={{ fontSize: 12, color: checkInColor(athlete.lastCheckInDaysAgo) }}>
            {checkInLabel(athlete.lastCheckInDaysAgo)}
          </p>
        </div>
        {athlete.todaySession && (
          <div className="flex flex-col" style={{ gap: 2 }}>
            <p style={{ fontSize: 11, color: '#9ea6b0' }}>Hoy</p>
            <p className="font-semibold" style={{ fontSize: 11, color: '#ea580c' }}>{athlete.todaySession.label}</p>
          </div>
        )}
        {athlete.weightKg != null && (
          <div className="flex flex-col" style={{ gap: 2 }}>
            <p style={{ fontSize: 11, color: '#9ea6b0' }}>Peso</p>
            <p style={{ fontSize: 12, color: '#525963' }}>
              {athlete.weightKg.toFixed(1)} kg <span style={{ color: trendColor }}>{trendChar}</span>
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#9ea6b0' }}>Adherencia</span>
          <span className="font-medium" style={{ fontSize: 11, color: adherenceColor(athlete.adherencePct) }}>
            {athlete.adherencePct}%
          </span>
        </div>
        <div className="overflow-hidden" style={{ height: 6, backgroundColor: '#e5e8eb', borderRadius: 3 }}>
          <div
            style={{ width: `${athlete.adherencePct}%`, height: '100%', backgroundColor: '#1e3a5f', borderRadius: 3 }}
          />
        </div>
      </div>

      <div className="flex justify-end" style={{ marginTop: 12 }}>
        <AthleteDropdown
          athleteId={athlete.id}
          status={currentStatus}
          isToggling={isToggling}
          onToggleStatus={onToggleStatus}
        />
      </div>
    </div>
  )
}
