import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import { portalConfig, isPortalConfigured } from '../config/portal.config'
import type {
  PortalCategory,
  PortalCredentialStatus,
  PortalOrderStatus,
  PortalOrderTracking,
  PortalPaymentMethod,
  PortalProduct,
  PortalStore,
} from '../types/portal.types'

/**
 * Colunas estritamente públicas dos produtos.
 * Jamais projeta cost_price, min_stock ou max_stock para o navegador.
 */
const PUBLIC_PRODUCT_COLUMNS =
  'id, store_id, name, sku, barcode, description, unit, selling_price, category_id, is_active, is_published_catalog'

function buildAccentRegex(term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped
    .replace(/[aáàâãä]/gi, '[aáàâãä]')
    .replace(/[eéèêë]/gi, '[eéèêë]')
    .replace(/[iíìîï]/gi, '[iíìîï]')
    .replace(/[oóòôõö]/gi, '[oóòôõö]')
    .replace(/[uúùûü]/gi, '[uúùûü]')
    .replace(/[cç]/gi, '[cç]')
    .replace(/[nñ]/gi, '[nñ]')
}

/**
 * Cliente Supabase dedicado do Portal Portátil.
 * Injeta automaticamente os cabeçalhos X-HBAC-Token e X-Store-ID em todas as
 * requisições REST e RPC para garantir isolamento de loja e expiração imediata.
 */
export const portalSupabase = createClient(
  portalConfig.supabaseUrl,
  portalConfig.supabasePublishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-HBAC-Token': portalConfig.hbacToken,
        'X-Store-ID': portalConfig.storeId,
      },
      fetch: (input, init) => fetch(input, { ...init, credentials: 'omit' }),
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

export function classifyPortalApiError(err: unknown): PortalCredentialStatus | null {
  if (!err || typeof err !== 'object') return null
  const rec = err as Record<string, unknown>
  const code = String(rec.code || '')
  const msg = String(rec.message || rec.details || '')

  if (code === '28000' || msg.includes('expirado')) {
    return {
      valid: false,
      code: msg.includes('expirado') ? 'EXPIRED' : 'INVALID_TOKEN',
      message:
        msg ||
        'A credencial de acesso deste portal expirou ou não foi encontrada. Solicite a renovação ao administrador da loja.',
    }
  }

  if (code === '42501' || msg.includes('desativado') || msg.includes('exclusivo da loja')) {
    return {
      valid: false,
      code: msg.includes('desativado')
        ? 'REVOKED'
        : msg.includes('exclusivo da loja')
        ? 'STORE_MISMATCH'
        : 'REVOKED',
      message:
        msg ||
        'A credencial de acesso deste portal foi revogada ou não possui permissão para esta loja.',
    }
  }

  return null
}

