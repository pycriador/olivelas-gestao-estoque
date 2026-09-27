import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import type { Order, OrderItem, Payment } from '@/types/order.types'
import type { OrderChannel, OrderStatus, PaymentMethod } from '@/types/database.types'

export interface CreateOrderPayload {
  storeId: string
  customerId?: string | null
  channel: OrderChannel
  items: {
    productId: string
    quantity: number
    unitPrice: number
    unitCost?: number
    discount?: number
    batchId?: string
  }[]
  discountAmount?: number
  shippingAmount?: number
  notes?: string
  paymentMethod?: PaymentMethod
}

export interface OrderListParams {
  search?: string
  status?: string
  channel?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const orderService = {
  async listOrders(
    storeId: string,
    params: OrderListParams = {}
  ): Promise<{ data: Order[]; total: number }> {
    const {
      search,
      status,
      channel,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('orders')
      .select(
        `
        *,
        customers ( name, phone, email ),
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products ( name, sku )
        ),
        payments ( id, method, amount, status )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    if (channel && channel !== 'ALL') {
      query = query.eq('channel', channel)
    }

    const orderCol = ['order_number', 'total_amount', 'created_at', 'status', 'channel'].includes(sortBy)
      ? sortBy
      : 'created_at'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    const mapped = (data || []).map((o: any) => ({
      ...o,
      customer_name: o.customers?.name || o.customer_name || 'Consumidor Final',
      customer_phone: o.customers?.phone || o.customer_phone,
      customer_email: o.customers?.email || o.customer_email,
      items: (o.order_items || []).map((oi: any) => ({
        ...oi,
        product_name: oi.products?.name || 'Produto',
        product_sku: oi.products?.sku || '',
      })),
      payments: o.payments || [],
    }))

    return {
      data: mapped,
      total: count || 0,
    }
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const orderNumber = `PED-${Date.now().toString().slice(-6)}`

    // Tudo em uma transacao no servidor: pedido, itens, pagamento, baixa de
    // estoque e auditoria. A RPC trava a linha de saldo de cada produto
    // (FOR UPDATE) e recusa com "Estoque insuficiente para ..." quando o
    // disponivel nao cobre o carrinho, entao nao existe venda acima do
    // estoque nem pedido orfao por insert parcial.
    const { data: orderId, error } = await supabase.rpc('create_order_with_stock', {
      p_store_id: payload.storeId,
      p_customer_id: payload.customerId || null,
      p_channel: payload.channel,
      p_order_number: orderNumber,
      p_items: payload.items.map((item) => ({
        productId: item.productId,
        batchId: item.batchId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost ?? null,
        discount: item.discount || 0,
      })),
      p_discount_amount: payload.discountAmount || 0,
      p_shipping_amount: payload.shippingAmount || 0,
      p_notes: payload.notes || null,
      p_payment_method: payload.paymentMethod || null,
    })

    if (error) throw error
    if (!orderId) throw new Error('O pedido não foi criado.')

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError) throw fetchError

    return order as Order
  },

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('restore_sale_stock', {
      p_order_id: orderId,
      p_reason: reason,
    })

    if (error) throw error

    auditService.logAction({
      action: 'ORDER_CANCELLED',
      entity: 'orders',
      entityId: orderId,
      afterData: { reason },
    })
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) throw error

    auditService.logAction({
      action: 'ORDER_STATUS_UPDATED',
      entity: 'orders',
      entityId: orderId,
      afterData: { status },
    })
  },
}
