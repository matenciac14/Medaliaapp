'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/admin',               label: 'Overview',       icon: '📊' },
  { href: '/admin/users',         label: 'Usuarios',       icon: '👤' },
  { href: '/admin/coaches',       label: 'Coaches',        icon: '🏋️' },
  { href: '/admin/subscriptions', label: 'Suscripciones',  icon: '💳' },
  { href: '/admin/roadmap',       label: 'Roadmap',        icon: '🗺️' },
  { href: '/admin/settings',      label: 'Config',         icon: '⚙️' },
]

export function AdminSidebarClient() {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside
        className="hidden lg:flex lg:flex-col w-64 h-screen sticky top-0 overflow-y-auto shrink-0"
        style={{ backgroundColor: '#111827' }}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>
              M
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Medaliq <span style={{ color: '#f97316' }}>Admin</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: isActive(item.href) ? '#f97316' : 'transparent',
                color: isActive(item.href) ? '#fff' : '#9ca3af',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Ir a la app</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#111827' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>
            M
          </div>
          <span className="text-white font-bold text-base tracking-tight">
            Medaliq <span style={{ color: '#f97316' }}>Admin</span>
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg"
        >
          Salir
        </button>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 flex z-20">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors"
            style={{ color: isActive(item.href) ? '#f97316' : '#6b7280' }}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
