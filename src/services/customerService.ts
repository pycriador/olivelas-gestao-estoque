import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import type {
  Customer,
  CustomerOrderItemDetail,
  CustomerOrderPaymentDetail,
  CustomerOrderSummary,
} from '@/types/customer.types'
import type { OrderStatus } from '@/types/database.types'

export interface CustomerListParams {
  search?: string
  status?: string // 'ALL' | 'ACTIVE' | 'INACTIVE' | comma-separated 'ACTIVE,INACTIVE'
  customerStatuses?: ('ACTIVE' | 'INACTIVE')[]
  orderStatuses?: OrderStatus[]
  channels?: string[]
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
  onlyWithOrders?: boolean
  customerId?: string
  orderId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'DRAFT',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
]

function mapRawOrderToSummary(raw: any, fallbackCustomerName?: string): CustomerOrderSummary {
  const rawItems = (raw.order_items || []) as any[]
  const items: CustomerOrderItemDetail[] = rawItems.map((it: any) => {
    const prod = Array.isArray(it.products) ? it.products[0] : it.products
    return {
      id: it.id,
      order_id: raw.id,
      product_id: it.product_id,
      product_name: prod?.name || it.product_name || 'Produto',
      product_sku: prod?.sku || it.product_sku || '-',
      unit: prod?.unit || 'UN',
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
      discount: Number(it.discount) || 0,
      total_price: Number(it.total_price) || 0,
    }
  })

  const rawPayments = (raw.payments || []) as any[]
  const payments: CustomerOrderPaymentDetail[] = rawPayments.map((p: any) => ({
    id: p.id,
    method: p.method,
    amount: Number(p.amount) || 0,
    status: p.status,
    created_at: p.created_at,
  }))

  const custObj = Array.isArray(raw.customers) ? raw.customers[0] : raw.customers

  return {
    id: raw.id,
    store_id: raw.store_id,
    customer_id: raw.customer_id || null,
    customer_name: custObj?.name || fallbackCustomerName || 'Consumidor Final',
    order_number: raw.order_number,
    channel: raw.channel,
    status: raw.status,
    subtotal: Number(raw.subtotal) || 0,
    discount_amount: Number(raw.discount_amount) || 0,
    shipping_amount: Number(raw.shipping_amount) || 0,
    total_amount: Number(raw.total_amount) || 0,
    notes: raw.notes || null,
    cancellation_reason: raw.cancellation_reason || null,
    created_at: raw.created_at,
    updated_at: raw.updated_at || raw.created_at,
    items,
    payments,
  }
}

