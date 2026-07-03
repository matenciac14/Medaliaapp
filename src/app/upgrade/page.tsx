import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import DowngradeButton from './_components/DowngradeButton'

export default async function UpgradePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ATHLETE') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center mb-10">
        <div className="text-5xl mb-4">🚀</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Elige tu plan</h1>
        <p className="text-gray-500">Sigue gratis o desbloquea todo con Pro</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Gratis</p>
          <p className="text-4xl font-bold text-gray-900 mb-1">$0</p>
          <p className="text-gray-400 text-sm mb-6">Para siempre</p>
          <ul className="text-sm text-gray-600 space-y-2 mb-8 flex-1">
            <li>✓ Dashboard + log de entrenamientos</li>
            <li>✓ Registro de nutrición y gym</li>
            <li className="text-gray-300">✗ Plan adaptativo periodizado</li>
            <li className="text-gray-300">✗ Check-in semanal + ajustes de carga</li>
            <li className="text-gray-300">✗ Métricas de progreso</li>
          </ul>
          <DowngradeButton />
        </div>

        {/* Pro */}
        <div
          className="bg-white rounded-2xl border-2 shadow-sm p-8 flex flex-col"
          style={{ borderColor: '#1e3a5f' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#1e3a5f' }}>Pro</p>
            <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f97316' }}>Recomendado</span>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">$9.99</p>
          <p className="text-gray-400 text-sm mb-6">por mes</p>
          <ul className="text-sm text-gray-600 space-y-2 mb-8 flex-1">
            <li>✓ Plan adaptativo periodizado</li>
            <li>✓ Check-in semanal + ajustes de carga</li>
            <li>✓ Nutrición personalizada diaria</li>
            <li>✓ Métricas de progreso</li>
            <li>✓ Tracker de ejercicios con detección de PRs</li>
          </ul>
          <a
            href={`mailto:hola@medaliq.com?subject=Quiero%20Pro%20-%20${encodeURIComponent(session.user.email ?? '')}&body=Hola%2C%20quiero%20activar%20el%20plan%20Pro%20de%20Medaliq%20a%20%249.99%2Fmes.`}
            className="block text-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Activar Pro — $9.99/mes
          </a>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-8">
        ¿Tienes preguntas? Escríbenos a{' '}
        <a href="mailto:hola@medaliq.com" className="underline">hola@medaliq.com</a>
      </p>
    </div>
  )
}
