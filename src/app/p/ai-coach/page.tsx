import Link from 'next/link'
import { auth } from '@/auth'

const AI_PROGRAMS = [
  {
    id: 'ai-pro',
    name: 'AI Coach Pro',
    sport: 'Running, Gym, Ciclismo',
    level: 'Todos los niveles',
    price: 15,
    currency: 'USD',
    includes: [
      'Plan periodizado completo',
      'Check-in semanal automático',
      'Chat ilimitado con el AI Coach',
      'Nutrición personalizada por sesión',
      'Ajuste automático del plan',
    ],
  },
  {
    id: 'ai-gym',
    name: 'AI Coach + Gym',
    sport: 'Running, Gym, Ciclismo',
    level: 'Todos los niveles',
    price: 15,
    currency: 'USD',
    includes: [
      'Plan periodizado completo',
      'Check-in semanal automático',
      'Chat ilimitado con el AI Coach',
      'Nutrición personalizada por sesión',
      'Ajuste automático del plan',
      'Rutinas de gym con tracking de sets',
    ],
  },
]

const SPECIALTIES = ['Running', 'Gym', 'Ciclismo', 'Triatlón', 'Recomposición']
const STATS = [
  { value: '500+', label: 'Planes generados' },
  { value: '24/7', label: 'Disponible' },
  { value: '100%', label: 'Ajuste automático' },
]

export default async function AICoachPage() {
  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-[#1e3a5f]">Medaliq</Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/coaches" className="hover:text-[#1e3a5f] transition-colors">Coaches</Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="hover:text-[#1e3a5f]">Mi panel</Link>
            ) : (
              <Link href="/login" className="hover:text-[#1e3a5f]">Iniciar sesión</Link>
            )}
          </div>
          <Link href="/onboarding">
            <span className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
              Empieza gratis
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          <div className="w-24 h-24 rounded-full bg-[#f97316] flex items-center justify-center text-white font-extrabold text-2xl shrink-0">
            AI
          </div>
          <div className="flex-1">
            <div className="inline-block bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full mb-2 uppercase tracking-widest">
              Medaliq
            </div>
            <h1 className="text-3xl font-extrabold text-[#1e3a5f] mb-1">AI Coach Medaliq</h1>
            <p className="text-gray-500 text-base mb-3">Tu entrenador inteligente, disponible 24/7</p>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map((s) => (
                <span key={s} className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-2">Sobre el AI Coach</h2>
          <p className="text-gray-600 leading-relaxed">
            El AI Coach de Medaliq genera planes periodizados basados en ciencia del deporte, los ajusta cada semana según tus datos reales y responde tus preguntas en cualquier momento. Sin citas, sin esperas.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-2xl p-4 text-center">
              <div className="text-2xl font-extrabold text-[#1e3a5f]">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Programs */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">Programas disponibles</h2>
          <div className="flex flex-col gap-4">
            {AI_PROGRAMS.map((program) => (
              <div
                key={program.id}
                className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-[#1e3a5f] text-base mb-1">{program.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                        {program.sport}
                      </span>
                      <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                        {program.level}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-extrabold text-[#1e3a5f]">${program.price}</div>
                    <div className="text-xs text-gray-400">{program.currency}/mes</div>
                  </div>
                </div>
                <ul className="space-y-1 mb-4">
                  {program.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-[#f97316]">✓</span> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/onboarding">
                  <span className="inline-block bg-[#f97316] hover:bg-[#ea6c0a] text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
                    Empezar con AI Coach
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">Cómo funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { step: '01', title: 'Intake personalizado', desc: 'Cuéntale al AI tus objetivos, historial y disponibilidad.' },
              { step: '02', title: 'Plan en minutos', desc: 'Recibes un plan periodizado semana a semana, adaptado a ti.' },
              { step: '03', title: 'Entrena con guía', desc: 'Cada día tienes tu sesión, nutrición y métricas clave.' },
              { step: '04', title: 'Ajuste automático', desc: 'Cada semana el AI analiza tus datos y actualiza el plan.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {item.step}
                </div>
                <div>
                  <div className="font-semibold text-[#1e3a5f] text-sm mb-0.5">{item.title}</div>
                  <div className="text-gray-500 text-xs leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/onboarding">
            <span className="inline-block bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold px-8 py-3 rounded-xl text-base transition-colors">
              Empezar con AI Coach
            </span>
          </Link>
          <p className="text-gray-400 text-xs mt-3">Sin tarjeta de crédito. Cancela cuando quieras.</p>
        </div>
      </div>

      {/* Sticky bar — non-logged-in */}
      {!isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 hidden sm:block">
              Empieza a entrenar con inteligencia artificial desde hoy.
            </p>
            <Link href="/onboarding">
              <span className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">
                Crear cuenta gratis
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
