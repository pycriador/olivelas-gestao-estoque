import type { UserRole } from './database.types'
import type { UserPermissionProfile } from './permissionGroup.types'

export interface PlatformUserStoreRef {
  storeId: string
  storeName: string
  storeSlug: string
  role: UserRole
  isActive: boolean
  canApproveWriteoff?: boolean
  jobTitle?: string | null
  employeeRegistration?: string | null
  customRoleId?: string | null
  customRoleName?: string | null
  grantedPermissions?: string[]
  revokedPermissions?: string[]
}

export interface PlatformUser {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  isGlobalAdmin: boolean
  createdAt: string
  updatedAt?: string
  stores: PlatformUserStoreRef[]
  permissionProfile?: UserPermissionProfile | null
}

export interface StoreCustomRole {
  id: string
  storeId: string
  code: string
  name: string
  description: string | null
  baseRole: UserRole
  permissions: string[]
  canApproveWriteoff: boolean
  maxWriteoffValue: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StoreMember {
  id: string
  userId: string
  storeId: string
  role: UserRole
  isActive: boolean
  createdAt: string
  fullName: string | null
  email: string
  phone: string | null
  avatarUrl: string | null
  employeeRegistration?: string | null
  jobTitle?: string | null
  customRoleId?: string | null
  customRoleName?: string | null
  canApproveWriteoff?: boolean
  hasApprovalPin?: boolean
  approvalPin?: string | null
  maxWriteoffValue?: number | null
  grantedPermissions?: string[]
  revokedPermissions?: string[]
}

export interface StoreMemberUpsertInput {
  email: string
  fullName?: string
  phone?: string | null
  password?: string
  role: UserRole
  jobTitle?: string | null
  employeeRegistration?: string | null
  customRoleId?: string | null
  canApproveWriteoff?: boolean
  approvalPin?: string | null
  maxWriteoffValue?: number | null
  grantedPermissions?: string[]
  revokedPermissions?: string[]
  isActive?: boolean
}
