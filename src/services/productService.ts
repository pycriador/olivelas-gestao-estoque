import { supabase } from '@/lib/supabase/client'
import type { Product, Category } from '@/types/product.types'

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  isPublished?: boolean
  lowStockOnly?: boolean
  page?: number
  pageSize?: number
}

export const productService = {
  async listProducts(
    storeId: string,
    filters: ProductFilters = {}
  ): Promise<{ data: Product[]; total: number }> {
    const {
      search,
      categoryId,
      isActive,
      isPublished,
      page = 1,
      pageSize = 20,
    } = filters

    let query = supabase
      .from('products')
      .select(
        `
        *,
        categories ( id, name ),
        brands ( id, name ),
        stock_balances ( quantity, available_quantity ),
        product_images ( id, storage_path, public_url, is_primary, display_order )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)
      .is('deleted_at', null)

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive)
    }

    if (typeof isPublished === 'boolean') {
      query = query.eq('is_published_catalog', isPublished)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    const mapped: Product[] = (data || []).map((item: any) => ({
      ...item,
      category_name: item.categories?.name,
      brand_name: item.brands?.name,
      stock_quantity: item.stock_balances?.[0]?.quantity ?? 0,
      images: item.product_images || [],
    }))

    return {
      data: mapped,
      total: count || 0,
    }
  },

  async getProductById(id: string, storeId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        *,
        categories ( id, name ),
        brands ( id, name ),
        stock_balances ( quantity, available_quantity ),
        product_images ( id, storage_path, public_url, is_primary, display_order )
      `
      )
      .eq('id', id)
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return {
      ...data,
      category_name: data.categories?.name,
      brand_name: data.brands?.name,
      stock_quantity: data.stock_balances?.[0]?.quantity ?? 0,
      images: data.product_images || [],
    } as Product
  },

  async createProduct(
    storeId: string,
    productData: Partial<Product>
  ): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        name: productData.name!,
        sku: productData.sku!,
        barcode: productData.barcode || null,
        ean: productData.ean || null,
        description: productData.description || null,
        category_id: productData.category_id || null,
        brand_id: productData.brand_id || null,
        manufacturer_id: productData.manufacturer_id || null,
        supplier_id: productData.supplier_id || null,
        cost_price: productData.cost_price || 0,
        selling_price: productData.selling_price || 0,
        margin_percentage: productData.margin_percentage || null,
        unit: productData.unit || 'UN',
        weight_kg: productData.weight_kg || null,
        min_stock: productData.min_stock || 0,
        max_stock: productData.max_stock || 1000,
        controls_batch: productData.controls_batch || false,
        controls_expiration: productData.controls_expiration || false,
        is_active: productData.is_active ?? true,
        is_published_catalog: productData.is_published_catalog ?? true,
      })
      .select()
      .single()

    if (error) throw error

    // Initialize stock balance record
    await supabase.from('stock_balances').insert({
      store_id: storeId,
      product_id: data.id,
      quantity: 0,
      reserved_quantity: 0,
    })

    return data as Product
  },

  async updateProduct(
    id: string,
    storeId: string,
    updates: Partial<Product>
  ): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error
    return data as Product
  },

  async softDeleteProduct(id: string, storeId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('products')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null,
      })
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error
  },

  async listCategories(storeId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Category[]
  },

  async createCategory(storeId: string, name: string): Promise<Category> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const { data, error } = await supabase
      .from('categories')
      .insert({
        store_id: storeId,
        name,
        slug,
      })
      .select()
      .single()

    if (error) throw error
    return data as Category
  },
}
