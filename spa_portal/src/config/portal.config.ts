import type { PortalCardStyle } from '../types/portal.types'
import gnzPreset from '../../presets/gnz-hortifruti.preset.json'

const env = import.meta.env as Record<string, string | undefined>

export interface PortalRuntimeConfig {
  supabaseUrl: string
  supabasePublishableKey: string
  storeId: string
  hbacToken: string
  storeSlug: string
  branding: {
    customTitle: string
    heroBadge: string
    heroSubtitle: string
    deliveryBannerText: string
    primaryColor: string
    accentColor: string
    cardStyle: PortalCardStyle
    gridColumnsDesktop: 3 | 4
    defaultPageSize: number
    showTrustBadges: boolean
    trustBadges: string[]
  }
}

/**
 * Permite sobrescrever via query string (?storeId=...&token=...) durante testes
 * de homologação rápida, mantendo as variáveis de ambiente (.env) como fonte oficial
 * em produção.
 */
function readUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}

export const portalConfig: PortalRuntimeConfig = {
  supabaseUrl:
    env.VITE_SUPABASE_URL ||
    'https://mffrafqyjbjitlhjnlai.supabase.co',
  supabasePublishableKey:
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ',
  storeId:
    readUrlParam('storeId') ||
    env.VITE_PORTAL_STORE_ID ||
    gnzPreset.storeId,
  hbacToken:
    readUrlParam('token') ||
    env.VITE_PORTAL_HBAC_TOKEN ||
    'olv_live_de149281982227867223b7bd3398f930',
  storeSlug:
    env.VITE_PORTAL_STORE_SLUG ||
    gnzPreset.storeSlug,
  branding: {
    customTitle: env.VITE_PORTAL_CUSTOM_TITLE || gnzPreset.branding.customTitle,
    heroBadge: env.VITE_PORTAL_HERO_BADGE || gnzPreset.branding.heroBadge,
    heroSubtitle: gnzPreset.branding.heroSubtitle,
    deliveryBannerText:
      env.VITE_PORTAL_DELIVERY_INFO || gnzPreset.branding.deliveryBannerText,
    primaryColor:
      env.VITE_PORTAL_BRAND_PRIMARY || gnzPreset.branding.primaryColor,
    accentColor:
      env.VITE_PORTAL_BRAND_ACCENT || gnzPreset.branding.accentColor,
    cardStyle:
      (env.VITE_PORTAL_CARD_STYLE as PortalCardStyle) ||
      (gnzPreset.branding.cardStyle as PortalCardStyle) ||
      'modern',
    gridColumnsDesktop: (gnzPreset.branding.gridColumnsDesktop as 3 | 4) || 4,
    defaultPageSize: gnzPreset.branding.defaultPageSize || 24,
    showTrustBadges: gnzPreset.branding.showTrustBadges ?? true,
    trustBadges: gnzPreset.branding.trustBadges || [],
  },
}

export function isPortalConfigured(): boolean {
  return Boolean(
    portalConfig.supabaseUrl &&
      portalConfig.supabasePublishableKey &&
      portalConfig.storeId &&
      portalConfig.hbacToken
  )
}
