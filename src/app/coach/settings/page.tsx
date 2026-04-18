import Link from 'next/link'

export default function CoachSettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/coach/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <span>←</span> Volver al panel
      </Link>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#1e3a5f' }}>
        Configuración
      </h1>
      <p className="text-gray-400 text-sm">Próximamente — ajustes del perfil de coach</p>
    </div>
  )
}
