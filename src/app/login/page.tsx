'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'


export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, router])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Correo o contraseña incorrectos.')
      return
    }

    const code = searchParams.get('code')
    const callbackUrl = code
      ? `/join/${code}`
      : searchParams.get('callbackUrl') ?? '/dashboard'
    router.push(callbackUrl)
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1e30]">
      <div className="w-full max-w-md px-8 py-10 bg-white rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold text-[#1e3a5f]">Medal</span>
          <span className="text-3xl font-bold text-[#ea580c]">iq</span>
        </div>

        <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6 text-center">
          Inicia sesión en tu cuenta
        </h1>

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

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <Link href="/forgot-password" className="text-xs text-[#ea580c] hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#1e3a5f] text-white py-2.5 text-sm font-semibold hover:bg-[#16304f] transition-colors disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-[#ea580c] font-medium hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
