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
  user_agent: string | null
  created_at: string
  user_name?: string
  user_email?: string
  store_name?: string
  store_slug?: string
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
      .select(`
        *,
        profiles (
          id,
          full_name,
          email
        ),
        stores (
          id,
          name,
          slug
        )
      `, { count: 'exact' })

    if (storeId && storeId !== 'all' && storeId !== 'global') {
      query = query.eq('store_id', storeId)
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,entity.ilike.%${search}%,entity_id.ilike.%${search}%`)
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

    const mapped = (data || []).map((item: any) => ({
      id: item.id,
      store_id: item.store_id,
      user_id: item.user_id,
      action: item.action,
      entity: item.entity,
      entity_id: item.entity_id,
      before_data: item.before_data,
      after_data: item.after_data,
      ip_address: item.ip_address,
      user_agent: item.user_agent,
      created_at: item.created_at,
      user_name: item.profiles?.full_name || null,
      user_email: item.profiles?.email || null,
      store_name: item.stores?.name || (item.store_id ? 'Loja' : 'Global / Sistema'),
      store_slug: item.stores?.slug || '',
    }))

    return {
      data: mapped,
      total: count || mapped.length,
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
    try {
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
    } catch (err) {
      console.warn('Audit logging failed silently:', err)
    }
  },
}
