import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import type { Supplier } from '@/types/supplier.types'

export interface SupplierListParams {
  search?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const supplierService = {
  async listSuppliers(
    storeId: string,
    params: SupplierListParams = {}
  ): Promise<{ data: Supplier[]; total: number }> {
    const {
      search,
      status,
      sortBy = 'corporate_name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .is('deleted_at', null)

    if (search) {
      query = query.or(`corporate_name.ilike.%${search}%,trade_name.ilike.%${search}%,document.ilike.%${search}%,contact_name.ilike.%${search}%`)
    }

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    const orderCol = ['corporate_name', 'trade_name', 'document', 'contact_name', 'created_at', 'status'].includes(sortBy)
      ? sortBy
      : 'corporate_name'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    return {
      data: (data || []) as Supplier[],
      total: count || 0,
    }
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

    auditService.logAction({
      storeId,
      action: 'SUPPLIER_CREATED',
      entity: 'suppliers',
      entityId: data.id,
      afterData: { corporate_name: data.corporate_name, document: data.document },
    })

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

    auditService.logAction({
      storeId,
      action: 'SUPPLIER_UPDATED',
      entity: 'suppliers',
      entityId: id,
      afterData: updates as Record<string, unknown>,
    })

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

    auditService.logAction({
      storeId,
      action: 'SUPPLIER_DELETED',
      entity: 'suppliers',
      entityId: id,
    })
  },
}
