import { supabase } from '@/lib/supabase/client'
import type { Store } from '@/types/store.types'

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

  async createStore(storeData: {
    name: string
    slug: string
    document?: string
    email?: string
    phone?: string
    whatsapp?: string
    description?: string
  }): Promise<Store> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    // 1. Insert store
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
        is_active: true,
      })
      .select()
      .single()

    if (storeError) throw storeError

    // 2. Associate current user as STORE_ADMIN in store_users
    const { error: userRelError } = await supabase
      .from('store_users')
      .insert({
        store_id: store.id,
        user_id: user.id,
        role: 'STORE_ADMIN',
        is_active: true,
      })

    if (userRelError) {
      console.error('Error linking user to store:', userRelError)
    }

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
  },
}
