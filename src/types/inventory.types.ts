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
  unit?: string
  cost_price?: number
  selling_price?: number
  total_cost_value?: number
  total_selling_value?: number
  potential_profit?: number
  supplier_id?: string | null
  supplier_name?: string | null
  controls_batch?: boolean
  controls_expiration?: boolean
  product_image_url?: string | null
}

export interface StockBalanceListParams {
  search?: string
  stockStatus?: 'all' | 'in' | 'out'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
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
  product_image_url?: string | null
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

export interface StockWriteoffRequest {
  id: string
  store_id: string
  product_id: string
  product_name?: string
  product_sku?: string
  product_unit?: string
  batch_id: string | null
  lot_number: string | null
  expiration_date: string | null
  movement_type: StockMovementType
  quantity: number
  unit_cost: number | null
  reason_code: string
  reason_label?: string
  reason_detail: string | null
  cost_center_id: string | null
  cost_center_code?: string | null
  cost_center_name?: string | null
  notes: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  requested_by: string | null
  requested_by_name?: string | null
  requested_by_registration: string | null
  reviewed_by: string | null
  reviewed_by_name?: string | null
  reviewed_by_registration: string | null
  rejection_reason: string | null
  movement_id: string | null
  created_at: string
  reviewed_at: string | null
  // CamelCase convenience fields
  productName?: string
  productSku?: string
  batchLotNumber?: string | null
  movementType: StockMovementType
  reasonCode: string
  reasonDetail: string | null
  requestedByName?: string | null
  requestedByRegistration: string | null
  reviewedByName?: string | null
  reviewedByRegistration: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface StockTransferItem {
  id: string
  transfer_id: string
  source_product_id: string
  destination_product_id: string | null
  product_sku: string
  product_name: string
  unit: string
  source_batch_id: string | null
  destination_batch_id: string | null
  lot_number: string | null
  expiration_date: string | null
  quantity: number
  unit_cost: number
  selling_price: number
  created_at: string
  // CamelCase convenience fields
  productName: string
  productSku: string
}

export interface StockTransfer {
  id: string
  transfer_number: string
  source_store_id: string
  source_store_name?: string
  destination_store_id: string
  destination_store_name?: string
  destination_branch_code?: string | null
  status: 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
  total_items: number
  total_quantity: number
  total_cost_value: number
  total_selling_value: number
  notes: string | null
  driver_or_carrier: string | null
  created_by: string | null
  created_by_name?: string | null
  approved_by: string | null
  received_by: string | null
  created_at: string
  completed_at: string | null
  items: StockTransferItem[]
  // CamelCase convenience fields
  transferCode: string
  fromStoreId: string
  fromStoreName: string
  toStoreId: string
  toStoreName: string
  totalItems: number
  totalQuantity: number
  totalCostValue: number
  totalSellingValue: number
  createdAt: string
  approvedByName?: string | null
  requestedByName?: string | null
}

export interface StockTransferCreateInput {
  sourceStoreId?: string
  destinationStoreId: string
  notes?: string | null
  driverOrCarrier?: string | null
  driverName?: string | null
  vehiclePlate?: string | null
  items: {
    productId: string
    batchId?: string | null
    lotNumber?: string | null
    expirationDate?: string | null
    quantity: number
    unitCost?: number | null
    sellingPrice?: number | null
    notes?: string | null
  }[]
}

export interface ProductStockTraceability {
  product: {
    id: string
    name: string
    sku: string
    cost_price: number
    selling_price: number
    unit: string
    controls_batch: boolean
    controls_expiration: boolean
    min_stock: number
  }
  supplier: {
    id: string
    corporate_name: string
    trade_name: string | null
    document: string | null
    phone: string | null
    email: string | null
    contact_name: string | null
  } | null
  batches: StockBatch[]
  recentEntries: {
    id: string
    created_at: string
    quantity: number
    unit_cost: number | null
    movement_type: string
    reference_type: string | null
    notes: string | null
    lot_number: string | null
    expiration_date: string | null
  }[]
}
