'use client'

import { useEffect, useState, useCallback } from 'react'

type AIProfile = {
  coachingPhilosophy: string
  periodizationPrinciples: string
  injuryProtocol: string
  nutritionGuidelines: string
  goalNotes: string
}

const FIELDS: { key: keyof AIProfile; label: string; desc: string; rows: number }[] = [
  {
    key: 'coachingPhilosophy',
    label: 'Filosofía de coaching',
    desc: 'Principios generales que guían las recomendaciones del AI Coach al atleta.',
    rows: 4,
  },
  {
    key: 'periodizationPrinciples',
    label: 'Principios de periodización',
    desc: 'Cómo el AI estructura las fases del plan (BASE, DESARROLLO, ESPECÍFICO, AFINAMIENTO).',
    rows: 4,
  },
  {
    key: 'injuryProtocol',
    label: 'Protocolo de lesiones',
    desc: 'Qué hacer cuando el atleta reporta dolor o banderas rojas. Incluye escalamiento.',
    rows: 3,
  },
  {
    key: 'nutritionGuidelines',
    label: 'Guías de nutrición',
    desc: 'Principios nutricionales que el AI puede usar en el chat. Sin prescripción médica.',
    rows: 3,
  },
  {
    key: 'goalNotes',
    label: 'Notas por tipo de objetivo',
    desc: 'Contexto adicional según el objetivo: carrera, recomposición, gym general.',
    rows: 3,
  },
]

const EMPTY: AIProfile = {
  coachingPhilosophy: '',
  periodizationPrinciples: '',
  injuryProtocol: '',
  nutritionGuidelines: '',
  goalNotes: '',
}

export default function AdminAIPage() {
  const [profile, setProfile] = useState<AIProfile>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-profile')
      const data = await res.json()
      setProfile(data.aiProfile ?? EMPTY)
    } catch {
      setError('Error al cargar el perfil AI.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/ai-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil AI Coach</h1>
          <p className="text-sm text-gray-500 mt-1">
            Estos campos se inyectan en el system prompt del AI Coach chat. Cambios aplican en minutos sin deploy.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="shrink-0 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>
      ) : (
        <div className="space-y-5">
          {FIELDS.map(({ key, label, desc, rows }) => (
            <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <div className="px-5 py-4">
                <textarea
                  value={profile[key]}
                  onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  rows={rows}
                  placeholder={`Escribe las instrucciones para "${label.toLowerCase()}"...`}
                  className="w-full text-sm text-gray-800 placeholder-gray-300 resize-y border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 transition"
                />
                <p className="text-[11px] text-gray-300 mt-1 text-right">
                  {profile[key].length} caracteres
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          El caché se invalida automáticamente al guardar (TTL 1h → revalidate inmediato).
        </p>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
