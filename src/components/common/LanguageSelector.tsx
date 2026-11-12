import { useI18n, type SupportedLocale } from '@/hooks/useI18n'
import { Globe } from 'lucide-react'

interface LanguageSelectorProps {
  fullWidth?: boolean
}

export function LanguageSelector({ fullWidth = false }: LanguageSelectorProps) {
  const { locale, setLocale } = useI18n()

  const languages: { code: SupportedLocale; label: string; flag: string }[] = [
    { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  ]

  return (
    <div
      data-no-dom-translate="true"
      className={fullWidth ? 'w-full text-left' : 'relative inline-block text-left'}
    >
      <div
        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border border-border bg-surface text-xs font-medium text-foreground ${
          fullWidth ? 'w-full justify-between' : 'py-1.5 rounded-lg'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 text-muted-foreground shrink-0">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
          {fullWidth && (
            <span className="text-xs font-semibold text-sidebar-foreground">
              {locale === 'en-US'
                ? 'Language'
                : locale === 'es-ES'
                  ? 'Idioma'
                  : 'Idioma'}
            </span>
          )}
        </span>
        <select
          value={locale}
          aria-label="Selecionar idioma"
          onChange={(e) => setLocale(e.target.value as SupportedLocale)}
          className={`bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer ${
            fullWidth ? 'text-right' : 'pr-1'
          }`}
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code} className="bg-surface text-foreground">
              {l.flag} {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
