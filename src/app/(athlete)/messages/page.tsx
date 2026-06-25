'use client'

import { useEffect, useRef, useState } from 'react'

type Msg = {
  id: string
  fromId: string
  toId: string
  content: string
  readAt: string | null
  createdAt: string
}

type MeInfo = {
  id: string
  coachName: string | null
  coachId: string | null
}

export default function MessagesPage() {
  const [me, setMe] = useState<MeInfo | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/messages/me')
      .then(r => r.json())
      .then(data => setMe(data))
  }, [])

  useEffect(() => {
    if (!me?.coachId) return
    const load = () =>
      fetch(`/api/messages?with=${me.coachId}`)
        .then(r => r.json())
        .then(d => { setMsgs(d.messages ?? []); setLoaded(true) })
        .catch(() => setLoaded(true))
    load()
    // Mark coach messages as read
    fetch('/api/messages/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId: me.coachId }) })
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [me?.coachId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function handleSend() {
    if (!input.trim() || sending || !me?.coachId) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toId: me.coachId, content: input.trim() }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMsgs(prev => [...prev, message])
        setInput('')
      }
    } finally {
      setSending(false)
    }
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Cargando...
      </div>
    )
  }

  if (!me.coachId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">💬</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Sin coach asignado</h1>
        <p className="text-gray-500 text-sm">La mensajería está disponible cuando tienes un coach.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
        {me.coachName && (
          <p className="text-sm text-gray-500">Conversación con {me.coachName}</p>
        )}
      </div>

      {/* Chat box */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!loaded && (
            <p className="text-center text-sm text-gray-400 pt-8">Cargando mensajes...</p>
          )}
          {loaded && msgs.length === 0 && (
            <p className="text-center text-sm text-gray-400 pt-8">Aún no hay mensajes.</p>
          )}
          {msgs.map(m => {
            const isMe = m.fromId === me.id
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMe
                      ? 'text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                  style={isMe ? { backgroundColor: '#1e3a5f' } : {}}
                >
                  <p>{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {new Date(m.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
