import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import {
  ALL_MODULE_CODES,
  DEFAULT_PERMISSION_GROUPS,
  DEFAULT_PERMISSION_MODULES,
} from '@/constants/screenDependencies'
import type {
  BillingCycle,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  ModuleCode,
  PermissionBillingAuditLog,
  PermissionGroup,
  PermissionModule,
  PlatformBillingRules,
  StoreEmployeeLicenseSummary,
  SubscriptionPayment,
  SubscriptionPaymentStatus,
  UserPermissionProfile,
} from '@/types/permissionGroup.types'

const LOCAL_PROFILES_CACHE_KEY = 'olivelas_user_perm_profiles_v1'
const LOCAL_GROUPS_CACHE_KEY = 'olivelas_perm_groups_v1'
const LOCAL_MODULES_CACHE_KEY = 'olivelas_perm_modules_v1'
const LOCAL_PAYMENTS_CACHE_KEY = 'olivelas_sub_payments_v1'
const LOCAL_AUDIT_CACHE_KEY = 'olivelas_perm_billing_audit_v1'
const LOCAL_BILLING_RULES_CACHE_KEY = 'olivelas_platform_billing_rules_v1'

const DEFAULT_BILLING_RULES: PlatformBillingRules = {
  id: 'default',
  defaultFreeEmployeesPerStore: 10,
  defaultExtraEmployeePrice: 19.9,
  countStoreAdminsInQuota: false,
  gracePeriodDays: 5,
  autoBlockOverdue: true,
  pixKey: 'financeiro@olivelas.com.br',
  billingSupportWhatsapp: '11999999999',
  notes:
    'Cada loja possui direito a 10 funcionários gratuitos. Licenças adicionais de funcionários ativos são cobradas mensalmente na fatura do Store Admin.',
  storeOverrides: {},
  updatedAt: new Date().toISOString(),
}

function readLocalCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocalCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Ignore storage quota errors
  }
}

function mapModuleRow(row: any): PermissionModule {
  return {
    code: row.code as ModuleCode,
    name: row.name,
    description: row.description || '',
    category: row.category || 'OPERACAO',
    routes: Array.isArray(row.routes) ? row.routes : [],
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    monthlyPrice: Number(row.monthly_price ?? row.monthlyPrice ?? 0),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: row.is_active !== false,
  }
}

function mapGroupRow(row: any): PermissionGroup {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    badgeColor: row.badge_color || row.badgeColor || 'indigo',
    enabledModules: (Array.isArray(row.enabled_modules)
      ? row.enabled_modules
      : row.enabledModules || []) as ModuleCode[],
    enabledPermissions: Array.isArray(row.enabled_permissions)
      ? row.enabled_permissions
      : row.enabledPermissions || [],
    baseMonthlyPrice: Number(row.base_monthly_price ?? row.baseMonthlyPrice ?? 0),
    annualPrice: Number(row.annual_price ?? row.annualPrice ?? 0),
    setupFee: Number(row.setup_fee ?? row.setupFee ?? 0),
    isSystemDefault: Boolean(row.is_system_default ?? row.isSystemDefault),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapProfileRow(row: any, groupsMap?: Map<string, PermissionGroup>): UserPermissionProfile {
  const groupId = row.permission_group_id ?? row.permissionGroupId ?? null
  const groupObj = row.permission_groups
    ? mapGroupRow(row.permission_groups)
    : groupId && groupsMap
      ? groupsMap.get(groupId) || null
      : null

  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    storeId: row.store_id ?? row.storeId ?? null,
    permissionGroupId: groupId,
    permissionGroup: groupObj,
    customPlanName: row.custom_plan_name ?? row.customPlanName ?? null,
    enforceOverStoreAdmin:
      row.enforce_over_store_admin !== undefined
        ? Boolean(row.enforce_over_store_admin)
        : row.enforceOverStoreAdmin !== undefined
          ? Boolean(row.enforceOverStoreAdmin)
          : true,
    enabledModules: (Array.isArray(row.enabled_modules)
      ? row.enabled_modules
      : row.enabledModules || ALL_MODULE_CODES) as ModuleCode[],
    grantedPermissions: Array.isArray(row.granted_permissions)
      ? row.granted_permissions
      : row.grantedPermissions || [],
    revokedPermissions: Array.isArray(row.revoked_permissions)
      ? row.revoked_permissions
      : row.revokedPermissions || [],
    billingCycle: (row.billing_cycle ?? row.billingCycle ?? 'MONTHLY') as BillingCycle,
    calculatedMonthlyValue: Number(row.calculated_monthly_value ?? row.calculatedMonthlyValue ?? 0),
    discountAmount: Number(row.discount_amount ?? row.discountAmount ?? 0),
    agreedMonthlyValue: Number(row.agreed_monthly_value ?? row.agreedMonthlyValue ?? 0),
    setupFeeCharged: Number(row.setup_fee_charged ?? row.setupFeeCharged ?? 0),
    paymentStatus: (row.payment_status ?? row.paymentStatus ?? 'ACTIVE') as SubscriptionPaymentStatus,
    blockOnOverdue: Boolean(row.block_on_overdue ?? row.blockOnOverdue ?? false),
    billingDay: Number(row.billing_day ?? row.billingDay ?? 10),
    trialEndsAt: row.trial_ends_at ?? row.trialEndsAt ?? null,
    nextDueDate: row.next_due_date ?? row.nextDueDate ?? null,
    lastPaymentAt: row.last_payment_at ?? row.lastPaymentAt ?? null,
    commercialNotes: row.commercial_notes ?? row.commercialNotes ?? null,
    updatedBy: row.updated_by ?? row.updatedBy ?? null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  }
}

