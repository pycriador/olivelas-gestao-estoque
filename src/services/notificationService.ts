import { supabase } from '@/lib/supabase/client'

export interface AppNotification {
  id: string
  store_id: string
  user_id: string | null
  type: string
  title: string
  message: string
  metadata: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface NotificationListParams {
  search?: string
  isRead?: boolean
  page?: number
  pageSize?: number
}

export const notificationService = {
  async listNotifications(
    storeId: string,
    params: NotificationListParams = {}
  ): Promise<{ data: AppNotification[]; total: number }> {
    const { search, isRead, page = 1, pageSize = 20 } = params

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
}
