import { useAuth } from './useAuth'
import { useTenant } from './useTenant'
import type { UserRole } from '@/types/database.types'

const ROLE_PERMISSIONS_MAP: Record<UserRole, string[]> = {
  GLOBAL_ADMIN: ['*'],
  STORE_ADMIN: [
    'products.*', 'inventory.*', 'sales.*', 'customers.*',
    'suppliers.*', 'purchasing.*', 'reports.*', 'stores.manage', 'users.manage'
  ],
  FINANCE: [
    'sales.read', 'purchase_orders.read', 'purchase_orders.create',
    'customers.read', 'suppliers.read', 'reports.*'
  ],
  SELLER: [
    'products.read', 'inventory.read', 'sales.read', 'sales.create',
    'sales.update', 'customers.read', 'customers.create', 'customers.update', 'reports.sales'
  ],
  INVENTORY: [
    'products.read', 'products.create', 'products.update', 'inventory.read',
    'inventory.adjust', 'inventory.receive', 'inventory.writeoff',
    'suppliers.read', 'purchase_orders.read', 'purchase_orders.receive', 'reports.inventory'
  ],
  VIEWER: [
    'products.read', 'inventory.read', 'sales.read', 'customers.read', 'reports.sales'
  ],
}

export function usePermissions() {
  const { isGlobalAdmin } = useAuth()
  const { role } = useTenant()

  const hasPermission = (permission: string): boolean => {
    if (isGlobalAdmin) return true

    const currentRole = role as UserRole
    const userPerms = ROLE_PERMISSIONS_MAP[currentRole] || []

    if (userPerms.includes('*')) return true
    if (userPerms.includes(permission)) return true

    // Check wildcard like 'products.*'
    const modulePrefix = permission.split('.')[0] + '.*'
    return userPerms.includes(modulePrefix)
  }

  const canManageStore = isGlobalAdmin || role === 'STORE_ADMIN'
  const canManageInventory = isGlobalAdmin || ['STORE_ADMIN', 'INVENTORY'].includes(role)
  const canSell = isGlobalAdmin || ['STORE_ADMIN', 'SELLER', 'FINANCE'].includes(role)
  const canViewReports = isGlobalAdmin || ['STORE_ADMIN', 'FINANCE', 'SELLER', 'INVENTORY', 'VIEWER'].includes(role)

  return {
    hasPermission,
    canManageStore,
    canManageInventory,
    canSell,
    canViewReports,
    role,
    isGlobalAdmin,
  }
}
