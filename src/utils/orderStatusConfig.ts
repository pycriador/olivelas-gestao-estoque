import type { OrderStatus } from '@/types/database.types'
import type { OrderStatusHistoryEntry } from '@/types/order.types'
import type { OrderStatusAliasesMap } from '@/types/store.types'
import { formatCurrency } from '@/utils/currency'

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
]

export const CUSTOMIZABLE_ORDER_STATUSES: Array<{
  code: OrderStatus
  systemName: string
  defaultAlias: string
  description: string
}> = [
  {
    code: 'PENDING',
    systemName: 'PENDING',
    defaultAlias: 'Pedido Recebido',
    description: 'Status inicial assim que o pedido chega na plataforma.',
  },
  {
    code: 'CONFIRMED',
    systemName: 'CONFIRMED',
    defaultAlias: 'Confirmado',
    description: 'Pedido conferido e aceito pelo operador da loja.',
  },
  {
    code: 'PROCESSING',
    systemName: 'PROCESSING',
    defaultAlias: 'Em Separação',
    description: 'Produtos sendo separados, pesados ou preparados.',
  },
  {
    code: 'READY',
    systemName: 'READY',
    defaultAlias: 'Pronto para Entrega / Retirada',
    description: 'Pedido embalado aguardando retirada ou saída para entrega.',
  },
  {
    code: 'SHIPPED',
    systemName: 'SHIPPED',
    defaultAlias: 'Saiu para Entrega',
    description: 'Pedido em rota de entrega até o endereço do cliente.',
  },
  {
    code: 'DELIVERED',
    systemName: 'DELIVERED',
    defaultAlias: 'Entregue',
    description: 'Pedido entregue no endereço ou retirado no balcão.',
  },
  {
    code: 'COMPLETED',
    systemName: 'COMPLETED',
    defaultAlias: 'Finalizado',
    description: 'Pedido concluído e finalizado (encerra o acompanhamento em tempo real).',
  },
  {
    code: 'CANCELLED',
    systemName: 'CANCELLED',
    defaultAlias: 'Cancelado',
    description: 'Pedido cancelado com estorno de estoque.',
  },
]

export const DEFAULT_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pedido Recebido',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Em Separação',
  READY: 'Pronto para Entrega / Retirada',
  SHIPPED: 'Saiu para Entrega',
  DELIVERED: 'Entregue',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

const LOCAL_STORAGE_STATUS_PREFIX = 'olivelas_order_status_aliases_'
const LOCAL_STORAGE_CUSTOMER_ORDERS_PREFIX = 'olivelas_public_customer_orders_'
const LOCAL_STORAGE_COMPLETED_ORDERS_KEY = 'olivelas_completed_order_ids'

export function markOrderCompletedLocally(orderId: string, isCompleted: boolean): void {
  if (!orderId || typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_COMPLETED_ORDERS_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    const set = new Set(list)
    if (isCompleted) {
      set.add(orderId)
    } else {
      set.delete(orderId)
    }
    window.localStorage.setItem(LOCAL_STORAGE_COMPLETED_ORDERS_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore storage errors
  }
}

export function isOrderMarkedCompletedLocally(orderId?: string | null): boolean {
  if (!orderId || typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_COMPLETED_ORDERS_KEY)
    if (!raw) return false
    const list: string[] = JSON.parse(raw)
    return Array.isArray(list) && list.includes(orderId)
  } catch {
    return false
  }
}

export function resolveEffectiveOrderStatus(
  rawStatus: OrderStatus | string | undefined | null,
  notes?: string | null,
  orderId?: string | null
): OrderStatus {
  if (!rawStatus) return 'PENDING'
  if (rawStatus === 'COMPLETED') return 'COMPLETED'
  if (rawStatus === 'DELIVERED') {
    if (notes?.includes('[STATUS:COMPLETED]') || isOrderMarkedCompletedLocally(orderId)) {
      return 'COMPLETED'
    }
  }
  return rawStatus as OrderStatus
}

