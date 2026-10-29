import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatCurrency } from '@/utils/currency'
import { formatDate, formatDateTime } from '@/utils/dates'
import { exportToCSV, printFormattedDocument } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  TrendingUp,
  Download,
  Printer,
  DollarSign,
  Layers,
  Search,
  AlertTriangle,
  ShoppingCart,
  Percent,
  PieChart,
  BarChart3,
  ShieldAlert,
  Filter,
  Users,
  Activity,
  Wallet,
  Building2,
  RefreshCw,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Clock,
  Receipt,
} from 'lucide-react'
import type {
  ValuationReportItem,
  AbcCurveItem,
  PurchasingReportItem,
  LossesReportItem,
  StockoutReportItem,
  SalesReportItem,
  ConsumptionDemandReportItem,
  CustomerTicketReportItem,
  CapitalInvestmentReportItem,
  ReportDateRangeParams,
} from '@/types/report.types'

type ReportTab =
  | 'valuation'
  | 'abc'
  | 'demand'
  | 'customers'
  | 'investment'
  | 'purchasing'
  | 'losses'
  | 'stockouts'
  | 'sales'

type ReportPeriodPreset =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom'

const VALID_REPORT_TABS: ReportTab[] = [
  'valuation',
  'abc',
  'demand',
  'customers',
  'investment',
  'purchasing',
  'losses',
  'stockouts',
  'sales',
]

const DEFAULT_REPORT_FILTERS = {
  tab: 'valuation',
  category: 'ALL',
  status: 'ALL',
  period: 'all',
  from: '',
  to: '',
}

function computeReportDateRange(
  preset: ReportPeriodPreset,
  customFrom: string,
  customTo: string
): ReportDateRangeParams {
  const now = new Date()
  const toYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  if (preset === 'today') {
    const today = toYMD(now)
    return { dateFrom: today, dateTo: today }
  }
  if (preset === 'week') {
    const d = new Date(now)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return { dateFrom: toYMD(d), dateTo: toYMD(now) }
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { dateFrom: toYMD(start), dateTo: toYMD(now) }
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { dateFrom: toYMD(start), dateTo: toYMD(end) }
  }
  if (preset === 'quarter') {
    const d = new Date(now)
    d.setDate(d.getDate() - 90)
    return { dateFrom: toYMD(d), dateTo: toYMD(now) }
  }
  if (preset === 'year') {
    const start = new Date(now.getFullYear(), 0, 1)
    return { dateFrom: toYMD(start), dateTo: toYMD(now) }
  }
  if (preset === 'custom') {
    return {
      dateFrom: customFrom || null,
      dateTo: customTo || null,
    }
  }
  return { dateFrom: null, dateTo: null }
}