function mapPaymentRow(row: any): SubscriptionPayment {
  return {
    id: row.id,
    userPermissionProfileId: row.user_permission_profile_id ?? row.userPermissionProfileId ?? null,
    userId: row.user_id ?? row.userId,
    storeId: row.store_id ?? row.storeId ?? null,
    referenceMonth: row.reference_month ?? row.referenceMonth ?? '',
    description: row.description || '',
    snapshotPlanName: row.snapshot_plan_name ?? row.snapshotPlanName ?? null,
    snapshotModules: (Array.isArray(row.snapshot_modules)
      ? row.snapshot_modules
      : row.snapshotModules || []) as ModuleCode[],
    amount: Number(row.amount ?? 0),
    discountAmount: Number(row.discount_amount ?? row.discountAmount ?? 0),
    paidAmount: Number(row.paid_amount ?? row.paidAmount ?? 0),
    paymentMethod: (row.payment_method ?? row.paymentMethod ?? 'PIX') as InvoicePaymentMethod,
    status: (row.status ?? 'PENDING') as InvoicePaymentStatus,
    dueDate: row.due_date ?? row.dueDate ?? new Date().toISOString().slice(0, 10),
    paidAt: row.paid_at ?? row.paidAt ?? null,
    externalTransactionId: row.external_transaction_id ?? row.externalTransactionId ?? null,
    receiptUrl: row.receipt_url ?? row.receiptUrl ?? null,
    notes: row.notes ?? null,
    recordedBy: row.recorded_by ?? row.recordedBy ?? null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  }
}

function mapAuditRow(row: any): PermissionBillingAuditLog {
  return {
    id: row.id,
    targetUserId: row.target_user_id ?? row.targetUserId,
    storeId: row.store_id ?? row.storeId ?? null,
    actorUserId: row.actor_user_id ?? row.actorUserId ?? null,
    eventType: row.event_type ?? row.eventType ?? 'MODULES_CHANGED',
    summary: row.summary || '',
    previousState: row.previous_state ?? row.previousState ?? {},
    newState: row.new_state ?? row.newState ?? {},
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  }
}

