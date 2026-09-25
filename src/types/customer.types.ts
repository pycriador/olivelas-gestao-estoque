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
