'use client'

export type PendingAthlete = {
  athleteId: string
  name: string
  email: string
  addedAt: string // ISO string
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1d'
  return `hace ${days}d`
}

export default function PendingAthletesSection({ athletes }: { athletes: PendingAthlete[] }) {
  if (athletes.length === 0) return null

  const names = athletes.map((a) => `${a.name} (${daysAgo(a.addedAt)})`).join(' · ')
  const count = athletes.length

  return (
    <div
      className="bg-white flex items-center gap-4"
      style={{
        border: '1px solid #e5e8eb',
        borderRadius: 10,
        paddingTop: 14,
        paddingBottom: 14,
        paddingRight: 20,
      }}
    >
      {/* Accent bar — no left padding on container, bar is first child */}
      <div className="shrink-0" style={{ backgroundColor: '#1e3a5f', width: 3, height: 48 }} />

      {/* Text content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="font-semibold" style={{ fontSize: 13, color: '#525963' }}>
          {count} atleta{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''} de onboarding
        </p>
        <p className="truncate" style={{ fontSize: 12, color: '#9ea6b0' }}>{names}</p>
      </div>

      {/* Actions */}
      <a
        href="/coach/athletes?filter=pending"
        className="font-medium whitespace-nowrap shrink-0"
        style={{ fontSize: 12, color: '#1e3a5f' }}
      >
        Ver pendientes →
      </a>
      <a
        href="/coach/invite"
        className="font-semibold text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        style={{ fontSize: 11, backgroundColor: '#1e3a5f', padding: '7px 14px', borderRadius: 6 }}
      >
        Reenviar invitación
      </a>
    </div>
  )
}
