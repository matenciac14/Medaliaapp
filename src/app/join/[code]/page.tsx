import Link from 'next/link'

export default function JoinPage({ params }: { params: { code: string } }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#f8fafc' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          M
        </div>
        <span className="font-bold text-xl tracking-tight" style={{ color: '#1e3a5f' }}>
          Medaliq
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl"
          style={{ backgroundColor: '#fff7ed' }}
        >
          🏃
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Has sido invitado a entrenar
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          Un coach te invita a unirte a su panel de entrenamiento en Medaliq
        </p>

        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-semibold mb-8"
          style={{ backgroundColor: '#f0f4f9', color: '#1e3a5f' }}
        >
          Código: {params.code}
        </div>

        <div className="space-y-3">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Crear mi cuenta
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm border-2 transition-colors hover:bg-gray-50"
            style={{ borderColor: '#1e3a5f', color: '#1e3a5f' }}
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Al registrarte aceptas que este coach pueda ver tu progreso y planes de entrenamiento.
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Medaliq — Coaching deportivo con inteligencia artificial
      </p>
    </div>
  )
}
