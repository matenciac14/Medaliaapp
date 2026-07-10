'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Salad } from 'lucide-react'

export default function CreateTemplateClient() {
  const router = useRouter()
  const [name, setName] = useState('Mi Plan Nutricional')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { setError('El nombre es requerido.'); return }
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/athlete/nutrition/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al crear la plantilla.')
        return
      }
      const { template } = await res.json()
      router.push(`/nutrition/builder/${template.id}`)
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-5">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
          <Salad size={28} className="text-orange-600" />
        </div>
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Crea tu plan nutricional</h1>
        <p className="text-sm text-gray-500 mt-1">Define qué comer en días duros, fáciles y de descanso.</p>
      </div>

      <div className="text-left space-y-1">
        <label className="text-xs font-medium text-gray-600">Nombre del plan</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Mi Plan Nutricional"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <button
        onClick={handleCreate}
        disabled={isPending}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#ea580c' }}
      >
        {isPending ? 'Creando…' : 'Crear y empezar'}
      </button>
    </div>
  )
}
