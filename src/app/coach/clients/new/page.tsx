'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Options ──────────────────────────────────────────────────────────────────

const SPORTS = [
  { value: '', label: 'Sin especificar' },
  { value: 'RUNNING', label: 'Atletismo / Running' },
  { value: 'CYCLING', label: 'Ciclismo' },
  { value: 'TRIATHLON', label: 'Triatlón' },
  { value: 'STRENGTH', label: 'Fuerza / Gimnasio' },
  { value: 'SWIMMING', label: 'Natación' },
  { value: 'FOOTBALL', label: 'Fútbol' },
]

const GOALS = [
  { value: '', label: 'Sin especificar' },
  { value: 'RACE_5K', label: 'Carrera 5K' },
  { value: 'RACE_10K', label: 'Carrera 10K' },
  { value: 'RACE_HALF_MARATHON', label: 'Media Maratón' },
  { value: 'RACE_MARATHON', label: 'Maratón' },
  { value: 'BODY_RECOMPOSITION', label: 'Recomposición Corporal' },
  { value: 'WEIGHT_LOSS', label: 'Pérdida de Peso' },
  { value: 'GENERAL_FITNESS', label: 'Condición General' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'email' | 'existing' | 'new' | 'done'

type ExistingUser = { id: string; name: string; email: string }

type CreatedAthlete = {
  email: string
  resetLink: string
  athleteId: string
  athleteName: string
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar al portapapeles"
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors"
      style={copied ? { backgroundColor: '#dcfce7', color: '#15803d' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
    >
      {copied ? '✓ Copiado' : '📋'}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateAthletePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')

  // Email step
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')

  // Existing athlete
  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')

  // New athlete form
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [goal, setGoal] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Done
  const [created, setCreated] = useState<CreatedAthlete | null>(null)
  const [linkedId, setLinkedId] = useState<string | null>(null)

  // ── Step 1: verify email ────────────────────────────────────────────────────

  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault()
    setChecking(true)
    setCheckError('')
    try {
      const res = await fetch(`/api/coach/clients/check?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()
      if (!res.ok) { setCheckError(data.error ?? 'Error al verificar.'); return }

      if (data.exists) {
        setExistingUser(data.user)
        setStep('existing')
      } else {
        setStep('new')
      }
    } catch {
      setCheckError('Error de conexión.')
    } finally {
      setChecking(false)
    }
  }

  // ── Step 2a: link existing athlete ─────────────────────────────────────────

  async function handleLink() {
    if (!existingUser) return
    setLinking(true)
    setLinkError('')
    try {
      const res = await fetch('/api/coach/clients/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId: existingUser.id }),
      })
      const data = await res.json()
      if (!res.ok) { setLinkError(data.error ?? 'Error al vincular.'); return }
      setLinkedId(existingUser.id)
      setStep('done')
    } catch {
      setLinkError('Error de conexión.')
    } finally {
      setLinking(false)
    }
  }

  // ── Step 2b: create new athlete ─────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/coach/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim(), sport: sport || null, goal: goal || null }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error ?? 'Error al crear el atleta.'); return }
      setCreated({ email: data.email, resetLink: data.resetLink, athleteId: data.athleteId, athleteName: data.athleteName })
      setStep('done')
    } catch {
      setCreateError('Error de conexión.')
    } finally {
      setCreating(false)
    }
  }

  function handleReset() {
    setStep('email')
    setEmail('')
    setExistingUser(null)
    setName('')
    setSport('')
    setGoal('')
    setCreated(null)
    setLinkedId(null)
    setCheckError('')
    setLinkError('')
    setCreateError('')
  }

  // ── Done screen ─────────────────────────────────────────────────────────────

  if (step === 'done') {
    const athleteId = created?.athleteId ?? linkedId!
    const athleteName = created?.athleteName ?? existingUser?.name ?? ''

    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3" style={{ backgroundColor: '#f97316' }}>
              ✓
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {created ? 'Atleta creado' : 'Atleta vinculado'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {athleteName} ya está en tu roster de asesorados.
            </p>
          </div>

          {created && (
            <div className="rounded-xl p-5 mb-6 border-2" style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}>
              <p className="text-sm font-semibold text-green-800 mb-3">
                Credenciales de acceso — compártelas con el atleta
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200 gap-2">
                  <span className="text-xs text-gray-500 font-medium shrink-0">Email</span>
                  <span className="text-sm font-mono text-gray-900 truncate flex-1 text-right">{created.email}</span>
                  <CopyButton value={created.email} />
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200 gap-2">
                  <span className="text-xs text-gray-500 font-medium shrink-0">Link de acceso</span>
                  <span className="text-sm text-[#1e3a5f] flex-1 text-right truncate">El atleta crea su contraseña aquí</span>
                  <CopyButton value={created.resetLink} />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Agregar otro
            </button>
            <Link
              href={`/coach/athlete/${athleteId}`}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg text-center transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Ver perfil
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Email step ──────────────────────────────────────────────────────────────

  if (step === 'email') {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Agregar asesorado</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ingresa el email del atleta para comenzar.
          </p>
        </div>

        <form onSubmit={handleCheckEmail} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="atleta@ejemplo.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 transition-shadow"
            />
          </div>

          {checkError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {checkError}
            </div>
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
              disabled={checking || !email.trim()}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#f97316' }}
            >
              {checking ? 'Verificando...' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── Existing athlete step ───────────────────────────────────────────────────

  if (step === 'existing' && existingUser) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Atleta encontrado</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Este email ya tiene una cuenta en MedalIQ.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: '#1e3a5f' }}>
              {existingUser.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{existingUser.name}</p>
              <p className="text-xs text-gray-500">{existingUser.email}</p>
            </div>
          </div>

          {linkError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {linkError}
            </div>
          )}

          <div className="pt-1 border-t border-gray-100 flex gap-3">
            <button
              onClick={() => { setStep('email'); setExistingUser(null) }}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={handleLink}
              disabled={linking}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#f97316' }}
            >
              {linking ? 'Vinculando...' : 'Vincular a mi roster'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── New athlete form ────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Crear asesorado</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          No encontramos una cuenta para <span className="font-medium text-gray-700">{email}</span>. Completa el perfil para crearla.
        </p>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Carlos Gómez"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 transition-shadow"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deporte principal</label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white transition-shadow"
          >
            {SPORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white transition-shadow"
          >
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        {createError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {createError}
          </div>
        )}

        <div className="pt-1 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={() => setStep('email')}
            className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={creating}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#f97316' }}
          >
            {creating ? 'Creando...' : 'Crear asesorado'}
          </button>
        </div>
      </form>
    </div>
  )
}
