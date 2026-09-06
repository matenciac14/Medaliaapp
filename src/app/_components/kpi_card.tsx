import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: ReactNode
  sub?: string
  color?: string
  center?: boolean
}

export function KpiCard({ label, value, sub, color, center = false }: KpiCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5${center ? ' text-center' : ''}`}>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold leading-tight" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
