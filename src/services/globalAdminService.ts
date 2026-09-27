import { supabase } from '@/lib/supabase/client'

/**
 * Entidades que o Admin Global pode excluir definitivamente.
 *
 * A lista e fechada de proposito: a RPC global_admin_delete valida o mesmo
 * conjunto, e aqui ela tambem define quais colunas cada entidade pode expor.
 * Nada de nome de tabela ou coluna vindo da UI.
 */
export const GLOBAL_DELETE_ENTITIES = [
  { value: 'orders', label: 'Pedido' },
  { value: 'stock_movements', label: 'Movimentação de estoque' },
  { value: 'products', label: 'Produto' },
  { value: 'customers', label: 'Cliente' },
  { value: 'suppliers', label: 'Fornecedor' },
  { value: 'purchase_orders', label: 'Compra' },
  { value: 'store_users', label: 'Membro da equipe' },
] as const

export type GlobalDeleteEntity = (typeof GLOBAL_DELETE_ENTITIES)[number]['value']

export interface GlobalEntityRow {
  id: string
  store_id: string
  store_name: string
  label: string
  detail: string
  created_at: string | null
}

interface EntitySpec {
  select: string
  /** Coluna usada na busca livre. */
  searchColumns: string[]
  /** Coluna com o titulo legivel do registro. */
  labelColumn: string
  /** Colunas extras mostradas na coluna "detalhe". */
  detailColumns: string[]
  labelFallback: string
}

const ENTITY_SPECS: Record<GlobalDeleteEntity, EntitySpec> = {
  orders: {
    select: 'id, store_id, order_number, total_amount, status, created_at',
    searchColumns: ['order_number'],
    labelColumn: 'order_number',
    detailColumns: ['status', 'total_amount'],
    labelFallback: 'Pedido',
  },
  stock_movements: {
    select: 'id, store_id, movement_type, quantity, product_id, created_at',
    searchColumns: ['movement_type'],
    labelColumn: 'movement_type',
    detailColumns: ['quantity'],
    labelFallback: 'Movimentação',
  },
  products: {
    select: 'id, store_id, name, sku, deleted_at, created_at',
    searchColumns: ['name', 'sku'],
    labelColumn: 'name',
    detailColumns: ['sku'],
    labelFallback: 'Produto',
  },
  customers: {
    select: 'id, store_id, name, document, created_at',
    searchColumns: ['name', 'document'],
    labelColumn: 'name',
    detailColumns: ['document'],
    labelFallback: 'Cliente',
  },
  suppliers: {
    select: 'id, store_id, name, document, created_at',
    searchColumns: ['name', 'document'],
    labelColumn: 'name',
    detailColumns: ['document'],
    labelFallback: 'Fornecedor',
  },
  purchase_orders: {
    select: 'id, store_id, order_number, status, total_amount, created_at',
    searchColumns: ['order_number'],
    labelColumn: 'order_number',
    detailColumns: ['status', 'total_amount'],
    labelFallback: 'Compra',
  },
  store_users: {
    select: 'id, store_id, user_id, role, created_at',
    searchColumns: ['role'],
    labelColumn: 'user_id',
    detailColumns: ['role'],
    labelFallback: 'Membro',
  },
}

export const globalAdminService = {
  /**
   * Lista registros de uma entidade em todas as lojas (ou em uma loja
   * especifica) para a tela de exclusao. A listagem e so de leitura; a
   * exclusao em si passa pela RPC.
   */
  async listEntities(
    entity: GlobalDeleteEntity,
    params: {
      storeId?: string
      search?: string
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ data: GlobalEntityRow[]; total: number }> {
    const { storeId, search, page = 1, pageSize = 20 } = params
    const spec = ENTITY_SPECS[entity]

    let query = supabase
      .from(entity)
      .select(`${spec.select}, stores ( id, name )`, { count: 'exact' })

    if (storeId && storeId !== 'all' && storeId !== 'global') {
      query = query.eq('store_id', storeId)
    }

    if (search && search.trim()) {
      const term = search.trim().replace(/[%,()]/g, ' ')
      if (term) {
        query = query.or(spec.searchColumns.map((c) => `${c}.ilike.%${term}%`).join(','))
      }
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    const rows: GlobalEntityRow[] = (data || []).map((row: any) => {
      const storeName = row.stores?.name || 'Loja'
      const rawLabel = row[spec.labelColumn]
      // store_users lista por user_id, que nao e legivel: cai no rotulo fixo.
      const label =
        entity === 'store_users'
          ? `${spec.labelFallback} · ${String(rawLabel).slice(0, 8)}`
          : String(rawLabel || spec.labelFallback)

      const detail = spec.detailColumns
        .map((c) => {
          const value = row[c]
          if (value === null || value === undefined) return null
          if (typeof value === 'number' && c === 'total_amount') {
            return `R$ ${value.toFixed(2)}`
          }
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return null
          return `${c}: ${value}`
        })
        .filter(Boolean)
        .join(' · ')

      return {
        id: row.id,
        store_id: row.store_id,
        store_name: storeName,
        label,
        detail,
        created_at: row.created_at || null,
      }
    })

    return { data: rows, total: count || rows.length }
  },

  /**
   * Exclusao definitiva cross-store. Sem justificativa; a RPC grava a trilha
   * em audit_logs na mesma transacao e devolve um resumo do que foi removido.
   */
  async hardDelete(entity: GlobalDeleteEntity, id: string): Promise<string> {
    const { data, error } = await supabase.rpc('global_admin_delete', {
      p_entity: entity,
      p_id: id,
    })
    if (error) throw error
    return typeof data === 'string' ? data : 'Registro removido.'
  },
}
