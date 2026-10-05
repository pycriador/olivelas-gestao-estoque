import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@/services/notificationService'
import type { StockAlertSummary } from '@/services/notificationService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDateTime } from '@/utils/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/common/PageHeader'
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Search,
  Clock,
  PackageX,
  TrendingUp,
} from 'lucide-react'

/** Cor e icone por tipo de alerta. */
const NOTIFICATION_TONE: Record<
  string,
  { icon: React.ReactNode; bg: string; fg: string }
> = {
  EXPIRING_7D: { icon: <AlertTriangle className="h-4 w-4" />, bg: 'bg-orange-500/10', fg: 'text-orange-500' },
  EXPIRING_30D: { icon: <Clock className="h-4 w-4" />, bg: 'bg-warning/10', fg: 'text-warning' },
  OUT_OF_STOCK: { icon: <PackageX className="h-4 w-4" />, bg: 'bg-danger/10', fg: 'text-danger' },
  LOW_STOCK: { icon: <AlertTriangle className="h-4 w-4" />, bg: 'bg-warning/10', fg: 'text-warning' },
  REORDER_SUGGESTED: { icon: <TrendingUp className="h-4 w-4" />, bg: 'bg-primary/10', fg: 'text-primary' },
}

export function NotificationsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

  const { page, pageSize, search, filters, setPage, setPageSize, setSearch, setFilter } =
    useTablePagination({
      defaultPageSize: 10,
      defaultSortBy: 'created_at',
      defaultSortOrder: 'desc',
      defaultFilters: {
        readStatus: 'ALL',
        type: 'ALL',
      },
    })

  const readStatusFilter = filters.readStatus || 'ALL'
  const typeFilter = filters.type || 'ALL'

  // Sincroniza os alertas automaticos de validade/estoque/reposicao. A RPC e
  // idempotente, entao rodar a cada visita mantem a lista coerente sem
  // duplicar nada.
  const [alertSummary, setAlertSummary] = React.useState<StockAlertSummary | null>(null)
  const [alertError, setAlertError] = React.useState('')
  const alertsSyncedFor = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!hasActiveStore) return
    if (alertsSyncedFor.current === storeId) return
    alertsSyncedFor.current = storeId

    let cancelled = false
    notificationService
      .generateStockAlerts(storeId)
      .then((summary) => {
        if (cancelled) return
        setAlertSummary(summary)
        queryClient.invalidateQueries({ queryKey: ['notifications', storeId] })
      })
      .catch((err: any) => {
        if (cancelled) return
        setAlertError(
          err?.message || 'Não foi possível atualizar os alertas automáticos.'
        )
      })

    return () => {
      cancelled = true
    }
  }, [storeId, hasActiveStore, queryClient])

  const { data, isLoading } = useQuery({
    queryKey: [
      'notifications',
      storeId,
      { search, readStatusFilter, typeFilter, page, pageSize },
    ],
    queryFn: () =>
      notificationService.listNotifications(storeId, {
        search: search || undefined,
        isRead:
          readStatusFilter === 'UNREAD' ? false : readStatusFilter === 'READ' ? true : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const notifications = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', storeId] })
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', storeId] })
    },
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Notificações & Alertas">
        <Input
          placeholder="Buscar título ou mensagem..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Count, Read status & Action) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalItems} {totalItems === 1 ? 'notificação' : 'notificações'}
          </Badge>
          {alertError && <span className="text-[11px] text-danger">{alertError}</span>}
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select
            value={typeFilter}
            onChange={(e) => {
              setFilter('type', e.target.value)
              setPage(1)
            }}
            aria-label="Filtrar por tipo"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todos os Alertas</option>
            <option value="EXPIRING_7D">Vencendo em até 7 dias</option>
            <option value="EXPIRING_30D">Vencendo em até 30 dias</option>
            <option value="OUT_OF_STOCK">Estoque zerado</option>
            <option value="LOW_STOCK">Estoque baixo</option>
            <option value="REORDER_SUGGESTED">Reposição sugerida</option>
          </select>

          <select
            value={readStatusFilter}
            onChange={(e) => setFilter('readStatus', e.target.value)}
            aria-label="Filtrar por leitura"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todas Notificações</option>
            <option value="UNREAD">Apenas Não Lidas</option>
            <option value="READ">Apenas Lidas</option>
          </select>

          {totalItems > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2.5"
              onClick={() => markAllMutation.mutate()}
              isLoading={markAllMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Resumo dos alertas automaticos */}
      {alertSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 flex-shrink-0">
          {(
            [
              {
                key: 'expiring7d',
                label: 'Vence em ≤ 7 dias',
                value: alertSummary.expiring7d,
                icon: AlertTriangle,
                tone: 'text-orange-500',
              },
              {
                key: 'expiring30d',
                label: 'Vence em ≤ 30 dias',
                value: alertSummary.expiring30d,
                icon: Clock,
                tone: 'text-warning',
              },
              {
                key: 'outOfStock',
                label: 'Estoque zerado',
                value: alertSummary.outOfStock,
                icon: PackageX,
                tone: 'text-danger',
              },
              {
                key: 'lowStock',
                label: 'Estoque baixo',
                value: alertSummary.lowStock,
                icon: AlertTriangle,
                tone: 'text-warning',
              },
              {
                key: 'reorder',
                label: 'Reposição sugerida',
                value: alertSummary.reorder,
                icon: TrendingUp,
                tone: 'text-primary',
              },
            ] as const
          ).map((card) => {
            const Icon = card.icon
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  const map: Record<string, string> = {
                    expiring7d: 'EXPIRING_7D',
                    expiring30d: 'EXPIRING_30D',
                    outOfStock: 'OUT_OF_STOCK',
                    lowStock: 'LOW_STOCK',
                    reorder: 'REORDER_SUGGESTED',
                  }
                  setFilter('type', map[card.key])
                  setPage(1)
                }}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <Icon className={`h-4 w-4 shrink-0 ${card.tone}`} />
                <div className="min-w-0">
                  <div className="font-extrabold text-sm font-mono text-foreground leading-none">
                    {card.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {card.label}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Notifications Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
              <div>
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                Nenhuma notificação encontrada no momento.
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/60 custom-scrollbar">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                    !n.is_read ? 'bg-primary/5' : 'hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        NOTIFICATION_TONE[n.type]?.bg || 'bg-primary/10'
                      } ${NOTIFICATION_TONE[n.type]?.fg || 'text-primary'}`}
                    >
                      {NOTIFICATION_TONE[n.type]?.icon || <Bell className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-xs text-foreground">{n.title}</h4>
                        {!n.is_read && <Badge variant="default" className="text-[9px] py-0 px-1.5">Nova</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-muted-foreground/80 font-mono block mt-1">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                  </div>

                  {!n.is_read && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 px-2.5 shrink-0 font-semibold"
                      onClick={() => markReadMutation.mutate(n.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Marcar lida
                    </Button>
                  )}
                </div>
              ))}
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
    </div>
  )
}
