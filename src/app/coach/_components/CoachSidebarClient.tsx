'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Users, Dumbbell, Globe, Settings, LogOut, Plus, UserPlus, LayoutDashboard, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/app/_components/LanguageContext'
import LanguageSwitcher from '@/app/_components/LanguageSwitcher'

type Props = { coachName: string }

export default function CoachSidebarClient({ coachName }: Props) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const s = t.app.sidebar
  const initials = coachName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const navLinks = [
    { href: '/coach/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { href: '/coach/athletes',  label: s.myAthletes,     icon: Users           },
    { href: '/coach/gym',       label: s.gym,            icon: Dumbbell        },
    { href: '/coach/profile',   label: 'Mi Perfil',      icon: Globe           },
    { href: '/coach/finanzas',  label: 'Finanzas',       icon: Wallet          },
    { href: '/coach/invite',    label: 'Invitar atleta', icon: UserPlus        },
    { href: '/coach/settings',  label: s.settings,       icon: Settings        },
  ]

  // Mobile: 5 tabs planos
  const mobileNavLinks = [
    { href: '/coach/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
    { href: '/coach/athletes',   label: s.myAthletes,   icon: Users           },
    { href: '/coach/clients/new',label: 'Nuevo',        icon: Plus            },
    { href: '/coach/gym',        label: s.gym,          icon: Dumbbell        },
    { href: '/coach/settings',   label: s.settings,     icon: Settings        },
  ]

  function isActive(href: string) {
    const exactMatch = ['/coach/dashboard', '/coach/athletes', '/coach/invite', '/coach/settings', '/coach/finanzas']
    return exactMatch.includes(href) ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Sidebar desktop ── */}
      <aside
        className="hidden lg:flex lg:flex-col w-64 fixed inset-y-0 left-0 z-10 shadow-lg"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/coach/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: '#f97316' }}>M</div>
            <span className="text-white font-bold text-lg tracking-tight">Medaliq</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
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
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#f97316]" />
                )}
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <LanguageSwitcher variant="dark" />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: '#f97316' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{coachName}</p>
              <p className="text-white/50 text-xs">Coach</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-white/50 hover:text-white transition-colors" title={s.logout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#1e3a5f' }}>
        <Link href="/coach/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#f97316' }}>M</div>
          <span className="text-white font-bold text-base">Medaliq Coach</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="dark" />
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors">
            <LogOut size={16} />
            <span>{s.logout}</span>
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav — FAB central para "Nuevo" ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-end z-20 pb-safe">
        {mobileNavLinks.map(({ href, label, icon: Icon }, i) => {
          const active = isActive(href)
          const isFab = i === 2

          if (isFab) {
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-end pb-2 gap-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg -mt-6"
                  style={{ backgroundColor: '#f97316' }}
                >
                  <Icon size={22} color="white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-semibold text-gray-400">{label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] text-[10px] font-semibold transition-colors relative',
                active ? 'text-[#1e3a5f]' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#f97316]" />
              )}
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
