import type { Json } from './database.types'

export interface Store {
  id: string
  name: string
  slug: string
  document: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  logo_url: string | null
  banner_url: string | null
  description: string | null
  address_street: string | null
  address_number: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zipcode: string | null
  is_active: boolean
  theme_config: {
    appTheme?: string
    primaryColor?: string
    accentColor?: string
    showPrices?: boolean
    whatsappOrderMessage?: string
    catalogBanner?: string
    instagramUrl?: string
    facebookUrl?: string
    openingHours?: string
  } | Json | null
  created_at: string
  updated_at: string
}
