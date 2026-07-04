'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  CalendarDays,
  Apple,
  TrendingUp,
  ClipboardCheck,
  LogOut,
  Dumbbell,
  UserCircle,
  MessageSquare,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserConfig } from '@/lib/config/user-config'
import { useLanguage } from '@/app/_components/LanguageContext'
import LanguageSwitcher from '@/app/_components/LanguageSwitcher'

type Props = {
  user: { name: string; role: string }
  config: UserConfig
}

export default function SidebarClient({ user, config }: Props) {
  const pathname = usePathname()
  const { features } = config
  const { t } = useLanguage()
  const s = t.app.sidebar
  const [unreadCount, setUnreadCount] = useState(0)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => { setShowMore(false) }, [pathname])

  useEffect(() => {
    const load = () =>
      fetch('/api/messages/unread-count')
        .then(r => r.json())
        .then(d => setUnreadCount(d.count ?? 0))
        .catch(() => {})
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const allNavLinks = [
    { href: '/dashboard', label: s.dashboard,  icon: LayoutDashboard, show: true },
    { href: '/plan',      label: s.plan,        icon: CalendarDays,    show: features.plan },
    { href: '/checkin',   label: s.checkin,     icon: ClipboardCheck,  show: true },
    { href: '/nutrition', label: s.nutrition,   icon: Apple,           show: true },
    { href: '/progress',  label: s.progress,    icon: TrendingUp,      show: true },
    { href: '/gym',       label: s.gym,         icon: Dumbbell,        show: true },
    { href: '/messages',  label: 'Mensajes',    icon: MessageSquare,   show: true, badge: unreadCount },
    { href: '/profile',   label: s.profile,     icon: UserCircle,      show: true },
  ].filter((l) => l.show)

  // Mobile: 4 tabs principales + "Más" para el resto
  const mobileNavLinks = [
    { href: '/dashboard', label: s.dashboard,  icon: LayoutDashboard },
    { href: '/plan',      label: s.plan,        icon: CalendarDays },
    { href: '/nutrition', label: s.nutrition,   icon: Apple },
    { href: '/checkin',   label: s.checkin,     icon: ClipboardCheck },
  ]

  const moreLinks = [
    { href: '/gym',      label: s.gym,      icon: Dumbbell },
    { href: '/progress', label: s.progress, icon: TrendingUp },
    { href: '/messages', label: 'Mensajes', icon: MessageSquare, badge: unreadCount },
    { href: '/profile',  label: s.profile,  icon: UserCircle },
  ]

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#1e3a5f] text-white shrink-0 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ea580c] flex items-center justify-center font-bold text-white text-sm">M</div>
            <span className="text-xl font-bold tracking-tight">Medaliq</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {allNavLinks.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/65 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#ea580c]" />
                )}
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="flex-1">{label}</span>
                {badge != null && badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ea580c] text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <LanguageSwitcher variant="dark" />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ea580c] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-white/50 capitalize">{user.role.toLowerCase()}</p>
            </div>
            <button
              onClick={() => { document.cookie = 'locale=es;path=/;max-age=31536000'; signOut({ callbackUrl: '/login' }) }}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-1.5 text-white/50 hover:text-white transition-colors rounded-lg"
              aria-label={s.logout}
              title={s.logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-[#1e3a5f] text-white">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#ea580c] flex items-center justify-center font-bold text-white text-xs">M</div>
          <span className="text-base font-bold">Medaliq</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" />
          <button
            onClick={() => { document.cookie = 'locale=es;path=/;max-age=31536000'; signOut({ callbackUrl: '/login' }) }}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>{s.logout}</span>
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setShowMore(false)}
        />
      )}
      {showMore && (
        <div className="lg:hidden fixed bottom-[calc(52px+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-xl rounded-t-2xl py-3 px-4">
          <div className="grid grid-cols-4 gap-2">
            {moreLinks.map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-semibold transition-colors relative',
                    active ? 'bg-[#1e3a5f]/8 text-[#1e3a5f]' : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  <div className="relative">
                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                    {badge != null && badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#ea580c] text-white text-[9px] font-bold flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40 pb-safe">
        {mobileNavLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setShowMore(false)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] text-[10px] font-semibold transition-colors relative',
                active ? 'text-[#1e3a5f]' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#ea580c]" />
              )}
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
        {/* Tab "Más" */}
        <button
          onClick={() => setShowMore(v => !v)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] text-[10px] font-semibold transition-colors relative',
            showMore || moreLinks.some(l => isActive(l.href)) ? 'text-[#1e3a5f]' : 'text-gray-400'
          )}
        >
          {showMore
            ? <X size={22} strokeWidth={2} />
            : <MoreHorizontal size={22} strokeWidth={2} />
          }
          Más
        </button>
      </nav>
    </>
  )
}
