import type {
  PortalOrderStatus,
  PortalProduct,
  PortalStoreThemeConfig,
  PortalStoredOrderHistoryItem,
} from '../types/portal.types'

export const DEFAULT_PORTAL_STATUS_LABELS: Record<PortalOrderStatus, string> = {
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

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  CASH: 'Dinheiro',
}

export const DEFAULT_PORTAL_WHATSAPP_TEMPLATE = `*NOVO PEDIDO ONLINE #{{numero_pedido}}*
*Loja:* {{nome_loja}}
*Data/Hora:* {{data_hora}}

*Cliente:* {{nome_cliente}}
*WhatsApp:* {{telefone_cliente}}
*Endereço:* {{endereco_cliente}}
*Pagamento:* {{forma_pagamento}}
*Observações:* {{observacoes}}

*Itens do Pedido ({{quantidade_itens}}):*
{{produtos}}

*Resumo de Preços:*
{{precos}}

*TOTAL DO PEDIDO: {{total}}*

🔗 *Acompanhar status em tempo real:*
{{link_rastreio}}`

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function isWeighedProduct(product: Pick<PortalProduct, 'unit'>): boolean {
  return (product.unit || '').trim().toUpperCase() === 'KG'
}

export function formatProductWeight(qtyInKg: number): string {
  const numeric = Number(qtyInKg || 0)
  if (numeric < 1) {
    const grams = Math.round(numeric * 1000)
    return `${grams}g`
  }
  return `${numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  })} kg`
}

export function normalizeWhatsAppPhone(phone?: string | null): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return `55${digits}`
}

export function getPortalStatusLabels(
  themeConfig?: PortalStoreThemeConfig | null
): Record<PortalOrderStatus, string> {
  const resolved: Record<PortalOrderStatus, string> = {
    ...DEFAULT_PORTAL_STATUS_LABELS,
  }
  const aliases = themeConfig?.orderStatusAliases
  if (aliases && typeof aliases === 'object') {
    ;(Object.keys(DEFAULT_PORTAL_STATUS_LABELS) as PortalOrderStatus[]).forEach((key) => {
      const custom = aliases[key]?.trim()
      if (custom) {
        resolved[key] = custom
      }
    })
  }
  return resolved
}

export function getResolvedWhatsAppTemplate(
  themeConfig?: PortalStoreThemeConfig | null
): string {
  if (themeConfig?.whatsappOrderTemplates && Array.isArray(themeConfig.whatsappOrderTemplates)) {
    const list = themeConfig.whatsappOrderTemplates
    const pinned =
      list.find((t) => t.id === themeConfig.pinnedWhatsappTemplateId) ||
      list.find((t) => t.isPinned) ||
      list[0]
    if (pinned?.content?.trim()) {
      return pinned.content
    }
  }
  if (themeConfig?.whatsappOrderMessage?.trim()) {
    return themeConfig.whatsappOrderMessage
  }
  return DEFAULT_PORTAL_WHATSAPP_TEMPLATE
}

export function buildPortalOrderTrackingUrl(orderId: string): string {
  if (typeof window === 'undefined') return `#/order/${orderId}`
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/order/${orderId}`
}

export function formatPortalWhatsAppOrderMessage(params: {
  template?: string
  orderNumber: string
  storeName: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  paymentMethod: string
  notes?: string
  trackingUrl: string
  totalAmount: number
  createdAt?: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    isWeighed: boolean
    weightLabel?: string
  }>
}): string {
  const template = params.template?.trim() || DEFAULT_PORTAL_WHATSAPP_TEMPLATE

  const produtos = params.items
    .map((item) => {
      const lineTotal = item.quantity * item.unitPrice
      if (item.isWeighed) {
        const w = item.weightLabel || formatProductWeight(item.quantity)
        return `• ${item.name} (${w}) - ${formatCurrency(lineTotal)} (${formatCurrency(
          item.unitPrice
        )}/kg)`
      }
      return `• ${item.quantity}x ${item.name} - ${formatCurrency(lineTotal)}`
    })
    .join('\n')

  const precos = params.items
    .map((item) => {
      const lineTotal = item.quantity * item.unitPrice
      if (item.isWeighed) {
        const w = item.weightLabel || formatProductWeight(item.quantity)
        return `• ${item.name}: ${w} × ${formatCurrency(item.unitPrice)}/kg = ${formatCurrency(
          lineTotal
        )}`
      }
      return `• ${item.name}: ${item.quantity} un × ${formatCurrency(
        item.unitPrice
      )} = ${formatCurrency(lineTotal)}`
    })
    .join('\n')

  const produtosSimples = params.items
    .map((item) => {
      if (item.isWeighed) {
        const w = item.weightLabel || formatProductWeight(item.quantity)
        return `• ${item.name} (${w})`
      }
      return `• ${item.quantity}x ${item.name}`
    })
    .join('\n')

  const totalFormatted = formatCurrency(params.totalAmount)
  const dateFormatted = formatDateTime(params.createdAt || new Date().toISOString())
  const paymentLabel = PAYMENT_METHOD_LABELS[params.paymentMethod] || params.paymentMethod

  const replacements: Record<string, string> = {
    '{{produtos}}': produtos,
    '{{precos}}': precos,
    '{{produtos_simples}}': produtosSimples,
    '{{total}}': totalFormatted,
    '{{subtotal}}': totalFormatted,
    '{{quantidade_itens}}': `${params.items.length} ${
      params.items.length === 1 ? 'item' : 'itens'
    }`,
    '{{observacoes}}': params.notes?.trim() || 'Nenhuma observação',
    '{{nome_cliente}}': params.customerName.trim(),
    '{{telefone_cliente}}': params.customerPhone.trim(),
    '{{endereco_cliente}}': params.customerAddress?.trim() || 'Retirada na loja / A combinar',
    '{{forma_pagamento}}': paymentLabel,
    '{{numero_pedido}}': params.orderNumber,
    '{{link_rastreio}}': params.trackingUrl,
    '{{nome_loja}}': params.storeName,
    '{{data_hora}}': dateFormatted,
  }

  let output = template
  Object.entries(replacements).forEach(([tag, val]) => {
    output = output.split(tag).join(val)
  })
  return output
}

const HISTORY_KEY_PREFIX = 'olivelas_spa_portal_orders_'

export function savePortalOrderHistory(entry: PortalStoredOrderHistoryItem): void {
  if (typeof window === 'undefined' || !entry.storeId) return
  try {
    const key = `${HISTORY_KEY_PREFIX}${entry.storeId}`
    const raw = window.localStorage.getItem(key)
    const list: PortalStoredOrderHistoryItem[] = raw ? JSON.parse(raw) : []
    const next = [entry, ...list.filter((i) => i.id !== entry.id)].slice(0, 10)
    window.localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
}

export function getPortalOrderHistory(storeId: string): PortalStoredOrderHistoryItem[] {
  if (typeof window === 'undefined' || !storeId) return []
  try {
    const key = `${HISTORY_KEY_PREFIX}${storeId}`
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
