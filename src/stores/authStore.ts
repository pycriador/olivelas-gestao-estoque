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

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  activeStore: null,
  userStores: [],
  isLoading: true,
  isAuthenticated: false,

  initAuth: async () => {
    try {
      set({ isLoading: true })
      const currentUser = await authService.getCurrentUser()

      if (!currentUser) {
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
      let selectedStore = stores.find(s => s.storeId === savedStoreId) || stores[0] || null

      // If user is global admin and has no direct store, make placeholder or leave selectedStore
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

      set({
        user: currentUser,
        userStores: stores,
        activeStore: selectedStore,
        isLoading: false,
        isAuthenticated: true,
      })
    } catch (err) {
      console.error('Auth initialization error:', err)
      set({
        user: null,
        activeStore: null,
        userStores: [],
        isLoading: false,
        isAuthenticated: false,
      })
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
    const stillExists = stores.find(s => s.storeId === currentActive?.storeId)

    set({
      userStores: stores,
      activeStore: stillExists || stores[0] || currentActive,
    })
  },

  signOut: async () => {
    await authService.signOut()
    localStorage.removeItem(ACTIVE_STORE_KEY)
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
