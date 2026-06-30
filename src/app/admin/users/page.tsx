import { prisma } from '@/lib/db/prisma'
import { UsersTable } from './_components/UsersTable'

const PAGE_SIZE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page: pageStr = '0' } = await searchParams
  const page = Math.max(0, parseInt(pageStr, 10) || 0)
  const search = q.trim()

  const where = search.length >= 1 ? {
    OR: [
      { name:  { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ],
  } : undefined

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        featurePlan: true, featureLog: true, featureCoach: true, onboardingCompleted: true,
        profile: { select: { sport: true, sportGoal: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios ({total})</h1>
        <p className="text-sm text-gray-500 mt-1">Todos los usuarios registrados en la plataforma</p>
      </div>
      <UsersTable users={users} total={total} page={page} pageSize={PAGE_SIZE} searchQuery={search} />
    </div>
  )
}
