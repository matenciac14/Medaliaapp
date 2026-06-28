import { Resend } from 'resend'

const FROM = 'Medaliq <noreply@medaliq.com>'

export async function sendCoachWelcomeEmail(to: string, name: string, loginUrl: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Bienvenido a Medaliq — Tu cuenta de coach está lista',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:white;border-radius:16px;overflow:hidden">
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center">
            <span style="font-size:28px;font-weight:900;color:white">Medal</span><span style="font-size:28px;font-weight:900;color:#f97316">iq</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Hola ${name}, bienvenido 👋</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              Tu cuenta de coach en Medaliq está lista. Desde tu panel podrás gestionar atletas, crear planes personalizados y hacer seguimiento de su progreso.
            </p>
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151">Para empezar:</p>
            <ol style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#64748b;line-height:2">
              <li>Inicia sesión con tu cuenta</li>
              <li>Agrega tu primer asesorado desde el dashboard</li>
              <li>Genera su plan de entrenamiento</li>
            </ol>
            <a href="${loginUrl}" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Ir a mi panel →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
              Si tienes dudas responde este correo o escríbenos a hola@medaliq.com
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;font-size:12px;color:#94a3b8">© 2026 Medaliq · Coaching deportivo inteligente</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Restablece tu contraseña — Medaliq',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:white;border-radius:16px;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:32px 40px;text-align:center">
            <span style="font-size:28px;font-weight:900;color:white">Medal</span><span style="font-size:28px;font-weight:900;color:#f97316">iq</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1e3a5f">Restablecer contraseña</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva contraseña.
            </p>
            <a href="${resetLink}" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Crear nueva contraseña
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
              Este link expira en 1 hora. Si no solicitaste este cambio, ignora este correo.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;font-size:12px;color:#94a3b8">© 2026 Medaliq · Coaching deportivo inteligente</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
