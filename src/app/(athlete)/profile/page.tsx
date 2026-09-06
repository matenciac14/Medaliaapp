import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig, getUserPlan } from '@/lib/config/user_config'
import { loadAthleteData } from '@/infrastructure/db/athlete_loader'
import ProfileClient from './_components/ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const [dbUser, { activePlanMeta, coachRelation }, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    }),
    loadAthleteData(userId, ['activePlanMeta', 'coachRelation']),
    prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 14,
    }),
  ])

  if (!dbUser) redirect('/login')

  const p = dbUser.profile
  const config = parseUserConfig(dbUser)
  const userPlan = getUserPlan(config.features)
  const hasCoach = !!coachRelation

  return (
    <ProfileClient
      user={{
        name: dbUser.name ?? dbUser.email ?? 'Atleta',
        email: dbUser.email ?? '',
        userPlan,
        hasCoach,
        profile: p ? {
          age: p.age,
          dateOfBirth: p.dateOfBirth?.toISOString().split('T')[0] ?? null,
          heightCm: p.heightCm,
          weightKg: p.weightKg,
          weightGoalKg: p.weightGoalKg ?? null,
          hrResting: p.hrResting ?? null,
          hrMax: p.hrMax ?? null,
          injuries: p.injuries,
          conditions: p.conditions,
          sleepHoursAvg: p.sleepHoursAvg ?? null,
          sport: p.sport ?? null,
          experienceLevel: p.experienceLevel ?? null,
          sportDetails: p.sportDetails as Record<string, string | number | null>,
        } : null,
        plan: activePlanMeta ? { name: activePlanMeta.name, totalWeeks: activePlanMeta.totalWeeks } : null,
        dailyLogs: logs.map(l => ({
          id: l.id,
          date: l.date.toISOString().split('T')[0],
          weightKg: l.weightKg ?? null,
          hrResting: l.hrResting ?? null,
          sleepHours: l.sleepHours ?? null,
          energyLevel: l.energyLevel ?? null,
          notes: l.notes ?? null,
        })),
      }}
    />
  )
}
