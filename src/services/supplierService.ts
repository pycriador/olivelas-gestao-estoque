import { supabase } from '@/lib/supabase/client'
import type { Supplier } from '@/types/supplier.types'

export const supplierService = {
  async listSuppliers(storeId: string, search?: string): Promise<Supplier[]> {
    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('corporate_name', { ascending: true })

    if (search) {
      query = query.or(`corporate_name.ilike.%${search}%,trade_name.ilike.%${search}%,document.ilike.%${search}%,contact_name.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Supplier[]
  },

  async createSupplier(storeId: string, supplierData: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        store_id: storeId,
        corporate_name: supplierData.corporate_name!,
        trade_name: supplierData.trade_name || null,
        document: supplierData.document || null,
        contact_name: supplierData.contact_name || null,
        phone: supplierData.phone || null,
        email: supplierData.email || null,
        notes: supplierData.notes || null,
        status: supplierData.status || 'ACTIVE',
      })
      .select()
      .single()

    if (error) throw error
    return data as Supplier
  },

  async updateSupplier(id: string, storeId: string, updates: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error
    return data as Supplier
  },

  async softDeleteSupplier(id: string, storeId: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .update({
        status: 'INACTIVE',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error
  },
}
