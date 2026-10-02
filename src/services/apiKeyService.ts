import { supabase } from '@/lib/supabase/client'

export interface ApiScope {
  id: string
  name: string
  description: string
  category: 'products' | 'inventory' | 'orders' | 'purchases' | 'customers' | 'reports' | 'system'
}

export const AVAILABLE_API_SCOPES: ApiScope[] = [
  // Produtos
  { id: 'products:read', name: 'Leitura de Produtos', description: 'Consultar catálogo, categorias e SKUs', category: 'products' },
  { id: 'products:write', name: 'Criar / Editar Produtos', description: 'Cadastrar novos produtos e atualizar dados mestres', category: 'products' },
  { id: 'products:delete', name: 'Desativar Produtos', description: 'Desativar produtos do catálogo', category: 'products' },

  // Estoque
  { id: 'inventory:read', name: 'Leitura de Estoque', description: 'Consultar saldos físicos, lotes e validades', category: 'inventory' },
  { id: 'inventory:write', name: 'Entrada de Estoque', description: 'Lançar entradas manuais e lotes de mercadorias', category: 'inventory' },
  { id: 'inventory:adjust', name: 'Baixas & Perdas', description: 'Registrar saídas operacionais, avarias e vencimentos', category: 'inventory' },

  // Vendas & PDV
  { id: 'orders:read', name: 'Consultar Pedidos', description: 'Ver histórico de vendas, detalhes e status', category: 'orders' },
  { id: 'orders:write', name: 'Emitir Pedidos (PDV)', description: 'Criar novos pedidos de venda e pagamentos', category: 'orders' },
  { id: 'orders:cancel', name: 'Cancelar Pedidos', description: 'Efetuar cancelamento e estorno de vendas', category: 'orders' },

  // Compras
  { id: 'purchases:read', name: 'Consultar Compras', description: 'Ver ordens de compra e custos de fornecedores', category: 'purchases' },
  { id: 'purchases:write', name: 'Emitir / Receber Compras', description: 'Criar pedidos de compra e registrar recebimentos', category: 'purchases' },

  // Clientes
  { id: 'customers:read', name: 'Consultar Clientes', description: 'Ver lista de clientes e contatos', category: 'customers' },
  { id: 'customers:write', name: 'Gerenciar Clientes', description: 'Criar e atualizar cadastros de clientes', category: 'customers' },

  // Relatórios
  { id: 'reports:read', name: 'Relatórios & Métricas', description: 'Acessar indicadores financeiros, Curva ABC e KPIs', category: 'reports' },

  // Auditoria & Sistema
  { id: 'audit:read', name: 'Logs de Auditoria', description: 'Consultar trilha de auditoria e segurança', category: 'system' },
]

export interface ApiToken {
  id: string
  name: string
  token: string
  keyPrefix: string
  storeId: string
  storeName: string
  scopes: string[]
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
}

const STORAGE_KEY = 'olivelas_api_tokens_v1'

function mapRowToToken(row: any): ApiToken {
  return {
    id: row.id,
    name: row.name,
    token: row.token,
    keyPrefix: row.key_prefix,
    storeId: row.store_id || 'all',
    storeName: row.store_name || 'Acesso Global',
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }
}

