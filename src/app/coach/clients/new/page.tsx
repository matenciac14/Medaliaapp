'use client'

import { useState } from 'react'
import Link from 'next/link'

const SPORTS = [
  { value: '', label: 'Sin especificar' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'GYM', label: 'Gym / Fuerza' },
  { value: 'CYCLING', label: 'Ciclismo' },
  { value: 'TRIATHLON', label: 'Triatlón' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
]

type CreatedAthlete = {
  email: string
  tempPassword: string
  athleteId: string
  athleteName: string
}

export default function CreateAthletePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sport, setSport] = useState('')
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<CreatedAthlete | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/coach/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, sport: sport || null, goal: goal || null }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el atleta.')
        return
      }

      setCreated({
        email: data.email,
        tempPassword: data.tempPassword,
        athleteId: data.athleteId,
        athleteName: data.athleteName,
      })
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setCreated(null)
    setName('')
    setEmail('')
    setSport('')
    setGoal('')
    setError('')
  }

  if (created) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-center mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
              style={{ backgroundColor: '#f97316' }}
            >
              ✓
            </div>
            <h1 className="text-xl font-bold text-gray-900">Atleta creado</h1>
            <p className="text-sm text-gray-500 mt-1">
              {created.athleteName} ya está vinculado a tu cuenta de coach.
            </p>
          </div>

          <div
            className="rounded-xl p-5 mb-6 border-2"
            style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}
          >
            <p className="text-sm font-semibold text-green-800 mb-3">
              Credenciales de acceso — compártelas con el atleta
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                <span className="text-xs text-gray-500 font-medium">Email</span>
                <span className="text-sm font-mono text-gray-900">{created.email}</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                <span className="text-xs text-gray-500 font-medium">Contraseña temporal</span>
                <span className="text-sm font-mono font-bold text-gray-900">{created.tempPassword}</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                <span className="text-xs text-gray-500 font-medium">URL de ingreso</span>
                <span className="text-sm font-mono text-[#1e3a5f]">medaliq.com/login</span>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-3">
              El atleta puede cambiar su contraseña desde la configuración de su cuenta.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Crear otro atleta
            </button>
            <Link
              href="/coach/dashboard"
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg text-center transition-colors"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Ir al dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Crear asesorado</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Crea la cuenta del atleta directamente, sin necesidad de código de invitación.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Carlos Gómez"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="carlos@ejemplo.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deporte principal</label>
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white"
          >
            {SPORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nota / objetivo inicial
          </label>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            rows={3}
            placeholder="Ej: Quiere correr su primera media maratón en 6 meses..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="pt-1 border-t border-gray-100 flex gap-3">
          <Link
            href="/coach/dashboard"
            className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#f97316' }}
          >
            {loading ? 'Creando...' : 'Crear asesorado'}
          </button>
        </div>
      </form>
    </div>
  )
}
