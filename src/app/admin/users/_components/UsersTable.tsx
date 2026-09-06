'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChangeRoleButton } from './ChangeRoleButton'
import { PlanSelector } from './PlanSelector'
import { GOAL_LABEL, SPORT_LABEL } from '@/lib/labels/enum_labels'

type PlanTier = 'FREE' | 'PRO' | 'COACH'

type User = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: Date
  featurePlan: boolean
  featureLog: boolean
  featureCoach: boolean
  onboardingCompleted: boolean
  profile: { sport: string | null; sportGoal: string | null } | null
}

type DisplayTier = 'INACTIVE' | 'FREE' | 'PRO' | 'COACH'

function inferPlanTier(role: string, featureCoach: boolean, featurePlan: boolean, featureLog: boolean): DisplayTier {
  if (role === 'COACH' || featureCoach) return 'COACH'
  if (featurePlan) return 'PRO'
  if (featureLog) return 'FREE'
  return 'INACTIVE'
}

const ROLE_BADGE: Record<string, string> = {
  ATHLETE: 'bg-blue-100 text-blue-700',
  COACH:   'bg-orange-100 text-orange-700',
  ADMIN:   'bg-red-100 text-red-700',
}

type Props = {
  users: User[]
  total: number
  page: number
  pageSize: number
  searchQuery: string
}

export function UsersTable({ users, total, page, pageSize, searchQuery }: Props) {
  const [search, setSearch] = useState(searchQuery)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const isFirstRender = useRef(true)

  // Búsqueda con debounce → actualiza URL (server-side)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      startTransition(() => { router.push(`/admin/users?${params.toString()}`) })
    }, 350)
    return () => clearTimeout(t)
  }, [search, router])

  const totalPages = Math.ceil(total / pageSize)

  function goToPage(newPage: number) {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (newPage > 0) params.set('page', String(newPage))
    router.push(`/admin/users?${params.toString()}`)
  }

  return (
    <div>
      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {search && (
          <span className="ml-3 text-xs text-gray-400">
            {total} resultado{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Nombre</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Rol</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Onboarding</th>
                <th className="px-5 py-3 text-left">Deporte / Objetivo</th>
                <th className="px-5 py-3 text-left">Registrado</th>
                <th className="px-5 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const sport = u.profile?.sport ?? '—'
                const goal  = u.profile?.sportGoal ?? '—'
                const planTier = inferPlanTier(u.role, u.featureCoach, u.featurePlan, u.featureLog)

                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <a href={`/admin/users/${u.id}`} className="hover:text-orange-600 transition-colors">
                        {u.name ?? '—'}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {planTier === 'INACTIVE'
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-500">Inactivo</span>
                        : <PlanSelector userId={u.id} currentTier={planTier as PlanTier} />
                      }
                    </td>
                    <td className="px-5 py-3">
                      {u.onboardingCompleted ? (
                        <span className="text-green-600 text-xs font-medium">✓ Completado</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Pendiente</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {sport !== '—' ? `${SPORT_LABEL[sport] ?? sport} · ${GOAL_LABEL[goal] ?? goal}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-5 py-3">
                      <ChangeRoleButton userId={u.id} currentRole={u.role} />
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">
                    {search ? `Sin resultados para "${search}"` : 'Sin usuarios registrados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => goToPage(page - 1)}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => goToPage(page + 1)}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
