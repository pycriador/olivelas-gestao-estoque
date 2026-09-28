import { useThemeStore } from '@/stores/themeStore'

export type StoreThemeMode = 'light' | 'dark'

export interface StoreThemeOption {
  id: string
  name: string
  mode: StoreThemeMode
  hue: number
}

const COLOR_FAMILIES = [
  { id: 'ocean', name: 'Oceano', hue: 204 },
  { id: 'forest', name: 'Floresta', hue: 145 },
  { id: 'coral', name: 'Coral', hue: 12 },
  { id: 'violet', name: 'Violeta', hue: 272 },
  { id: 'amber', name: 'Âmbar', hue: 38 },
  { id: 'rose', name: 'Rosa', hue: 340 },
  { id: 'turquoise', name: 'Turquesa', hue: 174 },
  { id: 'slate', name: 'Ardósia', hue: 218 },
  { id: 'lime', name: 'Lima', hue: 91 },
  { id: 'plum', name: 'Ameixa', hue: 302 },
  { id: 'cobalt', name: 'Cobalto', hue: 229 },
  { id: 'mint', name: 'Menta', hue: 159 },
  { id: 'copper', name: 'Cobre', hue: 25 },
  { id: 'sky', name: 'Céu', hue: 192 },
  { id: 'orchid', name: 'Orquídea', hue: 319 },
] as const

export const STORE_THEMES: StoreThemeOption[] = COLOR_FAMILIES.flatMap((family) => [
  { ...family, id: `${family.id}-light`, mode: 'light' as const },
  { ...family, id: `${family.id}-dark`, mode: 'dark' as const },
])

export const DEFAULT_STORE_THEME = 'ocean-dark'

const THEME_VARIABLES = [
  'background', 'foreground', 'surface', 'surface-elevated', 'surface-hover',
  'card', 'card-foreground', 'popover', 'popover-foreground', 'primary',
  'primary-foreground', 'primary-hover', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground', 'border', 'input',
  'ring', 'sidebar-background', 'sidebar-foreground', 'sidebar-primary',
  'sidebar-primary-foreground', 'sidebar-accent', 'sidebar-accent-foreground',
  'sidebar-border', 'sidebar-ring',
]

export function getStoreThemeId(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  const value = (config as Record<string, unknown>).appTheme
  return typeof value === 'string' && STORE_THEMES.some((theme) => theme.id === value)
    ? value
    : null
}

function getThemeTokens(theme: StoreThemeOption): Record<string, string> {
  const { hue, mode } = theme
  const dark = mode === 'dark'
  const background = dark ? `${hue} 20% 8%` : `${hue} 28% 97%`
  const surface = dark ? `${hue} 18% 11%` : `${hue} 20% 100%`
  const elevated = dark ? `${hue} 19% 14%` : `${hue} 24% 94%`
  const primary = dark ? `${hue} 72% 64%` : `${hue} 72% 43%`
  const foreground = dark ? `${hue} 12% 94%` : `${hue} 24% 12%`
  const mutedForeground = dark ? `${hue} 11% 68%` : `${hue} 12% 43%`
  const border = dark ? `${hue} 15% 24%` : `${hue} 17% 87%`

  return {
    background,
    foreground,
    surface,
    'surface-elevated': elevated,
    'surface-hover': dark ? `${hue} 18% 18%` : `${hue} 24% 91%`,
    card: surface,
    'card-foreground': foreground,
    popover: surface,
    'popover-foreground': foreground,
    primary,
    'primary-foreground': dark ? `${hue} 25% 10%` : '0 0% 100%',
    'primary-hover': dark ? `${hue} 75% 70%` : `${hue} 75% 36%`,
    secondary: dark ? `${hue} 18% 20%` : `${hue} 22% 92%`,
    'secondary-foreground': foreground,
    muted: dark ? `${hue} 17% 18%` : `${hue} 20% 93%`,
    'muted-foreground': mutedForeground,
    accent: dark ? `${hue} 20% 21%` : `${hue} 24% 91%`,
    'accent-foreground': foreground,
    border,
    input: border,
    ring: primary,
    'sidebar-background': dark ? `${hue} 22% 7%` : `${hue} 22% 99%`,
    'sidebar-foreground': foreground,
    'sidebar-primary': primary,
    'sidebar-primary-foreground': dark ? `${hue} 25% 10%` : '0 0% 100%',
    'sidebar-accent': elevated,
    'sidebar-accent-foreground': foreground,
    'sidebar-border': border,
    'sidebar-ring': primary,
  }
}

export function applyStoreTheme(themeId: string | null) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const theme = STORE_THEMES.find((option) => option.id === themeId)

  if (!theme) {
    THEME_VARIABLES.forEach((variable) => root.style.removeProperty(`--${variable}`))
    delete root.dataset.storeTheme
    root.classList.toggle('dark', useThemeStore.getState().resolvedTheme === 'dark')
    root.classList.toggle('light', useThemeStore.getState().resolvedTheme === 'light')
    return
  }

  root.dataset.storeTheme = theme.id
  root.classList.toggle('dark', theme.mode === 'dark')
  root.classList.toggle('light', theme.mode === 'light')
  Object.entries(getThemeTokens(theme)).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value)
  })
}