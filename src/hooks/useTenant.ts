import { useAuthStore } from '@/stores/authStore'

export function useTenant() {
  const { activeStore, userStores, setActiveStore } = useAuthStore()

  return {
    storeId: activeStore?.storeId || '',
    storeName: activeStore?.storeName || 'Loja',
    storeSlug: activeStore?.storeSlug || '',
    role: activeStore?.role || 'VIEWER',
    activeStore,
    userStores,
    hasActiveStore: Boolean(activeStore && activeStore.storeId !== 'all'),
    setActiveStore,
  }
}
