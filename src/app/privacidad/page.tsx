export const metadata = {
  title: 'Política de privacidad — Medaliq',
  description: 'Política de privacidad y tratamiento de datos personales de Medaliq.',
}

export default function PrivacidadPage() {
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
          <h1 className="text-4xl font-extrabold text-[#1e3a5f] mb-3">Política de privacidad</h1>
          <p className="text-gray-400 text-sm">Última actualización: junio de 2025</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">1. Introducción</h2>
            <p>
              En Medaliq nos tomamos en serio tu privacidad. Esta política describe qué datos recopilamos,
              cómo los usamos y cómo los protegemos cuando utilizas nuestra plataforma en <strong>medaliq.com</strong>{' '}
              y en nuestra aplicación móvil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">2. Datos que recopilamos</h2>
            <p>Recopilamos los siguientes tipos de datos:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>Datos de cuenta:</strong> nombre, dirección de correo electrónico y contraseña
                (almacenada de forma encriptada).
              </li>
              <li>
                <strong>Datos de perfil deportivo:</strong> edad, peso, talla, género, nivel de experiencia,
                frecuencia cardíaca en reposo y máxima, objetivos deportivos y disponibilidad de entrenamiento.
              </li>
              <li>
                <strong>Datos de entrenamiento:</strong> sesiones registradas, RPE (escala de esfuerzo percibido),
                check-ins semanales, rutinas de gym y resultados de sesiones.
              </li>
              <li>
                <strong>Datos nutricionales:</strong> objetivos calóricos y de macronutrientes calculados en base
                a tu perfil (no almacenamos registros de comidas individuales a menos que tú los ingreses).
              </li>
              <li>
                <strong>Datos de uso:</strong> páginas visitadas, acciones en la plataforma y datos técnicos
                del dispositivo (tipo de navegador, sistema operativo).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">3. Cómo usamos tus datos</h2>
            <p>Usamos tu información para:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Generar y personalizar tu plan de entrenamiento y nutrición.</li>
              <li>Ajustar la carga de tu plan según tus check-ins semanales.</li>
              <li>Enviarte recordatorios de sesiones y check-ins por correo electrónico.</li>
              <li>Mejorar el servicio mediante análisis de uso agregado y anonimizado.</li>
              <li>Gestionar tu cuenta, suscripción y comunicaciones de soporte.</li>
            </ul>
            <p className="mt-3">
              <strong>No vendemos ni compartimos tus datos personales con terceros con fines comerciales.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">4. Proveedores de servicios</h2>
            <p>
              Para operar la plataforma, compartimos datos mínimos necesarios con proveedores de confianza:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Neon (base de datos):</strong> almacenamiento seguro de todos los datos de usuario en servidores cloud.</li>
              <li><strong>Vercel (infraestructura):</strong> hospedaje de la aplicación web y la API.</li>
              <li><strong>Resend (correo electrónico):</strong> envío de correos transaccionales (bienvenida, recordatorios, alertas).</li>
            </ul>
            <p className="mt-3">
              Todos los proveedores están sujetos a acuerdos de procesamiento de datos y cumplen con estándares
              de seguridad reconocidos internacionalmente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">5. Almacenamiento y seguridad</h2>
            <p>
              Tus datos se almacenan en servidores seguros con cifrado en reposo y en tránsito (HTTPS/TLS).
              Las contraseñas se almacenan usando hashing con bcrypt. Revisamos regularmente nuestras medidas
              de seguridad para proteger tu información.
            </p>
            <p className="mt-3">
              Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, borramos tus datos
              personales en un plazo de 30 días, salvo obligación legal de conservarlos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">6. Tus derechos</h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Acceder</strong> a los datos personales que tenemos sobre ti.</li>
              <li><strong>Corregir</strong> datos incorrectos o incompletos.</li>
              <li><strong>Eliminar</strong> tu cuenta y todos tus datos personales.</li>
              <li><strong>Exportar</strong> tus datos en formato legible (previa solicitud).</li>
              <li><strong>Oponerte</strong> al uso de tus datos para análisis de mejora del servicio.</li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, escríbenos a{' '}
              <a href="mailto:hola@medaliq.com" className="text-[#f97316] hover:underline font-medium">
                hola@medaliq.com
              </a>{' '}
              y responderemos en un plazo máximo de 15 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">7. Cookies</h2>
            <p>
              Medaliq utiliza cookies esenciales para el funcionamiento de la sesión de usuario y cookies
              de análisis para entender el uso de la plataforma (datos agregados y anónimos). No utilizamos
              cookies de publicidad ni de seguimiento de terceros.
            </p>
            <p className="mt-3">
              Puedes desactivar las cookies en la configuración de tu navegador, aunque esto puede afectar
              la funcionalidad del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">8. Menores de edad</h2>
            <p>
              Medaliq no está dirigido a menores de 18 años sin supervisión adulta. Si tienes conocimiento
              de que un menor ha proporcionado datos personales sin autorización, contáctanos para eliminarlos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">9. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Notificaremos cambios materiales por correo
              electrónico o mediante un aviso visible en la plataforma con al menos 15 días de anticipación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1e3a5f] mb-3">10. Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad o tratamiento de datos, contáctanos en{' '}
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
            <a href="/terminos" className="hover:text-white transition-colors">Términos de uso</a>
            <a href="/privacidad" className="text-white font-medium">Privacidad</a>
            <a href="mailto:hola@medaliq.com" className="hover:text-white transition-colors">hola@medaliq.com</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
