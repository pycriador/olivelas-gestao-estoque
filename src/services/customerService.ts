import { supabase } from '@/lib/supabase/client'
import type { Customer } from '@/types/customer.types'

export const customerService = {
  async listCustomers(storeId: string, search?: string): Promise<Customer[]> {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,document.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Customer[]
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
