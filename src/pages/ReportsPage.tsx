import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
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
} from 'lucide-react'
import type {
  ValuationReportItem,
  AbcCurveItem,
  PurchasingReportItem,
  LossesReportItem,
  StockoutReportItem,
  SalesReportItem,
} from '@/types/report.types'

type ReportTab = 'valuation' | 'abc' | 'purchasing' | 'losses' | 'stockouts' | 'sales'

export function ReportsPage() {
  const { storeId, storeName, hasActiveStore } = useTenant()
  const { t } = useI18n()

  const [activeTab, setActiveTab] = React.useState<ReportTab>('valuation')
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('ALL')
  const [statusFilter, setStatusFilter] = React.useState('ALL')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(15)

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab)
    setStatusFilter('ALL')
    setPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val)
    setPage(1)
  }

  const handleStatusChange = (val: string) => {
    setStatusFilter(val)
    setPage(1)
  }

  const handlePageSizeChange = (val: number) => {
    setPageSize(val)
    setPage(1)
  }

  // 1. Retail Summary KPIs
  const { data: summaryKPIs, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['report-retail-summary', storeId],
    queryFn: () => reportService.getRetailSummaryKPIs(storeId),
    enabled: Boolean(hasActiveStore),
  })

  // 2. Valuation Report Query
  const { data: valuationData = [], isLoading: isValuationLoading } = useQuery({
    queryKey: ['report-valuation', storeId],
    queryFn: () => reportService.getValuationReport(storeId),
    enabled: Boolean(hasActiveStore) && activeTab === 'valuation',
  })

  // 3. ABC Curve Report Query
  const { data: abcData = [], isLoading: isAbcLoading } = useQuery({
    queryKey: ['report-abc', storeId],
    queryFn: () => reportService.getAbcCurveReport(storeId),
    enabled: Boolean(hasActiveStore) && activeTab === 'abc',
  })

  // 4. Purchasing Report Query
  const { data: purchasingData = [], isLoading: isPurchasingLoading } = useQuery({
    queryKey: ['report-purchasing', storeId],
    queryFn: () => reportService.getPurchasingReport(storeId),
    enabled: Boolean(hasActiveStore) && activeTab === 'purchasing',
  })

  // 5. Losses Report Query
  const { data: lossesData = [], isLoading: isLossesLoading } = useQuery({
    queryKey: ['report-losses', storeId],
    queryFn: () => reportService.getLossesReport(storeId),
    enabled: Boolean(hasActiveStore) && activeTab === 'losses',
  })

  // 6. Stockouts Report Query
  const { data: stockoutsData = [], isLoading: isStockoutsLoading } = useQuery({
    queryKey: ['report-stockouts', storeId],
    queryFn: () => reportService.getStockoutsReport(storeId),
    enabled: Boolean(hasActiveStore) && activeTab === 'stockouts',
  })

  // 7. Sales Report Query
  const { data: salesData = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ['report-sales', storeId],
    queryFn: () => reportService.getSalesPerformanceReport(storeId),
    enabled: Boolean(hasActiveStore) && activeTab === 'sales',
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

    if (activeTab === 'purchasing') {
      let filtered = purchasingData
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.status === statusFilter)
      }
      if (q) {
        filtered = filtered.filter(
          (i) =>
            i.orderNumber.toLowerCase().includes(q) ||
            i.supplierName.toLowerCase().includes(q)
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
            i.channel.toLowerCase().includes(q)
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
      : activeTab === 'purchasing'
      ? isPurchasingLoading
      : activeTab === 'losses'
      ? isLossesLoading
      : activeTab === 'stockouts'
      ? isStockoutsLoading
      : isSalesLoading

  // Export CSV handler per active tab
  const handleExportCSV = () => {
    const filenamePrefix = `relatorio_${activeTab}_${storeName.toLowerCase().replace(/\s+/g, '_')}`

    if (activeTab === 'valuation') {
      exportToCSV(
        filenamePrefix,
        valuationData,
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
        abcData,
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
    } else if (activeTab === 'purchasing') {
      exportToCSV(
        filenamePrefix,
        purchasingData,
        [
          { header: 'Nº Pedido', key: 'orderNumber' },
          { header: 'Fornecedor', key: 'supplierName' },
          { header: 'Qtd Itens', key: 'itemsCount' },
          { header: 'Custo Total Compra (R$)', key: 'totalCost' },
          { header: 'Venda Projetada (R$)', key: 'totalSellingValue' },
          { header: 'Lucro Previsto (R$)', key: 'potentialProfit' },
          { header: 'Margem %', key: (r) => r.marginPercent.toFixed(2) },
          { header: 'Status', key: 'status' },
          { header: 'Data Pedido', key: (r) => (r.issuedAt ? formatDate(r.issuedAt) : '-') },
          { header: 'Data Recebimento', key: (r) => (r.receivedAt ? formatDate(r.receivedAt) : '-') },
        ]
      )
    } else if (activeTab === 'losses') {
      exportToCSV(
        filenamePrefix,
        lossesData,
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
        stockoutsData,
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
        salesData,
        [
          { header: 'Nº Pedido', key: 'orderNumber' },
          { header: 'Data/Hora', key: (r) => formatDateTime(r.createdAt) },
          { header: 'Cliente', key: 'customerName' },
          { header: 'Canal', key: 'channel' },
          { header: 'Qtd Itens', key: 'itemsCount' },
          { header: 'Subtotal (R$)', key: 'subtotal' },
          { header: 'Desconto (R$)', key: 'discountAmount' },
          { header: 'Total (R$)', key: 'totalAmount' },
          { header: 'Status', key: 'status' },
        ]
      )
    }
  }

  // Print Executive Summary
  const handlePrintSummary = () => {
    const html = `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 6px 0;">Demonstrativo Executivo de Varejo - ${storeName}</h2>
        <p style="color: #666; font-size: 13px; margin: 0;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
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
    printFormattedDocument(`Relatório Executivo - ${storeName}`, html)
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
      id: 'purchasing' as const,
      label: 'Compras & Fornecedores',
      shortLabel: 'Compras',
      icon: ShoppingCart,
      color: 'text-emerald-500',
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
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Global Actions */}
      <PageHeader title={t.nav.reports}>
        <Input
          placeholder="Buscar no relatório ativo..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Retail Performance KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 flex-shrink-0">
        <Card className="p-2.5 bg-card border-border shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-blue-500" />
            Estoque em Custo
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.totalCostValue || 0)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {summaryKPIs?.totalPhysicalUnits || 0} un. físicas
          </div>
        </Card>

        <Card className="p-2.5 bg-card border-border shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            Estoque em Venda
          </div>
          <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.totalSellingValue || 0)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Potencial total na gôndola
          </div>
        </Card>

        <Card className="p-2.5 bg-card border-border shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-primary" />
            Margem Bruta
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
            {isSummaryLoading ? '...' : `${(summaryKPIs?.marginPercent || 0).toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Lucro: {formatCurrency(summaryKPIs?.potentialProfit || 0)}
          </div>
        </Card>

        <Card className="p-2.5 bg-card border-border shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            Vendas no Mês
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.salesMonthTotal || 0)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Hoje: {formatCurrency(summaryKPIs?.salesTodayTotal || 0)}
          </div>
        </Card>

        <Card className="p-2.5 bg-card border-border shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
            Perdas Operacionais
          </div>
          <div className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {isSummaryLoading ? '...' : formatCurrency(summaryKPIs?.totalLossValueMonth || 0)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Avarias / Vencimentos
          </div>
        </Card>

        <Card className="p-2.5 bg-card border-border shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Ruptura & Alerta
          </div>
          <div className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {isSummaryLoading ? '...' : `${summaryKPIs?.stockoutCount || 0} zerado(s)`}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {summaryKPIs?.lowStockCount || 0} abaixo do mín.
          </div>
        </Card>
      </div>

      {/* Reports Navigation Tabs & Action Bar */}
      <div className="space-y-2 flex-shrink-0">
        {/* Modern Segmented Navigation Bar */}
        <div className="bg-card border border-border rounded-xl p-1 shadow-xs">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
            {reportTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex-1 sm:flex-initial justify-center sm:justify-start ${
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-muted/40 border border-border/80 rounded-xl px-3 py-2">
          {/* Active Report Description & Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-card border border-border flex-shrink-0 shadow-2xs">
              {React.createElement(currentTabMeta.icon, {
                className: `h-4 w-4 ${currentTabMeta.color}`,
              })}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {currentTabMeta.label}
                </span>
                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-mono font-normal">
                  {totalFiltered} {totalFiltered === 1 ? 'registro' : 'registros'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden md:block">
                {currentTabMeta.description}
              </p>
            </div>
          </div>

          {/* Filters & Export Actions Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
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
                onClick={handleExportCSV}
                className="h-8 text-xs px-2.5 bg-background hover:bg-muted/80 shadow-2xs cursor-pointer"
                title="Exportar dados do relatório atual para planilha CSV"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <span>Exportar CSV</span>
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

      {/* Main Report Table Card with Viewport Fitting & Pagination */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isCurrentTabLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={8} />
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

              {/* TAB 3: PURCHASING REPORT */}
              {activeTab === 'purchasing' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Nº Pedido</th>
                          <th className="py-3 px-4 font-semibold">Fornecedor</th>
                          <th className="py-3 px-4 font-semibold text-center">Itens</th>
                          <th className="py-3 px-4 font-semibold text-right">Custo Compra</th>
                          <th className="py-3 px-4 font-semibold text-right">Venda Projetada</th>
                          <th className="py-3 px-4 font-semibold text-right">Lucro Previsto</th>
                          <th className="py-3 px-4 font-semibold text-center">Margem %</th>
                          <th className="py-3 px-4 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as PurchasingReportItem[]).map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                              {row.orderNumber}
                            </td>
                            <td className="py-2.5 px-4 text-foreground">
                              {row.supplierName}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono">
                              {row.itemsCount}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                              {formatCurrency(row.totalCost)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-medium text-foreground">
                              {formatCurrency(row.totalSellingValue)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatCurrency(row.potentialProfit)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {row.marginPercent.toFixed(1)}%
                              </Badge>
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
                          </div>
                          <Badge variant={row.status === 'RECEIVED' ? 'success' : 'secondary'} className="text-[10px]">
                            {row.status}
                          </Badge>
                        </div>
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

              {/* TAB 6: SALES PERFORMANCE REPORT */}
              {activeTab === 'sales' && (
                <>
                  <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Nº Pedido</th>
                          <th className="py-3 px-4 font-semibold">Data / Hora</th>
                          <th className="py-3 px-4 font-semibold">Cliente</th>
                          <th className="py-3 px-4 font-semibold">Canal</th>
                          <th className="py-3 px-4 font-semibold text-center">Itens</th>
                          <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                          <th className="py-3 px-4 font-semibold text-right">Desconto</th>
                          <th className="py-3 px-4 font-semibold text-right">Total Pago</th>
                          <th className="py-3 px-4 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(currentItems as SalesReportItem[]).map((row) => (
                          <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
                              {row.orderNumber}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                              {formatDateTime(row.createdAt)}
                            </td>
                            <td className="py-2.5 px-4 text-foreground">
                              {row.customerName}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px]">
                                {row.channel}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono">
                              {row.itemsCount}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                              {formatCurrency(row.subtotal)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-rose-500">
                              {row.discountAmount > 0 ? `-${formatCurrency(row.discountAmount)}` : '-'}
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
                    {(currentItems as SalesReportItem[]).map((row) => (
                      <article key={row.id} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-foreground font-mono">{row.orderNumber}</div>
                            <div className="text-[10px] text-muted-foreground">{row.customerName}</div>
                          </div>
                          <Badge variant={row.status === 'DELIVERED' ? 'success' : 'secondary'} className="text-[10px]">
                            {row.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono bg-muted/40 p-2 rounded-lg">
                          <div className="text-muted-foreground text-[10px]">{formatDate(row.createdAt)} · {row.channel}</div>
                          <div className="font-bold text-foreground">{formatCurrency(row.totalAmount)}</div>
                        </div>
                      </article>
                    ))}
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
  )
}
