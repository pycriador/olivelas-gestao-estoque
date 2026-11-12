export type PortalOrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export type PortalPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH'

export type PortalCardStyle = 'modern' | 'compact' | 'editorial'

export interface PortalWhatsAppTemplateItem {
  id: string
  name: string
  description?: string
  content: string
  isPinned?: boolean
  updatedAt?: string
}

export interface PortalStoreThemeConfig {
  catalogTheme?: string
  primaryColor?: string
  accentColor?: string
  bannerUrl?: string
  subtitle?: string
  catalogGridCols?: 3 | 4
  catalogPageSize?: number
  orderStatusAliases?: Partial<Record<PortalOrderStatus, string>>
  whatsappOrderMessage?: string
  whatsappOrderTemplates?: PortalWhatsAppTemplateItem[]
  pinnedWhatsappTemplateId?: string
}

export interface PortalStore {
  id: string
  name: string
  slug: string
  logo_url: string | null
  phone: string | null
  whatsapp: string | null
  address_street: string | null
  address_number?: string | null
  address_neighborhood?: string | null
  address_city: string | null
  address_state: string | null
  is_active?: boolean
  theme_config: PortalStoreThemeConfig | null
}

export interface PortalCategory {
  id: string
  name: string
}

export interface PortalProductImage {
  id: string
  public_url: string
  is_primary: boolean
  display_order: number
}

export interface PortalProduct {
  id: string
  store_id: string
  name: string
  sku: string
  barcode: string | null
  description: string | null
  unit: string
  selling_price: number
  category_id: string | null
  category_name?: string
  is_active: boolean
  is_published_catalog: boolean
  primary_image_url?: string | null
  images: PortalProductImage[]
}

export interface PortalCartItem {
  product: PortalProduct
  quantity: number
}

export interface PortalOrderTrackingItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  unit: string
  quantity: number
  unit_price: number
  discount: number
  total_price: number
}

export interface PortalOrderTracking {
  id: string
  store_id: string
  order_number: string
  channel: string
  status: PortalOrderStatus
  subtotal: number
  discount_amount: number
  shipping_amount: number
  total_amount: number
  notes: string | null
  customer_name: string
  customer_phone: string | null
  delivery_address: string | null
  payment_method: PortalPaymentMethod | string
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  store: PortalStore
  items: PortalOrderTrackingItem[]
}

export interface PortalCredentialStatus {
  valid: boolean
  code: 'OK' | 'MISSING_CONFIG' | 'REVOKED' | 'EXPIRED' | 'STORE_MISMATCH' | 'INVALID_TOKEN' | 'NETWORK_ERROR'
  message: string
  tokenName?: string
  expiresAt?: string | null
  scopes?: string[]
}

export interface PortalStoredOrderHistoryItem {
  id: string
  orderNumber: string
  storeId: string
  storeName: string
  totalAmount: number
  createdAt: string
}
