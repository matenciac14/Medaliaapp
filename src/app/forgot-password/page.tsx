'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    <div className="min-h-screen flex items-center justify-center bg-[#0f1e30]">
      <div className="w-full max-w-md px-8 py-10 bg-white rounded-2xl shadow-xl">
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold text-[#1e3a5f]">Medal</span>
          <span className="text-3xl font-bold text-[#f97316]">iq</span>
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
              className="text-sm text-[#f97316] font-medium hover:underline"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[#1e3a5f] mb-2 text-center">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Ingresa tu correo y te enviaremos un link para restablecerla.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#1e3a5f] text-white py-2.5 text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link href="/login" className="text-[#f97316] font-medium hover:underline">
                ← Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
