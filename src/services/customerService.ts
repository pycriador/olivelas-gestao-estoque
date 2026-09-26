import { supabase } from '@/lib/supabase/client'
import type { Customer } from '@/types/customer.types'

export interface CustomerListParams {
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const customerService = {
  async listCustomers(
    storeId: string,
    params: CustomerListParams = {}
  ): Promise<{ data: Customer[]; total: number }> {
    const {
      search,
      status,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .is('deleted_at', null)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,document.ilike.%${search}%`)
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    const orderCol = ['name', 'email', 'phone', 'created_at', 'status'].includes(sortBy)
      ? sortBy
      : 'name'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    return {
      data: (data || []) as Customer[],
      total: count || 0,
    }
  },

  async createCustomer(storeId: string, customerData: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        store_id: storeId,
        name: customerData.name!,
        document: customerData.document || null,
        email: customerData.email || null,
        phone: customerData.phone || null,
        whatsapp: customerData.whatsapp || null,
        notes: customerData.notes || null,
        status: customerData.status || 'ACTIVE',
      })
      .select()
      .single()

    if (error) throw error
    return data as Customer
  },

  async updateCustomer(id: string, storeId: string, updates: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error
    return data as Customer
  },

  async softDeleteCustomer(id: string, storeId: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({
        status: 'INACTIVE',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error
  },
}
