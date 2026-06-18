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

  if (!userConfig.features.aiCoach) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 max-w-sm mx-auto text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xl font-bold">AI</div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">AI Coach — Plan Pro</h1>
          <p className="text-sm text-gray-500">
            Accede a tu asistente deportivo personalizado. Pregunta sobre tu plan, recuperación, nutrición y más.
          </p>
        </div>
        <ul className="w-full text-left space-y-2 text-sm text-gray-600">
          {['100 mensajes por mes', 'Respuestas basadas en tu plan real', 'Contexto de tus check-ins y progreso', 'Powered by Claude (Anthropic)'].map(f => (
            <li key={f} className="flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>
          ))}
        </ul>
        <Link
          href="/upgrade"
          className="w-full py-4 rounded-2xl text-white font-bold text-sm text-center transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#f97316' }}
        >
          Activar plan Pro — $15/mes →
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Volver al inicio</Link>
      </div>
    )
  }

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
