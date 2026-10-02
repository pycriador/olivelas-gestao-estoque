import { supabase } from '@/lib/supabase/client'
import { checkExpirationStatus } from '@/utils/dates'
import { auditService } from '@/services/auditService'
import type {
  CostCenter,
  LossReason,
  StockBalance,
  StockBatch,
  StockMovement,
  StockMovementInput,
} from '@/types/inventory.types'
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
  reasonCode?: string
  costCenterId?: string
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

/** Acoes de justificativa aplicaveis a um alerta de validade/lote. */
export type ExpirationAction =
  | 'PURCHASED'
  | 'RETURNED'
  | 'WRITTEN_OFF'
  | 'DISCARDED'
  | 'KEPT'
  | 'ON_HOLD'

export const EXPIRATION_ACTIONS: {
  value: ExpirationAction
  label: string
}[] = [
  { value: 'PURCHASED', label: 'Comprado' },
  { value: 'RETURNED', label: 'Devolução' },
  { value: 'WRITTEN_OFF', label: 'Baixado' },
  { value: 'DISCARDED', label: 'Descartado' },
  { value: 'ON_HOLD', label: 'Em análise' },
  { value: 'KEPT', label: 'Manter' },
]

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
      .select(
        `
        id,
        store_id,
        product_id,
        quantity,
        reserved_quantity,
        available_quantity,
        updated_at,
        products!inner (
          id,
          name,
          sku,
          min_stock,
          cost_price,
          selling_price,
          unit,
          deleted_at
        )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)
      .is('products.deleted_at', null)

    if (search?.trim()) {
      const q = search.trim()
      query = query.or(`products.name.ilike.%${q}%,products.sku.ilike.%${q}%`)
    }

    const orderCol = ['quantity', 'reserved_quantity', 'available_quantity', 'updated_at'].includes(sortBy)
      ? sortBy
      : 'quantity'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    const list = (data || []).map((item: any) => {
      const prod = Array.isArray(item.products) ? item.products[0] : item.products
      const qty = Number(item.quantity)
      const costPrice = Number(prod?.cost_price) || 0
      const sellingPrice = Number(prod?.selling_price) || 0
      const totalCost = qty * costPrice
      const totalSelling = qty * sellingPrice

      return {
        id: item.id,
        store_id: item.store_id,
        product_id: item.product_id,
        quantity: qty,
        reserved_quantity: Number(item.reserved_quantity),
        available_quantity: Number(item.available_quantity),
        updated_at: item.updated_at,
        product_name: prod?.name || 'Produto',
        product_sku: prod?.sku || '',
        min_stock: prod?.min_stock || 0,
        unit: prod?.unit || 'UN',
        cost_price: costPrice,
        selling_price: sellingPrice,
        total_cost_value: totalCost,
        total_selling_value: totalSelling,
        potential_profit: totalSelling - totalCost,
      }
    })

    return {
      data: list,
      total: count || list.length,
    }
  },

  /**
   * Resumo consolidado de avaliação do estoque da loja (Custo Total, Venda Total e Margem)
   */
  async getStockValuationSummary(storeId: string): Promise<{
    totalItems: number
    totalPhysicalUnits: number
    totalCostValue: number
    totalSellingValue: number
    potentialProfit: number
    marginPercent: number
  }> {
    const { data, error } = await supabase
      .from('stock_balances')
      .select(`
        quantity,
        products!inner (
          cost_price,
          selling_price,
          deleted_at
        )
      `)
      .eq('store_id', storeId)
      .is('products.deleted_at', null)

    if (error) throw error

    let totalPhysicalUnits = 0
    let totalCostValue = 0
    let totalSellingValue = 0

    for (const row of (data || []) as any[]) {
      const product = Array.isArray(row.products) ? row.products[0] : row.products
      const qty = Math.max(0, Number(row.quantity) || 0)
      const cost = Number(product?.cost_price) || 0
      const selling = Number(product?.selling_price) || 0
      totalPhysicalUnits += qty
      totalCostValue += qty * cost
      totalSellingValue += qty * selling
    }

    const potentialProfit = totalSellingValue - totalCostValue
    const marginPercent = totalSellingValue > 0 ? (potentialProfit / totalSellingValue) * 100 : 0

    return {
      totalItems: data?.length || 0,
      totalPhysicalUnits,
      totalCostValue,
      totalSellingValue,
      potentialProfit,
      marginPercent,
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
      .select(
        `
        *,
        products!inner ( name, sku ),
        profiles:operator_id ( full_name ),
        approver:approved_by ( full_name ),
        stock_batches ( lot_number, expiration_date )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)

    if (movementType && movementType !== 'ALL') {
      query = query.eq('movement_type', movementType)
    }

    if (params.reasonCode && params.reasonCode !== 'ALL') {
      query = query.eq('reason_code', params.reasonCode)
    }

    if (params.costCenterId && params.costCenterId !== 'ALL') {
      query = query.eq('cost_center_id', params.costCenterId)
    }

    if (search?.trim()) {
      const q = search.trim()
      query = query.or(
        `notes.ilike.%${q}%,products.name.ilike.%${q}%,products.sku.ilike.%${q}%,` +
          `reason_code.ilike.%${q}%,cost_center_code.ilike.%${q}%,lot_number.ilike.%${q}%`
      )
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
      reason_code: item.reason_code ?? null,
      reason_detail: item.reason_detail ?? null,
      cost_center_id: item.cost_center_id ?? null,
      cost_center_code: item.cost_center_code ?? null,
      operator_id: item.operator_id ?? null,
      operator_registration: item.operator_registration ?? null,
      approved_by: item.approved_by ?? null,
      approved_by_registration: item.approved_by_registration ?? null,
      approved_at: item.approved_at ?? null,
      product_name: item.products?.name || 'Produto',
      product_sku: item.products?.sku || '',
      user_name: item.profiles?.full_name || 'Sistema',
      approver_name: item.approver?.full_name || null,
      batch_lot_number: item.stock_batches?.lot_number ?? null,
      batch_expiration_date: item.stock_batches?.expiration_date ?? null,
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

  /**
   * Lancamento atomico de movimentacao (saldo + lote + trilha de auditoria).
   * Delega ao RPC `apply_stock_movement`, que trava a linha do saldo com
   * FOR UPDATE — o fluxo client-side anterior nao era transacional e perdia
   * escritas concorrentes.
   */
  async applyMovement(input: StockMovementInput): Promise<string> {
    const { data, error } = await supabase.rpc('apply_stock_movement', {
      p_product_id: input.productId,
      p_movement_type: input.movementType,
      p_quantity: input.quantity,
      p_batch_id: input.batchId || null,
      p_lot_number: input.lotNumber || null,
      p_expiration_date: input.expirationDate || null,
      p_unit_cost: input.unitCost ?? null,
      p_reason_code: input.reasonCode || null,
      p_reason_detail: input.reasonDetail || null,
      p_cost_center_id: input.costCenterId || null,
      p_notes: input.notes || null,
      p_approved_by: input.approvedBy || null,
    })

    if (error) throw error
    return data as string
  },

  /**
   * @deprecated Use `applyMovement`. Mantido para compatibilidade; agora
   * delega ao RPC em vez de escrever direto nas tabelas.
   */
  async createManualMovement(params: {
    storeId: string
    productId: string
    movementType: StockMovementType
    quantity: number
    notes?: string
    batchId?: string
    unitCost?: number
  }): Promise<void> {
    const movementId = await inventoryService.applyMovement({
      productId: params.productId,
      movementType: params.movementType,
      quantity: Math.abs(params.quantity),
      batchId: params.batchId,
      unitCost: params.unitCost,
      notes: params.notes,
    })

    auditService.logAction({
      storeId: params.storeId,
      action: `STOCK_MOVEMENT_${params.movementType}`,
      entity: 'stock_movements',
      entityId: movementId,
      afterData: {
        productId: params.productId,
        movementType: params.movementType,
        quantity: Math.abs(params.quantity),
        notes: params.notes,
      },
    })
  },

  async getCostCenters(storeId: string): Promise<CostCenter[]> {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getLossReasons(): Promise<LossReason[]> {
    const { data, error } = await supabase
      .from('loss_reasons')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Importacao em lote de movimentacoes. Cada linha e lancada individualmente
   * pelo RPC, de modo que uma linha invalida nao derruba as demais.
   */
  async importMovementsBulk(
    storeId: string,
    rows: StockMovementInput[]
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    const errors: string[] = []
    let successCount = 0

    for (const [index, row] of rows.entries()) {
      try {
        await inventoryService.applyMovement(row)
        successCount += 1
      } catch (err: any) {
        errors.push(`Linha ${index + 1}: ${err?.message || 'falha ao lançar a movimentação'}`)
      }
    }

    if (successCount > 0) {
      auditService.logAction({
        storeId,
        action: 'STOCK_MOVEMENTS_BULK_IMPORT',
        entity: 'stock_movements',
        entityId: storeId,
        afterData: { successCount, errorCount: errors.length },
      })
    }

    return { successCount, errorCount: errors.length, errors }
  },

  /**
   * Disposicao mais recente de cada lote, indexada por batch_id para
   * sobrepor a tabela da tela /expiration sem N+1.
   */
  async getBatchDispositions(
    storeId: string
  ): Promise<Record<string, { action: ExpirationAction; note: string | null; created_at: string }>> {
    const { data, error } = await supabase
      .from('latest_batch_dispositions')
      .select('batch_id, action, note, created_at')
      .eq('store_id', storeId)
    if (error) throw error

    const map: Record<
      string,
      { action: ExpirationAction; note: string | null; created_at: string }
    > = {}
    for (const row of data || []) {
      map[row.batch_id as string] = {
        action: row.action as ExpirationAction,
        note: (row.note as string | null) ?? null,
        created_at: row.created_at as string,
      }
    }
    return map
  },

  /**
   * Justifica o status de um alerta de validade. A RPC grava a disposicao e a
   * trilha de auditoria na mesma transacao.
   */
  async setBatchDisposition(params: {
    batchId: string
    action: ExpirationAction
    note?: string
  }): Promise<void> {
    const { error } = await supabase.rpc('set_batch_disposition', {
      p_batch_id: params.batchId,
      p_action: params.action,
      p_note: params.note?.trim() || null,
    })
    if (error) throw error
  },

  /**
   * Remove a justificativa vigente do lote (a mais recente). O historico
   * anterior permanece em `batch_dispositions`; so a linha mostrada na tela
   * deixa de existir.
   */
  async clearBatchDisposition(batchId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('clear_batch_disposition', {
      p_batch_id: batchId,
    })
    if (error) throw error
    return data === true
  },

  /**
   * Remove produto zerado (apenas quando quantity <= 0)
   */
  async deleteZeroStockProduct(storeId: string, productId: string): Promise<void> {
    const { data: balance, error: balErr } = await supabase
      .from('stock_balances')
      .select('quantity, available_quantity')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .maybeSingle()

    if (balErr) throw balErr
    if (balance && (balance.quantity > 0 || balance.available_quantity > 0)) {
      throw new Error('Apenas produtos com saldo zerado (0) podem ser removidos do estoque.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { error: delErr } = await supabase
      .from('products')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null,
      })
      .eq('store_id', storeId)
      .eq('id', productId)

    if (delErr) throw delErr

    auditService.logAction({
      storeId,
      action: 'ZERO_STOCK_PRODUCT_REMOVED',
      entity: 'products',
      entityId: productId,
    })
  },

  /**
   * Remove em lote múltiplos produtos com saldo zerado (<= 0)
   */
  async deleteZeroStockProductsBulk(storeId: string, productIds?: string[]): Promise<{ count: number }> {
    let query = supabase
      .from('stock_balances')
      .select('product_id, quantity')
      .eq('store_id', storeId)
      .lte('quantity', 0)

    if (productIds && productIds.length > 0) {
      query = query.in('product_id', productIds)
    }

    const { data: zeroBalances, error } = await query
    if (error) throw error

    const targetProductIds = (zeroBalances || []).map((b: any) => b.product_id)
    if (targetProductIds.length === 0) {
      return { count: 0 }
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error: delErr } = await supabase
      .from('products')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null,
      })
      .eq('store_id', storeId)
      .in('id', targetProductIds)

    if (delErr) throw delErr

    auditService.logAction({
      storeId,
      action: 'ZERO_STOCK_PRODUCTS_REMOVED',
      entity: 'products',
      afterData: { count: targetProductIds.length, productIds: targetProductIds },
    })

    return { count: targetProductIds.length }
  },

  /**
   * Entrada de estoque em lote para múltiplos produtos selecionados
   */
  async addBulkStock(
    storeId: string,
    items: {
      productId: string
      quantity: number
      unitCost?: number
      lotNumber?: string
      expirationDate?: string
      notes?: string
    }[]
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    const errors: string[] = []
    let successCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.quantity || item.quantity <= 0) continue

      try {
        await inventoryService.applyMovement({
          productId: item.productId,
          movementType: 'ENTRY',
          quantity: item.quantity,
          unitCost: item.unitCost,
          lotNumber: item.lotNumber,
          expirationDate: item.expirationDate,
          notes: item.notes || 'Entrada em lote manual',
        })
        successCount++
      } catch (err: any) {
        errors.push(`Item ${i + 1}: ${err?.message || 'Falha ao adicionar estoque'}`)
      }
    }

    if (successCount > 0) {
      auditService.logAction({
        storeId,
        action: 'STOCK_BULK_ENTRY',
        entity: 'stock_balances',
        afterData: { count: successCount, itemsCount: items.length },
      })
    }

    return { successCount, errorCount: errors.length, errors }
  },

  /**
   * Baixa de estoque em lote para múltiplos produtos selecionados
   */
  async writeoffBulkStock(
    storeId: string,
    items: {
      productId: string
      quantity: number
      batchId?: string | null
      lotNumber?: string | null
      expirationDate?: string | null
      unitCost?: number | null
    }[],
    common: {
      movementType: StockMovementType
      reasonCode: string
      reasonDetail?: string | null
      costCenterId: string
      approvedBy?: string | null
      notes?: string | null
    }
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    const errors: string[] = []
    let successCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.quantity || item.quantity <= 0) continue

      try {
        await inventoryService.applyMovement({
          productId: item.productId,
          movementType: common.movementType,
          quantity: item.quantity,
          batchId: item.batchId || null,
          lotNumber: item.lotNumber || null,
          expirationDate: item.expirationDate || null,
          unitCost: item.unitCost ?? null,
          reasonCode: common.reasonCode,
          reasonDetail: common.reasonDetail || null,
          costCenterId: common.costCenterId,
          notes: common.notes || null,
          approvedBy: common.approvedBy || null,
        })
        successCount++
      } catch (err: any) {
        errors.push(`Item ${i + 1}: ${err?.message || 'Falha ao processar baixa de estoque'}`)
      }
    }

    if (successCount > 0) {
      auditService.logAction({
        storeId,
        action: 'STOCK_BULK_WRITEOFF',
        entity: 'stock_balances',
        afterData: {
          count: successCount,
          itemsCount: items.length,
          movementType: common.movementType,
          reasonCode: common.reasonCode,
        },
      })
    }

    return { successCount, errorCount: errors.length, errors }
  },
}
