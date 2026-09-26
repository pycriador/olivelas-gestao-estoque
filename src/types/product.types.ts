export interface Product {
  id: string
  store_id: string
  name: string
  sku: string
  barcode: string | null
  ean: string | null
  description: string | null
  category_id: string | null
  brand_id: string | null
  manufacturer_id: string | null
  supplier_id: string | null
  cost_price: number
  selling_price: number
  margin_percentage: number | null
  unit: string
  weight_kg: number | null
  min_stock: number
  max_stock: number
  controls_batch: boolean
  controls_expiration: boolean
  is_active: boolean
  is_published_catalog: boolean
  created_at: string
  updated_at: string
  
  // Joins & derived fields
  category_name?: string
  brand_name?: string
  stock_quantity?: number
  images?: ProductImage[]
}

export interface ProductImage {
  id: string
  product_id: string
  store_id: string
  storage_path: string
  public_url: string
  is_primary: boolean
  display_order: number
  created_at: string
}

export interface Category {
  id: string
  store_id: string
  name: string
  slug: string
  parent_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
