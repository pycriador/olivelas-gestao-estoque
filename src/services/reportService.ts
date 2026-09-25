import { supabase } from '@/lib/supabase/client'

export const reportService = {
  async getDashboardMetrics(storeId: string) {
    const today = new Date().toISOString().slice(0, 10)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    // 1. Sales today
    const { data: salesToday } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('store_id', storeId)
      .gte('created_at', today)
      .neq('status', 'CANCELLED')

    const salesTodayTotal = (salesToday || []).reduce((acc: number, o: any) => acc + Number(o.total_amount), 0)

    // 2. Sales this month
    const { data: salesMonth } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('store_id', storeId)
      .gte('created_at', firstDayOfMonth)
      .neq('status', 'CANCELLED')

    const salesMonthTotal = (salesMonth || []).reduce((acc: number, o: any) => acc + Number(o.total_amount), 0)

    // 3. Pending orders
    const { count: pendingOrdersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'PENDING')

    // 4. Low stock alerts (quantity <= min_stock)
    const { data: stockItems } = await supabase
      .from('stock_balances')
      .select(`
        quantity,
        products ( min_stock )
      `)
      .eq('store_id', storeId)

    const lowStockCount = (stockItems || []).filter(
      (s: any) => Number(s.quantity) <= Number(s.products?.min_stock || 0)
    ).length

    // 5. Expiring in 30 days & Expired
    const { data: batches } = await supabase
      .from('stock_batches')
      .select('expiration_date, status, quantity')
      .eq('store_id', storeId)
      .gt('quantity', 0)

    const now = new Date()
    const in30d = new Date()
    in30d.setDate(in30d.getDate() + 30)

    let expiredCount = 0
    let expiring30dCount = 0

    const batchList = (batches || []) as any[]
    for (const b of batchList) {
      if (!b.expiration_date) continue
      const exp = new Date(b.expiration_date)
      if (exp < now) {
        expiredCount++
      } else if (exp <= in30d) {
        expiring30dCount++
      }
    }

    // 6. Active customers count
    const { count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'ACTIVE')

    // 7. Total products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .is('deleted_at', null)

    return {
      salesTodayTotal,
      salesMonthTotal,
      pendingOrdersCount: pendingOrdersCount || 0,
      lowStockCount,
      expiredCount,
      expiring30dCount,
      customersCount: customersCount || 0,
      productsCount: productsCount || 0,
    }
  },

  async getGlobalAdminMetrics() {
    const { count: totalStores } = await supabase.from('stores').select('*', { count: 'exact', head: true })
    const { count: activeStores } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true })

    return {
      totalStores: totalStores || 0,
      activeStores: activeStores || 0,
      totalUsers: totalUsers || 0,
      totalOrders: totalOrders || 0,
    }
  },
}
