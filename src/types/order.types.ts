import type { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus } from './database.types'

export interface Order {
  id: string
  store_id: string
  customer_id: string | null
  user_id: string | null
  order_number: string
  channel: OrderChannel
  status: OrderStatus
  subtotal: number
  discount_amount: number
  shipping_amount: number
  total_amount: number
  notes: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  
  // Relations
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  items?: OrderItem[]
  payments?: Payment[]
}

export interface OrderItem {
  id: string
  order_id: string
  store_id: string
  product_id: string
  batch_id: string | null
  quantity: number
  unit_price: number
  unit_cost: number | null
  discount: number
  total_price: number
  product_name?: string
  product_sku?: string
}

export interface Payment {
  id: string
  order_id: string
  store_id: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  transaction_id: string | null
  provider: string | null
  created_at: string
}
