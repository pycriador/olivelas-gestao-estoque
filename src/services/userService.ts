import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import type { PlatformUser, StoreMember } from '@/types/user.types'
import type { UserRole } from '@/types/database.types'

export interface UserListParams {
  search?: string
  isGlobalAdmin?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const userService = {
  /**
   * List all platform users (Global Admin)
   */
  async listPlatformUsers(params: UserListParams = {}): Promise<{ data: PlatformUser[]; total: number }> {
    const {
      search,
      isGlobalAdmin,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 15,
    } = params

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    if (search && search.trim()) {
      const q = search.trim()
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    }

    if (isGlobalAdmin !== undefined) {
      query = query.eq('is_global_admin', isGlobalAdmin)
    }

    const orderCol = ['full_name', 'email', 'created_at', 'is_global_admin'].includes(sortBy)
      ? sortBy
      : 'created_at'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: profiles, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) {
      console.error('Error fetching platform profiles:', error)
      throw error
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], total: count || 0 }
    }

    const userIds = profiles.map((p) => p.id)

    // Fetch store relations for these users safely
    const userStoresMap = new Map<string, any[]>()
    try {
      const { data: storeUsers, error: storeErr } = await supabase
        .from('store_users')
        .select(`
          user_id,
          role,
          is_active,
          stores (
            id,
            name,
            slug
          )
        `)
        .in('user_id', userIds)

      if (!storeErr && storeUsers) {
        for (const su of storeUsers as any[]) {
          const list = userStoresMap.get(su.user_id) || []
          if (su.stores) {
            list.push({
              storeId: su.stores.id,
              storeName: su.stores.name,
              storeSlug: su.stores.slug,
              role: su.role,
              isActive: su.is_active,
            })
          }
          userStoresMap.set(su.user_id, list)
        }
      }
    } catch (e) {
      console.warn('Could not load user store relations:', e)
    }

    const result: PlatformUser[] = profiles.map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name || null,
      phone: p.phone || null,
      avatarUrl: p.avatar_url || null,
      isGlobalAdmin: Boolean(p.is_global_admin),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      stores: userStoresMap.get(p.id) || [],
    }))

    return {
      data: result,
      total: count || 0,
    }
  },

  /**
   * Create a new platform user (Global Admin or Store Owner creating employee)
   */
  async createPlatformUser(data: {
    email: string
    password?: string
    fullName: string
    phone?: string
    isGlobalAdmin?: boolean
    storeId?: string
    role?: UserRole
  }): Promise<PlatformUser> {
    const password = data.password || Math.random().toString(36).slice(-8) + 'Aa1@'

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone || null,
        },
      },
    })

    if (authError) throw authError
    const newUserId = authData.user?.id

    if (!newUserId) {
      throw new Error('Não foi possível gerar o ID do usuário criado.')
    }

    // 2. Ensure profile has global admin flag if specified
    if (data.isGlobalAdmin) {
      await supabase
        .from('profiles')
        .update({ is_global_admin: true })
        .eq('id', newUserId)
    }

    // 3. Attach to store if requested
    if (data.storeId) {
      await supabase
        .from('store_users')
        .insert({
          store_id: data.storeId,
          user_id: newUserId,
          role: data.role || 'STORE_ADMIN',
          is_active: true,
        })
    }

    auditService.logAction({
      action: 'USER_CREATED',
      entity: 'profiles',
      entityId: newUserId,
      afterData: {
        email: data.email,
        fullName: data.fullName,
        isGlobalAdmin: data.isGlobalAdmin,
        storeId: data.storeId,
      },
    })

    return {
      id: newUserId,
      email: data.email,
      fullName: data.fullName,
      phone: data.phone || null,
      avatarUrl: null,
      isGlobalAdmin: Boolean(data.isGlobalAdmin),
      createdAt: new Date().toISOString(),
      stores: [],
    }
  },

  /**
   * Update profile info (Name, Phone, Global Admin status)
   */
  async updateProfile(
    userId: string,
    updates: {
      fullName?: string
      phone?: string
      isGlobalAdmin?: boolean
    }
  ): Promise<void> {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.fullName !== undefined) payload.full_name = updates.fullName
    if (updates.phone !== undefined) payload.phone = updates.phone
    if (updates.isGlobalAdmin !== undefined) payload.is_global_admin = updates.isGlobalAdmin

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    if (error) throw error

    auditService.logAction({
      action: 'USER_UPDATED',
      entity: 'profiles',
      entityId: userId,
      afterData: payload,
    })
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
    })
    if (error) throw error

    auditService.logAction({
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'profiles',
      entityId: email,
    })
  },

  /**
   * Delete or deactivate user
   */
  async deleteUser(userId: string): Promise<void> {
    // 1. Remove store links
    await supabase.from('store_users').delete().eq('user_id', userId)

    // 2. Remove profile
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) throw error

    auditService.logAction({
      action: 'USER_DELETED',
      entity: 'profiles',
      entityId: userId,
    })
  },

  /**
   * List members of a specific store
   */
  async listStoreMembers(storeId: string): Promise<StoreMember[]> {
    const { data, error } = await supabase
      .from('store_users')
      .select(`
        id,
        user_id,
        store_id,
        role,
        is_active,
        created_at,
        profiles (
          id,
          email,
          full_name,
          phone,
          avatar_url
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      storeId: item.store_id,
      role: item.role as UserRole,
      isActive: item.is_active,
      createdAt: item.created_at,
      fullName: item.profiles?.full_name || null,
      email: item.profiles?.email || '',
      phone: item.profiles?.phone || null,
      avatarUrl: item.profiles?.avatar_url || null,
    }))
  },

  /**
   * Add existing user or invite new user to store team
   */
  async inviteOrAddStoreMember(
    storeId: string,
    data: {
      email: string
      fullName?: string
      role: UserRole
      password?: string
    }
  ): Promise<StoreMember> {
    const normalizedEmail = data.email.trim().toLowerCase()

    // 1. Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, avatar_url')
      .eq('email', normalizedEmail)
      .maybeSingle()

    let targetUserId = existingProfile?.id

    // 2. If user does not exist, create them
    if (!targetUserId) {
      const generatedPassword = data.password || Math.random().toString(36).slice(-8) + 'Aa1@'
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: generatedPassword,
        options: {
          data: {
            full_name: data.fullName || normalizedEmail.split('@')[0],
          },
        },
      })

      if (authError) throw authError
      targetUserId = authData.user?.id

      if (!targetUserId) {
        throw new Error('Não foi possível registrar o novo usuário convidado.')
      }
    }

    // 3. Upsert store_users relation
    const { data: storeUser, error: linkError } = await supabase
      .from('store_users')
      .upsert(
        {
          store_id: storeId,
          user_id: targetUserId,
          role: data.role,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,user_id' }
      )
      .select()
      .single()

    if (linkError) throw linkError

    auditService.logAction({
      storeId,
      action: 'TEAM_MEMBER_ADDED',
      entity: 'store_users',
      entityId: storeUser.id,
      afterData: { email: normalizedEmail, role: data.role },
    })

    return {
      id: storeUser.id,
      userId: targetUserId,
      storeId,
      role: storeUser.role,
      isActive: storeUser.is_active,
      createdAt: storeUser.created_at,
      fullName: existingProfile?.full_name || data.fullName || null,
      email: normalizedEmail,
      phone: existingProfile?.phone || null,
      avatarUrl: existingProfile?.avatar_url || null,
    }
  },

  /**
   * Update member role and status in store
   */
  async updateStoreMemberRole(
    storeUserId: string,
    updates: {
      role?: UserRole
      isActive?: boolean
    }
  ): Promise<void> {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.role) payload.role = updates.role
    if (updates.isActive !== undefined) payload.is_active = updates.isActive

    const { error } = await supabase
      .from('store_users')
      .update(payload)
      .eq('id', storeUserId)

    if (error) throw error

    auditService.logAction({
      action: 'TEAM_MEMBER_UPDATED',
      entity: 'store_users',
      entityId: storeUserId,
      afterData: payload,
    })
  },

  /**
   * Remove member from store
   */
  async removeStoreMember(storeUserId: string, storeId?: string): Promise<void> {
    const { error } = await supabase
      .from('store_users')
      .delete()
      .eq('id', storeUserId)

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'TEAM_MEMBER_REMOVED',
      entity: 'store_users',
      entityId: storeUserId,
    })
  },

  /**
   * Transfer store ownership to another platform user
   */
  async transferStoreOwnership(
    storeId: string,
    newOwnerUserId: string
  ): Promise<void> {
    // 1. Ensure new owner has STORE_ADMIN role in store_users
    const { error } = await supabase
      .from('store_users')
      .upsert(
        {
          store_id: storeId,
          user_id: newOwnerUserId,
          role: 'STORE_ADMIN',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,user_id' }
      )

    if (error) throw error

    // 2. Touch store updated_at
    await supabase
      .from('stores')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', storeId)

    auditService.logAction({
      storeId,
      action: 'STORE_OWNERSHIP_TRANSFERRED',
      entity: 'stores',
      entityId: storeId,
      afterData: { newOwnerUserId },
    })
  },
}
