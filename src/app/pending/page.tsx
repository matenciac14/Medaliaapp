import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { CheckCircle2, Clock, ClipboardList, Utensils, MessageCircle } from 'lucide-react'
import PendingPoller from './_components/PendingPoller'

export const metadata = {
  title: 'Preparando tu plan — Medaliq',
}

export default async function PendingPage() {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if (session.user.activated) redirect('/dashboard')

  const email = session.user.email ?? ''
  const name = session.user.name ?? null
  const firstName = (name ?? email).split(' ')[0]

  const coachRelation = await prisma.coachAthlete.findFirst({
    where: { athleteId: session.user.id },
    select: {
      createdAt: true,
      coach: { select: { id: true, name: true } },
    },
  })
  const coachName = coachRelation?.coach?.name ?? null
  const coachId = coachRelation?.coach?.id ?? null

  const daysWaiting = coachRelation?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(coachRelation.createdAt).getTime()) / 86_400_000))
    : null

  const steps = [
    { label: 'Registro completado', done: true },
    { label: 'Perfil completado', done: true },
    { label: coachName ? `${coachName} está preparando tu plan` : 'Tu entrenador está preparando tu plan', done: false },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-10">
        <span className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>
          Medal<span style={{ color: '#ea580c' }}>iq</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
            Hola {firstName}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {coachName
              ? `${coachName} está configurando tu experiencia personalizada.`
              : 'Tu entrenador está configurando tu experiencia personalizada.'}
            {' '}Mientras tanto, puedes empezar a registrar tu actividad.
          </p>
          {daysWaiting !== null && daysWaiting >= 1 && (
            <p className="mt-2 text-xs text-amber-600 font-medium">
              Llevas {daysWaiting === 1 ? '1 día' : `${daysWaiting} días`} esperando
            </p>
          )}
        </div>

        {/* Stepper de progreso */}
        <div className="flex flex-col gap-0">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              {/* Column: icon + connector */}
              <div className="flex flex-col items-center">
                {step.done ? (
                  <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                ) : (
                  <Clock size={20} className="text-amber-400 shrink-0 animate-pulse" />
                )}
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ backgroundColor: '#e5e7eb' }} />
                )}
              </div>
              <div className={`pb-4 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
                <span className={`text-sm leading-5 ${step.done ? 'text-gray-700 font-medium' : 'text-amber-600 font-semibold'}`}>
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* CTAs — mientras tanto */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Mientras tanto</p>

          <Link
            href="/log"
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-[#1e3a5f]/30 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#1e3a5f10' }}>
              <ClipboardList size={18} style={{ color: '#1e3a5f' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Registrar sesión de hoy</p>
              <p className="text-xs text-gray-500">Tu historial estará listo cuando el coach te active</p>
            </div>
          </Link>

          <Link
            href="/nutrition"
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-[#1e3a5f]/30 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#ea580c10' }}>
              <Utensils size={18} style={{ color: '#ea580c' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Registrar lo que comiste</p>
              <p className="text-xs text-gray-500">Empieza a trackear tu nutrición desde hoy</p>
            </div>
          </Link>

          {coachId && (
            <Link
              href={`/messages/${coachId}`}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-[#1e3a5f]/30 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#10b98110' }}>
                <MessageCircle size={18} style={{ color: '#10b981' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Escribirle a {coachName ?? 'tu entrenador'}
                </p>
                <p className="text-xs text-gray-500">¿Tienes preguntas? Puedes escribirle ahora</p>
              </div>
            </Link>
          )}
        </div>

        {/* Poller — redirige automáticamente cuando se activa */}
        <div className="flex items-center justify-between">
          <PendingPoller />
          <p className="text-xs text-gray-400">{email}</p>
        </div>

        {/* Sign out */}
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        ¿Tienes preguntas? Escríbenos a{' '}
        <a href="mailto:hola@medaliq.com" className="hover:underline" style={{ color: '#1e3a5f' }}>
          hola@medaliq.com
        </a>
      </p>
    </div>
  )
}
