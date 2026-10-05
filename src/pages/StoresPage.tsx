import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { storeService } from '@/services/storeService'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useAuthStore } from '@/stores/authStore'
import { useTablePagination } from '@/hooks/useTablePagination'
import { parseApiError } from '@/utils/errorHandler'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import {
  Store as StoreIcon,
  Plus,
  Search,
  Download,
  Edit2,
  ExternalLink,
  Check,
  Power,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import type { Store } from '@/types/store.types'

interface StoreDisplayRow {
  id: string
  name: string
  slug: string
  document: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  description: string | null
  role: string
  isActive: boolean
  isCurrentActive: boolean
}

export function StoresPage() {
  const { isGlobalAdmin } = useAuth()
  const { storeId: activeStoreId, setActiveStore, userStores } = useTenant()
  const { refreshStores } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingStore, setEditingStore] = React.useState<StoreDisplayRow | null>(null)
  const [togglingStore, setTogglingStore] = React.useState<StoreDisplayRow | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    name: '',
    slug: '',
    document: '',
    phone: '',
    whatsapp: '',
    email: '',
    description: '',
    isActive: true,
  })

  // Query stores based on user role (all stores for global admin, or list for regular tenant)
  const { data: rawStores = [], isLoading } = useQuery({
    queryKey: ['stores-list', isGlobalAdmin],
    queryFn: async () => {
      if (isGlobalAdmin) {
        return await storeService.listAllStores()
      }
      // If regular user, get details of user's linked stores
      const stores = await storeService.listAllStores().catch(() => [])
      if (stores && stores.length > 0) return stores
      // Fallback to userStores from session
      return userStores.map((us) => ({
        id: us.storeId,
        name: us.storeName,
        slug: us.storeSlug,
        document: null,
        phone: null,
        whatsapp: null,
        email: null,
        description: null,
        is_active: us.isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as Store[]
    },
  })

  // Map stores into unified display items
  const allDisplayRows: StoreDisplayRow[] = React.useMemo(() => {
    return rawStores.map((st) => {
      const userLink = userStores.find((us) => us.storeId === st.id)
      const role = isGlobalAdmin ? 'GLOBAL_ADMIN' : userLink?.role || 'STORE_ADMIN'
      const isCurrentActive = st.id === activeStoreId

      return {
        id: st.id,
        name: st.name,
        slug: st.slug,
        document: st.document || null,
        phone: st.phone || null,
        whatsapp: st.whatsapp || null,
        email: st.email || null,
        description: st.description || null,
        role,
        isActive: st.is_active ?? true,
        isCurrentActive,
      }
    })
  }, [rawStores, userStores, isGlobalAdmin, activeStoreId])

  // Filter & Search
  const filteredStores = React.useMemo(() => {
    let result = allDisplayRows

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.document && s.document.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q))
      )
    }

    if (statusFilter === 'ACTIVE') {
      result = result.filter((s) => s.isActive)
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter((s) => !s.isActive)
    }

    // Sort
    result = [...result].sort((a, b) => {
      let valA = (a[sortBy as keyof StoreDisplayRow] ?? '') as string
      let valB = (b[sortBy as keyof StoreDisplayRow] ?? '') as string

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [allDisplayRows, search, statusFilter, sortBy, sortOrder])

  // Pagination Slice
  const totalItems = filteredStores.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedStores = React.useMemo(() => {
    const from = (page - 1) * pageSize
    return filteredStores.slice(from, from + pageSize)
  }, [filteredStores, page, pageSize])

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string
      slug: string
      document?: string
      phone?: string
      whatsapp?: string
      email?: string
      description?: string
    }) => storeService.createStore(data),
    onSuccess: async () => {
      await refreshStores()
      queryClient.invalidateQueries({ queryKey: ['stores-list'] })
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Store> }) =>
      storeService.updateStore(id, updates),
    onSuccess: async () => {
      await refreshStores()
      queryClient.invalidateQueries({ queryKey: ['stores-list'] })
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      storeService.updateStore(id, { is_active: isActive }),
    onSuccess: async () => {
      await refreshStores()
      queryClient.invalidateQueries({ queryKey: ['stores-list'] })
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const resetForm = () => {
    setEditingStore(null)
    setFormData({
      name: '',
      slug: '',
      document: '',
      phone: '',
      whatsapp: '',
      email: '',
      description: '',
      isActive: true,
    })
    setErrorMsg(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (s: StoreDisplayRow) => {
    setEditingStore(s)
    setFormData({
      name: s.name,
      slug: s.slug,
      document: s.document || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      email: s.email || '',
      description: s.description || '',
      isActive: s.isActive,
    })
    setErrorMsg(null)
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.slug) return

    if (editingStore) {
      updateMutation.mutate({
        id: editingStore.id,
        updates: {
          name: formData.name,
          slug: formData.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          document: formData.document || null,
          phone: formData.phone || null,
          whatsapp: formData.whatsapp || null,
          email: formData.email || null,
          description: formData.description || null,
          is_active: formData.isActive,
        },
      })
    } else {
      createMutation.mutate({
        name: formData.name,
        slug: formData.slug,
        document: formData.document || undefined,
        phone: formData.phone || undefined,
        whatsapp: formData.whatsapp || undefined,
        email: formData.email || undefined,
        description: formData.description || undefined,
      })
    }
  }

  const handleSelectStore = (storeRow: StoreDisplayRow) => {
    setActiveStore({
      id: storeRow.id,
      storeId: storeRow.id,
      storeName: storeRow.name,
      storeSlug: storeRow.slug,
      role: (isGlobalAdmin ? 'STORE_ADMIN' : storeRow.role) as any,
      isActive: storeRow.isActive,
    })
    navigate('/dashboard')
  }

  const handleExportCSV = () => {
    if (filteredStores.length === 0) return
    exportToCSV(
      'lojas',
      filteredStores,
      [
        { header: 'Nome da Loja', key: 'name' },
        { header: 'Slug / URL', key: 'slug' },
        { header: 'CNPJ', key: (r) => r.document || '-' },
        { header: 'Telefone', key: (r) => r.phone || '-' },
        { header: 'WhatsApp', key: (r) => r.whatsapp || '-' },
        { header: 'E-mail', key: (r) => r.email || '-' },
        { header: 'Papel', key: 'role' },
        { header: 'Status', key: (r) => (r.isActive ? 'Ativa' : 'Inativa') },
      ]
    )
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'GLOBAL_ADMIN':
        return <Badge variant="default" className="text-[10px]">Global Admin</Badge>
      case 'STORE_ADMIN':
        return <Badge variant="default" className="text-[10px]">Administrador</Badge>
      case 'FINANCE':
        return <Badge variant="success" className="text-[10px]">Gerente / Fin.</Badge>
      case 'SELLER':
        return <Badge variant="secondary" className="text-[10px]">Vendedor</Badge>
      case 'INVENTORY':
        return <Badge variant="outline" className="text-[10px]">Estoquista</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{role}</Badge>
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Lojas & Filiais">
        <Input
          placeholder="Buscar loja por nome, slug, CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Count, Filters & Actions) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalItems} {totalItems === 1 ? 'loja encontrada' : 'lojas encontradas'}
          </Badge>
          {isGlobalAdmin && (
            <Badge variant="secondary" className="text-[10px] font-medium gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" /> Visão Global Admin
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
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
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredStores.length === 0}
            className="h-8 text-xs px-2.5"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 text-xs px-2.5 shadow-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Loja
          </Button>
        </div>
      </div>

      {/* Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : paginatedStores.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<StoreIcon className="h-10 w-10 text-primary" />}
                title="Nenhuma loja encontrada"
                description="Cadastre uma nova filial para gerenciar produtos, estoque, vendas e equipes separadamente."
                actionLabel="Nova Loja"
                onAction={handleOpenCreate}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="name"
                      label="Loja & Endereço Web"
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
                    <th className="py-3 px-4">Contato</th>
                    <th className="py-3 px-4">Seu Papel</th>
                    <th className="py-3 px-4">Catálogo Público</th>
                    <SortableHeader
                      column="isActive"
                      label="Status"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                      className="text-center"
                    />
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedStores.map((s) => {
                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          s.isCurrentActive ? 'bg-primary/5' : ''
                        }`}
                      >
                        {/* Loja / Nome */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${s.isCurrentActive ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                              <StoreIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                {s.name}
                                {s.isCurrentActive && (
                                  <span className="inline-flex items-center text-[10px] bg-primary/15 text-primary px-1.5 py-0.2 rounded-full font-medium">
                                    <Check className="h-3 w-3 mr-0.5" /> Atual
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                /store/{s.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* CNPJ */}
                        <td className="py-2.5 px-4 text-muted-foreground font-mono">
                          {s.document || '-'}
                        </td>

                        {/* Contato */}
                        <td className="py-2.5 px-4 text-muted-foreground">
                          <div className="space-y-0.5 text-[11px]">
                            {s.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" /> {s.phone}
                              </div>
                            )}
                            {s.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" /> {s.email}
                              </div>
                            )}
                            {!s.phone && !s.email && <span>-</span>}
                          </div>
                        </td>

                        {/* Papel */}
                        <td className="py-2.5 px-4">
                          {getRoleBadge(s.role)}
                        </td>

                        {/* Catálogo Público */}
                        <td className="py-2.5 px-4">
                          <Link
                            to={`/store/${s.slug}`}
                            target="_blank"
                            className="inline-flex items-center text-xs text-primary hover:underline font-medium"
                          >
                            Abrir Catálogo <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 text-center">
                          <Badge variant={s.isActive ? 'success' : 'secondary'}>
                            {s.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </td>

                        {/* Ações */}
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {s.isCurrentActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs px-2.5 text-primary border-primary/30 bg-primary/5 pointer-events-none"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Selecionada
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectStore(s)}
                                className="h-8 text-xs px-2.5 hover:bg-primary hover:text-primary-foreground font-medium"
                              >
                                Acessar <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(s)}
                              className="h-8 text-xs font-semibold px-2.5"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTogglingStore(s)}
                              className={`h-8 text-xs font-semibold px-2.5 ${
                                s.isActive
                                  ? 'text-danger hover:bg-danger/10 border-danger/30'
                                  : 'text-success hover:bg-success/10 border-success/30'
                              }`}
                            >
                              <Power className="h-3.5 w-3.5 mr-1" /> {s.isActive ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </ResponsiveTable>
            </div>
          )}
        </CardContent>

        {/* Pin Pagination at the bottom of the card */}
        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>

      {/* Modal - Nova / Editar Loja */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingStore ? 'Editar Loja' : 'Nova Loja'}
        description={
          editingStore
            ? 'Atualize as informações comerciais e de contato da filial'
            : 'Cadastre uma nova filial ou unidade comercial'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nome da Loja *</label>
              <Input
                placeholder="Ex: Olivelas Jardins"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    name: val,
                    slug: editingStore ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                  }))
                }}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Slug do Catálogo (URL) *</label>
              <Input
                placeholder="olivelas-jardins"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">CNPJ / Documento</label>
              <Input
                placeholder="00.000.000/0001-00"
                value={formData.document}
                onChange={(e) => setFormData((prev) => ({ ...prev, document: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">E-mail de Contato</label>
              <Input
                type="email"
                placeholder="contato@olivelas.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Telefone Fixo / Comercial</label>
              <Input
                placeholder="(11) 3456-7890"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">WhatsApp para Vendas</label>
              <Input
                placeholder="(11) 98765-4321"
                value={formData.whatsapp}
                onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Descrição / Informações Adicionais</label>
            <Input
              placeholder="Ex: Matriz com atendimento presencial e delivery para toda a região"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          {editingStore && (
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                Loja Ativa (Visível para operações e catálogo online)
              </label>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-8 text-xs px-3"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-8 text-xs px-3 font-semibold"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingStore ? 'Salvar Alterações' : 'Criar Loja'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Toggle Status Modal */}
      <ConfirmModal
        isOpen={Boolean(togglingStore)}
        onClose={() => setTogglingStore(null)}
        onConfirm={() => {
          if (togglingStore) {
            toggleStatusMutation.mutate({
              id: togglingStore.id,
              isActive: !togglingStore.isActive,
            })
            setTogglingStore(null)
          }
        }}
        title={togglingStore?.isActive ? 'Desativar Loja' : 'Ativar Loja'}
        description={
          togglingStore?.isActive
            ? `Tem certeza que deseja desativar a loja "${togglingStore?.name}"? Os usuários não poderão realizar novas operações nem acessar seu catálogo público até que ela seja reativada.`
            : `Deseja reativar a loja "${togglingStore?.name}" para permitir vendas e acesso ao catálogo público?`
        }
        confirmText={togglingStore?.isActive ? 'Sim, Desativar' : 'Sim, Ativar'}
        cancelText="Cancelar"
        variant={togglingStore?.isActive ? 'danger' : 'primary'}
        isLoading={toggleStatusMutation.isPending}
      />
    </div>
  )
}
