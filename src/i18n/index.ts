import { create } from 'zustand'
import { ptBR } from './locales/pt-BR'
import { enUS } from './locales/en-US'
import { esES } from './locales/es-ES'

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES'
export type TranslationDict = typeof ptBR

const translations: Record<SupportedLocale, TranslationDict> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
}

interface I18nState {
  locale: SupportedLocale
  t: TranslationDict
  setLocale: (locale: SupportedLocale) => void
}

const STORAGE_KEY = 'olivelas_preferred_locale'

function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'pt-BR'
  const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale
  if (saved && translations[saved]) return saved

  const browserLang = navigator.language
  if (browserLang.startsWith('en')) return 'en-US'
  if (browserLang.startsWith('es')) return 'es-ES'
  return 'pt-BR'
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: getInitialLocale(),
  t: translations[getInitialLocale()],
  setLocale: (locale: SupportedLocale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale)
      document.documentElement.lang = locale
    }
    set({
      locale,
      t: translations[locale] || ptBR,
    })
  },
}))

export function useI18n() {
  const { locale, t, setLocale } = useI18nStore()
  return { locale, t, setLocale }
}
