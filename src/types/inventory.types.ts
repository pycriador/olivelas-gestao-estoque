import type { StockMovementType } from './database.types'

export interface StockBalance {
  id: string
  store_id: string
  product_id: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  updated_at: string
  product_name?: string
  product_sku?: string
  min_stock?: number
}

export interface StockMovement {
  id: string
  store_id: string
  product_id: string
  batch_id: string | null
  movement_type: StockMovementType
  quantity: number
  previous_quantity: number
  new_quantity: number
  unit_cost: number | null
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  user_id: string | null
  created_at: string
  product_name?: string
  user_name?: string
}

export interface StockBatch {
  id: string
  store_id: string
  product_id: string
  lot_number: string
  quantity: number
  cost_price: number | null
  manufacturing_date: string | null
  expiration_date: string | null
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'BLOCKED'
  created_at: string
  product_name?: string
}
