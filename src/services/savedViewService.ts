import { supabase } from '@/lib/supabase/client'
import type { OrderStatus } from '@/types/database.types'

export type SavedViewPageKey = 'customers' | 'orders' | 'reports'

export interface CustomerSavedViewFilters {
  customerStatuses?: ('ACTIVE' | 'INACTIVE')[]
  orderStatuses?: OrderStatus[]
  channels?: string[]
  period?: string // 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | '90D' | 'THIS_YEAR' | 'CUSTOM'
  dateFrom?: string
  dateTo?: string
  search?: string
  onlyWithOrders?: boolean
  customerId?: string
  orderId?: string
  expandedOrders?: boolean
}

export interface StoreSavedView {
  id: string
  store_id: string
  page_key: SavedViewPageKey
  name: string
  description: string | null
  color: string
  filters: CustomerSavedViewFilters
  is_default: boolean
  is_system_preset: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

const LOCAL_CACHE_PREFIX = 'olv_store_saved_views_v1'

function getLocalCacheKey(storeId: string, pageKey: SavedViewPageKey): string {
  return `${LOCAL_CACHE_PREFIX}_${storeId}_${pageKey}`
}

export function getDefaultPresetViews(
  storeId: string,
  pageKey: SavedViewPageKey
): StoreSavedView[] {
  const now = new Date().toISOString()

  if (pageKey === 'customers' || pageKey === 'orders') {
    return [
      {
        id: `preset-open-${storeId}`,
        store_id: storeId,
        page_key: pageKey,
        name: 'Pedidos Abertos',
        description: 'Acompanhamento de pedidos pendentes, confirmados, em separação, prontos ou em transporte',
        color: 'amber',
        filters: {
          customerStatuses: ['ACTIVE'],
          orderStatuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED'],
          period: 'ALL',
          onlyWithOrders: true,
        },
        is_default: false,
        is_system_preset: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `preset-closed-${storeId}`,
        store_id: storeId,
        page_key: pageKey,
        name: 'Pedidos Fechados',
        description: 'Pedidos concluídos e entregues com sucesso',
        color: 'emerald',
        filters: {
          customerStatuses: ['ACTIVE', 'INACTIVE'],
          orderStatuses: ['DELIVERED'],
          period: 'ALL',
          onlyWithOrders: true,
        },
        is_default: false,
        is_system_preset: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `preset-cancelled-${storeId}`,
        store_id: storeId,
        page_key: pageKey,
        name: 'Pedidos Cancelados',
        description: 'Pedidos cancelados para auditoria e retenção de clientes',
        color: 'rose',
        filters: {
          customerStatuses: ['ACTIVE', 'INACTIVE'],
          orderStatuses: ['CANCELLED'],
          period: 'ALL',
          onlyWithOrders: true,
        },
        is_default: false,
        is_system_preset: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `preset-all-active-${storeId}`,
        store_id: storeId,
        page_key: pageKey,
        name: 'Clientes Ativos (Todos)',
        description: 'Todos os clientes ativos da loja/filial independente de status do pedido',
        color: 'indigo',
        filters: {
          customerStatuses: ['ACTIVE'],
          orderStatuses: [],
          period: 'ALL',
          onlyWithOrders: false,
        },
        is_default: false,
        is_system_preset: true,
        created_at: now,
        updated_at: now,
      },
    ]
  }

  return []
}

async function readViewsFromStoreThemeConfig(
  storeId: string,
  pageKey: SavedViewPageKey
): Promise<StoreSavedView[] | null> {
  if (!storeId || storeId === 'all') return null
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('theme_config')
      .eq('id', storeId)
      .maybeSingle()

    if (error || !data) return null
    const themeConfig = ((data as any).theme_config || {}) as Record<string, any>
    const savedViewsMap = themeConfig.saved_views || {}
    const list = savedViewsMap[pageKey]
    if (Array.isArray(list) && list.length > 0) {
      return list as StoreSavedView[]
    }
    return null
  } catch {
    return null
  }
}

