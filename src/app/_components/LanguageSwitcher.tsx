'use client'

import { useLanguage } from './LanguageContext'
import type { Locale } from '@/lib/i18n/types'

const FLAGS: Record<Locale, { flag: string; label: string }> = {
  es: { flag: '🇪🇸', label: 'ES' },
  en: { flag: '🇺🇸', label: 'EN' },
  pt: { flag: '🇧🇷', label: 'PT' },
}

const LOCALES: Locale[] = ['es', 'en', 'pt']

type Props = {
  variant?: 'dark' | 'light'
}

export default function LanguageSwitcher({ variant = 'dark' }: Props) {
  const { locale, setLocale } = useLanguage()
  const isLight = variant === 'light'

  const cycleLocale = () => {
    const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length]
    setLocale(next)
  }

  return (
    <>
      {/* Mobile: botón compacto con locale activo, cicla al hacer clic */}
      <button
        onClick={cycleLocale}
        title="Cambiar idioma"
        className={[
          'sm:hidden flex items-center gap-1 px-[10px] py-[5px] rounded-[8px] text-xs font-medium transition-colors',
          isLight
            ? 'bg-[#f3f4f6] text-[#4b5563] hover:bg-gray-200'
            : 'bg-white/15 text-white hover:bg-white/25',
        ].join(' ')}
      >
        <span>{FLAGS[locale].flag}</span>
        <span>{FLAGS[locale].label}</span>
      </button>

      {/* Desktop: los tres idiomas */}
      <div className="hidden sm:flex items-center gap-1">
        {(Object.entries(FLAGS) as [Locale, { flag: string; label: string }][]).map(([loc, { flag, label }]) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            title={label}
            className={[
              'flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all',
              locale === loc
                ? isLight
                  ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                  : 'bg-white/20 text-white'
                : isLight
                  ? 'text-gray-400 hover:text-gray-600'
                  : 'text-white/40 hover:text-white/70',
            ].join(' ')}
          >
            <span>{flag}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
