import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@/services/notificationService'
import { useTenant } from '@/hooks/useTenant'
import { formatDateTime } from '@/utils/dates'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCheck, AlertTriangle, PackageCheck } from 'lucide-react'

export function NotificationsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', storeId],
    queryFn: () => notificationService.listNotifications(storeId),
    enabled: Boolean(hasActiveStore),
  })

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
    <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Notificações & Alertas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Avisos de estoque baixo, produtos a vencer e atualizações em tempo real
          </p>
        </div>

        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-border/60">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              Nenhuma notificação nova no momento.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  !n.is_read ? 'bg-primary/5' : 'hover:bg-muted/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
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
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground/80 font-mono block mt-1">
                      {formatDateTime(n.created_at)}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7"
                    onClick={() => markReadMutation.mutate(n.id)}
                  >
                    Marcar lida
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
