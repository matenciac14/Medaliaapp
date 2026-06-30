'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { rankResults } from '@/domain/admin/search'
import type { SearchUser } from '@/domain/admin/search'

const ROLE_COLOR: Record<string, string> = {
  ATHLETE: 'text-blue-600',
  COACH:   'text-orange-600',
  ADMIN:   'text-red-600',
}

export function AdminSearchPalette() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [users, setUsers]     = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  // Abrir con ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus al abrir
  useEffect(() => {
    if (open) {
      setQuery('')
      setUsers([])
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Buscar con debounce
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setUsers([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setUsers(rankResults(data.users ?? [], q))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 200)
    return () => clearTimeout(t)
  }, [query, search])

  function navigate(user: SearchUser) {
    router.push(`/admin/users/${user.id}`)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, users.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && users[selected]) {
      navigate(users[selected])
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors text-left"
        aria-label="Búsqueda global (⌘K)"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="flex-1">Buscar…</span>
        <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
              onKeyDown={onKeyDown}
              placeholder="Buscar usuario por nombre o email…"
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            {loading && (
              <span className="text-xs text-gray-400">Buscando…</span>
            )}
            <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>

          {/* Results */}
          {users.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-1">
              {users.map((u, i) => (
                <li key={u.id}>
                  <button
                    onClick={() => navigate(u)}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selected ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${ROLE_COLOR[u.role] ?? 'text-gray-500'}`}>
                      {u.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.length >= 2 && !loading && users.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {query.length < 2 && (
            <div className="px-4 py-4 text-center text-xs text-gray-400">
              Escribe al menos 2 caracteres para buscar
            </div>
          )}
        </div>
      </div>
    </>
  )
}
