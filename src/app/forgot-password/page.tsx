'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

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

          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h1 className="text-xl font-semibold text-[#1e3a5f] mb-2">Revisa tu correo</h1>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Si existe una cuenta con ese correo, recibirás un link para crear una nueva contraseña en los próximos minutos.
              </p>
              <Link
                href="/login"
                className="text-sm text-[#ea580c] font-medium hover:underline"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#1e3a5f] mb-1 text-center">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-sm text-gray-500 mb-8 text-center">
                Ingresa tu correo y te enviaremos un link para restablecerla.
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#1e3a5f] text-white py-3 text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-60"
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/login" className="text-[#ea580c] font-medium hover:underline">
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
