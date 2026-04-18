'use client'

import { useState } from 'react'

type Props = {
  onCreated: () => void
}

const POST_TYPES = [
  { value: 'TIP', label: '💡 Tip' },
  { value: 'ROUTINE_SHOWCASE', label: '🏋️ Rutina destacada' },
  { value: 'ACHIEVEMENT', label: '🏆 Logro de atleta' },
  { value: 'ANNOUNCEMENT', label: '📢 Anuncio' },
]

export default function PostForm({ onCreated }: Props) {
  const [type, setType] = useState('TIP')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    try {
      const res = await fetch('/api/coach/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, body, tags, isPublic }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al publicar.')
        return
      }

      setType('TIP')
      setTitle('')
      setBody('')
      setTagsInput('')
      setIsPublic(true)
      onCreated()
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de publicación <span className="text-red-500">*</span>
        </label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white"
        >
          {POST_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          placeholder="Ej: 3 errores que cometen los corredores principiantes"
          maxLength={120}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contenido <span className="text-red-500">*</span>
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          required
          rows={5}
          placeholder="Escribe el contenido de tu publicación..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (separados por coma)
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="running, principiantes, lesiones"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
        {tagsInput && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tagsInput.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={e => setIsPublic(e.target.checked)}
          className="w-4 h-4 accent-[#f97316]"
        />
        <label htmlFor="isPublic" className="text-sm text-gray-700 cursor-pointer">
          Publicación pública (visible en mi perfil)
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#f97316' }}
      >
        {loading ? 'Publicando...' : 'Publicar'}
      </button>
    </form>
  )
}