async function writeViewsToStoreThemeConfig(
  storeId: string,
  pageKey: SavedViewPageKey,
  views: StoreSavedView[]
): Promise<void> {
  if (!storeId || storeId === 'all') return
  try {
    const { data } = await supabase
      .from('stores')
      .select('theme_config')
      .eq('id', storeId)
      .maybeSingle()

    const currentConfig = (((data as any)?.theme_config) || {}) as Record<string, any>
    const savedViewsMap = { ...(currentConfig.saved_views || {}) }
    savedViewsMap[pageKey] = views

    await supabase
      .from('stores')
      .update({
        theme_config: {
          ...currentConfig,
          saved_views: savedViewsMap,
        },
      } as any)
      .eq('id', storeId)
  } catch {
    // Ignore fallback error if user has read-only access on stores table
  }
}

function saveToLocalCache(storeId: string, pageKey: SavedViewPageKey, views: StoreSavedView[]) {
  try {
    localStorage.setItem(getLocalCacheKey(storeId, pageKey), JSON.stringify(views))
  } catch {
    // Ignore storage quota errors
  }
}

function readFromLocalCache(storeId: string, pageKey: SavedViewPageKey): StoreSavedView[] | null {
  try {
    const raw = localStorage.getItem(getLocalCacheKey(storeId, pageKey))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

export const savedViewService = {
  /**
   * Lista todas as visões salvas para uma loja/filial específica e tela (`customers`, `orders`, `reports`).
   * Sincroniza automaticamente com a tabela `public.store_saved_views` e o banco `public.stores.theme_config`.
   */
  async getSavedViews(storeId: string, pageKey: SavedViewPageKey): Promise<StoreSavedView[]> {
    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : ''
    if (!effectiveStoreId) {
      return getDefaultPresetViews('global', pageKey)
    }

    // 1. Tenta buscar da tabela dedicada `store_saved_views`
    try {
      const { data, error } = await (supabase.from('store_saved_views' as any) as any)
        .select('*')
        .eq('store_id', effectiveStoreId)
        .eq('page_key', pageKey)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: StoreSavedView[] = data.map((row: any) => ({
          id: row.id,
          store_id: row.store_id,
          page_key: row.page_key,
          name: row.name,
          description: row.description || null,
          color: row.color || 'indigo',
          filters: (row.filters || {}) as CustomerSavedViewFilters,
          is_default: Boolean(row.is_default),
          is_system_preset: Boolean(row.is_system_preset),
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))
        saveToLocalCache(effectiveStoreId, pageKey, mapped)
        return mapped
      }
    } catch {
      // Fallback para `stores.theme_config`
    }

    // 2. Tenta buscar do JSONB `stores.theme_config.saved_views` no banco Supabase
    const dbThemeViews = await readViewsFromStoreThemeConfig(effectiveStoreId, pageKey)
    if (dbThemeViews && dbThemeViews.length > 0) {
      saveToLocalCache(effectiveStoreId, pageKey, dbThemeViews)
      return dbThemeViews
    }

    // 3. Tenta buscar do cache local da loja/filial
    const cached = readFromLocalCache(effectiveStoreId, pageKey)
    if (cached && cached.length > 0) {
      return cached
    }

    // 4. Semeia as visões padrão iniciais para esta loja/filial
    const defaults = getDefaultPresetViews(effectiveStoreId, pageKey)
    saveToLocalCache(effectiveStoreId, pageKey, defaults)
    await writeViewsToStoreThemeConfig(effectiveStoreId, pageKey, defaults)
    return defaults
  },

  /**
   * Salva uma nova visão ou atualiza uma visão existente no banco de dados para a loja/filial ativa.
   */
  async saveView(params: {
    id?: string
    storeId: string
    pageKey: SavedViewPageKey
    name: string
    description?: string
    color?: string
    filters: CustomerSavedViewFilters
    isDefault?: boolean
  }): Promise<StoreSavedView> {
    const {
      id,
      storeId,
      pageKey,
      name,
      description = null,
      color = 'indigo',
      filters,
      isDefault = false,
    } = params

    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : 'global'
    const now = new Date().toISOString()

    const currentViews = await this.getSavedViews(effectiveStoreId, pageKey)

    // Se isDefault for true, desmarca as demais visões daquela loja
    let updatedViews = currentViews.map((v) => ({
      ...v,
      is_default: isDefault ? false : v.is_default,
    }))

    let targetView: StoreSavedView

    const existingIndex = updatedViews.findIndex(
      (v) => (id && v.id === id) || v.name.trim().toLowerCase() === name.trim().toLowerCase()
    )

    if (existingIndex >= 0) {
      targetView = {
        ...updatedViews[existingIndex],
        name: name.trim(),
        description,
        color,
        filters,
        is_default: isDefault,
        updated_at: now,
      }
      updatedViews[existingIndex] = targetView
    } else {
      targetView = {
        id: id || crypto.randomUUID(),
        store_id: effectiveStoreId,
        page_key: pageKey,
        name: name.trim(),
        description,
        color,
        filters,
        is_default: isDefault,
        is_system_preset: false,
        created_at: now,
        updated_at: now,
      }
      updatedViews = [...updatedViews, targetView]
    }

    // 1. Tenta persistir na tabela `store_saved_views`
    if (effectiveStoreId !== 'global') {
      try {
        if (isDefault) {
          await (supabase.from('store_saved_views' as any) as any)
            .update({ is_default: false, updated_at: now })
            .eq('store_id', effectiveStoreId)
            .eq('page_key', pageKey)
        }

        const payload = {
          store_id: effectiveStoreId,
          page_key: pageKey,
          name: targetView.name,
          description: targetView.description,
          color: targetView.color,
          filters: targetView.filters,
          is_default: targetView.is_default,
          is_system_preset: targetView.is_system_preset,
          updated_at: now,
        }

        const { data: upserted, error } = await (supabase.from('store_saved_views' as any) as any)
          .upsert(payload, { onConflict: 'store_id,page_key,name' })
          .select('*')
          .maybeSingle()

        if (!error && upserted) {
          targetView.id = upserted.id
        }
      } catch {
        // Continua com persistência em stores.theme_config
      }

      // 2. Persiste também em `stores.theme_config.saved_views` no banco de dados da loja/filial
      await writeViewsToStoreThemeConfig(effectiveStoreId, pageKey, updatedViews)
    }

    // 3. Atualiza cache local da loja/filial
    saveToLocalCache(effectiveStoreId, pageKey, updatedViews)

    return targetView
  },

  /**
   * Define ou remove uma visão como padrão ao abrir a tela naquela loja/filial.
   */
  async toggleDefaultView(
    storeId: string,
    pageKey: SavedViewPageKey,
    viewId: string
  ): Promise<StoreSavedView[]> {
    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : 'global'
    const currentViews = await this.getSavedViews(effectiveStoreId, pageKey)
    const target = currentViews.find((v) => v.id === viewId)
    const nextIsDefault = target ? !target.is_default : true
    const now = new Date().toISOString()

    const updatedViews = currentViews.map((v) => ({
      ...v,
      is_default: v.id === viewId ? nextIsDefault : false,
      updated_at: v.id === viewId ? now : v.updated_at,
    }))

    if (effectiveStoreId !== 'global') {
      try {
        await (supabase.from('store_saved_views' as any) as any)
          .update({ is_default: false, updated_at: now })
          .eq('store_id', effectiveStoreId)
          .eq('page_key', pageKey)

        if (nextIsDefault && target) {
          await (supabase.from('store_saved_views' as any) as any)
            .update({ is_default: true, updated_at: now })
            .eq('store_id', effectiveStoreId)
            .eq('page_key', pageKey)
            .eq('name', target.name)
        }
      } catch {
        // Fallback
      }

      await writeViewsToStoreThemeConfig(effectiveStoreId, pageKey, updatedViews)
    }

    saveToLocalCache(effectiveStoreId, pageKey, updatedViews)
    return updatedViews
  },

  /**
   * Exclui uma visão salva da loja/filial.
   */
  async deleteView(
    storeId: string,
    pageKey: SavedViewPageKey,
    viewId: string
  ): Promise<StoreSavedView[]> {
    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : 'global'
    const currentViews = await this.getSavedViews(effectiveStoreId, pageKey)
    const target = currentViews.find((v) => v.id === viewId)
    const updatedViews = currentViews.filter((v) => v.id !== viewId)

    if (effectiveStoreId !== 'global') {
      try {
        if (target) {
          await (supabase.from('store_saved_views' as any) as any)
            .delete()
            .eq('store_id', effectiveStoreId)
            .eq('page_key', pageKey)
            .or(`id.eq.${viewId},name.eq.${target.name}`)
        }
      } catch {
        // Fallback
      }

      await writeViewsToStoreThemeConfig(effectiveStoreId, pageKey, updatedViews)
    }

    saveToLocalCache(effectiveStoreId, pageKey, updatedViews)
    return updatedViews
  },
}
