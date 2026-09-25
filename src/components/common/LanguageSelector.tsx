import { useI18n, type SupportedLocale } from '@/hooks/useI18n'
import { Globe } from 'lucide-react'

export function LanguageSelector() {
  const { locale, setLocale } = useI18n()

  const languages: { code: SupportedLocale; label: string; flag: string }[] = [
    { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  ]

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as SupportedLocale)}
          className="bg-transparent text-xs focus:outline-none cursor-pointer pr-1"
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
