import type { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus } from './database.types'

export interface CustomerOrderItemDetail {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_sku: string
  unit: string
  quantity: number
  unit_price: number
  discount: number
  total_price: number
}

export interface CustomerOrderPaymentDetail {
  id: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  created_at: string
}

export interface CustomerOrderSummary {
  id: string
  store_id: string
  customer_id: string | null
  customer_name?: string
  order_number: string
  channel: OrderChannel
  status: OrderStatus
  subtotal: number
  discount_amount: number
  shipping_amount: number
  total_amount: number
  notes: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  items: CustomerOrderItemDetail[]
  payments: CustomerOrderPaymentDetail[]
}

export interface Customer {
  id: string
  store_id: string
  name: string
  document: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  notes: string | null
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at: string
  deleted_at: string | null

  // Enriched order history & metrics
  orders?: CustomerOrderSummary[]
  filtered_orders?: CustomerOrderSummary[]
  total_orders?: number
  open_orders_count?: number
  closed_orders_count?: number
  cancelled_orders_count?: number
  total_spent?: number
  average_ticket?: number
  last_order_at?: string | null
}

export interface CustomerAddress {
  id: string
  customer_id: string
  store_id: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipcode: string
  is_default: boolean
}
