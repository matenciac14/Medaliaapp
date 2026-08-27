import Link from 'next/link'
import { auth } from '@/auth'
import { MedaliqLogo } from '@/components/brand/MedaliqLogo'

export const metadata = {
  title: 'Coach AI — Medaliq',
  description: 'Entrenamiento deportivo personalizado con inteligencia artificial. Planes adaptativos, nutrición y coaching 24/7.',
}

export default async function AICoachProfilePage() {
  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><MedaliqLogo variant="light" size="md" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/coaches" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Ver todos los coaches
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Mi dashboard
              </Link>
            ) : (
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#ea580c' }}
              >
                Empieza gratis
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2240 100%)' }}>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-8">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl shrink-0 shadow-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.2)' }}
          >
            🤖
          </div>
          <div className="text-center sm:text-left text-white">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-2 flex-wrap">
              <h1 className="text-3xl font-extrabold">Coach AI</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                Powered by Claude
              </span>
            </div>
            <p className="text-blue-100 text-base leading-relaxed max-w-xl">
              Tu entrenador deportivo con inteligencia artificial. Genera planes periodizados personalizados,
              ajusta la carga según tu check-in semanal y responde tus preguntas las 24 horas.
            </p>
            <div className="flex gap-2 flex-wrap mt-4 justify-center sm:justify-start">
              {['Running', 'Ejercicios'].map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(249,115,22,0.25)', color: '#fdba74' }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        {/* Qué incluye */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5">Qué incluye el Coach AI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '📋', title: 'Plan periodizado', desc: 'Generado según tu deporte, objetivo, nivel y disponibilidad horaria.' },
              { icon: '🔄', title: 'Ajuste automático', desc: 'El plan se adapta cada semana según tu check-in de RPE, peso y energía.' },
              { icon: '🥗', title: 'Nutrición integrada', desc: 'Macros y kcal sincronizados con la carga del entrenamiento del día.' },
              { icon: '💬', title: 'Chat 24/7', desc: 'Pregunta sobre tu plan, lesiones leves, nutrición o progresión de cargas.' },
              { icon: '💪', title: 'Módulo de Ejercicios', desc: 'Tracker de series y pesos con detección de récords personales.' },
              { icon: '📈', title: 'Progresión visible', desc: 'Gráficas de peso, FC reposo, adherencia y volumen semanal.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Precios */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5">Planes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 border border-gray-200 rounded-2xl">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Gratis</p>
              <p className="text-3xl font-black text-gray-900 mb-1">$0</p>
              <p className="text-xs text-gray-400 mb-4">Para siempre</p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                {['Dashboard + log de entrenamientos', 'Registro de nutrición y gym', 'Tracker de ejercicios'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-500 text-xs">✓</span> {f}
                  </li>
                ))}
                {['Check-in adaptativo', 'Métricas de progreso'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-300">
                    <span className="text-xs">✗</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 border-2 rounded-2xl" style={{ borderColor: '#1e3a5f', backgroundColor: '#f0f4f9' }}>
              <p className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: '#1e3a5f' }}>Pro</p>
              <p className="text-3xl font-black mb-1" style={{ color: '#1e3a5f' }}>$9.99<span className="text-base font-normal text-gray-500">/mes</span></p>
              <p className="text-xs text-gray-400 mb-4">Todo lo del plan Gratis, más:</p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {['Plan adaptativo periodizado', 'Check-in semanal + ajuste de carga', 'Nutrición personalizada diaria', 'Métricas de progreso'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#1e3a5f' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-6">
          <p className="text-gray-500 text-sm mb-4">Sin tarjeta de crédito para empezar. Cancela cuando quieras.</p>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3.5 rounded-xl font-semibold text-white text-base transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Ir a mi dashboard
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white text-base transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#ea580c' }}
              >
                Empezar gratis
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-base border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
