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
          slug
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      storeId: item.store_id,
      storeName: item.stores?.name || 'Loja',
      storeSlug: item.stores?.slug || '',
      role: item.role,
      isActive: item.is_active,
    }))
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
