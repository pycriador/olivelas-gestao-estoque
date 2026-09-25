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

export const auditService = {
  async listAuditLogs(storeId?: string): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as AuditLog[]
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