export const apiKeyService = {
  getStoredTokens(): ApiToken[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch (e) {
      console.warn('Erro ao carregar tokens de API locais:', e)
    }
    return []
  },

  saveTokens(tokens: ApiToken[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  },

  async listTokens(): Promise<ApiToken[]> {
    try {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const mapped = data.map(mapRowToToken)
        this.saveTokens(mapped)
        return mapped
      }
      if (error) {
        console.warn('Consulta ao Supabase api_tokens falhou, usando cache local:', error.message)
      }
    } catch (e) {
      console.warn('Erro de rede ao buscar tokens do Supabase:', e)
    }
    return this.getStoredTokens()
  },

  async createToken(params: {
    name: string
    storeId: string
    storeName: string
    scopes: string[]
    expiresInDays: number | null // null = nunca expira
  }): Promise<ApiToken> {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const fullToken = `olv_live_${randomHex}`
    const keyPrefix = `${fullToken.slice(0, 12)}...`

    const expiresAt =
      params.expiresInDays && params.expiresInDays > 0
        ? new Date(Date.now() + params.expiresInDays * 86400000).toISOString()
        : null

    const dbPayload = {
      name: params.name,
      token: fullToken,
      key_prefix: keyPrefix,
      store_id: params.storeId === 'all' ? null : params.storeId,
      store_name: params.storeName,
      scopes: params.scopes,
      expires_at: expiresAt,
      is_active: true,
    }

    try {
      const { data, error } = await supabase
        .from('api_tokens')
        .insert([dbPayload])
        .select()
        .single()

      if (!error && data) {
        const created = mapRowToToken(data)
        const current = this.getStoredTokens()
        this.saveTokens([created, ...current.filter((t) => t.id !== created.id)])
        return created
      }
      if (error) {
        console.warn('Erro ao inserir token no Supabase:', error.message)
      }
    } catch (e) {
      console.warn('Erro de rede ao salvar token:', e)
    }

    // Fallback local se a tabela Supabase ainda estiver sendo migrada
    const localToken: ApiToken = {
      id: `tok-${Date.now()}`,
      name: params.name,
      token: fullToken,
      keyPrefix,
      storeId: params.storeId,
      storeName: params.storeName,
      scopes: params.scopes,
      expiresAt,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    }

    const current = this.getStoredTokens()
    this.saveTokens([localToken, ...current])
    return localToken
  },

  async toggleTokenStatus(id: string, nextStatus: boolean): Promise<ApiToken[]> {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .update({ is_active: nextStatus })
        .eq('id', id)

      if (!error) {
        return this.listTokens()
      }
    } catch (e) {
      console.warn('Erro ao atualizar status do token no Supabase:', e)
    }

    const current = this.getStoredTokens()
    const updated = current.map((t) => (t.id === id ? { ...t, isActive: nextStatus } : t))
    this.saveTokens(updated)
    return updated
  },

  async updateToken(
    id: string,
    updates: {
      name?: string
      storeId?: string
      storeName?: string
      scopes?: string[]
      expiresInDays?: number | null
    }
  ): Promise<ApiToken[]> {
    let expiresAt: string | null | undefined = undefined
    if (updates.expiresInDays !== undefined) {
      expiresAt =
        updates.expiresInDays && updates.expiresInDays > 0
          ? new Date(Date.now() + updates.expiresInDays * 86400000).toISOString()
          : null
    }

    const dbUpdates: Record<string, any> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.storeId !== undefined) dbUpdates.store_id = updates.storeId === 'all' ? null : updates.storeId
    if (updates.storeName !== undefined) dbUpdates.store_name = updates.storeName
    if (updates.scopes !== undefined) dbUpdates.scopes = updates.scopes
    if (expiresAt !== undefined) dbUpdates.expires_at = expiresAt

    try {
      const { error } = await supabase
        .from('api_tokens')
        .update(dbUpdates)
        .eq('id', id)

      if (!error) {
        return this.listTokens()
      }
    } catch (e) {
      console.warn('Erro ao atualizar token no Supabase:', e)
    }

    const current = this.getStoredTokens()
    const updated = current.map((t) => {
      if (t.id !== id) return t
      return {
        ...t,
        name: updates.name ?? t.name,
        storeId: updates.storeId ?? t.storeId,
        storeName: updates.storeName ?? t.storeName,
        scopes: updates.scopes ?? t.scopes,
        expiresAt: expiresAt !== undefined ? expiresAt : t.expiresAt,
      }
    })
    this.saveTokens(updated)
    return updated
  },

  async deleteToken(id: string): Promise<ApiToken[]> {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .delete()
        .eq('id', id)

      if (!error) {
        return this.listTokens()
      }
    } catch (e) {
      console.warn('Erro ao excluir token no Supabase:', e)
    }

    const current = this.getStoredTokens()
    const updated = current.filter((t) => t.id !== id)
    this.saveTokens(updated)
    return updated
  },
}
