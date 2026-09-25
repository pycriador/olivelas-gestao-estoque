import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const { user, activeStore, userStores, isLoading, isAuthenticated, setActiveStore, signOut, refreshStores } = useAuthStore()

  return {
    user,
    activeStore,
    userStores,
    isLoading,
    isAuthenticated,
    isGlobalAdmin: user?.isGlobalAdmin || false,
    setActiveStore,
    signOut,
    refreshStores,
  }
}
