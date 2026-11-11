import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orderService'
import { storeService } from '@/services/storeService'
import { useTenant } from '@/hooks/useTenant'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/dates'
import { exportToCSV } from '@/utils/export'
import { parseApiError } from '@/utils/errorHandler'
import {
  buildOperatorToCustomerWhatsAppText,
  buildOperatorToCustomerWhatsAppUrl,
  buildOrderTrackingUrl,
  CUSTOMIZABLE_ORDER_STATUSES,
  DEFAULT_ORDER_STATUS_LABELS,
  extractStatusAliasesFromThemeConfig,
  getOrderStatusBadgeVariant,
  getStoreOrderStatusLabels,
} from '@/utils/orderStatusConfig'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { useNavigate } from 'react-router-dom'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import { toast } from 'sonner'
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
  Sliders,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Save,
  CheckCircle2,
  Package,
  Truck,
  Clock,
  Sparkles,
  RefreshCw,
  History,
  UserCheck,
  ArrowRight,
} from 'lucide-react'
import type { Order } from '@/types/order.types'
import type { OrderStatus } from '@/types/database.types'
import type { OrderStatusAliasesMap } from '@/types/store.types'

export function OrdersPage() {
  const { storeId, storeName, storeSlug, hasActiveStore } = useTenant()
  const { user: currentUser } = useAuth()
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

  // Personalização de Status ("Apelidos")
  const [isStatusAliasesModalOpen, setIsStatusAliasesModalOpen] = React.useState(false)
  const [draftAliases, setDraftAliases] = React.useState<OrderStatusAliasesMap>({})

  // Controles de envio de WhatsApp para o cliente e página em tempo real
  const [notifyCustomerOnStatusChange, setNotifyCustomerOnStatusChange] = React.useState(true)
  const [overrideCustomerPhone, setOverrideCustomerPhone] = React.useState('')
  const [copiedTrackingId, setCopiedTrackingId] = React.useState<string | null>(null)

  // Busca configurações da loja ativa (para ler e salvar apelidos de status em theme_config)
  const { data: activeStoreData } = useQuery({
    queryKey: ['store-settings', storeId],
    queryFn: () => storeService.getStoreById(storeId),
    enabled: Boolean(hasActiveStore && storeId && storeId !== 'all'),
  })

  const resolvedStoreName = activeStoreData?.name || storeName || 'Loja'
  const resolvedStoreSlug = activeStoreData?.slug || storeSlug || ''

  const statusLabels = React.useMemo(
    () => getStoreOrderStatusLabels(activeStoreData?.theme_config, storeId),
    [activeStoreData?.theme_config, storeId]
  )

  // Inicializa rascunho dos apelidos ao abrir o modal
  const handleOpenStatusAliasesModal = () => {
    const currentCustom = extractStatusAliasesFromThemeConfig(
      activeStoreData?.theme_config,
      storeId
    )
    const initialDraft: OrderStatusAliasesMap = {}
    CUSTOMIZABLE_ORDER_STATUSES.forEach((st) => {
      initialDraft[st.code] = currentCustom[st.code] || DEFAULT_ORDER_STATUS_LABELS[st.code]
    })
    setDraftAliases(initialDraft)
    setIsStatusAliasesModalOpen(true)
  }

  const saveStatusAliasesMutation = useMutation({
    mutationFn: (aliases: OrderStatusAliasesMap) =>
      storeService.updateStoreOrderStatusAliases(storeId, aliases),
    onSuccess: (updatedStore) => {
      if (updatedStore) {
        queryClient.setQueryData(['store-settings', storeId], updatedStore)
      }
      queryClient.invalidateQueries({ queryKey: ['store-settings', storeId] })
      if (resolvedStoreSlug) {
        queryClient.invalidateQueries({ queryKey: ['public-store', resolvedStoreSlug] })
      }
      setIsStatusAliasesModalOpen(false)
      toast.success('Apelidos dos status salvos com sucesso para esta loja!')
    },
    onError: (err) => {
      toast.error(parseApiError(err))
    },
  })

  React.useEffect(() => {
    if (viewingOrder) {
      setOverrideCustomerPhone(viewingOrder.customer_phone || '')
    }
  }, [viewingOrder?.id, viewingOrder?.customer_phone])

  const handleOpenWhatsAppForOrder = (
    order: Order,
    statusOverride?: OrderStatus,
    phoneOverride?: string
  ) => {
    const effectiveStatus = statusOverride || order.status
    const effectiveLabel = statusLabels[effectiveStatus] || effectiveStatus
    const phoneToUse =
      phoneOverride !== undefined ? phoneOverride : order.customer_phone || ''

    const waUrl = buildOperatorToCustomerWhatsAppUrl({
      customerPhone: phoneToUse,
      customerName: order.customer_name,
      storeName: resolvedStoreName,
      storeSlug: resolvedStoreSlug,
      orderId: order.id,
      orderNumber: order.order_number,
      status: effectiveStatus,
      statusLabel: effectiveLabel,
      totalAmount: order.total_amount,
      cancellationReason: order.cancellation_reason,
    })

    window.open(waUrl, '_blank')
  }

  const handleCopyTrackingUrl = async (order: Order) => {
    const url = buildOrderTrackingUrl(order.id, resolvedStoreSlug)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedTrackingId(order.id)
      toast.success('Link da página de status em tempo real copiado!')
      setTimeout(() => setCopiedTrackingId(null), 2500)
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

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

  const [isForceRefreshing, setIsForceRefreshing] = React.useState(false)

  const {
    data,
    isLoading,
    isFetching: isFetchingOrders,
    refetch: refetchOrders,
  } = useQuery({
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
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const {
    data: orderStatusHistory = [],
    isLoading: isLoadingOrderHistory,
    refetch: refetchOrderHistory,
  } = useQuery({
    queryKey: ['order-status-history', viewingOrder?.id, viewingOrder?.status],
    queryFn: () => orderService.getOrderStatusHistory(viewingOrder!.id, viewingOrder),
    enabled: Boolean(viewingOrder?.id),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const handleForceRefreshFromDb = async () => {
    if (!hasActiveStore || isForceRefreshing) return
    setIsForceRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      const freshListResult = await refetchOrders({ cancelRefetch: true })

      if (viewingOrder?.id) {
        const freshOrder = await orderService.getOrder(viewingOrder.id).catch(() => null)
        if (freshOrder) {
          setViewingOrder(freshOrder)
        } else if (freshListResult.data?.data) {
          const matchedInList = freshListResult.data.data.find((o) => o.id === viewingOrder.id)
          if (matchedInList) setViewingOrder(matchedInList)
        }
        await queryClient.invalidateQueries({
          queryKey: ['order-status-history', viewingOrder.id],
        })
        await refetchOrderHistory({ cancelRefetch: true })
      }

      toast.success('Pedidos e histórico recarregados diretamente do banco de dados!')
    } catch (err) {
      toast.error(parseApiError(err))
    } finally {
      setIsForceRefreshing(false)
    }
  }

  const orders = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancelOrder(cancellingOrder!.id, cancelReason),
    onSuccess: () => {
      const cancelledId = cancellingOrder?.id
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      if (cancelledId) {
        queryClient.invalidateQueries({ queryKey: ['order-status-history', cancelledId] })
      }
      if (viewingOrder && viewingOrder.id === cancelledId) {
        setViewingOrder({
          ...viewingOrder,
          status: 'CANCELLED',
          cancellation_reason: cancelReason,
          cancelled_at: new Date().toISOString(),
        })
      }
      setCancellingOrder(null)
      setCancelReason('')
      toast.success('Pedido cancelado e estoque estornado.')
    },
    onError: (err) => setCancelError(parseApiError(err)),
  })

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateOrderStatus(id, status),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['public-order-tracking', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['order-status-history', variables.id] })

      const newLabel = statusLabels[variables.status] || variables.status
      const actorLabel = currentUser?.fullName || currentUser?.email || 'Operador'
      toast.success(`Status alterado para "${newLabel}" (registrado por ${actorLabel})!`)

      if (viewingOrder && viewingOrder.id === variables.id) {
        const updatedViewing: Order = {
          ...viewingOrder,
          status: variables.status,
          updated_at: new Date().toISOString(),
        }
        setViewingOrder(updatedViewing)

        if (notifyCustomerOnStatusChange) {
          handleOpenWhatsAppForOrder(
            updatedViewing,
            variables.status,
            overrideCustomerPhone || updatedViewing.customer_phone
          )
        }
      }
    },
    onError: (err) => {
      toast.error(parseApiError(err))
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
        { header: 'Status (Sistema)', key: 'status' },
        { header: 'Status (Apelido)', key: (r) => statusLabels[r.status] || r.status },
        { header: 'Cliente', key: (r) => r.customer_name || 'Consumidor Final' },
        { header: 'WhatsApp Cliente', key: (r) => r.customer_phone || '' },
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
            <Globe className="h-3 w-3" /> Catálogo Online
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

  // Lista de status disponíveis para seleção no Dropdown Menu (incluindo Finalizado / COMPLETED)
  const selectableStatuses: Array<{
    code: OrderStatus
    icon: React.ReactNode
  }> = [
    { code: 'PENDING', icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" /> },
    { code: 'CONFIRMED', icon: <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" /> },
    { code: 'PROCESSING', icon: <Package className="h-3.5 w-3.5 text-amber-500" /> },
    { code: 'READY', icon: <ShoppingCart className="h-3.5 w-3.5 text-primary" /> },
    { code: 'SHIPPED', icon: <Truck className="h-3.5 w-3.5 text-primary" /> },
    { code: 'DELIVERED', icon: <Truck className="h-3.5 w-3.5 text-emerald-500" /> },
    { code: 'COMPLETED', icon: <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> },
  ]

  const buildStatusDropdownItems = (order: Order): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = selectableStatuses.map((st) => {
      const label = statusLabels[st.code] || st.code
      const isCurrent = order.status === st.code
      return {
        key: `status-${st.code}`,
        label: `${isCurrent ? '✓ ' : ''}${label} (${st.code})`,
        icon: st.icon,
        disabled: isCurrent || updateStatusMutation.isPending,
        onSelect: () => {
          updateStatusMutation.mutate({
            id: order.id,
            status: st.code,
          })
        },
      }
    })

    if (order.status !== 'CANCELLED') {
      items.push({
        key: 'status-CANCELLED',
        label: `${statusLabels.CANCELLED} (CANCELLED)`,
        icon: <Ban className="h-3.5 w-3.5" />,
        variant: 'danger',
        onSelect: () => {
          setCancellingOrder(order)
          setCancelReason('')
          setCancelError(null)
        },
      })
    }

    return items
  }

  const buildRowActionDropdownItems = (order: Order): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [
      {
        key: 'view-details',
        label: 'Ver Detalhes do Pedido',
        icon: <Eye className="h-3.5 w-3.5 text-primary" />,
        onSelect: () => setViewingOrder(order),
      },
    ]

    if (order.status !== 'CANCELLED' && order.status !== 'COMPLETED') {
      items.push({
        key: 'mark-completed',
        label: `Marcar como ${statusLabels.COMPLETED} (Finalizado)`,
        icon: <Sparkles className="h-3.5 w-3.5 text-emerald-600" />,
        onSelect: () =>
          updateStatusMutation.mutate({
            id: order.id,
            status: 'COMPLETED',
          }),
      })
    }

    if (order.status !== 'CANCELLED') {
      ;(['CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED'] as OrderStatus[]).forEach(
        (st) => {
          if (order.status !== st) {
            items.push({
              key: `quick-status-${st}`,
              label: `Mudar Status: ${statusLabels[st]} (${st})`,
              icon: <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />,
              onSelect: () =>
                updateStatusMutation.mutate({
                  id: order.id,
                  status: st,
                }),
            })
          }
        }
      )
    }

    items.push(
      {
        key: 'notify-whatsapp',
        label: `Avisar Cliente no WhatsApp (${statusLabels[order.status] || order.status})`,
        icon: <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />,
        onSelect: () => handleOpenWhatsAppForOrder(order),
      },
      {
        key: 'copy-tracking',
        label: 'Copiar Link de Status em Tempo Real',
        icon: <Copy className="h-3.5 w-3.5 text-muted-foreground" />,
        onSelect: () => handleCopyTrackingUrl(order),
      },
      {
        key: 'open-tracking',
        label: 'Abrir Página em Tempo Real',
        icon: <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />,
        onSelect: () =>
          window.open(buildOrderTrackingUrl(order.id, resolvedStoreSlug), '_blank'),
      },
      {
        key: 'edit-pos',
        label: 'Editar Pedido no PDV',
        icon: <Edit3 className="h-3.5 w-3.5 text-primary" />,
        onSelect: () => setOrderToEdit(order),
      }
    )

    if (order.status !== 'CANCELLED') {
      items.push({
        key: 'cancel-order',
        label: 'Cancelar Pedido & Estornar Estoque',
        icon: <Ban className="h-3.5 w-3.5" />,
        variant: 'danger',
        onSelect: () => {
          setCancellingOrder(order)
          setCancelReason('')
          setCancelError(null)
        },
      })
    }

    return items
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

      {/* Page Toolbar (Count, Forced Refresh, Status Customization, Filters & Actions) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalItems} {totalItems === 1 ? 'pedido' : 'pedidos'}
          </Badge>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleForceRefreshFromDb}
            disabled={isForceRefreshing || isFetchingOrders}
            title="Recarregar dados diretamente do banco de dados (Desktop e Mobile)"
            aria-label="Atualização forçada do banco de dados"
            className="h-8 text-xs px-2.5 gap-1.5 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isForceRefreshing || isFetchingOrders ? 'animate-spin' : ''
              }`}
            />
            <span>Atualizar do Banco</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenStatusAliasesModal}
            className="h-8 text-xs px-2.5 gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Personalizar Status</span>
            <span className="xs:hidden">Apelidos</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="Filtrar por status"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDING">{statusLabels.PENDING} (PENDING)</option>
            <option value="CONFIRMED">{statusLabels.CONFIRMED} (CONFIRMED)</option>
            <option value="PROCESSING">{statusLabels.PROCESSING} (PROCESSING)</option>
            <option value="READY">{statusLabels.READY} (READY)</option>
            <option value="SHIPPED">{statusLabels.SHIPPED} (SHIPPED)</option>
            <option value="DELIVERED">{statusLabels.DELIVERED} (DELIVERED)</option>
            <option value="COMPLETED">{statusLabels.COMPLETED} (COMPLETED)</option>
            <option value="CANCELLED">{statusLabels.CANCELLED} (CANCELLED)</option>
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="h-8 text-xs px-2.5"
          >
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
                  {orders.map((o) => {
                    const statusAlias = statusLabels[o.status] || o.status
                    return (
                      <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-semibold text-primary">
                          {o.order_number}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {formatDateTime(o.created_at)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-foreground">
                            {o.customer_name || 'Consumidor Final'}
                          </div>
                          {o.customer_phone && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {o.customer_phone}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4">{getChannelBadge(o.channel)}</td>
                        <td className="py-2.5 px-4 text-center">
                          <DropdownMenu
                            triggerLabel={statusAlias}
                            showChevron
                            align="right"
                            items={buildStatusDropdownItems(o)}
                            buttonClassName={
                              o.status === 'COMPLETED'
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold'
                                : o.status === 'DELIVERED'
                                ? 'border-primary/40 bg-primary/10 text-primary font-bold'
                                : o.status === 'CANCELLED'
                                ? 'border-danger/40 bg-danger/10 text-danger font-bold'
                                : 'border-border bg-surface text-foreground'
                            }
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                          {formatCurrency(o.total_amount)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <DropdownMenu
                              triggerLabel="Opções"
                              showChevron
                              align="right"
                              items={buildRowActionDropdownItems(o)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      {/* Order Details & Status / WhatsApp Modal */}
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
                <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                  Cliente & Entrega
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {viewingOrder.customer_name}
                </span>
                {viewingOrder.customer_phone && (
                  <span className="text-muted-foreground block text-xs font-mono mt-0.5">
                    WhatsApp: {viewingOrder.customer_phone}
                  </span>
                )}
                {viewingOrder.delivery_address && (
                  <span className="text-muted-foreground block text-[11px] mt-0.5">
                    Entrega: {viewingOrder.delivery_address}
                  </span>
                )}
              </div>
              <div className="sm:text-right">
                <div className="flex items-center sm:justify-end justify-between gap-2">
                  <span className="text-muted-foreground block text-[11px] font-semibold uppercase">
                    Canal & Status Atual
                  </span>
                  <button
                    type="button"
                    onClick={handleForceRefreshFromDb}
                    disabled={isForceRefreshing || isFetchingOrders}
                    title="Recarregar este pedido e histórico diretamente do banco de dados"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-[10px] font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-2.5 w-2.5 ${
                        isForceRefreshing || isFetchingOrders ? 'animate-spin' : ''
                      }`}
                    />
                    Atualizar do Banco
                  </button>
                </div>
                <div className="flex items-center sm:justify-end gap-1.5 mt-1 flex-wrap">
                  {getChannelBadge(viewingOrder.channel)}
                  <Badge variant={getOrderStatusBadgeVariant(viewingOrder.status)}>
                    {statusLabels[viewingOrder.status] || viewingOrder.status}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                  Código interno: {viewingOrder.status}
                </span>
              </div>
            </div>

            {/* Página de Status em Tempo Real & Envio de WhatsApp ao Cliente */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    Comunicação com o Cliente & Página de Status em Tempo Real
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Envie o status personalizado e o link exclusivo para o cliente acompanhar até ficar como "{statusLabels.COMPLETED}".
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyTrackingUrl(viewingOrder)}
                    className="h-8 text-xs gap-1 cursor-pointer"
                  >
                    {copiedTrackingId === viewingOrder.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copiar URL
                      </>
                    )}
                  </Button>
                  <a
                    href={buildOrderTrackingUrl(viewingOrder.id, resolvedStoreSlug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                  >
                    Abrir Página Tempo Real <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-muted-foreground">
                    WhatsApp do Cliente (com DDD)
                  </label>
                  <Input
                    placeholder="Ex: 11999998888"
                    value={overrideCustomerPhone}
                    onChange={(e) => setOverrideCustomerPhone(e.target.value)}
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    handleOpenWhatsAppForOrder(
                      viewingOrder,
                      viewingOrder.status,
                      overrideCustomerPhone
                    )
                  }
                  className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0 cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Enviar Status "{statusLabels[viewingOrder.status]}" no WhatsApp
                </Button>
              </div>
            </div>

            {/* Change Status Controls via Dropdown Menu */}
            {viewingOrder.status !== 'CANCELLED' && (
              <div className="p-3.5 rounded-xl border border-border bg-surface space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-foreground font-bold text-xs block">
                      Alterar Status do Pedido
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Selecione o novo status no menu dropdown (incluindo "{statusLabels.COMPLETED}"). A alteração será registrada no histórico com o usuário atual (
                      <b>{currentUser?.fullName || currentUser?.email || 'Operador'}</b>).
                    </span>
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyCustomerOnStatusChange}
                      onChange={(e) => setNotifyCustomerOnStatusChange(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    Abrir mensagem de WhatsApp ao mudar status
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu
                    triggerLabel={`Selecionar Status: ${statusLabels[viewingOrder.status] || viewingOrder.status}`}
                    showChevron
                    align="left"
                    items={buildStatusDropdownItems(viewingOrder)}
                    buttonClassName="h-9 px-3 border-primary/40 bg-primary/5 text-foreground font-semibold"
                  />

                  {viewingOrder.status !== 'COMPLETED' && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: viewingOrder.id,
                          status: 'COMPLETED',
                        })
                      }
                      className="h-9 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Marcar como {statusLabels.COMPLETED}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Histórico de Atualizações de Status por Usuário */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <History className="h-4 w-4 text-primary" />
                  <h4 className="font-bold text-xs text-foreground">
                    Histórico de Atualizações de Status (Por Usuário)
                  </h4>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    {orderStatusHistory.length}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Registro auditável de quem alterou o status e quando
                </span>
              </div>

              {isLoadingOrderHistory ? (
                <div className="py-3 text-center text-[11px] text-muted-foreground">
                  Carregando histórico de status...
                </div>
              ) : orderStatusHistory.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-muted-foreground">
                  Nenhuma atualização registrada ainda.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/70 bg-surface max-h-48 overflow-y-auto custom-scrollbar">
                  {orderStatusHistory.map((entry) => {
                    const fromLabel = entry.fromStatus
                      ? statusLabels[entry.fromStatus] || entry.fromStatus
                      : null
                    const toLabel = statusLabels[entry.toStatus] || entry.toStatus
                    return (
                      <div
                        key={entry.id}
                        className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {fromLabel ? (
                              <>
                                <Badge
                                  variant={getOrderStatusBadgeVariant(entry.fromStatus)}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {fromLabel}
                                </Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              </>
                            ) : (
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                Status Inicial:
                              </span>
                            )}
                            <Badge
                              variant={getOrderStatusBadgeVariant(entry.toStatus)}
                              className="text-[10px] px-1.5 py-0 font-bold"
                            >
                              {toLabel}
                            </Badge>
                          </div>

                          {entry.reason && (
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {entry.reason}
                            </p>
                          )}
                        </div>

                        <div className="sm:text-right shrink-0 space-y-0.5">
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                            <UserCheck className="h-3 w-3 text-primary shrink-0" />
                            <span>{entry.userName}</span>
                          </div>
                          {entry.userEmail && entry.userEmail !== entry.userName && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {entry.userEmail}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatDateTime(entry.createdAt)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h4 className="font-bold mb-2 uppercase text-[11px] text-muted-foreground">
                Itens do Pedido ({viewingOrder.items?.length || 0})
              </h4>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border max-h-56 overflow-y-auto">
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
          </div>
        )}
      </Modal>

      {/* Modal de Personalização dos Apelidos de Status dos Pedidos */}
      <Modal
        isOpen={isStatusAliasesModalOpen}
        onClose={() => setIsStatusAliasesModalOpen(false)}
        title="Personalizar Status dos Pedidos (Apelidos)"
        description="Defina como os status internos do sistema serão exibidos na plataforma, nas mensagens de WhatsApp e na página de acompanhamento em tempo real do cliente."
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveStatusAliasesMutation.mutate(draftAliases)
          }}
          className="space-y-4 pt-1 text-xs"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {CUSTOMIZABLE_ORDER_STATUSES.map((st) => (
              <div
                key={st.code}
                className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {st.systemName}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{st.description}</span>
                  </div>
                </div>
                <Input
                  value={draftAliases[st.code] ?? ''}
                  onChange={(e) =>
                    setDraftAliases((prev) => ({
                      ...prev,
                      [st.code]: e.target.value,
                    }))
                  }
                  placeholder={`Ex: ${st.defaultAlias}`}
                  className="h-9 text-xs font-semibold"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraftAliases({ ...DEFAULT_ORDER_STATUS_LABELS })}
              className="w-full sm:w-auto h-9 text-xs gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrões
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsStatusAliasesModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={saveStatusAliasesMutation.isPending}
                className="h-9 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Salvar Apelidos
              </Button>
            </div>
          </div>
        </form>
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
