import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Clock,
  PackageX,
  Users,
  Package,
  Plus,
  ArrowUpRight,
  Store,
  Layers,
  ShoppingBag
} from 'lucide-react'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { reportService } from '@/services/reportService'
import { orderService } from '@/services/orderService'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'

export function DashboardPage() {
  const { storeId, storeName, hasActiveStore } = useTenant()
  const { t } = useI18n()

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['dashboard-metrics', storeId],
    queryFn: () => reportService.getDashboardMetrics(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: recentOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['recent-orders', storeId],
    queryFn: () => orderService.listOrders(storeId),
    enabled: Boolean(hasActiveStore),
  })

  if (!hasActiveStore) {
    return (
      <div className="p-8 text-center space-y-4">
        <Store className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Nenhuma loja selecionada</h2>
        <p className="text-sm text-muted-foreground">
          Crie ou selecione uma loja para começar a gerenciar seus produtos e vendas.
        </p>
        <Link to="/stores">
          <Button variant="default">Gerenciar Lojas</Button>
        </Link>
      </div>
    )
  }

  const cards = [
    {
      title: t.dashboard.salesToday,
      value: formatCurrency(metrics?.salesTodayTotal ?? 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: t.dashboard.salesMonth,
      value: formatCurrency(metrics?.salesMonthTotal ?? 0),
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: t.dashboard.pendingOrders,
      value: metrics?.pendingOrdersCount ?? 0,
      icon: ShoppingCart,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      title: t.dashboard.lowStockAlerts,
      value: metrics?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      badge: (metrics?.lowStockCount ?? 0) > 0 ? 'Atenção' : undefined,
    },
    {
      title: t.dashboard.expiringAlerts,
      value: metrics?.expiring30dCount ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-600/10',
    },
    {
      title: t.dashboard.expiredAlerts,
      value: metrics?.expiredCount ?? 0,
      icon: PackageX,
      color: 'text-danger',
      bg: 'bg-danger/10',
      badge: (metrics?.expiredCount ?? 0) > 0 ? 'Crítico' : undefined,
    },
    {
      title: t.dashboard.activeCustomers,
      value: metrics?.customersCount ?? 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: t.dashboard.totalProducts,
      value: metrics?.productsCount ?? 0,
      icon: Package,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Painel da Loja
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Visão geral em tempo real de <span className="font-semibold text-foreground">{storeName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/sales">
            <Button variant="default" size="sm" className="shadow-md shadow-primary/20">
              <ShoppingBag className="h-4 w-4 mr-1.5" /> Nova Venda (PDV)
            </Button>
          </Link>
          <Link to="/products">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      {loadingMetrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingSkeleton count={8} className="h-28" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c, idx) => {
            const Icon = c.icon
            return (
              <Card key={idx} className="relative overflow-hidden hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.title}
                  </span>
                  <div className={`p-2 rounded-xl ${c.bg} ${c.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="text-2xl font-extrabold tracking-tight text-foreground">
                    {c.value}
                  </div>
                  {c.badge && (
                    <Badge variant="destructive" className="mt-2 text-[10px] py-0 px-2">
                      {c.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recent Orders and Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Últimos Pedidos & Vendas</CardTitle>
              <span className="text-xs text-muted-foreground">
                Movimentação comercial recente
              </span>
            </div>
            <Link to="/orders" className="text-xs text-primary hover:underline flex items-center font-medium">
              Ver todos <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <LoadingSkeleton count={4} className="h-12" />
            ) : !recentOrders || recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum pedido realizado ainda. Realize sua primeira venda no PDV!
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{order.order_number}</span>
                        <Badge
                          variant={
                            order.status === 'CONFIRMED' || order.status === 'DELIVERED'
                              ? 'success'
                              : order.status === 'CANCELLED'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="text-[10px] py-0"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {order.customer_name} • {formatDate(order.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-foreground">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">{order.channel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Operations Hub */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Atalhos Operacionais</CardTitle>
            <span className="text-xs text-muted-foreground">
              Ações frequentes do dia a dia
            </span>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link
              to="/sales"
              className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-medium text-xs"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Abrir Frente de Caixa (PDV)</span>
            </Link>

            <Link
              to="/inventory"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated hover:bg-muted text-foreground transition-colors font-medium text-xs border border-border"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>Lançar Entrada / Ajuste de Estoque</span>
            </Link>

            <Link
              to="/expiration"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated hover:bg-muted text-foreground transition-colors font-medium text-xs border border-border"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Conferir Lotes & Validades</span>
            </Link>

            <Link
              to="/reports"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated hover:bg-muted text-foreground transition-colors font-medium text-xs border border-border"
            >
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>Exportar Relatório de Vendas (CSV)</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
