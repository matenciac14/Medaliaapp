'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // No mostrar si ya está instalada como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // No mostrar si el usuario ya la descartó en esta sesión
    if (sessionStorage.getItem('pwa-banner-dismissed')) return

    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(iOS)

    if (iOS) {
      // En iOS no hay beforeinstallprompt — mostrar instrucciones manuales
      setShow(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setDismissed(true)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  if (!show || dismissed) return null

  return (
    <div className="mx-4 mb-2 bg-[#1e3a5f] text-white rounded-2xl px-4 py-3 flex items-start gap-3 shadow-lg">
      <div className="w-9 h-9 rounded-xl bg-[#ea580c] flex items-center justify-center font-bold text-white text-base shrink-0 mt-0.5">
        M
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Instala Medaliq en tu celular</p>
        {isIOS ? (
          <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
            Toca <span className="font-semibold">Compartir</span> → <span className="font-semibold">Agregar a inicio</span> para acceso rápido sin abrir el navegador.
          </p>
        ) : (
          <p className="text-xs text-white/70 mt-0.5">
            Acceso directo desde tu pantalla de inicio, sin navegador.
          </p>
        )}
        {!isIOS && (
          <button
            onClick={install}
            className="mt-2 flex items-center gap-1.5 bg-[#ea580c] hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={13} />
            Instalar app
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-white/50 hover:text-white transition-colors shrink-0 mt-0.5">
        <X size={18} />
      </button>
    </div>
  )
}
