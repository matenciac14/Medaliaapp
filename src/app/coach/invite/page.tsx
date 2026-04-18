'use client'

import { useState } from 'react'
import Link from 'next/link'

const MOCK_ATHLETES: Record<string, string> = {
  'miguel@example.com': 'Miguel Atencia',
  'laura@example.com': 'Laura Gómez',
  'andres@example.com': 'Andrés Pérez',
  'carlos@example.com': 'Carlos Rodríguez',
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'MEDAL-'
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export default function InvitePage() {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [email, setEmail] = useState('')
  const [foundAthlete, setFoundAthlete] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  function handleGenerateCode() {
    setInviteCode(generateCode())
    setCopied(false)
  }

  async function handleCopy() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(`https://medaliq.com/join/${inviteCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSearch() {
    const name = MOCK_ATHLETES[email.toLowerCase()]
    if (name) {
      setFoundAthlete(name)
      setNotFound(false)
    } else {
      setFoundAthlete(null)
      setNotFound(true)
    }
    setInviteSent(false)
  }

  function handleSendInvite() {
    setInviteSent(true)
    setFoundAthlete(null)
    setEmail('')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/coach/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <span>←</span> Volver al panel
      </Link>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1e3a5f' }}>
        Invitar atleta
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Genera un código de invitación o busca un atleta por email
      </p>

      {/* Sección A: Código de invitación */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Código de invitación</h2>
        <p className="text-gray-500 text-sm mb-5">
          Genera un link único para que el atleta se vincule a tu panel
        </p>

        {inviteCode ? (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 p-4 rounded-xl border-2"
              style={{ borderColor: '#1e3a5f', backgroundColor: '#f0f4f9' }}
            >
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-0.5">Código generado</p>
                <p className="font-mono font-bold text-xl tracking-widest" style={{ color: '#1e3a5f' }}>
                  {inviteCode}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  medaliq.com/join/{inviteCode}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: copied ? '#16a34a' : '#f97316' }}
              >
                {copied ? '✓ Copiado' : 'Copiar link'}
              </button>
            </div>
            <button
              onClick={handleGenerateCode}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Generar nuevo código
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateCode}
            className="px-6 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Generar código
          </button>
        )}
      </div>

      {/* Sección B: Buscar por email */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Buscar atleta por email</h2>
        <p className="text-gray-500 text-sm mb-5">
          Si el atleta ya tiene cuenta en Medaliq, puedes invitarlo directamente
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setFoundAthlete(null)
              setNotFound(false)
              setInviteSent(false)
            }}
            placeholder="atleta@email.com"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 placeholder-gray-300"
          />
          <button
            onClick={handleSearch}
            disabled={!email.trim()}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Buscar
          </button>
        </div>

        {foundAthlete && (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {foundAthlete.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Atleta encontrado</p>
                <p className="text-sm text-gray-600">{foundAthlete}</p>
              </div>
            </div>
            <button
              onClick={handleSendInvite}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#f97316' }}
            >
              Enviar invitación
            </button>
          </div>
        )}

        {notFound && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            No se encontró ningún atleta con ese email. Usa el código de invitación.
          </p>
        )}

        {inviteSent && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
            <span>✓</span>
            <span>Invitación enviada exitosamente</span>
          </div>
        )}
      </div>
    </div>
  )
}
