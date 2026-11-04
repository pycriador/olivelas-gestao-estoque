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
  isBranch?: boolean
  parentStoreId?: string | null
  parentStoreName?: string | null
  branchCode?: string | null
}

/**
 * Formata o nome de exibição de uma loja ou filial de forma clara:
 * - Matriz: "Primor"
 * - Filial com Matriz conhecida: "Primor • Filial P1"
 * - Filial cujo nome já inclui a Matriz: mantém sem duplicar
 */
export function formatStoreHierarchyName(store: {
  storeName?: string
  name?: string
  isBranch?: boolean
  parentStoreId?: string | null
  parentStoreName?: string | null
  branchCode?: string | null
}): string {
  const rawName = (store.storeName || store.name || 'Loja').trim()
  const isBranch = Boolean(store.isBranch || store.parentStoreId)
  if (!isBranch) return rawName

  const parentName = (store.parentStoreName || '').trim()
  const lowerName = rawName.toLowerCase()
  const hasFilialWord = lowerName.includes('filial')

  const branchLabel = hasFilialWord ? rawName : `Filial ${rawName}`

  if (parentName && !lowerName.startsWith(parentName.toLowerCase())) {
    return `${parentName} • ${branchLabel}`
  }

  return branchLabel
}

export interface AuthState {
  user: UserProfile | null
  activeStore: StoreUserMembership | null
  userStores: StoreUserMembership[]
  isLoading: boolean
  isAuthenticated: boolean
}
