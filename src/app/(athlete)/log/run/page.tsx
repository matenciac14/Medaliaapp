'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type PrevSession = {
  completedAt: string | null
  durationMin: number | null
  distanceKm: number | null
  rpe: number | null
}

const RUN_TYPES = [
  { value: 'RODAJE_Z2',    label: 'Rodaje Z2',      subtext: 'Ritmo fácil — conversacional', icon: '🟢' },
  { value: 'FARTLEK',      label: 'Fartlek',         subtext: 'Cambios de ritmo libres',      icon: '🟡' },
  { value: 'TEMPO',        label: 'Tempo',           subtext: 'Ritmo moderado-alto sostenido', icon: '🟠' },
  { value: 'INTERVALOS',   label: 'Intervalos',      subtext: 'Series a alta intensidad',     icon: '🔴' },
  { value: 'TIRADA_LARGA', label: 'Tirada larga',   subtext: 'Distancia larga a ritmo suave', icon: '🔵' },
  { value: 'OTRO',         label: 'Sesión libre',   subtext: 'Otro tipo de carrera',          icon: '⚪' },
] as const

type RunType = typeof RUN_TYPES[number]['value']

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function LogRunPage() {
  const router = useRouter()
  const [runType, setRunType] = useState<RunType | null>(null)
  const [durationMin, setDurationMin] = useState<number>(45)
  const [distanceKm, setDistanceKm] = useState<string>('')
  const [rpe, setRpe] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevSession, setPrevSession] = useState<PrevSession | null>(null)

  useEffect(() => {
    if (!runType) { setPrevSession(null); return }
    fetch(`/api/log/last-session?type=${runType}`)
      .then((r) => r.json())
      .then((d) => setPrevSession(d.log ?? null))
      .catch(() => {})
  }, [runType])

  const isValid = runType !== null

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/log/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: runType,
          durationMin,
          distanceKm: distanceKm ? parseFloat(distanceKm) : null,
          rpe,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Error al guardar')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#ea580c] transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-[#1e3a5f]">Registrar corrida</h1>
      </div>

      {/* Tipo de sesión */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#1e3a5f]">¿Qué tipo de sesión fue?</p>
        <div className="flex flex-col gap-2">
          {RUN_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setRunType(t.value)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3',
                runType === t.value
                  ? 'border-[#ea580c] bg-[#ea580c]/8'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="flex-1">
                <span className={cn('font-semibold text-sm block', runType === t.value ? 'text-[#ea580c]' : 'text-[#1e3a5f]')}>
                  {t.label}
                </span>
                <span className="text-xs text-gray-400">{t.subtext}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Comparativa vs sesión anterior */}
      {runType && prevSession && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">
            Última vez —{' '}
            {prevSession.completedAt
              ? new Date(prevSession.completedAt).toLocaleDateString('es-CO', {
                  day: 'numeric', month: 'short',
                })
              : ''}
          </p>
          <div className="flex gap-4 text-sm text-blue-800">
            {prevSession.durationMin != null && (
              <span><strong>{prevSession.durationMin}</strong> min</span>
            )}
            {prevSession.distanceKm != null && (
              <span><strong>{Number(prevSession.distanceKm).toFixed(1)}</strong> km</span>
            )}
            {prevSession.rpe != null && (
              <span>RPE <strong>{prevSession.rpe}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Duración */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1e3a5f]">Duración</p>
          <span className="text-lg font-bold text-[#ea580c]">{durationMin} min</span>
        </div>
        <input
          type="range"
          min={10}
          max={180}
          step={5}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="w-full accent-[#ea580c]"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>10 min</span>
          <span>3 h</span>
        </div>
      </div>

      {/* Distancia (opcional) */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[#1e3a5f]">Distancia (opcional)</p>
        <div className="relative">
          <input
            type="number"
            step="0.1"
            placeholder="8.5"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-[#1e3a5f] transition-colors bg-white"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">km</span>
        </div>
      </div>

      {/* RPE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1e3a5f]">Esfuerzo percibido (RPE)</p>
          {rpe !== null && (
            <span className={cn(
              'text-sm font-bold px-2.5 py-0.5 rounded-full',
              rpe <= 4 ? 'bg-green-100 text-green-700' :
              rpe <= 6 ? 'bg-yellow-100 text-yellow-700' :
              rpe <= 8 ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            )}>
              RPE {rpe}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRpe(rpe === n ? null : n)}
              className={cn(
                'w-9 h-9 rounded-xl text-sm font-bold border-2 transition-all',
                rpe === n
                  ? n <= 4 ? 'border-green-500 bg-green-500 text-white'
                  : n <= 6 ? 'border-yellow-500 bg-yellow-500 text-white'
                  : n <= 8 ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-red-500 bg-red-500 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">1 = muy fácil · 5 = moderado · 10 = máximo esfuerzo</p>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[#1e3a5f]">Notas (opcional)</p>
        <textarea
          placeholder="¿Cómo te sentiste? ¿Algo que destacar?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-[#1e3a5f] transition-colors bg-white resize-none"
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto px-4 py-4 flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 border-2 border-gray-200 text-[#1e3a5f] font-semibold py-3 rounded-xl text-center text-sm"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex-1 bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Guardando...' : 'Guardar corrida ✓'}
          </button>
        </div>
      </footer>
    </div>
  )
}
