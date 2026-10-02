import { supabase } from '@/lib/supabase/client'

export interface ManagedTableInfo {
  tableName: string
  displayName: string
  primaryKey: string
  description: string
  supportsStoreFilter: boolean
}

export const MANAGED_TABLES: ManagedTableInfo[] = [
  { tableName: 'stores', displayName: 'Lojas (stores)', primaryKey: 'id', description: 'Tenants e filiais registradas na plataforma', supportsStoreFilter: false },
  { tableName: 'products', displayName: 'Produtos (products)', primaryKey: 'id', description: 'Catálogo mestre de SKUs e parâmetros operacionais', supportsStoreFilter: true },
  { tableName: 'categories', displayName: 'Categorias (categories)', primaryKey: 'id', description: 'Categorização mercadológica de produtos', supportsStoreFilter: true },
  { tableName: 'cost_centers', displayName: 'Centros de Custo (cost_centers)', primaryKey: 'id', description: 'Centros de custo operacionais e de perdas', supportsStoreFilter: true },
  { tableName: 'loss_reasons', displayName: 'Motivos de Baixa (loss_reasons)', primaryKey: 'code', description: 'Códigos de justificativa e regras de aprovação de perdas', supportsStoreFilter: false },
  { tableName: 'customers', displayName: 'Clientes (customers)', primaryKey: 'id', description: 'Base de clientes e dados de contato', supportsStoreFilter: true },
  { tableName: 'suppliers', displayName: 'Fornecedores (suppliers)', primaryKey: 'id', description: 'Cadastro de fornecedores de mercadorias', supportsStoreFilter: true },
  { tableName: 'stock_balances', displayName: 'Saldos de Estoque (stock_balances)', primaryKey: 'id', description: 'Posição física e disponível por produto', supportsStoreFilter: true },
  { tableName: 'stock_batches', displayName: 'Lotes de Estoque (stock_batches)', primaryKey: 'id', description: 'Lotes, datas de fabricação e validade', supportsStoreFilter: true },
  { tableName: 'stock_movements', displayName: 'Movimentações (stock_movements)', primaryKey: 'id', description: 'Histórico de entradas, saídas, perdas e ajustes', supportsStoreFilter: true },
  { tableName: 'orders', displayName: 'Pedidos de Venda (orders)', primaryKey: 'id', description: 'Vendas efetuadas em loja, PDV e canais', supportsStoreFilter: true },
  { tableName: 'purchase_orders', displayName: 'Ordens de Compra (purchase_orders)', primaryKey: 'id', description: 'Pedidos de compra de fornecedores', supportsStoreFilter: true },
]

export const dbManagerService = {
  async fetchTableRows(
    tableName: string,
    params: {
      storeId?: string
      search?: string
      page?: number
      pageSize?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    } = {}
  ): Promise<{ data: any[]; total: number; columns: string[] }> {
    const { storeId, page = 1, pageSize = 20, sortBy, sortOrder = 'asc' } = params

    let query = supabase.from(tableName).select('*', { count: 'exact' })

    const tableMeta = MANAGED_TABLES.find((t) => t.tableName === tableName)
    if (tableMeta?.supportsStoreFilter && storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId)
    }

    const orderColumn = sortBy || tableMeta?.primaryKey || 'created_at'
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderColumn, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    const rows = data || []
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    return {
      data: rows,
      total: count || rows.length,
      columns,
    }
  },

  async insertRow(tableName: string, rowData: Record<string, any>): Promise<any> {
    const { data, error } = await supabase.from(tableName).insert([rowData]).select().single()
    if (error) throw error
    return data
  },

  async updateRow(
    tableName: string,
    primaryKeyColumn: string,
    primaryKeyValue: string,
    updates: Record<string, any>
  ): Promise<any> {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq(primaryKeyColumn, primaryKeyValue)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteRow(tableName: string, primaryKeyColumn: string, primaryKeyValue: string): Promise<void> {
    const { error } = await supabase.from(tableName).delete().eq(primaryKeyColumn, primaryKeyValue)
    if (error) throw error
  },
}
