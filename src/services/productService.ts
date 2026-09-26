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

    if (error && error.code !== '23505') throw error
    if (data) return data as Category
    const existing = await supabase.from('categories').select('*').eq('store_id', storeId).eq('name', name).single()
    return existing.data as Category
  },

  async importProductsBulk(
    storeId: string,
    rawItems: any[]
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    if (!rawItems || rawItems.length === 0) {
      return { successCount: 0, errorCount: 0, errors: ['Nenhum item válido para importação.'] }
    }

    // 1. Fetch current categories for matching
    const existingCategories = await this.listCategories(storeId)
    const categoryMap = new Map<string, string>()
    existingCategories.forEach((c) => categoryMap.set(c.name.trim().toLowerCase(), c.id))

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Helper for number parsing (handles "12,50", "R$ 12.50", etc.)
    const parseNum = (val: any, fallback = 0): number => {
      if (typeof val === 'number') return isNaN(val) ? fallback : val
      if (!val) return fallback
      const clean = String(val).replace(/[^\d.,-]/g, '').replace(',', '.')
      const parsed = parseFloat(clean)
      return isNaN(parsed) ? fallback : parsed
    }

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i]
      const rowNum = i + 1

      try {
        const name = (item.name || item.Nome || item.nome || item.produto || item.Produto || '').trim()
        if (!name) {
          errors.push(`Linha ${rowNum}: Nome do produto é obrigatório.`)
          errorCount++
          continue
        }

        let sku = (item.sku || item.SKU || item.codigo || item.Codigo || item['Código'] || '').trim()
        if (!sku) {
          sku = `PRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
        }

        const barcode = (item.barcode || item.Barcode || item.ean || item.EAN || item.codigo_barras || item['Código de Barras'] || '').trim() || null
        const description = (item.description || item.Description || item.descricao || item['Descrição'] || '').trim() || null
        const unit = (item.unit || item.Unit || item.unidade || item.Unidade || 'UN').trim().toUpperCase()
        const costPrice = parseNum(item.cost_price ?? item.costPrice ?? item.preco_custo ?? item['Preço de Custo'] ?? item['Preço Custo'], 0)
        const sellingPrice = parseNum(item.selling_price ?? item.sellingPrice ?? item.preco_venda ?? item['Preço de Venda'] ?? item['Preço Venda'] ?? item.preco ?? item.price, 0)
        const minStock = parseNum(item.min_stock ?? item.minStock ?? item.estoque_minimo ?? item['Estoque Mínimo'], 5)
        const initialStock = parseNum(item.initial_stock ?? item.initialStock ?? item.stock_quantity ?? item.estoque ?? item.Estoque ?? item.quantidade ?? item.qtd, 0)
        const controlsBatch = Boolean(item.controls_batch ?? item.controlsBatch ?? item.controla_lote)
        const controlsExpiration = Boolean(item.controls_expiration ?? item.controlsExpiration ?? item.controla_validade)
        const isPublished = item.is_published !== undefined ? Boolean(item.is_published) : true

        // Category resolution
        let categoryId: string | null = null
        const categoryName = (item.category_name || item.category || item.categoria || item.Categoria || '').trim()
        if (categoryName) {
          const lowerCat = categoryName.toLowerCase()
          if (categoryMap.has(lowerCat)) {
            categoryId = categoryMap.get(lowerCat)!
          } else {
            try {
              const newCat = await this.createCategory(storeId, categoryName)
              if (newCat) {
                categoryId = newCat.id
                categoryMap.set(lowerCat, newCat.id)
              }
            } catch {
              // Ignore category creation error and proceed without category
            }
          }
        }

        // Insert product
        const { data: insertedProduct, error: prodErr } = await supabase
          .from('products')
          .insert({
            store_id: storeId,
            name,
            sku,
            barcode,
            description,
            category_id: categoryId,
            cost_price: costPrice,
            selling_price: sellingPrice,
            unit,
            min_stock: minStock,
            controls_batch: controlsBatch,
            controls_expiration: controlsExpiration,
            is_active: true,
            is_published_catalog: isPublished,
          })
          .select('id')
          .single()

        if (prodErr) {
          errors.push(`Linha ${rowNum} (${name}): ${prodErr.message}`)
          errorCount++
          continue
        }

        // Insert initial stock balance
        if (insertedProduct?.id) {
          await supabase.from('stock_balances').insert({
            store_id: storeId,
            product_id: insertedProduct.id,
            quantity: initialStock,
            available_quantity: initialStock,
          })
        }

        successCount++
      } catch (err: any) {
        errors.push(`Linha ${rowNum}: ${err.message || 'Erro inesperado'}`)
        errorCount++
      }
    }

    return { successCount, errorCount, errors }
  },
}
