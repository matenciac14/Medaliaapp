import { prisma } from '@/lib/db/prisma'
import { UsersTable } from './_components/UsersTable'

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      featurePlan: true, featureLog: true, featureCoach: true, onboardingCompleted: true,
      profile: { select: { sport: true, sportGoal: true } },
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios ({users.length})</h1>
        <p className="text-sm text-gray-500 mt-1">Todos los usuarios registrados en la plataforma</p>
      </div>
      <UsersTable users={users} />
    </div>
  )
}
