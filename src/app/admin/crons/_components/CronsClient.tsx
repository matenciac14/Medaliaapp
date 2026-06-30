'use client'

import { useState } from 'react'

type CronDef = {
  id: string
  name: string
  schedule: string
  scheduleHuman: string
  description: string
  path: string
}

type TriggerState = 'idle' | 'running' | 'ok' | 'error'
type ResultMap = Record<string, { state: TriggerState; detail?: string }>

export function CronsClient({ crons }: { crons: CronDef[] }) {
  const [results, setResults] = useState<ResultMap>({})

  async function handleTrigger(cronId: string) {
    setResults((prev) => ({ ...prev, [cronId]: { state: 'running' } }))
    try {
      const res = await fetch('/api/admin/crons/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cron: cronId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setResults((prev) => ({
          ...prev,
          [cronId]: { state: 'ok', detail: JSON.stringify(data.result ?? {}, null, 2) },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          [cronId]: { state: 'error', detail: data.error ?? `HTTP ${res.status}` },
        }))
      }
    } catch (err) {
      setResults((prev) => ({ ...prev, [cronId]: { state: 'error', detail: String(err) } }))
    }
  }

  return (
    <div className="space-y-4">
      {crons.map((cron) => {
        const r = results[cron.id]
        return (
          <div key={cron.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900 text-sm">{cron.name}</h2>
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-500">
                    {cron.schedule}
                  </code>
                </div>
                <p className="text-xs text-gray-500 mb-1">{cron.scheduleHuman}</p>
                <p className="text-sm text-gray-600">{cron.description}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">{cron.path}</p>
              </div>

              <button
                onClick={() => handleTrigger(cron.id)}
                disabled={r?.state === 'running'}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                {r?.state === 'running' ? 'Ejecutando…' : 'Ejecutar ahora'}
              </button>
            </div>

            {/* Resultado */}
            {r && r.state !== 'idle' && r.state !== 'running' && (
              <div className={`mt-4 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap ${
                r.state === 'ok'
                  ? 'bg-green-50 border border-green-100 text-green-800'
                  : 'bg-red-50 border border-red-100 text-red-800'
              }`}>
                {r.state === 'ok' ? '✓ Ejecutado correctamente\n' : '✗ Error\n'}
                {r.detail}
              </div>
            )}
            {r?.state === 'running' && (
              <div className="mt-4 rounded-lg p-3 text-xs text-gray-500 bg-gray-50 border border-gray-100">
                Ejecutando cron…
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
