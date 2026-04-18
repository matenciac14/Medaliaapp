import Link from 'next/link'
import { mockCoach } from '@/lib/mock/coach-data'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col fixed inset-y-0 left-0 z-10 shadow-lg"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/coach/dashboard" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: '#f97316' }}
            >
              M
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Medaliq</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <NavLink href="/coach/dashboard" label="Mis atletas" icon="👥" />
          <NavLink href="/coach/invite" label="Invitar atleta" icon="➕" />
          <NavLink href="/coach/settings" label="Configuración" icon="⚙️" />
        </nav>

        {/* Back to athlete dashboard */}
        <div className="px-4 pb-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm py-2 px-3 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span>←</span>
            <span>Mi dashboard</span>
          </Link>
        </div>

        {/* Coach avatar */}
        <div className="px-4 pb-6 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: '#f97316' }}
            >
              {mockCoach.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="text-white text-sm font-medium leading-tight">{mockCoach.name}</p>
              <p className="text-white/50 text-xs">Coach</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  )
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
