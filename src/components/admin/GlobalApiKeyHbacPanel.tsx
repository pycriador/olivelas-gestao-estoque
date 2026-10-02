import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  apiKeyService,
  AVAILABLE_API_SCOPES,
  type ApiToken,
} from '@/services/apiKeyService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import {
  KeyRound,
  Plus,
  Copy,
  CheckCircle2,
  Trash2,
  Power,
  ShieldCheck,
  Clock,
  Code,
  Edit2,
  Store as StoreIcon,
  Filter,
} from 'lucide-react'
import type { Store } from '@/types/store.types'
import { formatDate } from '@/utils/dates'
import { supabaseUrl, supabaseKey } from '@/lib/supabase/client'

interface ScopeEndpointMeta {
  scopeId: string
  name: string
  category: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  table: string
  queryParams: (storeId: string) => string
  body?: (storeId: string) => Record<string, any>
  desc: string
}

const SCOPE_ENDPOINT_DOCS: Record<string, ScopeEndpointMeta> = {
  'products:read': {
    scopeId: 'products:read',
    name: 'Leitura de Produtos',
    category: 'Produtos',
    method: 'GET',
    table: 'products',
    queryParams: (stId) => `select=*&is_active=eq.true${stId !== 'all' ? `&store_id=eq.${stId}` : ''}&order=name.asc`,
    desc: 'Consulta a lista de produtos ativos do catálogo, categorias e SKUs.',
  },
  'products:write': {
    scopeId: 'products:write',
    name: 'Criar / Editar Produtos',
    category: 'Produtos',
    method: 'POST',
    table: 'products',
    queryParams: () => '',
    body: (stId) => ({
      name: 'Azeite Extra Virgem 500ml',
      sku: 'AZE-001',
      unit_measure: 'UN',
      min_stock: 5,
      is_active: true,
      ...(stId !== 'all' ? { store_id: stId } : {}),
    }),
    desc: 'Cadastra novos itens no catálogo ou atualiza dados mestres.',
  },
  'products:delete': {
    scopeId: 'products:delete',
    name: 'Desativar Produtos',
    category: 'Produtos',
    method: 'PATCH',
    table: 'products',
    queryParams: (stId) => `id=eq.prod_123${stId !== 'all' ? `&store_id=eq.${stId}` : ''}`,
    body: () => ({ is_active: false }),
    desc: 'Desativa o produto no catálogo da filial (soft-delete).',
  },
  'inventory:read': {
    scopeId: 'inventory:read',
    name: 'Leitura de Estoque',
    category: 'Estoque',
    method: 'GET',
    table: 'stock_balances',
    queryParams: (stId) => `select=*,products(name,sku,barcode)${stId !== 'all' ? `&store_id=eq.${stId}` : ''}&order=quantity.asc`,
    desc: 'Consulta o saldo físico, custo médio, valor de venda e status de estoque.',
  },
  'inventory:write': {
    scopeId: 'inventory:write',
    name: 'Entrada de Estoque',
    category: 'Estoque',
    method: 'POST',
    table: 'stock_movements',
    queryParams: () => '',
    body: (stId) => ({
      product_id: 'prod_123',
      store_id: stId !== 'all' ? stId : 'loja_id',
      type: 'PURCHASE',
      quantity: 50,
      unit_cost: 24.9,
      notes: 'Entrada via API externa',
    }),
    desc: 'Lança entradas de mercadorias no estoque físico da loja.',
  },
  'inventory:adjust': {
    scopeId: 'inventory:adjust',
    name: 'Baixas & Ajustes',
    category: 'Estoque',
    method: 'POST',
    table: 'stock_movements',
    queryParams: () => '',
    body: (stId) => ({
      product_id: 'prod_123',
      store_id: stId !== 'all' ? stId : 'loja_id',
      type: 'LOSS_DAMAGE',
      quantity: -2,
      notes: 'Avaria registrada no PDV',
    }),
    desc: 'Registra baixas operacionais por quebras, avarias ou vencimento.',
  },
  'orders:read': {
    scopeId: 'orders:read',
    name: 'Consultar Pedidos',
    category: 'Vendas & PDV',
    method: 'GET',
    table: 'orders',
    queryParams: (stId) => `select=*,order_items(*),payments(*)${stId !== 'all' ? `&store_id=eq.${stId}` : ''}&order=created_at.desc&limit=50`,
    desc: 'Lista os pedidos realizados com detalhes de itens, clientes e pagamentos.',
  },
  'orders:write': {
    scopeId: 'orders:write',
    name: 'Emitir Pedidos (PDV)',
    category: 'Vendas & PDV',
    method: 'POST',
    table: 'orders',
    queryParams: () => '',
    body: (stId) => ({
      store_id: stId !== 'all' ? stId : 'loja_id',
      status: 'COMPLETED',
      total_amount: 149.9,
      payment_method: 'PIX',
      items: [
        { product_id: 'prod_123', quantity: 2, unit_price: 74.95 }
      ]
    }),
    desc: 'Emite um novo pedido de venda com baixa automática e registro financeiro.',
  },
  'orders:cancel': {
    scopeId: 'orders:cancel',
    name: 'Cancelar Pedidos',
    category: 'Vendas & PDV',
    method: 'PATCH',
    table: 'orders',
    queryParams: (stId) => `id=eq.ord_123${stId !== 'all' ? `&store_id=eq.${stId}` : ''}`,
    body: () => ({
      status: 'CANCELLED',
      cancellation_reason: 'Desistência do cliente via API',
    }),
    desc: 'Cancela o pedido e estorna os lançamentos de estoque e faturamento.',
  },
  'purchases:read': {
    scopeId: 'purchases:read',
    name: 'Consultar Compras',
    category: 'Compras',
    method: 'GET',
    table: 'purchase_orders',
    queryParams: (stId) => `select=*,suppliers(name),purchase_order_items(*)${stId !== 'all' ? `&store_id=eq.${stId}` : ''}&order=created_at.desc`,
    desc: 'Consulta o histórico de ordens de compra e custos de fornecedores.',
  },
  'purchases:write': {
    scopeId: 'purchases:write',
    name: 'Emitir Compras',
    category: 'Compras',
    method: 'POST',
    table: 'purchase_orders',
    queryParams: () => '',
    body: (stId) => ({
      store_id: stId !== 'all' ? stId : 'loja_id',
      supplier_id: 'forn_123',
      status: 'RECEIVED',
      total_cost: 1250.0,
      notes: 'Recebimento de fornecedor via API',
    }),
    desc: 'Cria novas ordens de compra ou registra notas de recebimento.',
  },
  'customers:read': {
    scopeId: 'customers:read',
    name: 'Consultar Clientes',
    category: 'Clientes',
    method: 'GET',
    table: 'customers',
    queryParams: (stId) => `select=*${stId !== 'all' ? `&store_id=eq.${stId}` : ''}&order=name.asc`,
    desc: 'Lista os clientes cadastrados na filial e seus contatos.',
  },
  'customers:write': {
    scopeId: 'customers:write',
    name: 'Gerenciar Clientes',
    category: 'Clientes',
    method: 'POST',
    table: 'customers',
    queryParams: () => '',
    body: (stId) => ({
      store_id: stId !== 'all' ? stId : 'loja_id',
      name: 'Maria Silva',
      document: '123.456.789-00',
      phone: '(11) 99999-8888',
      email: 'maria@email.com',
    }),
    desc: 'Cadastra ou atualiza o perfil e documentos de clientes.',
  },
  'reports:read': {
    scopeId: 'reports:read',
    name: 'Relatórios & KPIs',
    category: 'Relatórios',
    method: 'GET',
    table: 'stock_balances',
    queryParams: (stId) => `select=id,quantity,unit_cost,sale_price,products(name,sku,category_id)${stId !== 'all' ? `&store_id=eq.${stId}` : ''}`,
    desc: 'Extrai dados consolidados para relatórios executivos e BI externo.',
  },
  'audit:read': {
    scopeId: 'audit:read',
    name: 'Logs de Auditoria',
    category: 'Sistema',
    method: 'GET',
    table: 'stock_movements',
    queryParams: (stId) => `select=*,products(name)${stId !== 'all' ? `&store_id=eq.${stId}` : ''}&order=created_at.desc&limit=100`,
    desc: 'Consulta a trilha de auditoria e movimentações operacionais.',
  },
}

