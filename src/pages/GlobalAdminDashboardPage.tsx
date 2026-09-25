import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { storeService } from '@/services/storeService'
import { reportService } from '@/services/reportService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Store, Plus, Search, Shield, Building2, Users, ShoppingCart } from 'lucide-react'
import { formatDate } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'

export function GlobalAdminDashboardPage() {
  const [search, setSearch] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [newStoreName, setNewStoreName] = React.useState('')
  const [newStoreSlug, setNewStoreSlug] = React.useState('')
  const [newStoreDoc, setNewStoreDoc] = React.useState('')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: globalMetrics } = useQuery({
    queryKey: ['global-admin-metrics'],
    queryFn: () => reportService.getGlobalAdminMetrics(),
  })

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['all-stores'],
    queryFn: () => storeService.listAllStores(),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; document?: string }) =>
      storeService.createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setIsModalOpen(false)
      setNewStoreName('')
      setNewStoreSlug('')
      setNewStoreDoc('')
    },
    onError: (err) => {
      setErrorMessage(parseApiError(err))
    },
  })

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStoreName || !newStoreSlug) return
    setErrorMessage(null)
    createMutation.mutate({
      name: newStoreName,
      slug: newStoreSlug,
      document: newStoreDoc || undefined,
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-1">
            <Shield className="h-3 w-3" /> Painel de Controle Global (SaaS Admin)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Gestão Central Multi-Lojas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administração, ativação e criação de tenants de toda a plataforma
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="shadow-md">
          <Plus className="h-4 w-4 mr-1.5" /> Criar Nova Loja (Tenant)
        </Button>
      </div>

      {/* Global Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Total de Lojas</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-foreground">
              {globalMetrics?.totalStores ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Lojas Ativas</span>
            <div className="p-2 rounded-xl bg-success/10 text-success">
              <Store className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-foreground">
              {globalMetrics?.activeStores ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Total de Usuários</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-foreground">
              {globalMetrics?.totalUsers ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Vendas Globais</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-foreground">
              {globalMetrics?.totalOrders ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stores Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <CardTitle className="text-base font-bold">Lojas Cadastradas no SaaS</CardTitle>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por nome ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Carregando lojas...</div>
          ) : filteredStores.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma loja encontrada com os filtros informados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nome da Loja</th>
                    <th className="py-3 px-4">Slug / URL</th>
                    <th className="py-3 px-4">CNPJ / Documento</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Data de Criação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStores.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{st.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        /store/{st.slug}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{st.document || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={st.is_active ? 'success' : 'destructive'}>
                          {st.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(st.created_at)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/store/${st.slug}`}
                          target="_blank"
                          className="text-primary hover:underline font-medium text-xs mr-3"
                        >
                          Catálogo
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Store Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Nova Loja (Tenant)"
        description="Criação de nova loja independente no ecossistema multi-tenant"
      >
        <form onSubmit={handleCreateStore} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Nome da Loja</label>
            <Input
              placeholder="Ex: Empório Central Paulista"
              value={newStoreName}
              onChange={(e) => {
                setNewStoreName(e.target.value)
                setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Slug do Catálogo (URL)</label>
            <Input
              placeholder="emporio-central-paulista"
              value={newStoreSlug}
              onChange={(e) => setNewStoreSlug(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">CNPJ / CPF (Opcional)</label>
            <Input
              placeholder="00.000.000/0001-00"
              value={newStoreDoc}
              onChange={(e) => setNewStoreDoc(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Criar Loja
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
