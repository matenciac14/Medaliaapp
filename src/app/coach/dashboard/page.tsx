import { mockAthletes } from '@/lib/mock/coach-data'
import AthleteTabs from './_components/AthleteTabs'

export default function CoachDashboardPage() {
  const totalAlerts = mockAthletes.reduce((acc, a) => acc + a.alerts.length, 0)
  const pendingCheckIns = mockAthletes.filter((a) => a.lastCheckInDaysAgo >= 3).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
            Panel de entrenamiento
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{mockAthletes.length} atletas activos</p>
        </div>
        {totalAlerts > 0 && (
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-red-100 text-red-700 font-semibold text-sm px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {totalAlerts} alertas activas
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Atletas activos"
          value={mockAthletes.length}
          color="#1e3a5f"
        />
        <MetricCard
          label="Check-ins pendientes"
          value={pendingCheckIns}
          color="#f97316"
        />
        <MetricCard
          label="Alertas activas"
          value={totalAlerts}
          color="#dc2626"
        />
      </div>

      {/* Tabs + athlete list */}
      <AthleteTabs athletes={mockAthletes} />
    </div>
  )
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
