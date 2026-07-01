import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import NewGoalClient from './_components/NewGoalClient'

export default async function NewGoalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const profile = await prisma.healthProfile.findUnique({
    where: { userId: session.user.id },
    select: { sportGoal: true },
  })

  return <NewGoalClient defaultGoal={profile?.sportGoal ?? null} />
}
