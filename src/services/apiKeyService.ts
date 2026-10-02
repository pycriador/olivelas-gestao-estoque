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

export const apiKeyService = {
  getStoredTokens(): ApiToken[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch (e) {
      console.warn('Erro ao carregar tokens de API:', e)
    }
    return []
  },

  saveTokens(tokens: ApiToken[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  },

  createToken(params: {
    name: string
    storeId: string
    storeName: string
    scopes: string[]
    expiresInDays: number | null // null = nunca expira
  }): ApiToken {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const fullToken = `olv_live_${randomHex}`
    const keyPrefix = `${fullToken.slice(0, 12)}...`

    const expiresAt =
      params.expiresInDays && params.expiresInDays > 0
        ? new Date(Date.now() + params.expiresInDays * 86400000).toISOString()
        : null

    const newToken: ApiToken = {
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
    this.saveTokens([newToken, ...current])
    return newToken
  },

  toggleTokenStatus(id: string): ApiToken[] {
    const current = this.getStoredTokens()
    const updated = current.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    this.saveTokens(updated)
    return updated
  },

  updateToken(
    id: string,
    updates: {
      name?: string
      storeId?: string
      storeName?: string
      scopes?: string[]
      expiresInDays?: number | null
    }
  ): ApiToken[] {
    const current = this.getStoredTokens()
    const updated = current.map((t) => {
      if (t.id !== id) return t
      let expiresAt = t.expiresAt
      if (updates.expiresInDays !== undefined) {
        expiresAt =
          updates.expiresInDays && updates.expiresInDays > 0
            ? new Date(Date.now() + updates.expiresInDays * 86400000).toISOString()
            : null
      }
      return {
        ...t,
        name: updates.name ?? t.name,
        storeId: updates.storeId ?? t.storeId,
        storeName: updates.storeName ?? t.storeName,
        scopes: updates.scopes ?? t.scopes,
        expiresAt,
      }
    })
    this.saveTokens(updated)
    return updated
  },

  deleteToken(id: string): ApiToken[] {
    const current = this.getStoredTokens()
    const updated = current.filter((t) => t.id !== id)
    this.saveTokens(updated)
    return updated
  },
}
