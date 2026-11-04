import { supabase } from '@/lib/supabase/client'
import type { StoreUserMembership, UserProfile } from '@/types/auth.types'

export const authService = {
  async getCurrentSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
    }

    return {
      id: user.id,
      email: user.email || '',
      fullName: profile?.full_name || user.user_metadata?.full_name || null,
      avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      phone: profile?.phone || null,
      isGlobalAdmin: profile?.is_global_admin || false,
      createdAt: user.created_at,
    }
  },

  async getUserStores(userId: string): Promise<StoreUserMembership[]> {
    const { data, error } = await supabase
      .from('store_users')
      .select(`
        id,
        store_id,
        role,
        is_active,
        stores (
          id,
          name,
          slug,
          is_branch,
          parent_store_id,
          branch_code
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) throw error

    const rawItems = data || []
    const storeNameById = new Map<string, string>()
    const missingParentIds = new Set<string>()

    for (const item of rawItems as any[]) {
      if (item.stores?.id && item.stores?.name) {
        storeNameById.set(item.stores.id, item.stores.name)
      }
    }

    for (const item of rawItems as any[]) {
      const pid = item.stores?.parent_store_id
      if (pid && !storeNameById.has(pid)) {
        missingParentIds.add(pid)
      }
    }

    if (missingParentIds.size > 0) {
      const { data: parentRows } = await supabase
        .from('stores')
        .select('id, name')
        .in('id', Array.from(missingParentIds))
      for (const p of parentRows || []) {
        storeNameById.set(p.id, p.name)
      }
    }

    const mapped: StoreUserMembership[] = (rawItems as any[]).map((item) => {
      const st = item.stores
      const parentId = st?.parent_store_id || null
      const isBranch = Boolean(st?.is_branch || parentId)
      return {
        id: item.id,
        storeId: item.store_id,
        storeName: st?.name || 'Loja',
        storeSlug: st?.slug || '',
        role: item.role,
        isActive: item.is_active,
        isBranch,
        parentStoreId: parentId,
        parentStoreName: parentId ? storeNameById.get(parentId) || null : null,
        branchCode: st?.branch_code || null,
      }
    })

    // Sort hierarchically: Matriz followed immediately by its Filiais (natural sort P1, P2, P3...)
    const byStoreId = new Set(mapped.map((m) => m.storeId))
    const roots = mapped
      .filter((m) => !m.isBranch || !m.parentStoreId || !byStoreId.has(m.parentStoreId))
      .sort((a, b) => a.storeName.localeCompare(b.storeName, 'pt-BR', { numeric: true }))

    const childrenByParent = new Map<string, StoreUserMembership[]>()
    for (const m of mapped) {
      if (m.isBranch && m.parentStoreId && byStoreId.has(m.parentStoreId)) {
        const list = childrenByParent.get(m.parentStoreId) || []
        list.push(m)
        childrenByParent.set(m.parentStoreId, list)
      }
    }

    const ordered: StoreUserMembership[] = []
    for (const root of roots) {
      ordered.push(root)
      const children = (childrenByParent.get(root.storeId) || []).sort((a, b) =>
        a.storeName.localeCompare(b.storeName, 'pt-BR', { numeric: true })
      )
      ordered.push(...children)
    }

    return ordered
  },

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  async signUpWithEmail(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error
    return data
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
    return data
  },

  async resetPasswordForEmail(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    return data
  },

  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
