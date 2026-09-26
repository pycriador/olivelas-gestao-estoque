import { supabase } from '@/lib/supabase/client'

export interface AuditLog {
  id: string
  store_id: string | null
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AuditListParams {
  search?: string
  action?: string
  entity?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const auditService = {
  async listAuditLogs(
    storeId?: string,
    params: AuditListParams = {}
  ): Promise<{ data: AuditLog[]; total: number }> {
    const {
      search,
      action,
      entity,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,entity.ilike.%${search}%`)
    }

    if (action && action !== 'ALL') {
      query = query.eq('action', action)
    }

    if (entity && entity !== 'ALL') {
      query = query.eq('entity', entity)
    }

    const orderCol = ['created_at', 'action', 'entity'].includes(sortBy)
      ? sortBy
      : 'created_at'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error
    return {
      data: (data || []) as AuditLog[],
      total: count || 0,
    }
  },

  async logAction(params: {
    storeId?: string | null
    action: string
    entity: string
    entityId?: string | null
    beforeData?: Record<string, unknown> | null
    afterData?: Record<string, unknown> | null
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('audit_logs').insert({
      store_id: params.storeId || null,
      user_id: user?.id || null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId || null,
      before_data: params.beforeData || null,
      after_data: params.afterData || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
  },
}
