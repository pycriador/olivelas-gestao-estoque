import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import { categoryService } from '@/services/categoryService'
import type { Product, Category } from '@/types/product.types'

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  isPublished?: boolean
  lowStockOnly?: boolean
  minPrice?: number
  maxPrice?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/** Qual faixa de estoque a listagem do PDV deve trazer. */
export type POSStockFilter = 'in' | 'out' | 'all'

export interface POSProductFilters {
  search?: string
  categoryId?: string
  stock?: POSStockFilter
  page?: number
  pageSize?: number
}

/** Projection publica: nunca expoe `cost_price` nem dados internos. */
const PUBLIC_PRODUCT_COLUMNS = `
  id, store_id, name, sku, barcode, description, category_id,
  unit, selling_price, is_active, is_published_catalog
`

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
      minPrice,
      maxPrice,
      sortBy = 'created_at',
      sortOrder = 'desc',
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

    if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
      query = query.gte('selling_price', minPrice)
    }

    if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
      query = query.lte('selling_price', maxPrice)
    }

    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive)
    }

    if (typeof isPublished === 'boolean') {
      query = query.eq('is_published_catalog', isPublished)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const orderColumn = ['name', 'sku', 'selling_price', 'cost_price', 'created_at', 'min_stock'].includes(sortBy)
      ? sortBy
      : 'created_at'

    const { data, count, error } = await query
      .order(orderColumn, { ascending: sortOrder === 'asc' })
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

  /**
   * Listagem do PDV.
   *
   * A consulta e montada a partir de `stock_balances` (e nao de
   * `products`) porque o PostgREST nao aceita `order` por coluna de
   * recurso embutido - e "produtos com estoque primeiro" e justamente uma
   * ordenacao por saldo. Todo produto criado pelo app tem uma linha em
   * `stock_balances` (ver createProduct / importProductsBulk), entao
   * partir do saldo nao perde nenhum produto.
   *
   * `stock: 'in'` traz so o que da para vender agora, `'out'` traz o
   * zerado/negativo e `'all'` traz os dois (com estoque primeiro).
   */
  async listProductsForPOS(
    storeId: string,
    filters: POSProductFilters = {}
  ): Promise<{ data: Product[]; total: number }> {
    const { search, categoryId, stock = 'in', page = 1, pageSize = 24 } = filters

    let productIds: string[] | null = null

    // `.or()` nao aceita caminho de recurso embutido, entao a busca por
    // nome/SKU/codigo de barras e resolvida em uma consulta leve de ids
    // antes da paginacao.
    if (search && search.trim().length >= 2) {
      const { data: matched, error: matchErr } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .or(
          `name.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%,barcode.ilike.%${search.trim()}%`
        )

      if (matchErr) throw matchErr
      productIds = (matched || []).map((p: any) => p.id)

      // Nada casou: encerrar aqui evita a segunda query e devolve
      // paginacao coerente (total 0) em vez da pagina 1 inteira.
      if (productIds.length === 0) return { data: [], total: 0 }
    }

    let query = supabase
      .from('stock_balances')
      .select(
        `
        quantity, available_quantity, reserved_quantity,
        products!inner (
          id, store_id, name, sku, barcode, description, unit,
          selling_price, category_id, is_active,
          categories ( id, name )
        )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)

    if (productIds) query = query.in('product_id', productIds)
    if (categoryId) query = query.eq('products.category_id', categoryId)

    // Produto inativo nao entra no PDV.
    query = query.eq('products.is_active', true).is('products.deleted_at', null)

    if (stock === 'in') {
      query = query.gt('available_quantity', 0)
    } else if (stock === 'out') {
      query = query.lte('available_quantity', 0)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // `nullsfirst` garante que saldo nulo (nunca ocorre, mas por seguranca)
    // nao flutue para o topo do grupo "com estoque".
    const { data, count, error } = await query
      .order('available_quantity', { ascending: stock === 'out', nullsFirst: false })
      .order('product_id', { ascending: true })
      .range(from, to)

    if (error) throw error

    const mapped: Product[] = (data || [])
      .map((row: any) => {
        const product = row.products
        if (!product) return null
        return {
          ...product,
          category_name: product.categories?.name,
          stock_quantity: Number(row.available_quantity ?? 0),
          reserved_quantity: Number(row.reserved_quantity ?? 0),
          physical_quantity: Number(row.quantity ?? 0),
        } as Product
      })
      .filter(Boolean) as Product[]

    return { data: mapped, total: count || 0 }
  },

  /**
   * Catalogo publico de `/store/:slug`.
   *
   * Projection explicita em vez de `select('*')`: a pagina e anonima e o
   * `*` mandava `cost_price` (e `min_stock`) para o navegador de qualquer
   * visitante. Tambem nao busca `stock_balances` - o anon nao tem acesso
   * a essa tabela por RLS e o catalogo nao mostra saldo.
   */
  async listPublicCatalogProducts(
    storeId: string,
    filters: {
      search?: string
      categoryId?: string
      minPrice?: number
      maxPrice?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ data: Product[]; total: number }> {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 24,
    } = filters

    let query = supabase
      .from('products')
      .select(
        `
        ${PUBLIC_PRODUCT_COLUMNS},
        categories ( id, name ),
        product_images ( id, public_url, is_primary, display_order )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)
      .eq('is_active', true)
      .eq('is_published_catalog', true)
      .is('deleted_at', null)

    if (search && search.trim()) {
      const term = search.trim()
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`)
    }

    if (categoryId) query = query.eq('category_id', categoryId)
    if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
      query = query.gte('selling_price', minPrice)
    }
    if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
      query = query.lte('selling_price', maxPrice)
    }

    const orderColumn = ['name', 'selling_price', 'created_at'].includes(sortBy)
      ? sortBy
      : 'name'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderColumn, { ascending: sortOrder === 'asc' })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) throw error

    const mapped: Product[] = (data || []).map((item: any) => {
      const images = (item.product_images || []) as any[]
      const primary =
        images.find((img) => img.is_primary) ||
        [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]
      return {
        ...item,
        category_name: item.categories?.name,
        images: primary ? [primary] : [],
      } as Product
    })

    return { data: mapped, total: count || 0 }
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

    auditService.logAction({
      storeId,
      action: 'PRODUCT_CREATED',
      entity: 'products',
      entityId: data.id,
      afterData: { name: data.name, sku: data.sku, selling_price: data.selling_price },
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

    auditService.logAction({
      storeId,
      action: 'PRODUCT_UPDATED',
      entity: 'products',
      entityId: id,
      afterData: updates as Record<string, unknown>,
    })

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

    auditService.logAction({
      storeId,
      action: 'PRODUCT_DELETED',
      entity: 'products',
      entityId: id,
    })
  },

  // Categorias sao mantidas em categoryService (CRUD completo + slug seguro).
  // Estes dois wrappers existem para nao quebrar os consumidores antigos.
  async listCategories(storeId: string): Promise<Category[]> {
    return categoryService.listCategories(storeId)
  },

  async createCategory(storeId: string, name: string): Promise<Category> {
    return categoryService.createCategory(storeId, { name })
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

        // Insert initial stock balance.
        // `available_quantity` e coluna gerada (quantity - reserved_quantity)
        // e nao pode ser enviada no insert.
        if (insertedProduct?.id) {
          await supabase.from('stock_balances').insert({
            store_id: storeId,
            product_id: insertedProduct.id,
            quantity: initialStock,
            reserved_quantity: 0,
          })
        }

        successCount++
      } catch (err: any) {
        errors.push(`Linha ${rowNum}: ${err.message || 'Erro inesperado'}`)
        errorCount++
      }
    }

    if (successCount > 0) {
      auditService.logAction({
        storeId,
        action: 'BULK_IMPORT_PRODUCTS',
        entity: 'products',
        afterData: { importedCount: successCount, errorCount },
      })
    }

    return { successCount, errorCount, errors }
  },
}
