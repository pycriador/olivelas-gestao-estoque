import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { storeService } from '@/services/storeService'
import { reportService } from '@/services/reportService'
import { userService } from '@/services/userService'
import { permissionGroupService } from '@/services/permissionGroupService'
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
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { GlobalDeletePanel } from '@/components/admin/GlobalDeletePanel'
import { GlobalBackupPanel } from '@/components/admin/GlobalBackupPanel'
import { GlobalDbExplorerPanel } from '@/components/admin/GlobalDbExplorerPanel'
import { GlobalApiKeyHbacPanel } from '@/components/admin/GlobalApiKeyHbacPanel'
import { DEFAULT_PERMISSION_MODULES } from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import {
  Store,
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
  HardDrive,
  Database,
  Sparkles,
  Sliders,
  CreditCard,
  Layers,
  Lock,
  UserCheck,
  GitBranch,
  CornerDownRight,
  DollarSign,
  Plus,
  UserPlus,
  Settings,
  Receipt,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import type { Store as StoreType } from '@/types/store.types'
import type { PlatformUser } from '@/types/user.types'

export type GlobalAdminTab =
  | 'stores'
  | 'users'
  | 'finance'
  | 'backups'
  | 'db-explorer'
  | 'api-hbac'
  | 'delete'

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

  const activeTab = (filters.tab as GlobalAdminTab) || 'stores'
  const statusFilter = filters.status || 'ALL'
  const userRoleFilter = filters.userRole || 'ALL'

  const selectTab = (tab: GlobalAdminTab) => {
    setSearchParams(
      () => {
        const next = new URLSearchParams()
        next.set('tab', tab)
        return next
      },
      { replace: true }
    )
  }

  // Confirmation & Transfer modals
  const [deletingUser, setDeletingUser] = React.useState<PlatformUser | null>(null)
  const [togglingStore, setTogglingStore] = React.useState<StoreType | null>(null)
  const [transferModalStore, setTransferModalStore] = React.useState<StoreType | null>(null)
  const [selectedNewOwnerId, setSelectedNewOwnerId] = React.useState('')

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Metrics
  const { data: globalMetrics } = useQuery({
    queryKey: ['global-admin-metrics'],
    queryFn: () => reportService.getGlobalAdminMetrics(),
  })

  // Full raw stores list for hierarchy, backups, db manager, and selectors
  const { data: allStoresRaw = [] } = useQuery({
    queryKey: ['all-stores-raw-list'],
    queryFn: () => storeService.listAllStores(),
  })

  // Billing rules & Store Employee Seat License Summaries
  const { data: billingRules } = useQuery({
    queryKey: ['platform-billing-rules'],
    queryFn: () => permissionGroupService.getPlatformBillingRules(),
  })

  const { data: licenseSummaries = [] } = useQuery({
    queryKey: ['stores-employee-license-summaries'],
    queryFn: () => permissionGroupService.getStoresEmployeeLicenseSummaries(),
  })

  const licenseMap = React.useMemo(() => {
    return new Map(licenseSummaries.map((s) => [s.storeId, s]))
  }, [licenseSummaries])

  // Stores Query
  const { data: storesData, isLoading: loadingStores } = useQuery({
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

  // Users Query — Excludes store employees (only STORE_ADMIN and GLOBAL_ADMIN pay/have commercial plans)
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
          userRoleFilter === 'GLOBAL_ADMIN'
            ? true
            : userRoleFilter === 'STANDARD'
              ? false
              : undefined,
        excludeStoreEmployees: true,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: activeTab === 'users' || activeTab === 'stores' || activeTab === 'finance',
  })

  // All users list for transfer modal dropdown and store admin mapping
  const { data: allPlatformUsers } = useQuery({
    queryKey: ['all-platform-users-list'],
    queryFn: () => userService.listPlatformUsers({ pageSize: 500, excludeStoreEmployees: true }),
    enabled: activeTab === 'stores' || Boolean(transferModalStore),
  })

  const rawStoreList = storesData?.data || []
  const totalStores = storesData?.total || 0

  // Map of Store ID -> STORE_ADMIN users
  const storeAdminsByStoreId = React.useMemo(() => {
    const map = new Map<string, PlatformUser[]>()
    const users = allPlatformUsers?.data || usersData?.data || []
    for (const u of users) {
      for (const st of u.stores) {
        if (st.role === 'STORE_ADMIN') {
          const list = map.get(st.storeId) || []
          if (!list.some((existing) => existing.id === u.id)) {
            list.push(u)
          }
          map.set(st.storeId, list)
        }
      }
    }
    return map
  }, [allPlatformUsers, usersData])

  // Map of Store ID -> Store Name for parent lookup
  const storeNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const s of allStoresRaw) {
      map.set(s.id, s.name)
    }
    for (const s of rawStoreList) {
      map.set(s.id, s.name)
    }
    return map
  }, [allStoresRaw, rawStoreList])

  // Organize stores hierarchically: Matriz followed immediately by its Filiais (indented child rows)
  const hierarchicalStoreList = React.useMemo(() => {
    // Combine rawStoreList with any child branches from allStoresRaw whose parent is in rawStoreList
    const byId = new Map<string, StoreType>()
    for (const st of rawStoreList) {
      byId.set(st.id, st)
    }
    if (!search.trim()) {
      for (const st of allStoresRaw) {
        if (st.parent_store_id && byId.has(st.parent_store_id) && !byId.has(st.id)) {
          if (
            statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && st.is_active) ||
            (statusFilter === 'INACTIVE' && !st.is_active)
          ) {
            byId.set(st.id, st)
          }
        }
      }
    }

    const combined = Array.from(byId.values())
    const idsInSet = new Set(combined.map((s) => s.id))

    const roots = combined.filter(
      (s) => (!s.is_branch && !s.parent_store_id) || !s.parent_store_id || !idsInSet.has(s.parent_store_id)
    )
    const childrenByParent = new Map<string, StoreType[]>()
    for (const s of combined) {
      if ((s.is_branch || s.parent_store_id) && s.parent_store_id && idsInSet.has(s.parent_store_id)) {
        const list = childrenByParent.get(s.parent_store_id) || []
        list.push(s)
        childrenByParent.set(s.parent_store_id, list)
      }
    }

    const result: Array<{ store: StoreType; isChildRow: boolean; childCount: number }> = []
    for (const root of roots) {
      const children = childrenByParent.get(root.id) || []
      result.push({ store: root, isChildRow: false, childCount: children.length })
      for (const child of children) {
        result.push({ store: child, isChildRow: true, childCount: 0 })
      }
    }
    return result
  }, [rawStoreList, allStoresRaw, search, statusFilter])

  const userList = usersData?.data || []
  const totalUsers = usersData?.total || 0

  const currentTotalItems = activeTab === 'stores' ? totalStores : totalUsers
  const currentTotalPages = Math.ceil(currentTotalItems / pageSize) || 1

  // Mutations
  const toggleStoreStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      storeService.updateStore(id, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
      queryClient.invalidateQueries({ queryKey: ['all-stores-raw-list'] })
      queryClient.invalidateQueries({ queryKey: ['global-admin-metrics'] })
      setSuccessMessage('Status da loja atualizado com sucesso!')
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
      queryClient.invalidateQueries({ queryKey: ['all-platform-users-list'] })
      setTransferModalStore(null)
      setSelectedNewOwnerId('')
      setSuccessMessage('Propriedade da loja transferida com sucesso!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

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

  const totalExtraSeatsCost = licenseSummaries.reduce(
    (acc, s) => acc + s.extraEmployeesMonthlyCost,
    0
  )
  const totalExtraSeatsCount = licenseSummaries.reduce(
    (acc, s) => acc + s.extraBillableEmployees,
    0
  )

  const activeSectionMeta = React.useMemo(() => {
    switch (activeTab) {
      case 'users':
        return {
          title: `Usuários Planos (${totalUsers})`,
          subtitle: 'Titulares de assinatura comercial (STORE_ADMIN) e Global Admins',
          icon: Users,
        }
      case 'finance':
        return {
          title: 'Central Financeira & Licenciamento',
          subtitle: 'Franquia de funcionários por loja, planos comerciais e faturamento',
          icon: DollarSign,
        }
      case 'backups':
        return {
          title: 'Backups & Exportação SQL',
          subtitle: 'Snapshots completos por loja ou instância global',
          icon: HardDrive,
        }
      case 'db-explorer':
        return {
          title: 'Explorador de Banco de Dados',
          subtitle: 'Inspeção e manutenção direta de registros (CRUD)',
          icon: Database,
        }
      case 'api-hbac':
        return {
          title: 'Chaves de API & Regras HBAC',
          subtitle: 'Controle de acesso baseado em host e credenciais externas',
          icon: Sparkles,
        }
      case 'delete':
        return {
          title: 'Exclusão Definitiva (Hard Delete)',
          subtitle: 'Remoção permanente de lojas, produtos ou registros órfãos',
          icon: Trash2,
        }
      case 'stores':
      default:
        return {
          title: `Lojas & Filiais (${globalMetrics?.totalStores ?? allStoresRaw.length})`,
          subtitle: 'Hierarquia de matrizes, filiais vinculadas e licenças de equipe',
          icon: Building2,
        }
    }
  }, [activeTab, totalUsers, globalMetrics?.totalStores, allStoresRaw.length])

  const ActiveSectionIcon = activeSectionMeta.icon

  return (
    <div className="space-y-3 pb-6 animate-in fade-in duration-150">
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
              ? 'Buscar matriz, filial, slug, CNPJ...'
              : activeTab === 'users'
                ? 'Buscar STORE_ADMIN, email...'
                : activeTab === 'finance'
                  ? 'Buscar loja ou regra financeira...'
                  : 'Buscar registro...'
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Flash Notifications */}
      {successMessage && (
        <div className="p-2.5 rounded-lg bg-success/15 border border-success/30 flex items-center justify-between text-xs text-foreground animate-in fade-in">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-muted-foreground hover:text-foreground font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-danger/15 border border-danger/30 flex items-center justify-between text-xs text-danger animate-in fade-in">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-danger hover:opacity-80 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Contextual Section Header & Action Toolbar (sem menu de abas na página) */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-card border border-border rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <ActiveSectionIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-foreground truncate">{activeSectionMeta.title}</h2>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              {activeSectionMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Section Filters + Unified "Ações Rápidas" Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          {activeTab === 'stores' && (
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
          )}

          {activeTab === 'users' && (
            <select
              value={userRoleFilter}
              onChange={(e) => setFilter('userRole', e.target.value)}
              aria-label="Filtrar tipo de usuário"
              className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="ALL">Todos (STORE_ADMIN & Global Admin)</option>
              <option value="GLOBAL_ADMIN">Apenas Global Admins</option>
              <option value="STANDARD">Apenas Administradores de Loja (STORE_ADMIN)</option>
            </select>
          )}

          {/* Unified Quick Actions Dropdown Menu across ALL tabs */}
          <DropdownMenu
            triggerLabel="Ações Rápidas"
            items={[
              {
                key: 'new-store',
                label: 'Cadastrar Nova Loja (Matriz)',
                icon: <Building2 className="h-3.5 w-3.5 text-primary" />,
                onSelect: () => navigate('/global-admin/stores/new'),
              },
              {
                key: 'new-branch',
                label: 'Cadastrar Nova Filial Vinculada',
                icon: <GitBranch className="h-3.5 w-3.5 text-amber-500" />,
                onSelect: () => {
                  const firstRoot = allStoresRaw.find((s) => !s.is_branch && !s.parent_store_id)
                  navigate(
                    firstRoot
                      ? `/global-admin/stores/new?parentStoreId=${firstRoot.id}`
                      : '/global-admin/stores/new'
                  )
                },
              },
              {
                key: 'new-user',
                label: 'Cadastrar Novo Usuário (STORE_ADMIN)',
                icon: <UserPlus className="h-3.5 w-3.5 text-blue-500" />,
                onSelect: () => navigate('/global-admin/users/new'),
              },
              {
                key: 'finance-rules',
                label: 'Regras Financeiras & Licenças (10 Grátis)',
                icon: <Settings className="h-3.5 w-3.5 text-emerald-500" />,
                onSelect: () => navigate('/global-admin/finance/rules'),
              },
              {
                key: 'finance-plans',
                label: 'Catálogo de Planos & Preços de Módulos',
                icon: <Layers className="h-3.5 w-3.5 text-indigo-500" />,
                onSelect: () => navigate('/global-admin/finance/plans'),
              },
              {
                key: 'finance-payments',
                label: 'Controle de Pagamentos & Faturas',
                icon: <Receipt className="h-3.5 w-3.5 text-emerald-600" />,
                onSelect: () => navigate('/global-admin/finance/payments'),
              },
              {
                key: 'backup-center',
                label: 'Central de Backup & Exportação SQL',
                icon: <HardDrive className="h-3.5 w-3.5 text-cyan-500" />,
                onSelect: () => selectTab('backups'),
              },
              {
                key: 'db-manager',
                label: 'Gerenciador de Banco (CRUD)',
                icon: <Database className="h-3.5 w-3.5 text-amber-500" />,
                onSelect: () => selectTab('db-explorer'),
              },
              {
                key: 'api-hbac-center',
                label: 'Configurar Chaves API & HBAC',
                icon: <Sparkles className="h-3.5 w-3.5 text-violet-500" />,
                onSelect: () => selectTab('api-hbac'),
              },
            ]}
          />
        </div>
      </div>

      {/* Global Compact Metrics Cards (nas abas Lojas e Usuários) */}
      {(activeTab === 'stores' || activeTab === 'users') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
          <Card className="p-2.5 sm:p-3 border border-border shadow-xs bg-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Matrizes & Filiais
              </span>
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-foreground mt-1">
              {globalMetrics?.totalStores ?? allStoresRaw.length}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {allStoresRaw.filter((s) => !s.is_branch && !s.parent_store_id).length} matrizes •{' '}
              {allStoresRaw.filter((s) => s.is_branch || Boolean(s.parent_store_id)).length} filiais
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
              {globalMetrics?.activeStores ?? allStoresRaw.filter((s) => s.is_active).length}
            </div>
            <div className="text-[10px] text-muted-foreground">Operando com catálogo ativo</div>
          </Card>

          <Card className="p-2.5 sm:p-3 border border-border shadow-xs bg-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Titulares de Plano (STORE_ADMIN)
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-foreground mt-1">{totalUsers}</div>
            <div className="text-[10px] text-muted-foreground">
              Funcionários isentos ({billingRules?.defaultFreeEmployeesPerStore ?? 10} grátis/loja)
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
            <div className="text-[10px] text-muted-foreground">Vendas acumuladas nas lojas</div>
          </Card>
        </div>
      )}

      {/* TAB 3: FINANCEIRO (DEDICATED HUB & STORE SEAT LICENSING TABLE) */}
      {activeTab === 'finance' && (
        <div className="space-y-3">
          {/* 3 Dedicated Full-Screen Finance Pages Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-xs hover:border-emerald-500/60 transition-all">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      Licenciamento & Regras
                    </Badge>
                    <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Regras Financeiras & Licenças por Loja
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Configure a franquia padrão de{' '}
                    <b className="text-foreground">
                      {billingRules?.defaultFreeEmployeesPerStore ?? 10} funcionários grátis por
                      loja
                    </b>{' '}
                    e a cobrança de{' '}
                    <b className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(billingRules?.defaultExtraEmployeePrice ?? 19.9)}
                    </b>{' '}
                    por licença adicional, além de exceções por loja e chave PIX.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/global-admin/finance/rules')}
                  className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Abrir Gestão de Regras & Licenças
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-primary/30 bg-primary/5 shadow-xs hover:border-primary/60 transition-all">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">
                      Planos & Módulos
                    </Badge>
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Catálogo de Planos & Valores de Telas
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Gerencie os grupos de permissão comerciais vendidos aos{' '}
                    <b className="text-foreground">STORE_ADMIN</b> e defina o valor mensal de cada
                    módulo (Estoque, PDV, Catálogo WhatsApp, Compras, Relatórios).
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/global-admin/finance/plans')}
                  className="w-full h-8 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
                >
                  Abrir Planos Comerciais & Preços
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-blue-500/30 bg-blue-500/5 shadow-xs hover:border-blue-500/60 transition-all">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-600 text-white text-[10px]">
                      Faturamento & Caixa
                    </Badge>
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Controle de Pagamentos & Histórico
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Acompanhe todas as faturas registradas, baixe pagamentos recebidos, filtre
                    inadimplentes e acesse a ficha financeira individual de cada{' '}
                    <b className="text-foreground">STORE_ADMIN</b>.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/global-admin/finance/payments')}
                  className="w-full h-8 text-xs font-semibold border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                >
                  Abrir Controle de Pagamentos
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Summary Strip of Employee Licensing Rule */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">
                Franquia Grátis Padrão
              </div>
              <div className="text-base font-extrabold text-foreground mt-0.5">
                {billingRules?.defaultFreeEmployeesPerStore ?? 10} funcionários / loja
              </div>
              <div className="text-[10px] text-muted-foreground">
                Funcionários dentro da cota não pagam plano
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">
                Taxa por Licença Adicional
              </div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(billingRules?.defaultExtraEmployeePrice ?? 19.9)} / usuário
              </div>
              <div className="text-[10px] text-muted-foreground">
                Cobrado a partir do {(billingRules?.defaultFreeEmployeesPerStore ?? 10) + 1}º
                funcionário ativo
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">
                Licenças Extras Ativas
              </div>
              <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {totalExtraSeatsCount} licenças adicionais
              </div>
              <div className="text-[10px] text-muted-foreground">
                Acima da franquia gratuita nas lojas
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">
                Receita Mensal de Licenças Extras
              </div>
              <div className="text-base font-extrabold text-primary mt-0.5">
                {formatCurrency(totalExtraSeatsCost)} / mês
              </div>
              <div className="text-[10px] text-muted-foreground">
                Somado à fatura do STORE_ADMIN titular
              </div>
            </div>
          </div>

          {/* Store Employee Licensing Table */}
          <Card className="border border-border shadow-xs bg-card overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Apuração de Licenças de Funcionários por Loja (Matriz & Filiais)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Cada loja possui {billingRules?.defaultFreeEmployeesPerStore ?? 10} funcionários
                  grátis. Licenças adicionais são cobradas no plano do Administrador da Loja.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/global-admin/finance/rules')}
                className="h-8 text-xs font-semibold"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar Limites & Preços por Loja
              </Button>
            </div>
            <CardContent className="p-0 overflow-x-auto">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="bg-muted/80 border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Loja (Matriz / Filial)</th>
                    <th className="py-2.5 px-4 text-center">Equipe Ativa</th>
                    <th className="py-2.5 px-4 text-center">Franquia Grátis</th>
                    <th className="py-2.5 px-4 text-center">Licenças Extras</th>
                    <th className="py-2.5 px-4 text-right">Valor por Extra</th>
                    <th className="py-2.5 px-4 text-right">Adicional Mensal</th>
                    <th className="py-2.5 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {licenseSummaries
                    .filter(
                      (s) =>
                        !search.trim() ||
                        s.storeName.toLowerCase().includes(search.toLowerCase()) ||
                        s.storeSlug.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((item) => (
                      <tr key={item.storeId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          <div
                            className={`flex items-center gap-2 ${
                              item.isBranch ? 'pl-5 border-l-2 border-primary/30 ml-1' : ''
                            }`}
                          >
                            {item.isBranch ? (
                              <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{item.storeName}</span>
                                <Badge
                                  variant={item.isBranch ? 'secondary' : 'outline'}
                                  className="text-[9px] px-1.5 py-0"
                                >
                                  {item.isBranch ? 'Filial' : 'Matriz'}
                                </Badge>
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                /store/{item.storeSlug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold">
                          {item.activeEmployeesCount} funcionários
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {item.activeEmployeesCount} / {item.freeEmployeesQuota} grátis
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {item.extraBillableEmployees > 0 ? (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]">
                              +{item.extraBillableEmployees} licença(s)
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Isento (Na Franquia)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {formatCurrency(item.extraEmployeeUnitPrice)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-foreground">
                          {item.extraEmployeesMonthlyCost > 0
                            ? formatCurrency(item.extraEmployeesMonthlyCost)
                            : 'R$ 0,00'}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <DropdownMenu
                            triggerLabel="Ações Rápidas"
                            items={[
                              {
                                key: 'edit-store-rules',
                                label: 'Configurar Franquia & Preço desta Loja',
                                icon: <Settings className="h-3.5 w-3.5 text-emerald-600" />,
                                onSelect: () => navigate('/global-admin/finance/rules'),
                              },
                              {
                                key: 'edit-store-full',
                                label: 'Editar Loja, Filiação & Equipe',
                                icon: <Edit2 className="h-3.5 w-3.5 text-primary" />,
                                onSelect: () =>
                                  navigate(`/global-admin/stores/${item.storeId}/edit`),
                              },
                              {
                                key: 'add-employee',
                                label: 'Cadastrar Funcionário na Loja',
                                icon: <UserPlus className="h-3.5 w-3.5 text-blue-500" />,
                                onSelect: () =>
                                  navigate(`/global-admin/stores/${item.storeId}/employees/new`),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </ResponsiveTable>
            </CardContent>
          </Card>
        </div>
      )}

      {/* OTHER TAB PANELS: SCROLLABLE VIEWPORT */}
      {activeTab !== 'stores' && activeTab !== 'users' && activeTab !== 'finance' && (
        <div className="space-y-4">
          {activeTab === 'backups' && <GlobalBackupPanel stores={allStoresRaw} />}
          {activeTab === 'db-explorer' && <GlobalDbExplorerPanel stores={allStoresRaw} />}
          {activeTab === 'api-hbac' && <GlobalApiKeyHbacPanel stores={allStoresRaw} />}
          {activeTab === 'delete' && <GlobalDeletePanel />}
        </div>
      )}

      {/* Main Table Card (Stores or Users Viewport) */}
      {(activeTab === 'stores' || activeTab === 'users') && (
        <Card className="border border-border shadow-xs bg-card overflow-hidden">
          <CardContent className="p-0">
            {/* TAB 1: STORES TABLE (HIERARCHICAL: MATRIZ -> FILIAIS) */}
            {activeTab === 'stores' &&
              (loadingStores ? (
                <div className="p-6">
                  <LoadingSkeleton count={5} className="h-10" />
                </div>
              ) : hierarchicalStoreList.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <EmptyState
                    icon={<Building2 className="h-10 w-10 text-primary" />}
                    title="Nenhuma loja encontrada"
                    description="Cadastre novas matrizes ou filiais vinculadas para gerenciar as instâncias do sistema."
                    actionLabel="Cadastrar Nova Loja"
                    onAction={() => navigate('/global-admin/stores/new')}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <ResponsiveTable className="w-full text-xs text-left">
                    <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                      <tr>
                        <SortableHeader
                          column="name"
                          label="Matriz / Filial (Hierarquia)"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={toggleSort}
                        />
                        <th className="py-2.5 px-4">Filiação & Código</th>
                        <th className="py-2.5 px-4">Usuários Admin (STORE_ADMIN)</th>
                        <th className="py-2.5 px-4 text-center">Licenças Equipe</th>
                        <SortableHeader
                          column="is_active"
                          label="Status"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={toggleSort}
                          className="text-center"
                        />
                        <th className="py-2.5 px-4 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {hierarchicalStoreList.map(({ store: st, isChildRow, childCount }) => {
                        const isBranch = Boolean(st.is_branch || st.parent_store_id)
                        const parentName = st.parent_store_id
                          ? storeNameById.get(st.parent_store_id) || 'Matriz Principal'
                          : null
                        const admins = storeAdminsByStoreId.get(st.id) || []
                        const lic = licenseMap.get(st.id)
                        const freeLimit =
                          lic?.freeEmployeesQuota ??
                          st.free_employees_limit ??
                          billingRules?.defaultFreeEmployeesPerStore ??
                          10
                        const activeSeats = lic?.activeEmployeesCount ?? 0
                        const extraSeats = lic?.extraBillableEmployees ?? 0

                        return (
                          <tr
                            key={st.id}
                            className={`hover:bg-muted/30 transition-colors ${
                              isChildRow ? 'bg-muted/15' : ''
                            }`}
                          >
                            {/* Col 1: Hierarchical Store Name */}
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              <div
                                className={`flex items-center gap-2.5 ${
                                  isChildRow
                                    ? 'pl-7 border-l-2 border-primary/40 ml-2.5'
                                    : ''
                                }`}
                              >
                                {isChildRow && (
                                  <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0 -ml-1" />
                                )}
                                <div
                                  className={`p-1.5 rounded-lg shrink-0 ${
                                    isBranch
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      : 'bg-primary/10 text-primary'
                                  }`}
                                >
                                  {isBranch ? (
                                    <GitBranch className="h-3.5 w-3.5" />
                                  ) : (
                                    <Building2 className="h-3.5 w-3.5" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Link
                                      to={`/global-admin/stores/${st.id}/edit`}
                                      className="hover:text-primary hover:underline font-bold"
                                    >
                                      {st.name}
                                    </Link>
                                    {st.branch_code && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted border border-border text-muted-foreground">
                                        {st.branch_code}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-normal">
                                    <Link
                                      to={`/store/${st.slug}`}
                                      target="_blank"
                                      className="font-mono text-primary hover:underline inline-flex items-center gap-0.5"
                                    >
                                      /store/{st.slug}
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </Link>
                                    {st.document && <span>• {st.document}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Col 2: Filiação (Matriz vs Filial) */}
                            <td className="py-2.5 px-4">
                              {isBranch ? (
                                <div className="space-y-0.5">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  >
                                    <GitBranch className="h-2.5 w-2.5" /> Filial Vinculada
                                  </Badge>
                                  {parentName && (
                                    <div className="text-[10px] text-muted-foreground">
                                      Matriz: <b className="text-foreground">{parentName}</b>
                                    </div>
                                  )}
                                  {st.manager_name && (
                                    <div className="text-[10px] text-muted-foreground">
                                      Gerente: {st.manager_name}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] gap-1 border-primary/30 bg-primary/5 text-primary"
                                  >
                                    <Building2 className="h-2.5 w-2.5" /> Loja Matriz
                                  </Badge>
                                  <div className="text-[10px] text-muted-foreground">
                                    {childCount > 0
                                      ? `${childCount} ${childCount === 1 ? 'filial vinculada abaixo' : 'filiais vinculadas abaixo'}`
                                      : 'Sem filiais subordinadas'}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Col 3: Store Admins */}
                            <td className="py-2.5 px-4">
                              {admins.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/global-admin/stores/${st.id}/edit`)}
                                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <UserPlus className="h-3 w-3" /> Vincular STORE_ADMIN
                                </button>
                              ) : (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {admins.map((adm) => (
                                    <Link
                                      key={adm.id}
                                      to={`/global-admin/users/${adm.id}/edit`}
                                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border border-primary/25 bg-primary/5 text-foreground hover:bg-primary/15 transition-colors font-medium"
                                      title={`Editar administrador ${adm.email}`}
                                    >
                                      <Shield className="h-2.5 w-2.5 text-primary" />
                                      <span>{adm.fullName || adm.email}</span>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Col 4: Employee Seat Quota (10 Free) */}
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-mono ${
                                    extraSeats > 0
                                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                      : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {activeSeats} / {freeLimit} grátis
                                </Badge>
                                {extraSeats > 0 && (
                                  <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                                    +{extraSeats} extra (
                                    {formatCurrency(lic?.extraEmployeesMonthlyCost ?? 0)}/mês)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Col 5: Status */}
                            <td className="py-2.5 px-4 text-center">
                              <Badge
                                variant={st.is_active ? 'success' : 'destructive'}
                                className="text-[10px] px-2 py-0.5"
                              >
                                {st.is_active ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </td>

                            {/* Col 6: All Actions Inside Dropdown */}
                            <td className="py-2.5 px-4 text-right">
                              <DropdownMenu
                                triggerLabel="Ações Rápidas"
                                items={[
                                  {
                                    key: 'edit-store-page',
                                    label: 'Editar Loja, Filiação & Admins (URL Própria)',
                                    icon: <Edit2 className="h-3.5 w-3.5 text-primary" />,
                                    onSelect: () =>
                                      navigate(`/global-admin/stores/${st.id}/edit`),
                                  },
                                  {
                                    key: 'add-store-employee',
                                    label: 'Cadastrar Funcionário na Loja (URL Própria)',
                                    icon: <UserPlus className="h-3.5 w-3.5 text-blue-500" />,
                                    onSelect: () =>
                                      navigate(`/global-admin/stores/${st.id}/employees/new`),
                                  },
                                  ...(!isBranch
                                    ? [
                                        {
                                          key: 'create-child-branch',
                                          label: 'Cadastrar Filial abaixo desta Matriz',
                                          icon: (
                                            <GitBranch className="h-3.5 w-3.5 text-amber-500" />
                                          ),
                                          onSelect: () =>
                                            navigate(
                                              `/global-admin/stores/new?parentStoreId=${st.id}`
                                            ),
                                        },
                                      ]
                                    : []),
                                  {
                                    key: 'enter-store',
                                    label: 'Acessar Painel Operacional da Loja',
                                    icon: <Eye className="h-3.5 w-3.5 text-emerald-500" />,
                                    onSelect: () => handleEnterStoreContext(st),
                                  },
                                  {
                                    key: 'store-licensing',
                                    label: 'Configurar Franquia de Funcionários (Financeiro)',
                                    icon: <DollarSign className="h-3.5 w-3.5 text-emerald-600" />,
                                    onSelect: () => navigate('/global-admin/finance/rules'),
                                  },
                                  {
                                    key: 'transfer',
                                    label: 'Transferir Propriedade (STORE_ADMIN)',
                                    icon: (
                                      <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" />
                                    ),
                                    onSelect: () => {
                                      setTransferModalStore(st)
                                      setSelectedNewOwnerId('')
                                    },
                                  },
                                  {
                                    key: 'view-public',
                                    label: 'Abrir Catálogo Público',
                                    icon: (
                                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                    ),
                                    onSelect: () => window.open(`/store/${st.slug}`, '_blank'),
                                  },
                                  {
                                    key: 'toggle-status',
                                    label: st.is_active ? 'Desativar Loja' : 'Ativar Loja',
                                    icon: <Power className="h-3.5 w-3.5" />,
                                    variant: st.is_active ? 'danger' : 'default',
                                    onSelect: () => setTogglingStore(st),
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
              ))}

            {/* TAB 2: PLATFORM USERS TABLE (ONLY STORE_ADMIN & GLOBAL_ADMIN) */}
            {activeTab === 'users' && (
              <>
                {/* Policy Banner explaining why employees are not listed here */}
                <div className="px-4 py-2 bg-primary/5 border-b border-border flex items-center justify-between gap-2 flex-wrap text-[11px]">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Exibindo apenas <b className="text-foreground">Administradores de Loja (STORE_ADMIN)</b> e{' '}
                      <b className="text-foreground">Global Admins</b> que possuem plano comercial. Funcionários operacionais da loja não pagam plano individual ({billingRules?.defaultFreeEmployeesPerStore ?? 10} grátis/loja) e são gerenciados dentro de cada loja.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/global-admin/finance/plans"
                      className="text-primary font-semibold hover:underline"
                    >
                      Planos & Valores →
                    </Link>
                    <Link
                      to="/global-admin/finance/rules"
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Regra 10 Funcionários Grátis →
                    </Link>
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="p-6">
                    <LoadingSkeleton count={5} className="h-10" />
                  </div>
                ) : usersQueryError ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-3 rounded-xl bg-destructive/10 text-destructive mb-3">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div className="font-semibold text-foreground text-sm">
                      Erro ao carregar titulares de planos
                    </div>
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
                      title="Nenhum Administrador de Loja encontrado"
                      description="Cadastre um novo STORE_ADMIN titular ou ajuste os filtros de busca."
                      actionLabel="Novo Usuário (STORE_ADMIN)"
                      onAction={() => navigate('/global-admin/users/new')}
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <ResponsiveTable className="w-full text-xs text-left">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                        <tr>
                          <SortableHeader
                            column="full_name"
                            label="Titular (STORE_ADMIN / Global)"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={toggleSort}
                          />
                          <SortableHeader
                            column="is_global_admin"
                            label="Tipo de Conta"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={toggleSort}
                            className="text-center"
                          />
                          <th className="py-2.5 px-4">Lojas Administradas</th>
                          <th className="py-2.5 px-4">Plano / Telas Liberadas</th>
                          <th className="py-2.5 px-4">Assinatura & Mensalidade</th>
                          <SortableHeader
                            column="created_at"
                            label="Cadastro em"
                            currentSortBy={sortBy}
                            currentSortOrder={sortOrder}
                            onSort={toggleSort}
                          />
                          <th className="py-2.5 px-4 text-right">Ações Rápidas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {userList.map((u) => {
                          const prof = u.permissionProfile
                          const totalModulesCount = DEFAULT_PERMISSION_MODULES.length
                          const enabledCount = prof?.enabledModules?.length ?? totalModulesCount
                          const hasStoreAdminStore = u.stores.some((s) => s.role === 'STORE_ADMIN')
                          const isRestricted =
                            !u.isGlobalAdmin &&
                            prof &&
                            enabledCount < totalModulesCount &&
                            (!hasStoreAdminStore || prof.enforceOverStoreAdmin)

                          const paymentStatusBadge = () => {
                            if (u.isGlobalAdmin) {
                              return (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 border-primary/30 text-primary"
                                >
                                  Superusuário
                                </Badge>
                              )
                            }
                            const st = prof?.paymentStatus || 'EXEMPT'
                            if (st === 'ACTIVE') {
                              return (
                                <Badge variant="success" className="text-[9px] px-1.5 py-0">
                                  Em Dia
                                </Badge>
                              )
                            }
                            if (st === 'TRIAL') {
                              return (
                                <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  Trial / Teste
                                </Badge>
                              )
                            }
                            if (st === 'PAST_DUE') {
                              return (
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                                  Em Atraso
                                </Badge>
                              )
                            }
                            if (st === 'SUSPENDED' || st === 'CANCELLED') {
                              return (
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                                  {st === 'SUSPENDED' ? 'Suspenso' : 'Cancelado'}
                                </Badge>
                              )
                            }
                            return (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 text-muted-foreground"
                              >
                                Isento / Cortesia
                              </Badge>
                            )
                          }

                          const firstStore = u.stores[0]
                          const fallbackStore = allStoresRaw[0]
                          const targetStoreId = firstStore?.storeId || fallbackStore?.id || ''

                          return (
                            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-foreground">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                    {u.fullName?.slice(0, 2) || u.email.slice(0, 2)}
                                  </div>
                                  <div>
                                    <Link
                                      to={`/global-admin/users/${u.id}/edit`}
                                      className="hover:text-primary hover:underline font-bold"
                                    >
                                      {u.fullName || 'Sem nome cadastrado'}
                                    </Link>
                                    <div className="text-[11px] text-muted-foreground font-normal">
                                      {u.email}
                                      {u.phone ? ` • ${u.phone}` : ''}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {u.isGlobalAdmin ? (
                                  <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-primary text-primary-foreground font-semibold shadow-xs">
                                    <Shield className="h-2.5 w-2.5" /> Global Admin
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                                  >
                                    STORE_ADMIN
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {u.stores.length === 0 ? (
                                    <span className="text-muted-foreground text-[11px]">
                                      Nenhuma loja vinculada
                                    </span>
                                  ) : (
                                    u.stores.map((st) => (
                                      <Link
                                        key={st.storeId}
                                        to={`/global-admin/stores/${st.storeId}/edit`}
                                        title="Abrir tela completa da loja e filiação"
                                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md gap-1 border border-primary/25 bg-primary/5 hover:bg-primary/15 transition-colors font-medium text-foreground"
                                      >
                                        <Building2 className="h-2.5 w-2.5 text-primary" />
                                        <span>{st.storeName}</span>
                                      </Link>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                {u.isGlobalAdmin ? (
                                  <div className="text-[11px] text-primary font-semibold">
                                    Irrestrito (Global Admin)
                                  </div>
                                ) : prof ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Link to={`/global-admin/users/${u.id}/permissions`}>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-2 py-0 font-semibold border-primary/30 bg-primary/5 text-foreground hover:bg-primary/15 cursor-pointer"
                                        >
                                          {prof.customPlanName ||
                                            prof.permissionGroup?.name ||
                                            'Personalizado Sob Medida'}
                                        </Badge>
                                      </Link>
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          isRestricted
                                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        }`}
                                      >
                                        {enabledCount}/{totalModulesCount} telas
                                      </span>
                                    </div>
                                    {hasStoreAdminStore && prof.enforceOverStoreAdmin && (
                                      <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                        <Lock className="h-2.5 w-2.5 shrink-0" /> Limita STORE_ADMIN
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="text-[11px] text-muted-foreground">
                                      Padrão Completo ({totalModulesCount}/{totalModulesCount}{' '}
                                      telas)
                                    </span>
                                    <div>
                                      <Link
                                        to={`/global-admin/users/${u.id}/permissions`}
                                        className="text-[10px] text-primary hover:underline font-medium"
                                      >
                                        Configurar telas & plano →
                                      </Link>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      to={`/global-admin/users/${u.id}/billing`}
                                      className="font-bold text-foreground text-xs hover:text-primary hover:underline"
                                    >
                                      {formatCurrency(prof?.agreedMonthlyValue ?? 0)}
                                    </Link>
                                    <span className="text-[10px] text-muted-foreground">/mês</span>
                                    {paymentStatusBadge()}
                                  </div>
                                  {prof?.nextDueDate && (
                                    <div className="text-[10px] text-muted-foreground">
                                      Venc.: {formatDate(prof.nextDueDate)}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                                {formatDateTime(u.createdAt)}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <DropdownMenu
                                  triggerLabel="Ações Rápidas"
                                  items={[
                                    {
                                      key: 'user-permissions-page',
                                      label: 'Permissões de Telas & Plano (URL Própria)',
                                      icon: <Sliders className="h-3.5 w-3.5 text-primary" />,
                                      onSelect: () =>
                                        navigate(`/global-admin/users/${u.id}/permissions`),
                                    },
                                    {
                                      key: 'user-billing-page',
                                      label: 'Controle de Pagamento & Faturas (URL Própria)',
                                      icon: <CreditCard className="h-3.5 w-3.5 text-emerald-500" />,
                                      onSelect: () =>
                                        navigate(`/global-admin/users/${u.id}/billing`),
                                    },
                                    {
                                      key: 'user-edit-page',
                                      label: 'Editar Conta & Lojas Vinculadas (URL Própria)',
                                      icon: <Edit2 className="h-3.5 w-3.5 text-blue-500" />,
                                      onSelect: () => navigate(`/global-admin/users/${u.id}/edit`),
                                    },
                                    ...(targetStoreId
                                      ? [
                                          {
                                            key: 'employee-role-page',
                                            label:
                                              'Papel na Loja & Aprovador de Baixa (URL Própria)',
                                            icon: (
                                              <UserCheck className="h-3.5 w-3.5 text-amber-500" />
                                            ),
                                            onSelect: () =>
                                              navigate(
                                                `/global-admin/stores/${targetStoreId}/employees/${u.id}`
                                              ),
                                          },
                                        ]
                                      : []),
                                    {
                                      key: 'reset-password',
                                      label: 'Enviar Link de Redefinição de Senha',
                                      icon: <KeyRound className="h-3.5 w-3.5 text-amber-500" />,
                                      onSelect: () => resetPasswordMutation.mutate(u.email),
                                    },
                                    {
                                      key: 'delete-user',
                                      label: 'Excluir Usuário da Plataforma',
                                      icon: <Trash2 className="h-3.5 w-3.5" />,
                                      variant: 'danger',
                                      onSelect: () => setDeletingUser(u),
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
              </>
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

      {/* MODAL: TRANSFER STORE OWNERSHIP */}
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
            Ao transferir a propriedade, o novo usuário terá controle total de administração sobre
            produtos, estoques, configurações e equipe da loja.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Novo Proprietário da Loja (STORE_ADMIN) *
            </label>
            <select
              value={selectedNewOwnerId}
              onChange={(e) => setSelectedNewOwnerId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="">Selecione um usuário...</option>
              {allPlatformUsers?.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || 'Sem nome'} ({u.email}){' '}
                  {u.isGlobalAdmin ? '⭐ [Global Admin]' : ''}
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
