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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useRealtimeSubscriptions } from '@/hooks/useRealtime'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { GlobalCommandK } from '@/components/common/GlobalCommandK'
import { Badge } from '@/components/ui/badge'
import { applyStoreTheme, getStoreThemeId } from '@/lib/storeThemes'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [storeMenuOpen, setStoreMenuOpen] = React.useState(false)
  const [mobileExpandedGroup, setMobileExpandedGroup] = React.useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userStores, signOut, isGlobalAdmin } = useAuth()
  const { storeId, storeName, storeSlug, role, setActiveStore } = useTenant()
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

  const availableStoresToSwitch = isGlobalAdmin
    ? allStores.map((st) => ({
        id: st.id,
        storeId: st.id,
        storeName: st.name,
        storeSlug: st.slug,
        role: 'STORE_ADMIN' as const,
        isActive: st.is_active,
      }))
    : userStores

  type NavItem = { label: string; path: string; icon: LucideIcon }
  type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] }

  const topNavItems: NavItem[] = [
    { label: t.nav.dashboard, path: '/dashboard', icon: LayoutDashboard },
    ...(isGlobalAdmin
      ? [{ label: t.nav.globalAdmin, path: '/global-admin', icon: Shield }]
      : []),
  ]

  // "Compras" fica so em Controle para nao duplicar o mesmo link.
  const navGroups: NavGroup[] = [
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
        { label: t.nav.team, path: '/team', icon: UserCheck },
      ],
    },
  ]

  const bottomNavItems: NavItem[] = [
    { label: t.nav.sales, path: '/sales', icon: ShoppingBag },
    { label: t.nav.notifications, path: '/notifications', icon: Bell },
    { label: t.nav.audit, path: '/audit', icon: Shield },
    { label: t.nav.settings, path: '/settings', icon: Settings },
  ]

  const activeNavGroup = navGroups.find((group) =>
    group.items.some((item) => item.path === location.pathname),
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
            <div className="flex items-center gap-2.5 truncate">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <StoreIcon className="h-4 w-4" />
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-sidebar-foreground truncate">
                  {storeName}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {role}
                  </Badge>
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>

          {/* Store switcher dropdown */}
          {storeMenuOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase">
                {isGlobalAdmin ? `Todas as Lojas (${availableStoresToSwitch.length})` : `Suas Lojas (${availableStoresToSwitch.length})`}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                {availableStoresToSwitch.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveStore(s)
                      setStoreMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      s.storeId === storeId
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate font-semibold">{s.storeName}</span>
                    <span className="text-[10px] opacity-75 shrink-0 ml-1">{s.role}</span>
                  </button>
                ))}
              </div>

              {isGlobalAdmin && (
                <Link
                  to="/stores"
                  onClick={() => setStoreMenuOpen(false)}
                  className="block p-2 text-center text-xs font-medium text-primary hover:bg-muted rounded-lg transition-colors border-t border-border mt-1"
                >
                  + Gerenciar Todas as Lojas
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
                      const isActive = location.pathname === item.path
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
        <header className="min-h-12 border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 z-30 px-3 py-2 sm:px-4 flex flex-col gap-2 md:h-12 md:flex-row md:items-center md:justify-between md:gap-3 md:py-0">
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
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
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
        <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-2.5 sm:p-3 md:p-3.5 w-full flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
