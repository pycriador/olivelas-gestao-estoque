import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { storeService } from '@/services/storeService'
import { reportService } from '@/services/reportService'
import { userService } from '@/services/userService'
import { useTablePagination } from '@/hooks/useTablePagination'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import { GlobalDeletePanel } from '@/components/admin/GlobalDeletePanel'
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
  KeyRound,
  Trash2,
  ArrowRightLeft,
  Eye,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Layers,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import type { Store as StoreType } from '@/types/store.types'
import type { PlatformUser } from '@/types/user.types'

export function GlobalAdminDashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const { setActiveStore } = useTenant()

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

  const activeTab = filters.tab || 'stores' // 'stores' | 'users' | 'delete'
  const statusFilter = filters.status || 'ALL'

  const selectTab = (tab: 'stores' | 'users' | 'delete') => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', tab)
      next.delete('page')
      next.delete('search')
      return next
    }, { replace: true })
  }

  // Store modal states
  const [isStoreModalOpen, setIsStoreModalOpen] = React.useState(false)
  const [editingStore, setEditingStore] = React.useState<StoreType | null>(null)
  const [storeFormData, setStoreFormData] = React.useState({
    name: '',
    slug: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    description: '',
  })

  // User modal states
  const [isUserModalOpen, setIsUserModalOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<PlatformUser | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<PlatformUser | null>(null)
  const [togglingStore, setTogglingStore] = React.useState<StoreType | null>(null)
  const [userFormData, setUserFormData] = React.useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    isGlobalAdmin: false,
    initialStoreId: '',
  })

  // Transfer ownership modal states
  const [transferModalStore, setTransferModalStore] = React.useState<StoreType | null>(null)
  const [selectedNewOwnerId, setSelectedNewOwnerId] = React.useState('')

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Metrics
  const { data: globalMetrics } = useQuery({
    queryKey: ['global-admin-metrics'],
    queryFn: () => reportService.getGlobalAdminMetrics(),
  })

  // Stores Query
  const userRoleFilter = filters.userRole || 'ALL'

  // Stores Query
  const { data: storesData, isLoading: loadingStores, error: storesQueryError, refetch: refetchStores } = useQuery({
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
    enabled: activeTab === 'stores',
  })

  // Users Query
  const {
    data: usersData,
    isLoading: loadingUsers,
    error: usersQueryError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['platform-users', { search, userRoleFilter, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      userService.listPlatformUsers({
        search: search || undefined,
        isGlobalAdmin:
          userRoleFilter === 'GLOBAL_ADMIN' ? true : userRoleFilter === 'STANDARD' ? false : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: activeTab === 'users',
  })

  // All users list for transfer modal dropdown
  const { data: allPlatformUsers } = useQuery({
    queryKey: ['all-platform-users-list'],
    queryFn: () => userService.listPlatformUsers({ pageSize: 500 }),
    enabled: Boolean(transferModalStore),
  })

  const storeList = storesData?.data || []
  const totalStores = storesData?.total || 0

  const userList = usersData?.data || []
  const totalUsers = usersData?.total || 0

  const currentTotalItems = activeTab === 'stores' ? totalStores : totalUsers
  const currentTotalPages = Math.ceil(currentTotalItems / pageSize) || 1

  // Mutations for Stores
  const createStoreMutation = useMutation({
    mutationFn: (data: typeof storeFormData) => storeService.createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setIsStoreModalOpen(false)
      resetStoreForm()
      setSuccessMessage('Loja criada com sucesso!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const updateStoreMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StoreType> }) =>
      storeService.updateStore(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setIsStoreModalOpen(false)
      resetStoreForm()
      setSuccessMessage('Loja atualizada com sucesso!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const toggleStoreStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      storeService.updateStore(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  // Mutations for Users
  const createUserMutation = useMutation({
    mutationFn: (data: typeof userFormData) =>
      userService.createPlatformUser({
        email: data.email,
        fullName: data.fullName,
        phone: data.phone || undefined,
        password: data.password || undefined,
        isGlobalAdmin: data.isGlobalAdmin,
        storeId: data.initialStoreId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setIsUserModalOpen(false)
      resetUserForm()
      setSuccessMessage('Usuário cadastrado com sucesso!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { fullName?: string; phone?: string; isGlobalAdmin?: boolean } }) =>
      userService.updateProfile(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      setIsUserModalOpen(false)
      resetUserForm()
      setSuccessMessage('Perfil do usuário atualizado!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => userService.sendPasswordReset(email),
    onSuccess: () => {
      setSuccessMessage('Link de redefinição de senha enviado para o e-mail do usuário.')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setSuccessMessage('Usuário removido da plataforma.')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const transferOwnershipMutation = useMutation({
    mutationFn: ({ storeId, newOwnerId }: { storeId: string; newOwnerId: string }) =>
      userService.transferStoreOwnership(storeId, newOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      setTransferModalStore(null)
      setSelectedNewOwnerId('')
      setSuccessMessage('Propriedade da loja transferida com sucesso!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  // Helpers
  const resetStoreForm = () => {
    setStoreFormData({
      name: '',
      slug: '',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      description: '',
    })
    setEditingStore(null)
    setErrorMessage(null)
  }

  const resetUserForm = () => {
    setUserFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      isGlobalAdmin: false,
      initialStoreId: '',
    })
    setEditingUser(null)
    setErrorMessage(null)
  }

  const handleOpenEditStore = (store: StoreType) => {
    setEditingStore(store)
    setStoreFormData({
      name: store.name,
      slug: store.slug,
      document: store.document || '',
      email: store.email || '',
      phone: store.phone || '',
      whatsapp: store.whatsapp || '',
      description: store.description || '',
    })
    setErrorMessage(null)
    setIsStoreModalOpen(true)
  }

  const handleOpenEditUser = (u: PlatformUser) => {
    setEditingUser(u)
    setUserFormData({
      fullName: u.fullName || '',
      email: u.email,
      phone: u.phone || '',
      password: '',
      isGlobalAdmin: u.isGlobalAdmin,
      initialStoreId: '',
    })
    setErrorMessage(null)
    setIsUserModalOpen(true)
  }

  const handleEnterStoreContext = (st: StoreType) => {
    setActiveStore({
      id: st.id,
      storeId: st.id,
      storeName: st.name,
      storeSlug: st.slug,
      role: 'STORE_ADMIN',
      isActive: st.is_active,
    })
    navigate('/dashboard')
  }

  const handleStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeFormData.name || !storeFormData.slug) return
    setErrorMessage(null)

    if (editingStore) {
      updateStoreMutation.mutate({
        id: editingStore.id,
        updates: {
          name: storeFormData.name,
          slug: storeFormData.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          document: storeFormData.document || undefined,
          email: storeFormData.email || undefined,
          phone: storeFormData.phone || undefined,
          whatsapp: storeFormData.whatsapp || undefined,
          description: storeFormData.description || undefined,
        },
      })
    } else {
      createStoreMutation.mutate(storeFormData)
    }
  }

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userFormData.fullName || !userFormData.email) return
    setErrorMessage(null)

    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        updates: {
          fullName: userFormData.fullName,
          phone: userFormData.phone || undefined,
          isGlobalAdmin: userFormData.isGlobalAdmin,
        },
      })
    } else {
      createUserMutation.mutate(userFormData)
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
          placeholder={
            activeTab === 'stores'
              ? 'Buscar loja, slug, CNPJ...'
              : activeTab === 'users'
                ? 'Buscar usuário, email...'
                : 'Buscar registro para excluir...'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Flash Success Notification */}
      {successMessage && (
        <div className="p-2.5 rounded-lg bg-success/15 border border-success/30 flex items-center justify-between text-xs text-foreground animate-in fade-in flex-shrink-0">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-muted-foreground hover:text-foreground font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tab Switcher & Action Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        {/* Tab Pills */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
          <button
            onClick={() => selectTab('stores')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'stores'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 inline mr-1.5" /> Lojas da Plataforma ({globalMetrics?.totalStores ?? 0})
          </button>
          <button
            onClick={() => selectTab('users')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5 inline mr-1.5" /> Usuários ({globalMetrics?.totalUsers ?? 0})
          </button>
          <button
            onClick={() => selectTab('delete')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'delete'
                ? 'bg-danger text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5 inline mr-1.5" /> Exclusão Definitiva
          </button>
        </div>

        {/* Tab Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {activeTab === 'stores' && (
            <>
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
                onClick={() => {
                  resetStoreForm()
                  setIsStoreModalOpen(true)
                }}
                className="h-8 text-xs px-2.5 shadow-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova Loja
              </Button>
            </>
          )}

          {activeTab === 'users' && (
            <>
              <select
                value={userRoleFilter}
                onChange={(e) => setFilter('userRole', e.target.value)}
                aria-label="Filtrar tipo de usuário"
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">Todos os Usuários</option>
                <option value="GLOBAL_ADMIN">Apenas Global Admins</option>
                <option value="STANDARD">Usuários Padrão</option>
              </select>

              <Button
                size="sm"
                onClick={() => {
                  resetUserForm()
                  setIsUserModalOpen(true)
                }}
                className="h-8 text-xs px-2.5 shadow-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Novo Usuário
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Global Compact Metrics Cards (so nas abas de leitura) */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0 ${
          activeTab === 'delete' ? 'hidden' : ''
        }`}
      >
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
            <span className="text-[11px] font-medium text-muted-foreground">Usuários Cadastrados</span>
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

      {/* TAB 3: CROSS-STORE HARD DELETE */}
      {activeTab === 'delete' && <GlobalDeletePanel />}

      {/* Main Table Card (Stores or Users Viewport) */}
      {activeTab !== 'delete' && (
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* TAB 1: STORES TABLE */}
          {activeTab === 'stores' && (
            loadingStores ? (
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
                  onAction={() => {
                    resetStoreForm()
                    setIsStoreModalOpen(true)
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                <ResponsiveTable className="w-full text-xs text-left">
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
                      <th className="py-2.5 px-4 text-right">Ações Rápidas</th>
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
                            title="Abrir Catálogo Público"
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
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2 gap-1 text-primary hover:bg-primary/10"
                              onClick={() => handleEnterStoreContext(st)}
                              title="Visualizar como a Loja (Acessar Painel)"
                            >
                              <Eye className="h-3 w-3" /> Acessar Loja
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setTransferModalStore(st)
                                setSelectedNewOwnerId('')
                              }}
                              title="Transferir Propriedade da Loja"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditStore(st)}
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
                              onClick={() => setTogglingStore(st)}
                              title={st.is_active ? 'Desativar Loja' : 'Ativar Loja'}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ResponsiveTable>
              </div>
            )
          )}

          {/* TAB 2: PLATFORM USERS TABLE */}
          {activeTab === 'users' && (
            loadingUsers ? (
              <div className="p-6">
                <LoadingSkeleton count={5} className="h-10" />
              </div>
            ) : usersQueryError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive mb-3">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="font-semibold text-foreground text-sm">Erro ao carregar usuários da plataforma</div>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  {parseApiError(usersQueryError)}
                </p>
                <Button
                  size="sm"
                  onClick={() => refetchUsers()}
                  className="mt-4 h-8 text-xs font-semibold"
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : userList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <EmptyState
                  icon={<Users className="h-10 w-10 text-primary" />}
                  title="Nenhum usuário encontrado"
                  description="Cadastre novos usuários na plataforma ou altere os termos de busca."
                  actionLabel="Novo Usuário"
                  onAction={() => {
                    resetUserForm()
                    setIsUserModalOpen(true)
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                <ResponsiveTable className="w-full text-xs text-left">
                  <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <SortableHeader
                        column="full_name"
                        label="Nome & E-mail"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                      />
                      <th className="py-2.5 px-4">Telefone</th>
                      <SortableHeader
                        column="is_global_admin"
                        label="Acesso Global"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                        className="text-center"
                      />
                      <th className="py-2.5 px-4">Lojas Vinculadas</th>
                      <SortableHeader
                        column="created_at"
                        label="Cadastro em"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                      />
                      <th className="py-2.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {userList.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {u.fullName?.slice(0, 2) || u.email.slice(0, 2)}
                            </div>
                            <div>
                              <div>{u.fullName || 'Sem nome cadastrado'}</div>
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {u.phone || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {u.isGlobalAdmin ? (
                            <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-primary text-primary-foreground font-semibold shadow-xs">
                              <Shield className="h-2.5 w-2.5" /> Global Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                              Usuário Padrão
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.stores.length === 0 ? (
                              <span className="text-muted-foreground text-[11px]">Nenhuma loja</span>
                            ) : (
                              u.stores.map((st) => (
                                <Badge
                                  key={st.storeId}
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 gap-1 border-primary/20 bg-primary/5"
                                >
                                  {st.storeName} ({st.role})
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          {formatDateTime(u.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => resetPasswordMutation.mutate(u.email)}
                              title="Resetar Senha (Enviar link de redefinição por e-mail)"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditUser(u)}
                              title="Editar Usuário"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/80 hover:text-destructive"
                              onClick={() => setDeletingUser(u)}
                              title="Remover Usuário"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ResponsiveTable>
              </div>
            )
          )}
        </CardContent>

        {/* Pin Pagination at the bottom of the card */}
        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
          <Pagination
            currentPage={page}
            totalPages={currentTotalPages}
            totalItems={currentTotalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>
      )}

      {/* MODAL 1: NEW / EDIT STORE */}
      <Modal
        isOpen={isStoreModalOpen}
        onClose={() => {
          setIsStoreModalOpen(false)
          resetStoreForm()
        }}
        title={editingStore ? 'Editar Loja' : 'Cadastrar Nova Loja'}
        description={
          editingStore
            ? `Atualize as configurações e parâmetros da loja ${editingStore.name}`
            : 'Criação de nova loja independente no sistema'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleStoreSubmit} className="space-y-3 pt-1">
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
                value={storeFormData.name}
                onChange={(e) => {
                  const val = e.target.value
                  setStoreFormData((prev) => ({
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
                value={storeFormData.slug}
                onChange={(e) =>
                  setStoreFormData((prev) => ({
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
                value={storeFormData.document}
                onChange={(e) => setStoreFormData((prev) => ({ ...prev, document: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">E-mail</label>
              <Input
                type="email"
                placeholder="contato@loja.com"
                value={storeFormData.email}
                onChange={(e) => setStoreFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Telefone / WhatsApp</label>
              <Input
                placeholder="(11) 99999-9999"
                value={storeFormData.phone}
                onChange={(e) => setStoreFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Descrição / Informações</label>
            <Input
              placeholder="Breve descrição da filial ou segmento..."
              value={storeFormData.description}
              onChange={(e) => setStoreFormData((prev) => ({ ...prev, description: e.target.value }))}
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
                setIsStoreModalOpen(false)
                resetStoreForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs font-semibold"
              isLoading={createStoreMutation.isPending || updateStoreMutation.isPending}
            >
              {editingStore ? 'Salvar Alterações' : 'Criar Loja'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: NEW / EDIT USER */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false)
          resetUserForm()
        }}
        title={editingUser ? 'Editar Usuário da Plataforma' : 'Cadastrar Novo Usuário'}
        description={
          editingUser
            ? `Edição dos dados cadastrais e permissões de ${editingUser.email}`
            : 'Adiciona um novo usuário ao sistema com credenciais de acesso'
        }
        maxWidth="md"
      >
        <form onSubmit={handleUserSubmit} className="space-y-3 pt-1">
          {errorMessage && (
            <div className="p-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Nome Completo *</label>
            <Input
              placeholder="Ex: João da Silva"
              value={userFormData.fullName}
              onChange={(e) => setUserFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              required
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">E-mail de Acesso *</label>
            <Input
              type="email"
              placeholder="joao@empresa.com"
              value={userFormData.email}
              disabled={Boolean(editingUser)}
              onChange={(e) => setUserFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Telefone</label>
            <Input
              placeholder="(11) 99999-9999"
              value={userFormData.phone}
              onChange={(e) => setUserFormData((prev) => ({ ...prev, phone: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          {!editingUser && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Senha Provisória (Opcional)</label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres (ou gerada automaticamente)"
                value={userFormData.password}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, password: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={userFormData.isGlobalAdmin}
                onChange={(e) => setUserFormData((prev) => ({ ...prev, isGlobalAdmin: e.target.checked }))}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <div>
                <div>Acesso Global Admin (Superusuário do Sistema)</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  Permite gerenciar todas as lojas, usuários e faturamento do sistema.
                </div>
              </div>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs"
              onClick={() => {
                setIsUserModalOpen(false)
                resetUserForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs font-semibold"
              isLoading={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: TRANSFER STORE OWNERSHIP */}
      <Modal
        isOpen={Boolean(transferModalStore)}
        onClose={() => {
          setTransferModalStore(null)
          setSelectedNewOwnerId('')
        }}
        title="Transferir Propriedade da Loja"
        description={`Selecione o usuário da plataforma que se tornará o Administrador Principal (STORE_ADMIN) da loja "${transferModalStore?.name}".`}
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
            Ao transferir a propriedade, o novo usuário terá controle total de administração sobre produtos, estoques, configurações e equipe da loja.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Novo Proprietário da Loja *</label>
            <select
              value={selectedNewOwnerId}
              onChange={(e) => setSelectedNewOwnerId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="">Selecione um usuário...</option>
              {allPlatformUsers?.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || 'Sem nome'} ({u.email}) {u.isGlobalAdmin ? '⭐ [Global Admin]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs"
              onClick={() => {
                setTransferModalStore(null)
                setSelectedNewOwnerId('')
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!selectedNewOwnerId}
              isLoading={transferOwnershipMutation.isPending}
              onClick={() => {
                if (transferModalStore && selectedNewOwnerId) {
                  transferOwnershipMutation.mutate({
                    storeId: transferModalStore.id,
                    newOwnerId: selectedNewOwnerId,
                  })
                }
              }}
              className="w-full sm:w-auto h-8 text-xs font-semibold"
            >
              Confirmar Transferência
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete User Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={() => {
          if (deletingUser) {
            deleteUserMutation.mutate(deletingUser.id)
            setDeletingUser(null)
          }
        }}
        title="Remover Usuário da Plataforma"
        description={`Tem certeza que deseja excluir o usuário "${deletingUser?.fullName || deletingUser?.email}"? Todos os acessos e vínculos com lojas serão revogados imediatamente.`}
        confirmText="Sim, Excluir Usuário"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteUserMutation.isPending}
      />

      {/* Confirm Toggle Store Status Modal */}
      <ConfirmModal
        isOpen={Boolean(togglingStore)}
        onClose={() => setTogglingStore(null)}
        onConfirm={() => {
          if (togglingStore) {
            toggleStoreStatusMutation.mutate({
              id: togglingStore.id,
              isActive: !togglingStore.is_active,
            })
            setTogglingStore(null)
          }
        }}
        title={togglingStore?.is_active ? 'Desativar Loja' : 'Ativar Loja'}
        description={
          togglingStore?.is_active
            ? `Tem certeza que deseja desativar a loja "${togglingStore?.name}"? Os usuários desta filial e seu catálogo público ficarão suspensos.`
            : `Deseja reativar as operações da loja "${togglingStore?.name}"?`
        }
        confirmText={togglingStore?.is_active ? 'Sim, Desativar' : 'Sim, Ativar'}
        cancelText="Cancelar"
        variant={togglingStore?.is_active ? 'danger' : 'primary'}
        isLoading={toggleStoreStatusMutation.isPending}
      />
    </div>
  )
}
