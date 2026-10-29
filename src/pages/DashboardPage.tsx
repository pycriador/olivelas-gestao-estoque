import * as React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
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
  ShoppingBag,
  Calendar,
  Download,
  Printer,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Award,
  Building2,
  GitBranch,
  RefreshCw,
  Search,
  CreditCard,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/hooks/useTenant'
import { useAuthStore } from '@/stores/authStore'
import { reportService } from '@/services/reportService'
import { storeService } from '@/services/storeService'
import { formatCurrency } from '@/utils/currency'
import { formatDate, formatDateTime } from '@/utils/dates'
import { exportToCSV, exportToJSON, printFormattedDocument } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PageHeader } from '@/components/common/PageHeader'
import type {
  DashboardPeriodPreset,
  DashboardGranularity,
  DashboardStoreOption,
  DashboardTopProductItem,
  DashboardStorePerformanceItem,
  DashboardPeriodOrderItem,
  DashboardMonthlyPoint,
} from '@/types/report.types'

const CHART_COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
]

function computePresetDates(preset: DashboardPeriodPreset): { from: string; to: string } {
  const now = new Date()
  const toStr = now.toISOString().slice(0, 10)

  switch (preset) {
    case 'TODAY': {
      return { from: toStr, to: toStr }
    }
    case '7D': {
      const d = new Date(now.getTime() - 6 * 86400000)
      return { from: d.toISOString().slice(0, 10), to: toStr }
    }
    case '30D': {
      const d = new Date(now.getTime() - 29 * 86400000)
      return { from: d.toISOString().slice(0, 10), to: toStr }
    }
    case '90D': {
      const d = new Date(now.getTime() - 89 * 86400000)
      return { from: d.toISOString().slice(0, 10), to: toStr }
    }
    case 'THIS_MONTH': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: d.toISOString().slice(0, 10), to: toStr }
    }
    case 'LAST_MONTH': {
      const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastLast = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        from: firstLast.toISOString().slice(0, 10),
        to: lastLast.toISOString().slice(0, 10),
      }
    }
    case 'THIS_YEAR': {
      const d = new Date(now.getFullYear(), 0, 1)
      return { from: d.toISOString().slice(0, 10), to: toStr }
    }
    case 'ALL_TIME': {
      return { from: '2024-01-01', to: toStr }
    }
    default: {
      const d = new Date(now.getTime() - 29 * 86400000)
      return { from: d.toISOString().slice(0, 10), to: toStr }
    }
  }
}

const PRESET_OPTIONS: Array<{ id: DashboardPeriodPreset; label: string }> = [
  { id: 'TODAY', label: 'Hoje' },
  { id: '7D', label: '7 Dias' },
  { id: '30D', label: '30 Dias' },
  { id: '90D', label: '90 Dias' },
  { id: 'THIS_MONTH', label: 'Este Mês' },
  { id: 'LAST_MONTH', label: 'Mês Passado' },
  { id: 'THIS_YEAR', label: 'Este Ano' },
  { id: 'ALL_TIME', label: 'Tudo' },
]

