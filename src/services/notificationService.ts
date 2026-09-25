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

export const notificationService = {
  async listNotifications(storeId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return (data || []) as AppNotification[]
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
