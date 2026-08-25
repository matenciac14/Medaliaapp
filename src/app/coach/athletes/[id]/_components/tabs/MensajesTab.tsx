'use client'

type Msg = { id: string; fromId: string; toId: string; content: string; readAt: string | null; createdAt: string }

interface MensajesTabProps {
  athleteId: string
  msgs: Msg[]
  msgsLoaded: boolean
  msgInput: string
  setMsgInput: (v: string) => void
  msgSending: boolean
  handleSendMessage: () => void
}

export default function MensajesTab({
  athleteId,
  msgs,
  msgsLoaded,
  msgInput,
  setMsgInput,
  msgSending,
  handleSendMessage,
}: MensajesTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ height: 520 }}>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!msgsLoaded && (
          <p className="text-center text-sm text-gray-400 pt-8">Cargando mensajes...</p>
        )}
        {msgsLoaded && msgs.length === 0 && (
          <p className="text-center text-sm text-gray-400 pt-8">Aún no hay mensajes. Escribe el primero.</p>
        )}
        {msgs.map(m => {
          const isCoach = m.fromId !== athleteId
          return (
            <div key={m.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isCoach
                    ? 'text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
                style={isCoach ? { backgroundColor: '#1e3a5f' } : {}}
              >
                <p>{m.content}</p>
                <p className={`text-[10px] mt-1 ${isCoach ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                  {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {new Date(m.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2">
        <input
          type="text"
          value={msgInput}
          onChange={e => setMsgInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          placeholder="Escribe un mensaje..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
        />
        <button
          onClick={handleSendMessage}
          disabled={!msgInput.trim() || msgSending}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