export const customerService = {
  async listCustomers(
    storeId: string,
    params: CustomerListParams = {}
  ): Promise<{
    data: Customer[]
    allFiltered: Customer[]
    total: number
    summary: {
      totalCustomers: number
      totalOrdersInView: number
      openOrdersCount: number
      closedOrdersCount: number
      cancelledOrdersCount: number
      totalRevenueInView: number
    }
  }> {
    const {
      search,
      status,
      customerStatuses,
      orderStatuses = [],
      channels = [],
      dateFrom,
      dateTo,
      onlyWithOrders = false,
      customerId,
      orderId,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 20,
    } = params

    const isSpecificStore = Boolean(storeId && storeId !== 'all')

    // Resolve effective customer statuses array
    let effectiveCustomerStatuses: ('ACTIVE' | 'INACTIVE')[] = []
    if (customerStatuses && customerStatuses.length > 0) {
      effectiveCustomerStatuses = customerStatuses
    } else if (status && status !== 'ALL') {
      effectiveCustomerStatuses = status
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is 'ACTIVE' | 'INACTIVE' => s === 'ACTIVE' || s === 'INACTIVE')
    }

    // 1. Fetch customers for the store
    let custQuery = supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)

    if (isSpecificStore) {
      custQuery = custQuery.eq('store_id', storeId)
    }

    if (effectiveCustomerStatuses.length === 1) {
      custQuery = custQuery.eq('status', effectiveCustomerStatuses[0])
    } else if (effectiveCustomerStatuses.length > 1) {
      custQuery = custQuery.in('status', effectiveCustomerStatuses)
    }

    const { data: rawCustomers, error: custError } = await custQuery
    if (custError) throw custError

    // 2. Fetch orders with items and payments for the store
    let ordersQuery = supabase
      .from('orders')
      .select(`
        id,
        store_id,
        customer_id,
        order_number,
        channel,
        status,
        subtotal,
        discount_amount,
        shipping_amount,
        total_amount,
        notes,
        cancellation_reason,
        created_at,
        updated_at,
        customers ( id, name ),
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          discount,
          total_price,
          products ( name, sku, unit )
        ),
        payments (
          id,
          method,
          amount,
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (isSpecificStore) {
      ordersQuery = ordersQuery.eq('store_id', storeId)
    }

    const { data: rawOrders, error: ordError } = await ordersQuery
    if (ordError) throw ordError

    // Group orders by customer_id
    const ordersByCustomerId = new Map<string, CustomerOrderSummary[]>()
    const unlinkedOrders: CustomerOrderSummary[] = []

    for (const ro of (rawOrders || []) as any[]) {
      const mappedOrder = mapRawOrderToSummary(ro)
      if (ro.customer_id) {
        const list = ordersByCustomerId.get(ro.customer_id) || []
        list.push(mappedOrder)
        ordersByCustomerId.set(ro.customer_id, list)
      } else {
        unlinkedOrders.push(mappedOrder)
      }
    }

    const customerListRaw = [...((rawCustomers || []) as Customer[])]

    // Attach unlinked orders to existing generic customer or a virtual entry if needed
    if (unlinkedOrders.length > 0) {
      const genericCustomer = customerListRaw.find(
        (c) =>
          c.name.toLowerCase().includes('cliente genérico') ||
          c.name.toLowerCase().includes('consumidor final')
      )
      if (genericCustomer) {
        const existing = ordersByCustomerId.get(genericCustomer.id) || []
        ordersByCustomerId.set(genericCustomer.id, [...existing, ...unlinkedOrders])
      }
    }

    const fromTimestamp = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTimestamp = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null
    const cleanOrderStatuses = (orderStatuses || []).filter(Boolean)
    const cleanChannels = (channels || []).filter((c) => c && c !== 'ALL')
    const targetOrderTerm = orderId ? orderId.trim().toLowerCase() : ''
    const targetCustomerId = customerId ? customerId.trim() : ''
    const q = search ? search.trim().toLowerCase() : ''

    let totalOrdersInView = 0
    let openOrdersCountGlobal = 0
    let closedOrdersCountGlobal = 0
    let cancelledOrdersCountGlobal = 0
    let totalRevenueInView = 0

    // Enrich and filter customers
    const enrichedCustomers: Customer[] = []

    for (const c of customerListRaw) {
      const allOrders = (ordersByCustomerId.get(c.id) || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Filter orders of this customer according to orderStatuses, date range, channel, orderId
      const matchingOrders = allOrders.filter((ord) => {
        if (cleanOrderStatuses.length > 0 && !cleanOrderStatuses.includes(ord.status)) {
          return false
        }
        if (cleanChannels.length > 0 && !cleanChannels.includes(ord.channel)) {
          return false
        }
        if (fromTimestamp !== null) {
          const t = new Date(ord.created_at).getTime()
          if (t < fromTimestamp) return false
        }
        if (toTimestamp !== null) {
          const t = new Date(ord.created_at).getTime()
          if (t > toTimestamp) return false
        }
        if (targetOrderTerm) {
          const matchesId = ord.id.toLowerCase() === targetOrderTerm
          const matchesNumber = ord.order_number.toLowerCase().includes(targetOrderTerm)
          if (!matchesId && !matchesNumber) return false
        }
        return true
      })

      // Customer-level URL filter (`?customerId=...`)
      if (targetCustomerId && c.id !== targetCustomerId) {
        continue
      }

      // Order-level URL filter (`?orderId=...`)
      if (targetOrderTerm && matchingOrders.length === 0) {
        continue
      }

      // If filtering by specific order statuses, date range, or onlyWithOrders, require at least 1 matching order
      const hasOrderLevelFilter =
        onlyWithOrders ||
        cleanOrderStatuses.length > 0 ||
        cleanChannels.length > 0 ||
        fromTimestamp !== null ||
        toTimestamp !== null

      if (hasOrderLevelFilter && matchingOrders.length === 0) {
        continue
      }

      // Search filter (matches customer fields OR order number OR product name/SKU inside orders)
      if (q) {
        const matchesCustomer =
          c.name.toLowerCase().includes(q) ||
          (c.document && c.document.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.whatsapp && c.whatsapp.toLowerCase().includes(q))

        const ordersMatchingSearch = matchingOrders.filter(
          (o) =>
            o.order_number.toLowerCase().includes(q) ||
            o.items.some(
              (it) =>
                it.product_name.toLowerCase().includes(q) ||
                it.product_sku.toLowerCase().includes(q)
            )
        )

        if (!matchesCustomer && ordersMatchingSearch.length === 0) {
          continue
        }
      }

      const openCount = matchingOrders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status)).length
      const closedCount = matchingOrders.filter((o) => o.status === 'DELIVERED').length
      const cancelledCount = matchingOrders.filter((o) => o.status === 'CANCELLED').length
      const validOrdersForSpend = matchingOrders.filter((o) => o.status !== 'CANCELLED')
      const totalSpent = validOrdersForSpend.reduce((acc, o) => acc + o.total_amount, 0)
      const averageTicket =
        validOrdersForSpend.length > 0 ? totalSpent / validOrdersForSpend.length : 0

      totalOrdersInView += matchingOrders.length
      openOrdersCountGlobal += openCount
      closedOrdersCountGlobal += closedCount
      cancelledOrdersCountGlobal += cancelledCount
      totalRevenueInView += totalSpent

      enrichedCustomers.push({
        ...c,
        orders: allOrders,
        filtered_orders: matchingOrders,
        total_orders: matchingOrders.length,
        open_orders_count: openCount,
        closed_orders_count: closedCount,
        cancelled_orders_count: cancelledCount,
        total_spent: Number(totalSpent.toFixed(2)),
        average_ticket: Number(averageTicket.toFixed(2)),
        last_order_at: matchingOrders[0]?.created_at || allOrders[0]?.created_at || null,
      })
    }

    // Sort customers
    enrichedCustomers.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1
      if (sortBy === 'total_spent') {
        return ((a.total_spent || 0) - (b.total_spent || 0)) * dir
      }
      if (sortBy === 'total_orders') {
        return ((a.total_orders || 0) - (b.total_orders || 0)) * dir
      }
      if (sortBy === 'last_order_at') {
        const tA = a.last_order_at ? new Date(a.last_order_at).getTime() : 0
        const tB = b.last_order_at ? new Date(b.last_order_at).getTime() : 0
        return (tA - tB) * dir
      }
      if (sortBy === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status) * dir
      }
      return a.name.localeCompare(b.name) * dir
    })

    const total = enrichedCustomers.length
    const fromIdx = (page - 1) * pageSize
    const pagedData = enrichedCustomers.slice(fromIdx, fromIdx + pageSize)

    return {
      data: pagedData,
      allFiltered: enrichedCustomers,
      total,
      summary: {
        totalCustomers: total,
        totalOrdersInView,
        openOrdersCount: openOrdersCountGlobal,
        closedOrdersCount: closedOrdersCountGlobal,
        cancelledOrdersCount: cancelledOrdersCountGlobal,
        totalRevenueInView: Number(totalRevenueInView.toFixed(2)),
      },
    }
  },

  /**
   * Busca um pedido específico com todos os seus itens e pagamentos para exibição direta via URL (`?orderId=...`)
   */
  async getOrderDetailsByIdOrNumber(
    storeId: string,
    orderIdOrNumber: string
  ): Promise<CustomerOrderSummary | null> {
    if (!orderIdOrNumber) return null
    const isSpecificStore = Boolean(storeId && storeId !== 'all')
    const term = orderIdOrNumber.trim()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)

    let query = supabase
      .from('orders')
      .select(`
        id,
        store_id,
        customer_id,
        order_number,
        channel,
        status,
        subtotal,
        discount_amount,
        shipping_amount,
        total_amount,
        notes,
        cancellation_reason,
        created_at,
        updated_at,
        customers ( id, name ),
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          discount,
          total_price,
          products ( name, sku, unit )
        ),
        payments (
          id,
          method,
          amount,
          status,
          created_at
        )
      `)

    if (isSpecificStore) {
      query = query.eq('store_id', storeId)
    }

    if (isUuid) {
      query = query.eq('id', term)
    } else {
      query = query.ilike('order_number', `%${term}%`)
    }

    const { data, error } = await query.limit(1).maybeSingle()
    if (error || !data) return null
    return mapRawOrderToSummary(data)
  },

  /**
   * Cliente por id, para reconciliar um nome digitado com um cadastro.
   */
  async getCustomer(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return (data as Customer) || null
  },

  /**
   * Clientes mais recentes da plataforma, do mais novo para o mais antigo.
   */
  async getRecentCustomers(limit = 5): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data || []) as Customer[]
  },

  async createCustomer(storeId: string, customerData: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        store_id: storeId,
        name: customerData.name!,
        document: customerData.document || null,
        email: customerData.email || null,
        phone: customerData.phone || null,
        whatsapp: customerData.whatsapp || null,
        notes: customerData.notes || null,
        status: customerData.status || 'ACTIVE',
      })
      .select()
      .single()

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'CUSTOMER_CREATED',
      entity: 'customers',
      entityId: data.id,
      afterData: { name: data.name, email: data.email, phone: data.phone },
    })

    return data as Customer
  },

  async updateCustomer(id: string, storeId: string, updates: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'CUSTOMER_UPDATED',
      entity: 'customers',
      entityId: id,
      afterData: updates as Record<string, unknown>,
    })

    return data as Customer
  },

  async softDeleteCustomer(id: string, storeId: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({
        status: 'INACTIVE',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'CUSTOMER_DELETED',
      entity: 'customers',
      entityId: id,
    })
  },

  /**
   * Obtém ou cria automaticamente o "Cliente Genérico" da loja ativa.
   * Usado no PDV (/sales) quando o operador não informa um cliente específico,
   * garantindo que todo pedido possua um cadastro de cliente vinculado.
   */
  async getOrCreateGenericCustomer(storeId: string): Promise<Customer> {
    const { data: existing, error: searchErr } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .in('name', ['Cliente Genérico', 'Consumidor Final'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!searchErr && existing) {
      if (existing.status !== 'ACTIVE') {
        const { data: activated } = await supabase
          .from('customers')
          .update({
            status: 'ACTIVE',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('store_id', storeId)
          .select()
          .single()
        if (activated) return activated as Customer
      }
      return existing as Customer
    }

    return this.createCustomer(storeId, {
      name: 'Cliente Genérico',
      notes: 'Cadastro genérico padrão para registro de pedidos sem cliente identificado no PDV',
      status: 'ACTIVE',
    })
  },
}
