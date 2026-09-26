import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@/services/notificationService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDateTime } from '@/utils/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Bell, CheckCheck, AlertTriangle, Search } from 'lucide-react'

export function NotificationsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

  const {
    page,
    pageSize,
    search,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
  } = useTablePagination({
    defaultPageSize: 10,
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
  })

  const readStatusFilter = filters.readStatus || 'ALL'

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', storeId, { search, readStatusFilter, page, pageSize }],
    queryFn: () =>
      notificationService.listNotifications(storeId, {
        search: search || undefined,
        isRead: readStatusFilter === 'UNREAD' ? false : readStatusFilter === 'READ' ? true : undefined,
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
    <div className="flex-1 min-h-0 flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Notificações & Alertas
          </h1>
          <p className="text-xs text-muted-foreground">
            Avisos de estoque baixo, produtos a vencer e atualizações em tempo real
          </p>
        </div>

        {totalItems > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <Card className="flex-shrink-0">
        <CardContent className="p-3 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="flex-1 w-full relative">
            <Input
              placeholder="Buscar por título ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
              icon={<Search className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={readStatusFilter}
              onChange={(e) => setFilter('readStatus', e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="ALL">Todas as Notificações</option>
              <option value="UNREAD">Apenas Não Lidas</option>
              <option value="READ">Apenas Lidas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between flex-shrink-0">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Central de Avisos
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total de {totalItems} notificação(ões)
            </p>
          </div>
        </CardHeader>

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
                    <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5 shrink-0">
                      {n.type === 'LOW_STOCK' ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
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
                      variant="ghost"
                      size="sm"
                      className="text-[11px] h-7 shrink-0"
                      onClick={() => markReadMutation.mutate(n.id)}
                    >
                      Marcar lida
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
