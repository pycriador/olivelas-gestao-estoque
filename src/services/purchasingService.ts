import { supabase } from '@/lib/supabase/client'
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

export const purchasingService = {
  async listPurchaseOrders(storeId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
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
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((po: any) => ({
      ...po,
      supplier_name: po.suppliers?.trade_name || po.suppliers?.corporate_name || 'Fornecedor',
      items: (po.purchase_order_items || []).map((poi: any) => ({
        ...poi,
        product_name: poi.products?.name || 'Produto',
      })),
    }))
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

    return po as PurchaseOrder
  },

  async receivePurchaseOrder(purchaseOrderId: string): Promise<void> {
    const { error } = await supabase.rpc('receive_purchase_order_stock', {
      p_purchase_order_id: purchaseOrderId,
    })

    if (error) throw error
  },
}
