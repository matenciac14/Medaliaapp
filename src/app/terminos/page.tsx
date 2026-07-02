export const metadata = {
  title: 'Términos y Condiciones — Medaliq',
  description: 'Términos y condiciones de uso de la plataforma Medaliq.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-[#1e3a5f] hover:opacity-80 transition-opacity">
            Medaliq
          </a>
          <a href="/" className="text-sm font-medium text-gray-500 hover:text-[#1e3a5f] transition-colors">
            ← Volver al inicio
          </a>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-[#1e3a5f] mb-3">Términos de uso</h1>
          <p className="text-gray-400 text-sm">Última actualización: 1 de julio de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">1. Descripción del servicio</h2>
            <p>
              Medaliq es una plataforma de entrenamiento deportivo y planificación nutricional que genera planes
              periodizados personalizados para atletas y herramientas de gestión para entrenadores. El servicio
              está disponible en <strong>medaliq.com</strong> y en la aplicación móvil oficial de Medaliq.
            </p>
            <p className="mt-3">
              Medaliq no es un servicio médico ni de salud clínica. El contenido de la plataforma tiene fines
              exclusivamente deportivos y de acondicionamiento físico. Ante cualquier condición médica, consulta
              a un profesional de salud antes de comenzar un programa de entrenamiento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">2. Aceptación de los términos</h2>
            <p>
              Al crear una cuenta en Medaliq, aceptas estos Términos de uso en su totalidad. Si no estás de acuerdo
              con alguna parte, no debes utilizar el servicio. El uso continuado de la plataforma después de
              cualquier modificación a estos términos implica la aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">3. Cuentas de usuario</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Debes tener al menos 18 años para crear una cuenta. Menores de edad requieren autorización de un adulto responsable.</li>
              <li>Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta.</li>
              <li>Proporcionas información veraz y actualizada al registrarte y mantenerla así durante el uso del servicio.</li>
              <li>Medaliq se reserva el derecho de suspender o eliminar cuentas que violen estos términos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">4. Suscripciones y pagos</h2>
            <p>
              Medaliq ofrece un período de prueba gratuito de 30 días con acceso completo al plan Pro. Al finalizar
              el trial, puedes continuar con el plan Gratuito (funciones básicas) o suscribirte al plan Pro.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Los precios están expresados en dólares estadounidenses (USD) e incluyen todos los impuestos aplicables.</li>
              <li>Los pagos se procesan a través de pasarelas seguras. Medaliq no almacena datos de tarjetas de crédito.</li>
              <li>Puedes cancelar tu suscripción en cualquier momento. El acceso Pro se mantiene hasta el final del período facturado.</li>
              <li>No se realizan reembolsos por períodos parciales salvo que la ley aplicable lo exija.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">5. Uso aceptable</h2>
            <p>Al usar Medaliq, te comprometes a no:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Usar el servicio para fines ilegales o contrarios a estos términos.</li>
              <li>Intentar acceder sin autorización a sistemas o datos de otros usuarios.</li>
              <li>Reproducir, distribuir o crear obras derivadas del contenido de Medaliq sin autorización expresa.</li>
              <li>Compartir tu cuenta con terceros o revender el acceso al servicio.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">6. Propiedad intelectual</h2>
            <p>
              Todo el contenido de Medaliq — incluyendo software, diseño, textos, fórmulas, algoritmos y materiales
              de entrenamiento — es propiedad exclusiva de Medaliq o sus licenciantes y está protegido por las leyes
              de propiedad intelectual aplicables. Los usuarios conservan la propiedad de los datos personales que
              ingresan en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">7. Limitación de responsabilidad</h2>
            <p>
              Medaliq proporciona el servicio "tal como está" sin garantías de ningún tipo. No somos responsables
              por lesiones, daños a la salud ni resultados deportivos derivados del uso de los planes generados por
              la plataforma. El entrenamiento físico conlleva riesgos inherentes que el usuario asume al utilizar
              el servicio.
            </p>
            <p className="mt-3">
              En ningún caso la responsabilidad total de Medaliq superará el monto pagado por el usuario en los
              últimos 12 meses por el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">8. Modificaciones al servicio</h2>
            <p>
              Medaliq se reserva el derecho de modificar, suspender o descontinuar cualquier parte del servicio
              en cualquier momento, con o sin previo aviso. Notificaremos cambios materiales a los usuarios activos
              por correo electrónico con al menos 30 días de anticipación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">9. Protección de datos personales</h2>
            <p>
              El tratamiento de los datos personales de los usuarios se rige por la Ley 1581 de 2012 y el Decreto
              1377 de 2013 de la República de Colombia. Para usuarios en Brasil, aplica adicionalmente la Lei Geral
              de Proteção de Dados (LGPD — Lei nº 13.709/2018). Para más información, consulta nuestra{' '}
              <a href="/privacidad" className="text-[#f97316] hover:underline font-medium">Política de Privacidad</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">10. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa será resuelta
              ante los tribunales competentes de la ciudad de Bogotá D.C., Colombia, salvo que la ley aplicable
              establezca otra jurisdicción.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">11. Contacto</h2>
            <p>
              Para preguntas sobre estos términos, escríbenos a{' '}
              <a href="mailto:hola@medaliq.com" className="text-[#f97316] hover:underline font-medium">
                hola@medaliq.com
              </a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-blue-200 py-8 px-4 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white font-bold text-lg">Medaliq</span>
          <div className="flex gap-6 text-sm">
            <a href="/terminos" className="text-white font-medium">Términos de uso</a>
            <a href="/privacidad" className="hover:text-white transition-colors">Privacidad</a>
            <a href="mailto:hola@medaliq.com" className="hover:text-white transition-colors">hola@medaliq.com</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
