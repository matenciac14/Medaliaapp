'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <p className="text-sm text-red-600 text-center">
        Link inválido. Pide a tu coach que genere un nuevo link de acceso.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar la contraseña.'); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl mx-auto">✓</div>
        <p className="font-semibold text-gray-900">Contraseña guardada</p>
        <p className="text-sm text-gray-500">Redirigiendo al login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoFocus
          placeholder="Mínimo 8 caracteres"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Repite la contraseña"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#1e3a5f] text-white py-3 text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Establecer contraseña'}
      </button>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left — Brand panel */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-[#0f1e30]">
        <Image
          src="/hero-auth.jpg"
          alt=""
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1e30] via-[#0f1e30]/60 to-[#0f1e30]/30" />
        <div className="relative z-10 flex flex-col justify-between p-12 h-full">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-white">Medal</span>
            <span className="text-2xl font-bold text-[#ea580c]">iq</span>
          </div>
          <div>
            <div className="w-12 h-1 bg-[#ea580c] mb-4 rounded-full" />
            <p className="text-xs font-medium text-white/50 tracking-widest uppercase mb-2">Plataforma de entrenamiento</p>
            <h2 className="text-5xl font-black text-white leading-tight max-w-lg">
              Tu progreso<br />continúa.
            </h2>
            <div className="flex gap-2 mt-8">
              {['Zonas FC Karvonen', 'Nutrición diaria', 'Check-in semanal'].map((pill) => (
                <span key={pill} className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-medium text-white/70">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center bg-white lg:bg-gray-50 px-6">
        <div className="w-full max-w-[448px] lg:bg-white lg:rounded-2xl lg:shadow-lg lg:shadow-black/5 lg:p-10 lg:border lg:border-gray-100">
          {/* Logo */}
          <div className="mb-8 lg:mb-10 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-2xl font-bold text-[#1e3a5f]">Medal</span>
              <span className="text-2xl font-bold text-[#ea580c]">iq</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1 text-center">Crear contraseña</h1>
          <p className="text-sm text-gray-500 mb-8 text-center">Elige una contraseña para tu cuenta</p>

          <Suspense fallback={<p className="text-sm text-gray-400 text-center">Cargando...</p>}>
            <SetPasswordForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes contraseña?{' '}
            <Link href="/login" className="text-[#ea580c] font-semibold hover:underline">
              Inicia sesión →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
