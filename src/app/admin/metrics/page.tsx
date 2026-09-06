import { prisma } from '@/lib/db/prisma'
import { computeWAU } from '@/domain/admin/wau'
import { activeUserIdsInWindow, computeRetention, retentionColor } from '@/domain/admin/retention'
import { KpiCard } from '@/app/_components/kpi_card'

const DAY_MS = 24 * 60 * 60 * 1000

const TZ_COUNTRY: Record<string, string> = {
  'America/Bogota':                    'Colombia 🇨🇴',
  'America/Mexico_City':               'México 🇲🇽',
  'America/Lima':                      'Perú 🇵🇪',
  'America/Argentina/Buenos_Aires':    'Argentina 🇦🇷',
  'America/Santiago':                  'Chile 🇨🇱',
  'America/Caracas':                   'Venezuela 🇻🇪',
  'America/Guayaquil':                 'Ecuador 🇪🇨',
  'America/La_Paz':                    'Bolivia 🇧🇴',
  'America/Asuncion':                  'Paraguay 🇵🇾',
  'America/Montevideo':                'Uruguay 🇺🇾',
  'America/Panama':                    'Panamá 🇵🇦',
  'America/Costa_Rica':                'Costa Rica 🇨🇷',
  'America/Tegucigalpa':               'Honduras 🇭🇳',
  'America/Managua':                   'Nicaragua 🇳🇮',
  'America/El_Salvador':               'El Salvador 🇸🇻',
  'America/Guatemala':                 'Guatemala 🇬🇹',
  'America/Havana':                    'Cuba 🇨🇺',
  'America/Santo_Domingo':             'Rep. Dominicana 🇩🇴',
  'America/New_York':                  'EE.UU. (Eastern) 🇺🇸',
  'America/Chicago':                   'EE.UU. (Central) 🇺🇸',
  'America/Los_Angeles':               'EE.UU. (Pacific) 🇺🇸',
  'America/Denver':                    'EE.UU. (Mountain) 🇺🇸',
  'Europe/Madrid':                     'España 🇪🇸',
}

