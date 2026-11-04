import { useAuthStore } from '@/stores/authStore'
import { formatStoreHierarchyName } from '@/types/auth.types'

export function useTenant() {
  const { activeStore, userStores, setActiveStore } = useAuthStore()

  const storeDisplayName = activeStore
    ? formatStoreHierarchyName(activeStore)
    : 'Loja'

  return {
    storeId: activeStore?.storeId || '',
    storeName: activeStore?.storeName || 'Loja',
    storeDisplayName,
    storeSlug: activeStore?.storeSlug || '',
    role: activeStore?.role || 'VIEWER',
    isBranch: Boolean(activeStore?.isBranch || activeStore?.parentStoreId),
    parentStoreId: activeStore?.parentStoreId || null,
    parentStoreName: activeStore?.parentStoreName || null,
    branchCode: activeStore?.branchCode || null,
    activeStore,
    userStores,
    hasActiveStore: Boolean(activeStore && activeStore.storeId !== 'all'),
    setActiveStore,
  }
}
