import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import IntegrationsClient from './_components/IntegrationsClient'

export const metadata = { title: 'Integraciones — MedalIQ' }

export default async function IntegrationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const connections = await prisma.wearableConnection.findMany({
    where: { userId: session.user.id },
    select: { provider: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const strava = connections.find((c) => c.provider === 'strava')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Integraciones</h1>
      <p className="text-sm text-gray-500 mb-8">
        Conecta tus plataformas de entrenamiento para importar actividades automáticamente.
      </p>
      <IntegrationsClient
        strava={strava ? { connectedAt: strava.createdAt.toISOString() } : null}
      />
    </div>
  )
}
