import { useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

export function useRealtimeSubscriptions(storeId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isSupabaseConfigured || !storeId || storeId === 'all') return

    // 1. Stock balances changes channel
    const stockChannel = supabase
      .channel(`realtime-stock-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_balances',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
          queryClient.invalidateQueries({ queryKey: ['products', storeId] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
        }
      )
      .subscribe()

    // 2. Orders changes channel
    const ordersChannel = supabase
      .channel(`realtime-orders-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
        }
      )
      .subscribe()

    // 3. Notifications changes channel
    const notificationsChannel = supabase
      .channel(`realtime-notifications-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', storeId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(stockChannel)
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [storeId, queryClient])
}
