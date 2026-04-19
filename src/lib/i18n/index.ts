import { cookies } from 'next/headers'
import { es } from './translations/es'
import { en } from './translations/en'
import { pt } from './translations/pt'
import type { Locale, Translations } from './types'

export const LOCALES: Locale[] = ['es', 'en', 'pt']
export const DEFAULT_LOCALE: Locale = 'es'

export const allTranslations: Record<Locale, Translations> = { es, en, pt }

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value
  return (LOCALES.includes(raw as Locale) ? raw : DEFAULT_LOCALE) as Locale
}

export async function getT(): Promise<Translations> {
  const locale = await getServerLocale()
  return allTranslations[locale]
}
