import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import { permissionGroupService } from '@/services/permissionGroupService'
import { normalizePinRequirements } from '@/utils/pinValidator'
import type {
  EmployeePinRequirements,
  PlatformUser,
  StoreCustomRole,
  StoreMember,
  StoreMemberUpsertInput,
} from '@/types/user.types'
import type { UserRole } from '@/types/database.types'

interface StoredEmployeePinMeta {
  requirePinReset?: boolean
  pinRequirements?: EmployeePinRequirements
  pinUpdatedAt?: string | null
}

const PIN_META_CACHE_PREFIX = 'olv_emp_pin_meta_v1'

function getLocalPinMeta(storeId: string, userId: string): StoredEmployeePinMeta | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${PIN_META_CACHE_PREFIX}_${storeId}_${userId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setLocalPinMeta(storeId: string, userId: string, meta: StoredEmployeePinMeta): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${PIN_META_CACHE_PREFIX}_${storeId}_${userId}`, JSON.stringify(meta))
  } catch {
    // Ignore storage quota
  }
}

async function getStoreThemePinPolicies(
  storeId: string
): Promise<Record<string, StoredEmployeePinMeta>> {
  if (!storeId || storeId === 'all') return {}
  try {
    const { data } = await supabase
      .from('stores')
      .select('theme_config')
      .eq('id', storeId)
      .maybeSingle()
    const cfg = (data?.theme_config as Record<string, any>) || {}
    return (cfg.employee_pin_policies as Record<string, StoredEmployeePinMeta>) || {}
  } catch {
    return {}
  }
}

async function saveStoreThemePinPolicy(
  storeId: string,
  userId: string,
  meta: StoredEmployeePinMeta
): Promise<void> {
  if (!storeId || storeId === 'all' || !userId) return
  setLocalPinMeta(storeId, userId, meta)
  try {
    const { data } = await supabase
      .from('stores')
      .select('theme_config')
      .eq('id', storeId)
      .maybeSingle()
    const currentConfig = ((data?.theme_config as Record<string, any>) || {}) as Record<string, any>
    const currentPolicies =
      ((currentConfig.employee_pin_policies as Record<string, StoredEmployeePinMeta>) || {})
    const updatedConfig = {
      ...currentConfig,
      employee_pin_policies: {
        ...currentPolicies,
        [userId]: meta,
      },
    }
    await supabase
      .from('stores')
      .update({
        theme_config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)
  } catch {
    // Fallback already persisted in localStorage
  }
}

export interface UserListParams {
  search?: string
  isGlobalAdmin?: boolean
  /**
   * Quando true (padrão no Global Admin > Usuários), exclui funcionários de lojas
   * que não sejam STORE_ADMIN nem GLOBAL_ADMIN, pois funcionários não possuem plano de pagamento.
   */
  excludeStoreEmployees?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const userService = {
  /**
   * List platform users (Global Admin).
   * Por padrão (`excludeStoreEmployees = true`), exibe apenas contas titulares/assinantes
   * (`STORE_ADMIN`, `GLOBAL_ADMIN` ou contas sem vínculo de funcionário operacional),
   * já que funcionários da loja entram na cota de licenças da loja e não pagam plano individual.
   */
  async listPlatformUsers(params: UserListParams = {}): Promise<{ data: PlatformUser[]; total: number }> {
    const {
      search,
      isGlobalAdmin,
      excludeStoreEmployees = true,
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

    const { data: profiles, error } = await query.order(orderCol, {
      ascending: sortOrder === 'asc',
    })

    if (error) {
      console.error('Error fetching platform profiles:', error)
      throw error
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], total: 0 }
    }

    const allUserIds = profiles.map((p) => p.id)

    // Fetch store relations for these users safely
    const userStoresMap = new Map<string, any[]>()
    try {
      const { data: storeUsers, error: storeErr } = await supabase
        .from('store_users')
        .select(`
          user_id,
          role,
          is_active,
          job_title,
          can_approve_writeoff,
          custom_role_id,
          stores (
            id,
            name,
            slug
          )
        `)
        .in('user_id', allUserIds)

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
              jobTitle: su.job_title ?? null,
              canApproveWriteoff: Boolean(su.can_approve_writeoff || su.role === 'STOCK_APPROVER' || su.role === 'STORE_ADMIN'),
              customRoleId: su.custom_role_id ?? null,
            })
          }
          userStoresMap.set(su.user_id, list)
        }
      }
    } catch (e) {
      console.warn('Could not load user store relations:', e)
    }

    // Filter out operational store employees when excludeStoreEmployees is enabled
    const filteredProfiles = excludeStoreEmployees
      ? profiles.filter((p) => {
          if (p.is_global_admin) return true
          const links = userStoresMap.get(p.id) || []
          if (links.length === 0) return true
          return links.some((l) => l.role === 'STORE_ADMIN')
        })
      : profiles

    const total = filteredProfiles.length
    const from = (page - 1) * pageSize
    const pagedProfiles = filteredProfiles.slice(from, from + pageSize)
    const pagedUserIds = pagedProfiles.map((p) => p.id)

    const permissionProfilesMap = await permissionGroupService.getProfilesByUserIds(pagedUserIds)

    const result: PlatformUser[] = pagedProfiles.map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name || null,
      phone: p.phone || null,
      avatarUrl: p.avatar_url || null,
      isGlobalAdmin: Boolean(p.is_global_admin),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      stores: userStoresMap.get(p.id) || [],
      permissionProfile: permissionProfilesMap.get(p.id) || null,
    }))

    return {
      data: result,
      total,
    }
  },

  /**
   * Get a single platform user by ID with stores and permission profile
   */
  async getPlatformUserById(userId: string): Promise<PlatformUser | null> {
    if (!userId) return null
    const { data: p, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    if (!p) return null

    const storesList: any[] = []
    try {
      const { data: storeUsers } = await supabase
        .from('store_users')
        .select(`
          user_id,
          role,
          is_active,
          job_title,
          can_approve_writeoff,
          custom_role_id,
          stores (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', userId)

      for (const su of (storeUsers || []) as any[]) {
        if (su.stores) {
          storesList.push({
            storeId: su.stores.id,
            storeName: su.stores.name,
            storeSlug: su.stores.slug,
            role: su.role,
            isActive: su.is_active,
            jobTitle: su.job_title ?? null,
            canApproveWriteoff: Boolean(
              su.can_approve_writeoff || su.role === 'STOCK_APPROVER' || su.role === 'STORE_ADMIN'
            ),
            customRoleId: su.custom_role_id ?? null,
          })
        }
      }
    } catch {
      // Ignore
    }

    const permissionProfile = await permissionGroupService.getUserPermissionProfile(userId)

    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name || null,
      phone: p.phone || null,
      avatarUrl: p.avatar_url || null,
      isGlobalAdmin: Boolean(p.is_global_admin),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      stores: storesList,
      permissionProfile,
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

    // If creating for a store, prefer the SECURITY DEFINER RPC so it doesn't affect the active browser session
    if (data.storeId && !data.isGlobalAdmin) {
      const member = await userService.upsertStoreEmployee(data.storeId, {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        password,
        role: data.role || 'STORE_ADMIN',
      })
      return {
        id: member.userId,
        email: member.email,
        fullName: member.fullName,
        phone: member.phone,
        avatarUrl: member.avatarUrl,
        isGlobalAdmin: false,
        createdAt: member.createdAt,
        stores: [],
      }
    }

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

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Usuário não encontrado ou você não tem permissão para editá-lo.')

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
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id === userId) throw new Error('Você não pode remover sua própria conta.')

    const { data, error } = await supabase.rpc('global_admin_delete_platform_user', {
      p_user_id: userId,
    })
    if (error) throw error
    if (typeof data !== 'string' || !data) {
      throw new Error('O servidor não confirmou a remoção do usuário.')
    }
  },

  /**
   * Resolve a store member by either `store_users.user_id` or `store_users.id`,
   * automatically discovering the store if `preferredStoreId` is empty, `'all'`, or doesn't contain the member.
   */
  async findStoreMemberByIdOrUserId(
    employeeId: string,
    preferredStoreId?: string
  ): Promise<{ storeId: string; member: StoreMember } | null> {
    if (!employeeId) return null

    if (preferredStoreId && preferredStoreId !== 'all') {
      try {
        const list = await userService.listStoreMembers(preferredStoreId)
        const found = list.find((m) => m.userId === employeeId || m.id === employeeId)
        if (found) {
          return { storeId: preferredStoreId, member: found }
        }
      } catch {
        // Fallback to lookup across stores
      }
    }

    const { data, error } = await supabase
      .from('store_users')
      .select('id, store_id, user_id')
      .or(`user_id.eq.${employeeId},id.eq.${employeeId}`)
      .limit(1)
      .maybeSingle()

    if (error || !data?.store_id) return null

    const list = await userService.listStoreMembers(data.store_id)
    const found = list.find((m) => m.userId === employeeId || m.id === employeeId)
    if (!found) return null

    return { storeId: data.store_id, member: found }
  },

  /**
   * List members of a specific store with full granular role & approver metadata
   */
  async listStoreMembers(storeId: string): Promise<StoreMember[]> {
    let rows: any[] | null = null

    // Try with migration 26 columns first
    const fullQuery = await supabase
      .from('store_users')
      .select(`
        id,
        user_id,
        store_id,
        role,
        is_active,
        employee_registration,
        job_title,
        custom_role_id,
        can_approve_writeoff,
        approval_pin,
        require_pin_reset,
        pin_requirements,
        pin_updated_at,
        max_writeoff_value,
        granted_permissions,
        revoked_permissions,
        created_at,
        store_custom_roles (
          id,
          name
        ),
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

    if (!fullQuery.error) {
      rows = fullQuery.data || []
    } else {
      // Fallback if migration 26 columns are not yet present in DB
      const { data, error } = await supabase
        .from('store_users')
        .select(`
          id,
          user_id,
          store_id,
          role,
          is_active,
          employee_registration,
          job_title,
          custom_role_id,
          can_approve_writeoff,
          approval_pin,
          max_writeoff_value,
          granted_permissions,
          revoked_permissions,
          created_at,
          store_custom_roles (
            id,
            name
          ),
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
      rows = data || []
    }

    const themePinPolicies = await getStoreThemePinPolicies(storeId)

    return (rows || []).map((item: any) => {
      const customRole = Array.isArray(item.store_custom_roles)
        ? item.store_custom_roles[0]
        : item.store_custom_roles
      const localMeta = getLocalPinMeta(storeId, item.user_id)
      const themeMeta = themePinPolicies[item.user_id]
      const resolvedRequireReset =
        item.require_pin_reset !== undefined
          ? Boolean(item.require_pin_reset)
          : Boolean(themeMeta?.requirePinReset ?? localMeta?.requirePinReset ?? false)
      const resolvedPinReq = normalizePinRequirements(
        item.pin_requirements || themeMeta?.pinRequirements || localMeta?.pinRequirements
      )
      const resolvedPinUpdatedAt =
        item.pin_updated_at ?? themeMeta?.pinUpdatedAt ?? localMeta?.pinUpdatedAt ?? null

      return {
        id: item.id,
        userId: item.user_id,
        storeId: item.store_id,
        role: item.role as UserRole,
        isActive: item.is_active,
        createdAt: item.created_at,
        employeeRegistration: item.employee_registration ?? null,
        jobTitle: item.job_title ?? null,
        customRoleId: item.custom_role_id ?? null,
        customRoleName: customRole?.name ?? null,
        canApproveWriteoff: Boolean(item.can_approve_writeoff),
        approvalPin: item.approval_pin ?? null,
        requirePinReset: resolvedRequireReset,
        pinRequirements: resolvedPinReq,
        pinUpdatedAt: resolvedPinUpdatedAt,
        maxWriteoffValue:
          item.max_writeoff_value !== null && item.max_writeoff_value !== undefined
            ? Number(item.max_writeoff_value)
            : null,
        grantedPermissions: Array.isArray(item.granted_permissions) ? item.granted_permissions : [],
        revokedPermissions: Array.isArray(item.revoked_permissions) ? item.revoked_permissions : [],
        fullName: item.profiles?.full_name || null,
        email: item.profiles?.email || '',
        phone: item.profiles?.phone || null,
        avatarUrl: item.profiles?.avatar_url || null,
      }
    })
  },

  /**
   * Create or update a store employee with full granular permissions and approver settings
   * via the SECURITY DEFINER RPC `upsert_store_employee`.
   */
  async upsertStoreEmployee(
    storeId: string,
    input: StoreMemberUpsertInput
  ): Promise<StoreMember> {
    const normalizedPinReq = normalizePinRequirements(input.pinRequirements)
    const baseRpcArgs = {
      p_store_id: storeId,
      p_email: input.email.trim().toLowerCase(),
      p_full_name: input.fullName?.trim() || null,
      p_phone: input.phone?.trim() || null,
      p_password: input.password?.trim() || null,
      p_role: input.role,
      p_employee_registration: input.employeeRegistration?.trim() || null,
      p_job_title: input.jobTitle?.trim() || null,
      p_custom_role_id: input.customRoleId || null,
      p_can_approve_writeoff: Boolean(
        input.canApproveWriteoff ||
          input.role === 'STOCK_APPROVER' ||
          input.role === 'STORE_ADMIN' ||
          input.grantedPermissions?.includes('inventory.approve_writeoff')
      ),
      p_approval_pin: input.approvalPin?.trim() || null,
      p_max_writeoff_value:
        input.maxWriteoffValue !== undefined && input.maxWriteoffValue !== null
          ? Number(input.maxWriteoffValue)
          : null,
      p_granted_permissions: input.grantedPermissions || [],
      p_revoked_permissions: input.revokedPermissions || [],
      p_is_active: input.isActive !== undefined ? input.isActive : true,
    }

    let rpcResult = await supabase.rpc('upsert_store_employee', {
      ...baseRpcArgs,
      p_require_pin_reset: Boolean(input.requirePinReset),
      p_pin_requirements: normalizedPinReq,
    })

    if (rpcResult.error) {
      // Fallback to 15-arg signature if migration 26 is not yet applied on remote DB
      rpcResult = await supabase.rpc('upsert_store_employee', baseRpcArgs)
    }

    if (rpcResult.error) throw rpcResult.error
    const data = rpcResult.data

    const members = await userService.listStoreMembers(storeId)
    const saved = members.find(
      (m) =>
        m.id === data ||
        m.id === (data as any)?.store_user_id ||
        m.email.toLowerCase() === input.email.trim().toLowerCase()
    )

    const resolvedUserId = saved?.userId || (data as any)?.user_id || ''
    const resolvedStoreUserId = saved?.id || (typeof data === 'string' ? data : (data as any)?.store_user_id) || ''

    // Persist PIN reset & requirements both in store_users (if columns exist) and in store theme_config JSONB
    if (resolvedStoreUserId) {
      await supabase
        .from('store_users')
        .update({
          require_pin_reset: Boolean(input.requirePinReset),
          pin_requirements: normalizedPinReq,
          ...(input.approvalPin?.trim()
            ? { pin_updated_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', resolvedStoreUserId)
        .then(() => {})
    }

    if (resolvedUserId) {
      await saveStoreThemePinPolicy(storeId, resolvedUserId, {
        requirePinReset: Boolean(input.requirePinReset),
        pinRequirements: normalizedPinReq,
        pinUpdatedAt: input.approvalPin?.trim()
          ? new Date().toISOString()
          : saved?.pinUpdatedAt || null,
      })
    }

    if (saved) {
      return {
        ...saved,
        requirePinReset: Boolean(input.requirePinReset),
        pinRequirements: normalizedPinReq,
      }
    }

    return {
      id: resolvedStoreUserId,
      userId: resolvedUserId,
      storeId,
      role: input.role,
      isActive: input.isActive !== false,
      createdAt: new Date().toISOString(),
      employeeRegistration: input.employeeRegistration || null,
      jobTitle: input.jobTitle || null,
      customRoleId: input.customRoleId || null,
      canApproveWriteoff: Boolean(input.canApproveWriteoff),
      approvalPin: input.approvalPin || null,
      requirePinReset: Boolean(input.requirePinReset),
      pinRequirements: normalizedPinReq,
      maxWriteoffValue: input.maxWriteoffValue ?? null,
      grantedPermissions: input.grantedPermissions || [],
      revokedPermissions: input.revokedPermissions || [],
      fullName: input.fullName || null,
      email: input.email.trim().toLowerCase(),
      phone: input.phone || null,
      avatarUrl: null,
    }
  },

  /**
   * Complete mandatory PIN reset on login for the authenticated employee
   */
  async completeEmployeePinReset(
    storeId: string,
    userId: string,
    newPin: string,
    pinRequirements?: EmployeePinRequirements
  ): Promise<void> {
    const trimmedPin = newPin.trim()
    const now = new Date().toISOString()

    // 1. Try dedicated RPC first
    const { error: rpcErr } = await supabase.rpc('complete_employee_pin_reset', {
      p_store_id: storeId,
      p_new_pin: trimmedPin,
    })

    if (rpcErr) {
      // Fallback direct update on store_users
      const { error: updErr } = await supabase
        .from('store_users')
        .update({
          approval_pin: trimmedPin,
          updated_at: now,
        })
        .eq('store_id', storeId)
        .eq('user_id', userId)

      if (updErr) throw updErr

      await supabase
        .from('store_users')
        .update({
          require_pin_reset: false,
          pin_updated_at: now,
        })
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .then(() => {})
    }

    const existingPolicies = await getStoreThemePinPolicies(storeId)
    const currentMeta = existingPolicies[userId] || getLocalPinMeta(storeId, userId) || {}
    await saveStoreThemePinPolicy(storeId, userId, {
      requirePinReset: false,
      pinRequirements: normalizePinRequirements(pinRequirements || currentMeta.pinRequirements),
      pinUpdatedAt: now,
    })

    auditService.logAction({
      storeId,
      action: 'EMPLOYEE_PIN_RESET_COMPLETED',
      entity: 'store_users',
      entityId: userId,
      afterData: {
        requirePinReset: false,
        pinUpdatedAt: now,
      },
    })
  },

  /**
   * Add existing user or invite new user to store team (delegates to upsertStoreEmployee)
   */
  async inviteOrAddStoreMember(
    storeId: string,
    data: {
      email: string
      fullName?: string
      role: UserRole
      password?: string
      employeeRegistration?: string
      jobTitle?: string
      canApproveWriteoff?: boolean
      grantedPermissions?: string[]
      revokedPermissions?: string[]
    }
  ): Promise<StoreMember> {
    return userService.upsertStoreEmployee(storeId, data)
  },

  /**
   * Update member role, status, and granular permissions in store
   */
  async updateStoreMemberRole(
    storeUserId: string,
    updates: {
      role?: UserRole
      isActive?: boolean
      employeeRegistration?: string | null
      jobTitle?: string | null
      customRoleId?: string | null
      canApproveWriteoff?: boolean
      approvalPin?: string | null
      requirePinReset?: boolean
      pinRequirements?: EmployeePinRequirements
      maxWriteoffValue?: number | null
      grantedPermissions?: string[]
      revokedPermissions?: string[]
    }
  ): Promise<void> {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.role !== undefined) payload.role = updates.role
    if (updates.isActive !== undefined) payload.is_active = updates.isActive
    if (updates.employeeRegistration !== undefined)
      payload.employee_registration = updates.employeeRegistration
    if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle
    if (updates.customRoleId !== undefined) payload.custom_role_id = updates.customRoleId
    if (updates.canApproveWriteoff !== undefined)
      payload.can_approve_writeoff = updates.canApproveWriteoff
    if (updates.approvalPin !== undefined) payload.approval_pin = updates.approvalPin
    if (updates.maxWriteoffValue !== undefined)
      payload.max_writeoff_value = updates.maxWriteoffValue
    if (updates.grantedPermissions !== undefined)
      payload.granted_permissions = updates.grantedPermissions
    if (updates.revokedPermissions !== undefined)
      payload.revoked_permissions = updates.revokedPermissions

    const { data: suRow, error } = await supabase
      .from('store_users')
      .update(payload)
      .eq('id', storeUserId)
      .select('store_id, user_id')
      .maybeSingle()

    if (error) throw error

    if (updates.requirePinReset !== undefined || updates.pinRequirements !== undefined) {
      const pinCols: Record<string, any> = {}
      if (updates.requirePinReset !== undefined) {
        pinCols.require_pin_reset = Boolean(updates.requirePinReset)
      }
      if (updates.pinRequirements !== undefined) {
        pinCols.pin_requirements = normalizePinRequirements(updates.pinRequirements)
      }
      await supabase
        .from('store_users')
        .update(pinCols)
        .eq('id', storeUserId)
        .then(() => {})

      if (suRow?.store_id && suRow?.user_id) {
        const existingPolicies = await getStoreThemePinPolicies(suRow.store_id)
        const currentMeta =
          existingPolicies[suRow.user_id] ||
          getLocalPinMeta(suRow.store_id, suRow.user_id) ||
          {}
        await saveStoreThemePinPolicy(suRow.store_id, suRow.user_id, {
          requirePinReset:
            updates.requirePinReset !== undefined
              ? Boolean(updates.requirePinReset)
              : Boolean(currentMeta.requirePinReset),
          pinRequirements: normalizePinRequirements(
            updates.pinRequirements || currentMeta.pinRequirements
          ),
          pinUpdatedAt: currentMeta.pinUpdatedAt ?? null,
        })
      }
    }

    auditService.logAction({
      action: 'TEAM_MEMBER_UPDATED',
      entity: 'store_users',
      entityId: storeUserId,
      afterData: {
        ...payload,
        ...(updates.requirePinReset !== undefined
          ? { require_pin_reset: updates.requirePinReset }
          : {}),
      },
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
          can_approve_writeoff: true,
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

  /**
   * List custom roles configured for a store
   */
  async listStoreCustomRoles(storeId: string): Promise<StoreCustomRole[]> {
    const { data, error } = await supabase
      .from('store_custom_roles')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true })

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      storeId: row.store_id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      baseRole: row.base_role as UserRole,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
      canApproveWriteoff: Boolean(row.can_approve_writeoff),
      maxWriteoffValue:
        row.max_writeoff_value !== null && row.max_writeoff_value !== undefined
          ? Number(row.max_writeoff_value)
          : null,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  /**
   * Create or update a custom role template for a store
   */
  async upsertStoreCustomRole(
    storeId: string,
    roleInput: {
      id?: string
      code: string
      name: string
      description?: string | null
      baseRole: UserRole
      permissions: string[]
      canApproveWriteoff: boolean
      maxWriteoffValue?: number | null
      isActive?: boolean
    }
  ): Promise<StoreCustomRole> {
    const payload: Record<string, any> = {
      store_id: storeId,
      code: roleInput.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      name: roleInput.name.trim(),
      description: roleInput.description?.trim() || null,
      base_role: roleInput.baseRole,
      permissions: roleInput.permissions,
      can_approve_writeoff: Boolean(
        roleInput.canApproveWriteoff ||
          roleInput.baseRole === 'STOCK_APPROVER' ||
          roleInput.permissions.includes('inventory.approve_writeoff')
      ),
      max_writeoff_value:
        roleInput.maxWriteoffValue !== undefined && roleInput.maxWriteoffValue !== null
          ? Number(roleInput.maxWriteoffValue)
          : null,
      is_active: roleInput.isActive !== false,
      updated_at: new Date().toISOString(),
    }

    let query
    if (roleInput.id) {
      query = supabase
        .from('store_custom_roles')
        .update(payload)
        .eq('id', roleInput.id)
        .select()
        .single()
    } else {
      query = supabase
        .from('store_custom_roles')
        .upsert(payload, { onConflict: 'store_id,code' })
        .select()
        .single()
    }

    const { data, error } = await query
    if (error) throw error

    auditService.logAction({
      storeId,
      action: roleInput.id ? 'CUSTOM_ROLE_UPDATED' : 'CUSTOM_ROLE_CREATED',
      entity: 'store_custom_roles',
      entityId: data.id,
      afterData: payload,
    })

    return {
      id: data.id,
      storeId: data.store_id,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      baseRole: data.base_role as UserRole,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      canApproveWriteoff: Boolean(data.can_approve_writeoff),
      maxWriteoffValue:
        data.max_writeoff_value !== null && data.max_writeoff_value !== undefined
          ? Number(data.max_writeoff_value)
          : null,
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  },

  /**
   * Delete a store custom role
   */
  async deleteStoreCustomRole(roleId: string, storeId?: string): Promise<void> {
    const { error } = await supabase
      .from('store_custom_roles')
      .delete()
      .eq('id', roleId)

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'CUSTOM_ROLE_DELETED',
      entity: 'store_custom_roles',
      entityId: roleId,
    })
  },
}
