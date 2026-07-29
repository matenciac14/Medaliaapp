'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StravaState {
  connectedAt: string
}

interface Props {
  strava: StravaState | null
}

export default function IntegrationsClient({ strava }: Props) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnectStrava() {
    if (!confirm('¿Desconectar Strava? Dejarás de recibir actividades automáticamente.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/integrations/strava', { method: 'DELETE' })
      router.refresh()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Strava */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Strava</p>
            {strava ? (
              <p className="text-sm text-gray-500">
                Conectado el{' '}
                {new Date(strava.connectedAt).toLocaleDateString('es-CO', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Importa tus actividades de running y ciclismo automáticamente
              </p>
            )}
          </div>
        </div>

        {strava ? (
          <button
            onClick={handleDisconnectStrava}
            disabled={disconnecting}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 flex-shrink-0"
          >
            {disconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        ) : (
          <a
            href="/api/integrations/strava/connect"
            className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Conectar
          </a>
        )}
      </div>

      {/* Apple Health — solo iOS */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">♥</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Apple Health</p>
            <p className="text-sm text-gray-500">Disponible en la app iOS</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium flex-shrink-0 bg-gray-100 px-2 py-1 rounded">
          Solo mobile
        </span>
      </div>

      {/* Garmin */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Garmin</p>
            <p className="text-sm text-gray-500">Proximamente</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium flex-shrink-0 bg-gray-100 px-2 py-1 rounded">
          Proximamente
        </span>
      </div>
    </div>
  )
}
