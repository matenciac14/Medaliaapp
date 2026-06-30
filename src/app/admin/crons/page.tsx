import { CronsClient } from './_components/CronsClient'

type CronDef = {
  id: string
  name: string
  schedule: string
  scheduleHuman: string
  description: string
  path: string
}

const CRONS: CronDef[] = [
  {
    id: 'checkin-reminder',
    name: 'Check-in reminder',
    schedule: '0 23 * * 0',
    scheduleHuman: 'Domingos 23:00 UTC (18:00 COT)',
    description: 'Envía email y push notification a atletas con plan activo que no hicieron check-in esta semana.',
    path: '/api/cron/checkin-reminder',
  },
  {
    id: 'session-reminder',
    name: 'Session reminder',
    schedule: '0 12 * * 1',
    scheduleHuman: 'Lunes 12:00 UTC (07:00 COT)',
    description: 'Recuerda a atletas cuál es la sesión planificada para el día de hoy.',
    path: '/api/cron/session-reminder',
  },
  {
    id: 'payment-overdue',
    name: 'Payment overdue',
    schedule: '0 14 * * *',
    scheduleHuman: 'Diariamente 14:00 UTC (09:00 COT)',
    description: 'Detecta pagos con dueDate < hoy y envía recordatorio al coach.',
    path: '/api/cron/payment-overdue',
  },
]

export default function AdminCronsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Estado de crons</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tareas programadas en Vercel. Puedes dispararlas manualmente para probar o forzar ejecución.
        </p>
      </div>

      <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <strong>Nota:</strong> Vercel no expone historial de ejecución vía API pública.
        La última ejecución real solo es visible en el dashboard de Vercel → Deployments → Functions.
      </div>

      <CronsClient crons={CRONS} />
    </div>
  )
}
