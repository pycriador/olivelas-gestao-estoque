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
  // Rastreabilidade de baixa
  reason_code: string | null
  reason_detail: string | null
  cost_center_id: string | null
  cost_center_code: string | null
  operator_id: string | null
  operator_registration: string | null
  approved_by: string | null
  approved_by_registration: string | null
  approved_at: string | null
  product_name?: string
  product_sku?: string
  user_name?: string
  approver_name?: string
  batch_lot_number?: string | null
  batch_expiration_date?: string | null
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

export interface CostCenter {
  id: string
  store_id: string
  code: string
  name: string
  category: string
  is_active: boolean
}

export interface LossReason {
  code: string
  label: string
  default_cost_center_code: string | null
  requires_approval: boolean
  sort_order: number
}

export interface StockMovementInput {
  productId: string
  movementType: StockMovementType
  quantity: number
  batchId?: string | null
  lotNumber?: string | null
  expirationDate?: string | null
  unitCost?: number | null
  reasonCode?: string | null
  reasonDetail?: string | null
  costCenterId?: string | null
  notes?: string | null
  approvedBy?: string | null
}