interface GlobalApiKeyHbacPanelProps {
  stores: Store[]
}

export function GlobalApiKeyHbacPanel({ stores }: GlobalApiKeyHbacPanelProps) {
  const queryClient = useQueryClient()
  const { data: dbTokens = [], isLoading: loadingTokens } = useQuery({
    queryKey: ['api-tokens-list'],
    queryFn: () => apiKeyService.listTokens(),
  })

  const tokens = dbTokens.length > 0 ? dbTokens : apiKeyService.getStoredTokens()

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [editingToken, setEditingToken] = React.useState<ApiToken | null>(null)
  const [newTokenResult, setNewTokenResult] = React.useState<ApiToken | null>(null)
  const [revokingToken, setRevokingToken] = React.useState<ApiToken | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Scope documentation explorer
  const [activeScopeId, setActiveScopeId] = React.useState<string>('products:read')
  const [codeLang, setCodeLang] = React.useState<'curl' | 'python' | 'javascript'>('curl')

  // Create Form states
  const [tokenName, setTokenName] = React.useState('')
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(stores[0]?.id || 'all')
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    'products:read',
    'inventory:read',
    'orders:read',
    'orders:write',
  ])
  const [expirationOption, setExpirationOption] = React.useState<string>('never')

  // Edit Form states
  const [editTokenName, setEditTokenName] = React.useState('')
  const [editStoreId, setEditStoreId] = React.useState<string>('all')
  const [editScopes, setEditScopes] = React.useState<string[]>([])
  const [editExpirationOption, setEditExpirationOption] = React.useState<string>('never')

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Chave de API copiada para a área de transferência!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleApplyPreset = (
    preset: 'READ_ONLY' | 'POS' | 'STOCK' | 'FULL',
    target: 'create' | 'edit' = 'create'
  ) => {
    let scopes: string[] = []
    if (preset === 'READ_ONLY') {
      scopes = ['products:read', 'inventory:read', 'reports:read', 'customers:read']
    } else if (preset === 'POS') {
      scopes = ['orders:read', 'orders:write', 'products:read', 'inventory:read', 'customers:read', 'customers:write']
    } else if (preset === 'STOCK') {
      scopes = ['products:read', 'products:write', 'inventory:read', 'inventory:write', 'inventory:adjust', 'purchases:read', 'purchases:write']
    } else {
      scopes = AVAILABLE_API_SCOPES.map((s) => s.id)
    }

    if (target === 'create') {
      setSelectedScopes(scopes)
    } else {
      setEditScopes(scopes)
    }
  }

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenName.trim()) return

    const selectedStore = stores.find((s) => s.id === selectedStoreId)
    const storeName = selectedStore ? selectedStore.name : 'Acesso Global'

    const days = expirationOption === 'never' ? null : parseInt(expirationOption, 10)

    setIsSubmitting(true)
    try {
      const created = await apiKeyService.createToken({
        name: tokenName.trim(),
        storeId: selectedStoreId,
        storeName,
        scopes: selectedScopes,
        expiresInDays: days,
      })

      queryClient.invalidateQueries({ queryKey: ['api-tokens-list'] })
      setIsCreateModalOpen(false)
      setNewTokenResult(created)
      setTokenName('')
      toast.success('Chave de API gravada no banco de dados!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gravar token no banco de dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditToken = (token: ApiToken) => {
    setEditingToken(token)
    setEditTokenName(token.name)
    setEditStoreId(token.storeId)
    setEditScopes(token.scopes)
    setEditExpirationOption(token.expiresAt ? 'keep' : 'never')
    setIsEditModalOpen(true)
  }

  const handleSaveEditToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingToken || !editTokenName.trim()) return

    const selectedStore = stores.find((s) => s.id === editStoreId)
    const storeName = selectedStore ? selectedStore.name : 'Acesso Global'

    let expiresInDays: number | null | undefined = undefined
    if (editExpirationOption === 'never') {
      expiresInDays = null
    } else if (editExpirationOption !== 'keep') {
      expiresInDays = parseInt(editExpirationOption, 10)
    }

    setIsSubmitting(true)
    try {
      await apiKeyService.updateToken(editingToken.id, {
        name: editTokenName.trim(),
        storeId: editStoreId,
        storeName,
        scopes: editScopes,
        expiresInDays,
      })

      queryClient.invalidateQueries({ queryKey: ['api-tokens-list'] })
      setIsEditModalOpen(false)
      setEditingToken(null)
      toast.success('Permissões e dados do token atualizados no banco de dados!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar token no banco.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (token: ApiToken) => {
    try {
      await apiKeyService.toggleTokenStatus(token.id, !token.isActive)
      queryClient.invalidateQueries({ queryKey: ['api-tokens-list'] })
      toast.success(`Token ${token.isActive ? 'desativado' : 'ativado'} com sucesso!`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status do token.')
    }
  }

  const handleRevokeToken = async () => {
    if (!revokingToken) return
    try {
      await apiKeyService.deleteToken(revokingToken.id)
      queryClient.invalidateQueries({ queryKey: ['api-tokens-list'] })
      setRevokingToken(null)
      toast.success('Token de API revogado do banco de dados com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao revogar token.')
    }
  }

  const activeDoc = SCOPE_ENDPOINT_DOCS[activeScopeId] || SCOPE_ENDPOINT_DOCS['products:read']
  const activeToken = tokens.find((t) => t.isActive)?.token || 'SEU_TOKEN_API_AQUI'
  const targetStoreId = selectedStoreId !== 'all' ? selectedStoreId : (stores[0]?.id || 'loja_id')

  const queryStr = activeDoc.queryParams(targetStoreId)
  const fullEndpointUrl = `${supabaseUrl}/rest/v1/${activeDoc.table}${queryStr ? `?${queryStr}` : ''}`
  const reqBody = activeDoc.body ? activeDoc.body(targetStoreId) : undefined

  // Code Snippets Generation (Supabase PostgREST Auth Spec)
  const effectiveSupabaseKey = supabaseKey && supabaseKey !== 'placeholder_key' ? supabaseKey : 'SUA_SUPABASE_ANON_KEY'

  const curlSnippet = (() => {
    if (activeDoc.method === 'GET') {
      return `curl -X GET "${fullEndpointUrl}" \\
  -H "apikey: ${effectiveSupabaseKey}" \\
  -H "Authorization: Bearer ${effectiveSupabaseKey}" \\
  -H "X-HBAC-Token: ${activeToken}" \\
  -H "X-Store-ID: ${targetStoreId}" \\
  -H "Content-Type: application/json"`
    }
    return `curl -X ${activeDoc.method} "${fullEndpointUrl}" \\
  -H "apikey: ${effectiveSupabaseKey}" \\
  -H "Authorization: Bearer ${effectiveSupabaseKey}" \\
  -H "X-HBAC-Token: ${activeToken}" \\
  -H "X-Store-ID: ${targetStoreId}" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '${JSON.stringify(reqBody, null, 2)}'`
  })()

  const pythonSnippet = (() => {
    if (activeDoc.method === 'GET') {
      return `import requests

url = "${fullEndpointUrl}"
headers = {
    "apikey": "${effectiveSupabaseKey}",
    "Authorization": "Bearer ${effectiveSupabaseKey}",
    "X-HBAC-Token": "${activeToken}",
    "X-Store-ID": "${targetStoreId}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print("Status Code:", response.status_code)
if response.status_code == 200:
    print("Dados:", response.json())
else:
    print("Erro:", response.text)`
    }
    return `import requests

url = "${fullEndpointUrl}"
headers = {
    "apikey": "${effectiveSupabaseKey}",
    "Authorization": "Bearer ${effectiveSupabaseKey}",
    "X-HBAC-Token": "${activeToken}",
    "X-Store-ID": "${targetStoreId}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}
payload = ${JSON.stringify(reqBody, null, 4)}

response = requests.${activeDoc.method.toLowerCase()}(url, headers=headers, json=payload)
print("Status Code:", response.status_code)
if response.status_code in [200, 201]:
    print("Resultado:", response.json())
else:
    print("Erro:", response.text)`
  })()

  const jsSnippet = (() => {
    if (activeDoc.method === 'GET') {
      return `const response = await fetch('${fullEndpointUrl}', {
  method: 'GET',
  headers: {
    'apikey': '${effectiveSupabaseKey}',
    'Authorization': 'Bearer ${effectiveSupabaseKey}',
    'X-HBAC-Token': '${activeToken}',
    'X-Store-ID': '${targetStoreId}',
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
console.log('Status:', response.status, data)`
    }
    return `const response = await fetch('${fullEndpointUrl}', {
  method: '${activeDoc.method}',
  headers: {
    'apikey': '${effectiveSupabaseKey}',
    'Authorization': 'Bearer ${effectiveSupabaseKey}',
    'X-HBAC-Token': '${activeToken}',
    'X-Store-ID': '${targetStoreId}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(${JSON.stringify(reqBody, null, 2)})
})

const data = await response.json()
console.log('Status:', response.status, data)`
  })()

  const currentSnippet = codeLang === 'curl' ? curlSnippet : codeLang === 'python' ? pythonSnippet : jsSnippet

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Configuração de API & Controle de Acesso HBAC
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gere e edite tokens com expiração configurável, limitando o acesso estritamente à loja do usuário e escopos hierárquicos selecionados.
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} className="h-8 text-xs font-semibold px-3">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Token de API
        </Button>
      </div>

      {/* Tokens List Card */}
      <Card className="border border-border shadow-xs bg-card overflow-hidden">
        <CardContent className="p-0">
          {loadingTokens && tokens.length === 0 ? (
            <div className="p-6">
              <LoadingSkeleton count={3} />
            </div>
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                icon={<KeyRound className="h-10 w-10 text-muted-foreground" />}
                title="Nenhum token de API configurado"
                description="Crie chaves de API para integrar PDVs externos, e-commerce, ERPs e catálogo WhatsApp."
                actionLabel="Criar Primeiro Token"
                onAction={() => setIsCreateModalOpen(true)}
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tokens.map((t) => {
                const isExpired = t.expiresAt && new Date(t.expiresAt) < new Date()
                return (
                  <div key={t.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-foreground">{t.name}</span>
                        <Badge variant={t.isActive && !isExpired ? 'success' : 'secondary'} className="text-[10px]">
                          {isExpired ? 'Expirado' : t.isActive ? 'Ativo' : 'Desativado'}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          <StoreIcon className="h-3 w-3 mr-1 inline" />
                          {t.storeName}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                        <span>Chave: {t.keyPrefix}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(t.token, t.id)}
                          className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === t.id ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copiar Token
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Validade: {t.expiresAt ? `Expira em ${formatDate(t.expiresAt)}` : 'Nunca expira'}
                        </span>
                        <span>·</span>
                        <span className="text-foreground font-semibold">{t.scopes.length} escopo(s) HBAC</span>
                      </div>

                      {/* Display Scope Badges */}
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {t.scopes.map((scId) => (
                          <Badge key={scId} variant="outline" className="text-[9px] px-1.5 py-0 font-mono bg-muted/40">
                            {scId}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Action Dropdown Menu */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <DropdownMenu
                        triggerLabel="Ações"
                        buttonClassName="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground shadow-xs"
                        items={[
                          {
                            key: 'edit',
                            label: 'Editar Permissões & Dados',
                            icon: <Edit2 className="h-3.5 w-3.5 text-primary" />,
                            onSelect: () => handleOpenEditToken(t),
                          },
                          {
                            key: 'copy',
                            label: 'Copiar Chave Completa',
                            icon: <Copy className="h-3.5 w-3.5 text-blue-500" />,
                            onSelect: () => handleCopy(t.token, t.id),
                          },
                          {
                            key: 'toggle',
                            label: t.isActive ? 'Desativar Token' : 'Ativar Token',
                            icon: <Power className="h-3.5 w-3.5" />,
                            onSelect: () => handleToggleStatus(t),
                          },
                          {
                            key: 'revoke',
                            label: 'Revogar Token Permanentemente',
                            icon: <Trash2 className="h-3.5 w-3.5" />,
                            variant: 'danger',
                            onSelect: () => setRevokingToken(t),
                          },
                        ]}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive API Docs & All HBAC Endpoints Explorer */}
      <Card className="border border-border shadow-xs bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-bold text-xs text-foreground">Exemplos de Requisição de Todos os Escopos HBAC</h3>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Host Base: <span className="text-foreground font-semibold">{supabaseUrl}</span>
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setCodeLang('curl')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  codeLang === 'curl' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                cURL
              </button>
              <button
                type="button"
                onClick={() => setCodeLang('python')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  codeLang === 'python' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Python
              </button>
              <button
                type="button"
                onClick={() => setCodeLang('javascript')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  codeLang === 'javascript' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                JavaScript
              </button>
            </div>
          </div>

          {/* Scope Selection Pills (All HBAC Scopes) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-primary" /> Selecione o Recurso HBAC para testar a requisição:
              </span>
              <span className="text-[10px] text-muted-foreground">
                {AVAILABLE_API_SCOPES.length} endpoints mapeados
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {AVAILABLE_API_SCOPES.map((sc) => {
                const doc = SCOPE_ENDPOINT_DOCS[sc.id]
                const isSelected = activeScopeId === sc.id
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveScopeId(sc.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted border-border/80 text-foreground'
                    }`}
                  >
                    <span className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${
                      doc?.method === 'GET'
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                        : doc?.method === 'POST'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                    }`}>
                      {doc?.method || 'GET'}
                    </span>
                    <span>{sc.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">({sc.id})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Code Box Display */}
          <div className="bg-muted/70 p-3.5 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border relative group">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-primary">
                  {activeDoc.method} /rest/v1/{activeDoc.table}
                </span>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">· {activeDoc.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(currentSnippet, 'code')}
                  className="px-2.5 py-1 rounded bg-card hover:bg-muted border border-border text-foreground text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="h-3 w-3" /> {copiedId === 'code' ? 'Copiado!' : 'Copiar Código'}
                </button>
              </div>
            </div>
            <pre className="text-[11px] overflow-x-auto text-emerald-600 dark:text-emerald-400 leading-relaxed font-mono">
              {currentSnippet}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* CREATE NEW TOKEN MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Gerar Novo Token de API com HBAC"
        description="Defina a loja de isolamento, a expiração e os escopos hierárquicos de acesso"
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-token-form"
              size="sm"
              isLoading={isSubmitting}
              disabled={selectedScopes.length === 0 || !tokenName.trim()}
            >
              Gerar Chave de API
            </Button>
          </div>
        }
      >
        <form id="create-token-form" onSubmit={handleCreateToken} className="space-y-4 pt-1 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-foreground">Nome da Aplicação / Integração *</label>
            <Input
              placeholder="Ex: Integração PDV Frente de Loja, App Entregas"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Loja de Isolamento (Restrição) *</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todas as Lojas (Acesso Global)</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Validade / Expiração do Token *</label>
              <select
                value={expirationOption}
                onChange={(e) => setExpirationOption(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="never">Nunca Expira (Permanente)</option>
                <option value="30">Expira em 30 dias</option>
                <option value="90">Expira em 90 dias</option>
                <option value="365">Expira em 1 ano (365 dias)</option>
              </select>
            </div>
          </div>

          {/* Presets Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-foreground">Escopos HBAC (Permissões de Recursos):</span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('READ_ONLY', 'create')}
                  className="text-primary hover:underline"
                >
                  Leitura
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('POS', 'create')}
                  className="text-primary hover:underline"
                >
                  PDV
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('STOCK', 'create')}
                  className="text-primary hover:underline"
                >
                  Estoque
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('FULL', 'create')}
                  className="text-primary hover:underline"
                >
                  Todos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-muted/40 rounded-xl border border-border">
              {AVAILABLE_API_SCOPES.map((sc) => {
                const isChecked = selectedScopes.includes(sc.id)
                return (
                  <label
                    key={sc.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-primary/5 border-primary/40 text-foreground'
                        : 'border-border/50 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedScopes((prev) =>
                          prev.includes(sc.id) ? prev.filter((id) => id !== sc.id) : [...prev, sc.id]
                        )
                      }}
                      className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs">{sc.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sc.id}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT TOKEN MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingToken(null)
        }}
        title={`Editar Permissões do Token: ${editingToken?.name}`}
        description="Altere a loja de isolamento, a expiração e os escopos hierárquicos de acesso permitidos para esta chave."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditModalOpen(false)
                setEditingToken(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-token-form"
              size="sm"
              isLoading={isSubmitting}
              disabled={editScopes.length === 0 || !editTokenName.trim()}
            >
              Salvar Alterações
            </Button>
          </div>
        }
      >
        <form id="edit-token-form" onSubmit={handleSaveEditToken} className="space-y-4 pt-1 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-foreground">Nome da Aplicação / Identificador *</label>
            <Input
              value={editTokenName}
              onChange={(e) => setEditTokenName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Loja de Isolamento *</label>
              <select
                value={editStoreId}
                onChange={(e) => setEditStoreId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="all">Todas as Lojas (Acesso Global)</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Validade / Expiração *</label>
              <select
                value={editExpirationOption}
                onChange={(e) => setEditExpirationOption(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="keep">Manter Validade Atual</option>
                <option value="never">Nunca Expira (Permanente)</option>
                <option value="30">Renovar por 30 dias</option>
                <option value="90">Renovar por 90 dias</option>
                <option value="365">Renovar por 1 ano (365 dias)</option>
              </select>
            </div>
          </div>

          {/* Presets Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-foreground">Escopos HBAC Habilitados:</span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('READ_ONLY', 'edit')}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Leitura
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('POS', 'edit')}
                  className="text-primary hover:underline cursor-pointer"
                >
                  PDV
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('STOCK', 'edit')}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Estoque
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('FULL', 'edit')}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Todos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-muted/40 rounded-xl border border-border">
              {AVAILABLE_API_SCOPES.map((sc) => {
                const isChecked = editScopes.includes(sc.id)
                return (
                  <label
                    key={sc.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-primary/5 border-primary/40 text-foreground'
                        : 'border-border/50 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setEditScopes((prev) =>
                          prev.includes(sc.id) ? prev.filter((id) => id !== sc.id) : [...prev, sc.id]
                        )
                      }}
                      className="mt-0.5 rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs">{sc.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sc.id}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Newly Created Token Display Modal */}
      <Modal
        isOpen={Boolean(newTokenResult)}
        onClose={() => setNewTokenResult(null)}
        title="Token de API Gerado com Sucesso!"
        description="Copie o token agora. Por razões de segurança, este token completo não será exibido novamente."
        maxWidth="lg"
        footer={
          <div className="flex justify-end w-full">
            <Button size="sm" onClick={() => setNewTokenResult(null)}>
              Concluir & Fechar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1 text-xs">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Token autenticado com restrição HBAC ativa.</span>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-foreground">Sua Chave de API (Bearer Token):</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={newTokenResult?.token || ''}
                className="font-mono text-xs bg-muted font-bold"
              />
              <Button
                size="sm"
                onClick={() => newTokenResult && handleCopy(newTokenResult.token, 'new')}
                className="shrink-0 font-semibold"
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Revoke Token Modal */}
      <ConfirmModal
        isOpen={Boolean(revokingToken)}
        onClose={() => setRevokingToken(null)}
        onConfirm={handleRevokeToken}
        title="Revogar Chave de API"
        description={`Tem certeza que deseja revogar permanentemente o token "${revokingToken?.name}"? Todas as aplicações integradas usando esta chave perderão o acesso imediatamente.`}
        confirmText="Sim, Revogar Token"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}
