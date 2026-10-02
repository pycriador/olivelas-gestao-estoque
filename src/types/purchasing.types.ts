import type { PurchaseOrderStatus } from './database.types'

export interface PurchaseOrder {
  id: string
  store_id: string
  supplier_id: string
  order_number: string
  status: PurchaseOrderStatus
  subtotal: number
  shipping_cost: number
  total_amount: number
  total_selling_amount?: number
  potential_profit?: number
  margin_percent?: number
  notes: string | null
  issued_at: string | null
  received_at: string | null
  cancelled_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  supplier_name?: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  store_id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  total_cost: number
  selling_price?: number
  total_selling_value?: number
  profit?: number
  margin_percent?: number
  lot_number: string | null
  expiration_date: string | null
  product_name?: string
  product_sku?: string
}
