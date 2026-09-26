import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orderService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/dates'
import { exportToCSV } from '@/utils/export'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
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
  AlertCircle,
} from 'lucide-react'
import type { Order } from '@/types/order.types'
import type { OrderStatus } from '@/types/database.types'

export function OrdersPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

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
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
  })

  const selectedStatus = filters.status || 'ALL'
  const selectedChannel = filters.channel || 'ALL'

  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null)
  const [cancellingOrder, setCancellingOrder] = React.useState<Order | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  const [cancelError, setCancelError] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', storeId, { search, selectedStatus, selectedChannel, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      orderService.listOrders(storeId, {
        search: search || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        channel: selectedChannel !== 'ALL' ? selectedChannel : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const orders = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

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
    <div className="flex-1 min-h-0 flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t.orders.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t.orders.subtitle}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={orders.length === 0} className="h-9 text-xs">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar Pedidos CSV
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="flex-shrink-0">
        <CardContent className="p-3 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="flex-1 w-full relative">
            <Input
              placeholder="Buscar por número do pedido ou nome do cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
              icon={<Search className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setFilter('status', e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDING">Pendentes</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="PROCESSING">Em Separação</option>
              <option value="READY">Prontos</option>
              <option value="SHIPPED">Enviados</option>
              <option value="DELIVERED">Entregues</option>
              <option value="CANCELLED">Cancelados</option>
            </select>
          </div>

          <div className="w-full sm:w-44">
            <select
              value={selectedChannel}
              onChange={(e) => setFilter('channel', e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="ALL">Todos os Canais</option>
              <option value="IN_STORE">Loja Física (PDV)</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="CATALOG">Catálogo Online</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between flex-shrink-0">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Histórico de Pedidos
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total de {totalItems} pedido(s) registrado(s)
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
              <div>
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
                <div className="font-semibold text-foreground text-sm">Nenhum pedido encontrado</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Vendas realizadas pelo PDV ou catálogo público aparecerão listadas aqui.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="order_number"
                      label="Nº Pedido"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="created_at"
                      label="Data / Hora"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <SortableHeader
                      column="total_amount"
                      label="Total"
                      align="right"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-primary">{o.order_number}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{formatDateTime(o.created_at)}</td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {o.customer_name || 'Consumidor Final'}
                      </td>
                      <td className="py-2.5 px-4">{getChannelBadge(o.channel)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge
                          variant={
                            o.status === 'CANCELLED'
                              ? 'destructive'
                              : o.status === 'DELIVERED'
                              ? 'success'
                              : 'outline'
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
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
                              title="Cancelar Pedido"
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

      {/* Order Details Modal */}
      <Modal
        isOpen={Boolean(viewingOrder)}
        onClose={() => setViewingOrder(null)}
        title={`Detalhes do Pedido ${viewingOrder?.order_number}`}
        description={`Emitido em ${formatDateTime(viewingOrder?.created_at)}`}
        maxWidth="2xl"
      >
        {viewingOrder && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/50">
              <div>
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase">Cliente</span>
                <span className="font-semibold text-foreground text-sm">
                  {viewingOrder.customer_name}
                </span>
                {viewingOrder.customer_phone && (
                  <span className="text-muted-foreground block text-xs mt-0.5">{viewingOrder.customer_phone}</span>
                )}
              </div>
              <div className="sm:text-right">
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase">Canal & Status</span>
                <div className="flex items-center sm:justify-end gap-1.5 mt-1 flex-wrap">
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
                Itens do Pedido ({viewingOrder.items?.length || 0})
              </h4>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {viewingOrder.items?.map((it) => (
                  <div key={it.id} className="p-3 flex items-center justify-between bg-surface">
                    <div>
                      <div className="font-semibold text-foreground text-sm">{it.product_name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {it.quantity}x a {formatCurrency(it.unit_price)}
                      </div>
                    </div>
                    <div className="font-bold font-mono text-foreground text-sm">
                      {formatCurrency(it.total_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-3.5 bg-surface-elevated rounded-xl border border-border space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-medium">{formatCurrency(viewingOrder.subtotal)}</span>
              </div>
              {viewingOrder.discount_amount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Desconto Aplicado</span>
                  <span className="font-mono font-medium">-{formatCurrency(viewingOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-foreground pt-2 border-t border-border">
                <span>Total</span>
                <span className="font-mono text-primary">{formatCurrency(viewingOrder.total_amount)}</span>
              </div>
            </div>

            {/* Change Status Controls */}
            {viewingOrder.status !== 'CANCELLED' && (
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border">
                <span className="text-muted-foreground font-semibold text-xs">Alterar Status:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {['CONFIRMED', 'PROCESSING', 'READY', 'DELIVERED'].map((st) => (
                    <Button
                      key={st}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 px-2.5 flex-1 sm:flex-none"
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
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            cancelMutation.mutate()
          }}
          className="space-y-4 pt-1"
        >
          {cancelError && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {cancelError}
            </div>
          )}

          <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl text-xs text-foreground flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-danger shrink-0" />
            <span className="leading-relaxed">
              Ao cancelar o pedido <b>{cancellingOrder?.order_number}</b>, todas as baixas de estoque efetuadas serão revertidas com registro de auditoria.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Motivo do Cancelamento *</label>
            <Input
              placeholder="Ex: Desistência do cliente ou erro de digitação"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => setCancellingOrder(null)}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
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
