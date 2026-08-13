import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig, getUserPlan } from '@/lib/config/user-config'
import ProfileClient from './_components/ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [dbUser, plan, logs, coachLink] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { profile: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      select: { name: true, totalWeeks: true },
    }),
    prisma.dailyLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
      take: 14,
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: session.user.id, status: 'ACTIVE' },
      select: { id: true },
    }),
  ])

  if (!dbUser) redirect('/login')

  const p = dbUser.profile
  const config = parseUserConfig(dbUser)
  const userPlan = getUserPlan(config.features)
  const hasCoach = !!coachLink

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
        plan: plan ? { name: plan.name, totalWeeks: plan.totalWeeks } : null,
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
