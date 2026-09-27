import { supabase } from '@/lib/supabase/client'

export interface AppNotification {
  id: string
  store_id: string
  /** NULL em alertas automaticos, que sao da loja inteira. */
  user_id: string | null
  type: string
  title: string
  message: string
  metadata: Record<string, unknown> | null
  is_read: boolean
  created_at: string
  /** 1=info, 2=atencao, 3=critico. */
  severity?: number
  /** MANUAL (criada no app) ou AUTO (gerada por generate_stock_alerts). */
  source?: string
}

export interface StockAlertSummary {
  expiring7d: number
  expiring30d: number
  lowStock: number
  outOfStock: number
  reorder: number
}

export interface NotificationListParams {
  search?: string
  isRead?: boolean
  type?: string
  page?: number
  pageSize?: number
}

export const notificationService = {
  async listNotifications(
    storeId: string,
    params: NotificationListParams = {}
  ): Promise<{ data: AppNotification[]; total: number }> {
    const { search, isRead, type, page = 1, pageSize = 20 } = params

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`)
    }

    if (typeof isRead === 'boolean') {
      query = query.eq('is_read', isRead)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    return {
      data: (data || []) as AppNotification[],
      total: count || 0,
    }
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) throw error
  },

  async markAllAsRead(storeId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('store_id', storeId)

    if (error) throw error
  },

  /**
   * Dispara a sincronizacao dos alertas automaticos de validade/estoque no
   * servidor. A RPC e idempotente, entao pode ser chamada a cada visita a tela.
   */
  async generateStockAlerts(storeId: string): Promise<StockAlertSummary> {
    const { data, error } = await supabase.rpc('generate_stock_alerts', {
      p_store_id: storeId,
    })
    if (error) throw error

    const row = (Array.isArray(data) ? data[0] : data) as
      | Record<string, number | string | null>
      | null

    return {
      expiring7d: Number(row?.expiring_7d ?? 0),
      expiring30d: Number(row?.expiring_30d ?? 0),
      lowStock: Number(row?.low_stock ?? 0),
      outOfStock: Number(row?.out_of_stock ?? 0),
      reorder: Number(row?.reorder ?? 0),
    }
  },
}
