import type { UserRole } from './database.types'

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  phone: string | null
  isGlobalAdmin: boolean
  createdAt: string
  updated_at?: string
}

export interface StoreUserMembership {
  id: string
  storeId: string
  storeName: string
  storeSlug: string
  role: UserRole
  isActive: boolean
}

export interface AuthState {
  user: UserProfile | null
  activeStore: StoreUserMembership | null
  userStores: StoreUserMembership[]
  isLoading: boolean
  isAuthenticated: boolean
}
