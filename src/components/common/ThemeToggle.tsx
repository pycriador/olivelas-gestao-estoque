import { useTheme } from '@/hooks/useTheme'
import { Sun, Moon, Laptop } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
      <button
        onClick={() => setTheme('light')}
        title="Tema Claro"
        className={`p-1.5 rounded-md text-xs transition-colors ${
          theme === 'light'
            ? 'bg-surface text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        title="Tema Escuro"
        className={`p-1.5 rounded-md text-xs transition-colors ${
          theme === 'dark'
            ? 'bg-surface text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        title="Tema do Sistema"
        className={`p-1.5 rounded-md text-xs transition-colors ${
          theme === 'system'
            ? 'bg-surface text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Laptop className="h-4 w-4" />
      </button>
    </div>
  )
}
