import type { OrderStatus } from '@/types/database.types'
import type { OrderStatusHistoryEntry } from '@/types/order.types'
import type { OrderStatusAliasesMap, WhatsAppOrderTemplateItem } from '@/types/store.types'
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

export const DEFAULT_PUBLIC_WHATSAPP_ORDER_TEMPLATE = `*NOVO PEDIDO ONLINE #{{numero_pedido}}*
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

export interface WhatsAppTemplateTagDefinition {
  tag: string
  label: string
  description: string
  category: 'carrinho' | 'cliente' | 'pedido'
  example: string
}

export const PUBLIC_WHATSAPP_TEMPLATE_TAGS: WhatsAppTemplateTagDefinition[] = [
  {
    tag: '{{produtos}}',
    label: 'Produtos + Qtd + Preços',
    description: 'Lista completa dos produtos do carrinho com quantidade/peso e valor de cada linha.',
    category: 'carrinho',
    example: '• 2x Tomate Italiano - R$ 15,80\n• Maçã Gala (500g) - R$ 6,45 (R$ 12,90/kg)',
  },
  {
    tag: '{{precos}}',
    label: 'Detalhamento de Preços',
    description: 'Tabela detalhada com preço unitário/kg e subtotal de cada item do carrinho.',
    category: 'carrinho',
    example: '• Tomate Italiano: 2 × R$ 7,90 = R$ 15,80\n• Maçã Gala: 500g × R$ 12,90/kg = R$ 6,45',
  },
  {
    tag: '{{produtos_simples}}',
    label: 'Produtos (Sem Preços)',
    description: 'Lista apenas com o nome e a quantidade/peso de cada produto.',
    category: 'carrinho',
    example: '• 2x Tomate Italiano\n• Maçã Gala (500g)',
  },
  {
    tag: '{{total}}',
    label: 'Valor Total',
    description: 'Valor total final do carrinho formatado em Reais (R$).',
    category: 'carrinho',
    example: 'R$ 22,25',
  },
  {
    tag: '{{subtotal}}',
    label: 'Subtotal',
    description: 'Soma dos itens do carrinho antes de descontos ou taxas.',
    category: 'carrinho',
    example: 'R$ 22,25',
  },
  {
    tag: '{{quantidade_itens}}',
    label: 'Qtd. de Itens',
    description: 'Quantidade de produtos distintos no carrinho.',
    category: 'carrinho',
    example: '2 itens',
  },
  {
    tag: '{{observacoes}}',
    label: 'Observações do Pedido',
    description: 'Observações digitadas pelo cliente no carrinho público antes de enviar.',
    category: 'cliente',
    example: 'Escolher tomates mais maduros, troco para R$ 50,00',
  },
  {
    tag: '{{nome_cliente}}',
    label: 'Nome do Cliente',
    description: 'Nome informado pelo cliente no carrinho.',
    category: 'cliente',
    example: 'Maria Oliveira',
  },
  {
    tag: '{{telefone_cliente}}',
    label: 'WhatsApp do Cliente',
    description: 'Telefone/WhatsApp informado pelo cliente.',
    category: 'cliente',
    example: '(11) 99876-5432',
  },
  {
    tag: '{{endereco_cliente}}',
    label: 'Endereço / Retirada',
    description: 'Endereço de entrega preenchido ou indicação de retirada na loja.',
    category: 'cliente',
    example: 'Rua das Palmeiras, 120 - Centro',
  },
  {
    tag: '{{forma_pagamento}}',
    label: 'Forma de Pagamento',
    description: 'Meio de pagamento selecionado (PIX, Cartão ou Dinheiro).',
    category: 'pedido',
    example: 'PIX',
  },
  {
    tag: '{{numero_pedido}}',
    label: 'Nº do Pedido',
    description: 'Código único do pedido gerado na plataforma.',
    category: 'pedido',
    example: 'PED-849201',
  },
  {
    tag: '{{link_rastreio}}',
    label: 'Link Status Tempo Real',
    description: 'URL exclusiva para o cliente acompanhar o status do pedido em tempo real.',
    category: 'pedido',
    example: 'https://pycriador.github.io/olivelas-gestao-estoque/store/gnz-hortifruti/order/...',
  },
  {
    tag: '{{nome_loja}}',
    label: 'Nome da Loja',
    description: 'Nome oficial da loja ou filial.',
    category: 'pedido',
    example: 'GNZ Hortifruti',
  },
  {
    tag: '{{data_hora}}',
    label: 'Data e Hora',
    description: 'Data e horário em que o pedido foi enviado.',
    category: 'pedido',
    example: '11/11/2026 21:05',
  },
]

export const DEFAULT_WHATSAPP_TEMPLATE_PRESETS: WhatsAppOrderTemplateItem[] = [
  {
    id: 'tpl-complete-default',
    name: 'Modelo Completo (Produtos + Preços + Rastreio)',
    description: 'Inclui todos os itens, tabela de preços, observações do cliente e link em tempo real.',
    content: DEFAULT_PUBLIC_WHATSAPP_ORDER_TEMPLATE,
    isPinned: true,
    updatedAt: '2026-11-11T00:00:00.000Z',
  },
  {
    id: 'tpl-compact-delivery',
    name: 'Modelo Compacto & Direto (Delivery Rápido)',
    description: 'Formato enxuto ideal para atendimento ágil no WhatsApp.',
    content: `🛒 *PEDIDO #{{numero_pedido}} — {{nome_loja}}*