export default async function AdminMetricsPage() {
  const sevenDaysAgo  = new Date(Date.now() - 7  * DAY_MS)
  const fiftyFiveDays = new Date(Date.now() - 55 * DAY_MS) // ~8 semanas

  const [
    checkInsTotal,
    checkInsThisWeek,
    sessionLogsTotal,
    sessionLogsThisWeek,
    activePlans,
    plansByStatus,
    coachesWithAthletes,
    onboardingCompleted,
    totalUsers,
    proAthletes,         // base para retención (featurePlan: true)
    sessionEvents,
    checkInEvents,
    usersGeo,
    totalAthletes,
    b2bAthletes,
  ] = await Promise.all([
    prisma.weeklyCheckIn.count(),
    prisma.weeklyCheckIn.count({ where: { recordedAt: { gte: sevenDaysAgo } } }),
    prisma.sessionLog.count(),
    prisma.sessionLog.count({ where: { completedAt: { gte: sevenDaysAgo } } }),
    prisma.trainingPlan.count({ where: { status: 'ACTIVE' } }),
    prisma.trainingPlan.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({
      where: { role: 'COACH', coachOf: { some: { status: 'ACTIVE' } } },
    }),
    prisma.user.count({ where: { onboardingCompleted: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ATHLETE', featurePlan: true } }),
    // Eventos últimas 8 semanas — sirven para WAU y retención
    prisma.sessionLog.findMany({
      where: { completedAt: { gte: fiftyFiveDays } },
      select: { userId: true, completedAt: true },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { recordedAt: { gte: fiftyFiveDays } },
      select: { userId: true, recordedAt: true },
    }),
    // PLT-02: distribución geográfica por timezone
    prisma.user.findMany({ select: { timezone: true, role: true } }),
    // PLT-03: segmentación B2C vs B2B
    prisma.user.count({ where: { role: 'ATHLETE' } }),
    prisma.user.count({
      where: { role: 'ATHLETE', coachedBy: { some: { status: 'ACTIVE' } } },
    }),
  ])

  const onboardingRate = totalUsers > 0 ? Math.round((onboardingCompleted / totalUsers) * 100) : 0

  // PLT-02: agrupar por timezone → país
  const geoMap: Record<string, { country: string; total: number; coaches: number; athletes: number }> = {}
  for (const u of usersGeo) {
    const tz      = u.timezone ?? 'America/Bogota'
    const country = TZ_COUNTRY[tz] ?? `Otro (${tz})`
    if (!geoMap[country]) geoMap[country] = { country, total: 0, coaches: 0, athletes: 0 }
    geoMap[country].total++
    if (u.role === 'COACH')   geoMap[country].coaches++
    if (u.role === 'ATHLETE') geoMap[country].athletes++
  }
  const geoRows = Object.values(geoMap).sort((a, b) => b.total - a.total)

  // PLT-03: B2C vs B2B
  const b2cAthletes  = totalAthletes - b2bAthletes
  const b2bPct       = totalAthletes > 0 ? Math.round((b2bAthletes / totalAthletes) * 100) : 0
  const b2cPct       = totalAthletes > 0 ? Math.round((b2cAthletes / totalAthletes) * 100) : 0

  // Eventos unificados (SessionLog + CheckIn)
  const allEvents = [
    ...sessionEvents.map((e) => ({ userId: e.userId, date: e.completedAt })),
    ...checkInEvents.map((e) => ({ userId: e.userId, date: e.recordedAt })),
  ]

  // WAU — 8 semanas
  const wauBuckets  = computeWAU(allEvents, 8)
  const wauMax      = Math.max(...wauBuckets.map((b) => b.count), 1)
  const wauCurrent  = wauBuckets.at(-1)?.count ?? 0
  const wauPrev     = wauBuckets.at(-2)?.count ?? 0
  const wauDelta    = wauCurrent - wauPrev

  // Retención 14 días — reutiliza los mismos eventos
  const activeIds14 = activeUserIdsInWindow(allEvents, 14 * DAY_MS)
  const retention   = computeRetention(activeIds14, proAthletes)
  const retColor    = retentionColor(retention.rate)

  const kpis = [
    { label: 'Check-ins totales',     value: checkInsTotal,       sub: `+${checkInsThisWeek} esta semana`,  color: '#1e3a5f' },
    { label: 'Sesiones registradas',  value: sessionLogsTotal,    sub: `+${sessionLogsThisWeek} esta semana`, color: '#1e3a5f' },
    { label: 'Planes activos',        value: activePlans,         sub: 'atletas con plan en curso',          color: '#7c3aed' },
    { label: 'Coaches con atletas',   value: coachesWithAthletes, sub: 'al menos 1 asesorado activo',        color: '#ea580c' },
    { label: 'Onboarding completado', value: onboardingCompleted, sub: `${onboardingRate}% del total`,       color: '#16a34a' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
        <p className="text-sm text-gray-500 mt-1">Actividad y uso de la plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} color={k.color} />
        ))}
      </div>

      {/* WAU + Retención — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* WAU — 2/3 del ancho */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-semibold text-gray-800">WAU — Usuarios activos por semana</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Atletas únicos con al menos 1 sesión o check-in en la semana
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-2xl font-extrabold text-gray-900">{wauCurrent}</p>
              <p className={`text-xs font-semibold mt-0.5 ${wauDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {wauDelta >= 0 ? '+' : ''}{wauDelta} vs sem. anterior
              </p>
            </div>
          </div>

          <div className="flex items-end gap-2 h-32">
            {wauBuckets.map((bucket, i) => {
              const isLast    = i === wauBuckets.length - 1
              const heightPct = Math.max((bucket.count / wauMax) * 100, bucket.count > 0 ? 4 : 0)
              return (
                <div key={bucket.key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">
                    {bucket.count > 0 ? bucket.count : ''}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '96px' }}>
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isLast ? '#1e3a5f' : '#bfdbfe',
                        minHeight: bucket.count > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                  <span className={`text-xs ${isLast ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                    {`Sem ${bucket.weekNumber}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Retención 14 días — 1/3 del ancho */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Retención 14 días</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Atletas Pro con actividad en los últimos 14 días
            </p>
          </div>

          <div className="my-6 text-center">
            <p className="text-6xl font-extrabold" style={{ color: retColor }}>
              {retention.rate}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {retention.activeCount} de {retention.baseCount} atletas
            </p>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${retention.rate}%`,
                  backgroundColor: retColor,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>0%</span>
              <span className="text-amber-500">40%</span>
              <span className="text-green-600">70%</span>
              <span>100%</span>
            </div>
          </div>

          {retention.baseCount === 0 && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Sin atletas Pro aún.
            </p>
          )}
        </div>
      </div>

      {/* Planes por estado + Segmentación B2C/B2B — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Planes por estado */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Planes por estado</h2>
          <div className="space-y-2">
            {plansByStatus.map((row) => (
              <div key={row.status} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {({ ACTIVE: 'Activo', INACTIVE: 'Inactivo', COMPLETED: 'Completado', ABANDONED: 'Abandonado' } as Record<string, string>)[row.status] ?? row.status}
                </span>
                <span className="font-semibold text-gray-900">{row._count._all}</span>
              </div>
            ))}
            {plansByStatus.length === 0 && (
              <p className="text-sm text-gray-400">Sin datos aún.</p>
            )}
          </div>
        </div>

        {/* PLT-03: B2C vs B2B */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Atletas B2C vs B2B</h2>
          <p className="text-xs text-gray-400 mb-4">Tracker autónomo vs guiados por coach</p>
          {totalAthletes === 0 ? (
            <p className="text-sm text-gray-400">Sin atletas aún.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#1e3a5f] shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">B2B — con coach</span>
                    <span className="font-semibold text-gray-900">{b2bAthletes} <span className="text-gray-400 font-normal">({b2bPct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#1e3a5f]" style={{ width: `${b2bPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#7c3aed] shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">B2C — autónomo</span>
                    <span className="font-semibold text-gray-900">{b2cAthletes} <span className="text-gray-400 font-normal">({b2cPct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: `${b2cPct}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 pt-1">{totalAthletes} atletas en total</p>
            </div>
          )}
        </div>
      </div>

      {/* PLT-02: Distribución geográfica */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Distribución geográfica</h2>
        <p className="text-xs text-gray-400 mb-4">Por timezone del usuario — {totalUsers} usuarios en total</p>
        {geoRows.length === 0 ? (
          <p className="text-sm text-gray-400">Sin datos aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">País / Región</th>
                  <th className="text-right pb-2 font-medium">Usuarios</th>
                  <th className="text-right pb-2 font-medium">Coaches</th>
                  <th className="text-right pb-2 font-medium">Atletas</th>
                  <th className="text-right pb-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {geoRows.map((row) => (
                  <tr key={row.country}>
                    <td className="py-2 text-gray-700">{row.country}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{row.total}</td>
                    <td className="py-2 text-right text-gray-500">{row.coaches}</td>
                    <td className="py-2 text-right text-gray-500">{row.athletes}</td>
                    <td className="py-2 text-right text-gray-400">
                      {totalUsers > 0 ? Math.round((row.total / totalUsers) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
