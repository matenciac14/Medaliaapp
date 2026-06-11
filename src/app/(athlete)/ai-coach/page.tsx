import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { parseUserConfig } from '@/lib/config/user-config'
import AICoachChat from '../_components/AICoachChat'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function AICoachPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  })
  if (!dbUser) redirect('/login')

  const userConfig = parseUserConfig(dbUser.config)
  if (!userConfig.features.aiCoach) redirect('/dashboard')

  const currentMonth = new Date().toISOString().slice(0, 7)
  const aiMessagesUsed = userConfig.ai.messagesResetAt === currentMonth
    ? userConfig.ai.messagesThisMonth
    : 0
  const aiMonthlyLimit = userConfig.ai.monthlyLimit
  const nextMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1))
  const aiResetAt = nextMonth.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col px-4 py-4 lg:py-6 lg:px-8 max-w-3xl mx-auto" style={{ height: 'calc(100dvh - 120px)' }}>
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">AI Coach</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tu asistente deportivo personalizado · Powered by Claude</p>
      </div>

      {!dbUser.profile ? (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Completa tu perfil antes de usar el AI Coach</p>
            <p className="text-xs text-orange-600 mt-1">El AI necesita tus datos de salud para darte recomendaciones seguras y personalizadas.</p>
            <Link href="/profile" className="inline-block mt-3 text-xs font-semibold bg-[#f97316] text-white px-3 py-1.5 rounded-lg">
              Completar perfil →
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <AICoachChat
            initialUsed={aiMessagesUsed}
            monthlyLimit={aiMonthlyLimit}
            resetAt={aiResetAt}
            fullHeight
          />
        </div>
      )}
    </div>
  )
}