export function getSavedLocalStatusAliases(storeId?: string | null): OrderStatusAliasesMap {
  if (!storeId || typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_STATUS_PREFIX}${storeId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveLocalStatusAliases(
  storeId: string | null | undefined,
  aliases: OrderStatusAliasesMap
): void {
  if (!storeId || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      `${LOCAL_STORAGE_STATUS_PREFIX}${storeId}`,
      JSON.stringify(aliases)
    )
  } catch {
    // ignore storage errors
  }
}

export function extractStatusAliasesFromThemeConfig(
  themeConfig: unknown,
  storeId?: string | null
): OrderStatusAliasesMap {
  const localFallback = getSavedLocalStatusAliases(storeId)
  if (!themeConfig || typeof themeConfig !== 'object' || Array.isArray(themeConfig)) {
    return localFallback
  }
  const rawAliases = (themeConfig as Record<string, unknown>).orderStatusAliases
  if (!rawAliases || typeof rawAliases !== 'object' || Array.isArray(rawAliases)) {
    return localFallback
  }
  return {
    ...localFallback,
    ...(rawAliases as OrderStatusAliasesMap),
  }
}

export function getStoreOrderStatusLabels(
  themeConfig?: unknown,
  storeId?: string | null
): Record<OrderStatus, string> {
  const custom = extractStatusAliasesFromThemeConfig(themeConfig, storeId)
  const resolved: Record<OrderStatus, string> = { ...DEFAULT_ORDER_STATUS_LABELS }

  ;(Object.keys(DEFAULT_ORDER_STATUS_LABELS) as OrderStatus[]).forEach((statusKey) => {
    const alias = custom[statusKey]?.trim()
    if (alias) {
      resolved[statusKey] = alias
    }
  })

  return resolved
}

export function getOrderStatusLabel(
  status: OrderStatus | string | undefined | null,
  themeConfig?: unknown,
  storeId?: string | null
): string {
  if (!status) return DEFAULT_ORDER_STATUS_LABELS.PENDING
  const labels = getStoreOrderStatusLabels(themeConfig, storeId)
  return labels[status as OrderStatus] || status
}

export function getOrderStatusBadgeVariant(
  status: OrderStatus | string | undefined | null
): 'default' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'DELIVERED':
      return 'default'
    case 'CANCELLED':
      return 'destructive'
    case 'READY':
    case 'SHIPPED':
      return 'default'
    case 'PROCESSING':
    case 'CONFIRMED':
      return 'warning'
    default:
      return 'outline'
  }
}

export function buildOrderTrackingUrl(orderId: string, storeSlug?: string | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const baseUrl = import.meta.env.BASE_URL || '/'
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  if (storeSlug && storeSlug.trim()) {
    return `${origin}${normalizedBase}store/${storeSlug.trim()}/order/${orderId}`
  }
  return `${origin}${normalizedBase}order-status/${orderId}`
}

export function normalizeWhatsAppPhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }
  return `55${digits}`
}

export interface OperatorWhatsAppMessageParams {
  customerPhone?: string | null
  customerName?: string | null
  storeName?: string | null
  storeSlug?: string | null
  orderId: string
  orderNumber: string
  status: OrderStatus
  statusLabel: string
  totalAmount?: number
  cancellationReason?: string | null
}

