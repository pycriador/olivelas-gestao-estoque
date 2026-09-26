import * as React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  ShoppingCart,
  Users,
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
  Search,
  ExternalLink,
  Calendar
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { usePermissions } from '@/hooks/usePermissions'
import { useRealtimeSubscriptions } from '@/hooks/useRealtime'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSelector } from '@/components/common/LanguageSelector'
import { GlobalCommandK } from '@/components/common/GlobalCommandK'
import { Badge } from '@/components/ui/badge'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [storeMenuOpen, setStoreMenuOpen] = React.useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userStores, signOut, isGlobalAdmin } = useAuth()
  const { storeId, storeName, storeSlug, role, setActiveStore } = useTenant()
  const { t } = useI18n()
  const { canManageStore } = usePermissions()

  // Realtime updates for stock, orders, and notifications
  useRealtimeSubscriptions(storeId)

  const navItems = [
    { label: t.nav.dashboard, path: '/dashboard', icon: LayoutDashboard },
    ...(isGlobalAdmin ? [{ label: t.nav.globalAdmin, path: '/global-admin', icon: Shield }] : []),
    { label: t.nav.products, path: '/products', icon: Package },
    { label: t.nav.inventory, path: '/inventory', icon: Layers },
    { label: t.nav.expiration, path: '/expiration', icon: Calendar },
    { label: t.nav.sales, path: '/sales', icon: ShoppingBag },
    { label: t.nav.orders, path: '/orders', icon: ShoppingCart },
    { label: t.nav.customers, path: '/customers', icon: Users },
    { label: t.nav.suppliers, path: '/suppliers', icon: Truck },
    { label: t.nav.purchases, path: '/purchases', icon: FileText },
    { label: t.nav.reports, path: '/reports', icon: FileText },
    { label: t.nav.notifications, path: '/notifications', icon: Bell },
    { label: t.nav.audit, path: '/audit', icon: Shield },
    { label: t.nav.settings, path: '/settings', icon: Settings },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-screen max-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
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
                Olivelas SaaS
              </h1>
              <span className="text-[10px] text-muted-foreground block font-mono">
                MULTI-LOJA ENTERPRISE
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
                Suas Lojas ({userStores.length})
              </div>
              {userStores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveStore(s)
                    setStoreMenuOpen(false)
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left ${
                    s.storeId === storeId
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="truncate">{s.storeName}</span>
                  <span className="text-[10px] opacity-75">{s.role}</span>
                </button>
              ))}

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
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
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
        <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick Search Button triggering Command+K */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
                window.dispatchEvent(event)
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border text-xs text-muted-foreground hover:border-primary/40 transition-colors w-64"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Buscar... (Ctrl + K)</span>
            </button>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2.5">
            <LanguageSelector />
            <ThemeToggle />
            <Link
              to="/notifications"
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground relative transition-colors"
              title="Notificações"
            >
              <Bell className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-4 sm:p-5 md:p-6 max-w-7xl w-full mx-auto flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