export const supabasePortalApi = {
  /**
   * Valida a credencial HBAC da loja antes de carregar a vitrine.
   * Usa a política RLS `anon_read_own_hbac_token_only` + hook `check_hbac_pre_request`.
   */
  async validatePortalCredential(): Promise<PortalCredentialStatus> {
    if (!isPortalConfigured()) {
      return {
        valid: false,
        code: 'MISSING_CONFIG',
        message:
          'VITE_PORTAL_STORE_ID ou VITE_PORTAL_HBAC_TOKEN não configurados no ambiente do portal.',
      }
    }

    try {
      const { data, error } = await portalSupabase
        .from('api_tokens')
        .select('id, name, store_id, scopes, is_active, expires_at')
        .maybeSingle()

      if (error) {
        const classified = classifyPortalApiError(error)
        if (classified) return classified
        return {
          valid: false,
          code: 'INVALID_TOKEN',
          message: error.message || 'Falha ao validar a credencial do portal.',
        }
      }

      if (!data) {
        return {
          valid: false,
          code: 'INVALID_TOKEN',
          message:
            'Credencial do portal inválida, revogada ou expirada. Em caso de rotação de segurança, atualize o token HBAC.',
        }
      }

      if (!data.is_active) {
        return {
          valid: false,
          code: 'REVOKED',
          message: 'Esta credencial de portal foi desativada pelo administrador da loja.',
        }
      }

      if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
        return {
          valid: false,
          code: 'EXPIRED',
          message: `Esta credencial de portal expirou em ${new Date(
            data.expires_at
          ).toLocaleDateString('pt-BR')}.`,
          expiresAt: data.expires_at,
        }
      }

      if (data.store_id && data.store_id !== portalConfig.storeId) {
        return {
          valid: false,
          code: 'STORE_MISMATCH',
          message:
            'A credencial informada pertence a outra unidade e não pode acessar os dados desta loja.',
        }
      }

      return {
        valid: true,
        code: 'OK',
        message: 'Credencial validada com sucesso.',
        tokenName: data.name,
        expiresAt: data.expires_at,
        scopes: Array.isArray(data.scopes) ? data.scopes : [],
      }
    } catch (err: any) {
      return {
        valid: false,
        code: 'NETWORK_ERROR',
        message: err?.message || 'Erro de conexão com a API do Supabase.',
      }
    }
  },

  /**
   * Busca os dados públicos e configurações de tema exclusivamente da loja vinculada.
   */
  async fetchStoreProfile(): Promise<PortalStore> {
    const { data, error } = await portalSupabase
      .from('stores')
      .select(
        'id, name, slug, logo_url, phone, whatsapp, address_street, address_number, address_neighborhood, address_city, address_state, is_active, theme_config'
      )
      .eq('id', portalConfig.storeId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    if (!data) throw new Error('Loja não encontrada ou inativa.')

    return data as PortalStore
  },

  /**
   * Lista as categorias da loja.
   */
  async fetchStoreCategories(): Promise<PortalCategory[]> {
    const { data, error } = await portalSupabase
      .from('categories')
      .select('id, name')
      .eq('store_id', portalConfig.storeId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as PortalCategory[]
  },

  /**
   * Lista os produtos ativos e publicados no catálogo da loja com filtros e paginação.
   */
  async fetchCatalogProducts(params: {
    search?: string
    categoryId?: string
    minPrice?: number
    maxPrice?: number
    page?: number
    pageSize?: number
  }): Promise<{ data: PortalProduct[]; total: number }> {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      page = 1,
      pageSize = portalConfig.branding.defaultPageSize,
    } = params

    let query = portalSupabase
      .from('products')
      .select(
        `
        ${PUBLIC_PRODUCT_COLUMNS},
        categories ( id, name ),
        product_images ( id, public_url, is_primary, display_order )
      `,
        { count: 'exact' }
      )
      .eq('store_id', portalConfig.storeId)
      .eq('is_active', true)
      .eq('is_published_catalog', true)
      .is('deleted_at', null)

    if (search && search.trim()) {
      const cleanTerm = search.trim().replace(/[%,()]/g, ' ')
      if (cleanTerm) {
        const pattern = buildAccentRegex(cleanTerm)
        query = query.or(`name.imatch.${pattern},sku.imatch.${pattern},barcode.imatch.${pattern}`)
      }
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
      query = query.gte('selling_price', minPrice)
    }
    if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
      query = query.lte('selling_price', maxPrice)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) throw error

    const mapped: PortalProduct[] = (data || []).map((row: any) => {
      const images = ((row.product_images || []) as any[]).sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return (a.display_order || 0) - (b.display_order || 0)
      })
      const primary = images.find((img) => img.is_primary) || images[0]

      return {
        id: row.id,
        store_id: row.store_id,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode,
        description: row.description,
        unit: row.unit || 'UN',
        selling_price: Number(row.selling_price || 0),
        category_id: row.category_id,
        category_name: row.categories?.name || undefined,
        is_active: Boolean(row.is_active),
        is_published_catalog: Boolean(row.is_published_catalog),
        primary_image_url: primary?.public_url || null,
        images,
      }
    })

    return {
      data: mapped,
      total: count || 0,
    }
  },

  /**
   * Cria um pedido online diretamente na loja configurada no portal via RPC atômica,
   * baixando estoque e notificando `/orders` em tempo real.
   */
  async createCatalogOrder(payload: {
    customerName: string
    customerPhone: string
    deliveryAddress?: string
    paymentMethod: PortalPaymentMethod
    notes?: string
    items: Array<{ productId: string; quantity: number; unitPrice: number }>
  }): Promise<{
    id: string
    order_number: string
    status: PortalOrderStatus
    total_amount: number
    created_at: string
  }> {
    const { data, error } = await portalSupabase.rpc('create_public_catalog_order', {
      p_store_id: portalConfig.storeId,
      p_customer_name: payload.customerName.trim(),
      p_customer_phone: payload.customerPhone.trim() || null,
      p_delivery_address: payload.deliveryAddress?.trim() || null,
      p_items: payload.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
      p_payment_method: payload.paymentMethod || 'PIX',
      p_notes: payload.notes?.trim() || null,
    })

    if (error) throw error
    if (!data || !(data as any).id) {
      throw new Error('Não foi possível registrar o pedido no momento.')
    }

    const res = data as any
    return {
      id: res.id,
      order_number: res.order_number,
      status: (res.status || 'PENDING') as PortalOrderStatus,
      total_amount: Number(res.total_amount || 0),
      created_at: res.created_at || new Date().toISOString(),
    }
  },

  /**
   * Consulta o acompanhamento em tempo real do pedido e garante que ele pertença
   * exclusivamente à loja deste portal (`portalConfig.storeId`).
   */
  async fetchOrderTracking(orderId: string): Promise<PortalOrderTracking | null> {
    if (!orderId) return null

    const { data, error } = await portalSupabase.rpc('get_public_order_tracking', {
      p_order_id: orderId,
    })

    if (error) throw error
    if (!data) return null

    const tracking = data as PortalOrderTracking

    // Isolamento estrito de cliente: impede que o portal de uma loja exiba pedidos de outra
    if (tracking.store_id && tracking.store_id !== portalConfig.storeId) {
      return null
    }

    return tracking
  },

  /**
   * Assina atualizações em tempo real do pedido via Supabase Realtime.
   */
  subscribeToOrderRealtime(
    orderId: string,
    onOrderUpdated: (newStatus?: PortalOrderStatus) => void
  ): () => void {
    const channel: RealtimeChannel = portalSupabase
      .channel(`portal-order-track-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const nextStatus = (payload.new as any)?.status as PortalOrderStatus | undefined
          onOrderUpdated(nextStatus)
        }
      )
      .subscribe()

    return () => {
      portalSupabase.removeChannel(channel)
    }
  },
}
