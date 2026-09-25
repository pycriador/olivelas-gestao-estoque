import { supabase } from '@/lib/supabase/client'
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

export const orderService = {
  async listOrders(storeId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
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
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((o: any) => ({
      ...o,
      customer_name: o.customers?.name || 'Consumidor Final',
      customer_phone: o.customers?.phone,
      customer_email: o.customers?.email,
      items: (o.order_items || []).map((oi: any) => ({
        ...oi,
        product_name: oi.products?.name || 'Produto',
        product_sku: oi.products?.sku || '',
      })),
      payments: o.payments || [],
    }))
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const { data: { user } } = await supabase.auth.getUser()

    // Calculate totals
    const subtotal = payload.items.reduce(
      (acc, item) => acc + (item.quantity * item.unitPrice - (item.discount || 0)),
      0
    )
    const discount = payload.discountAmount || 0
    const shipping = payload.shippingAmount || 0
    const total = Math.max(0, subtotal - discount + shipping)

    const orderNumber = `PED-${Date.now().toString().slice(-6)}`

    // 1. Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        store_id: payload.storeId,
        customer_id: payload.customerId || null,
        user_id: user?.id || null,
        order_number: orderNumber,
        channel: payload.channel,
        status: 'PENDING',
        subtotal,
        discount_amount: discount,
        shipping_amount: shipping,
        total_amount: total,
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Insert items
    const orderItems = payload.items.map(item => ({
      order_id: order.id,
      store_id: payload.storeId,
      product_id: item.productId,
      batch_id: item.batchId || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      unit_cost: item.unitCost || null,
      discount: item.discount || 0,
      total_price: item.quantity * item.unitPrice - (item.discount || 0),
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw itemsError

    // 3. Insert payment if method is provided
    if (payload.paymentMethod) {
      await supabase.from('payments').insert({
        order_id: order.id,
        store_id: payload.storeId,
        method: payload.paymentMethod,
        amount: total,
        status: payload.channel === 'IN_STORE' ? 'PAID' : 'PENDING',
      })
    }

    // 4. Auto-deduct stock if in-store / confirmed sale
    try {
      await supabase.rpc('process_sale_stock_deduction', {
        p_order_id: order.id,
      })
    } catch (rpcErr) {
      console.warn('RPC stock deduction warning:', rpcErr)
    }

    return order as Order
  },

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('restore_sale_stock', {
      p_order_id: orderId,
      p_reason: reason,
    })

    if (error) throw error
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
  },
}
