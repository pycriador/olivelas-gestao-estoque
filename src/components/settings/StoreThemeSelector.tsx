import { Check } from 'lucide-react'
import { STORE_THEMES, type StoreThemeMode } from '@/lib/storeThemes'

interface StoreThemeSelectorProps {
  value: string
  onChange: (themeId: string) => void
  disabled?: boolean
}

export function StoreThemeSelector({ value, onChange, disabled = false }: StoreThemeSelectorProps) {
  const renderThemes = (mode: StoreThemeMode) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {STORE_THEMES.filter((theme) => theme.mode === mode).map((theme) => {
        const isSelected = value === theme.id
        const surface = mode === 'dark' ? `hsl(${theme.hue} 20% 10%)` : `hsl(${theme.hue} 28% 97%)`
        const foreground = mode === 'dark' ? `hsl(${theme.hue} 12% 94%)` : `hsl(${theme.hue} 24% 12%)`
        const primary = `hsl(${theme.hue} 72% ${mode === 'dark' ? 64 : 43}%)`

        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange(theme.id)}
            className={`flex min-w-0 items-center gap-2 rounded-md border p-2 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <span
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70"
              style={{ backgroundColor: surface, color: foreground }}
              aria-hidden="true"
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: primary }} />
              {isSelected && <Check className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-background text-primary" />}
            </span>
            <span className="min-w-0 truncate text-[11px] font-medium text-foreground">
              {theme.name}
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Claros · 15</h3>
        {renderThemes('light')}
      </section>
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Escuros · 15</h3>
        {renderThemes('dark')}
      </section>
    </div>
  )
}