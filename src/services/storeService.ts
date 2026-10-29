import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import type { Store } from '@/types/store.types'

export interface StoreListParams {
  search?: string
  status?: string
  parentStoreId?: string
  onlyBranches?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const storeService = {
  async getStoreBySlug(slug: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as Store
  },

  async getStoreById(id: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data as Store
  },

  async listAllStores(): Promise<Store[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Store[]
  },

  /**
   * List branches linked to a headquarters store or all active destination branches/stores
   */
  async listTransferDestinationStores(sourceStoreId: string): Promise<Store[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .neq('id', sourceStoreId)
      .order('is_branch', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Store[]
  },

  async listStores(params: StoreListParams = {}): Promise<{ data: Store[]; total: number }> {
    const {
      search,
      status,
      parentStoreId,
      onlyBranches,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      pageSize = 15,
    } = params

    let query = supabase
      .from('stores')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,slug.ilike.%${search}%,document.ilike.%${search}%,branch_code.ilike.%${search}%`
      )
    }

    if (status === 'ACTIVE') {
      query = query.eq('is_active', true)
    } else if (status === 'INACTIVE') {
      query = query.eq('is_active', false)
    }

    if (parentStoreId) {
      query = query.eq('parent_store_id', parentStoreId)
    }

    if (onlyBranches) {
      query = query.eq('is_branch', true)
    }

    const orderCol = ['name', 'slug', 'document', 'is_active', 'created_at', 'branch_code'].includes(
      sortBy
    )
      ? sortBy
      : 'name'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    return {
      data: (data || []) as Store[],
      total: count || 0,
    }
  },

  async createStore(storeData: {
    name: string
    slug: string
    document?: string
    email?: string
    phone?: string
    whatsapp?: string
    description?: string
    parent_store_id?: string | null
    branch_code?: string | null
    is_branch?: boolean
    manager_name?: string | null
    address_street?: string | null
    address_number?: string | null
    address_neighborhood?: string | null
    address_city?: string | null
    address_state?: string | null
    address_zip?: string | null
  }): Promise<Store> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    // 1. Insert store / branch
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        name: storeData.name,
        slug: storeData.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        document: storeData.document || null,
        email: storeData.email || null,
        phone: storeData.phone || null,
        whatsapp: storeData.whatsapp || null,
        description: storeData.description || null,
        parent_store_id: storeData.parent_store_id || null,
        branch_code: storeData.branch_code?.trim().toUpperCase() || null,
        is_branch: Boolean(storeData.is_branch || storeData.parent_store_id),
        manager_name: storeData.manager_name?.trim() || null,
        address_street: storeData.address_street || null,
        address_number: storeData.address_number || null,
        address_neighborhood: storeData.address_neighborhood || null,
        address_city: storeData.address_city || null,
        address_state: storeData.address_state || null,
        address_zip: storeData.address_zip || null,
        is_active: true,
      })
      .select()
      .single()

    if (storeError) throw storeError

    // 2. Associate current user as STORE_ADMIN in store_users (with write-off approval enabled)
    const { error: userRelError } = await supabase
      .from('store_users')
      .insert({
        store_id: store.id,
        user_id: user.id,
        role: 'STORE_ADMIN',
        can_approve_writeoff: true,
        is_active: true,
      })

    if (userRelError) {
      console.error('Error linking user to store:', userRelError)
    }

    auditService.logAction({
      storeId: store.id,
      action: store.is_branch ? 'BRANCH_CREATED' : 'STORE_CREATED',
      entity: 'stores',
      entityId: store.id,
      afterData: {
        name: store.name,
        slug: store.slug,
        isBranch: store.is_branch,
        parentStoreId: store.parent_store_id,
        branchCode: store.branch_code,
      },
    })

    return store as Store
  },

  async updateStore(id: string, updates: Partial<Store>): Promise<Store> {
    const { data, error } = await supabase
      .from('stores')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    auditService.logAction({
      storeId: id,
      action: 'STORE_UPDATED',
      entity: 'stores',
      entityId: id,
      afterData: updates as Record<string, unknown>,
    })

    return data as Store
  },

  async softDeleteStore(id: string): Promise<void> {
    const { error } = await supabase
      .from('stores')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    auditService.logAction({
      storeId: id,
      action: 'STORE_DELETED',
      entity: 'stores',
      entityId: id,
    })
  },
}
