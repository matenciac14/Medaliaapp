'use client'

import { useState } from 'react'

type Props = { email: string }

export function ResetPasswordButton({ email }: Props) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleReset() {
    setState('sending')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <span className="text-xs text-green-600 font-medium">
        ✓ Email de reset enviado a {email}
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span className="text-xs text-red-500">
        Error al enviar el email.{' '}
        <button onClick={() => setState('idle')} className="underline">Reintentar</button>
      </span>
    )
  }

  return (
    <button
      onClick={handleReset}
      disabled={state === 'sending'}
      className="text-xs text-blue-500 hover:text-blue-700 transition-colors underline underline-offset-2 disabled:opacity-50"
    >
      {state === 'sending' ? 'Enviando…' : 'Enviar link de reset de contraseña'}
    </button>
  )
}