👤 *Cliente:* {{nome_cliente}} ({{telefone_cliente}})
📍 *Entrega:* {{endereco_cliente}}
💳 *Pagamento:* {{forma_pagamento}}
📝 *Obs:* {{observacoes}}

📦 *Itens ({{quantidade_itens}}):*
{{produtos}}

💰 *TOTAL: {{total}}*

🔴 *Acompanhe seu pedido em tempo real:*
{{link_rastreio}}`,
    isPinned: false,
    updatedAt: '2026-11-11T00:00:00.000Z',
  },
  {
    id: 'tpl-pickup-separation',
    name: 'Modelo Foco em Separação & Pesagem',
    description: 'Destaca a lista de produtos e o detalhamento de preços por KG/unidade.',
    content: `*{{nome_loja}} — Pedido Online #{{numero_pedido}}*
📅 {{data_hora}}

*Itens para Separação ({{quantidade_itens}}):*
{{produtos_simples}}

*Conferência de Preços:*
{{precos}}

*Observações do Cliente:*
{{observacoes}}

*Cliente:* {{nome_cliente}} | *Tel:* {{telefone_cliente}}
*Endereço / Retirada:* {{endereco_cliente}}
*Pagamento:* {{forma_pagamento}} | *Total:* {{total}}

🔗 *Status ao vivo:* {{link_rastreio}}`,
    isPinned: false,
    updatedAt: '2026-11-11T00:00:00.000Z',
  },
]

const LOCAL_STORAGE_WA_TEMPLATE_PREFIX = 'olivelas_whatsapp_order_template_'
const LOCAL_STORAGE_WA_TEMPLATES_LIST_PREFIX = 'olivelas_whatsapp_templates_list_'

export function saveLocalWhatsAppOrderTemplate(
  storeId: string | null | undefined,
  storeSlug: string | null | undefined,
  template: string
): void {
  if (typeof window === 'undefined') return
  try {
    if (storeId) {
      window.localStorage.setItem(`${LOCAL_STORAGE_WA_TEMPLATE_PREFIX}${storeId}`, template)
    }
    if (storeSlug) {
      window.localStorage.setItem(`${LOCAL_STORAGE_WA_TEMPLATE_PREFIX}slug_${storeSlug}`, template)
    }
  } catch {
    // ignore storage errors
  }
}

export function saveLocalStoreWhatsAppTemplates(
  storeId: string | null | undefined,
  storeSlug: string | null | undefined,
  templates: WhatsAppOrderTemplateItem[],
  pinnedTemplateId: string
): void {
  if (typeof window === 'undefined') return
  try {
    const payload = JSON.stringify({ templates, pinnedTemplateId })
    if (storeId) {
      window.localStorage.setItem(`${LOCAL_STORAGE_WA_TEMPLATES_LIST_PREFIX}${storeId}`, payload)
    }
    if (storeSlug) {
      window.localStorage.setItem(
        `${LOCAL_STORAGE_WA_TEMPLATES_LIST_PREFIX}slug_${storeSlug}`,
        payload
      )
    }
    const pinned = templates.find((t) => t.id === pinnedTemplateId) || templates[0]
    if (pinned?.content) {
      saveLocalWhatsAppOrderTemplate(storeId, storeSlug, pinned.content)
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoreWhatsAppTemplates(
  themeConfig?: unknown,
  storeId?: string | null,
  storeSlug?: string | null
): {
  templates: WhatsAppOrderTemplateItem[]
  pinnedTemplateId: string
} {
  const rec =
    themeConfig && typeof themeConfig === 'object' && !Array.isArray(themeConfig)
      ? (themeConfig as Record<string, unknown>)
      : {}

  // 1. Tenta ler da lista de templates salva no theme_config do banco
  if (Array.isArray(rec.whatsappOrderTemplates) && rec.whatsappOrderTemplates.length > 0) {
    const validList = (rec.whatsappOrderTemplates as WhatsAppOrderTemplateItem[]).filter(
      (item) => item && typeof item.id === 'string' && typeof item.content === 'string'
    )
    if (validList.length > 0) {
      const configuredPin =
        typeof rec.pinnedWhatsappTemplateId === 'string' ? rec.pinnedWhatsappTemplateId : ''
      const pinnedItem =
        validList.find((t) => t.id === configuredPin) ||
        validList.find((t) => t.isPinned) ||
        validList[0]
      return {
        templates: validList.map((t) => ({
          ...t,
          isPinned: t.id === pinnedItem.id,
        })),
        pinnedTemplateId: pinnedItem.id,
      }
    }
  }

  // 2. Fallback no localStorage
  if (typeof window !== 'undefined') {
    try {
      const rawById = storeId
        ? window.localStorage.getItem(`${LOCAL_STORAGE_WA_TEMPLATES_LIST_PREFIX}${storeId}`)
        : null
      const rawBySlug =
        !rawById && storeSlug
          ? window.localStorage.getItem(`${LOCAL_STORAGE_WA_TEMPLATES_LIST_PREFIX}slug_${storeSlug}`)
          : null
      const raw = rawById || rawBySlug
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && Array.isArray(parsed.templates) && parsed.templates.length > 0) {
          const pinnedItem =
            parsed.templates.find((t: WhatsAppOrderTemplateItem) => t.id === parsed.pinnedTemplateId) ||
            parsed.templates.find((t: WhatsAppOrderTemplateItem) => t.isPinned) ||
            parsed.templates[0]
          return {
            templates: parsed.templates.map((t: WhatsAppOrderTemplateItem) => ({
              ...t,
              isPinned: t.id === pinnedItem.id,
            })),
            pinnedTemplateId: pinnedItem.id,
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  // 3. Se havia uma mensagem customizada única anterior em whatsappOrderMessage, preserva como 1º template
  const legacyMessage =
    typeof rec.whatsappOrderMessage === 'string' && rec.whatsappOrderMessage.trim()
      ? rec.whatsappOrderMessage
      : null

  const initialPresets = DEFAULT_WHATSAPP_TEMPLATE_PRESETS.map((preset, idx) =>
    idx === 0 && legacyMessage
      ? {
          ...preset,
          content: legacyMessage,
          isPinned: true,
        }
      : { ...preset }
  )

  return {
    templates: initialPresets,
    pinnedTemplateId: initialPresets[0].id,
  }
}

export function getResolvedWhatsAppOrderTemplate(
  themeConfig?: unknown,
  storeId?: string | null,
  storeSlug?: string | null
): string {
  const { templates, pinnedTemplateId } = getStoreWhatsAppTemplates(
    themeConfig,
    storeId,
    storeSlug
  )
  const pinned = templates.find((t) => t.id === pinnedTemplateId) || templates[0]
  if (pinned && pinned.content.trim().length > 0) {
    return pinned.content
  }

  if (themeConfig && typeof themeConfig === 'object' && !Array.isArray(themeConfig)) {
    const configured = (themeConfig as Record<string, unknown>).whatsappOrderMessage
    if (typeof configured === 'string' && configured.trim().length > 0) {
      return configured
    }
  }
  return DEFAULT_PUBLIC_WHATSAPP_ORDER_TEMPLATE
}

export interface PublicCartWhatsAppFormatParams {
  template?: string | null
  orderNumber: string
  storeName: string
  customerName: string
  customerPhone: string
  customerAddress?: string | null
  paymentMethod: string
  notes?: string | null
  trackingUrl: string
  totalAmount: number
  subtotalAmount?: number
  createdAt?: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    isWeighed?: boolean
    weightLabel?: string
  }>
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito/Débito',
  DEBIT_CARD: 'Cartão de Débito',
  CASH: 'Dinheiro',
}

export function formatPublicCatalogWhatsAppMessage(
  params: PublicCartWhatsAppFormatParams
): string {
  const activeTemplate =
    params.template && params.template.trim().length > 0
      ? params.template
      : DEFAULT_PUBLIC_WHATSAPP_ORDER_TEMPLATE

  const produtosText = params.items
    .map((i) => {
      const lineTotal = i.quantity * i.unitPrice
      if (i.isWeighed) {
        const wLabel = i.weightLabel || `${i.quantity} kg`
        return `• ${i.name} (${wLabel}) - ${formatCurrency(lineTotal)} (${formatCurrency(
          i.unitPrice
        )}/kg)`
      }
      return `• ${i.quantity}x ${i.name} - ${formatCurrency(lineTotal)}`
    })
    .join('\n')

  const precosText = params.items
    .map((i) => {
      const lineTotal = i.quantity * i.unitPrice
      if (i.isWeighed) {
        const wLabel = i.weightLabel || `${i.quantity} kg`
        return `• ${i.name}: ${wLabel} × ${formatCurrency(i.unitPrice)}/kg = ${formatCurrency(
          lineTotal
        )}`
      }
      return `• ${i.name}: ${i.quantity} un × ${formatCurrency(i.unitPrice)} = ${formatCurrency(
        lineTotal
      )}`
    })
    .join('\n')

  const produtosSimplesText = params.items
    .map((i) => {
      if (i.isWeighed) {
        const wLabel = i.weightLabel || `${i.quantity} kg`
        return `• ${i.name} (${wLabel})`
      }
      return `• ${i.quantity}x ${i.name}`
    })
    .join('\n')

  const totalFormatted = formatCurrency(params.totalAmount)
  const subtotalFormatted = formatCurrency(params.subtotalAmount ?? params.totalAmount)
  const itemCountLabel = `${params.items.length} ${
    params.items.length === 1 ? 'item' : 'itens'
  }`
  const notesValue = params.notes?.trim() ? params.notes.trim() : 'Sem observações'
  const addressValue = params.customerAddress?.trim()
    ? params.customerAddress.trim()
    : 'Retirada na loja / A combinar'
  const paymentLabel = PAYMENT_METHOD_LABELS[params.paymentMethod] || params.paymentMethod
  const dateObj = params.createdAt ? new Date(params.createdAt) : new Date()
  const dateTimeFormatted = dateObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const replacements: Record<string, string> = {
    produtos: produtosText,
    itens_pedido: produtosText,
    itens: produtosText,
    precos: precosText,
    tabela_precos: precosText,
    produtos_simples: produtosSimplesText,
    total: totalFormatted,
    valor_total: totalFormatted,
    subtotal: subtotalFormatted,
    quantidade_itens: itemCountLabel,
    qtd_itens: String(params.items.length),
    observacoes: notesValue,
    obs: notesValue,
    nome_cliente: params.customerName.trim() || 'Cliente',
    cliente: params.customerName.trim() || 'Cliente',
    telefone_cliente: params.customerPhone.trim() || 'Não informado',
    whatsapp_cliente: params.customerPhone.trim() || 'Não informado',
    endereco_cliente: addressValue,
    endereco: addressValue,
    forma_pagamento: paymentLabel,
    pagamento: paymentLabel,
    numero_pedido: params.orderNumber,
    pedido: params.orderNumber,
    link_rastreio: params.trackingUrl,
    url_rastreio: params.trackingUrl,
    nome_loja: params.storeName,
    loja: params.storeName,
    data_hora: dateTimeFormatted,
  }

  return activeTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (fullMatch, rawKey) => {
    const key = String(rawKey).toLowerCase()
    return Object.prototype.hasOwnProperty.call(replacements, key)
      ? replacements[key]
      : fullMatch
  })
}
