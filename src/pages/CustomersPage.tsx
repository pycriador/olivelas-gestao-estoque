import * as React from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '@/services/customerService'
import { savedViewService, type StoreSavedView, type CustomerSavedViewFilters } from '@/services/savedViewService'
import { useTenant } from '@/hooks/useTenant'
import { usePermissions } from '@/hooks/usePermissions'
import { useI18n } from '@/hooks/useI18n'
import { formatDateTime, formatDate } from '@/utils/dates'
import { formatCurrency } from '@/utils/currency'
import { exportToCSV, printFormattedDocument } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'

function Label({
  children,
  htmlFor,
  className = '',
}: {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-xs font-semibold text-foreground block ${className}`}
    >
      {children}
    </label>
  )
}
import {
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Download,
  Printer,
  Filter,
  Bookmark,
  BookmarkCheck,
  Star,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShoppingBag,
  Calendar,
  Check,
  X,
  Eye,
  Copy,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import type { Customer, CustomerOrderSummary } from '@/types/customer.types'
import type { OrderStatus } from '@/types/database.types'

const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; group: 'OPEN' | 'CLOSED' | 'CANCELLED'; badgeVariant: 'warning' | 'success' | 'danger' | 'secondary' | 'default' }
> = {
  DRAFT: { label: 'Rascunho', group: 'OPEN', badgeVariant: 'secondary' },
  PENDING: { label: 'Pendente', group: 'OPEN', badgeVariant: 'warning' },
  CONFIRMED: { label: 'Confirmado', group: 'OPEN', badgeVariant: 'default' },
  PROCESSING: { label: 'Em Separação', group: 'OPEN', badgeVariant: 'warning' },
  READY: { label: 'Pronto p/ Retirada', group: 'OPEN', badgeVariant: 'default' },
  SHIPPED: { label: 'Enviado / Em Rota', group: 'OPEN', badgeVariant: 'default' },
  DELIVERED: { label: 'Fechado / Entregue', group: 'CLOSED', badgeVariant: 'success' },
  CANCELLED: { label: 'Cancelado', group: 'CANCELLED', badgeVariant: 'danger' },
}

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
]

const CLOSED_ORDER_STATUSES: OrderStatus[] = ['DELIVERED']
const CANCELLED_ORDER_STATUSES: OrderStatus[] = ['CANCELLED']

const CHANNEL_LABELS: Record<string, string> = {
  IN_STORE: 'PDV / Balcão',
  WHATSAPP: 'WhatsApp',
  CATALOG: 'Catálogo Digital',
  ECOMMERCE: 'E-commerce',
  API: 'Integração API',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  BOLETO: 'Boleto',
  BANK_TRANSFER: 'Transferência',
  OTHER: 'Outros',
}

type PeriodPreset =
  | 'ALL'
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | '90D'
  | 'THIS_YEAR'
  | 'CUSTOM'

function computeDateRangeFromPreset(preset: PeriodPreset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date()
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10)

  if (preset === 'TODAY') {
    const t = toIsoDate(now)
    return { from: t, to: t }
  }
  if (preset === 'THIS_WEEK') {
    const d = new Date(now)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return { from: toIsoDate(d), to: toIsoDate(now) }
  }
  if (preset === 'THIS_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: toIsoDate(start), to: toIsoDate(now) }
  }
  if (preset === 'LAST_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: toIsoDate(start), to: toIsoDate(end) }
  }
  if (preset === '90D') {
    const start = new Date(now.getTime() - 90 * 86400000)
    return { from: toIsoDate(start), to: toIsoDate(now) }
  }
  if (preset === 'THIS_YEAR') {
    const start = new Date(now.getFullYear(), 0, 1)
    return { from: toIsoDate(start), to: toIsoDate(now) }
  }
  if (preset === 'CUSTOM') {
    return { from: customFrom, to: customTo }
  }
  return { from: '', to: '' }
}

export function CustomersPage() {
  const { storeId, storeName, userStores } = useTenant()
  const { hasPermission } = usePermissions()
  const { t } = useI18n()
  const [feedbackNotice, setFeedbackNotice] = React.useState<{
    title: string
    description?: string
    variant?: 'default' | 'destructive' | 'success' | 'error' | 'info' | 'warning'
  } | null>(null)
  const toast = React.useCallback(
    (opts: {
      title: string
      description?: string
      variant?: 'default' | 'destructive' | 'success' | 'error' | 'info' | 'warning'
    }) => {
      setFeedbackNotice(opts)
      setTimeout(() => {
        setFeedbackNotice((prev) => (prev?.title === opts.title ? null : prev))
      }, 4500)
    },
    []
  )
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Store/branch selector (defaults to active storeId)
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(storeId || '')
  React.useEffect(() => {
    if (storeId && !selectedStoreId) {
      setSelectedStoreId(storeId)
    }
  }, [storeId, selectedStoreId])

  const effectiveStoreId = selectedStoreId || storeId || ''
  const effectiveStoreName = React.useMemo(() => {
    if (effectiveStoreId === 'all') return 'Todas as Unidades'
    const found = userStores.find((s) => s.storeId === effectiveStoreId)
    return found?.storeName || storeName || 'Unidade Atual'
  }, [effectiveStoreId, userStores, storeName])

  // Parse initial state from URL Search Params
  const urlCustomerId = searchParams.get('customerId') || ''
  const urlOrderId = searchParams.get('orderId') || searchParams.get('order') || ''
  const urlViewId = searchParams.get('viewId') || ''
  const urlSearch = searchParams.get('q') || ''
  const urlPage = Math.max(1, Number(searchParams.get('page') || 1))
  const urlPageSize = Math.max(5, Number(searchParams.get('pageSize') || 15))
  const urlPeriod = (searchParams.get('period') as PeriodPreset) || 'ALL'
  const urlDateFrom = searchParams.get('from') || ''
  const urlDateTo = searchParams.get('to') || ''
  const urlOnlyWithOrders = searchParams.get('onlyWithOrders') === 'true'

  const urlCustomerStatuses = React.useMemo<('ACTIVE' | 'INACTIVE')[]>(() => {
    const raw = searchParams.get('status') || ''
    if (!raw || raw === 'ALL') return []
    return raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is 'ACTIVE' | 'INACTIVE' => s === 'ACTIVE' || s === 'INACTIVE')
  }, [searchParams])

  const urlOrderStatuses = React.useMemo<OrderStatus[]>(() => {
    const raw = searchParams.get('orderStatus') || ''
    if (!raw || raw === 'ALL') return []
    return raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is OrderStatus => s in ORDER_STATUS_META)
  }, [searchParams])

  const [searchInput, setSearchInput] = React.useState(urlSearch)
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)

  // Expanded customer rows to view all orders directly in the table
  const [expandedCustomerIds, setExpandedCustomerIds] = React.useState<Set<string>>(new Set())

  // Order Detail Modal state (opened when clicking an order link or visiting ?orderId=...)
  const [viewingOrder, setViewingOrder] = React.useState<CustomerOrderSummary | null>(null)
  const [viewingCustomerForOrder, setViewingCustomerForOrder] = React.useState<Customer | null>(null)

  // Save View Modal state
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = React.useState(false)
  const [editingViewId, setEditingViewId] = React.useState<string | null>(null)
  const [viewName, setViewName] = React.useState('')
  const [viewDescription, setViewDescription] = React.useState('')
  const [viewColor, setViewColor] = React.useState('indigo')
  const [viewIsDefault, setViewIsDefault] = React.useState(false)

  // Customer CRUD Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = React.useState<Customer | null>(null)
  const [formData, setFormData] = React.useState({
    name: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  })

  // Close multi-select dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync search input with URL param
  React.useEffect(() => {
    setSearchInput(urlSearch)
  }, [urlSearch])

  // Helper to update URL search params cleanly
  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | null | undefined>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (resetPage && !('page' in updates)) {
            next.set('page', '1')
          }
          Object.entries(updates).forEach(([k, v]) => {
            if (v === null || v === undefined || v === '' || v === 'ALL') {
              next.delete(k)
            } else {
              next.set(k, v)
            }
          })
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  // Debounced search update
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== urlSearch) {
        updateUrlParams({ q: searchInput || null })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, urlSearch, updateUrlParams])

  // 1. Fetch Saved Views for this Store/Branch from Supabase
  const { data: savedViews = [], refetch: refetchSavedViews } = useQuery({
    queryKey: ['store-saved-views', effectiveStoreId, 'customers'],
    queryFn: () => savedViewService.getSavedViews(effectiveStoreId, 'customers'),
    enabled: Boolean(effectiveStoreId),
  })

  // Apply default saved view on initial load if no URL filters are set
  const appliedDefaultRef = React.useRef<string>('')
  React.useEffect(() => {
    if (!effectiveStoreId || savedViews.length === 0) return
    if (appliedDefaultRef.current === effectiveStoreId) return

    const hasExplicitUrlFilter =
      Boolean(urlCustomerId) ||
      Boolean(urlOrderId) ||
      Boolean(urlViewId) ||
      Boolean(searchParams.get('status')) ||
      Boolean(searchParams.get('orderStatus')) ||
      Boolean(searchParams.get('period')) ||
      Boolean(searchParams.get('q'))

    appliedDefaultRef.current = effectiveStoreId

    if (!hasExplicitUrlFilter) {
      const defaultView = savedViews.find((v) => v.is_default && !v.is_system_preset)
      if (defaultView) {
        applySavedView(defaultView)
      }
    }
  }, [effectiveStoreId, savedViews])

  const { from: computedDateFrom, to: computedDateTo } = React.useMemo(
    () => computeDateRangeFromPreset(urlPeriod, urlDateFrom, urlDateTo),
    [urlPeriod, urlDateFrom, urlDateTo]
  )

  // 2. Fetch Customers & Orders with all active filters
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: [
      'customers',
      effectiveStoreId,
      urlSearch,
      urlCustomerStatuses.join(','),
      urlOrderStatuses.join(','),
      computedDateFrom,
      computedDateTo,
      urlOnlyWithOrders,
      urlCustomerId,
      urlOrderId,
      urlPage,
      urlPageSize,
    ],
    queryFn: () =>
      customerService.listCustomers(effectiveStoreId, {
        search: urlSearch,
        customerStatuses: urlCustomerStatuses,
        orderStatuses: urlOrderStatuses,
        dateFrom: computedDateFrom || undefined,
        dateTo: computedDateTo || undefined,
        onlyWithOrders: urlOnlyWithOrders,
        customerId: urlCustomerId || undefined,
        orderId: urlOrderId || undefined,
        page: urlPage,
        pageSize: urlPageSize,
      }),
    enabled: Boolean(effectiveStoreId),
  })

  const customerList: Customer[] = customersResponse?.data || []
  const totalItems = customersResponse?.total || 0
  const totalPages = Math.ceil(totalItems / urlPageSize) || 1
  const viewSummary = customersResponse?.summary || {
    totalCustomers: 0,
    totalOrdersInView: 0,
    openOrdersCount: 0,
    closedOrdersCount: 0,
    cancelledOrdersCount: 0,
    totalRevenueInView: 0,
  }

  // Auto-expand customer rows when filtered by URL (`?customerId=...` or `?orderId=...`) or when an order status filter is active
  React.useEffect(() => {
    if (customerList.length === 0) return

    if (urlCustomerId || urlOrderId || urlOrderStatuses.length > 0) {
      const nextExpanded = new Set<string>()
      for (const c of customerList) {
        if ((c.filtered_orders?.length || 0) > 0 || c.id === urlCustomerId) {
          nextExpanded.add(c.id)
        }
      }
      setExpandedCustomerIds(nextExpanded)
    }

    // If URL has `?orderId=...`, automatically open the order details modal/drawer on screen
    if (urlOrderId) {
      for (const c of customerList) {
        const foundOrder = (c.filtered_orders || c.orders || []).find(
          (o) =>
            o.id.toLowerCase() === urlOrderId.toLowerCase() ||
            o.order_number.toLowerCase() === urlOrderId.toLowerCase()
        )
        if (foundOrder) {
          setViewingCustomerForOrder(c)
          setViewingOrder(foundOrder)
          return
        }
      }
      // Fallback: query the specific order if not in the first page
      customerService.getOrderDetailsByIdOrNumber(effectiveStoreId, urlOrderId).then((ord) => {
        if (ord) {
          setViewingOrder(ord)
        }
      })
    }
  }, [customerList, urlCustomerId, urlOrderId, urlOrderStatuses.length, effectiveStoreId])

  // Toggle Customer Status in multi-select
  const toggleCustomerStatus = (st: 'ACTIVE' | 'INACTIVE') => {
    const exists = urlCustomerStatuses.includes(st)
    const next = exists
      ? urlCustomerStatuses.filter((s) => s !== st)
      : [...urlCustomerStatuses, st]
    updateUrlParams({
      status: next.length > 0 ? next.join(',') : null,
      viewId: null,
    })
  }

  // Toggle single Order Status in multi-select
  const toggleOrderStatus = (st: OrderStatus) => {
    const exists = urlOrderStatuses.includes(st)
    const next = exists
      ? urlOrderStatuses.filter((s) => s !== st)
      : [...urlOrderStatuses, st]
    updateUrlParams({
      orderStatus: next.length > 0 ? next.join(',') : null,
      onlyWithOrders: next.length > 0 ? 'true' : urlOnlyWithOrders ? 'true' : null,
      viewId: null,
    })
  }

  // Toggle an entire group of Order Statuses (Open, Closed, Cancelled)
  const toggleOrderStatusGroup = (groupStatuses: OrderStatus[]) => {
    const allSelected = groupStatuses.every((st) => urlOrderStatuses.includes(st))
    let next: OrderStatus[]
    if (allSelected) {
      next = urlOrderStatuses.filter((st) => !groupStatuses.includes(st))
    } else {
      const set = new Set<OrderStatus>([...urlOrderStatuses, ...groupStatuses])
      next = Array.from(set)
    }
    updateUrlParams({
      orderStatus: next.length > 0 ? next.join(',') : null,
      onlyWithOrders: next.length > 0 ? 'true' : null,
      viewId: null,
    })
  }

  // Apply a Saved View
  const applySavedView = (view: StoreSavedView) => {
    const f = view.filters || {}
    setSearchInput(f.search || '')
    updateUrlParams({
      viewId: view.id,
      status: f.customerStatuses && f.customerStatuses.length > 0 ? f.customerStatuses.join(',') : null,
      orderStatus: f.orderStatuses && f.orderStatuses.length > 0 ? f.orderStatuses.join(',') : null,
      period: f.period && f.period !== 'ALL' ? f.period : null,
      from: f.dateFrom || null,
      to: f.dateTo || null,
      q: f.search || null,
      onlyWithOrders: f.onlyWithOrders ? 'true' : null,
      customerId: f.customerId || null,
      orderId: f.orderId || null,
    })
  }

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchInput('')
    setViewingOrder(null)
    setViewingCustomerForOrder(null)
    setSearchParams({}, { replace: true })
  }

  // Open order details and sync URL so link is shareable and filterable by URL
  const handleSelectOrderOnScreen = (customer: Customer, order: CustomerOrderSummary) => {
    setViewingCustomerForOrder(customer)
    setViewingOrder(order)
    updateUrlParams(
      {
        customerId: customer.id,
        orderId: order.id,
      },
      false
    )
  }

  const handleCloseOrderModal = () => {
    setViewingOrder(null)
    setViewingCustomerForOrder(null)
    // Remove orderId from URL while preserving customer/status filters if user desires
    updateUrlParams({ orderId: null, order: null }, false)
  }

  const handleCopyOrderLink = (customerId: string | null, orderId: string) => {
    const url = new URL(window.location.href)
    if (customerId) url.searchParams.set('customerId', customerId)
    url.searchParams.set('orderId', orderId)
    navigator.clipboard.writeText(url.toString())
    toast({
      title: 'Link do pedido copiado!',
      description: 'O link direto para filtrar este pedido na tela de clientes foi copiado.',
      variant: 'success',
    })
  }

  // Save View Mutation
  const saveViewMutation = useMutation({
    mutationFn: async () => {
      const filtersToSave: CustomerSavedViewFilters = {
        customerStatuses: urlCustomerStatuses,
        orderStatuses: urlOrderStatuses,
        period: urlPeriod,
        dateFrom: urlDateFrom || undefined,
        dateTo: urlDateTo || undefined,
        search: searchInput || undefined,
        onlyWithOrders: urlOnlyWithOrders || urlOrderStatuses.length > 0,
      }

      return savedViewService.saveView({
        id: editingViewId || undefined,
        storeId: effectiveStoreId,
        pageKey: 'customers',
        name: viewName,
        description: viewDescription || undefined,
        color: viewColor,
        filters: filtersToSave,
        isDefault: viewIsDefault,
      })
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['store-saved-views', effectiveStoreId, 'customers'] })
      refetchSavedViews()
      setIsSaveViewModalOpen(false)
      setEditingViewId(null)
      updateUrlParams({ viewId: saved.id }, false)
      toast({
        title: 'Visão salva no banco de dados!',
        description: `A visão "${saved.name}" foi salva para a unidade ${effectiveStoreName}.`,
        variant: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao salvar visão',
        description: err.message,
        variant: 'error',
      })
    },
  })

  const deleteViewMutation = useMutation({
    mutationFn: (viewId: string) =>
      savedViewService.deleteView(effectiveStoreId, 'customers', viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-saved-views', effectiveStoreId, 'customers'] })
      refetchSavedViews()
      if (urlViewId) {
        updateUrlParams({ viewId: null }, false)
      }
      toast({
        title: 'Visão removida',
        description: 'A visão personalizada foi removida desta loja/filial.',
        variant: 'info',
      })
    },
  })

  const toggleDefaultViewMutation = useMutation({
    mutationFn: (viewId: string) =>
      savedViewService.toggleDefaultView(effectiveStoreId, 'customers', viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-saved-views', effectiveStoreId, 'customers'] })
      refetchSavedViews()
      toast({
        title: 'Visão padrão atualizada',
        description: `Preferência padrão salva para ${effectiveStoreName}.`,
        variant: 'success',
      })
    },
  })

  const openSaveCurrentViewModal = (existingView?: StoreSavedView) => {
    if (existingView && !existingView.is_system_preset) {
      setEditingViewId(existingView.id)
      setViewName(existingView.name)
      setViewDescription(existingView.description || '')
      setViewColor(existingView.color || 'indigo')
      setViewIsDefault(existingView.is_default)
    } else {
      setEditingViewId(null)
      // Suggest a smart name based on active filters
      const suggestedParts: string[] = []
      if (urlOrderStatuses.length > 0) {
        const labels = urlOrderStatuses.map((s) => ORDER_STATUS_META[s]?.label || s)
        suggestedParts.push(`Pedidos: ${labels.slice(0, 2).join(', ')}`)
      }
      if (urlPeriod !== 'ALL') {
        suggestedParts.push(urlPeriod)
      }
      setViewName(suggestedParts.join(' - ') || 'Minha Visão de Pedidos')
      setViewDescription(
        `Filtro personalizado da unidade ${effectiveStoreName}`
      )
      setViewColor('indigo')
      setViewIsDefault(false)
    }
    setIsSaveViewModalOpen(true)
  }

  // Customer CRUD mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const targetStore = effectiveStoreId === 'all' ? storeId! : effectiveStoreId
      if (editingCustomer) {
        return customerService.updateCustomer(editingCustomer.id, targetStore, formData)
      }
      return customerService.createCustomer(targetStore, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsModalOpen(false)
      setEditingCustomer(null)
      toast({
        title: editingCustomer ? 'Cliente atualizado!' : 'Cliente cadastrado!',
        variant: 'success',
      })
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar cliente', description: err.message, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingCustomer) return
      return customerService.softDeleteCustomer(deletingCustomer.id, deletingCustomer.store_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setDeletingCustomer(null)
      toast({ title: 'Cliente removido', variant: 'info' })
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'error' })
    },
  })

  const handleOpenCreate = () => {
    setEditingCustomer(null)
    setFormData({
      name: '',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      notes: '',
      status: 'ACTIVE',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      document: customer.document || '',
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      notes: customer.notes || '',
      status: customer.status,
    })
    setIsModalOpen(true)
  }

  const toggleExpandCustomer = (customerId: string) => {
    setExpandedCustomerIds((prev) => {
      const next = new Set(prev)
      if (next.has(customerId)) next.delete(customerId)
      else next.add(customerId)
      return next
    })
  }

  const expandOrCollapseAllVisible = () => {
    const allExpanded = customerList.every((c) => expandedCustomerIds.has(c.id))
    if (allExpanded) {
      setExpandedCustomerIds(new Set())
    } else {
      setExpandedCustomerIds(new Set(customerList.map((c) => c.id)))
    }
  }

  /**
   * Exporta SOMENTE O QUE ESTÁ VISÍVEL NA TELA (`customerList`) com todos os detalhes
   * dos pedidos, itens comprados, quantidades, valores unitários, pagamentos e links.
   */
  const handleExportVisibleDetailedCSV = () => {
    if (customerList.length === 0) {
      toast({
        title: 'Nenhum dado visível para exportar',
        description: 'Ajuste os filtros aplicados para exibir registros antes de exportar.',
        variant: 'error',
      })
      return
    }

    interface DetailedCustomerOrderExportRow {
      storeName: string
      customerName: string
      customerDocument: string
      customerEmail: string
      customerPhone: string
      customerWhatsapp: string
      customerStatus: string
      totalOrdersCustomer: number
      totalSpentCustomer: number
      orderNumber: string
      orderDateTime: string
      orderStatusLabel: string
      orderSituation: string
      orderChannel: string
      paymentMethods: string
      paymentStatus: string
      itemsCount: number
      itemsDetailedBreakdown: string
      orderSubtotal: number
      orderDiscount: number
      orderShipping: number
      orderTotalAmount: number
      orderNotes: string
      directOrderLink: string
    }

    const exportRows: DetailedCustomerOrderExportRow[] = []
    const baseUrl = `${window.location.origin}${window.location.pathname}`

    for (const customer of customerList) {
      const visibleOrders = customer.filtered_orders || customer.orders || []

      if (visibleOrders.length === 0) {
        exportRows.push({
          storeName: effectiveStoreName,
          customerName: customer.name,
          customerDocument: customer.document || '-',
          customerEmail: customer.email || '-',
          customerPhone: customer.phone || '-',
          customerWhatsapp: customer.whatsapp || '-',
          customerStatus: customer.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
          totalOrdersCustomer: 0,
          totalSpentCustomer: 0,
          orderNumber: 'Sem pedidos no filtro',
          orderDateTime: '-',
          orderStatusLabel: '-',
          orderSituation: '-',
          orderChannel: '-',
          paymentMethods: '-',
          paymentStatus: '-',
          itemsCount: 0,
          itemsDetailedBreakdown: 'Nenhum item registrado na visão atual',
          orderSubtotal: 0,
          orderDiscount: 0,
          orderShipping: 0,
          orderTotalAmount: 0,
          orderNotes: customer.notes || '-',
          directOrderLink: `${baseUrl}?customerId=${customer.id}`,
        })
      } else {
        for (const ord of visibleOrders) {
          const stMeta = ORDER_STATUS_META[ord.status]
          const situationLabel =
            stMeta?.group === 'OPEN'
              ? 'Aberto'
              : stMeta?.group === 'CLOSED'
              ? 'Fechado / Concluído'
              : 'Cancelado'

          const itemsText =
            ord.items.length > 0
              ? ord.items
                  .map(
                    (it) =>
                      `[${it.product_sku}] ${it.product_name}: ${it.quantity} ${it.unit} x ${formatCurrency(it.unit_price)} = ${formatCurrency(it.total_price)}`
                  )
                  .join(' | ')
              : 'Sem itens detalhados'

          const totalQty = ord.items.reduce((acc, it) => acc + it.quantity, 0)
          const payMethods =
            ord.payments.length > 0
              ? ord.payments
                  .map(
                    (p) =>
                      `${PAYMENT_METHOD_LABELS[p.method] || p.method} (${formatCurrency(p.amount)})`
                  )
                  .join(' + ')
              : 'Não informado'
          const payStatuses =
            ord.payments.length > 0
              ? ord.payments.map((p) => p.status).join(', ')
              : '-'

          exportRows.push({
            storeName: effectiveStoreName,
            customerName: customer.name,
            customerDocument: customer.document || '-',
            customerEmail: customer.email || '-',
            customerPhone: customer.phone || '-',
            customerWhatsapp: customer.whatsapp || '-',
            customerStatus: customer.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
            totalOrdersCustomer: customer.total_orders || visibleOrders.length,
            totalSpentCustomer: customer.total_spent || 0,
            orderNumber: ord.order_number,
            orderDateTime: formatDateTime(ord.created_at),
            orderStatusLabel: stMeta?.label || ord.status,
            orderSituation: situationLabel,
            orderChannel: CHANNEL_LABELS[ord.channel] || ord.channel,
            paymentMethods: payMethods,
            paymentStatus: payStatuses,
            itemsCount: totalQty,
            itemsDetailedBreakdown: itemsText,
            orderSubtotal: ord.subtotal,
            orderDiscount: ord.discount_amount,
            orderShipping: ord.shipping_amount,
            orderTotalAmount: ord.total_amount,
            orderNotes: ord.notes || ord.cancellation_reason || customer.notes || '-',
            directOrderLink: `${baseUrl}?customerId=${customer.id}&orderId=${ord.id}`,
          })
        }
      }
    }

    exportToCSV(
      `clientes_pedidos_visiveis_${effectiveStoreName.toLowerCase().replace(/\s+/g, '_')}`,
      exportRows,
      [
        { header: 'Unidade / Filial', key: 'storeName' },
        { header: 'Cliente', key: 'customerName' },
        { header: 'CPF/CNPJ', key: 'customerDocument' },
        { header: 'E-mail', key: 'customerEmail' },
        { header: 'Telefone', key: 'customerPhone' },
        { header: 'WhatsApp', key: 'customerWhatsapp' },
        { header: 'Status Cliente', key: 'customerStatus' },
        { header: 'Qtd Pedidos do Cliente (Visão)', key: 'totalOrdersCustomer' },
        { header: 'Total Gasto pelo Cliente (R$)', key: 'totalSpentCustomer' },
        { header: 'Nº do Pedido', key: 'orderNumber' },
        { header: 'Data e Hora do Pedido', key: 'orderDateTime' },
        { header: 'Status do Pedido', key: 'orderStatusLabel' },
        { header: 'Situação (Aberto/Fechado/Cancelado)', key: 'orderSituation' },
        { header: 'Canal de Venda', key: 'orderChannel' },
        { header: 'Forma(s) de Pagamento', key: 'paymentMethods' },
        { header: 'Status Pagamento', key: 'paymentStatus' },
        { header: 'Qtd Itens no Pedido', key: 'itemsCount' },
        { header: 'Itens Detalhados do Pedido (SKU, Produto, Qtd, Preço Unit., Subtotal)', key: 'itemsDetailedBreakdown' },
        { header: 'Subtotal Pedido (R$)', key: 'orderSubtotal' },
        { header: 'Desconto Pedido (R$)', key: 'orderDiscount' },
        { header: 'Frete (R$)', key: 'orderShipping' },
        { header: 'Valor Total do Pedido (R$)', key: 'orderTotalAmount' },
        { header: 'Observações / Motivo Cancelamento', key: 'orderNotes' },
        { header: 'Link Direto do Pedido', key: 'directOrderLink' },
      ]
    )

    toast({
      title: 'Exportação concluída!',
      description: `Exportados ${ customerList.length } clientes visíveis (${ exportRows.length } linhas detalhadas de pedidos).`,
      variant: 'success',
    })
  }

  // Print Visible Customers & Detailed Orders
  const handlePrintVisibleDetailed = () => {
    const rowsHtml = customerList
      .map((c) => {
        const orders = c.filtered_orders || c.orders || []
        const ordersHtml =
          orders.length > 0
            ? orders
                .map(
                  (o) => `
                  <div style="margin: 6px 0; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:4px;">
                      <span>Pedido #${o.order_number} · ${formatDateTime(o.created_at)} · ${ORDER_STATUS_META[o.status]?.label || o.status}</span>
                      <span>Total: ${formatCurrency(o.total_amount)}</span>
                    </div>
                    <div style="color:#475569;">
                      Itens: ${
                        o.items.length > 0
                          ? o.items
                              .map(
                                (it) =>
                                  `${it.product_name} (${it.quantity} ${it.unit} x ${formatCurrency(it.unit_price)} = ${formatCurrency(it.total_price)})`
                              )
                              .join(', ')
                          : 'Sem itens'
                      }
                    </div>
                  </div>
                `
                )
                .join('')
            : '<div style="font-size:11px; color:#94a3b8;">Sem pedidos registrados no filtro atual</div>'

        return `
          <tr>
            <td style="vertical-align:top;">
              <strong>${c.name}</strong><br/>
              <span style="font-size:11px; color:#64748b;">Doc: ${c.document || '-'} | Tel: ${c.phone || c.whatsapp || '-'}</span>
            </td>
            <td style="vertical-align:top;">${c.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</td>
            <td style="vertical-align:top;">
              <div><strong>${orders.length} pedido(s)</strong> · Total: <strong>${formatCurrency(c.total_spent || 0)}</strong></div>
              ${ordersHtml}
            </td>
          </tr>
        `
      })
      .join('')

    const html = `
      <h2>Relatório Visível de Clientes e Pedidos Detalhados — ${effectiveStoreName}</h2>
      <p style="font-size:12px; color:#64748b;">
        Clientes visíveis na página: ${customerList.length} | Status de Pedido: ${
          urlOrderStatuses.length > 0
            ? urlOrderStatuses.map((s) => ORDER_STATUS_META[s]?.label || s).join(', ')
            : 'Todos'
        }
      </p>
      <table>
        <thead>
          <tr>
            <th style="width:28%;">Cliente / Contato</th>
            <th style="width:10%;">Status</th>
            <th style="width:62%;">Pedidos Realizados e Detalhamento de Itens</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `
    printFormattedDocument(`Clientes e Pedidos - ${effectiveStoreName}`, html)
  }

  const activeSavedView = React.useMemo(
    () => savedViews.find((v) => v.id === urlViewId) || null,
    [savedViews, urlViewId]
  )

  const isOpenGroupActive = OPEN_ORDER_STATUSES.every((s) => urlOrderStatuses.includes(s))
  const isClosedGroupActive = CLOSED_ORDER_STATUSES.every((s) => urlOrderStatuses.includes(s))
  const isCancelledGroupActive = CANCELLED_ORDER_STATUSES.every((s) => urlOrderStatuses.includes(s))

  const hasAnyActiveFilter =
    urlCustomerStatuses.length > 0 ||
    urlOrderStatuses.length > 0 ||
    urlPeriod !== 'ALL' ||
    Boolean(urlCustomerId) ||
    Boolean(urlOrderId) ||
    Boolean(urlSearch) ||
    urlOnlyWithOrders

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col space-y-2 animate-in fade-in duration-150">
      <PageHeader title={t.nav.customers}>
        <div className="flex items-center gap-2 flex-wrap">
          {userStores.length > 1 && (
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 h-8 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <select
                value={effectiveStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value)
                  appliedDefaultRef.current = ''
                }}
                aria-label="Selecionar Loja ou Filial"
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer pr-1"
              >
                {userStores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {(s as any).isBranch ? `↳ Filial: ${s.storeName}` : `🏢 Unidade: ${s.storeName}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2.5"
            onClick={handleExportVisibleDetailedCSV}
            title="Exportar apenas os clientes e pedidos visíveis na tela com detalhamento completo dos itens"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Exportar Visíveis ({customerList.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2.5"
            onClick={handlePrintVisibleDetailed}
            title="Imprimir visão detalhada atual"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Imprimir Visão
          </Button>

          {hasPermission('customers:write') && (
            <Button size="sm" className="h-8 text-xs px-3" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Cliente
            </Button>
          )}
        </div>
      </PageHeader>

      {feedbackNotice && (
        <div
          className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border text-xs shadow-xs flex-shrink-0 ${
            feedbackNotice.variant === 'destructive' || feedbackNotice.variant === 'error'
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <div>
            <span className="font-bold">{feedbackNotice.title}</span>
            {feedbackNotice.description && (
              <span className="ml-1.5 opacity-90">{feedbackNotice.description}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-xs underline opacity-75 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* SAVED VIEWS BAR (Individual per Store / Branch in Database) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-border bg-card shadow-2xs flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <BookmarkCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold text-foreground">
              Visões ({effectiveStoreName}):
            </span>
          </div>

          {savedViews.map((view) => {
            const isSelected = urlViewId === view.id
            return (
              <div
                key={view.id}
                className={`inline-flex items-center rounded-md border text-[11px] transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                    : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                }`}
              >
                <button
                  type="button"
                  onClick={() => applySavedView(view)}
                  className="px-2 py-0.5 flex items-center gap-1 cursor-pointer"
                  title={view.description || view.name}
                >
                  <Bookmark className="h-2.5 w-2.5 shrink-0" />
                  <span>{view.name}</span>
                  {view.is_default && (
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 shrink-0" />
                  )}
                </button>

                <div className="flex items-center pr-1 border-l border-border/40 pl-1 gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleDefaultViewMutation.mutate(view.id)
                    }}
                    title={view.is_default ? 'Remover como visão padrão da unidade' : 'Definir como visão padrão desta unidade'}
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <Star
                      className={`h-2.5 w-2.5 ${
                        view.is_default
                          ? 'fill-amber-400 text-amber-400'
                          : isSelected
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>

                  {!view.is_system_preset && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteViewMutation.mutate(view.id)
                      }}
                      title="Excluir visão salva"
                      className="p-0.5 rounded hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {activeSavedView && !activeSavedView.is_system_preset && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 border-primary/40 text-primary"
              onClick={() => openSaveCurrentViewModal(activeSavedView)}
            >
              <Bookmark className="h-3 w-3 mr-1" />
              Atualizar "{activeSavedView.name}"
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2 bg-primary/5 hover:bg-primary/10 text-primary border-primary/30"
            onClick={() => openSaveCurrentViewModal()}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Salvar Visão
          </Button>

          {hasAnyActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              onClick={handleClearAllFilters}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* URL DEEP-LINK FILTER BANNER (when ?customerId= or ?orderId= is active) */}
      {(urlCustomerId || urlOrderId) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="text-[10px]">
              Filtro por URL Ativo
            </Badge>
            <span className="text-foreground font-medium">
              Exibindo registros vinculados via link direto:
              {urlCustomerId && <span className="font-mono ml-1 text-primary">Cliente ID: {urlCustomerId.slice(0, 8)}...</span>}
              {urlOrderId && <span className="font-mono ml-2 text-primary">Pedido: {urlOrderId}</span>}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => updateUrlParams({ customerId: null, orderId: null, order: null })}
          >
            <X className="h-3 w-3 mr-1" />
            Mostrar Todos os Clientes
          </Button>
        </div>
      )}

      {/* COMPACT 1-LINE KPI PILLS (matching /expiration) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-shrink-0">
        <div className="px-3 py-1.5 rounded-lg border bg-card border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Clientes no Filtro</span>
          <span className="text-sm font-bold font-mono text-foreground">{viewSummary.totalCustomers}</span>
        </div>

        <button
          type="button"
          onClick={() => toggleOrderStatusGroup(OPEN_ORDER_STATUSES)}
          className={`px-3 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
            isOpenGroupActive
              ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/30'
              : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50'
          }`}
        >
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Abertos
          </span>
          <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
            {viewSummary.openOrdersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleOrderStatusGroup(CLOSED_ORDER_STATUSES)}
          className={`px-3 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
            isClosedGroupActive
              ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/30'
              : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50'
          }`}
        >
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Fechados
          </span>
          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {viewSummary.closedOrdersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleOrderStatusGroup(CANCELLED_ORDER_STATUSES)}
          className={`px-3 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
            isCancelledGroupActive
              ? 'border-rose-500 bg-rose-500/15 ring-1 ring-rose-500/30'
              : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/50'
          }`}
        >
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Cancelados
          </span>
          <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
            {viewSummary.cancelledOrdersCount}
          </span>
        </button>

        <div className="px-3 py-1.5 rounded-lg border bg-card border-border flex items-center justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-medium text-muted-foreground">Faturamento</span>
          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(viewSummary.totalRevenueInView)}
          </span>
        </div>
      </div>

      {/* MULTI-SELECT FILTERS & SEARCH TOOLBAR */}
      <div className="px-3 py-2 rounded-lg border border-border bg-card shadow-2xs space-y-2 flex-shrink-0">
        <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ, telefone, Nº do pedido ou produto comprado..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Multi-select Status Popover + Period Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* MULTI-SELECT STATUS DROPDOWN */}
            <div className="relative" ref={statusDropdownRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusDropdownOpen((o) => !o)}
                className="h-8 text-xs flex items-center gap-1.5 border-border"
              >
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span>
                  Status Múltipla Seleção
                  {urlOrderStatuses.length + urlCustomerStatuses.length > 0 && (
                    <Badge variant="default" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {urlOrderStatuses.length + urlCustomerStatuses.length}
                    </Badge>
                  )}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>

              {statusDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl z-50 p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-foreground">
                      Seleção Múltipla de Status
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateUrlParams({ status: null, orderStatus: null, onlyWithOrders: null })
                      }
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Marcar Todos (Limpar)
                    </button>
                  </div>

                  {/* Quick Group Presets */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Agrupamentos Rápidos de Pedidos
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleOrderStatusGroup(OPEN_ORDER_STATUSES)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
                          isOpenGroupActive
                            ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                            : 'border-border hover:bg-muted text-foreground'
                        }`}
                      >
                        {isOpenGroupActive && <Check className="h-3 w-3" />}
                        Abertos
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleOrderStatusGroup(CLOSED_ORDER_STATUSES)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
                          isClosedGroupActive
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'border-border hover:bg-muted text-foreground'
                        }`}
                      >
                        {isClosedGroupActive && <Check className="h-3 w-3" />}
                        Fechados
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleOrderStatusGroup(CANCELLED_ORDER_STATUSES)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
                          isCancelledGroupActive
                            ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 font-bold'
                            : 'border-border hover:bg-muted text-foreground'
                        }`}
                      >
                        {isCancelledGroupActive && <Check className="h-3 w-3" />}
                        Cancelados
                      </button>
                    </div>
                  </div>

                  {/* Individual Order Status Checkboxes */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Status Individual do Pedido (Múltipla Seleção)
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {ALL_ORDER_STATUSES.map((st) => {
                        const checked = urlOrderStatuses.includes(st)
                        const meta = ORDER_STATUS_META[st]
                        return (
                          <label
                            key={st}
                            onClick={() => toggleOrderStatus(st)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                              checked
                                ? 'bg-primary/10 border-primary/50 text-foreground font-semibold'
                                : 'border-transparent hover:bg-muted/60 text-muted-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span className="truncate">{meta.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Customer Account Status Checkboxes */}
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Status do Cadastro do Cliente
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['ACTIVE', 'INACTIVE'] as const).map((cst) => {
                        const checked = urlCustomerStatuses.includes(cst)
                        return (
                          <label
                            key={cst}
                            onClick={() => toggleCustomerStatus(cst)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none ${
                              checked
                                ? 'bg-primary/10 border-primary/50 text-foreground font-semibold'
                                : 'border-border/60 hover:bg-muted/60 text-muted-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              className="rounded border-input text-primary h-3.5 w-3.5"
                            />
                            <span>{cst === 'ACTIVE' ? 'Clientes Ativos' : 'Clientes Inativos'}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={urlOnlyWithOrders}
                        onChange={(e) =>
                          updateUrlParams({ onlyWithOrders: e.target.checked ? 'true' : null })
                        }
                        className="rounded border-input text-primary h-3.5 w-3.5"
                      />
                      <span>Apenas clientes com pedidos</span>
                    </label>
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => setStatusDropdownOpen(false)}
                    >
                      Concluir
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Period Filter */}
            <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 h-8">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={urlPeriod}
                onChange={(e) => updateUrlParams({ period: e.target.value, viewId: null })}
                aria-label="Período dos pedidos"
                className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todo o Período</option>
                <option value="TODAY">Hoje</option>
                <option value="THIS_WEEK">Esta Semana</option>
                <option value="THIS_MONTH">Este Mês</option>
                <option value="LAST_MONTH">Mês Passado</option>
                <option value="90D">Últimos 90 Dias</option>
                <option value="THIS_YEAR">Este Ano</option>
                <option value="CUSTOM">Datas Personalizadas...</option>
              </select>
            </div>

            {urlPeriod === 'CUSTOM' && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={urlDateFrom}
                  onChange={(e) => updateUrlParams({ from: e.target.value, viewId: null })}
                  className="h-8 text-xs w-34"
                  aria-label="Data inicial"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={urlDateTo}
                  onChange={(e) => updateUrlParams({ to: e.target.value, viewId: null })}
                  className="h-8 text-xs w-34"
                  aria-label="Data final"
                />
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={expandOrCollapseAllVisible}
              className="h-8 text-xs px-2.5"
            >
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {customerList.length > 0 && customerList.every((c) => expandedCustomerIds.has(c.id))
                ? 'Recolher Pedidos'
                : 'Expandir Todos'}
            </Button>
          </div>
        </div>

        {/* Active Multi-Select Status Pills Bar */}
        {(urlOrderStatuses.length > 0 || urlCustomerStatuses.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
            <span className="text-[11px] text-muted-foreground mr-1">Filtros ativos:</span>
            {urlCustomerStatuses.map((cst) => (
              <Badge
                key={cst}
                variant="secondary"
                className="text-[10px] gap-1 pl-2 pr-1 py-0.5 cursor-pointer"
                onClick={() => toggleCustomerStatus(cst)}
              >
                Cliente: {cst === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
            {urlOrderStatuses.map((ost) => (
              <Badge
                key={ost}
                variant={ORDER_STATUS_META[ost]?.badgeVariant || 'default'}
                className="text-[10px] gap-1 pl-2 pr-1 py-0.5 cursor-pointer"
                onClick={() => toggleOrderStatus(ost)}
              >
                Pedido: {ORDER_STATUS_META[ost]?.label || ost}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* CUSTOMERS & LINKED ORDERS TABLE (Viewport-fitted with pinned bottom Pagination matching /expiration) */}
      <Card className="flex-1 min-h-0 flex flex-col border border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6 flex-1 min-h-0 overflow-auto">
              <LoadingSkeleton count={5} />
            </div>
          ) : customerList.length === 0 ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-6">
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="Nenhum cliente ou pedido encontrado para este filtro"
                description="Altere a seleção múltipla de status, limpe o filtro de URL ou cadastre um novo cliente."
                actionLabel={hasAnyActiveFilter ? 'Limpar Filtros Aplicados' : 'Adicionar Cliente'}
                onAction={hasAnyActiveFilter ? handleClearAllFilters : handleOpenCreate}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-8"></th>
                    <th className="py-2.5 px-4 font-semibold">Cliente / Documento</th>
                    <th className="py-2.5 px-4 font-semibold">Contato</th>
                    <th className="py-2.5 px-4 font-semibold">Pedidos Realizados (Links Diretos)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Total Gasto</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                {customerList.map((customer) => {
                  const orders = customer.filtered_orders || customer.orders || []
                  const isExpanded = expandedCustomerIds.has(customer.id)

                  return (
                    <React.Fragment key={customer.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandCustomer(customer.id)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title={isExpanded ? 'Recolher pedidos do cliente' : 'Ver todos os pedidos deste cliente'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-primary" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateUrlParams(
                                  {
                                    customerId: urlCustomerId === customer.id ? null : customer.id,
                                  },
                                  false
                                )
                              }
                              className="font-semibold text-foreground hover:text-primary text-left cursor-pointer"
                              title="Filtrar URL por este cliente"
                            >
                              {customer.name}
                            </button>
                          </div>
                          {customer.document && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                              <FileText className="h-3 w-3" />
                              {customer.document}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 space-y-1">
                          {customer.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {customer.email}
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            {customer.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.whatsapp && (
                              <a
                                href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                {customer.whatsapp}
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Direct Clickable Links to Customer's Orders */}
                        <td className="py-3 px-4">
                          {orders.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Sem pedidos neste filtro
                            </span>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {orders.slice(0, 4).map((ord) => {
                                  const meta = ORDER_STATUS_META[ord.status]
                                  const isHighlighted = urlOrderId === ord.id || urlOrderId === ord.order_number
                                  return (
                                    <button
                                      key={ord.id}
                                      type="button"
                                      onClick={() => handleSelectOrderOnScreen(customer, ord)}
                                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono border transition-all cursor-pointer ${
                                        isHighlighted
                                          ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30 font-bold'
                                          : 'bg-muted/50 hover:bg-primary/10 border-border hover:border-primary/40 text-foreground'
                                      }`}
                                      title={`Ver pedido #${ord.order_number} de ${formatDateTime(ord.created_at)} (${meta?.label || ord.status})`}
                                    >
                                      <ShoppingBag className="h-3 w-3 text-primary shrink-0" />
                                      <span className="font-semibold">#{ord.order_number}</span>
                                      <Badge
                                        variant={meta?.badgeVariant || 'default'}
                                        className="text-[9px] px-1 py-0"
                                      >
                                        {meta?.label || ord.status}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatCurrency(ord.total_amount)}
                                      </span>
                                    </button>
                                  )
                                })}
                                {orders.length > 4 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandCustomer(customer.id)}
                                    className="text-xs text-primary hover:underline font-medium px-1.5 py-0.5 cursor-pointer"
                                  >
                                    +{orders.length - 4} mais...
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandCustomer(customer.id)}
                                  className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  {isExpanded
                                    ? 'Ocultar lista detalhada'
                                    : `Abrir todos os ${orders.length} pedido(s) na tela`}
                                </button>
                                {customer.last_order_at && (
                                  <span>· Última compra: {formatDateTime(customer.last_order_at)}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(customer.total_spent || 0)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {orders.length} pedido(s)
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {customer.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpandCustomer(customer.id)}
                              title="Ver pedidos detalhados do cliente"
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                            {hasPermission('customers:write') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(customer)}
                                  title="Editar cliente"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingCustomer(customer)}
                                  title="Remover cliente"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SUB-TABLE: ALL ORDERS OF THIS CUSTOMER WITH FULL DETAILS & LINKS */}
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="p-4 border-b border-border">
                            <div className="rounded-xl border border-border bg-card p-3 space-y-3 shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
                                <div className="flex items-center gap-2">
                                  <ShoppingBag className="h-4 w-4 text-primary" />
                                  <span className="text-xs font-bold text-foreground">
                                    Histórico de Pedidos de {customer.name} ({orders.length})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    to={`/customers?customerId=${customer.id}`}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    URL exclusiva deste cliente
                                  </Link>
                                </div>
                              </div>

                              {orders.length === 0 ? (
                                <div className="text-xs text-muted-foreground py-3 text-center">
                                  Nenhum pedido encontrado para este cliente com os filtros atuais.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-border text-[10px] uppercase text-muted-foreground bg-muted/40">
                                        <th className="py-2 px-3">Nº Pedido (Link)</th>
                                        <th className="py-2 px-3">Data e Hora</th>
                                        <th className="py-2 px-3">Canal / Pagamento</th>
                                        <th className="py-2 px-3">Itens Comprados</th>
                                        <th className="py-2 px-3 text-right">Subtotal / Desc.</th>
                                        <th className="py-2 px-3 text-right">Total</th>
                                        <th className="py-2 px-3 text-center">Status</th>
                                        <th className="py-2 px-3 text-right">Link / Detalhes</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                      {orders.map((ord) => {
                                        const stMeta = ORDER_STATUS_META[ord.status]
                                        return (
                                          <tr key={ord.id} className="hover:bg-muted/30">
                                            <td className="py-2 px-3 font-mono font-bold">
                                              <button
                                                type="button"
                                                onClick={() => handleSelectOrderOnScreen(customer, ord)}
                                                className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                              >
                                                #{ord.order_number}
                                                <ExternalLink className="h-3 w-3" />
                                              </button>
                                            </td>
                                            <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">
                                              {formatDateTime(ord.created_at)}
                                            </td>
                                            <td className="py-2 px-3">
                                              <div className="font-medium text-foreground">
                                                {CHANNEL_LABELS[ord.channel] || ord.channel}
                                              </div>
                                              <div className="text-[10px] text-muted-foreground">
                                                {ord.payments.length > 0
                                                  ? ord.payments
                                                      .map((p) => PAYMENT_METHOD_LABELS[p.method] || p.method)
                                                      .join(', ')
                                                  : 'Pagamento padrão'}
                                              </div>
                                            </td>
                                            <td className="py-2 px-3 max-w-md">
                                              {ord.items.length === 0 ? (
                                                <span className="text-muted-foreground">-</span>
                                              ) : (
                                                <div className="space-y-0.5">
                                                  {ord.items.map((it) => (
                                                    <div key={it.id} className="text-[11px] truncate">
                                                      <span className="font-mono font-semibold text-foreground">
                                                        {it.quantity}x
                                                      </span>{' '}
                                                      <span>{it.product_name}</span>{' '}
                                                      <span className="text-muted-foreground font-mono">
                                                        ({formatCurrency(it.unit_price)})
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                                              <div>{formatCurrency(ord.subtotal)}</div>
                                              {ord.discount_amount > 0 && (
                                                <div className="text-[10px] text-rose-500">
                                                  -{formatCurrency(ord.discount_amount)}
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                                              {formatCurrency(ord.total_amount)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <Badge variant={stMeta?.badgeVariant || 'default'} className="text-[10px]">
                                                {stMeta?.label || ord.status}
                                              </Badge>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                              <div className="flex items-center justify-end gap-1">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-7 text-[11px] px-2"
                                                  onClick={() => handleSelectOrderOnScreen(customer, ord)}
                                                >
                                                  <Eye className="h-3 w-3 mr-1" />
                                                  Abrir Pedido
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  onClick={() => handleCopyOrderLink(customer.id, ord.id)}
                                                  title="Copiar link direto deste pedido"
                                                >
                                                  <Copy className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
          <Pagination
            currentPage={urlPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={urlPageSize}
            onPageChange={(p) => updateUrlParams({ page: String(p) }, false)}
            onPageSizeChange={(s) => updateUrlParams({ pageSize: String(s), page: '1' }, false)}
          />
        </div>
      </Card>

      {/* MODAL: DETALHES COMPLETOS DO PEDIDO DO CLIENTE (Acionado por clique ou URL ?orderId=...) */}
      <Modal
        isOpen={Boolean(viewingOrder)}
        onClose={handleCloseOrderModal}
        title={viewingOrder ? `Detalhes do Pedido #${viewingOrder.order_number}` : 'Pedido'}
        description={
          viewingOrder
            ? `Registrado em ${formatDateTime(viewingOrder.created_at)} · Cliente: ${
                viewingCustomerForOrder?.name || viewingOrder.customer_name || 'Consumidor Final'
              }`
            : ''
        }
        maxWidth="lg"
      >
        {viewingOrder && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                  Status do Pedido
                </div>
                <Badge
                  variant={ORDER_STATUS_META[viewingOrder.status]?.badgeVariant || 'default'}
                >
                  {ORDER_STATUS_META[viewingOrder.status]?.label || viewingOrder.status}
                </Badge>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                  Canal de Origem
                </div>
                <div className="text-xs font-semibold text-foreground">
                  {CHANNEL_LABELS[viewingOrder.channel] || viewingOrder.channel}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                  Data e Hora Exata
                </div>
                <div className="text-xs font-mono text-foreground">
                  {formatDateTime(viewingOrder.created_at)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    handleCopyOrderLink(
                      viewingCustomerForOrder?.id || viewingOrder.customer_id,
                      viewingOrder.id
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copiar Link Direto
                </Button>
                <Link to={`/orders?orderId=${viewingOrder.id}`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Abrir em Pedidos
                  </Button>
                </Link>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground border-b border-border">
                Itens e Produtos do Pedido ({viewingOrder.items.length})
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Produto</th>
                    <th className="py-2 px-3 text-center">Qtd</th>
                    <th className="py-2 px-3 text-right">Preço Unit.</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viewingOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3 font-mono text-muted-foreground">
                        {item.product_sku}
                      </td>
                      <td className="py-2 px-3 font-medium text-foreground">
                        {item.product_name}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payments & Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-border rounded-xl p-3 space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  Pagamentos Registrados
                </div>
                {viewingOrder.payments.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Nenhum pagamento detalhado vinculado.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {viewingOrder.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs bg-muted/30 px-2.5 py-1.5 rounded-lg"
                      >
                        <span className="font-medium">
                          {PAYMENT_METHOD_LABELS[p.method] || p.method}
                        </span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-border rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal dos Itens:</span>
                  <span className="font-mono">{formatCurrency(viewingOrder.subtotal)}</span>
                </div>
                {viewingOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Desconto Aplicado:</span>
                    <span className="font-mono">-{formatCurrency(viewingOrder.discount_amount)}</span>
                  </div>
                )}
                {viewingOrder.shipping_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de Entrega:</span>
                    <span className="font-mono">{formatCurrency(viewingOrder.shipping_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t border-border">
                  <span>Total do Pedido:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(viewingOrder.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {(viewingOrder.notes || viewingOrder.cancellation_reason) && (
              <div className="text-xs bg-muted/30 border border-border rounded-lg p-3">
                <strong>Observações:</strong>{' '}
                {viewingOrder.cancellation_reason || viewingOrder.notes}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={handleCloseOrderModal}>
                Fechar Detalhes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: SALVAR VISÃO DE FILTROS NO BANCO DE DADOS (Individual por Loja/Filial) */}
      <Modal
        isOpen={isSaveViewModalOpen}
        onClose={() => setIsSaveViewModalOpen(false)}
        title={editingViewId ? 'Atualizar Visão da Unidade' : 'Salvar Visão de Filtros no Banco'}
        description={`Esta visão ficará salva no banco de dados exclusivamente para a unidade ${effectiveStoreName}.`}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveViewMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="view-name">Nome da Visão *</Label>
            <Input
              id="view-name"
              required
              placeholder="Ex: Pedidos em Aberto da Semana, Clientes VIP Entregues..."
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="view-desc">Descrição (Opcional)</Label>
            <Input
              id="view-desc"
              placeholder="Ex: Acompanhamento diário da fila de pedidos pendentes e em separação"
              value={viewDescription}
              onChange={(e) => setViewDescription(e.target.value)}
            />
          </div>

          <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-1.5 text-xs">
            <div className="font-semibold text-foreground">Resumo dos Filtros que serão salvos:</div>
            <div className="text-muted-foreground">
              • <strong>Unidade / Filial:</strong> {effectiveStoreName}
            </div>
            <div className="text-muted-foreground">
              • <strong>Status de Pedidos:</strong>{' '}
              {urlOrderStatuses.length > 0
                ? urlOrderStatuses.map((s) => ORDER_STATUS_META[s]?.label || s).join(', ')
                : 'Todos os status'}
            </div>
            <div className="text-muted-foreground">
              • <strong>Status de Clientes:</strong>{' '}
              {urlCustomerStatuses.length > 0 ? urlCustomerStatuses.join(', ') : 'Todos'}
            </div>
            <div className="text-muted-foreground">
              • <strong>Período:</strong> {urlPeriod}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={viewIsDefault}
              onChange={(e) => setViewIsDefault(e.target.checked)}
              className="rounded border-input text-primary h-4 w-4"
            />
            <span>Definir como visão padrão ao abrir a tela nesta loja/filial</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsSaveViewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saveViewMutation.isPending}>
              <BookmarkCheck className="h-4 w-4 mr-1.5" />
              Salvar Visão no Banco
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="cust-name">Nome Completo / Razão Social *</Label>
            <Input
              id="cust-name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cust-doc">CPF / CNPJ</Label>
              <Input
                id="cust-doc"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cust-email">E-mail</Label>
              <Input
                id="cust-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cust-phone">Telefone</Label>
              <Input
                id="cust-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cust-whatsapp">WhatsApp</Label>
              <Input
                id="cust-whatsapp"
                placeholder="5511999999999"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cust-notes">Observações</Label>
            <textarea
              id="cust-notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Remover Cliente"
        description={`Tem certeza que deseja remover "${deletingCustomer?.name}"?`}
        confirmText="Remover"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