export function DashboardPage() {
  const { storeId: activeTenantStoreId, userStores } = useTenant()
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initial URL parameters or defaults
  const initialPreset = (searchParams.get('preset') as DashboardPeriodPreset) || 'ALL_TIME'
  const initialDates = useMemo(() => computePresetDates(initialPreset), [initialPreset])

  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>(initialPreset)
  const [dateFrom, setDateFrom] = useState<string>(
    searchParams.get('from') || initialDates.from
  )
  const [dateTo, setDateTo] = useState<string>(searchParams.get('to') || initialDates.to)
  const [selectedStoreScope, setSelectedStoreScope] = useState<string>(
    searchParams.get('store') || (activeTenantStoreId && activeTenantStoreId !== 'all' ? activeTenantStoreId : 'ALL')
  )
  const [channelFilter, setChannelFilter] = useState<string>(
    searchParams.get('channel') || 'ALL'
  )
  const [granularity, setGranularity] = useState<DashboardGranularity>(
    (searchParams.get('granularity') as DashboardGranularity) || 'MONTH'
  )

  // Chart view toggles
  const [timeChartMode, setTimeChartMode] = useState<'MONTHLY_12M' | 'PERIOD_TIMELINE'>('MONTHLY_12M')
  const [storeChartMetric, setStoreChartMetric] = useState<'REVENUE' | 'PROFIT' | 'ORDERS' | 'STOCK'>('REVENUE')
  const [topProductsMetric, setTopProductsMetric] = useState<'REVENUE' | 'QUANTITY' | 'PROFIT'>('REVENUE')
  const [bottomTab, setBottomTab] = useState<'ORDERS' | 'PRODUCTS' | 'STORES'>('ORDERS')
  const [tableSearch, setTableSearch] = useState('')

  // Sync when tenant switcher in sidebar changes
  useEffect(() => {
    if (activeTenantStoreId && activeTenantStoreId !== 'all' && !searchParams.get('store')) {
      setSelectedStoreScope(activeTenantStoreId)
    } else if (activeTenantStoreId === 'all' && !searchParams.get('store')) {
      setSelectedStoreScope('ALL')
    }
  }, [activeTenantStoreId, searchParams])

  // Load full stores metadata (for hierarchy Matriz -> Filial badges and Global Admin access)
  const { data: allSystemStores = [] } = useQuery({
    queryKey: ['dashboard-stores-catalog', user?.id],
    queryFn: async () => {
      try {
        return await storeService.listAllStores()
      } catch {
        return []
      }
    },
  })

  // Build accessible stores list ordered hierarchically (Matriz -> Filiais)
  const accessibleStores: DashboardStoreOption[] = useMemo(() => {
    const userStoreIds = new Set(
      userStores.filter((s) => s.storeId && s.storeId !== 'all').map((s) => s.storeId)
    )

    const rawList =
      allSystemStores.length > 0
        ? allSystemStores.filter(
            (st) => user?.isGlobalAdmin || userStoreIds.has(st.id)
          )
        : userStores
            .filter((s) => s.storeId && s.storeId !== 'all')
            .map((s) => ({
              id: s.storeId,
              name: s.storeName,
              slug: s.storeSlug,
              is_branch: false,
              branch_code: null,
              parent_store_id: null,
            }))

    const roots = rawList.filter((s) => !s.is_branch && !s.parent_store_id)
    const branches = rawList.filter((s) => s.is_branch || s.parent_store_id)
    const ordered: DashboardStoreOption[] = []
    const visited = new Set<string>()

    for (const root of roots) {
      ordered.push({
        id: root.id,
        name: root.name,
        slug: root.slug,
        isBranch: false,
        branchCode: root.branch_code || null,
        parentStoreId: null,
      })
      visited.add(root.id)

      const children = branches.filter((b) => b.parent_store_id === root.id)
      for (const child of children) {
        ordered.push({
          id: child.id,
          name: child.name,
          slug: child.slug,
          isBranch: true,
          branchCode: child.branch_code || null,
          parentStoreId: child.parent_store_id || null,
        })
        visited.add(child.id)
      }
    }

    for (const item of rawList) {
      if (!visited.has(item.id)) {
        ordered.push({
          id: item.id,
          name: item.name,
          slug: item.slug,
          isBranch: Boolean(item.is_branch || item.parent_store_id),
          branchCode: item.branch_code || null,
          parentStoreId: item.parent_store_id || null,
        })
      }
    }

    return ordered
  }, [allSystemStores, user?.isGlobalAdmin, userStores])

  // Sync URL params helper
  const updateUrlParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) next.delete(k)
      else next.set(k, v)
    })
    setSearchParams(next, { replace: true })
  }

  const handleSelectPreset = (preset: DashboardPeriodPreset) => {
    setPeriodPreset(preset)
    const range = computePresetDates(preset)
    setDateFrom(range.from)
    setDateTo(range.to)
    // Auto-pick best granularity
    const nextGran: DashboardGranularity =
      preset === 'TODAY' || preset === '7D' || preset === '30D' || preset === 'THIS_MONTH' || preset === 'LAST_MONTH'
        ? 'DAY'
        : preset === '90D'
        ? 'WEEK'
        : 'MONTH'
    setGranularity(nextGran)
    updateUrlParams({
      preset,
      from: range.from,
      to: range.to,
      granularity: nextGran,
    })
  }

  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setPeriodPreset('CUSTOM')
    if (field === 'from') {
      setDateFrom(value)
      updateUrlParams({ preset: 'CUSTOM', from: value, to: dateTo })
    } else {
      setDateTo(value)
      updateUrlParams({ preset: 'CUSTOM', from: dateFrom, to: value })
    }
  }

  const handleStoreScopeChange = (val: string) => {
    setSelectedStoreScope(val)
    updateUrlParams({ store: val })
  }

  const handleChannelChange = (val: string) => {
    setChannelFilter(val)
    updateUrlParams({ channel: val })
  }

  const handleGranularityChange = (val: DashboardGranularity) => {
    setGranularity(val)
    setTimeChartMode('PERIOD_TIMELINE')
    updateUrlParams({ granularity: val })
  }

  // Main Analytics Query
  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'dashboard-executive-analytics',
      selectedStoreScope,
      accessibleStores.map((s) => s.id).join(','),
      dateFrom,
      dateTo,
      channelFilter,
      granularity,
    ],
    queryFn: () =>
      reportService.getDashboardAnalytics({
        selectedStoreId: selectedStoreScope,
        accessibleStores,
        dateFrom,
        dateTo,
        channel: channelFilter,
        granularity,
      }),
    enabled: accessibleStores.length > 0,
  })

  const selectedStoreLabel = useMemo(() => {
    if (selectedStoreScope === 'ALL') {
      return `Todas as Lojas (${accessibleStores.length} unidades)`
    }
    const found = accessibleStores.find((s) => s.id === selectedStoreScope)
    return found
      ? `${found.name} (${found.isBranch ? 'Filial' : 'Matriz'})`
      : 'Loja Selecionada'
  }, [accessibleStores, selectedStoreScope])

  // Sorted Top Products according to user metric choice
  const sortedTopProducts = useMemo(() => {
    const list = [...(analytics?.topProducts || [])]
    if (topProductsMetric === 'QUANTITY') {
      return list.sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue)
    }
    if (topProductsMetric === 'PROFIT') {
      return list.sort((a, b) => b.profit - a.profit || b.revenue - a.revenue)
    }
    return list.sort((a, b) => b.revenue - a.revenue)
  }, [analytics?.topProducts, topProductsMetric])

  // Sorted Store Comparison according to user metric choice
  const sortedStoreComparison = useMemo(() => {
    const list = [...(analytics?.storeComparison || [])]
    if (storeChartMetric === 'PROFIT') {
      return list.sort((a, b) => b.profit - a.profit)
    }
    if (storeChartMetric === 'ORDERS') {
      return list.sort((a, b) => b.ordersCount - a.ordersCount)
    }
    if (storeChartMetric === 'STOCK') {
      return list.sort((a, b) => b.stockSellingValue - a.stockSellingValue)
    }
    return list.sort((a, b) => b.revenue - a.revenue)
  }, [analytics?.storeComparison, storeChartMetric])

  // Active Time Series for Main Chart
  const activeTimeSeries = useMemo(() => {
    if (!analytics) return []
    if (timeChartMode === 'MONTHLY_12M') {
      return analytics.monthlySalesSeries.map((m) => ({
        key: m.monthKey,
        label: m.monthLabel,
        revenue: m.revenue,
        profit: m.profit,
        ordersCount: m.ordersCount,
        unitsSold: m.unitsSold,
        averageTicket: m.averageTicket,
      }))
    }
    return analytics.timelineSeries.map((t) => ({
      key: t.bucketKey,
      label: t.label,
      revenue: t.revenue,
      profit: t.profit,
      ordersCount: t.ordersCount,
      unitsSold: t.unitsSold,
      averageTicket: t.averageTicket,
    }))
  }, [analytics, timeChartMode])

  const timeSeriesStats = useMemo(() => {
    if (activeTimeSeries.length === 0) {
      return { maxRevenue: 1, totalRevenue: 0, avgRevenue: 0, bestPoint: null as any }
    }
    const maxRevenue = Math.max(...activeTimeSeries.map((p) => p.revenue), 1)
    const totalRevenue = activeTimeSeries.reduce((acc, p) => acc + p.revenue, 0)
    const nonZeroPoints = activeTimeSeries.filter((p) => p.revenue > 0)
    const avgRevenue =
      nonZeroPoints.length > 0 ? totalRevenue / nonZeroPoints.length : 0
    const bestPoint = [...activeTimeSeries].sort((a, b) => b.revenue - a.revenue)[0] || null
    return { maxRevenue, totalRevenue, avgRevenue, bestPoint }
  }, [activeTimeSeries])

  // Filtered rows for bottom inspection table
  const filteredOrders = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    const list = analytics?.periodOrders || []
    if (!q) return list
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.storeName.toLowerCase().includes(q) ||
        o.channel.toLowerCase().includes(q)
    )
  }, [analytics?.periodOrders, tableSearch])

  const filteredProductsTable = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return sortedTopProducts
    return sortedTopProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.productSku.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.storeName.toLowerCase().includes(q)
    )
  }, [sortedTopProducts, tableSearch])

  // Export Handlers
  const handleExportPeriodOrdersCSV = () => {
    if (!analytics || analytics.periodOrders.length === 0) {
      toast.warning('Não há pedidos no período selecionado para exportar.')
      return
    }
    exportToCSV<DashboardPeriodOrderItem>(
      `dashboard_vendas_${dateFrom}_a_${dateTo}`,
      analytics.periodOrders,
      [
        { header: 'Nº Pedido', key: 'orderNumber' },
        { header: 'Data/Hora', key: (r) => formatDateTime(r.createdAt) },
        { header: 'Loja / Unidade', key: 'storeName' },
        { header: 'Cliente', key: 'customerName' },
        { header: 'Canal', key: 'channel' },
        { header: 'Pagamento', key: 'paymentMethod' },
        { header: 'Status', key: 'status' },
        { header: 'Qtd. Itens', key: 'itemsCount' },
        { header: 'Subtotal (R$)', key: (r) => r.subtotal.toFixed(2) },
        { header: 'Desconto (R$)', key: (r) => r.discountAmount.toFixed(2) },
        { header: 'Total Venda (R$)', key: (r) => r.totalAmount.toFixed(2) },
        { header: 'Lucro Estimado (R$)', key: (r) => r.estimatedProfit.toFixed(2) },
      ]
    )
    toast.success('Planilha CSV de vendas do período baixada com sucesso!')
  }

  const handleExportTopProductsCSV = () => {
    if (!analytics || sortedTopProducts.length === 0) {
      toast.warning('Não há produtos vendidos no período selecionado para exportar.')
      return
    }
    exportToCSV<DashboardTopProductItem>(
      `dashboard_produtos_mais_vendidos_${dateFrom}_a_${dateTo}`,
      sortedTopProducts,
      [
        { header: 'SKU', key: 'productSku' },
        { header: 'Produto', key: 'productName' },
        { header: 'Categoria', key: 'categoryName' },
        { header: 'Unidade', key: 'unit' },
        { header: 'Loja Principal', key: 'storeName' },
        { header: 'Quantidade Vendida', key: 'quantitySold' },
        { header: 'Nº de Pedidos', key: 'ordersCount' },
        { header: 'Faturamento (R$)', key: (r) => r.revenue.toFixed(2) },
        { header: 'Custo Total (R$)', key: (r) => r.costTotal.toFixed(2) },
        { header: 'Lucro Bruto (R$)', key: (r) => r.profit.toFixed(2) },
        { header: 'Margem (%)', key: (r) => `${r.marginPercent}%` },
        { header: 'Part. Faturamento (%)', key: (r) => `${r.shareOfRevenuePercent}%` },
        { header: 'Estoque Atual', key: 'currentStock' },
      ]
    )
    toast.success('Ranking de produtos mais vendidos (CSV) baixado com sucesso!')
  }

  const handleExportStoresCSV = () => {
    if (!analytics || sortedStoreComparison.length === 0) {
      toast.warning('Não há dados de lojas para exportar.')
      return
    }
    exportToCSV<DashboardStorePerformanceItem>(
      `dashboard_desempenho_lojas_${dateFrom}_a_${dateTo}`,
      sortedStoreComparison,
      [
        { header: 'Loja / Unidade', key: 'storeName' },
        { header: 'Tipo', key: (r) => (r.isBranch ? 'Filial' : 'Matriz') },
        { header: 'Código Filial', key: (r) => r.branchCode || '-' },
        { header: 'Faturamento no Período (R$)', key: (r) => r.revenue.toFixed(2) },
        { header: 'Lucro Estimado (R$)', key: (r) => r.profit.toFixed(2) },
        { header: 'Margem (%)', key: (r) => `${r.marginPercent}%` },
        { header: 'Pedidos Concluídos', key: 'ordersCount' },
        { header: 'Unidades Vendidas', key: 'unitsSold' },
        { header: 'Ticket Médio (R$)', key: (r) => r.averageTicket.toFixed(2) },
        { header: 'Share Faturamento (%)', key: (r) => `${r.sharePercent}%` },
        { header: 'Estoque a Preço Custo (R$)', key: (r) => r.stockCostValue.toFixed(2) },
        { header: 'Estoque a Preço Venda (R$)', key: (r) => r.stockSellingValue.toFixed(2) },
      ]
    )
    toast.success('Comparativo por loja (CSV) baixado com sucesso!')
  }

  const handleExportMonthlySeriesCSV = () => {
    if (!analytics || analytics.monthlySalesSeries.length === 0) {
      toast.warning('Não há série mensal para exportar.')
      return
    }
    exportToCSV<DashboardMonthlyPoint>(
      `dashboard_vendas_mensais_12m_${dateTo}`,
      analytics.monthlySalesSeries,
      [
        { header: 'Competência (Ano-Mês)', key: 'monthKey' },
        { header: 'Mês', key: 'monthLabel' },
        { header: 'Faturamento (R$)', key: (r) => r.revenue.toFixed(2) },
        { header: 'Lucro Estimado (R$)', key: (r) => r.profit.toFixed(2) },
        { header: 'Pedidos Concluídos', key: 'ordersCount' },
        { header: 'Unidades Vendidas', key: 'unitsSold' },
        { header: 'Ticket Médio (R$)', key: (r) => r.averageTicket.toFixed(2) },
      ]
    )
    toast.success('Série de vendas mensais (CSV) baixada com sucesso!')
  }

  const handleExportFullJSON = () => {
    if (!analytics) {
      toast.warning('Aguarde o carregamento dos dados.')
      return
    }
    exportToJSON(
      `dashboard_analytics_completo_${dateFrom}_a_${dateTo}`,
      [
        {
          escopoLoja: selectedStoreLabel,
          periodoInicial: dateFrom,
          periodoFinal: dateTo,
          canalFiltro: channelFilter,
          kpis: JSON.stringify(analytics.kpis),
          comparativoLojas: JSON.stringify(analytics.storeComparison),
          topProdutos: JSON.stringify(analytics.topProducts.slice(0, 30)),
          vendasMensais: JSON.stringify(analytics.monthlySalesSeries),
        },
      ],
      [
        { header: 'Escopo', key: 'escopoLoja' },
        { header: 'Data Inicial', key: 'periodoInicial' },
        { header: 'Data Final', key: 'periodoFinal' },
        { header: 'Canal', key: 'canalFiltro' },
        { header: 'KPIs', key: 'kpis' },
        { header: 'Comparativo por Loja', key: 'comparativoLojas' },
        { header: 'Top Produtos', key: 'topProdutos' },
        { header: 'Vendas Mensais', key: 'vendasMensais' },
      ]
    )
    toast.success('Pacote JSON de Analytics exportado com sucesso!')
  }

  const handlePrintExecutiveReport = () => {
    if (!analytics) return
    const k = analytics.kpis
    const storesRows = sortedStoreComparison
      .map(
        (s) => `
        <tr>
          <td><strong>${s.storeName}</strong> (${s.isBranch ? 'Filial' : 'Matriz'})</td>
          <td>${s.ordersCount}</td>
          <td>${s.unitsSold}</td>
          <td>${formatCurrency(s.revenue)}</td>
          <td>${formatCurrency(s.profit)} (${s.marginPercent}%)</td>
          <td>${formatCurrency(s.averageTicket)}</td>
          <td>${s.sharePercent}%</td>
        </tr>`
      )
      .join('')

    const topProdRows = sortedTopProducts
      .slice(0, 15)
      .map(
        (p, i) => `
        <tr>
          <td>#${i + 1}</td>
          <td>${p.productName} <small>(${p.productSku})</small></td>
          <td>${p.categoryName}</td>
          <td>${p.quantitySold} ${p.unit}</td>
          <td>${formatCurrency(p.revenue)}</td>
          <td>${formatCurrency(p.profit)} (${p.marginPercent}%)</td>
          <td>${p.shareOfRevenuePercent}%</td>
        </tr>`
      )
      .join('')

    const html = `
      <div class="summary-cards">
        <div class="card">
          <div class="card-title">Escopo & Período</div>
          <div class="card-value" style="font-size:14px">${selectedStoreLabel}</div>
          <div style="font-size:11px;color:#64748b">${formatDate(dateFrom)} até ${formatDate(dateTo)}</div>
        </div>
        <div class="card">
          <div class="card-title">Faturamento no Período</div>
          <div class="card-value">${formatCurrency(k.periodRevenue)}</div>
          <div style="font-size:11px;color:#10b981">${k.periodOrdersCount} pedidos concluídos</div>
        </div>
        <div class="card">
          <div class="card-title">Lucro Bruto & Margem</div>
          <div class="card-value">${formatCurrency(k.periodProfit)}</div>
          <div style="font-size:11px;color:#64748b">Margem média: ${k.periodMarginPercent}%</div>
        </div>
        <div class="card">
          <div class="card-title">Ticket Médio</div>
          <div class="card-value">${formatCurrency(k.averageTicket)}</div>
          <div style="font-size:11px;color:#64748b">${k.periodUnitsSold} unidades vendidas</div>
        </div>
      </div>

      <h3 style="margin-top:20px;font-size:14px;">1. Desempenho Comparativo por Loja (Matriz & Filiais)</h3>
      <table>
        <thead>
          <tr>
            <th>Loja / Unidade</th>
            <th>Pedidos</th>
            <th>Unid. Vendidas</th>
            <th>Faturamento</th>
            <th>Lucro Estimado</th>
            <th>Ticket Médio</th>
            <th>% Share</th>
          </tr>
        </thead>
        <tbody>${storesRows || '<tr><td colspan="7">Sem dados</td></tr>'}</tbody>
      </table>

      <h3 style="margin-top:24px;font-size:14px;">2. Top 15 Produtos Mais Vendidos no Período</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Qtd. Vendida</th>
            <th>Faturamento</th>
            <th>Lucro / Margem</th>
            <th>% Receita</th>
          </tr>
        </thead>
        <tbody>${topProdRows || '<tr><td colspan="7">Sem vendas no período</td></tr>'}</tbody>
      </table>
    `
    printFormattedDocument(
      `Relatório Executivo de Dashboard (${formatDate(dateFrom)} a ${formatDate(dateTo)})`,
      html
    )
  }

  if (accessibleStores.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <Store className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Nenhuma loja vinculada</h2>
        <p className="text-sm text-muted-foreground">
          Crie ou selecione uma loja para acompanhar os gráficos, vendas mensais e indicadores.
        </p>
        <Link to="/stores">
          <Button variant="default">Gerenciar Lojas</Button>
        </Link>
      </div>
    )
  }

  const kpis = analytics?.kpis

  return (
    <div className="flex-1 min-h-0 w-full h-full overflow-y-auto pr-1 sm:pr-2 space-y-5 pb-10 animate-in fade-in duration-150 custom-scrollbar">
      {/* Top Header */}
      <PageHeader
        title="Dashboard Analítico & Inteligência Comercial"
        badge={
          <Badge variant="default" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" /> Tempo Real
          </Badge>
        }
      />

      {/* Executive Filter & Export Control Bar */}
      <Card className="border-primary/20 bg-card shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          {/* Row 1: Store Selector, Channel, Granularity & Quick Actions / Export */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Store Selector (Matriz + Filiais or Consolidated) */}
              <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-xl px-2.5 py-1">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground">Unidade:</span>
                <select
                  value={selectedStoreScope}
                  onChange={(e) => handleStoreScopeChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none pr-1 cursor-pointer"
                >
                  <option value="ALL">
                    Todas as Lojas ({accessibleStores.length} unidades consolidadas)
                  </option>
                  {accessibleStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.isBranch ? `└─ [Filial] ${s.name}` : `[Matriz] ${s.name}`}
                      {s.branchCode ? ` (${s.branchCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Filter */}
              <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-xl px-2.5 py-1">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground">Canal:</span>
                <select
                  value={channelFilter}
                  onChange={(e) => handleChannelChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Todos os Canais</option>
                  <option value="IN_STORE">PDV / Balcão</option>
                  <option value="WHATSAPP">Catálogo WhatsApp</option>
                  <option value="ECOMMERCE">E-commerce / Online</option>
                </select>
              </div>

              {/* Granularity Selector */}
              <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-xl p-0.5">
                {(
                  [
                    { id: 'DAY', label: 'Diário' },
                    { id: 'WEEK', label: 'Semanal' },
                    { id: 'MONTH', label: 'Mensal' },
                  ] as Array<{ id: DashboardGranularity; label: string }>
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGranularityChange(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      granularity === g.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Actions: Refresh, Export Dropdown, Print, POS */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => refetch()}
                title="Atualizar indicadores"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <DropdownMenu
                triggerLabel="Baixar Dados do Período"
                items={[
                  {
                    key: 'csv-orders',
                    label: 'Baixar Vendas do Período (CSV)',
                    icon: <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />,
                    onSelect: handleExportPeriodOrdersCSV,
                  },
                  {
                    key: 'csv-top-products',
                    label: 'Baixar Produtos Mais Vendidos (CSV)',
                    icon: <Award className="h-3.5 w-3.5 text-amber-500" />,
                    onSelect: handleExportTopProductsCSV,
                  },
                  {
                    key: 'csv-stores',
                    label: 'Baixar Comparativo por Loja (CSV)',
                    icon: <Building2 className="h-3.5 w-3.5 text-blue-500" />,
                    onSelect: handleExportStoresCSV,
                  },
                  {
                    key: 'csv-monthly',
                    label: 'Baixar Vendas Mensais 12M (CSV)',
                    icon: <BarChart3 className="h-3.5 w-3.5 text-violet-500" />,
                    onSelect: handleExportMonthlySeriesCSV,
                  },
                  {
                    key: 'json-full',
                    label: 'Exportar Analytics Completo (JSON)',
                    icon: <FileJson className="h-3.5 w-3.5 text-primary" />,
                    onSelect: handleExportFullJSON,
                  },
                  {
                    key: 'print-pdf',
                    label: 'Imprimir / Salvar Relatório PDF',
                    icon: <Printer className="h-3.5 w-3.5 text-foreground" />,
                    onSelect: handlePrintExecutiveReport,
                  },
                ]}
              />

              <Link to="/sales">
                <Button variant="default" size="sm" className="h-8 text-xs shadow-sm">
                  <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Nova Venda (PDV)
                </Button>
              </Link>
            </div>
          </div>

          {/* Row 2: Time Period Presets + Custom Date Range Inputs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Período:
              </span>
              {PRESET_OPTIONS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    periodPreset === preset.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">De:</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">Até:</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8 Executive KPI Cards */}
      {isLoading || !kpis ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <LoadingSkeleton count={8} className="h-28" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Faturamento no Período */}
          <Card className="relative overflow-hidden border-emerald-500/25 hover:border-emerald-500/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Faturamento no Período
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(kpis.periodRevenue)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    kpis.revenueGrowthPercent >= 0 ? 'text-emerald-500' : 'text-danger'
                  }`}
                >
                  {kpis.revenueGrowthPercent >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {kpis.revenueGrowthPercent >= 0 ? '+' : ''}
                  {kpis.revenueGrowthPercent}% vs. anterior
                </span>
                <span className="text-muted-foreground">
                  Hoje: <b className="text-foreground">{formatCurrency(kpis.salesTodayTotal)}</b>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Lucro Bruto & Margem */}
          <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Lucro Bruto Estimado
                </span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(kpis.periodProfit)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <Badge variant="success" className="text-[10px] py-0 px-1.5">
                  Margem {kpis.periodMarginPercent}%
                </Badge>
                <span className="text-muted-foreground">
                  Mês atual: <b className="text-foreground">{formatCurrency(kpis.salesMonthTotal)}</b>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Pedidos Concluídos & Ticket Médio */}
          <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Vendas & Ticket Médio
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {kpis.periodOrdersCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">pedidos</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  Ticket Médio: <b className="text-foreground">{formatCurrency(kpis.averageTicket)}</b>
                </span>
                {kpis.pendingOrdersCount > 0 && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                    {kpis.pendingOrdersCount} pend.
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Giro Físico (Unidades Vendidas) */}
          <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Volume Físico Vendido
                </span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {kpis.periodUnitsSold}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">itens vendidos</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Catálogo ativo: <b className="text-foreground">{kpis.totalProductsCount} SKUs</b>
                </span>
                <span>
                  Clientes: <b className="text-foreground">{kpis.activeCustomersCount}</b>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Patrimônio em Estoque (Potencial de Venda vs Custo) */}
          <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Estoque (Valor de Venda)
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(kpis.stockSellingValuation)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Custo: <b className="text-foreground">{formatCurrency(kpis.stockCostValuation)}</b>
                </span>
                <Link to="/inventory" className="text-primary font-semibold hover:underline">
                  Ver saldos →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Alerta de Estoque Baixo & Ruptura */}
          <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Estoque Baixo & Ruptura
                </span>
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {kpis.lowStockCount + kpis.outOfStockCount}
                </span>
                <span className="text-xs text-muted-foreground">produtos em alerta</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-orange-500 font-semibold">
                  {kpis.lowStockCount} baixo • {kpis.outOfStockCount} zerado(s)
                </span>
                <Link to="/purchases" className="text-primary font-semibold hover:underline">
                  Repor →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 7: Lotes Próximos do Vencimento (<= 30d) */}
          <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Lotes Vencendo (≤ 30d)
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {kpis.expiring30dCount}
                </span>
                <span className="text-xs text-muted-foreground">lotes em atenção</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Controle FEFO ativo</span>
                <Link to="/expiration" className="text-primary font-semibold hover:underline">
                  Ver validades →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 8: Lotes Vencidos / Críticos */}
          <Card className="relative overflow-hidden hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Lotes Vencidos / Baixas
                </span>
                <div className="p-2 rounded-xl bg-danger/10 text-danger">
                  <PackageX className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">
                  {kpis.expiredCount}
                </span>
                <span className="text-xs text-muted-foreground">lotes vencidos</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                {kpis.expiredCount > 0 ? (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                    Ação Imediata
                  </Badge>
                ) : (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Nenhum vencido
                  </span>
                )}
                <Link to="/expiration" className="text-primary font-semibold hover:underline">
                  Tratar →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ROW 1 OF CHARTS: Monthly Sales & Timeline Evolution (7 cols) + Store Comparison (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: Vendas Mensais & Evolução Temporal */}
        <Card className="lg:col-span-7 flex flex-col">
          <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {timeChartMode === 'MONTHLY_12M'
                  ? 'Evolução de Vendas Mensais (Últimos 12 Meses)'
                  : `Evolução no Período (${formatDate(dateFrom)} a ${formatDate(dateTo)})`}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faturamento bruto (R$), lucro estimado (R$) e volume de vendas em{' '}
                <strong className="text-foreground">{selectedStoreLabel}</strong>
              </p>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border self-start">
              <button
                type="button"
                onClick={() => setTimeChartMode('MONTHLY_12M')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  timeChartMode === 'MONTHLY_12M'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Vendas Mensais (12M)
              </button>
              <button
                type="button"
                onClick={() => setTimeChartMode('PERIOD_TIMELINE')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  timeChartMode === 'PERIOD_TIMELINE'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Período Filtrado
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {isLoading ? (
              <LoadingSkeleton count={1} className="h-64" />
            ) : activeTimeSeries.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                Nenhuma venda registrada no intervalo selecionado.
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <span className="h-2.5 w-2.5 rounded-xs bg-primary inline-block" />
                      Faturamento Bruto
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 inline-block" />
                      Lucro Estimado
                    </span>
                  </div>
                  {timeSeriesStats.bestPoint && timeSeriesStats.bestPoint.revenue > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      Pico:{' '}
                      <strong className="text-foreground">
                        {timeSeriesStats.bestPoint.label} (
                        {formatCurrency(timeSeriesStats.bestPoint.revenue)})
                      </strong>
                    </span>
                  )}
                </div>

                {/* Interactive Bar Chart Viewport */}
                <div className="relative h-60 w-full pt-6 pb-2 px-1 flex items-end gap-1.5 sm:gap-2.5 overflow-x-auto custom-scrollbar border-b border-border">
                  {activeTimeSeries.map((pt) => {
                    const revHeightPct = Math.max(
                      pt.revenue > 0 ? 6 : 1,
                      Math.round((pt.revenue / timeSeriesStats.maxRevenue) * 100)
                    )
                    const profitHeightPct = Math.max(
                      pt.profit > 0 ? 4 : 0,
                      Math.round((Math.max(0, pt.profit) / timeSeriesStats.maxRevenue) * 100)
                    )

                    return (
                      <div
                        key={pt.key}
                        className="group relative flex-1 min-w-[38px] h-full flex flex-col justify-end items-center"
                      >
                        {/* Hover Tooltip */}
                        <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 z-20 -translate-y-full bg-popover text-popover-foreground border border-border rounded-xl shadow-lg px-2.5 py-2 text-[10px] whitespace-nowrap">
                          <div className="font-bold text-foreground border-b border-border/60 pb-1 mb-1">
                            {pt.label}
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Faturamento:</span>
                            <span className="font-bold text-primary">
                              {formatCurrency(pt.revenue)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Lucro Est.:</span>
                            <span className="font-bold text-emerald-500">
                              {formatCurrency(pt.profit)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Pedidos:</span>
                            <span className="font-bold">{pt.ordersCount} vendas</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Ticket Médio:</span>
                            <span className="font-bold">{formatCurrency(pt.averageTicket)}</span>
                          </div>
                        </div>

                        {/* Value label on top of bar if positive */}
                        {pt.revenue > 0 && (
                          <span className="text-[9px] font-mono font-bold text-muted-foreground mb-1 hidden sm:block">
                            {pt.revenue >= 1000
                              ? `${(pt.revenue / 1000).toFixed(1)}k`
                              : Math.round(pt.revenue)}
                          </span>
                        )}

                        {/* Dual Bars Container */}
                        <div className="w-full flex items-end justify-center gap-0.5 h-[82%]">
                          <div
                            style={{ height: `${revHeightPct}%` }}
                            className={`w-full max-w-[18px] rounded-t-md transition-all duration-300 ${
                              pt.revenue > 0
                                ? 'bg-primary group-hover:bg-primary/85'
                                : 'bg-muted/60'
                            }`}
                          />
                          <div
                            style={{ height: `${profitHeightPct}%` }}
                            className={`w-full max-w-[12px] rounded-t-md transition-all duration-300 ${
                              pt.profit > 0
                                ? 'bg-emerald-500 group-hover:bg-emerald-400'
                                : 'bg-transparent'
                            }`}
                          />
                        </div>

                        {/* X-Axis Label */}
                        <span className="mt-1.5 text-[10px] font-semibold text-muted-foreground group-hover:text-foreground truncate max-w-full">
                          {pt.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Summary Footer */}
                <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">
                      Total na Série Exibida
                    </span>
                    <span className="font-extrabold text-sm text-foreground">
                      {formatCurrency(timeSeriesStats.totalRevenue)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">
                      Média por Período Ativo
                    </span>
                    <span className="font-extrabold text-sm text-foreground">
                      {formatCurrency(timeSeriesStats.avgRevenue)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">
                      Melhor Desempenho
                    </span>
                    <span className="font-extrabold text-sm text-emerald-500">
                      {timeSeriesStats.bestPoint && timeSeriesStats.bestPoint.revenue > 0
                        ? `${timeSeriesStats.bestPoint.label} (${formatCurrency(
                            timeSeriesStats.bestPoint.revenue
                          )})`
                        : 'Sem vendas'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* CHART 2: Gráficos por Loja (Comparativo Matriz & Filiais) */}
        <Card className="lg:col-span-5 flex flex-col">
          <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Desempenho por Loja (Matriz & Filiais)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clique em uma loja para filtrar ou comparar todas as unidades
              </p>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border self-start">
              {(
                [
                  { id: 'REVENUE', label: 'Vendas' },
                  { id: 'PROFIT', label: 'Lucro' },
                  { id: 'ORDERS', label: 'Pedidos' },
                  { id: 'STOCK', label: 'Estoque' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setStoreChartMetric(m.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    storeChartMetric === m.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-3 overflow-y-auto max-h-[380px] custom-scrollbar">
            {isLoading ? (
              <LoadingSkeleton count={4} className="h-14" />
            ) : sortedStoreComparison.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Nenhuma loja disponível para comparação.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedStoreComparison.map((st, idx) => {
                  const maxVal = Math.max(
                    ...sortedStoreComparison.map((item) =>
                      storeChartMetric === 'REVENUE'
                        ? item.revenue
                        : storeChartMetric === 'PROFIT'
                        ? item.profit
                        : storeChartMetric === 'ORDERS'
                        ? item.ordersCount
                        : item.stockSellingValue
                    ),
                    1
                  )
                  const currentVal =
                    storeChartMetric === 'REVENUE'
                      ? st.revenue
                      : storeChartMetric === 'PROFIT'
                      ? st.profit
                      : storeChartMetric === 'ORDERS'
                      ? st.ordersCount
                      : st.stockSellingValue

                  const barWidthPct = Math.max(
                    currentVal > 0 ? 4 : 1,
                    Math.round((Math.max(0, currentVal) / maxVal) * 100)
                  )
                  const isSelected = selectedStoreScope === st.storeId
                  const color = CHART_COLORS[idx % CHART_COLORS.length]

                  return (
                    <div
                      key={st.storeId}
                      onClick={() =>
                        handleStoreScopeChange(isSelected ? 'ALL' : st.storeId)
                      }
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                          : 'border-border/70 bg-muted/20 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {st.isBranch ? (
                            <GitBranch className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <span className="text-xs font-bold text-foreground truncate">
                            {st.storeName}
                          </span>
                          <Badge
                            variant={st.isBranch ? 'secondary' : 'outline'}
                            className="text-[9px] px-1.5 py-0 shrink-0"
                          >
                            {st.isBranch ? 'Filial' : 'Matriz'}
                          </Badge>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-foreground">
                            {storeChartMetric === 'ORDERS'
                              ? `${st.ordersCount} pedidos`
                              : formatCurrency(currentVal)}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                            ({st.sharePercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: color,
                          }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>

                      {/* Sub-metrics row */}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span>
                          Pedidos: <b className="text-foreground">{st.ordersCount}</b> • Ticket:{' '}
                          <b className="text-foreground">{formatCurrency(st.averageTicket)}</b>
                        </span>
                        <span>
                          Estoque:{' '}
                          <b className="text-foreground">
                            {formatCurrency(st.stockSellingValue)}
                          </b>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedStoreScope !== 'ALL' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 mt-2"
                onClick={() => handleStoreScopeChange('ALL')}
              >
                Mostrar Visão Consolidada de Todas as Lojas
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 2 OF CHARTS: Top Selling Products (7 cols) + Category & Channel/Payment Breakdown (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 3: Produtos Mais Vendidos no Período */}
        <Card className="lg:col-span-7 flex flex-col">
          <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Produtos Mais Vendidos no Período
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ranking de giro, receita gerada, margem de lucro e cobertura atual de estoque
              </p>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border self-start">
              {(
                [
                  { id: 'REVENUE', label: 'Por Faturamento (R$)' },
                  { id: 'QUANTITY', label: 'Por Qtd. Vendida' },
                  { id: 'PROFIT', label: 'Por Lucro (R$)' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTopProductsMetric(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    topProductsMetric === m.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-5 flex-1">
            {isLoading ? (
              <LoadingSkeleton count={5} className="h-14" />
            ) : sortedTopProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Nenhum produto vendido no período selecionado.
              </div>
            ) : (
              <div className="space-y-3 max-h-[410px] overflow-y-auto pr-1 custom-scrollbar">
                {sortedTopProducts.slice(0, 10).map((prod, idx) => {
                  const maxMetric = Math.max(
                    ...sortedTopProducts.map((p) =>
                      topProductsMetric === 'QUANTITY'
                        ? p.quantitySold
                        : topProductsMetric === 'PROFIT'
                        ? p.profit
                        : p.revenue
                    ),
                    1
                  )
                  const currMetric =
                    topProductsMetric === 'QUANTITY'
                      ? prod.quantitySold
                      : topProductsMetric === 'PROFIT'
                      ? prod.profit
                      : prod.revenue
                  const pctBar = Math.max(
                    5,
                    Math.round((Math.max(0, currMetric) / maxMetric) * 100)
                  )
                  const isLowStock = prod.currentStock <= prod.minStock

                  return (
                    <div
                      key={`${prod.productId}-${idx}`}
                      className="p-3 rounded-xl border border-border/70 bg-muted/15 hover:bg-muted/35 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Badge */}
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                              idx === 0
                                ? 'bg-amber-500 text-white'
                                : idx === 1
                                ? 'bg-slate-400 text-white'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            #{idx + 1}
                          </div>

                          {/* Product Thumbnail */}
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.productName}
                              className="h-9 w-9 rounded-lg object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-foreground truncate">
                                {prod.productName}
                              </span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                                {prod.categoryName}
                              </Badge>
                              {isLowStock && (
                                <Badge variant="destructive" className="text-[9px] py-0 px-1.5">
                                  Estoque Baixo ({prod.currentStock} {prod.unit})
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              SKU: <span className="font-mono">{prod.productSku}</span> •{' '}
                              <b>{prod.quantitySold} {prod.unit}</b> em {prod.ordersCount} venda(s)
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-extrabold text-foreground">
                            {formatCurrency(prod.revenue)}
                          </div>
                          <div className="text-[10px] text-emerald-500 font-semibold">
                            Lucro: {formatCurrency(prod.profit)} ({prod.marginPercent}%)
                          </div>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          style={{ width: `${pctBar}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CHART 4: Mix por Categoria (Donut SVG) + Canais & Pagamentos */}
        <Card className="lg:col-span-5 flex flex-col">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Vendas por Categoria, Canal & Pagamento
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribuição percentual do faturamento no período selecionado
            </p>
          </CardHeader>

          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-5">
            {isLoading ? (
              <LoadingSkeleton count={3} className="h-24" />
            ) : (
              <>
                {/* Category Donut + Legend */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Participação por Categoria de Produto
                  </h4>
                  {(analytics?.categoryBreakdown || []).length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Sem categorias vendidas no período.
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* SVG Donut Chart */}
                      <div className="relative h-32 w-32 shrink-0">
                        <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke="currentColor"
                            className="text-muted/40"
                            strokeWidth="4.2"
                          />
                          {(() => {
                            let cumulativePct = 0
                            return (analytics?.categoryBreakdown || [])
                              .slice(0, 6)
                              .map((cat, idx) => {
                                const pct = Math.max(0, cat.sharePercent)
                                const dashArray = `${pct} ${100 - pct}`
                                const dashOffset = 100 - cumulativePct
                                cumulativePct += pct
                                return (
                                  <circle
                                    key={cat.categoryName}
                                    cx="18"
                                    cy="18"
                                    r="15.915"
                                    fill="transparent"
                                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                                    strokeWidth="4.2"
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                  />
                                )
                              })
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] text-muted-foreground">Categorias</span>
                          <span className="text-sm font-extrabold text-foreground">
                            {analytics?.categoryBreakdown.length || 0}
                          </span>
                        </div>
                      </div>

                      {/* Category Legend */}
                      <div className="flex-1 w-full space-y-1.5">
                        {(analytics?.categoryBreakdown || []).slice(0, 5).map((cat, idx) => (
                          <div
                            key={cat.categoryName}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                                }}
                              />
                              <span className="font-semibold text-foreground truncate">
                                {cat.categoryName}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-foreground">
                                {formatCurrency(cat.revenue)}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-1">
                                ({cat.sharePercent}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Channels & Payments Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60">
                  {/* Channels */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-primary" /> Canais de Venda
                    </h4>
                    {(analytics?.channelBreakdown || []).length === 0 ? (
                      <div className="text-[11px] text-muted-foreground">Sem vendas</div>
                    ) : (
                      (analytics?.channelBreakdown || []).map((ch) => (
                        <div key={ch.channel} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-foreground">{ch.channelLabel}</span>
                            <span className="font-bold">
                              {formatCurrency(ch.revenue)} ({ch.sharePercent}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              style={{ width: `${Math.max(4, ch.sharePercent)}%` }}
                              className="h-full bg-primary rounded-full"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Payments */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-500" /> Meios de Pagamento
                    </h4>
                    {(analytics?.paymentBreakdown || []).length === 0 ? (
                      <div className="text-[11px] text-muted-foreground">Sem pagamentos</div>
                    ) : (
                      (analytics?.paymentBreakdown || []).map((pm) => (
                        <div key={pm.method} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-foreground">{pm.methodLabel}</span>
                            <span className="font-bold">
                              {formatCurrency(pm.amount)} ({pm.sharePercent}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              style={{ width: `${Math.max(4, pm.sharePercent)}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Weekday Rhythm */}
                <div className="pt-3 border-t border-border/60">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Ritmo de Vendas por Dia da Semana
                  </h4>
                  <div className="grid grid-cols-7 gap-1.5 items-end h-20 pt-2">
                    {(() => {
                      const list = analytics?.weekdayBreakdown || []
                      const maxWd = Math.max(...list.map((w) => w.revenue), 1)
                      return list.map((w) => {
                        const hPct = Math.max(
                          w.revenue > 0 ? 12 : 4,
                          Math.round((w.revenue / maxWd) * 100)
                        )
                        return (
                          <div
                            key={w.dayIndex}
                            className="flex flex-col items-center justify-end h-full group relative"
                            title={`${w.dayLabel}: ${formatCurrency(w.revenue)} (${w.ordersCount} pedidos)`}
                          >
                            <div className="w-full h-12 flex items-end justify-center">
                              <div
                                style={{ height: `${hPct}%` }}
                                className={`w-full max-w-[20px] rounded-t-md transition-all ${
                                  w.revenue > 0
                                    ? 'bg-violet-500 group-hover:bg-violet-400'
                                    : 'bg-muted'
                                }`}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground mt-1">
                              {w.dayLabel}
                            </span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM SECTION: Detailed Dynamic Inspection Tables for the Selected Period */}
      <Card className="border-border shadow-xs">
        <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBottomTab('ORDERS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                bottomTab === 'ORDERS'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Vendas do Período ({analytics?.periodOrders.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('PRODUCTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                bottomTab === 'PRODUCTS'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Ranking de Produtos ({sortedTopProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('STORES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                bottomTab === 'STORES'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Consolidado por Loja ({sortedStoreComparison.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filtrar na tabela abaixo..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={
                bottomTab === 'ORDERS'
                  ? handleExportPeriodOrdersCSV
                  : bottomTab === 'PRODUCTS'
                  ? handleExportTopProductsCSV
                  : handleExportStoresCSV
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Baixar Aba (CSV)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto max-h-[420px] custom-scrollbar">
          {bottomTab === 'ORDERS' && (
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[10px] uppercase text-muted-foreground font-bold">
                <tr>
                  <th className="py-2.5 px-4">Pedido</th>
                  <th className="py-2.5 px-4">Data / Hora</th>
                  <th className="py-2.5 px-4">Loja / Unidade</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Canal / Pagto</th>
                  <th className="py-2.5 px-4 text-center">Itens</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Total Venda</th>
                  <th className="py-2.5 px-4 text-right">Lucro Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Nenhum pedido encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.slice(0, 50).map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                        {o.orderNumber}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold">{o.storeName}</td>
                      <td className="py-2.5 px-4">{o.customerName}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold">{o.channel}</span>
                        <span className="text-muted-foreground ml-1">({o.paymentMethod})</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono">{o.itemsCount}</td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge
                          variant={
                            o.status === 'CONFIRMED' || o.status === 'DELIVERED'
                              ? 'success'
                              : o.status === 'CANCELLED'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="text-[10px] py-0"
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-foreground">
                        {formatCurrency(o.totalAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-500">
                        {formatCurrency(o.estimatedProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {bottomTab === 'PRODUCTS' && (
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[10px] uppercase text-muted-foreground font-bold">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Produto / SKU</th>
                  <th className="py-2.5 px-4">Categoria</th>
                  <th className="py-2.5 px-4 text-center">Qtd. Vendida</th>
                  <th className="py-2.5 px-4 text-center">Pedidos</th>
                  <th className="py-2.5 px-4 text-right">Faturamento</th>
                  <th className="py-2.5 px-4 text-right">Lucro Bruto</th>
                  <th className="py-2.5 px-4 text-center">Margem</th>
                  <th className="py-2.5 px-4 text-center">Estoque Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProductsTable.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado no período.
                    </td>
                  </tr>
                ) : (
                  filteredProductsTable.map((p, i) => (
                    <tr key={`${p.productId}-${i}`} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-bold text-muted-foreground">#{i + 1}</td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-foreground">{p.productName}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {p.productSku}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">{p.categoryName}</td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        {p.quantitySold} {p.unit}
                      </td>
                      <td className="py-2.5 px-4 text-center">{p.ordersCount}</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-foreground">
                        {formatCurrency(p.revenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-500">
                        {formatCurrency(p.profit)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {p.marginPercent}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge
                          variant={p.currentStock <= p.minStock ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {p.currentStock} {p.unit}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {bottomTab === 'STORES' && (
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[10px] uppercase text-muted-foreground font-bold">
                <tr>
                  <th className="py-2.5 px-4">Loja / Unidade</th>
                  <th className="py-2.5 px-4 text-center">Tipo</th>
                  <th className="py-2.5 px-4 text-center">Pedidos</th>
                  <th className="py-2.5 px-4 text-center">Itens Vendidos</th>
                  <th className="py-2.5 px-4 text-right">Faturamento</th>
                  <th className="py-2.5 px-4 text-right">Lucro Est.</th>
                  <th className="py-2.5 px-4 text-right">Ticket Médio</th>
                  <th className="py-2.5 px-4 text-center">% Share</th>
                  <th className="py-2.5 px-4 text-right">Patrimônio Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedStoreComparison.map((st) => (
                  <tr key={st.storeId} className="hover:bg-muted/30">
                    <td className="py-2.5 px-4 font-bold text-foreground">{st.storeName}</td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge
                        variant={st.isBranch ? 'secondary' : 'outline'}
                        className="text-[10px]"
                      >
                        {st.isBranch ? 'Filial' : 'Matriz'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold">{st.ordersCount}</td>
                    <td className="py-2.5 px-4 text-center">{st.unitsSold}</td>
                    <td className="py-2.5 px-4 text-right font-extrabold text-foreground">
                      {formatCurrency(st.revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-500">
                      {formatCurrency(st.profit)}
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatCurrency(st.averageTicket)}</td>
                    <td className="py-2.5 px-4 text-center font-mono">{st.sharePercent}%</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {formatCurrency(st.stockSellingValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
