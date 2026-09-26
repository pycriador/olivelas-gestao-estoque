import { create } from 'zustand'
import { authService } from '@/services/authService'
import { supabase } from '@/lib/supabase/client'
import type { StoreUserMembership, UserProfile } from '@/types/auth.types'

interface AuthStoreState {
  user: UserProfile | null
  activeStore: StoreUserMembership | null
  userStores: StoreUserMembership[]
  isLoading: boolean
  isAuthenticated: boolean
  initAuth: () => Promise<void>
  setActiveStore: (store: StoreUserMembership) => void
  refreshStores: () => Promise<void>
  signOut: () => Promise<void>
}

const ACTIVE_STORE_KEY = 'olivelas_active_store_id'
const USER_PROFILE_KEY = 'olivelas_user_profile'
const USER_STORES_KEY = 'olivelas_user_stores'

const getCachedSession = (): {
  user: UserProfile | null
  activeStore: StoreUserMembership | null
  userStores: StoreUserMembership[]
  isAuthenticated: boolean
  isLoading: boolean
} => {
  if (typeof window === 'undefined') {
    return { user: null, activeStore: null, userStores: [], isAuthenticated: false, isLoading: true }
  }
  try {
    const rawUser = localStorage.getItem(USER_PROFILE_KEY) || sessionStorage.getItem(USER_PROFILE_KEY)
    const rawStores = localStorage.getItem(USER_STORES_KEY) || sessionStorage.getItem(USER_STORES_KEY)
    const savedStoreId = localStorage.getItem(ACTIVE_STORE_KEY)

    if (rawUser && rawStores) {
      const user: UserProfile = JSON.parse(rawUser)
      const userStores: StoreUserMembership[] = JSON.parse(rawStores)
      let activeStore = userStores.find((s) => s.storeId === savedStoreId) || userStores[0] || null

      if (!activeStore && user.isGlobalAdmin) {
        activeStore = {
          id: 'global',
          storeId: 'all',
          storeName: 'Visão Global (Todas as Lojas)',
          storeSlug: 'global',
          role: 'GLOBAL_ADMIN',
          isActive: true,
        }
      }

      return {
        user,
        userStores,
        activeStore,
        isAuthenticated: true,
        isLoading: false,
      }
    }
  } catch {
    // Ignore parse error
  }
  return { user: null, activeStore: null, userStores: [], isAuthenticated: false, isLoading: true }
}

const initialCached = getCachedSession()

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: initialCached.user,
  activeStore: initialCached.activeStore,
  userStores: initialCached.userStores,
  isLoading: initialCached.isLoading,
  isAuthenticated: initialCached.isAuthenticated,

  initAuth: async () => {
    const isAlreadyLoaded = Boolean(get().user)
    if (!isAlreadyLoaded) {
      set({ isLoading: true })
    }

    try {
      const currentUser = await authService.getCurrentUser()

      if (!currentUser) {
        localStorage.removeItem(USER_PROFILE_KEY)
        localStorage.removeItem(USER_STORES_KEY)
        sessionStorage.removeItem(USER_PROFILE_KEY)
        sessionStorage.removeItem(USER_STORES_KEY)

        set({
          user: null,
          activeStore: null,
          userStores: [],
          isLoading: false,
          isAuthenticated: false,
        })
        return
      }

      const stores = await authService.getUserStores(currentUser.id)
      const savedStoreId = localStorage.getItem(ACTIVE_STORE_KEY)
      let selectedStore = stores.find((s) => s.storeId === savedStoreId) || stores[0] || null

      if (!selectedStore && currentUser.isGlobalAdmin) {
        selectedStore = {
          id: 'global',
          storeId: 'all',
          storeName: 'Visão Global (Todas as Lojas)',
          storeSlug: 'global',
          role: 'GLOBAL_ADMIN',
          isActive: true,
        }
      }

      try {
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(currentUser))
        localStorage.setItem(USER_STORES_KEY, JSON.stringify(stores))
      } catch {
        // Fallback or ignore storage quota
      }

      set({
        user: currentUser,
        userStores: stores,
        activeStore: selectedStore,
        isLoading: false,
        isAuthenticated: true,
      })
    } catch (err) {
      console.error('Auth initialization error:', err)
      if (!isAlreadyLoaded) {
        set({
          user: null,
          activeStore: null,
          userStores: [],
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }
  },

  setActiveStore: (store: StoreUserMembership) => {
    localStorage.setItem(ACTIVE_STORE_KEY, store.storeId)
    set({ activeStore: store })
  },

  refreshStores: async () => {
    const { user } = get()
    if (!user) return
    const stores = await authService.getUserStores(user.id)
    const currentActive = get().activeStore
    const stillExists = stores.find((s) => s.storeId === currentActive?.storeId)

    try {
      localStorage.setItem(USER_STORES_KEY, JSON.stringify(stores))
    } catch {
      // Ignore storage error
    }

    set({
      userStores: stores,
      activeStore: stillExists || stores[0] || currentActive,
    })
  },

  signOut: async () => {
    await authService.signOut()
    localStorage.removeItem(ACTIVE_STORE_KEY)
    localStorage.removeItem(USER_PROFILE_KEY)
    localStorage.removeItem(USER_STORES_KEY)
    sessionStorage.removeItem(USER_PROFILE_KEY)
    sessionStorage.removeItem(USER_STORES_KEY)

    set({
      user: null,
      activeStore: null,
      userStores: [],
      isLoading: false,
      isAuthenticated: false,
    })
  },
}))

// Listen for Supabase auth state change events
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
      useAuthStore.getState().initAuth()
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().signOut()
    }
  })
}