const ORDER_STATUS_BADGE_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'Em Preparo',
  READY: 'Pronto',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export function ReportsPage() {
  const { storeId, storeName, userStores } = useTenant()
  const { t } = useI18n()
  const reportTableRef = React.useRef<HTMLDivElement>(null)

  const {
    page,
    pageSize,
    search,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    setFilters,
  } = useTablePagination({
    defaultPage: 1,
    defaultPageSize: 15,
    defaultFilters: DEFAULT_REPORT_FILTERS,
  })

  const urlTab = VALID_REPORT_TABS.includes(filters.tab as ReportTab)
    ? (filters.tab as ReportTab)
    : 'valuation'

  const [activeTab, setActiveTab] = React.useState<ReportTab>(urlTab)
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>(storeId || 'all')
  const [expandedCustomerIds, setExpandedCustomerIds] = React.useState<Set<string>>(new Set())

  const periodPreset = ((filters.period as ReportPeriodPreset) || 'all') as ReportPeriodPreset
  const customDateFrom = filters.from || ''
  const customDateTo = filters.to || ''

  const effectiveDateRange = React.useMemo(
    () => computeReportDateRange(periodPreset, customDateFrom, customDateTo),
    [periodPreset, customDateFrom, customDateTo]
  )

  const toggleExpandCustomerOrders = (customerId: string) => {
    setExpandedCustomerIds((prev) => {
      const next = new Set(prev)
      if (next.has(customerId)) next.delete(customerId)
      else next.add(customerId)
      return next
    })
  }

  React.useEffect(() => {
    setActiveTab(urlTab)
  }, [urlTab])

  React.useEffect(() => {
    if (storeId) {
      setSelectedStoreId(storeId)
    }
  }, [storeId])

  const effectiveStoreId = selectedStoreId || storeId || 'all'
  const effectiveStoreName = React.useMemo(() => {
    if (effectiveStoreId === 'all') return 'Todas as Lojas (Consolidado)'
    const found = userStores.find((s) => s.storeId === effectiveStoreId)
    return found?.storeName || storeName || 'Loja'
  }, [effectiveStoreId, userStores, storeName])

  const categoryFilter = filters.category || 'ALL'
  const statusFilter = filters.status || 'ALL'

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab)
    setFilters({
      tab,
      status: 'ALL',
      category: 'ALL',
      period: periodPreset,
      from: customDateFrom,
      to: customDateTo,
    })
    requestAnimationFrame(() => {
      reportTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handlePeriodPresetChange = (preset: ReportPeriodPreset) => {
    setFilters({
      ...filters,
      tab: activeTab,
      period: preset,
      from: preset === 'custom' ? customDateFrom : '',
      to: preset === 'custom' ? customDateTo : '',
    })
    setPage(1)
  }

  const handleCustomDateChange = (field: 'from' | 'to', val: string) => {
    setFilters({
      ...filters,
      tab: activeTab,
      period: 'custom',
      [field]: val,
    })
    setPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleCategoryChange = (val: string) => {
    setFilter('category', val)
    setPage(1)
  }

  const handleStatusChange = (val: string) => {
    setFilter('status', val)
    setPage(1)
  }

  const handlePageSizeChange = (val: number) => {
    setPageSize(val)
    setPage(1)
  }

  // 1. Retail Summary KPIs
  const { data: summaryKPIs, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['report-retail-summary', effectiveStoreId],
    queryFn: () => reportService.getRetailSummaryKPIs(effectiveStoreId),
  })

  // 2. Valuation Report Query (always loaded so categories & base metrics are ready)
  const { data: valuationData = [], isLoading: isValuationLoading, isError: isValuationError, refetch: refetchValuation } = useQuery({
    queryKey: ['report-valuation', effectiveStoreId],
    queryFn: () => reportService.getValuationReport(effectiveStoreId),
  })

  // 3. ABC Curve Report Query
  const { data: abcData = [], isLoading: isAbcLoading, isError: isAbcError, refetch: refetchAbc } = useQuery({
    queryKey: ['report-abc', effectiveStoreId],
    queryFn: () => reportService.getAbcCurveReport(effectiveStoreId),
    enabled: activeTab === 'abc',
  })

  // 4. Purchasing Report Query (supports Date/Time period filtering)
  const { data: purchasingData = [], isLoading: isPurchasingLoading, isError: isPurchasingError, refetch: refetchPurchasing } = useQuery({
    queryKey: ['report-purchasing', effectiveStoreId, effectiveDateRange.dateFrom, effectiveDateRange.dateTo],
    queryFn: () => reportService.getPurchasingReport(effectiveStoreId, effectiveDateRange),
    enabled: activeTab === 'purchasing',
  })

  // 5. Losses Report Query (supports Date/Time period filtering)
  const { data: lossesData = [], isLoading: isLossesLoading, isError: isLossesError, refetch: refetchLosses } = useQuery({
    queryKey: ['report-losses', effectiveStoreId, effectiveDateRange.dateFrom, effectiveDateRange.dateTo],
    queryFn: () => reportService.getLossesReport(effectiveStoreId, effectiveDateRange),
    enabled: activeTab === 'losses',
  })

  // 6. Stockouts Report Query
  const { data: stockoutsData = [], isLoading: isStockoutsLoading, isError: isStockoutsError, refetch: refetchStockouts } = useQuery({
    queryKey: ['report-stockouts', effectiveStoreId],
    queryFn: () => reportService.getStockoutsReport(effectiveStoreId),
    enabled: activeTab === 'stockouts',
  })

  // 7. Sales Report Query (supports Date/Time period filtering)
  const { data: salesData = [], isLoading: isSalesLoading, isError: isSalesError, refetch: refetchSales } = useQuery({
    queryKey: ['report-sales', effectiveStoreId, effectiveDateRange.dateFrom, effectiveDateRange.dateTo],
    queryFn: () => reportService.getSalesPerformanceReport(effectiveStoreId, effectiveDateRange),
    enabled: activeTab === 'sales',
  })

  // 8. Demand & Consumption Query
  const { data: demandData = [], isLoading: isDemandLoading, isError: isDemandError, refetch: refetchDemand } = useQuery({
    queryKey: ['report-demand', effectiveStoreId],
    queryFn: () => reportService.getConsumptionDemandReport(effectiveStoreId),
    enabled: activeTab === 'demand',
  })

  // 9. Customers & LTV Query (supports Date/Time period filtering & lists orders per customer)
  const { data: customersData = [], isLoading: isCustomersLoading, isError: isCustomersError, refetch: refetchCustomers } = useQuery({
    queryKey: ['report-customers', effectiveStoreId, effectiveDateRange.dateFrom, effectiveDateRange.dateTo],
    queryFn: () => reportService.getCustomerTicketReport(effectiveStoreId, effectiveDateRange),
    enabled: activeTab === 'customers',
  })

  // 10. Capital Investment Query
  const { data: investmentData = [], isLoading: isInvestmentLoading, isError: isInvestmentError, refetch: refetchInvestment } = useQuery({
    queryKey: ['report-investment', effectiveStoreId],
    queryFn: () => reportService.getCapitalInvestmentReport(effectiveStoreId),
    enabled: activeTab === 'investment',
  })

  // Unique categories for filters
  const categories = React.useMemo(() => {
    const set = new Set<string>()
    valuationData.forEach((i) => {
      if (i.categoryName && i.categoryName !== 'Sem categoria') set.add(i.categoryName)
    })
    return Array.from(set)
  }, [valuationData])

  // Client-side filtering & pagination helper
  const { currentItems, totalFiltered } = React.useMemo(() => {
    const q = search.trim().toLowerCase()

    if (activeTab === 'valuation') {
      let filtered = valuationData
      if (categoryFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.categoryName === categoryFilter)
      }
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.status === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.productName.toLowerCase().includes(q) ||
            i.productSku.toLowerCase().includes(q) ||
            i.categoryName.toLowerCase().includes(q)
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'abc') {
      let filtered = abcData
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.classification === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.productName.toLowerCase().includes(q) ||
            i.productSku.toLowerCase().includes(q) ||
            i.categoryName.toLowerCase().includes(q)
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'demand') {
      let filtered = demandData
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.urgency === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.productName.toLowerCase().includes(q) ||
            i.productSku.toLowerCase().includes(q) ||
            i.categoryName.toLowerCase().includes(q)
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'customers') {
      let filtered = customersData
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.customerSegment === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.customerName.toLowerCase().includes(q) ||
            (i.document && i.document.toLowerCase().includes(q)) ||
            (i.phone && i.phone.toLowerCase().includes(q)) ||
            (i.email && i.email.toLowerCase().includes(q)) ||
            i.topChannel.toLowerCase().includes(q) ||
            (i.orders || []).some(
              (o) =>
                o.orderNumber.toLowerCase().includes(q) ||
                o.itemsSummary.toLowerCase().includes(q)
            )
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'investment') {
      let filtered = investmentData
      if (q) {
        filtered = filtered.filter((i) => i.categoryName.toLowerCase().includes(q))
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'purchasing') {
      let filtered = purchasingData
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.status === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.orderNumber.toLowerCase().includes(q) ||
            i.supplierName.toLowerCase().includes(q) ||
            (i.itemsSummary && i.itemsSummary.toLowerCase().includes(q))
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'losses') {
      let filtered = lossesData
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.productName.toLowerCase().includes(q) ||
            i.productSku.toLowerCase().includes(q) ||
            i.reasonLabel.toLowerCase().includes(q) ||
            (i.costCenterCode && i.costCenterCode.toLowerCase().includes(q)) ||
            i.operatorName.toLowerCase().includes(q)
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'stockouts') {
      let filtered = stockoutsData
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.urgency === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.productName.toLowerCase().includes(q) ||
            i.productSku.toLowerCase().includes(q) ||
            i.categoryName.toLowerCase().includes(q)
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    if (activeTab === 'sales') {
      let filtered = salesData
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.status === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.orderNumber.toLowerCase().includes(q) ||
            i.customerName.toLowerCase().includes(q) ||
            i.channel.toLowerCase().includes(q) ||
            (i.itemsSummary && i.itemsSummary.toLowerCase().includes(q))
        )
      }
      const total = filtered.length
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
      return { currentItems: paged, totalFiltered: total }
    }

    return { currentItems: [], totalFiltered: 0 }
  }, [
    activeTab,
    search,
    categoryFilter,
    statusFilter,
    page,
    pageSize,
    valuationData,
    abcData,
    demandData,
    customersData,
    investmentData,
    purchasingData,
    lossesData,
    stockoutsData,
    salesData,
  ])

  const totalPages = Math.ceil(totalFiltered / pageSize) || 1
  const isCurrentTabLoading =
    activeTab === 'valuation'
      ? isValuationLoading
      : activeTab === 'abc'
      ? isAbcLoading
      : activeTab === 'demand'
      ? isDemandLoading
      : activeTab === 'customers'
      ? isCustomersLoading
      : activeTab === 'investment'
      ? isInvestmentLoading
      : activeTab === 'purchasing'
      ? isPurchasingLoading
      : activeTab === 'losses'
      ? isLossesLoading
      : activeTab === 'stockouts'
      ? isStockoutsLoading
      : isSalesLoading

  const isCurrentTabError =
    activeTab === 'valuation'
      ? isValuationError
      : activeTab === 'abc'
      ? isAbcError
      : activeTab === 'demand'
      ? isDemandError
      : activeTab === 'customers'
      ? isCustomersError
      : activeTab === 'investment'
      ? isInvestmentError
      : activeTab === 'purchasing'
      ? isPurchasingError
      : activeTab === 'losses'
      ? isLossesError
      : activeTab === 'stockouts'
      ? isStockoutsError
      : isSalesError

  const handleRefreshCurrentTab = () => {
    refetchSummary()
    if (activeTab === 'valuation') refetchValuation()
    else if (activeTab === 'abc') refetchAbc()
    else if (activeTab === 'demand') refetchDemand()
    else if (activeTab === 'customers') refetchCustomers()
    else if (activeTab === 'investment') refetchInvestment()
    else if (activeTab === 'purchasing') refetchPurchasing()
    else if (activeTab === 'losses') refetchLosses()
    else if (activeTab === 'stockouts') refetchStockouts()
    else if (activeTab === 'sales') refetchSales()
  }

  // Export CSV handler per active tab — exports ONLY what is currently visible on screen (currentItems) with full details
  const handleExportCSV = () => {
    const filenamePrefix = `relatorio_${activeTab}_visiveis_${effectiveStoreName.toLowerCase().replace(/\s+/g, '_')}`

    if (activeTab === 'valuation') {
      exportToCSV(
        filenamePrefix,
        currentItems as ValuationReportItem[],
        [
          { header: 'Produto', key: 'productName' },
          { header: 'SKU', key: 'productSku' },
          { header: 'Categoria', key: 'categoryName' },
          { header: 'Unidade', key: 'unit' },
          { header: 'Saldo Atual', key: 'quantity' },
          { header: 'Estoque Mínimo', key: 'minStock' },
          { header: 'Custo Unitário (R$)', key: 'costPrice' },
          { header: 'Preço Venda Unit. (R$)', key: 'sellingPrice' },
          { header: 'Valor Total em Custo (R$)', key: 'totalCostValue' },
          { header: 'Valor Total em Venda (R$)', key: 'totalSellingValue' },
          { header: 'Lucro Projetado (R$)', key: 'potentialProfit' },
          { header: 'Margem %', key: (r) => r.marginPercent.toFixed(2) },
          { header: 'Status', key: 'status' },
        ]
      )
    } else if (activeTab === 'abc') {
      exportToCSV(
        filenamePrefix,
        currentItems as AbcCurveItem[],
        [
          { header: 'Curva ABC', key: 'classification' },
          { header: 'Produto', key: 'productName' },
          { header: 'SKU', key: 'productSku' },
          { header: 'Categoria', key: 'categoryName' },
          { header: 'Saldo', key: 'quantity' },
          { header: 'Unidade', key: 'unit' },
          { header: 'Valor Total (R$)', key: 'totalValue' },
          { header: '% do Mix', key: (r) => r.percentOfTotal.toFixed(2) },
          { header: '% Acumulado', key: (r) => r.cumulativePercent.toFixed(2) },
          { header: 'Diretriz Estratégica', key: 'strategy' },
        ]
      )
    } else if (activeTab === 'demand') {
      exportToCSV(
        filenamePrefix,
        currentItems as ConsumptionDemandReportItem[],
        [
          { header: 'Urgência', key: 'urgency' },
          { header: 'Produto', key: 'productName' },
          { header: 'SKU', key: 'productSku' },
          { header: 'Categoria', key: 'categoryName' },
          { header: 'Saldo Atual', key: 'currentStock' },
          { header: 'Estoque Mínimo', key: 'minStock' },
          { header: 'Consumo Médio Diário', key: 'dailyConsumption' },
          { header: 'Vendas 30d (Qtd)', key: 'monthlySalesQty' },
          { header: 'Dias de Cobertura', key: (r) => (r.stockCoverageDays >= 999 ? 'Sem vendas' : r.stockCoverageDays) },
          { header: 'Sugestão Compra (Qtd)', key: 'suggestedPurchaseQty' },
          { header: 'Custo Unitário (R$)', key: 'unitCost' },
          { header: 'Investimento Sugerido (R$)', key: 'suggestedInvestment' },
        ]
      )
    } else if (activeTab === 'customers') {
      exportToCSV(
        filenamePrefix,
        currentItems as CustomerTicketReportItem[],
        [
          { header: 'Segmento', key: 'customerSegment' },
          { header: 'Cliente', key: 'customerName' },
          { header: 'Documento', key: (r) => r.document || '-' },
          { header: 'Telefone', key: (r) => r.phone || '-' },
          { header: 'E-mail', key: (r) => r.email || '-' },
          { header: 'Pedidos Válidos', key: 'totalOrders' },
          { header: 'Pedidos em Aberto', key: (r) => r.openOrdersCount ?? 0 },
          { header: 'Pedidos Fechados', key: (r) => r.closedOrdersCount ?? 0 },
          { header: 'Pedidos Cancelados', key: (r) => r.cancelledOrdersCount ?? 0 },
          { header: 'Gasto Acumulado (R$)', key: 'totalSpent' },
          { header: 'Ticket Médio (R$)', key: 'averageTicket' },
          { header: 'Última Compra (Data/Hora)', key: (r) => (r.lastOrderDate ? formatDateTime(r.lastOrderDate) : 'Nunca comprou') },
          { header: 'Dias sem Comprar', key: (r) => (r.daysSinceLastOrder >= 999 ? '-' : r.daysSinceLastOrder) },
          { header: 'Canal Mais Utilizado', key: 'topChannel' },
          {
            header: 'Detalhamento Completo dos Pedidos Visíveis (Nº | Data/Hora | Status | Pagamento | Itens | Valor)',
            key: (r) =>
              (r.orders || []).length === 0
                ? 'Sem pedidos no período'
                : (r.orders || [])
                    .map(
                      (o) =>
                        `[${o.orderNumber} em ${formatDateTime(o.createdAt)} | Status: ${
                          ORDER_STATUS_BADGE_LABELS[o.status] || o.status
                        } | Pagto: ${o.paymentMethods} | Itens: ${o.itemsSummary} | Total: ${formatCurrency(
                          o.totalAmount
                        )}]`
                    )
                    .join(' ; '),
          },
        ]
      )
    } else if (activeTab === 'investment') {
      exportToCSV(
        filenamePrefix,
        currentItems as CapitalInvestmentReportItem[],
        [
          { header: 'Categoria', key: 'categoryName' },
          { header: 'Qtd de SKUs', key: 'productsCount' },
          { header: 'Unidades Físicas', key: 'totalPhysicalUnits' },
          { header: 'Capital Investido (Custo R$)', key: 'totalInvestedCost' },
          { header: 'Potencial de Venda (R$)', key: 'totalSellingPotential' },
          { header: 'Lucro Projetado (R$)', key: 'potentialProfit' },
          { header: 'Margem %', key: (r) => r.marginPercent.toFixed(2) },
          { header: '% do Capital da Loja', key: (r) => r.shareOfTotalInvestment.toFixed(2) },
          { header: 'GMROI (Retorno s/ Estoque)', key: (r) => r.gmroi.toFixed(2) },
        ]
      )
    } else if (activeTab === 'purchasing') {
      exportToCSV(
        filenamePrefix,
        currentItems as PurchasingReportItem[],
        [
          { header: 'Nº Pedido Compra', key: 'orderNumber' },
          { header: 'Fornecedor', key: 'supplierName' },
          { header: 'Data/Hora Emissão', key: (r) => formatDateTime(r.issuedAt || r.createdAt) },
          { header: 'Data/Hora Recebimento', key: (r) => (r.receivedAt ? formatDateTime(r.receivedAt) : 'Aguardando') },
          { header: 'Qtd SKUs', key: 'itemsCount' },
          { header: 'Unidades Totais', key: (r) => r.totalUnitsOrdered ?? r.itemsCount },
          { header: 'Itens Detalhados da Compra', key: (r) => r.itemsSummary || '-' },
          { header: 'Custo Total Compra (R$)', key: 'totalCost' },
          { header: 'Venda Projetada (R$)', key: 'totalSellingValue' },
          { header: 'Lucro Previsto (R$)', key: 'potentialProfit' },
          { header: 'Margem %', key: (r) => r.marginPercent.toFixed(2) },
          { header: 'Status', key: 'status' },
        ]
      )
    } else if (activeTab === 'losses') {
      exportToCSV(
        filenamePrefix,
        currentItems as LossesReportItem[],
        [
          { header: 'Data/Hora', key: (r) => formatDateTime(r.createdAt) },
          { header: 'Produto', key: 'productName' },
          { header: 'SKU', key: 'productSku' },
          { header: 'Motivo da Baixa', key: 'reasonLabel' },
          { header: 'Centro de Custo', key: (r) => r.costCenterCode || '-' },
          { header: 'Quantidade', key: 'quantity' },
          { header: 'Custo Unit. (R$)', key: 'unitCost' },
          { header: 'Prejuízo Total (R$)', key: 'totalLossValue' },
          { header: 'Operador Responsável', key: 'operatorName' },
          { header: 'Observações', key: (r) => r.notes || '-' },
        ]
      )
    } else if (activeTab === 'stockouts') {
      exportToCSV(
        filenamePrefix,
        currentItems as StockoutReportItem[],
        [
          { header: 'Urgência', key: (r) => (r.urgency === 'CRITICAL' ? 'Ruptura Total' : 'Estoque Crítico') },
          { header: 'Produto', key: 'productName' },
          { header: 'SKU', key: 'productSku' },
          { header: 'Categoria', key: 'categoryName' },
          { header: 'Saldo Atual', key: 'quantity' },
          { header: 'Estoque Mínimo', key: 'minStock' },
          { header: 'Déficit para Reposição', key: 'deficit' },
          { header: 'Custo Estimado Reposição (R$)', key: 'replenishmentCost' },
        ]
      )
    } else if (activeTab === 'sales') {
      exportToCSV(
        filenamePrefix,
        currentItems as SalesReportItem[],
        [
          { header: 'Nº Pedido', key: 'orderNumber' },
          { header: 'Data/Hora Exata', key: (r) => formatDateTime(r.createdAt) },
          { header: 'Cliente', key: 'customerName' },
          { header: 'Documento Cliente', key: (r) => r.customerDocument || '-' },
          { header: 'Telefone Cliente', key: (r) => r.customerPhone || '-' },
          { header: 'Canal', key: 'channel' },
          { header: 'Forma de Pagamento', key: (r) => r.paymentMethods || 'Padrão' },
          { header: 'Qtd Itens', key: 'itemsCount' },
          { header: 'Itens Detalhados do Pedido', key: (r) => r.itemsSummary || '-' },
          { header: 'Subtotal (R$)', key: 'subtotal' },
          { header: 'Desconto (R$)', key: 'discountAmount' },
          { header: 'Total Pago (R$)', key: 'totalAmount' },
          { header: 'Status', key: (r) => ORDER_STATUS_BADGE_LABELS[r.status] || r.status },
        ]
      )
    }
  }

  // Print Executive Summary
  const handlePrintSummary = () => {
    const html = `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 6px 0;">Demonstrativo Executivo de Varejo - ${effectiveStoreName}</h2>
        <p style="color: #666; font-size: 13px; margin: 0;">Gerado em: ${new Date().toLocaleString('pt-BR')} · Relatório ativo: ${currentTabMeta.label}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Estoque em Custo</div>
          <div style="font-size: 18px; font-weight: bold;">${formatCurrency(summaryKPIs?.totalCostValue || 0)}</div>
        </div>
        <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Estoque em Venda</div>
          <div style="font-size: 18px; font-weight: bold; color: #16a34a;">${formatCurrency(summaryKPIs?.totalSellingValue || 0)}</div>
        </div>
        <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px;">
          <div style="font-size: 11px; color: #666; text-transform: uppercase;">Margem Bruta Média</div>
          <div style="font-size: 18px; font-weight: bold;">${(summaryKPIs?.marginPercent || 0).toFixed(1)}%</div>
        </div>
      </div>

      <h3>Posição de Ruptura e Reposição</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px;">
        <thead>
          <tr style="background-color: #f3f4f6; text-align: left;">
            <th style="padding: 8px; border: 1px solid #e5e7eb;">Produto</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb;">SKU</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Saldo Atual</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Estoque Mínimo</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Custo Reposição</th>
          </tr>
        </thead>
        <tbody>
          ${stockoutsData
            .slice(0, 15)
            .map(
              (it) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${it.productName}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${it.productSku}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: ${
                it.quantity === 0 ? '#dc2626' : '#d97706'
              }; font-weight: bold;">${it.quantity}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${it.minStock}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(
                it.replenishmentCost
              )}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    printFormattedDocument(`Relatório Executivo - ${effectiveStoreName}`, html)
  }

  const reportTabs = [
    {
      id: 'valuation' as const,
      label: 'Valorização & Lucro',
      shortLabel: 'Valorização',
      icon: Layers,
      color: 'text-blue-500',
      description: 'Valoração física a custo e venda, cálculo de markup e margem estimada por SKU.',
      badge: summaryKPIs?.totalPhysicalUnits ? `${summaryKPIs.totalPhysicalUnits} un.` : undefined,
    },
    {
      id: 'abc' as const,
      label: 'Curva ABC & Mix',
      shortLabel: 'Curva ABC',
      icon: PieChart,
      color: 'text-violet-500',
      description: 'Classificação de Pareto (80/15/5) para identificar produtos de maior impacto financeiro.',
      badge: '80/15/5',
    },
    {
      id: 'demand' as const,
      label: 'Giro & Compra por Consumo',
      shortLabel: 'Giro & Consumo',
      icon: Activity,
      color: 'text-indigo-500',
      description: 'Consumo médio diário, dias de cobertura restante e sugestão inteligente de reposição.',
      badge: demandData.filter((i) => i.urgency === 'URGENT').length > 0 ? `${demandData.filter((i) => i.urgency === 'URGENT').length} urgentes` : undefined,
      badgeVariant: 'destructive' as const,
    },
    {
      id: 'customers' as const,
      label: 'Ticket Médio & Clientes (LTV)',
      shortLabel: 'Ticket Médio',
      icon: Users,
      color: 'text-sky-500',
      description: 'Análise de ticket médio por compra, recência, canal preferido e segmentação de clientes.',
      badge: customersData.length > 0 ? `${customersData.length} clientes` : undefined,
    },
    {
      id: 'investment' as const,
      label: 'Investimento de Capital',
      shortLabel: 'Investimento',
      icon: Wallet,
      color: 'text-emerald-500',
      description: 'Levantamento de capital de giro investido por categoria de produto, margem e GMROI.',
      badge: investmentData.length > 0 ? `${investmentData.length} categorias` : undefined,
    },
    {
      id: 'purchasing' as const,
      label: 'Compras & Fornecedores',
      shortLabel: 'Compras',
      icon: ShoppingCart,
      color: 'text-teal-500',
      description: 'Histórico de aquisições com custo unitário real por fornecedor e lote de entrada.',
      badge: purchasingData.length > 0 ? `${purchasingData.length}` : undefined,
    },
    {
      id: 'losses' as const,
      label: 'Perdas & Baixas',
      shortLabel: 'Perdas',
      icon: ShieldAlert,
      color: 'text-rose-500',
      description: 'Registro detalhado de quebras, avarias e desvios com impacto no resultado.',
      badge: summaryKPIs?.totalLossValueMonth && summaryKPIs.totalLossValueMonth > 0 ? 'Atenção' : undefined,
      badgeVariant: 'destructive' as const,
    },
    {
      id: 'stockouts' as const,
      label: 'Ruptura & Reposição',
      shortLabel: 'Ruptura',
      icon: AlertTriangle,
      color: 'text-amber-500',
      description: 'Monitoramento de produtos esgotados ou operando abaixo do estoque mínimo.',
      badge: summaryKPIs?.stockoutCount && summaryKPIs.stockoutCount > 0 ? `${summaryKPIs.stockoutCount} zerado(s)` : undefined,
      badgeVariant: 'destructive' as const,
    },
    {
      id: 'sales' as const,
      label: 'Vendas & Desempenho',
      shortLabel: 'Vendas',
      icon: TrendingUp,
      color: 'text-teal-500',
      description: 'Consolidação de faturamento, volume de vendas, descontos e ticket por produto.',
      badge: summaryKPIs?.salesMonthTotal && summaryKPIs.salesMonthTotal > 0 ? 'Ativo' : undefined,
    },
  ]

  const currentTabMeta = reportTabs.find((t) => t.id === activeTab) || reportTabs[0]

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col space-y-2 animate-in fade-in duration-150">
      {/* Top Navbar Title & Global Actions */}
      <PageHeader title={t.nav.reports}>
        <div className="flex items-center gap-2 flex-wrap">
          {userStores.length > 0 && (
            <div className="flex items-center gap-1.5 bg-background/90 border border-input rounded-lg px-2.5 h-8 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <select
                value={effectiveStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value)
                  setPage(1)
                }}
                aria-label="Selecionar loja do relatório"
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">Todas as Lojas (Consolidado)</option>
                {userStores
                  .filter((s) => s.storeId !== 'all')
                  .map((s) => (
                    <option key={s.storeId} value={s.storeId}>
                      {s.storeName}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <Input
            placeholder="Buscar no relatório ativo..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 text-xs bg-background/90 w-48 sm:w-64"
            icon={<Search className="h-3.5 w-3.5" />}
          />
        </div>
      </PageHeader>

      {/* Retail Performance KPI Summary Bar (Compact 1-line pills matching /expiration) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => handleTabChange('valuation')}
          className={`px-2.5 py-1.5 rounded-lg border bg-card flex items-center justify-between cursor-pointer transition-all hover:border-primary/40 ${
            activeTab === 'valuation' ? 'ring-1 ring-primary/50 border-primary/50' : 'border-border'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate">
            <Layers className="h-3 w-3 text-blue-500 shrink-0" />
            Custo
          </span>
          <span className="text-xs font-bold font-mono text-foreground ml-1">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.totalCostValue || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('investment')}
          className={`px-2.5 py-1.5 rounded-lg border bg-card flex items-center justify-between cursor-pointer transition-all hover:border-primary/40 ${
            activeTab === 'investment' ? 'ring-1 ring-primary/50 border-primary/50' : 'border-border'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate">
            <DollarSign className="h-3 w-3 text-emerald-500 shrink-0" />
            Venda
          </span>
          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 ml-1">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.totalSellingValue || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('abc')}
          className={`px-2.5 py-1.5 rounded-lg border bg-card flex items-center justify-between cursor-pointer transition-all hover:border-primary/40 ${
            activeTab === 'abc' ? 'ring-1 ring-primary/50 border-primary/50' : 'border-border'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate">
            <Percent className="h-3 w-3 text-primary shrink-0" />
            Margem
          </span>
          <span className="text-xs font-bold font-mono text-foreground ml-1">
            {isSummaryLoading ? '...' : `${(summaryKPIs?.marginPercent || 0).toFixed(1)}%`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('sales')}
          className={`px-2.5 py-1.5 rounded-lg border bg-card flex items-center justify-between cursor-pointer transition-all hover:border-primary/40 ${
            activeTab === 'sales' ? 'ring-1 ring-primary/50 border-primary/50' : 'border-border'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate">
            <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
            Vendas Mês
          </span>
          <span className="text-xs font-bold font-mono text-foreground ml-1">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.salesMonthTotal || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('losses')}
          className={`px-2.5 py-1.5 rounded-lg border bg-card flex items-center justify-between cursor-pointer transition-all hover:border-primary/40 ${
            activeTab === 'losses' ? 'ring-1 ring-primary/50 border-primary/50' : 'border-border'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate">
            <ShieldAlert className="h-3 w-3 text-rose-500 shrink-0" />
            Perdas
          </span>
          <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400 ml-1">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.totalLossValueMonth || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('stockouts')}
          className={`px-2.5 py-1.5 rounded-lg border bg-card flex items-center justify-between cursor-pointer transition-all hover:border-primary/40 ${
            activeTab === 'stockouts' ? 'ring-1 ring-primary/50 border-primary/50' : 'border-border'
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 truncate">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            Ruptura
          </span>
          <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 ml-1">
            {isSummaryLoading ? '...' : `${summaryKPIs?.stockoutCount || 0} zerado(s)`}
          </span>
        </button>
      </div>

      {/* Reports Navigation Tabs & Action Bar */}
      <div className="space-y-1.5 flex-shrink-0">
        {/* Modern Segmented Navigation Bar */}
        <div className="bg-card border border-border rounded-xl p-1 shadow-xs" role="tablist" aria-label="Abas de Relatórios">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
            {reportTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex-1 sm:flex-initial justify-center sm:justify-start ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : tab.color}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>

                  {tab.badge && (
                    <span
                      className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : tab.badgeVariant === 'destructive'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Dynamic Contextual Toolbar: Report Info + Filters + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-muted/40 border border-border/80 rounded-xl px-3 py-1.5">
          {/* Active Report Description & Info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-card border border-border flex-shrink-0 shadow-2xs">
              {React.createElement(currentTabMeta.icon, {
                className: `h-3.5 w-3.5 ${currentTabMeta.color}`,
              })}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  {currentTabMeta.label}
                </span>
                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-mono font-normal">
                  {totalFiltered} {totalFiltered === 1 ? 'registro' : 'registros'}
                </Badge>
                <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-normal">
                  {effectiveStoreName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Filters & Export Actions Group */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
            {/* Period & Custom Date Filter */}
            <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 h-8 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <select
                value={periodPreset}
                onChange={(e) => handlePeriodPresetChange(e.target.value as ReportPeriodPreset)}
                aria-label="Filtrar período do relatório"
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">Período: Todo o Histórico</option>
                <option value="today">Hoje</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mês</option>
                <option value="last_month">Mês Passado</option>
                <option value="quarter">Últimos 90 Dias</option>
                <option value="year">Este Ano</option>
                <option value="custom">Data Personalizada (De / Até)</option>
              </select>
            </div>

            {periodPreset === 'custom' && (
              <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 h-8">
                <span className="text-[10px] font-semibold text-muted-foreground">De:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  className="bg-transparent text-xs font-mono text-foreground focus:outline-none"
                />
                <span className="text-[10px] font-semibold text-muted-foreground">Até:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  className="bg-transparent text-xs font-mono text-foreground focus:outline-none"
                />
              </div>
            )}

            {/* Dynamic Filter: Categories (Valuation) */}
            {activeTab === 'valuation' && categories.length > 0 && (
              <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 h-8">
                <Filter className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  aria-label="Filtrar por categoria"
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Todas Categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Filter: ABC Class */}
            {activeTab === 'abc' && (
              <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 h-8">
                <Filter className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  aria-label="Filtrar por classe ABC"
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Todas as Classes</option>
                  <option value="A">Classe A (80% Faturamento)</option>
                  <option value="B">Classe B (15% Faturamento)</option>
                  <option value="C">Classe C (5% Faturamento)</option>
                </select>
              </div>
            )}

            {/* Dynamic Filter: Demand Urgency */}
            {activeTab === 'demand' && (
              <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 h-8">
                <Activity className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  aria-label="Filtrar por urgência de compra"
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Todas as Urgências</option>
                  <option value="URGENT">Urgente (Ruptura / ≤ 7 dias)</option>
                  <option value="ATTENTION">Atenção (≤ 15 dias)</option>
                  <option value="NORMAL">Normal / Equilibrado</option>
                  <option value="OVERSTOCK">Sobra / Excesso (&gt; 60 dias)</option>
                </select>
              </div>
            )}

            {/* Dynamic Filter: Customer Segment */}
            {activeTab === 'customers' && (
              <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 h-8">
                <Users className="h-3 w-3 text-sky-500 flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  aria-label="Filtrar por segmento de cliente"
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Todos os Segmentos</option>
                  <option value="VIP">Clientes VIP (Alto LTV)</option>
                  <option value="FREQUENT">Clientes Frequentes</option>
                  <option value="OCCASIONAL">Clientes Ocasionais</option>
                  <option value="INACTIVE">Inativos (&gt; 60 dias)</option>
                </select>
              </div>
            )}

            {/* Dynamic Filter: Stockout Severity */}
            {activeTab === 'stockouts' && (
              <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 h-8">
                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  aria-label="Filtrar por gravidade"
                  className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Todas as Gravidades</option>
                  <option value="CRITICAL">Ruptura Total (Saldo 0)</option>
                  <option value="WARNING">Estoque Crítico (Abaixo Mín.)</option>
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshCurrentTab}
                className="h-8 text-xs px-2 bg-background hover:bg-muted/80 shadow-2xs cursor-pointer"
                title="Atualizar dados do relatório ativo"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isCurrentTabLoading ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={currentItems.length === 0}
                className="h-8 text-xs px-2.5 bg-background hover:bg-muted/80 shadow-2xs cursor-pointer"
                title="Exporta apenas os registros visíveis na tela atual com todos os detalhes dos pedidos"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Visíveis ({currentItems.length})</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSummary}
                className="h-8 text-xs px-2.5 bg-background hover:bg-muted/80 shadow-2xs cursor-pointer"
                title="Imprimir demonstrativo executivo consolidado"
              >
                <Printer className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <span>Imprimir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Table Card with Viewport Fitting & Pagination (matching /expiration) */}
      <div ref={reportTableRef} className="flex-1 min-h-0 flex flex-col">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
            {isCurrentTabLoading ? (
              <div className="p-6">
                <LoadingSkeleton count={8} />
              </div>
            ) : isCurrentTabError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
                <EmptyState
                  icon={<AlertTriangle className="h-10 w-10 text-amber-500" />}
                  title="Não foi possível carregar este relatório"
                  description="Verifique sua conexão ou clique em Atualizar para tentar novamente."
                />
                <Button variant="outline" size="sm" onClick={handleRefreshCurrentTab}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Tentar Novamente
                </Button>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <EmptyState
                  icon={<BarChart3 className="h-10 w-10 text-muted-foreground" />}
                  title="Nenhum registro encontrado"
                  description="Não há dados correspondentes para os filtros e parâmetros selecionados."
                />
              </div>
            ) : (
              <>
              {/* TAB 1: VALUATION REPORT */}
              {activeTab === 'valuation' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Produto</th>
                          <th className="py-3 px-4 font-semibold">SKU / Categoria</th>
                          <th className="py-3 px-4 font-semibold text-center">Saldo</th>
                          <th className="py-3 px-4 font-semibold text-right">Custo Unit.</th>
                          <th className="py-3 px-4 font-semibold text-right">Venda Unit.</th>
                          <th className="py-3 px-4 font-semibold text-right">Total Custo</th>
                          <th className="py-3 px-4 font-semibold text-right">Total Venda</th>
                          <th className="py-3 px-4 font-semibold text-right">Lucro Estimado</th>
                          <th className="py-3 px-4 font-semibold text-center">Margem %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as ValuationReportItem[]).map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              {row.productName}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">
                              <div className="font-mono text-foreground text-[11px]">{row.productSku}</div>
                              <div className="text-[10px]">{row.categoryName}</div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                                  row.quantity <= 0
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : row.quantity <= row.minStock
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {row.quantity} {row.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                              {formatCurrency(row.costPrice)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-foreground font-medium">
                              {formatCurrency(row.sellingPrice)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                              {formatCurrency(row.totalCostValue)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-foreground font-semibold">
                              {formatCurrency(row.totalSellingValue)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatCurrency(row.potentialProfit)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge
                                variant={row.marginPercent >= 30 ? 'success' : row.marginPercent > 0 ? 'warning' : 'secondary'}
                                className="font-mono text-[10px]"
                              >
                                {row.marginPercent.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as ValuationReportItem[]).map((row) => (
                      <article key={row.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground">{row.productName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {row.productSku} · {row.categoryName}
                            </div>
                          </div>
                          <Badge
                            variant={row.marginPercent >= 30 ? 'success' : 'secondary'}
                            className="font-mono text-[10px] shrink-0"
                          >
                            Margem: {row.marginPercent.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/40 p-2 rounded-lg">
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">Estoque</div>
                            <div className="font-bold text-foreground">
                              {row.quantity} {row.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Venda Total</div>
                            <div className="font-bold text-foreground">
                              {formatCurrency(row.totalSellingValue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">Custo Total</div>
                            <div className="text-muted-foreground">
                              {formatCurrency(row.totalCostValue)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Lucro Bruto</div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.potentialProfit)}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB 2: ABC CURVE REPORT */}
              {activeTab === 'abc' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold text-center">Classe</th>
                          <th className="py-3 px-4 font-semibold">Produto</th>
                          <th className="py-3 px-4 font-semibold">SKU / Categoria</th>
                          <th className="py-3 px-4 font-semibold text-center">Saldo</th>
                          <th className="py-3 px-4 font-semibold text-right">Valor em Estoque</th>
                          <th className="py-3 px-4 font-semibold text-center">% do Mix</th>
                          <th className="py-3 px-4 font-semibold text-center">% Acumulado</th>
                          <th className="py-3 px-4 font-semibold">Diretriz Estratégica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as AbcCurveItem[]).map((row) => (
                          <tr key={row.productId} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center font-bold h-6 w-6 rounded-full text-xs ${
                                  row.classification === 'A'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : row.classification === 'B'
                                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                    : 'bg-muted text-muted-foreground border border-border'
                                }`}
                              >
                                {row.classification}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              {row.productName}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">
                              <div className="font-mono text-foreground text-[11px]">{row.productSku}</div>
                              <div className="text-[10px]">{row.categoryName}</div>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono">
                              {row.quantity} {row.unit}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                              {formatCurrency(row.totalValue)}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                              {row.percentOfTotal.toFixed(2)}%
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-semibold text-foreground">
                              {row.cumulativePercent.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-4 text-[11px] text-muted-foreground">
                              {row.strategy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as AbcCurveItem[]).map((row) => (
                      <article key={row.productId} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center justify-center font-bold h-6 w-6 rounded-full text-xs shrink-0 ${
                                row.classification === 'A'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : row.classification === 'B'
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {row.classification}
                            </span>
                            <div>
                              <div className="font-semibold text-xs text-foreground">{row.productName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{row.productSku}</div>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="font-bold text-xs text-foreground">{formatCurrency(row.totalValue)}</div>
                            <div className="text-[10px] text-muted-foreground">{row.percentOfTotal.toFixed(1)}% do mix</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
                          💡 {row.strategy}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB: DEMAND & CONSUMPTION-BASED PURCHASING */}
              {activeTab === 'demand' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold text-center">Urgência</th>
                          <th className="py-3 px-4 font-semibold">Produto</th>
                          <th className="py-3 px-4 font-semibold">SKU / Categoria</th>
                          <th className="py-3 px-4 font-semibold text-center">Saldo Atual</th>
                          <th className="py-3 px-4 font-semibold text-center">Consumo / Dia</th>
                          <th className="py-3 px-4 font-semibold text-center">Vendas 30d</th>
                          <th className="py-3 px-4 font-semibold text-center">Cobertura</th>
                          <th className="py-3 px-4 font-semibold text-center">Sugestão Compra (30d)</th>
                          <th className="py-3 px-4 font-semibold text-right">Investimento Previsto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as ConsumptionDemandReportItem[]).map((row) => (
                          <tr key={row.productId} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 text-center">
                              <Badge
                                variant={
                                  row.urgency === 'URGENT'
                                    ? 'danger'
                                    : row.urgency === 'ATTENTION'
                                    ? 'warning'
                                    : row.urgency === 'OVERSTOCK'
                                    ? 'secondary'
                                    : 'success'
                                }
                                className="text-[10px]"
                              >
                                {row.urgency === 'URGENT'
                                  ? 'Urgente'
                                  : row.urgency === 'ATTENTION'
                                  ? 'Atenção'
                                  : row.urgency === 'OVERSTOCK'
                                  ? 'Excesso'
                                  : 'Normal'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              {row.productName}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">
                              <div className="font-mono text-foreground text-[11px]">{row.productSku}</div>
                              <div className="text-[10px]">{row.categoryName}</div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                                  row.currentStock <= 0
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : row.currentStock <= row.minStock
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {row.currentStock} {row.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                              {row.dailyConsumption.toFixed(2)} {row.unit}/dia
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-medium text-foreground">
                              {row.monthlySalesQty} {row.unit}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`font-mono font-semibold text-xs px-2 py-0.5 rounded-full ${
                                  row.stockCoverageDays <= 7
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                    : row.stockCoverageDays <= 15
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : row.stockCoverageDays > 60
                                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {row.stockCoverageDays >= 999 ? 'Sem vendas' : `${row.stockCoverageDays} dias`}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-primary">
                              {row.suggestedPurchaseQty > 0 ? `+${row.suggestedPurchaseQty} ${row.unit}` : 'Abastecido'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                              {row.suggestedInvestment > 0 ? formatCurrency(row.suggestedInvestment) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as ConsumptionDemandReportItem[]).map((row) => (
                      <article key={row.productId} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground">{row.productName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{row.productSku} · {row.categoryName}</div>
                          </div>
                          <Badge
                            variant={
                              row.urgency === 'URGENT'
                                ? 'danger'
                                : row.urgency === 'ATTENTION'
                                ? 'warning'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {row.urgency}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/40 p-2 rounded-lg">
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">Saldo / Consumo</div>
                            <div className="font-bold text-foreground">
                              {row.currentStock} {row.unit} ({row.dailyConsumption}/dia)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Cobertura</div>
                            <div className="font-bold text-foreground">
                              {row.stockCoverageDays >= 999 ? 'Sem vendas' : `${row.stockCoverageDays} dias`}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">Sugestão Compra</div>
                            <div className="font-bold text-primary">
                              +{row.suggestedPurchaseQty} {row.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Investimento</div>
                            <div className="font-bold text-foreground">
                              {formatCurrency(row.suggestedInvestment)}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB: CUSTOMER TICKET, ORDERS PER CUSTOMER & LTV REPORT */}
              {activeTab === 'customers' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold text-center">Segmento</th>
                          <th className="py-3 px-4 font-semibold">Cliente</th>
                          <th className="py-3 px-4 font-semibold">Documento / Contato</th>
                          <th className="py-3 px-4 font-semibold">Pedidos do Cliente (Link para Clientes)</th>
                          <th className="py-3 px-4 font-semibold text-right">LTV / Ticket</th>
                          <th className="py-3 px-4 font-semibold text-center">Última Compra (Data/Hora)</th>
                          <th className="py-3 px-4 font-semibold text-center">Canal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as CustomerTicketReportItem[]).map((row) => {
                          const custOrders = row.orders || []
                          const isExpanded = expandedCustomerIds.has(row.customerId)
                          return (
                            <React.Fragment key={row.customerId}>
                              <tr className="hover:bg-muted/30 transition-colors">
                                <td className="py-2.5 px-4 text-center">
                                  <Badge
                                    variant={
                                      row.customerSegment === 'VIP'
                                        ? 'success'
                                        : row.customerSegment === 'FREQUENT'
                                        ? 'warning'
                                        : 'secondary'
                                    }
                                    className="text-[10px]"
                                  >
                                    {row.customerSegment === 'VIP'
                                      ? '👑 VIP'
                                      : row.customerSegment === 'FREQUENT'
                                      ? '🔥 Frequente'
                                      : row.customerSegment === 'OCCASIONAL'
                                      ? 'Ocasional'
                                      : 'Inativo'}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-4 font-semibold text-foreground">
                                  <Link
                                    to={`/customers?customerId=${row.customerId}`}
                                    className="hover:text-primary hover:underline inline-flex items-center gap-1"
                                    title="Filtrar este cliente na tela de Clientes"
                                  >
                                    {row.customerName}
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                  </Link>
                                </td>
                                <td className="py-2.5 px-4 text-muted-foreground">
                                  <div className="font-mono text-foreground text-[11px]">{row.document || '-'}</div>
                                  <div className="text-[10px]">{row.phone || row.email || 'Sem contato'}</div>
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge variant="outline" className="text-[10px] font-mono">
                                        {custOrders.length} {custOrders.length === 1 ? 'pedido' : 'pedidos'}
                                      </Badge>
                                      {(row.openOrdersCount || 0) > 0 && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                          {row.openOrdersCount} aberto(s)
                                        </span>
                                      )}
                                      {(row.closedOrdersCount || 0) > 0 && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                          {row.closedOrdersCount} fechado(s)
                                        </span>
                                      )}
                                      {(row.cancelledOrdersCount || 0) > 0 && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                          {row.cancelledOrdersCount} cancelado(s)
                                        </span>
                                      )}
                                      {custOrders.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandCustomerOrders(row.customerId)}
                                          className="text-[10px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <ChevronDown className="h-3 w-3" /> Ocultar lista
                                            </>
                                          ) : (
                                            <>
                                              <ChevronRight className="h-3 w-3" /> Detalhar pedidos
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    {custOrders.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {custOrders.slice(0, 3).map((ord) => (
                                          <Link
                                            key={ord.orderId}
                                            to={`/customers?customerId=${row.customerId}&orderId=${ord.orderId}`}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-muted/40 hover:border-primary/50 hover:bg-primary/5 text-[10px] font-mono transition-colors"
                                            title={`Abrir pedido ${ord.orderNumber} de ${row.customerName} em Clientes`}
                                          >
                                            <Receipt className="h-2.5 w-2.5 text-primary" />
                                            <span className="font-bold text-foreground">{ord.orderNumber}</span>
                                            <span className="text-muted-foreground">
                                              ({formatDateTime(ord.createdAt)})
                                            </span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                              {formatCurrency(ord.totalAmount)}
                                            </span>
                                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                                          </Link>
                                        ))}
                                        {custOrders.length > 3 && !isExpanded && (
                                          <button
                                            type="button"
                                            onClick={() => toggleExpandCustomerOrders(row.customerId)}
                                            className="text-[10px] font-mono text-primary hover:underline px-1 cursor-pointer"
                                          >
                                            +{custOrders.length - 3} mais
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono">
                                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(row.totalSpent)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Ticket: {formatCurrency(row.averageTicket)}
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-center font-mono text-muted-foreground text-[11px]">
                                  {row.lastOrderDate ? (
                                    <div>
                                      <div className="text-foreground font-medium">{formatDateTime(row.lastOrderDate)}</div>
                                      <div className="text-[10px] text-muted-foreground">({row.daysSinceLastOrder} dias atrás)</div>
                                    </div>
                                  ) : (
                                    'Nunca comprou'
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <Badge variant="outline" className="text-[10px]">
                                    {row.topChannel}
                                  </Badge>
                                </td>
                              </tr>

                              {isExpanded && custOrders.length > 0 && (
                                <tr className="bg-muted/20">
                                  <td colSpan={7} className="px-6 py-3">
                                    <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-2xs">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                                          Todos os Pedidos de {row.customerName} ({custOrders.length})
                                        </span>
                                        <Link
                                          to={`/customers?customerId=${row.customerId}`}
                                          className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                          Ver cliente na tela de Clientes
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                      </div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                          <thead>
                                            <tr className="border-b border-border text-muted-foreground uppercase text-[9px]">
                                              <th className="py-1.5 px-2">Nº Pedido</th>
                                              <th className="py-1.5 px-2">Data e Hora Exata</th>
                                              <th className="py-1.5 px-2">Itens Comprados</th>
                                              <th className="py-1.5 px-2">Pagamento / Canal</th>
                                              <th className="py-1.5 px-2 text-center">Status</th>
                                              <th className="py-1.5 px-2 text-right">Valor Total</th>
                                              <th className="py-1.5 px-2 text-right">Ação</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-border/60">
                                            {custOrders.map((ord) => (
                                              <tr key={ord.orderId} className="hover:bg-muted/30">
                                                <td className="py-1.5 px-2 font-mono font-bold text-foreground">
                                                  {ord.orderNumber}
                                                </td>
                                                <td className="py-1.5 px-2 font-mono text-muted-foreground">
                                                  {formatDateTime(ord.createdAt)}
                                                </td>
                                                <td className="py-1.5 px-2 text-foreground max-w-md truncate" title={ord.itemsSummary}>
                                                  {ord.itemsSummary}
                                                </td>
                                                <td className="py-1.5 px-2 font-mono text-muted-foreground">
                                                  {ord.paymentMethods} · {ord.channel}
                                                </td>
                                                <td className="py-1.5 px-2 text-center">
                                                  <Badge
                                                    variant={
                                                      ord.status === 'DELIVERED'
                                                        ? 'success'
                                                        : ord.status === 'CANCELLED'
                                                        ? 'danger'
                                                        : 'warning'
                                                    }
                                                    className="text-[9px]"
                                                  >
                                                    {ORDER_STATUS_BADGE_LABELS[ord.status] || ord.status}
                                                  </Badge>
                                                </td>
                                                <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                  {formatCurrency(ord.totalAmount)}
                                                </td>
                                                <td className="py-1.5 px-2 text-right">
                                                  <Link
                                                    to={`/customers?customerId=${row.customerId}&orderId=${ord.orderId}`}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-semibold text-[10px]"
                                                  >
                                                    Abrir Pedido
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                  </Link>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
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

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as CustomerTicketReportItem[]).map((row) => (
                      <article key={row.customerId} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              to={`/customers?customerId=${row.customerId}`}
                              className="font-semibold text-xs text-foreground hover:text-primary inline-flex items-center gap-1"
                            >
                              {row.customerName}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <div className="text-[10px] text-muted-foreground font-mono">{row.document || 'Sem documento'}</div>
                          </div>
                          <Badge
                            variant={row.customerSegment === 'VIP' ? 'success' : 'secondary'}
                            className="text-[10px]"
                          >
                            {row.customerSegment}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/40 p-2 rounded-lg">
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">LTV / Pedidos</div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.totalSpent)} ({row.totalOrders}x)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Última Compra</div>
                            <div className="font-bold text-foreground">
                              {row.lastOrderDate ? formatDateTime(row.lastOrderDate) : 'Sem compras'}
                            </div>
                          </div>
                        </div>
                        {(row.orders || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(row.orders || []).slice(0, 3).map((ord) => (
                              <Link
                                key={ord.orderId}
                                to={`/customers?customerId=${row.customerId}&orderId=${ord.orderId}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/30 text-[10px] font-mono"
                              >
                                <span className="font-bold">{ord.orderNumber}</span>
                                <span className="text-muted-foreground">{formatDateTime(ord.createdAt)}</span>
                                <ExternalLink className="h-2.5 w-2.5 text-primary" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB: CAPITAL INVESTMENT BY CATEGORY */}
              {activeTab === 'investment' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Categoria</th>
                          <th className="py-3 px-4 font-semibold text-center">Mix (SKUs)</th>
                          <th className="py-3 px-4 font-semibold text-center">Qtd Física</th>
                          <th className="py-3 px-4 font-semibold text-right">Capital Investido (Custo)</th>
                          <th className="py-3 px-4 font-semibold text-right">Potencial de Venda</th>
                          <th className="py-3 px-4 font-semibold text-right">Lucro Projetado</th>
                          <th className="py-3 px-4 font-semibold text-center">Margem %</th>
                          <th className="py-3 px-4 font-semibold text-center">% Capital Loja</th>
                          <th className="py-3 px-4 font-semibold text-center">GMROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as CapitalInvestmentReportItem[]).map((row) => (
                          <tr key={row.categoryId} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              {row.categoryName}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono">
                              {row.productsCount} SKUs
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-medium text-foreground">
                              {row.totalPhysicalUnits} un.
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                              {formatCurrency(row.totalInvestedCost)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                              {formatCurrency(row.totalSellingPotential)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.potentialProfit)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge
                                variant={row.marginPercent >= 30 ? 'success' : row.marginPercent > 0 ? 'warning' : 'secondary'}
                                className="font-mono text-[10px]"
                              >
                                {row.marginPercent.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-semibold text-foreground">
                              {row.shareOfTotalInvestment.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                {row.gmroi.toFixed(2)}x
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as CapitalInvestmentReportItem[]).map((row) => (
                      <article key={row.categoryId} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground">{row.categoryName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{row.productsCount} SKUs · {row.totalPhysicalUnits} un.</div>
                          </div>
                          <Badge variant="success" className="font-mono text-[10px]">
                            {row.marginPercent.toFixed(1)}% Margem
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/40 p-2 rounded-lg">
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">Capital Investido</div>
                            <div className="font-bold text-foreground">{formatCurrency(row.totalInvestedCost)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Potencial Venda</div>
                            <div className="font-bold text-foreground">{formatCurrency(row.totalSellingPotential)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">% do Capital</div>
                            <div className="font-bold text-primary">{row.shareOfTotalInvestment.toFixed(1)}%</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">GMROI</div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">{row.gmroi.toFixed(2)}x</div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB: PURCHASING REPORT (WITH EXACT DATE/TIME & DETAILED ITEMS) */}
              {activeTab === 'purchasing' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Nº Pedido Compra</th>
                          <th className="py-3 px-4 font-semibold">Data e Hora (Emissão / Receb.)</th>
                          <th className="py-3 px-4 font-semibold">Fornecedor</th>
                          <th className="py-3 px-4 font-semibold">Itens Comprados (Detalhamento)</th>
                          <th className="py-3 px-4 font-semibold text-right">Custo Compra</th>
                          <th className="py-3 px-4 font-semibold text-right">Venda Projetada</th>
                          <th className="py-3 px-4 font-semibold text-right">Lucro Previsto</th>
                          <th className="py-3 px-4 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as PurchasingReportItem[]).map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                              {row.orderNumber}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px]">
                              <div className="flex items-center gap-1 text-foreground font-medium">
                                <Clock className="h-3 w-3 text-teal-500 shrink-0" />
                                {formatDateTime(row.issuedAt || row.createdAt)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {row.receivedAt
                                  ? `Recebido: ${formatDateTime(row.receivedAt)}`
                                  : 'Aguardando recebimento'}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-medium text-foreground">
                              {row.supplierName}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="text-[11px] text-foreground max-w-xs truncate" title={row.itemsSummary}>
                                {row.itemsSummary || `${row.itemsCount} itens`}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                {row.itemsCount} SKU(s) · {row.totalUnitsOrdered ?? row.itemsCount} un. totais
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                              {formatCurrency(row.totalCost)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-medium text-foreground">
                              {formatCurrency(row.totalSellingValue)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              <div>{formatCurrency(row.potentialProfit)}</div>
                              <div className="text-[10px] text-muted-foreground">{row.marginPercent.toFixed(1)}% margem</div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge
                                variant={
                                  row.status === 'RECEIVED'
                                    ? 'success'
                                    : row.status === 'CANCELLED'
                                    ? 'danger'
                                    : 'warning'
                                }
                                className="text-[10px]"
                              >
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as PurchasingReportItem[]).map((row) => (
                      <article key={row.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground font-mono">{row.orderNumber}</div>
                            <div className="text-[10px] text-muted-foreground">{row.supplierName}</div>
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {formatDateTime(row.issuedAt || row.createdAt)}
                            </div>
                          </div>
                          <Badge variant={row.status === 'RECEIVED' ? 'success' : 'secondary'} className="text-[10px]">
                            {row.status}
                          </Badge>
                        </div>
                        {row.itemsSummary && (
                          <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
                            {row.itemsSummary}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/40 p-2 rounded-lg">
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">Custo Compra</div>
                            <div className="font-bold text-foreground">{formatCurrency(row.totalCost)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Lucro Previsto</div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.potentialProfit)} ({row.marginPercent.toFixed(0)}%)
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB 4: LOSSES & WRITE-OFFS REPORT */}
              {activeTab === 'losses' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Data / Hora</th>
                          <th className="py-3 px-4 font-semibold">Produto</th>
                          <th className="py-3 px-4 font-semibold">Motivo da Baixa</th>
                          <th className="py-3 px-4 font-semibold">Centro Custo</th>
                          <th className="py-3 px-4 font-semibold text-center">Quantidade</th>
                          <th className="py-3 px-4 font-semibold text-right">Custo Unit.</th>
                          <th className="py-3 px-4 font-semibold text-right">Prejuízo Total</th>
                          <th className="py-3 px-4 font-semibold">Operador</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as LossesReportItem[]).map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                              {formatDateTime(row.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              <div>{row.productName}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{row.productSku}</div>
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="danger" className="text-[10px]">
                                {row.reasonLabel}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-muted-foreground">
                              {row.costCenterCode || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                              -{row.quantity}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                              {formatCurrency(row.unitCost)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency(row.totalLossValue)}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                              {row.operatorName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as LossesReportItem[]).map((row) => (
                      <article key={row.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground">{row.productName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{formatDateTime(row.createdAt)}</div>
                          </div>
                          <Badge variant="danger" className="text-[10px]">
                            {row.reasonLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono bg-rose-500/5 p-2 rounded-lg border border-rose-500/20">
                          <div>
                            <span className="text-muted-foreground">Qtd: </span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">-{row.quantity}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Prejuízo: </span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(row.totalLossValue)}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB 5: STOCKOUTS & REORDER REPORT */}
              {activeTab === 'stockouts' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold text-center">Urgência</th>
                          <th className="py-3 px-4 font-semibold">Produto</th>
                          <th className="py-3 px-4 font-semibold">SKU / Categoria</th>
                          <th className="py-3 px-4 font-semibold text-center">Saldo Atual</th>
                          <th className="py-3 px-4 font-semibold text-center">Estoque Mínimo</th>
                          <th className="py-3 px-4 font-semibold text-center">Sugestão Reposição</th>
                          <th className="py-3 px-4 font-semibold text-right">Custo Reposição Estimado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as StockoutReportItem[]).map((row) => (
                          <tr key={row.productId} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 text-center">
                              <Badge
                                variant={row.urgency === 'CRITICAL' ? 'danger' : 'warning'}
                                className="text-[10px]"
                              >
                                {row.urgency === 'CRITICAL' ? 'Ruptura Total' : 'Estoque Crítico'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-foreground">
                              {row.productName}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">
                              <div className="font-mono text-foreground text-[11px]">{row.productSku}</div>
                              <div className="text-[10px]">{row.categoryName}</div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                                  row.quantity === 0
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {row.quantity} {row.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                              {row.minStock} {row.unit}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-primary">
                              +{row.deficit} {row.unit}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                              {formatCurrency(row.replenishmentCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as StockoutReportItem[]).map((row) => (
                      <article key={row.productId} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground">{row.productName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{row.productSku}</div>
                          </div>
                          <Badge variant={row.urgency === 'CRITICAL' ? 'danger' : 'warning'} className="text-[10px]">
                            {row.urgency === 'CRITICAL' ? 'Zerado' : 'Crítico'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/40 p-2 rounded-lg">
                          <div>
                            <div className="text-[9px] uppercase text-muted-foreground">Saldo / Mínimo</div>
                            <div className="font-bold text-foreground">
                              {row.quantity} / {row.minStock} {row.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase text-muted-foreground">Comprar (+{row.deficit})</div>
                            <div className="font-bold text-primary">
                              {formatCurrency(row.replenishmentCost)}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* TAB 6: SALES PERFORMANCE REPORT (WITH EXACT DATE/TIME, ITEMS & CUSTOMER LINK) */}
              {activeTab === 'sales' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Nº Pedido</th>
                          <th className="py-3 px-4 font-semibold">Data e Hora Exata</th>
                          <th className="py-3 px-4 font-semibold">Cliente</th>
                          <th className="py-3 px-4 font-semibold">Itens da Compra / Pagamento</th>
                          <th className="py-3 px-4 font-semibold text-right">Subtotal / Desc.</th>
                          <th className="py-3 px-4 font-semibold text-right">Total Pago</th>
                          <th className="py-3 px-4 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as SalesReportItem[]).map((row) => {
                          const customerOrderUrl = row.customerId
                            ? `/customers?customerId=${row.customerId}&orderId=${row.id}`
                            : `/customers?orderId=${row.id}`
                          return (
                            <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                                <Link
                                  to={customerOrderUrl}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                  title="Abrir detalhes deste pedido na tela de Clientes"
                                >
                                  {row.orderNumber}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </td>
                              <td className="py-2.5 px-4 text-foreground font-mono text-[11px]">
                                <div className="flex items-center gap-1 font-medium">
                                  <Clock className="h-3 w-3 text-emerald-500 shrink-0" />
                                  {formatDateTime(row.createdAt)}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-foreground">
                                {row.customerId ? (
                                  <Link
                                    to={`/customers?customerId=${row.customerId}&orderId=${row.id}`}
                                    className="font-medium hover:text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    {row.customerName}
                                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                                  </Link>
                                ) : (
                                  <span>{row.customerName}</span>
                                )}
                                {row.customerDocument && (
                                  <div className="text-[10px] font-mono text-muted-foreground">{row.customerDocument}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="text-[11px] text-foreground max-w-xs truncate" title={row.itemsSummary}>
                                  {row.itemsSummary || `${row.itemsCount} itens`}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                                    {row.channel}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {row.paymentMethods || 'Padrão'} · {row.itemsCount} un.
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                                <div>{formatCurrency(row.subtotal)}</div>
                                {row.discountAmount > 0 && (
                                  <div className="text-[10px] text-rose-500">-{formatCurrency(row.discountAmount)}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                                {formatCurrency(row.totalAmount)}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <Badge
                                  variant={
                                    row.status === 'DELIVERED' || row.status === 'COMPLETED'
                                      ? 'success'
                                      : row.status === 'CANCELLED'
                                      ? 'danger'
                                      : 'warning'
                                  }
                                  className="text-[10px]"
                                >
                                  {ORDER_STATUS_BADGE_LABELS[row.status] || row.status}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-border custom-scrollbar">
                    {(currentItems as SalesReportItem[]).map((row) => {
                      const customerOrderUrl = row.customerId
                        ? `/customers?customerId=${row.customerId}&orderId=${row.id}`
                        : `/customers?orderId=${row.id}`
                      return (
                        <article key={row.id} className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                to={customerOrderUrl}
                                className="font-semibold text-xs text-primary font-mono inline-flex items-center gap-1"
                              >
                                {row.orderNumber}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                              <div className="text-[10px] text-muted-foreground">{row.customerName}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                {formatDateTime(row.createdAt)}
                              </div>
                            </div>
                            <Badge variant={row.status === 'DELIVERED' ? 'success' : 'secondary'} className="text-[10px]">
                              {ORDER_STATUS_BADGE_LABELS[row.status] || row.status}
                            </Badge>
                          </div>
                          {row.itemsSummary && (
                            <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
                              {row.itemsSummary}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs font-mono bg-muted/40 p-2 rounded-lg">
                            <div className="text-muted-foreground text-[10px]">{row.paymentMethods} · {row.channel}</div>
                            <div className="font-bold text-foreground">{formatCurrency(row.totalAmount)}</div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>

          {/* Pinned Pagination at the bottom of the card */}
          <div className="p-3 border-t border-border bg-surface flex-shrink-0">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalFiltered}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
