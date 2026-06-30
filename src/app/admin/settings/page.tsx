export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes generales de la plataforma</p>
      </div>

      <div className="space-y-6">
        {/* Plataforma */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Plataforma</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Nombre de la app',       value: 'Medaliq',          desc: 'Nombre público de la plataforma' },
              { label: 'Email de soporte',        value: 'hola@medaliq.com', desc: 'Dirección para consultas de usuarios' },
              { label: 'Dominio',                 value: 'medaliq.com',      desc: 'Dominio principal registrado en AWS Route 53' },
              { label: 'Instagram',               value: '@medaliqapp',      desc: 'Cuenta oficial de la marca' },
            ].map((item) => (
              <div key={item.label} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <span className="text-sm text-gray-600 font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stack técnico */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Stack técnico</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Framework',     value: 'Next.js 16 App Router' },
              { label: 'Base de datos', value: 'PostgreSQL · Neon serverless · Prisma 7' },
              { label: 'Auth',          value: 'Auth.js v5 (JWT)' },
              { label: 'AI',            value: 'Claude Sonnet 4.6 — en pausa, listo para reactivar' },
              { label: 'Deploy',        value: 'Vercel (producción activa) · DNS Route 53' },
              { label: 'Email',         value: 'Resend · dominio medaliq.com verificado' },
              { label: 'Mobile',        value: 'React Native · Expo ~54 · NativeWind v4' },
            ].map((item) => (
              <div key={item.label} className="px-6 py-4 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <span className="text-sm text-gray-500">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas integraciones */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Integraciones pendientes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Google OAuth',       status: 'activo',   color: 'bg-green-100 text-green-700',  desc: 'Web + mobile. Requiere GOOGLE_CLIENT_ID/SECRET en Vercel.' },
              { label: 'Email (Resend)',      status: 'activo',   color: 'bg-green-100 text-green-700',  desc: 'Transaccionales: welcome coach/atleta, forgot password, atleta listo.' },
              { label: 'Pagos (Wompi)',       status: 'pendiente', color: 'bg-yellow-100 text-yellow-700', desc: 'Suscripción Pro atleta $9.99/mes · webhook → activa features.' },
              { label: 'Push notifications', status: 'pendiente', color: 'bg-yellow-100 text-yellow-700', desc: 'Backend push-token listo. Falta: EAS + FCM/APNs + permisos mobile.' },
              { label: 'Strava / Garmin',    status: 'futuro',   color: 'bg-gray-100 text-gray-500',   desc: 'Importar actividades completadas → SessionLog.' },
            ].map((item) => (
              <div key={item.label} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.color}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
