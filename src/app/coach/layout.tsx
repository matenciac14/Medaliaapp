import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import CoachSidebarClient from './_components/CoachSidebarClient'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'COACH') redirect('/dashboard')

  const coachName = session.user.name ?? session.user.email ?? 'Coach'

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { coachId: session.user.id },
    select: { specialties: true },
  })
  const specialties = coachProfile?.specialties ?? []

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      <CoachSidebarClient coachName={coachName} specialties={specialties} />
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 pb-nav-safe lg:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
