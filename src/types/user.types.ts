import type { UserRole } from './database.types'

export interface PlatformUserStoreRef {
  storeId: string
  storeName: string
  storeSlug: string
  role: UserRole
  isActive: boolean
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
}
