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
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { useNavigate } from 'react-router-dom'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
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
  AlertTriangle,
  Edit3,
} from 'lucide-react'
import type { Order } from '@/types/order.types'
import type { OrderStatus } from '@/types/database.types'

export function OrdersPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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

  const [orderToEdit, setOrderToEdit] = React.useState<Order | null>(null)
  const [isEditingLoading, setIsEditingLoading] = React.useState(false)
  const [editError, setEditError] = React.useState<string | null>(null)

  const handleConfirmEditInPos = async (order: Order) => {
    setIsEditingLoading(true)
    setEditError(null)
    try {
      if (order.status !== 'CANCELLED') {
        try {
          await orderService.cancelOrder(order.id, `Reabertura para edição no PDV (${order.order_number})`)
        } catch (cancelErr: any) {
          const msg = String(cancelErr?.message || '')
          if (!msg.toLowerCase().includes('já foi cancelado')) {
            throw cancelErr
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products-pos', storeId] })

      const editData = {
        id: order.id,
        orderNumber: order.order_number,
        customerId: order.customer_id,
        customerName: order.customer_name,
        discountAmount: order.discount_amount,
        notes: order.notes,
        paymentMethod: order.payments?.[0]?.method || 'PIX',
        items: order.items?.map((it: any) => ({
          productId: it.product_id,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          discount: it.discount || 0,
          product: it.product,
        })),
      }

      setOrderToEdit(null)
      setViewingOrder(null)

      navigate(`/sales?editOrder=${order.id}`, {
        state: { editOrder: editData },
      })
    } catch (err) {
      setEditError(parseApiError(err))
    } finally {
      setIsEditingLoading(false)
    }
  }

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
    <div className="h-full flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title={t.orders.title}>
        <Input
          placeholder="Buscar pedido ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Count, Filters & Actions) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalItems} {totalItems === 1 ? 'pedido' : 'pedidos'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="Filtrar por status"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
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

          <select
            value={selectedChannel}
            onChange={(e) => setFilter('channel', e.target.value)}
            aria-label="Filtrar por canal"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todos os Canais</option>
            <option value="IN_STORE">Loja Física (PDV)</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="CATALOG">Catálogo Online</option>
          </select>

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={orders.length === 0} className="h-8 text-xs px-2.5">
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Orders Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
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
              <ResponsiveTable className="w-full text-xs text-left">
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
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingOrder(o)}
                            className="h-8 text-xs font-semibold px-2.5"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Detalhes
                          </Button>
                          {o.status !== 'CANCELLED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCancellingOrder(o)
                                setCancelReason('')
                                setCancelError(null)
                              }}
                              className="h-8 text-xs font-semibold px-2.5 text-danger hover:bg-danger/10 border-danger/30"
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ResponsiveTable>
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

            {/* Action Bar: Editar Pedido no PDV */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-primary/5 p-3 rounded-xl border border-primary/20">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-xs block">
                  Editar Pedido no PDV
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Reabra este pedido na tela de Venda para alterar itens (produtos, quantidades) e o cliente.
                </span>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setOrderToEdit(viewingOrder)}
                className="h-9 px-3.5 text-xs font-semibold gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar no PDV
              </Button>
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

      {/* Edit Order in POS Confirmation Modal */}
      <Modal
        isOpen={Boolean(orderToEdit)}
        onClose={() => {
          if (!isEditingLoading) {
            setOrderToEdit(null)
            setEditError(null)
          }
        }}
        title={`Editar Pedido ${orderToEdit?.order_number}`}
        description="Reabrir pedido para alteração de produtos, quantidades e cliente no PDV"
        maxWidth="md"
      >
        {orderToEdit && (
          <div className="space-y-3.5 pt-1">
            {editError && (
              <div className="p-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
                {editError}
              </div>
            )}

            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-foreground flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  Estorno de estoque e reabertura no PDV
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {orderToEdit.status !== 'CANCELLED'
                    ? `Ao confirmar, o pedido ${orderToEdit.order_number} terá seu estoque estornado de forma atômica e seus itens e cliente serão enviados para a tela de Venda (/sales), onde você poderá ajustar itens, pesos, quantidades e cliente.`
                    : `Os itens e o cliente do pedido ${orderToEdit.order_number} serão carregados no PDV (/sales) para nova edição e finalização.`}
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-foreground">{orderToEdit.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens:</span>
                <span className="font-semibold text-foreground">
                  {orderToEdit.items?.length || 0} produto(s)
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Total Original:</span>
                <span className="font-bold font-mono text-primary">
                  {formatCurrency(orderToEdit.total_amount)}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-9 text-xs"
                onClick={() => setOrderToEdit(null)}
                disabled={isEditingLoading}
              >
                Voltar
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto h-9 text-xs font-semibold shadow-xs gap-1.5"
                isLoading={isEditingLoading}
                onClick={() => handleConfirmEditInPos(orderToEdit)}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Confirmar e Abrir no PDV
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
