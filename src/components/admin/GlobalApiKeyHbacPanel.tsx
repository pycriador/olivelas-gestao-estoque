import * as React from 'react'
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
  Store as StoreIcon,
} from 'lucide-react'
import type { Store } from '@/types/store.types'
import { formatDate } from '@/utils/dates'
import { supabaseUrl, supabaseKey } from '@/lib/supabase/client'

interface GlobalApiKeyHbacPanelProps {
  stores: Store[]
}

export function GlobalApiKeyHbacPanel({ stores }: GlobalApiKeyHbacPanelProps) {
  const [tokens, setTokens] = React.useState<ApiToken[]>(() => apiKeyService.getStoredTokens())
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [newTokenResult, setNewTokenResult] = React.useState<ApiToken | null>(null)
  const [revokingToken, setRevokingToken] = React.useState<ApiToken | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [activeDocEndpoint, setActiveDocEndpoint] = React.useState<'products' | 'inventory' | 'orders'>('products')
  const [codeLang, setCodeLang] = React.useState<'curl' | 'python' | 'javascript'>('curl')

  // Form states
  const [tokenName, setTokenName] = React.useState('')
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(stores[0]?.id || 'all')
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    'products:read',
    'inventory:read',
    'orders:read',
    'orders:write',
  ])
  const [expirationOption, setExpirationOption] = React.useState<string>('never') // 'never' | '30' | '90' | '365'

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Chave de API copiada para a área de transferência!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleApplyPreset = (preset: 'READ_ONLY' | 'POS' | 'STOCK' | 'FULL') => {
    if (preset === 'READ_ONLY') {
      setSelectedScopes(['products:read', 'inventory:read', 'reports:read', 'customers:read'])
    } else if (preset === 'POS') {
      setSelectedScopes(['orders:read', 'orders:write', 'products:read', 'inventory:read', 'customers:read', 'customers:write'])
    } else if (preset === 'STOCK') {
      setSelectedScopes(['products:read', 'products:write', 'inventory:read', 'inventory:write', 'inventory:adjust', 'purchases:read', 'purchases:write'])
    } else {
      setSelectedScopes(AVAILABLE_API_SCOPES.map((s) => s.id))
    }
  }

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenName.trim()) return

    const selectedStore = stores.find((s) => s.id === selectedStoreId)
    const storeName = selectedStore ? selectedStore.name : 'Acesso Global'

    const days = expirationOption === 'never' ? null : parseInt(expirationOption, 10)

    const created = apiKeyService.createToken({
      name: tokenName.trim(),
      storeId: selectedStoreId,
      storeName,
      scopes: selectedScopes,
      expiresInDays: days,
    })

    setTokens(apiKeyService.getStoredTokens())
    setIsCreateModalOpen(false)
    setNewTokenResult(created)
    setTokenName('')
  }

  const handleToggleStatus = (id: string) => {
    const updated = apiKeyService.toggleTokenStatus(id)
    setTokens(updated)
    toast.success('Status do token atualizado!')
  }

  const handleRevokeToken = () => {
    if (!revokingToken) return
    const updated = apiKeyService.deleteToken(revokingToken.id)
    setTokens(updated)
    setRevokingToken(null)
    toast.success('Token de API revogado com sucesso!')
  }

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
            Gere tokens de integração com expiração configurável, limitando o acesso estritamente à loja do usuário e escopos selecionados.
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} className="h-8 text-xs font-semibold px-3">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Token de API
        </Button>
      </div>

      {/* Tokens List Card */}
      <Card className="border border-border shadow-xs bg-card overflow-hidden">
        <CardContent className="p-0">
          {tokens.length === 0 ? (
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
                    <div className="space-y-1 min-w-0">
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
                        <span>{t.scopes.length} escopo(s) HBAC habilitado(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(t.id)}
                        className="h-8 text-xs px-2.5"
                      >
                        <Power className="h-3.5 w-3.5 mr-1" />
                        {t.isActive ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRevokingToken(t)}
                        className="h-8 text-xs px-2.5 text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Revogar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive API Docs & Endpoint Explorer */}
      {(() => {
        const activeToken = tokens.find((t) => t.isActive)?.token || 'olv_live_9b4e72a8c13f6e5d0a24b78c9d1e3f5a'
        const targetStoreId = selectedStoreId !== 'all' ? selectedStoreId : (stores[0]?.id || 'loja_id')

        let endpointTable = 'products'
        let queryParams = 'select=*&is_active=eq.true'
        if (activeDocEndpoint === 'inventory') {
          endpointTable = 'stock_balances'
          queryParams = 'select=*,products(*)'
        } else if (activeDocEndpoint === 'orders') {
          endpointTable = 'orders'
          queryParams = 'select=*,order_items(*)'
        }

        const endpointPath = `/rest/v1/${endpointTable}?${queryParams}&store_id=eq.${targetStoreId}`
        const fullEndpointUrl = `${supabaseUrl}${endpointPath}`

        const curlSnippet = `curl -X GET "${fullEndpointUrl}" \\
  -H "apikey: ${supabaseKey}" \\
  -H "Authorization: Bearer ${activeToken}" \\
  -H "X-Store-ID: ${targetStoreId}" \\
  -H "Content-Type: application/json"`

        const pythonSnippet = `import requests

url = "${fullEndpointUrl}"
headers = {
    "apikey": "${supabaseKey}",
    "Authorization": "Bearer ${activeToken}",
    "X-Store-ID": "${targetStoreId}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print("Status Code:", response.status_code)
print("Dados:", data)`

        const jsSnippet = `const response = await fetch('${fullEndpointUrl}', {
  method: 'GET',
  headers: {
    'apikey': '${supabaseKey}',
    'Authorization': 'Bearer ${activeToken}',
    'X-Store-ID': '${targetStoreId}',
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
console.log('Dados:', data)`

        const currentSnippet = codeLang === 'curl' ? curlSnippet : codeLang === 'python' ? pythonSnippet : jsSnippet

        return (
          <Card className="border border-border shadow-xs bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  <div>
                    <h3 className="font-bold text-xs text-foreground">Exemplos de Requisição & Endpoints REST (Supabase PostgREST)</h3>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Host: <span className="text-foreground font-semibold">{supabaseUrl}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Endpoint Switcher */}
                  <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveDocEndpoint('products')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        activeDocEndpoint === 'products' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                      }`}
                    >
                      /products
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocEndpoint('inventory')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        activeDocEndpoint === 'inventory' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                      }`}
                    >
                      /stock_balances
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocEndpoint('orders')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        activeDocEndpoint === 'orders' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                      }`}
                    >
                      /orders (PDV)
                    </button>
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
              </div>

              <div className="bg-muted/70 p-3.5 rounded-xl font-mono text-xs text-foreground space-y-2 border border-border relative group">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/60 pb-2">
                  <span className="font-bold uppercase text-primary">GET /rest/v1/{endpointTable}</span>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-[10px]">Autenticação: Bearer Token + apikey</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentSnippet, 'code')}
                      className="px-2 py-0.5 rounded bg-card hover:bg-muted border border-border text-foreground text-[10px] font-semibold inline-flex items-center gap-1"
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
        )
      })()}

      {/* Create Token Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Gerar Novo Token de API com HBAC"
        description="Defina a loja de isolamento, a expiração e os escopos hierárquicos de acesso"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateToken} className="space-y-4 pt-1 text-xs">
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
                  onClick={() => handleApplyPreset('READ_ONLY')}
                  className="text-primary hover:underline"
                >
                  Leitura
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('POS')}
                  className="text-primary hover:underline"
                >
                  PDV
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('STOCK')}
                  className="text-primary hover:underline"
                >
                  Estoque
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('FULL')}
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={selectedScopes.length === 0 || !tokenName.trim()}>
              Gerar Chave de API
            </Button>
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

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setNewTokenResult(null)}>
              Concluir & Fechar
            </Button>
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
