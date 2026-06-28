'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

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
        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoFocus
          placeholder="Mínimo 8 caracteres"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Repite la contraseña"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        {loading ? 'Guardando...' : 'Establecer contraseña'}
      </button>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Crear contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una contraseña para tu cuenta MedalIQ</p>
        </div>
        <Suspense fallback={<p className="text-sm text-gray-400 text-center">Cargando...</p>}>
          <SetPasswordForm />
        </Suspense>
        <p className="text-xs text-center text-gray-400">
          ¿Ya tienes contraseña?{' '}
          <Link href="/login" className="text-[#1e3a5f] hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