export function buildOperatorToCustomerWhatsAppText(
  params: OperatorWhatsAppMessageParams
): string {
  const trackingUrl = buildOrderTrackingUrl(params.orderId, params.storeSlug)
  const greetingName =
    params.customerName &&
    params.customerName !== 'Cliente Genérico' &&
    params.customerName !== 'Consumidor Final'
      ? `Olá, *${params.customerName}*!`
      : 'Olá!'

  const storeHeader = params.storeName ? `*${params.storeName}*` : '*Atualização do Seu Pedido*'

  const statusLine =
    params.status === 'COMPLETED'
      ? `✅ Seu pedido *#${params.orderNumber}* foi *${params.statusLabel}*!`
      : params.status === 'DELIVERED'
      ? `🚚 Seu pedido *#${params.orderNumber}* está com status: *${params.statusLabel}*!`
      : params.status === 'CANCELLED'
      ? `⚠️ Seu pedido *#${params.orderNumber}* está com status: *${params.statusLabel}*${
          params.cancellationReason ? ` (Motivo: ${params.cancellationReason})` : ''
        }.`
      : `📦 O status do seu pedido *#${params.orderNumber}* foi atualizado para: *${params.statusLabel}*`

  const totalLine =
    typeof params.totalAmount === 'number'
      ? `\n💰 *Valor Total:* ${formatCurrency(params.totalAmount)}`
      : ''

  const trackingSection =
    params.status === 'COMPLETED'
      ? `\n\n🔗 *Resumo do pedido finalizado:*\n${trackingUrl}\n\nAgradecemos a preferência!`
      : params.status === 'CANCELLED'
      ? `\n\n🔗 *Detalhes do pedido:*\n${trackingUrl}`
      : `\n\n🔴 *Acompanhe seu pedido em tempo real até ficar Finalizado:*\n${trackingUrl}`

  return `${storeHeader}\n\n${greetingName}\n${statusLine}${totalLine}${trackingSection}`
}

export function buildOperatorToCustomerWhatsAppUrl(
  params: OperatorWhatsAppMessageParams
): string {
  const normalizedPhone = normalizeWhatsAppPhone(params.customerPhone)
  const text = encodeURIComponent(buildOperatorToCustomerWhatsAppText(params))
  if (normalizedPhone) {
    return `https://wa.me/${normalizedPhone}?text=${text}`
  }
  return `https://wa.me/?text=${text}`
}

export interface StoredCustomerPublicOrder {
  id: string
  orderNumber: string
  storeSlug: string
  storeName: string
  totalAmount: number
  createdAt: string
}

export function saveCustomerPublicOrderHistory(entry: StoredCustomerPublicOrder): void {
  if (typeof window === 'undefined' || !entry.storeSlug) return
  try {
    const key = `${LOCAL_STORAGE_CUSTOMER_ORDERS_PREFIX}${entry.storeSlug}`
    const existingRaw = window.localStorage.getItem(key)
    const existing: StoredCustomerPublicOrder[] = existingRaw ? JSON.parse(existingRaw) : []
    const filtered = existing.filter((o) => o.id !== entry.id)
    const updated = [entry, ...filtered].slice(0, 10)
    window.localStorage.setItem(key, JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
}

export function getCustomerPublicOrderHistory(storeSlug?: string | null): StoredCustomerPublicOrder[] {
  if (typeof window === 'undefined' || !storeSlug) return []
  try {
    const key = `${LOCAL_STORAGE_CUSTOMER_ORDERS_PREFIX}${storeSlug}`
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const LOCAL_STORAGE_ORDER_HISTORY_PREFIX = 'olivelas_order_status_history_'

export function recordLocalOrderStatusHistory(entry: OrderStatusHistoryEntry): void {
  if (typeof window === 'undefined' || !entry.orderId) return
  try {
    const key = `${LOCAL_STORAGE_ORDER_HISTORY_PREFIX}${entry.orderId}`
    const raw = window.localStorage.getItem(key)
    const existing: OrderStatusHistoryEntry[] = raw ? JSON.parse(raw) : []
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, 50)
    window.localStorage.setItem(key, JSON.stringify(updated))
  } catch {
    // ignore storage errors
  }
}

export function getLocalOrderStatusHistory(orderId?: string | null): OrderStatusHistoryEntry[] {
  if (typeof window === 'undefined' || !orderId) return []
  try {
    const key = `${LOCAL_STORAGE_ORDER_HISTORY_PREFIX}${orderId}`
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
