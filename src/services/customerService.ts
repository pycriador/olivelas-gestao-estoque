import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
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

  /**
   * Cliente por id, para reconciliar um nome digitado com um cadastro.
   */
  async getCustomer(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return (data as Customer) || null
  },

  /**
   * Clientes mais recentes da plataforma, do mais novo para o mais antigo.
   *
   * Deliberadamente SEM `.eq('store_id', ...)`: o PDV usa isso como
   * amostra de digitos rapidos. O RLS continua valendo - um usuario comum
   * so enxerga os clientes das lojas das quais participa, e um global admin
   * enxerga todos. `created_at` tem DEFAULT NOW() e nunca e nulo.
   */
  async getRecentCustomers(limit = 5): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(limit)

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

    auditService.logAction({
      storeId,
      action: 'CUSTOMER_CREATED',
      entity: 'customers',
      entityId: data.id,
      afterData: { name: data.name, email: data.email, phone: data.phone },
    })

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

    auditService.logAction({
      storeId,
      action: 'CUSTOMER_UPDATED',
      entity: 'customers',
      entityId: id,
      afterData: updates as Record<string, unknown>,
    })

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

    auditService.logAction({
      storeId,
      action: 'CUSTOMER_DELETED',
      entity: 'customers',
      entityId: id,
    })
  },
}
