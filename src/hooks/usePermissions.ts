import * as React from 'react'
import { useAuth } from './useAuth'
import { useTenant } from './useTenant'
import { supabase } from '@/lib/supabase/client'
import { permissionGroupService } from '@/services/permissionGroupService'
import {
  ALL_MODULE_CODES,
  DEFAULT_PERMISSION_MODULES,
  ROUTE_TO_MODULE_MAP,
} from '@/constants/screenDependencies'
import {
  ROLE_DEFAULT_PERMISSIONS,
  resolveEmployeePermissions,
} from '@/constants/granularPermissions'
import type { UserRole } from '@/types/database.types'
import type { ModuleCode, UserPermissionProfile } from '@/types/permissionGroup.types'

const ROLE_PERMISSIONS_MAP: Record<UserRole, string[]> = {
  GLOBAL_ADMIN: ['*'],
  STORE_ADMIN: [
    'products.*',
    'categories.manage',
    'orders.*',
    'catalog.whatsapp',
    'inventory.*',
    'sales.*',
    'customers.*',
    'suppliers.*',
    'purchasing.*',
    'purchase_orders.*',
    'reports.*',
    'stores.manage',
    'users.manage',
    'audit.view',
    'integrations.manage',
  ],
  STOCK_APPROVER: [
    ...ROLE_DEFAULT_PERMISSIONS.STOCK_APPROVER,
  ],
  FINANCE: [
    ...ROLE_DEFAULT_PERMISSIONS.FINANCE,
    'reports.*',
  ],
  SELLER: [
    ...ROLE_DEFAULT_PERMISSIONS.SELLER,
  ],
  INVENTORY: [
    ...ROLE_DEFAULT_PERMISSIONS.INVENTORY,
  ],
  VIEWER: [
    ...ROLE_DEFAULT_PERMISSIONS.VIEWER,
  ],
}

interface ActiveStoreEmployeePermissions {
  role: UserRole
  canApproveWriteoff: boolean
  maxWriteoffValue: number | null
  grantedPermissions: string[]
  revokedPermissions: string[]
  customRolePermissions: string[] | null
  customRoleCanApprove: boolean
}

