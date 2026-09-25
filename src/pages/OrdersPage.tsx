import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orderService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/dates'
import { exportToCSV } from '@/utils/export'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  ShoppingCart,
  Search,
  Download,
  Eye,
  Ban,
  MessageCircle,
  Store,
  Globe,
  AlertCircle
} from 'lucide-react'
import type { Order } from '@/types/order.types'
import type { OrderStatus } from '@/types/database.types'

export function OrdersPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState('')
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL')
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null)
  const [cancellingOrder, setCancellingOrder] = React.useState<Order | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  const [cancelError, setCancelError] = React.useState<string | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', storeId],
    queryFn: () => orderService.listOrders(storeId),
    enabled: Boolean(hasActiveStore),
  })

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancelOrder(cancellingOrder!.id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setCancellingOrder(null)
      setCancelReason('')
    },
    onError: (err) => setCancelError(parseApiError(err)),
  })

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      if (viewingOrder) {
        setViewingOrder(null)
      }
    },
  })

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase())

    if (selectedStatus === 'ALL') return matchesSearch
    return matchesSearch && o.status === selectedStatus
  })

  const handleExportCSV = () => {
    if (orders.length === 0) return
    exportToCSV(
      'pedidos_vendas',
      orders,
      [
        { header: 'Nº Pedido', key: 'order_number' },
        { header: 'Canal', key: 'channel' },
        { header: 'Status', key: 'status' },
        { header: 'Cliente', key: (r) => r.customer_name || 'Consumidor Final' },
        { header: 'Data', key: (r) => formatDateTime(r.created_at) },
        { header: 'Valor Total', key: (r) => r.total_amount },
      ]
    )
  }

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'WHATSAPP':
        return (
          <Badge variant="success" className="gap-1 text-[10px]">
            <MessageCircle className="h-3 w-3" /> WhatsApp
          </Badge>
        )
      case 'CATALOG':
        return (
          <Badge variant="default" className="gap-1 text-[10px]">
            <Globe className="h-3 w-3" /> Catálogo
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Store className="h-3 w-3" /> Loja Física
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t.orders.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t.orders.subtitle}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={orders.length === 0}>
          <Download className="h-4 w-4 mr-1.5" /> Exportar Pedidos CSV
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              placeholder="Pesquisar por número do pedido ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDING">Pendentes</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="PROCESSING">Em Preparação</option>
              <option value="READY">Prontos</option>
              <option value="DELIVERED">Entregues</option>
              <option value="CANCELLED">Cancelados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={6} className="h-10" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum pedido encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Pedido</th>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {o.order_number}
                      </td>
                      <td className="py-3 px-4">{getChannelBadge(o.channel)}</td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {o.customer_name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatDateTime(o.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            o.status === 'CONFIRMED' || o.status === 'DELIVERED'
                              ? 'success'
                              : o.status === 'CANCELLED'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingOrder(o)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {o.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setCancellingOrder(o)
                                setCancelReason('')
                                setCancelError(null)
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-danger/15 hover:text-danger"
                              title="Cancelar Pedido e Estornar Estoque"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Modal
        isOpen={Boolean(viewingOrder)}
        onClose={() => setViewingOrder(null)}
        title={`Detalhes do Pedido ${viewingOrder?.order_number}`}
        description={`Emitido em ${formatDateTime(viewingOrder?.created_at)}`}
        maxWidth="lg"
      >
        {viewingOrder && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-xl">
              <div>
                <span className="text-muted-foreground block text-[11px]">Cliente</span>
                <span className="font-semibold text-foreground text-sm">
                  {viewingOrder.customer_name}
                </span>
                {viewingOrder.customer_phone && (
                  <span className="text-muted-foreground block">{viewingOrder.customer_phone}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Canal & Status</span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  {getChannelBadge(viewingOrder.channel)}
                  <Badge variant={viewingOrder.status === 'CANCELLED' ? 'destructive' : 'success'}>
                    {viewingOrder.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-bold mb-2 uppercase text-[11px] text-muted-foreground">
                Itens do Pedido
              </h4>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {viewingOrder.items?.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">{it.product_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {it.quantity}x a {formatCurrency(it.unit_price)}
                      </div>
                    </div>
                    <div className="font-bold font-mono text-foreground">
                      {formatCurrency(it.total_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-3 bg-surface-elevated rounded-xl border border-border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(viewingOrder.subtotal)}</span>
              </div>
              {viewingOrder.discount_amount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Desconto Aplicado</span>
                  <span className="font-mono">-{formatCurrency(viewingOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                <span>Total</span>
                <span className="font-mono text-primary">{formatCurrency(viewingOrder.total_amount)}</span>
              </div>
            </div>

            {/* Change Status Controls */}
            {viewingOrder.status !== 'CANCELLED' && (
              <div className="pt-2 flex items-center justify-between border-t border-border">
                <span className="text-muted-foreground font-medium">Alterar Status:</span>
                <div className="flex gap-1.5">
                  {['CONFIRMED', 'PROCESSING', 'READY', 'DELIVERED'].map((st) => (
                    <Button
                      key={st}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 px-2"
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: viewingOrder.id,
                          status: st as OrderStatus,
                        })
                      }
                    >
                      {st}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancellingOrder)}
        onClose={() => setCancellingOrder(null)}
        title="Cancelar Pedido e Reverter Estoque"
        description="Esta ação estornará os itens de volta ao saldo do estoque de forma atômica"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            cancelMutation.mutate()
          }}
          className="space-y-4 pt-2"
        >
          {cancelError && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {cancelError}
            </div>
          )}

          <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-danger shrink-0" />
            <span>
              Ao cancelar o pedido <b>{cancellingOrder?.order_number}</b>, todas as baixas de estoque efetuadas serão revertidas com registro de auditoria.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Motivo do Cancelamento *</label>
            <Input
              placeholder="Ex: Desistência do cliente ou erro de digitação"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancellingOrder(null)}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              isLoading={cancelMutation.isPending}
            >
              Confirmar Cancelamento & Estorno
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
