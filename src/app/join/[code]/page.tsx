'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

type InviteInfo = {
  valid: boolean
  coachName: string
  coachHeadline: string | null
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/invite/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setInvite(data)
      })
      .catch(() => setError('Error al verificar el código.'))
      .finally(() => setLoading(false))
  }, [code])

  async function handleJoin() {
    setJoining(true)
    const res = await fetch(`/api/invite/${code}`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) {
      setDone(true)
      setTimeout(() => router.push('/onboarding'), 1500)
    } else {
      setError(data.error ?? 'Error al unirte.')
    }
    setJoining(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f8fafc' }}>
        <p className="text-gray-400 text-sm">Verificando código...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f8fafc' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-3">
          <p className="text-3xl">⚠️</p>
          <p className="text-gray-900 font-semibold">{error}</p>
          <p className="text-gray-400 text-sm">Solicita un nuevo enlace a tu coach.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f8fafc' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-2">
          <p className="text-3xl">✅</p>
          <p className="text-gray-900 font-semibold">¡Conectado con {invite?.coachName}!</p>
          <p className="text-gray-400 text-sm">Redirigiendo al onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#f8fafc' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          M
        </div>
        <span className="font-bold text-xl tracking-tight" style={{ color: '#1e3a5f' }}>
          Medaliq
        </span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl"
          style={{ backgroundColor: '#fff7ed' }}
        >
          🏃
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {invite?.coachName} te invita a entrenar
        </h1>
        {invite?.coachHeadline && (
          <p className="text-gray-500 text-sm mb-3">{invite.coachHeadline}</p>
        )}
        <p className="text-gray-400 text-sm mb-6">
          Únete a su panel de entrenamiento en Medaliq
        </p>

        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-semibold mb-8"
          style={{ backgroundColor: '#f0f4f9', color: '#1e3a5f' }}
        >
          Código: {code}
        </div>

        <div className="space-y-3">
          {status === 'loading' ? (
            <p className="text-gray-400 text-sm py-3">Cargando...</p>
          ) : session ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {joining ? 'Conectando...' : 'Unirme al coach'}
            </button>
          ) : (
            <>
              <Link
                href={`/register?code=${code}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Crear mi cuenta
              </Link>
              <Link
                href={`/login?code=${code}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm border-2 transition-colors hover:bg-gray-50"
                style={{ borderColor: '#1e3a5f', color: '#1e3a5f' }}
              >
                Ya tengo cuenta — Iniciar sesión
              </Link>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Al registrarte aceptas que este coach pueda ver tu progreso y planes de entrenamiento.
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Medaliq — Coaching deportivo con inteligencia artificial
      </p>
    </div>
  )
}
