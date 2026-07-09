'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'

type AppNotification = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  SESION_HOY:           { emoji: '📅', color: 'text-blue-600',   bg: 'bg-blue-50' },
  CHECKIN_DISPONIBLE:   { emoji: '✅', color: 'text-violet-600', bg: 'bg-violet-50' },
  PLAN_ACTUALIZADO:     { emoji: '🔄', color: 'text-orange-500', bg: 'bg-orange-50' },
  MENSAJE_COACH:        { emoji: '💬', color: 'text-cyan-600',   bg: 'bg-cyan-50' },
  AJUSTE_NUTRICIONAL:   { emoji: '🥗', color: 'text-green-600',  bg: 'bg-green-50' },
  LOGRO:                { emoji: '🏆', color: 'text-amber-500',  bg: 'bg-amber-50' },
  PROPUESTA_COACH:      { emoji: '👤', color: 'text-indigo-600', bg: 'bg-indigo-50' },
}

const DEFAULT_CONFIG = { emoji: '🔔', color: 'text-gray-500', bg: 'bg-gray-100' }

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `hace ${mins < 1 ? 1 : mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications ?? [])
        setUnreadCount(d.unreadCount ?? 0)
      })
      .finally(() => setLoading(false))
  }, [])

  async function markAllRead() {
    if (marking || unreadCount === 0) return
    setMarking(true)
    await fetch('/api/notifications/read-all', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    setMarking(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="text-[#1e3a5f]" size={24} />
          <h1 className="text-xl font-bold text-[#1e3a5f]">
            Notificaciones
            {unreadCount > 0 && (
              <span className="ml-2 text-sm font-semibold text-orange-500">({unreadCount} sin leer)</span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Marcar todas leídas
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Cargando...</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Bell size={48} className="text-gray-200" />
          <p className="text-gray-500 font-medium">Sin notificaciones</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Aquí aparecerán actualizaciones de tu plan, check-ins y mensajes del coach.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG
            return (
              <div
                key={n.id}
                className={`flex gap-4 px-4 py-4 ${n.read ? '' : 'bg-orange-50/40'}`}
              >
                <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center text-lg shrink-0`}>
                  {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{formatRelative(n.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
