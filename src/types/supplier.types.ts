export interface Supplier {
  id: string
  store_id: string
  corporate_name: string
  trade_name: string | null
  document: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SupplierContact {
  id: string
  supplier_id: string
  store_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
}
