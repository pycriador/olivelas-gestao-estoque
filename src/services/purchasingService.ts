import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import type { PurchaseOrder } from '@/types/purchasing.types'

export interface CreatePurchaseOrderPayload {
  storeId: string
  supplierId: string
  items: {
    productId: string
    quantityOrdered: number
    unitCost: number
    lotNumber?: string
    expirationDate?: string
  }[]
  shippingCost?: number
  notes?: string
}

export interface PurchaseOrderListParams {
  search?: string
  supplierId?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const purchasingService = {
  async listPurchaseOrders(
    storeId: string,
    params: PurchaseOrderListParams = {}
  ): Promise<{ data: PurchaseOrder[]; total: number }> {
    const {
      search,
      supplierId,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('purchase_orders')
      .select(
        `
        *,
        suppliers ( corporate_name, trade_name ),
        purchase_order_items (
          id,
          product_id,
          quantity_ordered,
          quantity_received,
          unit_cost,
          total_cost,
          lot_number,
          expiration_date,
          products ( name )
        )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)

    if (search) {
      query = query.or(`order_number.ilike.%${search}%`)
    }

    if (supplierId && supplierId !== 'ALL') {
      query = query.eq('supplier_id', supplierId)
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    const orderCol = ['order_number', 'total_amount', 'created_at', 'status'].includes(sortBy)
      ? sortBy
      : 'created_at'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    const mapped = (data || []).map((po: any) => ({
      ...po,
      supplier_name: po.suppliers?.trade_name || po.suppliers?.corporate_name || 'Fornecedor',
      items: (po.purchase_order_items || []).map((poi: any) => ({
        ...poi,
        product_name: poi.products?.name || 'Produto',
      })),
    }))

    return {
      data: mapped,
      total: count || 0,
    }
  },

  async createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
    const { data: { user } } = await supabase.auth.getUser()

    const subtotal = payload.items.reduce(
      (acc, item) => acc + item.quantityOrdered * item.unitCost,
      0
    )
    const shipping = payload.shippingCost || 0
    const total = subtotal + shipping
    const orderNumber = `OC-${Date.now().toString().slice(-6)}`

    // 1. Create Purchase Order
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        store_id: payload.storeId,
        supplier_id: payload.supplierId,
        order_number: orderNumber,
        status: 'ISSUED',
        subtotal,
        shipping_cost: shipping,
        total_amount: total,
        notes: payload.notes || null,
        issued_at: new Date().toISOString(),
        created_by: user?.id || null,
      })
      .select()
      .single()

    if (poError) throw poError

    // 2. Insert items
    const items = payload.items.map(item => ({
      purchase_order_id: po.id,
      store_id: payload.storeId,
      product_id: item.productId,
      quantity_ordered: item.quantityOrdered,
      quantity_received: 0,
      unit_cost: item.unitCost,
      total_cost: item.quantityOrdered * item.unitCost,
      lot_number: item.lotNumber || null,
      expiration_date: item.expirationDate || null,
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(items)

    if (itemsError) throw itemsError

    auditService.logAction({
      storeId: payload.storeId,
      action: 'PURCHASE_ORDER_CREATED',
      entity: 'purchase_orders',
      entityId: po.id,
      afterData: {
        orderNumber: po.order_number,
        totalAmount: po.total_amount,
        itemCount: payload.items.length,
      },
    })

    return po as PurchaseOrder
  },

  async receivePurchaseOrder(purchaseOrderId: string): Promise<void> {
    const { error } = await supabase.rpc('receive_purchase_order_stock', {
      p_purchase_order_id: purchaseOrderId,
    })

    if (error) throw error

    auditService.logAction({
      action: 'PURCHASE_ORDER_RECEIVED',
      entity: 'purchase_orders',
      entityId: purchaseOrderId,
    })
  },
}
