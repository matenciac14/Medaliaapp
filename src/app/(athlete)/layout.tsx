import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_USER_CONFIG } from '@/lib/config/user-config'
import SidebarClient from './_components/SidebarClient'

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id) redirect('/login')

  // Leer columnas frescas desde DB (no JWT — pueden cambiar sin re-login)
  const [dbUser, coachRelation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true, role: true, onboardingCompleted: true,
        featurePlan: true, featureCheckin: true, featureNutrition: true,
        featureProgress: true, featureLog: true, featureCoach: true, featureGym: true,
      },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId: session.user.id, status: 'ACTIVE' },
      select: { id: true },
    }),
  ])

  if (!dbUser) redirect('/login')

  // Si no completó onboarding, redirigir (también lo maneja el middleware)
  if (!dbUser.onboardingCompleted) redirect('/onboarding')

  const config = {
    ...DEFAULT_USER_CONFIG,
    features: {
      plan:      dbUser.featurePlan,
      checkin:   dbUser.featureCheckin,
      nutrition: dbUser.featureNutrition,
      progress:  dbUser.featureProgress,
      log:       dbUser.featureLog,
      coach:     dbUser.featureCoach,
      gym:       dbUser.featureGym,
    },
    onboarding: { completed: dbUser.onboardingCompleted, completedAt: null },
  }

  const user = {
    name: dbUser.name ?? session.user.email ?? 'Usuario',
    role: dbUser.role,
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SidebarClient user={user} config={config} hasCoach={!!coachRelation} />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto pt-14 lg:pt-0 pb-nav-safe lg:pb-0 animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  )
}
