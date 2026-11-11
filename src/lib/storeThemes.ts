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

export function getCatalogThemeId(config: unknown): string {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return DEFAULT_STORE_THEME
  const rec = config as Record<string, unknown>
  const catalogTheme = rec.catalogTheme
  if (typeof catalogTheme === 'string' && STORE_THEMES.some((theme) => theme.id === catalogTheme)) {
    return catalogTheme
  }
  const appTheme = rec.appTheme
  if (typeof appTheme === 'string' && STORE_THEMES.some((theme) => theme.id === appTheme)) {
    return appTheme
  }
  return DEFAULT_STORE_THEME
}

export function toggleStoreThemeMode(themeId: string): string {
  if (themeId.endsWith('-light')) {
    const candidate = `${themeId.slice(0, -6)}-dark`
    if (STORE_THEMES.some((t) => t.id === candidate)) return candidate
  } else if (themeId.endsWith('-dark')) {
    const candidate = `${themeId.slice(0, -5)}-light`
    if (STORE_THEMES.some((t) => t.id === candidate)) return candidate
  }
  return themeId === 'ocean-dark' ? 'ocean-light' : 'ocean-dark'
}

export const CATALOG_PAGE_SIZE_OPTIONS = [6, 8, 12, 16, 24, 36, 48, 96] as const

export interface ResolvedCatalogCustomization {
  catalogTheme: string
  primaryColor: string
  accentColor: string
  headerBgColor: string
  catalogPageSize: number
  catalogGridColumns: 3 | 4
  catalogSubtitle: string
  showPrices: boolean
  showStockBadge: boolean
  allowVisitorThemeToggle: boolean
  openingHours: string
  instagramUrl: string
}

export function getCatalogCustomization(config: unknown): ResolvedCatalogCustomization {
  const rec =
    config && typeof config === 'object' && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {}

  const rawPageSize = Number(rec.catalogPageSize)
  const catalogPageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 4 && rawPageSize <= 120 ? rawPageSize : 24

  const catalogGridColumns: 3 | 4 = Number(rec.catalogGridColumns) === 3 ? 3 : 4

  return {
    catalogTheme: getCatalogThemeId(config),
    primaryColor: typeof rec.primaryColor === 'string' ? rec.primaryColor.trim() : '',
    accentColor: typeof rec.accentColor === 'string' ? rec.accentColor.trim() : '',
    headerBgColor: typeof rec.headerBgColor === 'string' ? rec.headerBgColor.trim() : '',
    catalogPageSize,
    catalogGridColumns,
    catalogSubtitle:
      typeof rec.catalogSubtitle === 'string' && rec.catalogSubtitle.trim()
        ? rec.catalogSubtitle.trim()
        : 'Catálogo Oficial',
    showPrices: rec.showPrices !== false,
    showStockBadge: Boolean(rec.showStockBadge),
    allowVisitorThemeToggle: rec.allowVisitorThemeToggle !== false,
    openingHours: typeof rec.openingHours === 'string' ? rec.openingHours.trim() : '',
    instagramUrl: typeof rec.instagramUrl === 'string' ? rec.instagramUrl.trim() : '',
  }
}

export function hexToHslComponents(hex: string): { h: number; s: number; l: number } | null {
  const cleaned = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null

  const r = parseInt(cleaned.slice(0, 2), 16) / 255
  const g = parseInt(cleaned.slice(2, 4), 16) / 255
  const b = parseInt(cleaned.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
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

export interface CustomThemeOverrides {
  primaryColor?: string | null
  accentColor?: string | null
}

export function applyStoreTheme(
  themeId: string | null,
  customOverrides?: CustomThemeOverrides
) {
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
  const tokens = { ...getThemeTokens(theme) }

  if (customOverrides?.primaryColor) {
    const hsl = hexToHslComponents(customOverrides.primaryColor)
    if (hsl) {
      const primaryToken = `${hsl.h} ${hsl.s}% ${hsl.l}%`
      const hoverLightness = theme.mode === 'dark' ? Math.min(90, hsl.l + 6) : Math.max(15, hsl.l - 7)
      tokens.primary = primaryToken
      tokens['primary-hover'] = `${hsl.h} ${hsl.s}% ${hoverLightness}%`
      tokens['primary-foreground'] = hsl.l > 65 ? `${hsl.h} 30% 10%` : '0 0% 100%'
      tokens.ring = primaryToken
      tokens['sidebar-primary'] = primaryToken
      tokens['sidebar-ring'] = primaryToken
    }
  }

  if (customOverrides?.accentColor) {
    const hsl = hexToHslComponents(customOverrides.accentColor)
    if (hsl) {
      const accentLightness = theme.mode === 'dark' ? Math.min(32, Math.max(16, hsl.l)) : Math.max(85, Math.min(95, hsl.l))
      tokens.accent = `${hsl.h} ${Math.min(60, hsl.s)}% ${accentLightness}%`
      tokens.secondary = `${hsl.h} ${Math.min(50, hsl.s)}% ${accentLightness}%`
    }
  }

  Object.entries(tokens).forEach(([name, value]) => {
    root.style.setProperty(`--${name}`, value)
  })
}