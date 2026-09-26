import { supabase } from '@/lib/supabase/client'
import { checkExpirationStatus } from '@/utils/dates'
import type { StockBalance, StockMovement, StockBatch } from '@/types/inventory.types'
import type { StockMovementType } from '@/types/database.types'

export interface StockBalanceListParams {
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface StockMovementListParams {
  search?: string
  movementType?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface StockBatchListParams {
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const inventoryService = {
  async getStockBalances(
    storeId: string,
    params: StockBalanceListParams = {}
  ): Promise<{ data: StockBalance[]; total: number }> {
    const {
      search,
      sortBy = 'quantity',
      sortOrder = 'asc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('stock_balances')
      .select(`
        id,
        store_id,
        product_id,
        quantity,
        reserved_quantity,
        available_quantity,
        updated_at,
        products (
          name,
          sku,
          min_stock,
          unit
        )
      `, { count: 'exact' })
      .eq('store_id', storeId)

    const orderCol = ['quantity', 'reserved_quantity', 'available_quantity', 'updated_at'].includes(sortBy)
      ? sortBy
      : 'quantity'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    let list = (data || []).map((item: any) => ({
      id: item.id,
      store_id: item.store_id,
      product_id: item.product_id,
      quantity: Number(item.quantity),
      reserved_quantity: Number(item.reserved_quantity),
      available_quantity: Number(item.available_quantity),
      updated_at: item.updated_at,
      product_name: item.products?.name || 'Produto',
      product_sku: item.products?.sku || '',
      min_stock: item.products?.min_stock || 0,
    }))

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (b) =>
          b.product_name.toLowerCase().includes(q) ||
          b.product_sku.toLowerCase().includes(q)
      )
    }

    return {
      data: list,
      total: count || list.length,
    }
  },

  async getMovements(
    storeId: string,
    params: StockMovementListParams = {}
  ): Promise<{ data: StockMovement[]; total: number }> {
    const {
      search,
      movementType,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        products ( name ),
        profiles ( full_name )
      `, { count: 'exact' })
      .eq('store_id', storeId)

    if (movementType && movementType !== 'ALL') {
      query = query.eq('movement_type', movementType)
    }

    if (search) {
      query = query.ilike('notes', `%${search}%`)
    }

    const orderCol = ['created_at', 'quantity', 'movement_type'].includes(sortBy)
      ? sortBy
      : 'created_at'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    const list = (data || []).map((item: any) => ({
      id: item.id,
      store_id: item.store_id,
      product_id: item.product_id,
      batch_id: item.batch_id,
      movement_type: item.movement_type,
      quantity: Number(item.quantity),
      previous_quantity: Number(item.previous_quantity),
      new_quantity: Number(item.new_quantity),
      unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
      reference_id: item.reference_id,
      reference_type: item.reference_type,
      notes: item.notes,
      user_id: item.user_id,
      created_at: item.created_at,
      product_name: item.products?.name || 'Produto',
      user_name: item.profiles?.full_name || 'Sistema',
    }))

    return {
      data: list,
      total: count || 0,
    }
  },

  async getBatches(
    storeId: string,
    params: StockBatchListParams = {}
  ): Promise<{
    data: (StockBatch & { expirationInfo: ReturnType<typeof import('@/utils/dates').checkExpirationStatus> })[]
    total: number
    summary: { total: number; expired: number; critical7d: number; warning30d: number; normal: number }
  }> {
    const {
      search,
      status,
      sortBy = 'expiration_date',
      sortOrder = 'asc',
      page = 1,
      pageSize = 20,
    } = params

    // Fetch all store batches to calculate accurate summary KPIs
    const { data: allData, error: allErr } = await supabase
      .from('stock_batches')
      .select(`
        *,
        products ( name )
      `)
      .eq('store_id', storeId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (allErr) throw allErr

    const mapped = (allData || []).map((item: any) => ({
      id: item.id,
      store_id: item.store_id,
      product_id: item.product_id,
      lot_number: item.lot_number,
      quantity: Number(item.quantity),
      cost_price: item.cost_price ? Number(item.cost_price) : null,
      manufacturing_date: item.manufacturing_date,
      expiration_date: item.expiration_date,
      status: item.status,
      created_at: item.created_at,
      product_name: item.products?.name || 'Produto',
      expirationInfo: checkExpirationStatus(item.expiration_date),
    }))

    const summary = {
      total: mapped.length,
      expired: mapped.filter((b) => b.expirationInfo.status === 'expired').length,
      critical7d: mapped.filter((b) => b.expirationInfo.status === 'critical_7_days').length,
      warning30d: mapped.filter((b) => b.expirationInfo.status === 'warning_30_days').length,
      normal: mapped.filter((b) => b.expirationInfo.status === 'normal').length,
    }

    let filtered = mapped

    if (status && status !== 'ALL') {
      if (status === 'EXPIRED') filtered = filtered.filter((b) => b.expirationInfo.status === 'expired')
      else if (status === '7D') filtered = filtered.filter((b) => b.expirationInfo.status === 'critical_7_days')
      else if (status === '30D') filtered = filtered.filter((b) => b.expirationInfo.status === 'warning_30_days')
      else if (status === 'NORMAL') filtered = filtered.filter((b) => b.expirationInfo.status === 'normal')
    }

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.lot_number.toLowerCase().includes(q) ||
          b.product_name.toLowerCase().includes(q)
      )
    }

    const total = filtered.length
    const from = (page - 1) * pageSize
    const paginatedData = filtered.slice(from, from + pageSize)

    return {
      data: paginatedData,
      total,
      summary,
    }
  },

  async createManualMovement(params: {
    storeId: string
    productId: string
    movementType: StockMovementType
    quantity: number
    notes?: string
    batchId?: string
    unitCost?: number
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Get current balance
    const { data: balance } = await supabase
      .from('stock_balances')
      .select('quantity')
      .eq('store_id', params.storeId)
      .eq('product_id', params.productId)
      .single()

    const currentQty = balance ? Number(balance.quantity) : 0
    let delta = params.quantity

    // If exit, loss, damage, expiration -> negative delta
    if (['EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION'].includes(params.movementType)) {
      delta = -Math.abs(params.quantity)
    } else if (params.movementType === 'ADJUSTMENT') {
      delta = params.quantity - currentQty
    }

    const newQty = currentQty + delta

    // 2. Upsert balance
    await supabase
      .from('stock_balances')
      .upsert({
        store_id: params.storeId,
        product_id: params.productId,
        quantity: newQty,
        reserved_quantity: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'store_id,product_id' })

    // 3. Record movement
    await supabase
      .from('stock_movements')
      .insert({
        store_id: params.storeId,
        product_id: params.productId,
        batch_id: params.batchId || null,
        movement_type: params.movementType,
        quantity: Math.abs(params.quantity),
        previous_quantity: currentQty,
        new_quantity: newQty,
        unit_cost: params.unitCost || null,
        notes: params.notes || null,
        user_id: user?.id || null,
      })
  },
}
