import { supabase } from '@/lib/supabase/client'
import { checkExpirationStatus } from '@/utils/dates'
import { auditService } from '@/services/auditService'
import { buildAccentRegex } from '@/utils/productUtils'
import type {
  CostCenter,
  LossReason,
  StockBalance,
  StockBatch,
  StockMovement,
  StockMovementInput,
  StockTransfer,
  StockTransferCreateInput,
  StockWriteoffRequest,
} from '@/types/inventory.types'
import type { StockMovementType } from '@/types/database.types'

export interface StockBalanceListParams {
  search?: string
  stockStatus?: 'all' | 'in' | 'out'
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

    let productIds: string[] | null = null

    if (search?.trim()) {
      const q = search.trim()
      const pattern = buildAccentRegex(q)
      let prodQuery = supabase
        .from('products')
        .select('id')
        .is('deleted_at', null)
        .or(`name.imatch.${pattern},sku.imatch.${pattern}`)

      if (storeId && storeId !== 'all') {
        prodQuery = prodQuery.eq('store_id', storeId)
      }

      const { data: matched, error: matchErr } = await prodQuery
      if (matchErr) throw matchErr
      productIds = (matched || []).map((p: any) => p.id)

      if (productIds.length === 0) {
        return { data: [], total: 0 }
      }
    }

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
          controls_batch,
          controls_expiration,
          supplier_id,
          deleted_at,
          suppliers ( id, corporate_name, trade_name ),
          product_images ( public_url, is_primary, display_order )
        )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)
      .is('products.deleted_at', null)

    if (params.stockStatus === 'in') {
      query = query.gt('quantity', 0)
    } else if (params.stockStatus === 'out') {
      query = query.lte('quantity', 0)
    }

    if (productIds) {
      query = query.in('product_id', productIds)
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
      const supplier = Array.isArray(prod?.suppliers) ? prod?.suppliers[0] : prod?.suppliers
      const imgs = Array.isArray(prod?.product_images) ? prod.product_images : []
      const primaryImg = imgs.find((i: any) => i.is_primary) || imgs[0]
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
        supplier_id: prod?.supplier_id || null,
        supplier_name: supplier?.trade_name || supplier?.corporate_name || null,
        controls_batch: Boolean(prod?.controls_batch),
        controls_expiration: Boolean(prod?.controls_expiration),
        product_image_url: primaryImg?.public_url || null,
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
      const pattern = buildAccentRegex(q)
      let prodQuery = supabase
        .from('products')
        .select('id')
        .is('deleted_at', null)
        .or(`name.imatch.${pattern},sku.imatch.${pattern}`)

      if (storeId && storeId !== 'all') {
        prodQuery = prodQuery.eq('store_id', storeId)
      }

      const { data: matchedProds } = await prodQuery
      const matchedProductIds = (matchedProds || []).map((p: any) => p.id)

      let batchQuery = supabase
        .from('stock_batches')
        .select('id')
        .or(`lot_number.imatch.${pattern}`)

      if (storeId && storeId !== 'all') {
        batchQuery = batchQuery.eq('store_id', storeId)
      }

      const { data: matchedBatches } = await batchQuery
      const matchedBatchIds = (matchedBatches || []).map((b: any) => b.id)

      const orConditions = [
        `notes.imatch.${pattern}`,
        `reason_code.imatch.${pattern}`,
        `cost_center_code.imatch.${pattern}`,
      ]

      if (matchedProductIds.length > 0) {
        orConditions.push(`product_id.in.(${matchedProductIds.join(',')})`)
      }

      if (matchedBatchIds.length > 0) {
        orConditions.push(`batch_id.in.(${matchedBatchIds.join(',')})`)
      }

      query = query.or(orConditions.join(','))
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
        products (
          name,
          product_images ( public_url, is_primary, display_order )
        )
      `)
      .eq('store_id', storeId)
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (allErr) throw allErr

    const mapped = (allData || []).map((item: any) => {
      const imgs = Array.isArray(item.products?.product_images) ? item.products.product_images : []
      const primaryImg = imgs.find((i: any) => i.is_primary) || imgs[0]
      return {
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
        product_image_url: primaryImg?.public_url || null,
        expirationInfo: checkExpirationStatus(item.expiration_date),
      }
    })

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

  async createManualMovement(params: {
    storeId: string
    productId: string
    movementType: StockMovementType
    quantity: number
    notes?: string
    batchId?: string
    lotNumber?: string
    expirationDate?: string
    unitCost?: number
    sellingPrice?: number
    supplierId?: string
  }): Promise<void> {
    const movementId = await inventoryService.applyMovement({
      productId: params.productId,
      movementType: params.movementType,
      quantity: Math.abs(params.quantity),
      batchId: params.batchId,
      lotNumber: params.lotNumber,
      expirationDate: params.expirationDate,
      unitCost: params.unitCost,
      notes: params.notes,
    })

    // Sincronizar precos e fornecedor no catalogo do produto para refletir de imediato no PDV e Estoque
    const productUpdates: Record<string, any> = {}
    if (typeof params.unitCost === 'number' && params.unitCost > 0) {
      productUpdates.cost_price = params.unitCost
    }
    if (typeof params.sellingPrice === 'number' && params.sellingPrice > 0) {
      productUpdates.selling_price = params.sellingPrice
    }
    if (params.supplierId) {
      productUpdates.supplier_id = params.supplierId
    }

    if (Object.keys(productUpdates).length > 0) {
      productUpdates.updated_at = new Date().toISOString()
      await supabase
        .from('products')
        .update(productUpdates)
        .eq('id', params.productId)
        .eq('store_id', params.storeId)
    }

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
        unitCost: params.unitCost,
        sellingPrice: params.sellingPrice,
        lotNumber: params.lotNumber,
        expirationDate: params.expirationDate,
        supplierId: params.supplierId,
      },
    })
  },

  /**
   * Obtém a rastreabilidade completa de um produto:
   * - Dados cadastrais e precos atuais
   * - Fornecedor principal e contatos
   * - Todos os lotes ativos com validades e precos de custo
   * - Historico de entradas / compras recentes
   */
  async getProductStockTraceability(
    storeId: string,
    productId: string
  ): Promise<import('@/types/inventory.types').ProductStockTraceability> {
    // 1. Dados do produto + Fornecedor
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        cost_price,
        selling_price,
        unit,
        controls_batch,
        controls_expiration,
        min_stock,
        supplier_id,
        suppliers (
          id,
          corporate_name,
          trade_name,
          document,
          phone,
          email,
          contact_name
        )
      `)
      .eq('id', productId)
      .eq('store_id', storeId)
      .single()

    if (prodErr) throw prodErr

    const supplier = Array.isArray(prodData.suppliers) ? prodData.suppliers[0] : prodData.suppliers

    // 2. Lotes do produto nesta loja
    const { data: batchesData, error: batchErr } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .order('expiration_date', { ascending: true, nullsFirst: false })

    if (batchErr) throw batchErr

    // 3. Entradas recentes no estoque
    const { data: movsData, error: movsErr } = await supabase
      .from('stock_movements')
      .select(`
        id,
        created_at,
        quantity,
        unit_cost,
        movement_type,
        reference_type,
        notes,
        stock_batches ( lot_number, expiration_date )
      `)
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .in('movement_type', ['ENTRY', 'RETURN', 'ADJUSTMENT'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (movsErr) throw movsErr

    const recentEntries = (movsData || []).map((m: any) => ({
      id: m.id,
      created_at: m.created_at,
      quantity: Number(m.quantity),
      unit_cost: m.unit_cost ? Number(m.unit_cost) : null,
      movement_type: m.movement_type,
      reference_type: m.reference_type,
      notes: m.notes,
      lot_number: m.stock_batches?.lot_number || null,
      expiration_date: m.stock_batches?.expiration_date || null,
    }))

    return {
      product: {
        id: prodData.id,
        name: prodData.name,
        sku: prodData.sku,
        cost_price: Number(prodData.cost_price) || 0,
        selling_price: Number(prodData.selling_price) || 0,
        unit: prodData.unit || 'UN',
        controls_batch: Boolean(prodData.controls_batch),
        controls_expiration: Boolean(prodData.controls_expiration),
        min_stock: Number(prodData.min_stock) || 0,
      },
      supplier: supplier || null,
      batches: (batchesData || []).map((b: any) => ({
        id: b.id,
        store_id: b.store_id,
        product_id: b.product_id,
        lot_number: b.lot_number,
        quantity: Number(b.quantity),
        cost_price: b.cost_price ? Number(b.cost_price) : null,
        manufacturing_date: b.manufacturing_date,
        expiration_date: b.expiration_date,
        status: b.status,
        created_at: b.created_at,
      })),
      recentEntries,
    }
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
   * Importacao em lote de movimentacoes e saldos. Suporta movimentações avulsas
   * e reimportação de planilhas de saldos com atualização de preços e estoque mínimo.
   */
  async importMovementsBulk(
    storeId: string,
    rows: (StockMovementInput & {
      sellingPrice?: number | null
      minStock?: number | null
      isBalanceImport?: boolean
    })[]
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    const errors: string[] = []
    let successCount = 0

    const { data: authData } = await supabase.auth.getUser()
    const currentUserId = authData?.user?.id || null

    for (const [index, row] of rows.entries()) {
      try {
        // 1. Sincronizar preços e estoque mínimo na tabela products se informados
        const productUpdates: Record<string, any> = {}
        if (typeof row.unitCost === 'number' && !isNaN(row.unitCost) && row.unitCost >= 0) {
          productUpdates.cost_price = row.unitCost
        }
        if (typeof row.sellingPrice === 'number' && !isNaN(row.sellingPrice) && row.sellingPrice >= 0) {
          productUpdates.selling_price = row.sellingPrice
        }
        if (typeof row.minStock === 'number' && !isNaN(row.minStock) && row.minStock >= 0) {
          productUpdates.min_stock = row.minStock
        }

        if (Object.keys(productUpdates).length > 0) {
          productUpdates.updated_at = new Date().toISOString()
          const { error: prodUpdateErr } = await supabase
            .from('products')
            .update(productUpdates)
            .eq('id', row.productId)
            .eq('store_id', storeId)

          if (prodUpdateErr) {
            console.error('Falha ao atualizar produto na importação:', prodUpdateErr)
          }

          // Atualizar também o updated_at em stock_balances para colocar o registro
          // no topo da visualização padrão de estoque (ordenada por updated_at desc)
          await supabase
            .from('stock_balances')
            .update({ updated_at: new Date().toISOString() })
            .eq('product_id', row.productId)
            .eq('store_id', storeId)
        }

        // 2. Movimentação ou ajuste de saldo
        if (row.isBalanceImport || row.movementType === 'ADJUSTMENT') {
          // Consultar saldo físico atual
          const { data: balanceRecord } = await supabase
            .from('stock_balances')
            .select('id, quantity')
            .eq('store_id', storeId)
            .eq('product_id', row.productId)
            .maybeSingle()

          const currentQty = balanceRecord ? Number(balanceRecord.quantity || 0) : 0
          const targetQty = Number(row.quantity)

          if (Math.abs(targetQty - currentQty) > 0.0001) {
            if (targetQty > 0) {
              await inventoryService.applyMovement({
                ...row,
                movementType: 'ADJUSTMENT',
                quantity: targetQty,
              })
            } else {
              // Ajuste para saldo 0 (zerado)
              if (balanceRecord) {
                await supabase
                  .from('stock_balances')
                  .update({ quantity: 0, updated_at: new Date().toISOString() })
                  .eq('id', balanceRecord.id)
              } else {
                await supabase
                  .from('stock_balances')
                  .insert({ store_id: storeId, product_id: row.productId, quantity: 0, reserved_quantity: 0 })
              }

              // Registrar histórico de auditoria do movimento
              await supabase.from('stock_movements').insert({
                store_id: storeId,
                product_id: row.productId,
                movement_type: 'ADJUSTMENT',
                quantity: currentQty,
                previous_quantity: currentQty,
                new_quantity: 0,
                unit_cost: row.unitCost ?? null,
                notes: row.notes || 'Ajuste de saldo zerado via importação',
                user_id: currentUserId,
              })
            }
          }
          // Se Math.abs(targetQty - currentQty) <= 0.0001: saldo não mudou, produto já foi atualizado
        } else {
          await inventoryService.applyMovement(row)
        }

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

  /**
   * Lista solicitações de baixa de estoque (pendentes, aprovadas ou rejeitadas)
   */
  async listWriteoffRequests(
    storeId: string,
    status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL'
  ): Promise<StockWriteoffRequest[]> {
    let query = supabase
      .from('stock_writeoff_requests')
      .select(`
        *,
        products ( name, sku, unit ),
        stock_batches ( lot_number, expiration_date ),
        cost_centers ( code, name ),
        requester:requested_by ( full_name, email ),
        reviewer:reviewed_by ( full_name )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any) => {
      const lotNum = row.lot_number || row.stock_batches?.lot_number || null
      const expDate = row.expiration_date || row.stock_batches?.expiration_date || null
      const prodName = row.products?.name || 'Produto'
      const prodSku = row.products?.sku || ''
      const reqByName = row.requester?.full_name || 'Operador'
      const revByName = row.reviewer?.full_name || null
      return {
        id: row.id,
        store_id: row.store_id,
        product_id: row.product_id,
        batch_id: row.batch_id,
        lot_number: lotNum,
        expiration_date: expDate,
        movement_type: row.movement_type,
        quantity: Number(row.quantity),
        unit_cost: row.unit_cost !== null ? Number(row.unit_cost) : null,
        reason_code: row.reason_code,
        reason_detail: row.reason_detail ?? null,
        cost_center_id: row.cost_center_id,
        notes: row.notes ?? null,
        status: row.status,
        requested_by: row.requested_by,
        requested_by_name: reqByName,
        requested_by_registration: row.requested_by_registration ?? null,
        reviewed_by: row.reviewed_by,
        reviewed_by_name: revByName,
        reviewed_by_registration: row.reviewed_by_registration ?? null,
        reviewed_at: row.reviewed_at ?? null,
        rejection_reason: row.rejection_reason ?? null,
        movement_id: row.movement_id ?? null,
        created_at: row.created_at,
        product_name: prodName,
        product_sku: prodSku,
        product_unit: row.products?.unit || 'UN',
        cost_center_code: row.cost_centers?.code || '',
        cost_center_name: row.cost_centers?.name || '',
        // CamelCase fields
        productName: prodName,
        productSku: prodSku,
        batchLotNumber: lotNum,
        movementType: row.movement_type,
        reasonCode: row.reason_code,
        reasonDetail: row.reason_detail ?? null,
        requestedByName: reqByName,
        requestedByRegistration: row.requested_by_registration ?? null,
        reviewedByName: revByName,
        reviewedByRegistration: row.reviewed_by_registration ?? null,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at ?? null,
      }
    })
  },

  /**
   * Registra uma solicitação de baixa de estoque para aprovação posterior por um STOCK_APPROVER
   */
  async createWriteoffRequest(
    storeId: string,
    input: {
      productId: string
      batchId?: string | null
      movementType?: StockMovementType
      quantity: number
      unitCost?: number | null
      reasonCode: string
      reasonDetail?: string | null
      costCenterId: string
      notes?: string | null
    }
  ): Promise<StockWriteoffRequest> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('stock_writeoff_requests')
      .insert({
        store_id: storeId,
        product_id: input.productId,
        batch_id: input.batchId || null,
        movement_type: input.movementType || 'LOSS',
        quantity: Math.abs(input.quantity),
        unit_cost: input.unitCost ?? null,
        reason_code: input.reasonCode,
        reason_detail: input.reasonDetail?.trim() || null,
        cost_center_id: input.costCenterId,
        notes: input.notes?.trim() || null,
        status: 'PENDING',
        requested_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'STOCK_WRITEOFF_REQUEST_CREATED',
      entity: 'stock_writeoff_requests',
      entityId: data.id,
      afterData: input,
    })

    return data as StockWriteoffRequest
  },

  /**
   * Aprova ou rejeita uma solicitação de baixa de estoque pendente.
   * Somente usuários com permissão de aprovador de baixa (`can_user_approve_writeoff`) podem executar.
   */
  async reviewWriteoffRequest(params: {
    requestId: string
    decision: 'APPROVED' | 'REJECTED'
    approverPin?: string | null
    rejectionReason?: string | null
  }): Promise<{ status: string; movement_id: string | null }> {
    const { data, error } = await supabase.rpc('review_stock_writeoff_request', {
      p_request_id: params.requestId,
      p_decision: params.decision,
      p_approver_pin: params.approverPin?.trim() || null,
      p_rejection_reason: params.rejectionReason?.trim() || null,
    })

    if (error) throw error
    return data as { status: string; movement_id: string | null }
  },

  /**
   * Lista transferências / remessas de estoque entre lojas/filiais (sem venda)
   */
  async listStockTransfers(storeId: string): Promise<StockTransfer[]> {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select(`
        *,
        source_store:source_store_id ( id, name, branch_code ),
        destination_store:destination_store_id ( id, name, branch_code ),
        creator:created_by ( full_name ),
        stock_transfer_items (
          id,
          transfer_id,
          source_product_id,
          destination_product_id,
          product_sku,
          product_name,
          unit,
          source_batch_id,
          destination_batch_id,
          lot_number,
          expiration_date,
          quantity,
          unit_cost,
          selling_price,
          created_at
        )
      `)
      .or(`source_store_id.eq.${storeId},destination_store_id.eq.${storeId}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((row: any) => {
      const code = row.transfer_number || row.transfer_code || 'TRF'
      const fromName = row.source_store?.name || 'Matriz'
      const toName = row.destination_store?.name || 'Filial'
      const totalItems = Number(row.total_items) || 0
      const totalQty = Number(row.total_quantity) || 0
      const totalCost = Number(row.total_cost_value) || 0
      const totalSelling = Number(row.total_selling_value) || 0
      const creatorName = row.creator?.full_name || 'Administrador'

      return {
        id: row.id,
        transfer_number: code,
        source_store_id: row.source_store_id,
        source_store_name: fromName,
        destination_store_id: row.destination_store_id,
        destination_store_name: toName,
        destination_branch_code: row.destination_store?.branch_code || null,
        status: row.status,
        total_items: totalItems,
        total_quantity: totalQty,
        total_cost_value: totalCost,
        total_selling_value: totalSelling,
        notes: row.notes ?? null,
        driver_or_carrier: row.driver_or_carrier ?? null,
        created_by: row.created_by ?? null,
        created_by_name: creatorName,
        approved_by: row.approved_by ?? null,
        received_by: row.received_by ?? null,
        created_at: row.created_at,
        completed_at: row.completed_at ?? null,
        // CamelCase convenience fields
        transferCode: code,
        fromStoreId: row.source_store_id,
        fromStoreName: fromName,
        toStoreId: row.destination_store_id,
        toStoreName: toName,
        totalItems,
        totalQuantity: totalQty,
        totalCostValue: totalCost,
        totalSellingValue: totalSelling,
        createdAt: row.created_at,
        approvedByName: creatorName,
        requestedByName: creatorName,
        items: (row.stock_transfer_items || []).map((it: any) => ({
          id: it.id,
          transfer_id: it.transfer_id,
          source_product_id: it.source_product_id,
          destination_product_id: it.destination_product_id,
          product_sku: it.product_sku || '',
          product_name: it.product_name || 'Produto',
          unit: it.unit || 'UN',
          source_batch_id: it.source_batch_id,
          destination_batch_id: it.destination_batch_id,
          lot_number: it.lot_number ?? null,
          expiration_date: it.expiration_date ?? null,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost) || 0,
          selling_price: Number(it.selling_price) || 0,
          created_at: it.created_at,
          productName: it.product_name || 'Produto',
          productSku: it.product_sku || '',
        })),
      }
    })
  },

  /**
   * Executa remessa/transferência de produtos do estoque para uma filial sem necessidade de venda.
   * O produto é debitado da loja de origem e creditado automaticamente na filial de destino para venda lá.
   */
  async executeStockTransferToBranch(
    sourceStoreId: string,
    input: StockTransferCreateInput
  ): Promise<{
    transfer_id: string
    transfer_code: string
    total_items: number
    total_cost_value: number
  }> {
    const carrierInfo = [
      input.driverOrCarrier,
      input.driverName,
      input.vehiclePlate ? `Placa: ${input.vehiclePlate.trim().toUpperCase()}` : null,
    ]
      .filter(Boolean)
      .join(' • ')

    const { data, error } = await supabase.rpc('execute_stock_transfer_to_branch', {
      p_source_store_id: sourceStoreId,
      p_destination_store_id: input.destinationStoreId,
      p_items: input.items.map((i) => ({
        productId: i.productId,
        batchId: i.batchId || null,
        lotNumber: i.lotNumber || null,
        expirationDate: i.expirationDate || null,
        quantity: Number(i.quantity),
        unitCost: i.unitCost ?? null,
        sellingPrice: i.sellingPrice ?? null,
      })),
      p_notes: input.notes?.trim() || null,
      p_driver_or_carrier: carrierInfo || null,
    })

    if (error) throw error

    const totalCost = input.items.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0),
      0
    )

    return {
      transfer_id: String(data),
      transfer_code: `TRF-${String(data).slice(0, 6).toUpperCase()}`,
      total_items: input.items.length,
      total_cost_value: totalCost,
    }
  },
}
