import * as React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { storeService } from '@/services/storeService'
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  ShoppingCart,
  Users,
  UserCheck,
  UserPlus,
  Truck,
  FileText,
  Bell,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Store as StoreIcon,
  ChevronDown,
  ExternalLink,
  Calendar,
  Tags,
  FolderTree,
  TrendingUp,
  BarChart3,
  Palette,
  Webhook,
  Building2,
  GitBranch,
  CornerDownRight,
  Search,
  DollarSign,
  Sliders,
  Sparkles,
  Receipt,
  FileSignature,
  HardDrive,
  Database,
  KeyRound,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatRoleLabel } from '@/constants/granularPermissions'
import { useTenant } from '@/hooks/useTenant'
import { formatStoreHierarchyName, type StoreUserMembership } from '@/types/auth.types'
import { usePermissions } from '@/hooks/usePermissions'
import { useI18n } from '@/hooks/useI18n'
import { useRealtimeSubscriptions } from '@/hooks/useRealtime'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { GlobalCommandK } from '@/components/common/GlobalCommandK'
import { EmployeePinResetModal } from '@/components/auth/EmployeePinResetModal'
import { AiStoreCopilotDrawer } from '@/components/ai/AiStoreCopilotDrawer'
import { Badge } from '@/components/ui/badge'
import { applyStoreTheme, getStoreThemeId } from '@/lib/storeThemes'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [storeMenuOpen, setStoreMenuOpen] = React.useState(false)
  const [storeSearchQuery, setStoreSearchQuery] = React.useState('')
  const [mobileExpandedGroup, setMobileExpandedGroup] = React.useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userStores, signOut, isGlobalAdmin } = useAuth()
  const { storeId, storeName, storeSlug, role, activeStore, setActiveStore } = useTenant()
  const { hasRouteAccess } = usePermissions()
  const { t } = useI18n()

  // Realtime updates for stock, orders, and notifications
  useRealtimeSubscriptions(storeId)

  const { data: activeStoreProfile } = useQuery({
    queryKey: ['store-settings', storeId],
    queryFn: () => storeService.getStoreById(storeId),
    enabled: Boolean(storeId && storeId !== 'all'),
  })

  React.useEffect(() => {
    applyStoreTheme(getStoreThemeId(activeStoreProfile?.theme_config))
  }, [storeId, activeStoreProfile?.theme_config])

  // Fetch all stores for Global Admin switcher
  const { data: allStores = [] } = useQuery({
    queryKey: ['all-stores-switcher'],
    queryFn: () => storeService.listAllStores(),
    enabled: Boolean(isGlobalAdmin),
  })

  // Build enriched & hierarchically ordered stores list (Matriz -> Filiais)
  const { availableStoresToSwitch, storeGroupsForSwitcher, activeStoreResolved } = React.useMemo(() => {
    const rawItems: StoreUserMembership[] = isGlobalAdmin
      ? (() => {
          const nameById = new Map(allStores.map((st) => [st.id, st.name]))
          return allStores.map((st) => {
            const parentId = st.parent_store_id || null
            const isBranch = Boolean(st.is_branch || parentId)
            return {
              id: st.id,
              storeId: st.id,
              storeName: st.name,
              storeSlug: st.slug,
              role: 'STORE_ADMIN' as const,
              isActive: st.is_active,
              isBranch,
              parentStoreId: parentId,
              parentStoreName: parentId ? nameById.get(parentId) || null : null,
              branchCode: st.branch_code || null,
            }
          })
        })()
      : (() => {
          const nameById = new Map(userStores.map((st) => [st.storeId, st.storeName]))
          return userStores.map((st) => ({
            ...st,
            parentStoreName:
              st.parentStoreName ||
              (st.parentStoreId ? nameById.get(st.parentStoreId) || null : null),
          }))
        })()

    const idSet = new Set(rawItems.map((item) => item.storeId))
    const roots = rawItems
      .filter((item) => !item.isBranch || !item.parentStoreId || !idSet.has(item.parentStoreId))
      .sort((a, b) => a.storeName.localeCompare(b.storeName, 'pt-BR', { numeric: true }))

    const childrenByParent = new Map<string, StoreUserMembership[]>()
    for (const item of rawItems) {
      if (item.isBranch && item.parentStoreId && idSet.has(item.parentStoreId)) {
        const list = childrenByParent.get(item.parentStoreId) || []
        list.push(item)
        childrenByParent.set(item.parentStoreId, list)
      }
    }

    const ordered: StoreUserMembership[] = []
    const groups: Array<{ root: StoreUserMembership; branches: StoreUserMembership[] }> = []

    for (const root of roots) {
      const branches = (childrenByParent.get(root.storeId) || []).sort((a, b) =>
        a.storeName.localeCompare(b.storeName, 'pt-BR', { numeric: true })
      )
      ordered.push(root, ...branches)
      groups.push({ root, branches })
    }

    const resolvedActive =
      ordered.find((s) => s.storeId === storeId) ||
      (activeStore
        ? {
            ...activeStore,
            isBranch: Boolean(
              activeStore.isBranch ||
                activeStore.parentStoreId ||
                activeStoreProfile?.is_branch ||
                activeStoreProfile?.parent_store_id
            ),
            parentStoreId:
              activeStore.parentStoreId || activeStoreProfile?.parent_store_id || null,
            branchCode: activeStore.branchCode || activeStoreProfile?.branch_code || null,
          }
        : null)

    return {
      availableStoresToSwitch: ordered,
      storeGroupsForSwitcher: groups,
      activeStoreResolved: resolvedActive,
    }
  }, [isGlobalAdmin, allStores, userStores, storeId, activeStore, activeStoreProfile])

  // Filter store groups by search query inside the switcher dropdown
  const filteredStoreGroups = React.useMemo(() => {
    const q = storeSearchQuery
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    if (!q) return storeGroupsForSwitcher

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    return storeGroupsForSwitcher
      .map(({ root, branches }) => {
        const rootMatches =
          normalize(root.storeName).includes(q) || normalize(root.storeSlug).includes(q)
        if (rootMatches) {
          return { root, branches }
        }
        const matchingBranches = branches.filter(
          (b) =>
            normalize(b.storeName).includes(q) ||
            normalize(formatStoreHierarchyName(b)).includes(q) ||
            normalize(b.storeSlug).includes(q) ||
            (b.branchCode && normalize(b.branchCode).includes(q))
        )
        if (matchingBranches.length > 0) {
          return { root, branches: matchingBranches }
        }
        return null
      })
      .filter((g): g is { root: StoreUserMembership; branches: StoreUserMembership[] } => g !== null)
  }, [storeGroupsForSwitcher, storeSearchQuery])

  const activeStoreHeaderTitle = activeStoreResolved
    ? formatStoreHierarchyName(activeStoreResolved)
    : storeName
  const isActiveStoreBranch = Boolean(
    activeStoreResolved?.isBranch || activeStoreResolved?.parentStoreId
  )
  const activeRootBranchesCount =
    !isActiveStoreBranch && activeStoreResolved
      ? storeGroupsForSwitcher.find((g) => g.root.storeId === activeStoreResolved.storeId)
          ?.branches.length || 0
      : 0

  type NavItem = { label: string; path: string; icon: LucideIcon }
  type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] }

  const isNavItemActive = (itemPath: string): boolean => {
    const [targetPath, targetSearch] = itemPath.split('?')
    if (targetSearch) {
      if (location.pathname === targetPath && location.search === `?${targetSearch}`) {
        return true
      }
      if (itemPath === '/global-admin?tab=stores') {
        if (location.pathname === '/global-admin' && !location.search) {
          return true
        }
        if (
          location.pathname.startsWith('/global-admin/stores/') &&
          location.pathname !== '/global-admin/stores/new'
        ) {
          return true
        }
      }
      if (
        itemPath === '/global-admin?tab=users' &&
        location.pathname.startsWith('/global-admin/users/') &&
        location.pathname !== '/global-admin/users/new'
      ) {
        return true
      }
      return false
    }
    if (itemPath === '/global-admin/ai') {
      return (
        location.pathname === '/global-admin/ai' ||
        location.pathname.startsWith('/global-admin/ai/')
      )
    }
    if (itemPath === '/team') {
      return (
        location.pathname === '/team' ||
        (location.pathname.startsWith('/team/') && location.pathname !== '/team/new')
      )
    }
    return location.pathname === itemPath
  }

  const topNavItems: NavItem[] = [
    { label: t.nav.dashboard, path: '/dashboard', icon: LayoutDashboard },
    { label: 'Copiloto IA da Loja', path: '/ai-copilot', icon: Sparkles },
  ]

  // "Compras" fica so em Controle para nao duplicar o mesmo link.
  const rawNavGroups: NavGroup[] = [
    ...(isGlobalAdmin
      ? [
          {
            id: 'global-admin',
            label: t.nav.groupGlobalAdmin,
            icon: Shield,
            items: [
              { label: 'Central de IA & Chaves API', path: '/global-admin/ai', icon: Sparkles },
              { label: t.nav.globalStores, path: '/global-admin?tab=stores', icon: Building2 },
              { label: t.nav.globalNewStore, path: '/global-admin/stores/new', icon: GitBranch },
              { label: t.nav.globalUsers, path: '/global-admin?tab=users', icon: Users },
              { label: t.nav.globalNewUser, path: '/global-admin/users/new', icon: UserPlus },
              { label: t.nav.globalFinanceHub, path: '/global-admin?tab=finance', icon: DollarSign },
              { label: t.nav.globalFinanceRules, path: '/global-admin/finance/rules', icon: Sliders },
              { label: t.nav.globalFinancePlans, path: '/global-admin/finance/plans', icon: Sparkles },
              { label: t.nav.globalFinancePayments, path: '/global-admin/finance/payments', icon: Receipt },
              { label: t.nav.globalContracts, path: '/global-admin/contracts', icon: FileSignature },
              { label: t.nav.globalBackups, path: '/global-admin?tab=backups', icon: HardDrive },
              { label: t.nav.globalDbExplorer, path: '/global-admin?tab=db-explorer', icon: Database },
              { label: t.nav.globalApiHbac, path: '/global-admin?tab=api-hbac', icon: KeyRound },
              { label: t.nav.globalDelete, path: '/global-admin?tab=delete', icon: Trash2 },
            ],
          },
        ]
      : []),
    {
      id: 'registry',
      label: t.nav.groupRegistry,
      icon: FolderTree,
      items: [
        { label: t.nav.products, path: '/products', icon: Package },
        { label: t.nav.categories, path: '/categories', icon: Tags },
        { label: t.nav.customers, path: '/customers', icon: Users },
        { label: t.nav.suppliers, path: '/suppliers', icon: Truck },
      ],
    },
    {
      id: 'control',
      label: t.nav.groupControl,
      icon: Layers,
      items: [
        { label: t.nav.inventory, path: '/inventory', icon: Layers },
        { label: t.nav.expiration, path: '/expiration', icon: Calendar },
        { label: t.nav.purchases, path: '/purchases', icon: FileText },
      ],
    },
    {
      id: 'management',
      label: t.nav.groupManagement,
      icon: TrendingUp,
      items: [
        { label: t.nav.orders, path: '/orders', icon: ShoppingCart },
        { label: t.nav.reports, path: '/reports', icon: BarChart3 },
        { label: t.nav.stores, path: '/stores', icon: GitBranch },
        { label: t.nav.team, path: '/team', icon: UserCheck },
        { label: t.nav.newEmployee, path: '/team/new', icon: UserPlus },
      ],
    },
  ]

  const navGroups: NavGroup[] = rawNavGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => hasRouteAccess(item.path)),
    }))
    .filter((g) => g.items.length > 0)

  const rawBottomNavItems: NavItem[] = [
    { label: t.nav.sales, path: '/sales', icon: ShoppingBag },
    { label: t.nav.integrations, path: '/integrations', icon: Webhook },
    { label: t.nav.notifications, path: '/notifications', icon: Bell },
    { label: t.nav.audit, path: '/audit', icon: Shield },
    { label: t.nav.settings, path: '/settings', icon: Settings },
  ]

  const bottomNavItems: NavItem[] = rawBottomNavItems.filter((item) => hasRouteAccess(item.path))

  const activeNavGroup = navGroups.find((group) =>
    group.items.some((item) => isNavItemActive(item.path)),
  )
  const openMobileGroup = mobileExpandedGroup ?? activeNavGroup?.id ?? null

  const closeMobileNavigation = () => {
    setSidebarOpen(false)
    setMobileExpandedGroup(null)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-dvh max-h-dvh bg-background flex flex-col md:flex-row overflow-hidden">
      <GlobalCommandK />
      <EmployeePinResetModal />

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
              O
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-sidebar-foreground">
                Olivelas Gestão
              </h1>
              <span className="text-[10px] text-muted-foreground block font-mono">
                ESTOQUE & VENDAS
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tenant Selector */}
        <div className="p-3 border-b border-sidebar-border relative">
          <button
            onClick={() => setStoreMenuOpen(!storeMenuOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-sidebar-accent/60 hover:bg-sidebar-accent transition-colors text-left border border-border/40"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isActiveStoreBranch
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {isActiveStoreBranch ? (
                  <GitBranch className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className="text-xs font-bold text-sidebar-foreground truncate"
                  title={activeStoreHeaderTitle}
                >
                  {activeStoreHeaderTitle}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap mt-0.5">
                  <Badge
                    variant={isActiveStoreBranch ? 'secondary' : 'outline'}
                    className={`text-[9px] px-1.5 py-0 ${
                      isActiveStoreBranch
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        : 'border-primary/30 text-primary bg-primary/5'
                    }`}
                  >
                    {isActiveStoreBranch
                      ? `Filial${activeStoreResolved?.branchCode ? ` • ${activeStoreResolved.branchCode}` : ''}`
                      : activeRootBranchesCount > 0
                        ? `Matriz • ${activeRootBranchesCount} filiais`
                        : 'Matriz'}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {formatRoleLabel(role)}
                  </Badge>
                </div>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground shrink-0 ml-1 transition-transform ${
                storeMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Store switcher dropdown (Hierárquico: Matriz -> Filiais) */}
          {storeMenuOpen && (
            <div className="absolute top-full left-2 right-2 mt-1.5 bg-surface border border-border rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {isGlobalAdmin
                    ? `Matrizes & Filiais (${availableStoresToSwitch.length})`
                    : `Suas Lojas (${availableStoresToSwitch.length})`}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {storeGroupsForSwitcher.length}{' '}
                  {storeGroupsForSwitcher.length === 1 ? 'rede' : 'redes'}
                </span>
              </div>

              {availableStoresToSwitch.length > 3 && (
                <div className="relative px-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    placeholder="Buscar matriz ou filial..."
                    className="w-full h-7 pl-7 pr-2 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                {filteredStoreGroups.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Nenhuma loja ou filial encontrada.
                  </div>
                ) : (
                  filteredStoreGroups.map(({ root, branches }) => {
                    const isRootSelected = root.storeId === storeId
                    const isRootReallyBranch = Boolean(root.isBranch || root.parentStoreId)

                    return (
                      <div
                        key={root.id}
                        className="rounded-lg border border-border/60 bg-muted/15 p-1 space-y-1"
                      >
                        {/* Linha da Loja Matriz */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveStore(root)
                            setStoreMenuOpen(false)
                            setStoreSearchQuery('')
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                            isRootSelected
                              ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isRootSelected ? 'text-primary-foreground' : 'text-primary'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-bold">
                                {isRootReallyBranch ? formatStoreHierarchyName(root) : root.storeName}
                              </div>
                              <div
                                className={`text-[10px] truncate ${
                                  isRootSelected
                                    ? 'text-primary-foreground/80'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {isRootReallyBranch
                                  ? `Filial • /store/${root.storeSlug}`
                                  : branches.length > 0
                                    ? `Loja Matriz • ${branches.length} ${branches.length === 1 ? 'filial vinculada' : 'filiais vinculadas'}`
                                    : `Loja Matriz • /store/${root.storeSlug}`}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ml-1.5 ${
                              isRootSelected
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {isRootReallyBranch ? 'Filial' : 'Matriz'}
                          </span>
                        </button>

                        {/* Árvore de Filiais Vinculadas à Matriz */}
                        {branches.length > 0 && (
                          <div className="ml-2.5 pl-2 border-l-2 border-primary/30 space-y-0.5 pb-0.5">
                            {branches.map((branch) => {
                              const isBranchSelected = branch.storeId === storeId
                              const branchFullTitle = formatStoreHierarchyName(branch)

                              return (
                                <button
                                  key={branch.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveStore(branch)
                                    setStoreMenuOpen(false)
                                    setStoreSearchQuery('')
                                  }}
                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer ${
                                    isBranchSelected
                                      ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                      : 'hover:bg-muted/80 text-foreground'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <CornerDownRight
                                      className={`h-3 w-3 shrink-0 ${
                                        isBranchSelected
                                          ? 'text-primary-foreground'
                                          : 'text-primary/70'
                                      }`}
                                    />
                                    <GitBranch
                                      className={`h-3 w-3 shrink-0 ${
                                        isBranchSelected
                                          ? 'text-primary-foreground'
                                          : 'text-amber-500'
                                      }`}
                                    />
                                    <div className="min-w-0">
                                      <div className="truncate font-semibold" title={branchFullTitle}>
                                        {branchFullTitle}
                                      </div>
                                    </div>
                                  </div>
                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 ml-1 ${
                                      isBranchSelected
                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                    }`}
                                  >
                                    {branch.branchCode || 'Filial'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {isGlobalAdmin && (
                <Link
                  to="/stores"
                  onClick={() => {
                    setStoreMenuOpen(false)
                    setStoreSearchQuery('')
                  }}
                  className="block p-2 text-center text-xs font-semibold text-primary hover:bg-muted rounded-lg transition-colors border-t border-border mt-1"
                >
                  + Gerenciar Todas as Lojas & Filiais
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {topNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileNavigation}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            )
          })}

          {/* Navigation groups */}
          <div className="pt-2 space-y-1">
            {navGroups.map((group) => {
              const GroupIcon = group.icon

              return (
                <section key={group.id}>
                  <div className="hidden md:flex w-full items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
                    <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{group.label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileExpandedGroup(openMobileGroup === group.id ? '' : group.id)}
                    aria-expanded={openMobileGroup === group.id}
                    aria-controls={`nav-group-${group.id}`}
                    className="md:hidden w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70"
                  >
                    <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openMobileGroup === group.id ? 'rotate-180' : ''}`} />
                  </button>

                  <div
                    id={`nav-group-${group.id}`}
                    className={`${openMobileGroup === group.id ? 'block' : 'hidden'} md:block mt-0.5 space-y-0.5 pl-3 ml-3 border-l border-sidebar-border`}
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = isNavItemActive(item.path)
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={closeMobileNavigation}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          <div className="space-y-1 pt-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileNavigation}
                  className={`flex min-w-0 items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-medium transition-all md:gap-3 md:px-3 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Store Public Catalog Link */}
        {storeSlug && storeSlug !== 'global' && (
          <div className="p-3 border-t border-sidebar-border">
            <Link
              to={`/store/${storeSlug}`}
              target="_blank"
              className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated hover:bg-muted text-[11px] font-medium text-primary border border-border/50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <StoreIcon className="h-3.5 w-3.5" />
                Catálogo Público
              </span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* User Footer Profile */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
              {user?.fullName?.slice(0, 2) || user?.email?.slice(0, 2) || 'US'}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.fullName || user?.email}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t.auth.logout}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-danger/15 hover:text-danger transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="min-h-12 border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 z-30 px-3 py-1.5 sm:px-4 flex flex-wrap items-center justify-between gap-2 md:gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted shrink-0"
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Dedicated Page Header Slot (Title + Page Search) */}
            <div id="page-header-slot" className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0" />
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            <AiStoreCopilotDrawer />
            <LanguageSelector />
            <Link
              to="/settings#theme"
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Escolher tema da loja"
              aria-label="Escolher tema da loja"
            >
              <Palette className="h-4 w-4" />
            </Link>
            <Link
              to="/notifications"
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground relative transition-colors"
              title="Notificações"
            >
              <Bell className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar p-2.5 sm:p-3 md:p-4 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
