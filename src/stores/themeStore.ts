import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

const THEME_STORAGE_KEY = 'olivelas_theme_preference'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'dark'
}

function applyThemeToDocument(theme: ThemeMode) {
  if (typeof window === 'undefined') return 'dark'
  const root = document.documentElement
  const resolved = theme === 'system' ? getSystemTheme() : theme

  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  return resolved
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme = getInitialTheme()
  const resolved = applyThemeToDocument(initialTheme)

  // Listen to OS theme changes if on system
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode
      if (current === 'system') {
        const newResolved = applyThemeToDocument('system')
        set({ resolvedTheme: newResolved })
      }
    })
  }

  return {
    theme: initialTheme,
    resolvedTheme: resolved,
    setTheme: (theme: ThemeMode) => {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
      const resolved = applyThemeToDocument(theme)
      set({ theme, resolvedTheme: resolved })
    },
  }
})

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useThemeStore()
  return { theme, resolvedTheme, setTheme }
}
