'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/admin',               label: 'Overview',        icon: '📊' },
  { href: '/admin/users',         label: 'Usuarios',        icon: '👤' },
  { href: '/admin/coaches',       label: 'Coaches',         icon: '🏋️' },
  { href: '/admin/subscriptions', label: 'Suscripciones',   icon: '💳' },
  { href: '/admin/roadmap',       label: 'Roadmap',         icon: '🗺️' },
  { href: '/admin/settings',      label: 'Configuración',   icon: '⚙️' },
]

export function AdminSidebarClient() {
  const pathname = usePathname()

  return (
    <aside
      className="w-64 h-screen sticky top-0 flex flex-col overflow-y-auto"
      style={{ backgroundColor: '#111827' }}
    >
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs"
            style={{ backgroundColor: '#f97316' }}
          >
            M
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Medaliq <span style={{ color: '#f97316' }}>Admin</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: isActive ? '#f97316' : 'transparent',
                color: isActive ? '#fff' : '#9ca3af',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
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
  )
}
