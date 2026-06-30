'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  userId: string
  userName: string | null
}

export function DeleteUserButton({ userId, userName }: Props) {
  const [step, setStep]     = useState<'idle' | 'confirm1' | 'confirm2' | 'deleting'>('idle')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleDelete() {
    setStep('deleting')
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin/users')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Error al eliminar el usuario.')
      setStep('idle')
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm1')}
        className="text-xs text-red-500 hover:text-red-700 transition-colors underline underline-offset-2"
      >
        Eliminar usuario
      </button>
    )
  }

  if (step === 'confirm1') {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-red-800">
          ¿Eliminar a {userName ?? 'este usuario'}?
        </p>
        <p className="text-xs text-red-600">
          Esta acción es irreversible. Se eliminarán todos sus datos: plan de entrenamiento,
          check-ins, sesiones, historial nutricional y relaciones con coaches o atletas.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setStep('idle')}
            className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => setStep('confirm2')}
            className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            Sí, continuar
          </button>
        </div>
      </div>
    )
  }

  if (step === 'confirm2') {
    return (
      <div className="border-2 border-red-400 bg-red-50 rounded-lg p-4 space-y-3">
        <p className="text-sm font-bold text-red-900">
          Confirma la eliminación definitiva
        </p>
        <p className="text-xs text-red-700">
          Se registrará esta acción en el log de actividad con tu nombre de admin.
          No hay forma de deshacer esto.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setStep('idle')}
            className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => startTransition(handleDelete)}
            disabled={isPending}
            className="flex-1 px-3 py-1.5 rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    )
  }

  // step === 'deleting'
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
      Eliminando usuario…
    </div>
  )
}
