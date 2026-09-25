import { supabase } from '@/lib/supabase/client'
import type { StockBalance, StockMovement, StockBatch } from '@/types/inventory.types'
import type { StockMovementType } from '@/types/database.types'

export const inventoryService = {
  async getStockBalances(storeId: string): Promise<StockBalance[]> {
    const { data, error } = await supabase
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
      `)
      .eq('store_id', storeId)
      .order('quantity', { ascending: true })

    if (error) throw error

    return (data || []).map((item: any) => ({
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
  },

  async getMovements(storeId: string, limit: number = 50): Promise<StockMovement[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products ( name ),
        profiles ( full_name )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((item: any) => ({
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
  },

  async getBatches(storeId: string): Promise<StockBatch[]> {
    const { data, error } = await supabase
      .from('stock_batches')
      .select(`
        *,
        products ( name )
      `)
      .eq('store_id', storeId)
      .order('expiration_date', { ascending: true })

    if (error) throw error

    return (data || []).map((item: any) => ({
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
    }))
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