export const permissionGroupService = {
  /**
   * Lista todos os módulos de tela com seus preços comerciais
   */
  async listModules(): Promise<PermissionModule[]> {
    try {
      const { data, error } = await supabase
        .from('permission_modules')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapModuleRow)
        writeLocalCache(LOCAL_MODULES_CACHE_KEY, mapped)
        return mapped
      }
    } catch {
      // Fallback to local cache
    }
    return readLocalCache<PermissionModule[]>(LOCAL_MODULES_CACHE_KEY, DEFAULT_PERMISSION_MODULES)
  },

  /**
   * Atualiza o valor comercial e descrição de um módulo de tela
   */
  async updateModule(
    code: ModuleCode,
    updates: { name?: string; description?: string; monthlyPrice?: number }
  ): Promise<PermissionModule> {
    const payload: Record<string, any> = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.monthlyPrice !== undefined) payload.monthly_price = updates.monthlyPrice

    try {
      const { data, error } = await supabase
        .from('permission_modules')
        .update(payload)
        .eq('code', code)
        .select('*')
        .maybeSingle()

      if (!error && data) {
        return mapModuleRow(data)
      }
    } catch {
      // Fallback update in localStorage
    }

    const current = readLocalCache<PermissionModule[]>(
      LOCAL_MODULES_CACHE_KEY,
      DEFAULT_PERMISSION_MODULES
    )
    const next = current.map((m) =>
      m.code === code
        ? {
            ...m,
            name: updates.name ?? m.name,
            description: updates.description ?? m.description,
            monthlyPrice: updates.monthlyPrice ?? m.monthlyPrice,
          }
        : m
    )
    writeLocalCache(LOCAL_MODULES_CACHE_KEY, next)
    return next.find((m) => m.code === code)!
  },

  /**
   * Lista todos os Grupos de Perfil / Planos Comerciais
   */
  async listPermissionGroups(): Promise<PermissionGroup[]> {
    try {
      const { data, error } = await supabase
        .from('permission_groups')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapGroupRow)
        writeLocalCache(LOCAL_GROUPS_CACHE_KEY, mapped)
        return mapped
      }
    } catch {
      // Fallback
    }
    return readLocalCache<PermissionGroup[]>(LOCAL_GROUPS_CACHE_KEY, DEFAULT_PERMISSION_GROUPS)
  },

  /**
   * Cria ou atualiza um Grupo de Perfil Comercial (com Valores)
   */
  async savePermissionGroup(input: {
    id?: string
    code: string
    name: string
    description: string
    badgeColor: string
    enabledModules: ModuleCode[]
    enabledPermissions: string[]
    baseMonthlyPrice: number
    annualPrice: number
    setupFee: number
    sortOrder?: number
  }): Promise<PermissionGroup> {
    const payload = {
      code: input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      name: input.name.trim(),
      description: input.description.trim(),
      badge_color: input.badgeColor || 'indigo',
      enabled_modules: input.enabledModules,
      enabled_permissions: input.enabledPermissions,
      base_monthly_price: Number(input.baseMonthlyPrice || 0),
      annual_price: Number(input.annualPrice || 0),
      setup_fee: Number(input.setupFee || 0),
      sort_order: input.sortOrder ?? 10,
      is_active: true,
    }

    try {
      if (input.id && !input.id.startsWith('default-')) {
        const { data, error } = await supabase
          .from('permission_groups')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single()
        if (!error && data) return mapGroupRow(data)
      } else {
        const { data, error } = await supabase
          .from('permission_groups')
          .upsert(payload, { onConflict: 'code' })
          .select('*')
          .single()
        if (!error && data) return mapGroupRow(data)
      }
    } catch {
      // Fallback
    }

    const current = readLocalCache<PermissionGroup[]>(
      LOCAL_GROUPS_CACHE_KEY,
      DEFAULT_PERMISSION_GROUPS
    )
    const saved: PermissionGroup = {
      id: input.id || `custom-group-${Date.now()}`,
      code: payload.code,
      name: payload.name,
      description: payload.description,
      badgeColor: payload.badge_color,
      enabledModules: payload.enabled_modules,
      enabledPermissions: payload.enabled_permissions,
      baseMonthlyPrice: payload.base_monthly_price,
      annualPrice: payload.annual_price,
      setupFee: payload.setup_fee,
      isSystemDefault: false,
      isActive: true,
      sortOrder: payload.sort_order,
    }
    const idx = current.findIndex((g) => g.id === saved.id || g.code === saved.code)
    const next = idx >= 0 ? current.map((g, i) => (i === idx ? saved : g)) : [...current, saved]
    writeLocalCache(LOCAL_GROUPS_CACHE_KEY, next)
    return saved
  },

  /**
   * Busca os perfis de permissão e contrato de uma lista de usuários
   */
  async getProfilesByUserIds(userIds: string[]): Promise<Map<string, UserPermissionProfile>> {
    const resultMap = new Map<string, UserPermissionProfile>()
    if (!userIds || userIds.length === 0) return resultMap

    const groups = await this.listPermissionGroups()
    const groupsMap = new Map(groups.map((g) => [g.id, g]))

    try {
      const { data, error } = await supabase
        .from('user_permission_profiles')
        .select('*, permission_groups(*)')
        .in('user_id', userIds)

      if (!error && data) {
        const localMap = readLocalCache<Record<string, UserPermissionProfile>>(
          LOCAL_PROFILES_CACHE_KEY,
          {}
        )
        for (const row of data) {
          const mapped = mapProfileRow(row, groupsMap)
          resultMap.set(mapped.userId, mapped)
          localMap[mapped.userId] = mapped
        }
        writeLocalCache(LOCAL_PROFILES_CACHE_KEY, localMap)
        return resultMap
      }
    } catch {
      // Fallback
    }

    const localMap = readLocalCache<Record<string, UserPermissionProfile>>(
      LOCAL_PROFILES_CACHE_KEY,
      {}
    )
    for (const uid of userIds) {
      if (localMap[uid]) {
        resultMap.set(uid, localMap[uid])
      }
    }
    return resultMap
  },

  /**
   * Busca o perfil de permissão efetivo de um único usuário
   */
  async getUserPermissionProfile(userId: string): Promise<UserPermissionProfile | null> {
    if (!userId) return null
    try {
      const { data, error } = await supabase
        .from('user_permission_profiles')
        .select('*, permission_groups(*)')
        .eq('user_id', userId)
        .maybeSingle()

      if (!error && data) {
        const mapped = mapProfileRow(data)
        const localMap = readLocalCache<Record<string, UserPermissionProfile>>(
          LOCAL_PROFILES_CACHE_KEY,
          {}
        )
        localMap[userId] = mapped
        writeLocalCache(LOCAL_PROFILES_CACHE_KEY, localMap)
        return mapped
      }
    } catch {
      // Fallback
    }

    const localMap = readLocalCache<Record<string, UserPermissionProfile>>(
      LOCAL_PROFILES_CACHE_KEY,
      {}
    )
    return localMap[userId] || null
  },

  /**
   * Salva o perfil de permissões em tela e contrato comercial de um usuário
   * (Funciona inclusive para restringir usuários STORE_ADMIN)
   */
  async saveUserPermissionProfile(input: {
    userId: string
    storeId?: string | null
    permissionGroupId?: string | null
    customPlanName?: string | null
    enforceOverStoreAdmin: boolean
    enabledModules: ModuleCode[]
    grantedPermissions: string[]
    revokedPermissions: string[]
    billingCycle: BillingCycle
    calculatedMonthlyValue: number
    discountAmount: number
    agreedMonthlyValue: number
    setupFeeCharged?: number
    paymentStatus: SubscriptionPaymentStatus
    blockOnOverdue: boolean
    billingDay: number
    nextDueDate?: string | null
    commercialNotes?: string | null
  }): Promise<UserPermissionProfile> {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    const existing = await this.getUserPermissionProfile(input.userId)
    const groups = await this.listPermissionGroups()
    const matchedGroup = groups.find((g) => g.id === input.permissionGroupId) || null

    const dbGroupId =
      input.permissionGroupId && !input.permissionGroupId.startsWith('default-')
        ? input.permissionGroupId
        : null

    const payload = {
      user_id: input.userId,
      store_id: input.storeId || null,
      permission_group_id: dbGroupId,
      custom_plan_name:
        input.customPlanName || matchedGroup?.name || 'Plano Personalizado Sob Medida',
      enforce_over_store_admin: input.enforceOverStoreAdmin,
      enabled_modules: input.enabledModules,
      granted_permissions: input.grantedPermissions,
      revoked_permissions: input.revokedPermissions,
      billing_cycle: input.billingCycle,
      calculated_monthly_value: Number(input.calculatedMonthlyValue || 0),
      discount_amount: Number(input.discountAmount || 0),
      agreed_monthly_value: Number(input.agreedMonthlyValue || 0),
      setup_fee_charged: Number(input.setupFeeCharged || 0),
      payment_status: input.paymentStatus,
      block_on_overdue: input.blockOnOverdue,
      billing_day: Number(input.billingDay || 10),
      next_due_date: input.nextDueDate || null,
      commercial_notes: input.commercialNotes || null,
      updated_by: currentUser?.id || null,
      updated_at: new Date().toISOString(),
    }

    let savedProfile: UserPermissionProfile | null = null

    try {
      const { data, error } = await supabase
        .from('user_permission_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*, permission_groups(*)')
        .single()

      if (!error && data) {
        savedProfile = mapProfileRow(data)
      }
    } catch {
      // Fallback below
    }

    if (!savedProfile) {
      savedProfile = {
        id: existing?.id || `local-prof-${Date.now()}`,
        userId: input.userId,
        storeId: input.storeId || null,
        permissionGroupId: input.permissionGroupId || null,
        permissionGroup: matchedGroup,
        customPlanName: payload.custom_plan_name,
        enforceOverStoreAdmin: input.enforceOverStoreAdmin,
        enabledModules: input.enabledModules,
        grantedPermissions: input.grantedPermissions,
        revokedPermissions: input.revokedPermissions,
        billingCycle: input.billingCycle,
        calculatedMonthlyValue: payload.calculated_monthly_value,
        discountAmount: payload.discount_amount,
        agreedMonthlyValue: payload.agreed_monthly_value,
        setupFeeCharged: payload.setup_fee_charged,
        paymentStatus: input.paymentStatus,
        blockOnOverdue: input.blockOnOverdue,
        billingDay: payload.billing_day,
        trialEndsAt: null,
        nextDueDate: input.nextDueDate || null,
        lastPaymentAt: existing?.lastPaymentAt || null,
        commercialNotes: input.commercialNotes || null,
        updatedBy: currentUser?.id || null,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    const localMap = readLocalCache<Record<string, UserPermissionProfile>>(
      LOCAL_PROFILES_CACHE_KEY,
      {}
    )
    localMap[input.userId] = savedProfile
    writeLocalCache(LOCAL_PROFILES_CACHE_KEY, localMap)

    // Dispara evento global para atualizar o hook usePermissions imediatamente na sessão ativa
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olivelas:permissions-updated', { detail: savedProfile }))
    }

    const summaryText = `Plano "${savedProfile.customPlanName || matchedGroup?.name || 'Personalizado'}" aplicado (${input.enabledModules.length}/10 módulos ativos) — Valor acordado: R$ ${savedProfile.agreedMonthlyValue.toFixed(2).replace('.', ',')}/mês`

    await this.recordBillingAuditLog({
      targetUserId: input.userId,
      storeId: input.storeId || null,
      eventType: 'MODULES_CHANGED',
      summary: summaryText,
      previousState: existing
        ? {
            enabledModules: existing.enabledModules,
            agreedMonthlyValue: existing.agreedMonthlyValue,
            paymentStatus: existing.paymentStatus,
          }
        : {},
      newState: {
        enabledModules: savedProfile.enabledModules,
        agreedMonthlyValue: savedProfile.agreedMonthlyValue,
        paymentStatus: savedProfile.paymentStatus,
        enforceOverStoreAdmin: savedProfile.enforceOverStoreAdmin,
      },
    })

    auditService.logAction({
      storeId: input.storeId || undefined,
      action: 'USER_PERMISSION_PROFILE_UPDATED',
      entity: 'user_permission_profiles',
      entityId: input.userId,
      afterData: {
        plan: savedProfile.customPlanName,
        enabledModules: savedProfile.enabledModules,
        agreedMonthlyValue: savedProfile.agreedMonthlyValue,
        paymentStatus: savedProfile.paymentStatus,
      },
    })

    return savedProfile
  },

  /**
   * Lista todo o histórico de faturas e pagamentos de um usuário
   */
  async listUserPayments(userId: string): Promise<SubscriptionPayment[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (!error && data) {
        const mapped = data.map(mapPaymentRow)
        const allLocal = readLocalCache<Record<string, SubscriptionPayment[]>>(
          LOCAL_PAYMENTS_CACHE_KEY,
          {}
        )
        allLocal[userId] = mapped
        writeLocalCache(LOCAL_PAYMENTS_CACHE_KEY, allLocal)
        return mapped
      }
    } catch {
      // Fallback
    }

    const allLocal = readLocalCache<Record<string, SubscriptionPayment[]>>(
      LOCAL_PAYMENTS_CACHE_KEY,
      {}
    )
    return allLocal[userId] || []
  },

  /**
   * Registra uma nova cobrança ou pagamento (já pago ou pendente) para o usuário
   */
  async createSubscriptionPayment(input: {
    userId: string
    storeId?: string | null
    referenceMonth: string
    description: string
    snapshotPlanName?: string | null
    snapshotModules: ModuleCode[]
    amount: number
    discountAmount?: number
    paidAmount?: number
    paymentMethod: InvoicePaymentMethod
    status: InvoicePaymentStatus
    dueDate: string
    externalTransactionId?: string
    notes?: string
  }): Promise<SubscriptionPayment> {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    const profile = await this.getUserPermissionProfile(input.userId)
    const nowIso = new Date().toISOString()
    const isPaid = input.status === 'PAID'
    const finalPaidAmount = isPaid
      ? Number(input.paidAmount ?? Math.max(0, input.amount - (input.discountAmount || 0)))
      : Number(input.paidAmount || 0)

    const payload = {
      user_permission_profile_id:
        profile?.id && !profile.id.startsWith('local-') ? profile.id : null,
      user_id: input.userId,
      store_id: input.storeId || profile?.storeId || null,
      reference_month: input.referenceMonth,
      description: input.description,
      snapshot_plan_name: input.snapshotPlanName || profile?.customPlanName || 'Mensalidade SaaS',
      snapshot_modules: input.snapshotModules,
      amount: Number(input.amount || 0),
      discount_amount: Number(input.discountAmount || 0),
      paid_amount: finalPaidAmount,
      payment_method: input.paymentMethod,
      status: input.status,
      due_date: input.dueDate,
      paid_at: isPaid ? nowIso : null,
      external_transaction_id: input.externalTransactionId || null,
      notes: input.notes || null,
      recorded_by: currentUser?.id || null,
    }

    let createdPayment: SubscriptionPayment | null = null

    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .insert(payload)
        .select('*')
        .single()

      if (!error && data) {
        createdPayment = mapPaymentRow(data)
      }
    } catch {
      // Fallback
    }

    if (!createdPayment) {
      createdPayment = mapPaymentRow({
        id: `local-pay-${Date.now()}`,
        ...payload,
        created_at: nowIso,
        updated_at: nowIso,
      })
    }

    const allLocal = readLocalCache<Record<string, SubscriptionPayment[]>>(
      LOCAL_PAYMENTS_CACHE_KEY,
      {}
    )
    allLocal[input.userId] = [createdPayment, ...(allLocal[input.userId] || [])]
    writeLocalCache(LOCAL_PAYMENTS_CACHE_KEY, allLocal)

    // Se foi registrado como PAGO, atualiza a data do último pagamento e ativa a assinatura
    if (isPaid && profile) {
      const nextDue = new Date(input.dueDate + 'T12:00:00')
      nextDue.setMonth(nextDue.getMonth() + 1)
      const nextDueStr = nextDue.toISOString().slice(0, 10)

      try {
        await supabase
          .from('user_permission_profiles')
          .update({
            payment_status: 'ACTIVE',
            last_payment_at: nowIso,
            next_due_date: nextDueStr,
          })
          .eq('user_id', input.userId)
      } catch {
        // Ignore
      }
    }

    await this.recordBillingAuditLog({
      targetUserId: input.userId,
      storeId: input.storeId || null,
      eventType: isPaid ? 'PAYMENT_MARKED_PAID' : 'PAYMENT_CREATED',
      summary: `${isPaid ? 'Pagamento recebido' : 'Cobrança gerada'} (${input.referenceMonth}) via ${input.paymentMethod}: R$ ${Number(isPaid ? finalPaidAmount : input.amount).toFixed(2).replace('.', ',')}`,
      previousState: {},
      newState: {
        paymentId: createdPayment.id,
        referenceMonth: input.referenceMonth,
        amount: input.amount,
        paidAmount: finalPaidAmount,
        status: input.status,
        paymentMethod: input.paymentMethod,
      },
    })

    return createdPayment
  },

  /**
   * Dá baixa em 1 clique em uma fatura pendente/atrasada (marca como PAID)
   */
  async markPaymentAsPaid(
    payment: SubscriptionPayment,
    options?: { paymentMethod?: InvoicePaymentMethod; externalTransactionId?: string }
  ): Promise<SubscriptionPayment> {
    const nowIso = new Date().toISOString()
    const netAmount = Math.max(0, payment.amount - payment.discountAmount)
    const method = options?.paymentMethod || payment.paymentMethod || 'PIX'

    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .update({
          status: 'PAID',
          paid_amount: netAmount,
          paid_at: nowIso,
          payment_method: method,
          external_transaction_id:
            options?.externalTransactionId || payment.externalTransactionId || null,
        })
        .eq('id', payment.id)
        .select('*')
        .single()

      if (!error && data) {
        const updated = mapPaymentRow(data)

        // Avança próximo vencimento no perfil do usuário e deixa ACTIVE
        const nextDue = new Date(payment.dueDate + 'T12:00:00')
        nextDue.setMonth(nextDue.getMonth() + 1)
        await supabase
          .from('user_permission_profiles')
          .update({
            payment_status: 'ACTIVE',
            last_payment_at: nowIso,
            next_due_date: nextDue.toISOString().slice(0, 10),
          })
          .eq('user_id', payment.userId)

        await this.recordBillingAuditLog({
          targetUserId: payment.userId,
          storeId: payment.storeId,
          eventType: 'PAYMENT_MARKED_PAID',
          summary: `Baixa de pagamento confirmada (${payment.referenceMonth}) — R$ ${netAmount.toFixed(2).replace('.', ',')} via ${method}`,
          previousState: { status: payment.status },
          newState: { status: 'PAID', paidAmount: netAmount, paidAt: nowIso },
        })

        return updated
      }
    } catch {
      // Fallback
    }

    const updated: SubscriptionPayment = {
      ...payment,
      status: 'PAID',
      paidAmount: netAmount,
      paidAt: nowIso,
      paymentMethod: method,
    }
    const allLocal = readLocalCache<Record<string, SubscriptionPayment[]>>(
      LOCAL_PAYMENTS_CACHE_KEY,
      {}
    )
    allLocal[payment.userId] = (allLocal[payment.userId] || []).map((p) =>
      p.id === payment.id ? updated : p
    )
    writeLocalCache(LOCAL_PAYMENTS_CACHE_KEY, allLocal)
    return updated
  },

  /**
   * Atualiza o status de uma fatura (ex: CANCELLED, OVERDUE)
   */
  async updatePaymentStatus(
    payment: SubscriptionPayment,
    newStatus: InvoicePaymentStatus
  ): Promise<void> {
    try {
      await supabase
        .from('subscription_payments')
        .update({ status: newStatus })
        .eq('id', payment.id)
    } catch {
      // Fallback
    }

    const allLocal = readLocalCache<Record<string, SubscriptionPayment[]>>(
      LOCAL_PAYMENTS_CACHE_KEY,
      {}
    )
    allLocal[payment.userId] = (allLocal[payment.userId] || []).map((p) =>
      p.id === payment.id ? { ...p, status: newStatus } : p
    )
    writeLocalCache(LOCAL_PAYMENTS_CACHE_KEY, allLocal)

    await this.recordBillingAuditLog({
      targetUserId: payment.userId,
      storeId: payment.storeId,
      eventType: 'PAYMENT_STATUS_CHANGED',
      summary: `Status da fatura ${payment.referenceMonth} alterado de ${payment.status} para ${newStatus}`,
      previousState: { status: payment.status },
      newState: { status: newStatus },
    })
  },

  /**
   * Registra log de auditoria de permissão e cobrança
   */
  async recordBillingAuditLog(entry: {
    targetUserId: string
    storeId?: string | null
    eventType: PermissionBillingAuditLog['eventType']
    summary: string
    previousState?: Record<string, any>
    newState?: Record<string, any>
  }): Promise<void> {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    try {
      await supabase.from('permission_billing_audit_logs').insert({
        target_user_id: entry.targetUserId,
        store_id: entry.storeId || null,
        actor_user_id: currentUser?.id || null,
        event_type: entry.eventType,
        summary: entry.summary,
        previous_state: entry.previousState || {},
        new_state: entry.newState || {},
      })
    } catch {
      // Fallback
    }

    const allAudit = readLocalCache<Record<string, PermissionBillingAuditLog[]>>(
      LOCAL_AUDIT_CACHE_KEY,
      {}
    )
    const logItem: PermissionBillingAuditLog = {
      id: `audit-${Date.now()}`,
      targetUserId: entry.targetUserId,
      storeId: entry.storeId || null,
      actorUserId: currentUser?.id || null,
      eventType: entry.eventType,
      summary: entry.summary,
      previousState: entry.previousState || {},
      newState: entry.newState || {},
      createdAt: new Date().toISOString(),
    }
    allAudit[entry.targetUserId] = [logItem, ...(allAudit[entry.targetUserId] || [])]
    writeLocalCache(LOCAL_AUDIT_CACHE_KEY, allAudit)
  },

  /**
   * Lista logs de auditoria de permissão e financeiro de um usuário
   */
  async listUserBillingAuditLogs(userId: string): Promise<PermissionBillingAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('permission_billing_audit_logs')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        return data.map(mapAuditRow)
      }
    } catch {
      // Fallback
    }
    const allAudit = readLocalCache<Record<string, PermissionBillingAuditLog[]>>(
      LOCAL_AUDIT_CACHE_KEY,
      {}
    )
    return allAudit[userId] || []
  },

  /**
   * Lista todas as faturas e pagamentos da plataforma (visão consolidada Financeiro)
   */
  async listAllPlatformPayments(): Promise<SubscriptionPayment[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .order('due_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(300)

      if (!error && data && data.length > 0) {
        return data.map(mapPaymentRow)
      }
    } catch {
      // Fallback
    }

    const allLocal = readLocalCache<Record<string, SubscriptionPayment[]>>(
      LOCAL_PAYMENTS_CACHE_KEY,
      {}
    )
    const flattened = Object.values(allLocal).flat()
    return flattened.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''))
  },

  /**
   * Obtém as regras globais de cobrança e licenciamento de funcionários (ex: 10 funcionários grátis por loja)
   */
  async getPlatformBillingRules(): Promise<PlatformBillingRules> {
    const localCached = readLocalCache<PlatformBillingRules>(
      LOCAL_BILLING_RULES_CACHE_KEY,
      DEFAULT_BILLING_RULES
    )

    try {
      const { data, error } = await supabase
        .from('platform_billing_rules')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (!error && data) {
        const merged: PlatformBillingRules = {
          id: data.id || 'default',
          defaultFreeEmployeesPerStore: Number(
            data.default_free_employees_per_store ?? localCached.defaultFreeEmployeesPerStore ?? 10
          ),
          defaultExtraEmployeePrice: Number(
            data.default_extra_employee_price ?? localCached.defaultExtraEmployeePrice ?? 19.9
          ),
          countStoreAdminsInQuota: Boolean(
            data.count_store_admins_in_quota ?? localCached.countStoreAdminsInQuota ?? false
          ),
          gracePeriodDays: Number(data.grace_period_days ?? localCached.gracePeriodDays ?? 5),
          autoBlockOverdue: Boolean(data.auto_block_overdue ?? localCached.autoBlockOverdue ?? true),
          pixKey: data.pix_key ?? localCached.pixKey ?? null,
          billingSupportWhatsapp:
            data.billing_support_whatsapp ?? localCached.billingSupportWhatsapp ?? null,
          notes: data.notes ?? localCached.notes ?? null,
          storeOverrides: localCached.storeOverrides || {},
          updatedBy: data.updated_by ?? null,
          updatedAt: data.updated_at ?? localCached.updatedAt ?? new Date().toISOString(),
        }
        writeLocalCache(LOCAL_BILLING_RULES_CACHE_KEY, merged)
        return merged
      }
    } catch {
      // Fallback to localStorage
    }

    return localCached
  },

  /**
   * Salva as regras globais de cobrança e licenciamento de funcionários
   */
  async savePlatformBillingRules(
    updates: Partial<PlatformBillingRules>
  ): Promise<PlatformBillingRules> {
    const current = await this.getPlatformBillingRules()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    const next: PlatformBillingRules = {
      ...current,
      ...updates,
      defaultFreeEmployeesPerStore: Math.max(
        0,
        Number(updates.defaultFreeEmployeesPerStore ?? current.defaultFreeEmployeesPerStore ?? 10)
      ),
      defaultExtraEmployeePrice: Math.max(
        0,
        Number(updates.defaultExtraEmployeePrice ?? current.defaultExtraEmployeePrice ?? 19.9)
      ),
      gracePeriodDays: Math.max(
        0,
        Number(updates.gracePeriodDays ?? current.gracePeriodDays ?? 5)
      ),
      storeOverrides: updates.storeOverrides ?? current.storeOverrides ?? {},
      updatedBy: currentUser?.id || null,
      updatedAt: new Date().toISOString(),
    }

    writeLocalCache(LOCAL_BILLING_RULES_CACHE_KEY, next)

    try {
      await supabase.from('platform_billing_rules').upsert(
        {
          id: 'default',
          default_free_employees_per_store: next.defaultFreeEmployeesPerStore,
          default_extra_employee_price: next.defaultExtraEmployeePrice,
          count_store_admins_in_quota: next.countStoreAdminsInQuota,
          grace_period_days: next.gracePeriodDays,
          auto_block_overdue: next.autoBlockOverdue,
          pix_key: next.pixKey,
          billing_support_whatsapp: next.billingSupportWhatsapp,
          notes: next.notes,
          updated_by: currentUser?.id || null,
          updated_at: next.updatedAt,
        },
        { onConflict: 'id' }
      )
    } catch {
      // Fallback saved in localStorage
    }

    auditService.logAction({
      action: 'BILLING_RULES_UPDATED',
      entity: 'platform_billing_rules',
      entityId: 'default',
      afterData: {
        defaultFreeEmployeesPerStore: next.defaultFreeEmployeesPerStore,
        defaultExtraEmployeePrice: next.defaultExtraEmployeePrice,
        gracePeriodDays: next.gracePeriodDays,
        autoBlockOverdue: next.autoBlockOverdue,
      },
    })

    return next
  },

  /**
   * Salva exceção de cota de funcionários grátis e preço de licença adicional para uma loja específica
   */
  async saveStoreLicensingOverride(
    storeId: string,
    override: {
      freeEmployeesLimit: number | null
      extraEmployeePrice: number | null
    }
  ): Promise<void> {
    const rules = await this.getPlatformBillingRules()
    const nextOverrides = { ...(rules.storeOverrides || {}) }

    if (override.freeEmployeesLimit === null && override.extraEmployeePrice === null) {
      delete nextOverrides[storeId]
    } else {
      nextOverrides[storeId] = {
        freeEmployeesLimit: override.freeEmployeesLimit,
        extraEmployeePrice: override.extraEmployeePrice,
      }
    }

    await this.savePlatformBillingRules({ storeOverrides: nextOverrides })

    try {
      await supabase
        .from('stores')
        .update({
          free_employees_limit: override.freeEmployeesLimit,
          extra_employee_price: override.extraEmployeePrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storeId)
    } catch {
      // Fallback handled by localStorage storeOverrides
    }
  },

  /**
   * Calcula o resumo de licenças de funcionários (cota gratuita vs excedente cobrado) de todas as lojas
   */
  async getStoresEmployeeLicenseSummaries(): Promise<StoreEmployeeLicenseSummary[]> {
    const rules = await this.getPlatformBillingRules()

    const { data: storesData } = await supabase
      .from('stores')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    const stores = storesData || []
    if (stores.length === 0) return []

    const { data: storeUsersData } = await supabase
      .from('store_users')
      .select(`
        id,
        store_id,
        user_id,
        role,
        is_active,
        profiles (
          id,
          full_name,
          email
        )
      `)

    const membersByStore = new Map<string, any[]>()
    for (const su of (storeUsersData || []) as any[]) {
      const list = membersByStore.get(su.store_id) || []
      list.push(su)
      membersByStore.set(su.store_id, list)
    }

    return stores.map((store: any) => {
      const members = membersByStore.get(store.id) || []
      const storeAdminUsers = members
        .filter((m) => m.role === 'STORE_ADMIN')
        .map((m) => ({
          userId: m.user_id,
          fullName: m.profiles?.full_name || null,
          email: m.profiles?.email || '',
        }))

      const nonAdminMembers = members.filter((m) => m.role !== 'STORE_ADMIN')
      const activeEmployeesCount = rules.countStoreAdminsInQuota
        ? members.filter((m) => m.is_active !== false).length
        : nonAdminMembers.filter((m) => m.is_active !== false).length

      const inactiveEmployeesCount = nonAdminMembers.filter((m) => m.is_active === false).length

      const localOverride = rules.storeOverrides?.[store.id]
      const customLimit =
        store.free_employees_limit !== undefined && store.free_employees_limit !== null
          ? Number(store.free_employees_limit)
          : localOverride?.freeEmployeesLimit !== undefined && localOverride?.freeEmployeesLimit !== null
            ? Number(localOverride.freeEmployeesLimit)
            : null

      const customPrice =
        store.extra_employee_price !== undefined && store.extra_employee_price !== null
          ? Number(store.extra_employee_price)
          : localOverride?.extraEmployeePrice !== undefined && localOverride?.extraEmployeePrice !== null
            ? Number(localOverride.extraEmployeePrice)
            : null

      const freeEmployeesQuota = customLimit ?? rules.defaultFreeEmployeesPerStore
      const extraEmployeeUnitPrice = customPrice ?? rules.defaultExtraEmployeePrice
      const extraBillableEmployees = Math.max(0, activeEmployeesCount - freeEmployeesQuota)
      const extraEmployeesMonthlyCost = extraBillableEmployees * extraEmployeeUnitPrice

      return {
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        isBranch: Boolean(store.is_branch || store.parent_store_id),
        parentStoreId: store.parent_store_id || null,
        branchCode: store.branch_code || null,
        storeAdminUsers,
        totalMembersCount: members.length,
        storeAdminsCount: storeAdminUsers.length,
        activeEmployeesCount,
        inactiveEmployeesCount,
        freeEmployeesQuota,
        extraBillableEmployees,
        extraEmployeeUnitPrice,
        extraEmployeesMonthlyCost,
        hasCustomStoreOverride: customLimit !== null || customPrice !== null,
      }
    })
  },

  /**
   * Calcula o resumo de licenças de funcionários para uma loja específica
   */
  async getStoreEmployeeLicenseSummary(
    storeId: string
  ): Promise<StoreEmployeeLicenseSummary | null> {
    const all = await this.getStoresEmployeeLicenseSummaries()
    return all.find((s) => s.storeId === storeId) || null
  },
}