export function usePermissions() {
  const { user, isGlobalAdmin } = useAuth()
  const { role, storeId } = useTenant()
  const [permissionProfile, setPermissionProfile] = React.useState<UserPermissionProfile | null>(
    null
  )
  const [employeeData, setEmployeeData] = React.useState<ActiveStoreEmployeePermissions | null>(
    null
  )
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true
    if (!user?.id) {
      setPermissionProfile(null)
      return
    }

    setIsLoadingProfile(true)
    permissionGroupService
      .getUserPermissionProfile(user.id)
      .then((prof) => {
        if (isMounted) setPermissionProfile(prof)
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false)
      })

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserPermissionProfile>
      if (customEvent.detail && customEvent.detail.userId === user.id) {
        setPermissionProfile(customEvent.detail)
      }
    }

    window.addEventListener('olivelas:permissions-updated', handleProfileUpdate)
    return () => {
      isMounted = false
      window.removeEventListener('olivelas:permissions-updated', handleProfileUpdate)
    }
  }, [user?.id])

  // Carrega as permissões granulares do funcionário na loja ativa (store_users + store_custom_roles)
  React.useEffect(() => {
    let isMounted = true
    if (!user?.id || !storeId || storeId === 'all') {
      setEmployeeData(null)
      return
    }

    const fetchStoreEmployee = async () => {
      try {
        const { data, error } = await supabase
          .from('store_users')
          .select(`
            role,
            can_approve_writeoff,
            max_writeoff_value,
            granted_permissions,
            revoked_permissions,
            store_custom_roles (
              permissions,
              can_approve_writeoff
            )
          `)
          .eq('store_id', storeId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!isMounted) return
        if (error || !data) {
          setEmployeeData(null)
          return
        }

        const customRole = Array.isArray((data as any).store_custom_roles)
          ? (data as any).store_custom_roles[0]
          : (data as any).store_custom_roles

        setEmployeeData({
          role: (data as any).role as UserRole,
          canApproveWriteoff: Boolean((data as any).can_approve_writeoff),
          maxWriteoffValue:
            (data as any).max_writeoff_value !== null &&
            (data as any).max_writeoff_value !== undefined
              ? Number((data as any).max_writeoff_value)
              : null,
          grantedPermissions: Array.isArray((data as any).granted_permissions)
            ? (data as any).granted_permissions
            : [],
          revokedPermissions: Array.isArray((data as any).revoked_permissions)
            ? (data as any).revoked_permissions
            : [],
          customRolePermissions: Array.isArray(customRole?.permissions)
            ? customRole.permissions
            : null,
          customRoleCanApprove: Boolean(customRole?.can_approve_writeoff),
        })
      } catch {
        if (isMounted) setEmployeeData(null)
      }
    }

    fetchStoreEmployee()

    const handleEmployeeUpdated = () => {
      fetchStoreEmployee()
    }
    window.addEventListener('olivelas:employee-permissions-updated', handleEmployeeUpdated)
    return () => {
      isMounted = false
      window.removeEventListener('olivelas:employee-permissions-updated', handleEmployeeUpdated)
    }
  }, [user?.id, storeId])

  // Verifica se o contrato do usuário está suspenso com bloqueio ativo
  const isSubscriptionSuspended = Boolean(
    !isGlobalAdmin &&
      permissionProfile &&
      permissionProfile.blockOnOverdue &&
      (permissionProfile.paymentStatus === 'SUSPENDED' ||
        permissionProfile.paymentStatus === 'CANCELLED')
  )

  // Conjunto de permissões granulares efetivas do funcionário na loja ativa
  const resolvedEmployeePerms = React.useMemo(() => {
    const currentRole = (employeeData?.role || role || 'VIEWER') as UserRole
    return new Set(
      resolveEmployeePermissions({
        role: currentRole,
        customRolePermissions: employeeData?.customRolePermissions,
        grantedPermissions: employeeData?.grantedPermissions,
        revokedPermissions: employeeData?.revokedPermissions,
        canApproveWriteoff: Boolean(
          employeeData?.canApproveWriteoff || employeeData?.customRoleCanApprove
        ),
      }).effectivePermissions
    )
  }, [employeeData, role])

  // Verifica se um módulo comercial de tela (ex: MOD_POS_SALES, MOD_REPORTS, MOD_PURCHASING) está ativo
  const hasModule = React.useCallback(
    (moduleCode: ModuleCode): boolean => {
      if (isGlobalAdmin) return true
      if (isSubscriptionSuspended) return false

      // Se existe um perfil comercial atribuído pelo Global Admin
      if (permissionProfile) {
        const shouldEnforce =
          role !== 'STORE_ADMIN' || permissionProfile.enforceOverStoreAdmin !== false
        if (shouldEnforce && !permissionProfile.enabledModules.includes(moduleCode)) {
          return false
        }
      }

      // Verifica se o funcionário tem pelo menos uma permissão granular daquele módulo na loja
      const currentRole = (role as UserRole) || 'VIEWER'
      const rolePerms = ROLE_PERMISSIONS_MAP[currentRole] || []
      if (
        rolePerms.includes('*') &&
        (!employeeData || employeeData.revokedPermissions.length === 0)
      ) {
        return true
      }

      const modDef = DEFAULT_PERMISSION_MODULES.find((m) => m.code === moduleCode)
      if (!modDef) return true

      return modDef.permissions.some((perm) => {
        if (resolvedEmployeePerms.has(perm)) return true
        const prefix = perm.split('.')[0] + '.*'
        return (
          (rolePerms.includes(perm) || rolePerms.includes(prefix)) &&
          !employeeData?.revokedPermissions.includes(perm)
        )
      })
    },
    [isGlobalAdmin, isSubscriptionSuspended, permissionProfile, role, employeeData, resolvedEmployeePerms]
  )

  // Verifica se o usuário tem acesso a uma rota específica da aplicação
  const hasRouteAccess = React.useCallback(
    (path: string): boolean => {
      if (isGlobalAdmin) return true
      const cleanPath = path.split('?')[0]
      if (cleanPath === '/dashboard' || cleanPath === '/notifications') return true
      if (cleanPath === '/global-admin' || cleanPath.startsWith('/global-admin/')) {
        return Boolean(isGlobalAdmin)
      }

      const requiredModule = ROUTE_TO_MODULE_MAP[cleanPath]
      if (!requiredModule) return true

      return hasModule(requiredModule)
    },
    [isGlobalAdmin, hasModule]
  )

  // Verifica permissão granular (ex: 'inventory.approve_writeoff', 'inventory.transfer_branch', 'sales.pos')
  const hasPermission = React.useCallback(
    (permission: string): boolean => {
      if (isGlobalAdmin) return true
      if (isSubscriptionSuspended) return false

      const modulePrefix = permission.split('.')[0] + '.*'

      // 1. Verifica restrição de plano comercial Global Admin
      if (permissionProfile) {
        const shouldEnforce =
          role !== 'STORE_ADMIN' || permissionProfile.enforceOverStoreAdmin !== false

        if (shouldEnforce) {
          if (
            permissionProfile.revokedPermissions.includes(permission) ||
            permissionProfile.revokedPermissions.includes(modulePrefix)
          ) {
            return false
          }

          if (
            permissionProfile.grantedPermissions.includes(permission) ||
            permissionProfile.grantedPermissions.includes(modulePrefix) ||
            permissionProfile.grantedPermissions.includes('*')
          ) {
            return true
          }

          const activeMods = DEFAULT_PERMISSION_MODULES.filter((m) =>
            permissionProfile.enabledModules.includes(m.code)
          )
          const allowedByModules = activeMods.some(
            (m) =>
              m.permissions.includes(permission) ||
              m.permissions.includes(modulePrefix) ||
              m.permissions.some(
                (mp) => mp.split('.')[0] === permission.split('.')[0]
              )
          )

          if (!allowedByModules) return false
        }
      }

      // 2. Verifica revogação explícita no cadastro do funcionário na loja
      if (
        employeeData?.revokedPermissions.includes(permission) ||
        employeeData?.revokedPermissions.includes(modulePrefix)
      ) {
        return false
      }

      // 3. Verifica concessão explícita ou conjunto resolvido do funcionário na loja
      if (resolvedEmployeePerms.has(permission)) {
        return true
      }

      const currentRole = (role as UserRole) || 'VIEWER'
      const userPerms = ROLE_PERMISSIONS_MAP[currentRole] || []

      if (userPerms.includes('*')) return true
      if (userPerms.includes(permission)) return true

      return userPerms.includes(modulePrefix)
    },
    [
      isGlobalAdmin,
      isSubscriptionSuspended,
      permissionProfile,
      role,
      employeeData,
      resolvedEmployeePerms,
    ]
  )

  // Somente quem é aprovador de baixa de estoque pode autorizar essa baixa
  const canApproveWriteoff = Boolean(
    isGlobalAdmin ||
      role === 'STORE_ADMIN' ||
      role === 'STOCK_APPROVER' ||
      employeeData?.canApproveWriteoff ||
      employeeData?.customRoleCanApprove ||
      hasPermission('inventory.approve_writeoff')
  )

  const canTransferBranch = Boolean(
    isGlobalAdmin ||
      role === 'STORE_ADMIN' ||
      role === 'STOCK_APPROVER' ||
      hasPermission('inventory.transfer_branch')
  )

  const canManageStore =
    isGlobalAdmin ||
    ((role === 'STORE_ADMIN' || hasPermission('users.manage')) && hasModule('MOD_TEAM_AUDIT'))
  const canManageInventory =
    isGlobalAdmin ||
    (['STORE_ADMIN', 'STOCK_APPROVER', 'INVENTORY'].includes(role) && hasModule('MOD_INVENTORY'))
  const canSell =
    isGlobalAdmin ||
    (['STORE_ADMIN', 'SELLER', 'FINANCE'].includes(role) && hasModule('MOD_POS_SALES'))
  const canViewReports =
    isGlobalAdmin ||
    (['STORE_ADMIN', 'STOCK_APPROVER', 'FINANCE', 'SELLER', 'INVENTORY', 'VIEWER'].includes(
      role
    ) &&
      hasModule('MOD_REPORTS'))

  return {
    hasPermission,
    hasModule,
    hasRouteAccess,
    permissionProfile,
    employeeData,
    resolvedEmployeePermissions: Array.from(resolvedEmployeePerms),
    isLoadingProfile,
    isSubscriptionSuspended,
    enabledModules: permissionProfile?.enabledModules ?? ALL_MODULE_CODES,
    canApproveWriteoff,
    canTransferBranch,
    canManageStore,
    canManageInventory,
    canSell,
    canViewReports,
    role,
    isGlobalAdmin,
  }
}
