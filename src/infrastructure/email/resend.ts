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

export async function sendAthleteCoachAssignedEmail(to: string, name: string, coachName: string, loginUrl: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${coachName} ahora es tu coach en Medaliq`,
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Hola ${name} 👋</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              <strong>${coachName}</strong> te agregó como asesorado en Medaliq. A partir de ahora podrás ver el plan que tu coach diseñe para ti y hacer seguimiento de tu progreso juntos.
            </p>
            <a href="${loginUrl}" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Ver mi plan →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
              Si no esperabas este mensaje, ignóralo o contáctanos a hola@medaliq.com
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

export async function sendAthleteWelcomeEmail(to: string, name: string, coachName: string, resetLink: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${coachName} te invitó a Medaliq — Crea tu cuenta`,
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Hola ${name} 👋</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              <strong>${coachName}</strong> te agregó como asesorado en Medaliq. Aquí podrás ver tu plan de entrenamiento, registrar sesiones y hacer seguimiento de tu progreso.
            </p>
            <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#374151">Para empezar, crea tu contraseña:</p>
            <a href="${resetLink}" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Crear mi cuenta →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
              Este enlace expira en 7 días. Si tienes dudas, contacta a ${coachName} directamente.
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

export async function sendCheckinReminderEmail(to: string, name: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Recuerda tu check-in semanal — Medaliq',
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Hola ${name} 👋</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              El domingo es el momento perfecto para hacer tu check-in semanal. Solo toma un minuto y le permite a tu plan adaptarse a cómo te fue esta semana.
            </p>
            <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6">
              Registra: peso, energía, calidad del sueño y tu percepción del esfuerzo. Con eso es suficiente.
            </p>
            <a href="https://medaliq.com/checkin" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Hacer mi check-in →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
              Si ya lo hiciste, ignora este correo.
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

export async function sendSessionReminderEmail(
  to: string,
  name: string,
  session: { typeLabel: string; durationMin: number; detail: string | null },
) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tu sesión de hoy: ${session.typeLabel} — Medaliq`,
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Buenos días, ${name} 🌅</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              Hoy tienes una sesión programada. ¡Arranca la semana con todo!
            </p>
            <table width="100%" style="background:#f8fafc;border-radius:12px;padding:20px;margin:0 0 24px">
              <tr>
                <td>
                  <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Sesión del día</p>
                  <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e3a5f">${session.typeLabel}</p>
                  <p style="margin:0;font-size:13px;color:#64748b">${session.durationMin} minutos</p>
                  ${session.detail ? `<p style="margin:12px 0 0;font-size:13px;color:#475569;line-height:1.6">${session.detail}</p>` : ''}
                </td>
              </tr>
            </table>
            <a href="https://medaliq.com/plan" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Ver mi plan completo →
            </a>
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

export async function sendPaymentOverdueCoachEmail(
  to: string,
  coachName: string,
  items: Array<{ athleteName: string; amount: number; currency: string; dueDate: Date }>,
) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const itemsHtml = items.map(i => {
    const daysOverdue = Math.floor((Date.now() - i.dueDate.getTime()) / 86400000)
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151">${i.athleteName}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;text-align:right">
          ${i.amount.toLocaleString('es-CO')} ${i.currency}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#ef4444;text-align:right">
          ${daysOverdue}d vencido
        </td>
      </tr>`
  }).join('')

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tienes ${items.length} pago${items.length > 1 ? 's' : ''} vencido${items.length > 1 ? 's' : ''} — Medaliq`,
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Hola ${coachName}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              Tienes <strong>${items.length} pago${items.length > 1 ? 's' : ''} vencido${items.length > 1 ? 's' : ''}</strong> pendiente${items.length > 1 ? 's' : ''} de cobro.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr>
                <th style="text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;padding-bottom:8px">Atleta</th>
                <th style="text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;padding-bottom:8px">Monto</th>
                <th style="text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;padding-bottom:8px">Estado</th>
              </tr>
              ${itemsHtml}
            </table>
            <a href="https://medaliq.com/coach/finanzas" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Ir a Finanzas →
            </a>
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

export async function sendEmailVerification(to: string, name: string, verifyUrl: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verifica tu correo en Medaliq',
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Hola ${name} 👋</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              Solo falta un paso: verifica tu correo para activar tu cuenta en Medaliq.
            </p>
            <a href="${verifyUrl}" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Verificar correo →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
              Este enlace expira en 24 horas. Si no creaste esta cuenta, ignora este correo.
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

export async function sendAthleteReadyEmail(to: string, coachName: string, athleteName: string, athleteId: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${athleteName} completó su perfil — acción requerida`,
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Hola ${coachName} 👋</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              <strong>${athleteName}</strong> acaba de completar su perfil en Medaliq y está esperando que le asignes un plan de entrenamiento.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
              Entra al panel, revisa su perfil y actívalo para que pueda empezar a entrenar.
            </p>
            <a href="https://medaliq.com/coach/athlete/${athleteId}" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Ver perfil de ${athleteName} →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6">
              Este atleta está en modo pendiente hasta que lo actives desde tu panel.
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

export async function sendPlanUpdatedEmail(to: string, name: string, adjustments: string[]) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const adjustmentList = adjustments
    .map(a => `<li style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.5">${a}</li>`)
    .join('')

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Tu plan se ajustó según tu check-in — Medaliq',
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e3a5f">Tu plan fue actualizado</h1>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">
              Hola ${name}, procesamos tu check-in semanal y ajustamos tu plan para la próxima semana:
            </p>
            <ul style="margin:0 0 24px;padding-left:20px">
              ${adjustmentList}
            </ul>
            <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.6">
              Estos cambios ya están en tu plan. El objetivo es que entrenes con la intensidad correcta según tu estado real.
            </p>
            <a href="https://medaliq.com/plan" style="display:inline-block;background:#f97316;color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;padding:14px 28px">
              Ver mi plan actualizado →
            </a>
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
