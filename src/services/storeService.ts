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

  /**
   * Exclusão definitiva (Hard Delete) de uma Loja Matriz ou Filial pelo Global Admin.
   * Remove permanentemente a unidade e seus vínculos operacionais.
   */
  async deleteStorePermanently(
    id: string,
    options?: { deleteChildBranches?: boolean }
  ): Promise<void> {
    const deleteChildBranches = Boolean(options?.deleteChildBranches)

    // 1. Tenta via RPC atômica SECURITY DEFINER (Migration 29)
    const { error: rpcError } = await supabase.rpc('global_admin_hard_delete_store', {
      p_store_id: id,
      p_delete_branches: deleteChildBranches,
    })

    if (!rpcError) {
      return
    }

    // 2. Fallback resiliente caso a migration 29 ainda não tenha sido aplicada no banco remoto
    const { data: targetStore } = await supabase
      .from('stores')
      .select('id, name, slug, is_branch')
      .eq('id', id)
      .maybeSingle()

    // Tratar filiais subordinadas caso seja uma Matriz
    const { data: childBranches } = await supabase
      .from('stores')
      .select('id')
      .eq('parent_store_id', id)
      .neq('id', id)

    if (childBranches && childBranches.length > 0) {
      if (deleteChildBranches) {
        for (const child of childBranches) {
          await this.deleteStorePermanently(child.id, { deleteChildBranches: true })
        }
      } else {
        await supabase
          .from('stores')
          .update({
            parent_store_id: null,
            is_branch: false,
            updated_at: new Date().toISOString(),
          })
          .eq('parent_store_id', id)
      }
    }

    // Limpar dependências com ON DELETE RESTRICT antes de remover a loja:
    // a) Pedidos (marcar como CANCELLED para permitir DELETE pela policy RLS e cascatear order_items)
    await supabase
      .from('orders')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('store_id', id)
      .neq('status', 'CANCELLED')

    await supabase.from('order_items').delete().eq('store_id', id)
    await supabase.from('orders').delete().eq('store_id', id)

    // b) Ordens de compra e itens de compra (possuem ON DELETE RESTRICT para suppliers e products)
    await supabase.from('purchase_order_items').delete().eq('store_id', id)
    await supabase.from('purchase_orders').delete().eq('store_id', id)

    // c) Transferências entre filiais
    await supabase
      .from('stock_transfers')
      .delete()
      .or(`source_store_id.eq.${id},destination_store_id.eq.${id}`)

    // d) Movimentações, lotes, saldos, produtos e fornecedores
    await supabase.from('stock_movements').delete().eq('store_id', id)
    await supabase.from('stock_batches').delete().eq('store_id', id)
    await supabase.from('stock_balances').delete().eq('store_id', id)
    await supabase.from('products').delete().eq('store_id', id)
    await supabase.from('suppliers').delete().eq('store_id', id)

    // e) Excluir definitivamente a loja em public.stores (demais tabelas possuem ON DELETE CASCADE)
    const { error: deleteError } = await supabase.from('stores').delete().eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    auditService.logAction({
      action: 'GLOBAL_HARD_DELETE_STORE',
      entity: 'stores',
      entityId: id,
      beforeData: targetStore ? (targetStore as Record<string, unknown>) : { id },
    })
  },
}
