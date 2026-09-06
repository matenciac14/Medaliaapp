'use client'
import { useState } from 'react'
import { GROUPS, getAllItems } from './roadmap_data'
import type { RoadmapGroup, RoadmapItem } from './roadmap_data'

function progress(items: { done: boolean }[]) {
  const done = items.filter((i) => i.done).length
  return { done, total: items.length, pct: items.length === 0 ? 0 : Math.round((done / items.length) * 100) }
}

const PRIORITY_COLOR: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-yellow-100 text-yellow-700',
  P3: 'bg-gray-100 text-gray-500',
}

const STATUS_COLOR: Record<string, string> = {
  'Completado':       'bg-green-100 text-green-700',
  'En construcción':  'bg-orange-100 text-orange-700',
  'Urgente':          'bg-red-100 text-red-700',
  'Próximo':          'bg-purple-100 text-purple-700',
  'Post-lanzamiento': 'bg-cyan-100 text-cyan-700',
  'Futuro':           'bg-gray-100 text-gray-500',
}

function ItemRow({ item, color }: { item: RoadmapItem; color: string }) {
  return (
    <div className="px-4 sm:px-6 py-3 flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        {item.done ? (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#16a34a' }}>
            ✓
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${item.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
            {item.title}
          </p>
          {item.priority && (
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLOR[item.priority]}`}>
              {item.priority}
            </span>
          )}
        </div>
        {item.note && (
          <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
        )}
      </div>
    </div>
  )
}

function GroupBody({ group }: { group: RoadmapGroup }) {
  const [openSubs, setOpenSubs] = useState<Set<string>>(
    () => new Set(group.phases?.map((p) => p.id) ?? [])
  )

  function toggleSub(id: string) {
    setOpenSubs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (group.phases) {
    return (
      <div>
        {group.phases.map((subPhase) => {
          const visibleItems = group.liveList
            ? subPhase.items.filter((i) => !i.done)
            : subPhase.items
          // Si liveList y no hay bugs abiertos en este dominio, ocultar la sub-fase
          if (group.liveList && visibleItems.length === 0) return null
          const isSubOpen = openSubs.has(subPhase.id)
          const { done, total } = progress(subPhase.items)
          return (
            <div key={subPhase.id}>
              {/* Sub-phase header — colapsable */}
              <button
                onClick={() => toggleSub(subPhase.id)}
                className="w-full px-4 sm:px-6 py-2.5 flex items-center gap-2 border-t text-left hover:opacity-75 transition-opacity"
                style={{ borderColor: group.borderColor, backgroundColor: group.bgColor }}
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 transition-transform duration-150"
                  style={{ transform: isSubOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: group.color }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{subPhase.label}</span>
                {group.liveList ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                    {visibleItems.length} abiertos
                  </span>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[subPhase.period] ?? 'bg-gray-100 text-gray-500'}`}>
                    {subPhase.period}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 ml-auto">{done}/{total}</span>
              </button>
              {/* Sub-phase items */}
              {isSubOpen && (
                <div className="divide-y" style={{ borderColor: group.borderColor }}>
                  {visibleItems.map((item, idx) => (
                    <ItemRow key={idx} item={item} color={group.color} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const items = group.liveList
    ? (group.items ?? []).filter((i) => !i.done)
    : (group.items ?? [])

  if (group.liveList && items.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-6 text-center border-t" style={{ borderColor: group.borderColor }}>
        <p className="text-sm text-green-600 font-medium">Sin bugs abiertos</p>
      </div>
    )
  }

  return (
    <div className="divide-y border-t" style={{ borderColor: group.borderColor }}>
      {items.map((item, idx) => (
        <ItemRow key={idx} item={item} color={group.color} />
      ))}
    </div>
  )
}

function groupOrder(group: RoadmapGroup): number {
  if (group.liveList) return 0
  const items = getAllItems(group)
  if (items.every((i) => i.done)) return 3
  const period = group.phases
    ? group.phases.filter((p) => p.items.some((i) => !i.done)).map((p) => p.period)[0] ?? group.period
    : group.period
  if (period === 'Futuro' || period === 'Post-lanzamiento') return 2
  return 1
}

const SORTED_GROUPS = [...GROUPS].sort((a, b) => groupOrder(a) - groupOrder(b))

export default function AdminRoadmapPage() {
  const allItems = GROUPS.flatMap((g) => getAllItems(g))
  const totalDone = allItems.filter((i) => i.done).length
  const totalPct = Math.round((totalDone / allItems.length) * 100)

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(SORTED_GROUPS.filter((g) => !getAllItems(g).every((i) => i.done)).map((g) => g.id))
  )

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Roadmap del producto</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Estado de desarrollo de Medaliq</p>
      </div>

      {/* Progreso general */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600">Progreso total del producto</p>
            <p className="text-xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              {totalDone} <span className="text-base sm:text-lg font-medium text-gray-400">/ {allItems.length} tareas</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl sm:text-5xl font-extrabold" style={{ color: '#1e3a5f' }}>{totalPct}%</p>
            <p className="text-xs text-gray-400 mt-1">completado</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: `${totalPct}%`, backgroundColor: '#ea580c' }}
          />
        </div>

        {/* Mini resumen por grupo */}
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-2 sm:gap-3 mt-6">
          {SORTED_GROUPS.map((group) => {
            const items = getAllItems(group)
            const { done, total, pct } = progress(items)
            const allDone = items.every((i) => i.done)
            const miniPeriod = group.phases
              ? group.phases.filter((p) => p.items.some((i) => !i.done)).map((p) => p.period)[0] ?? group.period
              : group.period
            const miniColor = group.liveList
              ? '#dc2626'
              : allDone
              ? '#16a34a'
              : (miniPeriod === 'Futuro' || miniPeriod === 'Post-lanzamiento')
              ? '#6b7280'
              : '#4338ca'
            return (
              <div key={group.id} className="text-center">
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: miniColor }} />
                </div>
                <p className="text-[10px] text-gray-500 leading-tight truncate" title={group.label}>{group.label}</p>
                <p className="text-xs font-bold" style={{ color: miniColor }}>{done}/{total}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controles expandir / colapsar */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setOpenGroups(new Set(SORTED_GROUPS.map((g) => g.id)))}
          className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Expandir todo
        </button>
        <button
          onClick={() => setOpenGroups(new Set())}
          className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Colapsar todo
        </button>
      </div>

      {/* Grupos — acordeón */}
      <div className="space-y-3">
        {SORTED_GROUPS.map((group) => {
          const items = getAllItems(group)
          const visibleItems = group.liveList ? items.filter((i) => !i.done) : items
          const { done, total, pct } = progress(items)
          const isOpen = openGroups.has(group.id)

          // Derivar el label del progreso real — nunca confiar en period estático si hay ítems pendientes
          const allDone = getAllItems(group).every((i) => i.done)
          let periodLabel: string | undefined
          if (allDone) {
            periodLabel = 'Completado'
          } else if (group.phases) {
            // Mostrar el período más activo de las sub-fases con ítems pendientes
            const periods = group.phases
              .filter((p) => p.items.some((i) => !i.done))
              .map((p) => p.period)
            const hasUrgente = periods.includes('Urgente')
            periodLabel = hasUrgente
              ? 'Urgente'
              : periods.find((p) => p === 'En construcción') ?? periods[0] ?? group.period
          } else {
            // Grupo plano: usar period solo si no está reclamando estar completo incorrectamente
            periodLabel = group.period !== 'Completado' ? group.period : 'En construcción'
          }

          // Esquema de color semántico — derivado del estado real, no del color del módulo
          const scheme = group.liveList
            ? { color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca' }
            : allDone
            ? { color: '#16a34a', bgColor: '#f0fdf4', borderColor: '#86efac' }
            : (periodLabel === 'Futuro' || periodLabel === 'Post-lanzamiento')
            ? { color: '#6b7280', bgColor: '#f9fafb', borderColor: '#d1d5db' }
            : { color: '#4338ca', bgColor: '#eef2ff', borderColor: '#c7d2fe' }
          const styledGroup = { ...group, ...scheme }

          return (
            <div
              key={group.id}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: scheme.borderColor, backgroundColor: scheme.bgColor }}
            >
              {/* Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-left transition-opacity hover:opacity-80"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: scheme.color }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">{group.label}</h2>
                  {periodLabel && (
                    <span className={`hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[periodLabel] ?? 'bg-gray-100 text-gray-500'}`}>
                      {periodLabel}
                    </span>
                  )}
                  {group.liveList && visibleItems.length > 0 && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                      {visibleItems.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 ml-3 shrink-0">
                  <div className="hidden sm:block w-24 bg-white/60 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: scheme.color }} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold" style={{ color: scheme.color }}>{done}/{total}</span>
                </div>
              </button>

              {/* Body */}
              {isOpen && <GroupBody group={styledGroup} />}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">
        Medaliq Roadmap · Fuente canónica: <code className="bg-gray-100 px-1 rounded">src/app/admin/roadmap/roadmap_data.ts</code>
      </p>
    </div>
  )
}
