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
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { StockBranchTransferModal } from '@/components/inventory/StockBranchTransferModal'
import { usePermissions } from '@/hooks/usePermissions'
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
  GitBranch,
  Truck,
  Building2,
  CornerDownRight,
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
  isBranch: boolean
  parentStoreId: string | null
  parentStoreName: string | null
  branchCode: string | null
  managerName: string | null
}

export function StoresPage() {
  const { isGlobalAdmin } = useAuth()
  const { storeId: activeStoreId, activeStore: currentStore, setActiveStore, userStores } = useTenant()
  const { canTransferBranch } = usePermissions()
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
  const unitTypeFilter = filters.unitType || 'ALL'

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false)
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
    isBranch: false,
    parentStoreId: '',
    branchCode: '',
    managerName: '',
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
    const storeMap = new Map(rawStores.map((st) => [st.id, st.name]))
    return rawStores.map((st) => {
      const userLink = userStores.find((us) => us.storeId === st.id)
      const role = isGlobalAdmin ? 'GLOBAL_ADMIN' : userLink?.role || 'STORE_ADMIN'
      const isCurrentActive = st.id === activeStoreId
      const parentId = st.parent_store_id || null

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
        isBranch: Boolean(st.is_branch || st.parent_store_id),
        parentStoreId: parentId,
        parentStoreName: parentId ? storeMap.get(parentId) || 'Loja Matriz' : null,
        branchCode: st.branch_code || null,
        managerName: st.manager_name || null,
      }
    })
  }, [rawStores, userStores, isGlobalAdmin, activeStoreId])

  // Filter & Search
  const filteredStores = React.useMemo(() => {
    let result = allDisplayRows

    if (search.trim()) {
      const q = search.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      result = result.filter(
        (s) =>
          (s.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
          (s.slug || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
          (s.branchCode && s.branchCode.toLowerCase().includes(q)) ||
          (s.managerName && s.managerName.toLowerCase().includes(q)) ||
          (s.document && s.document.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q))
      )
    }

    if (statusFilter === 'ACTIVE') {
      result = result.filter((s) => s.isActive)
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter((s) => !s.isActive)
    }

    if (unitTypeFilter === 'BRANCH') {
      result = result.filter((s) => s.isBranch)
    } else if (unitTypeFilter === 'HEADQUARTERS') {
      result = result.filter((s) => !s.isBranch)
    }

    // Sort base items
    const sorted = [...result].sort((a, b) => {
      let valA = (a[sortBy as keyof StoreDisplayRow] ?? '') as string
      let valB = (b[sortBy as keyof StoreDisplayRow] ?? '') as string

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Group hierarchically: Matriz followed immediately by its Filiais
    const rowIdsInResult = new Set(sorted.map((s) => s.id))
    const roots = sorted.filter((s) => !s.isBranch || !s.parentStoreId || !rowIdsInResult.has(s.parentStoreId))
    const childrenByParent = new Map<string, StoreDisplayRow[]>()
    for (const s of sorted) {
      if (s.isBranch && s.parentStoreId && rowIdsInResult.has(s.parentStoreId)) {
        const list = childrenByParent.get(s.parentStoreId) || []
        list.push(s)
        childrenByParent.set(s.parentStoreId, list)
      }
    }

    const hierarchical: StoreDisplayRow[] = []
    for (const root of roots) {
      hierarchical.push(root)
      const children = childrenByParent.get(root.id) || []
      for (const child of children) {
        hierarchical.push(child)
      }
    }

    return hierarchical
  }, [allDisplayRows, search, statusFilter, unitTypeFilter, sortBy, sortOrder])

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
      parent_store_id?: string | null
      branch_code?: string | null
      is_branch?: boolean
      manager_name?: string | null
    }) => storeService.createStore(data),
    onSuccess: async () => {
      await refreshStores()
      queryClient.invalidateQueries({ queryKey: ['stores-list'] })
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['transfer-destination-stores'] })
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
      queryClient.invalidateQueries({ queryKey: ['transfer-destination-stores'] })
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
      isBranch: false,
      parentStoreId: activeStoreId || '',
      branchCode: '',
      managerName: '',
    })
    setErrorMsg(null)
  }

  const handleOpenCreate = (asBranch = false) => {
    resetForm()
    if (asBranch) {
      setFormData((prev) => ({
        ...prev,
        isBranch: true,
        parentStoreId: activeStoreId || '',
        branchCode: `FIL-0${allDisplayRows.filter((r) => r.isBranch).length + 1}`,
      }))
    }
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
      isBranch: s.isBranch,
      parentStoreId: s.parentStoreId || activeStoreId || '',
      branchCode: s.branchCode || '',
      managerName: s.managerName || '',
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
          is_branch: formData.isBranch,
          parent_store_id: formData.isBranch ? formData.parentStoreId || activeStoreId || null : null,
          branch_code: formData.isBranch ? formData.branchCode || null : null,
          manager_name: formData.managerName || null,
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
        is_branch: formData.isBranch,
        parent_store_id: formData.isBranch ? formData.parentStoreId || activeStoreId || null : null,
        branch_code: formData.isBranch ? formData.branchCode || null : null,
        manager_name: formData.managerName || null,
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
        return <Badge variant="default" className="text-[10px]">Admin Loja</Badge>
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
    <div className="h-full flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
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
            value={unitTypeFilter}
            onChange={(e) => setFilter('unitType', e.target.value)}
            aria-label="Filtrar por tipo de unidade"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer font-medium"
          >
            <option value="ALL">Todas as Unidades ({allDisplayRows.length})</option>
            <option value="HEADQUARTERS">
              Matrizes ({allDisplayRows.filter((r) => !r.isBranch).length})
            </option>
            <option value="BRANCH">
              Filiais Vinculadas ({allDisplayRows.filter((r) => r.isBranch).length})
            </option>
          </select>

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

          {canTransferBranch && activeStoreId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              className="h-8 text-xs px-2.5 border-primary/40 text-primary hover:bg-primary/10 font-semibold"
              title="Enviar produtos do estoque atual para uma filial sem necessidade de venda"
            >
              <Truck className="h-3.5 w-3.5 mr-1" /> Enviar Estoque p/ Filial
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCreate(true)}
            className="h-8 text-xs px-2.5 font-semibold"
          >
            <GitBranch className="h-3.5 w-3.5 mr-1" /> Nova Filial
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenCreate(false)}
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
                onAction={() => handleOpenCreate(false)}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="name"
                      label="Loja / Filial & Endereço Web"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4">Tipo & Matriz</th>
                    <SortableHeader
                      column="document"
                      label="CNPJ / Documento"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4">Contato / Gerente</th>
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
                    <th className="py-3 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedStores.map((s) => {
                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          s.isCurrentActive ? 'bg-primary/5' : s.isBranch ? 'bg-muted/15' : ''
                        }`}
                      >
                        {/* Loja / Nome */}
                        <td className="py-2.5 px-4">
                          <div className={`flex items-center gap-2.5 ${s.isBranch ? 'pl-6 border-l-2 border-primary/30 ml-2' : ''}`}>
                            {s.isBranch && (
                              <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0 -ml-1" />
                            )}
                            <div className={`p-1.5 rounded-lg ${s.isCurrentActive ? 'bg-primary text-primary-foreground' : s.isBranch ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
                              {s.isBranch ? <GitBranch className="h-4 w-4" /> : <StoreIcon className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                {s.name}
                                {s.branchCode && (
                                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-foreground">
                                    {s.branchCode}
                                  </span>
                                )}
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

                        {/* Tipo & Matriz */}
                        <td className="py-2.5 px-4">
                          {s.isBranch ? (
                            <div className="space-y-0.5">
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <GitBranch className="h-3 w-3 text-primary" /> Filial Vinculada
                              </Badge>
                              {s.parentStoreName && (
                                <div className="text-[10px] text-muted-foreground">
                                  Matriz: <span className="font-semibold text-foreground">{s.parentStoreName}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary bg-primary/5">
                              <Building2 className="h-3 w-3" /> Matriz / Independente
                            </Badge>
                          )}
                        </td>

                        {/* CNPJ */}
                        <td className="py-2.5 px-4 text-muted-foreground font-mono">
                          {s.document || '-'}
                        </td>

                        {/* Contato */}
                        <td className="py-2.5 px-4 text-muted-foreground">
                          <div className="space-y-0.5 text-[11px]">
                            {s.managerName && (
                              <div className="font-semibold text-foreground">
                                Resp: {s.managerName}
                              </div>
                            )}
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
                            {!s.managerName && !s.phone && !s.email && <span>-</span>}
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

                        {/* Ações Rápidas */}
                        <td className="py-2.5 px-4 text-right">
                          <DropdownMenu
                            triggerLabel="Ações Rápidas"
                            items={[
                              {
                                key: 'select-store',
                                label: s.isCurrentActive ? 'Loja Atualmente Selecionada' : 'Acessar Painel desta Unidade',
                                icon: s.isCurrentActive ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                                ),
                                disabled: s.isCurrentActive,
                                onSelect: () => handleSelectStore(s),
                              },
                              {
                                key: 'edit-store',
                                label: isGlobalAdmin
                                  ? 'Editar Loja, Filiação & Admins (Tela Completa)'
                                  : 'Editar Dados da Unidade',
                                icon: <Edit2 className="h-3.5 w-3.5 text-primary" />,
                                onSelect: () => {
                                  if (isGlobalAdmin) {
                                    navigate(`/global-admin/stores/${s.id}/edit`)
                                  } else {
                                    handleOpenEdit(s)
                                  }
                                },
                              },
                              {
                                key: 'open-catalog',
                                label: 'Abrir Catálogo Público',
                                icon: <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />,
                                onSelect: () => window.open(`/store/${s.slug}`, '_blank'),
                              },
                              {
                                key: 'toggle-status',
                                label: s.isActive ? 'Desativar Unidade' : 'Ativar Unidade',
                                icon: <Power className="h-3.5 w-3.5" />,
                                variant: s.isActive ? 'danger' : 'default',
                                onSelect: () => setTogglingStore(s),
                              },
                            ]}
                          />
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

          {/* Tipo de Unidade: Matriz ou Filial */}
          <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBranch}
                onChange={(e) => setFormData((prev) => ({ ...prev, isBranch: e.target.checked }))}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              Esta unidade é uma Filial vinculada a uma Loja Matriz (recebe remessas de estoque sem venda)
            </label>

            {formData.isBranch && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Loja Matriz *</label>
                  <select
                    value={formData.parentStoreId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parentStoreId: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
                  >
                    <option value="">Selecione a Matriz...</option>
                    {allDisplayRows
                      .filter((st) => st.id !== editingStore?.id)
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Código da Filial</label>
                  <Input
                    placeholder="Ex: FIL-02"
                    value={formData.branchCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, branchCode: e.target.value.toUpperCase() }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Gerente da Filial</label>
                  <Input
                    placeholder="Ex: Roberto Almeida"
                    value={formData.managerName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, managerName: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
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

      {/* Modal de Remessa de Estoque para Filial Sem Venda */}
      <StockBranchTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        originStoreId={activeStoreId || ''}
        originStoreName={currentStore?.storeName || 'Loja Matriz'}
      />
    </div>
  )
}
