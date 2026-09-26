import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { storeService } from '@/services/storeService'
import { reportService } from '@/services/reportService'
import { useTablePagination } from '@/hooks/useTablePagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Store,
  Plus,
  Search,
  Shield,
  Building2,
  Users,
  ShoppingCart,
  ExternalLink,
  Edit2,
  Power,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { formatDate } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import type { Store as StoreType } from '@/types/store.types'

import { PageHeader } from '@/components/common/PageHeader'

export function GlobalAdminDashboardPage() {
  const queryClient = useQueryClient()

  const {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setPageSize,
    setSearch,
    toggleSort,
    setFilter,
  } = useTablePagination({
    defaultPageSize: 15,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
  })

  const statusFilter = filters.status || 'ALL'

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingStore, setEditingStore] = React.useState<StoreType | null>(null)
  const [formData, setFormData] = React.useState({
    name: '',
    slug: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    description: '',
  })
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const { data: globalMetrics } = useQuery({
    queryKey: ['global-admin-metrics'],
    queryFn: () => reportService.getGlobalAdminMetrics(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['all-stores', { search, statusFilter, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      storeService.listStores({
        search: search || undefined,
        status: statusFilter,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
  })

  const storeList = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const createMutation = useMutation({
    mutationFn: (storeData: typeof formData) => storeService.createStore(storeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err) => {
      setErrorMessage(parseApiError(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StoreType> }) =>
      storeService.updateStore(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setEditingStore(null)
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err) => {
      setErrorMessage(parseApiError(err))
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      storeService.updateStore(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
    },
    onError: (err) => {
      setErrorMessage(parseApiError(err))
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      description: '',
    })
    setErrorMessage(null)
    setEditingStore(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (store: StoreType) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      slug: store.slug,
      document: store.document || '',
      email: store.email || '',
      phone: store.phone || '',
      whatsapp: store.whatsapp || '',
      description: store.description || '',
    })
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.slug) return
    setErrorMessage(null)

    if (editingStore) {
      updateMutation.mutate({
        id: editingStore.id,
        updates: {
          name: formData.name,
          slug: formData.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          document: formData.document || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          whatsapp: formData.whatsapp || undefined,
          description: formData.description || undefined,
        },
      })
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader
        title="Gestão Multi-Lojas"
        badge={
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
            <Shield className="h-3 w-3" /> Global Admin
          </div>
        }
      >
        <Input
          placeholder="Buscar nome, slug, CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Status filter & Actions) */}
      <div className="flex items-center justify-end gap-2 flex-shrink-0">
        <select
          value={statusFilter}
          onChange={(e) => setFilter('status', e.target.value)}
          aria-label="Filtrar por status"
          className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="ALL">Todos os Status</option>
          <option value="ACTIVE">Apenas Ativas</option>
          <option value="INACTIVE">Inativas</option>
        </select>

        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="h-8 text-xs px-2.5 shadow-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Nova Loja (Tenant)
        </Button>
      </div>

      {/* Global Compact Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
        <Card className="p-2.5 sm:p-3 border border-border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Total de Lojas</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-foreground mt-1">
            {globalMetrics?.totalStores ?? 0}
          </div>
        </Card>

        <Card className="p-2.5 sm:p-3 border border-border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Lojas Ativas</span>
            <div className="p-1.5 rounded-lg bg-success/10 text-success">
              <Store className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-success mt-1">
            {globalMetrics?.activeStores ?? 0}
          </div>
        </Card>

        <Card className="p-2.5 sm:p-3 border border-border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Total Usuários</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-foreground mt-1">
            {globalMetrics?.totalUsers ?? 0}
          </div>
        </Card>

        <Card className="p-2.5 sm:p-3 border border-border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Pedidos Globais</span>
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
              <ShoppingCart className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-foreground mt-1">
            {globalMetrics?.totalOrders ?? 0}
          </div>
        </Card>
      </div>

      {/* Stores Table Viewport Card */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : storeList.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<Building2 className="h-10 w-10 text-primary" />}
                title="Nenhuma loja encontrada"
                description="Cadastre novos tenants ou ajuste os filtros para gerenciar as instâncias do sistema."
                actionLabel="Criar Loja"
                onAction={handleOpenCreate}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="name"
                      label="Nome da Loja"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="slug"
                      label="Slug / Catálogo"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="document"
                      label="CNPJ / Documento"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="is_active"
                      label="Status"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                      className="text-center"
                    />
                    <SortableHeader
                      column="created_at"
                      label="Criado em"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {storeList.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-muted text-foreground">
                            <Store className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div>{st.name}</div>
                            {st.email && (
                              <div className="text-[10px] text-muted-foreground font-normal">
                                {st.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4 font-mono text-[11px] text-muted-foreground">
                        <Link
                          to={`/store/${st.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-primary hover:underline hover:text-primary/80"
                          title="Abrir Catálogo da Loja"
                        >
                          /store/{st.slug}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground">
                        {st.document || '-'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <Badge
                          variant={st.is_active ? 'success' : 'destructive'}
                          className="text-[10px] px-2 py-0.5"
                        >
                          {st.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground text-[11px]">
                        {formatDate(st.created_at)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(st)}
                            title="Editar Loja"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${
                              st.is_active
                                ? 'text-destructive/80 hover:text-destructive'
                                : 'text-success/80 hover:text-success'
                            }`}
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: st.id,
                                isActive: !st.is_active,
                              })
                            }
                            title={st.is_active ? 'Desativar Loja' : 'Ativar Loja'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pinned Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* New / Edit Store Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingStore ? 'Editar Loja (Tenant)' : 'Cadastrar Nova Loja (Tenant)'}
        description={
          editingStore
            ? `Atualize as configurações e parâmetros da loja ${editingStore.name}`
            : 'Criação de nova loja independente no ecossistema multi-tenant'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {errorMessage && (
            <div className="p-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Nome da Loja *</label>
              <Input
                placeholder="Ex: Empório Central"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    name: val,
                    slug: editingStore
                      ? prev.slug
                      : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                  }))
                }}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Slug do Catálogo (URL) *</label>
              <Input
                placeholder="emporio-central"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                  }))
                }
                required
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">CNPJ / CPF</label>
              <Input
                placeholder="00.000.000/0001-00"
                value={formData.document}
                onChange={(e) => setFormData((prev) => ({ ...prev, document: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">E-mail</label>
              <Input
                type="email"
                placeholder="contato@loja.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Telefone / WhatsApp</label>
              <Input
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Descrição / Informações</label>
            <Input
              placeholder="Breve descrição da filial ou segmento..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs font-semibold"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingStore ? 'Salvar Alterações' : 'Criar Loja'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
