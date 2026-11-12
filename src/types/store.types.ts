import type { Json, OrderStatus } from './database.types'

export type OrderStatusAliasesMap = Partial<Record<OrderStatus, string>>

export type PosCustomerMode = 'REQUIRED' | 'ALLOW_GENERIC'

export interface WhatsAppOrderTemplateItem {
  id: string
  name: string
  description?: string
  content: string
  isPinned?: boolean
  updatedAt: string
}

export interface StoreThemeConfig {
  appTheme?: string
  catalogTheme?: string
  primaryColor?: string
  accentColor?: string
  headerBgColor?: string
  catalogPageSize?: number
  catalogGridColumns?: 3 | 4
  catalogSubtitle?: string
  showPrices?: boolean
  showStockBadge?: boolean
  allowVisitorThemeToggle?: boolean
  whatsappOrderMessage?: string
  whatsappOrderTemplates?: WhatsAppOrderTemplateItem[]
  pinnedWhatsappTemplateId?: string
  catalogBanner?: string
  instagramUrl?: string
  facebookUrl?: string
  openingHours?: string
  orderStatusAliases?: OrderStatusAliasesMap
  genericCustomerReleasedByAdmin?: boolean
  posCustomerMode?: PosCustomerMode
}

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
  parent_store_id?: string | null
  branch_code?: string | null
  is_branch?: boolean
  manager_name?: string | null
  free_employees_limit?: number | null
  extra_employee_price?: number | null
  is_active: boolean
  theme_config: StoreThemeConfig | Json | null
  created_at: string
  updated_at: string
}
