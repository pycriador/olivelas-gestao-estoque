import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { orderService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { inventoryService } from '@/services/inventoryService'
import { customerService } from '@/services/customerService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { formatCurrency } from '@/utils/currency'
import { formatDate, formatDateTime } from '@/utils/dates'
import { exportToCSV, printFormattedDocument } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  TrendingUp,
  Download,
  Printer,
  FileText,
  DollarSign,
  Package,
  Layers,
  Users
} from 'lucide-react'

export function ReportsPage() {
  const { storeId, storeName, hasActiveStore } = useTenant()
  const { t } = useI18n()

  const { data: metrics } = useQuery({
    queryKey: ['report-metrics', storeId],
    queryFn: () => reportService.getDashboardMetrics(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['report-orders', storeId],
    queryFn: () => orderService.listOrders(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: balances = [] } = useQuery({
    queryKey: ['report-balances', storeId],
    queryFn: () => inventoryService.getStockBalances(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['report-customers', storeId],
    queryFn: () => customerService.listCustomers(storeId),
    enabled: Boolean(hasActiveStore),
  })

  // Export Sales Report
  const handleExportSales = () => {
    if (orders.length === 0) return
    exportToCSV(
      `relatorio_vendas_${storeName.toLowerCase().replace(/\s+/g, '_')}`,
      orders,
      [
        { header: 'Nº Pedido', key: 'order_number' },
        { header: 'Data', key: (r) => formatDateTime(r.created_at) },
        { header: 'Cliente', key: (r) => r.customer_name || 'Consumidor Final' },
        { header: 'Canal', key: 'channel' },
        { header: 'Subtotal', key: 'subtotal' },
        { header: 'Desconto', key: 'discount_amount' },
        { header: 'Total (R$)', key: 'total_amount' },
        { header: 'Status', key: 'status' },
      ]
    )
  }

  // Export Stock Report
  const handleExportStock = () => {
    if (balances.length === 0) return
    exportToCSV(
      `relatorio_estoque_${storeName.toLowerCase().replace(/\s+/g, '_')}`,
      balances,
      [
        { header: 'Produto', key: (r) => r.product_name || '-' },
        { header: 'SKU', key: (r) => r.product_sku || '-' },
        { header: 'Saldo Atual', key: 'quantity' },
        { header: 'Estoque Mínimo', key: (r) => r.min_stock ?? 0 },
        { header: 'Saldo Disponível', key: 'available_quantity' },
      ]
    )
  }

  // Print Executive Summary
  const handlePrintSummary = () => {
    const tableRows = orders
      .slice(0, 20)
      .map(
        (o) => `
      <tr>
        <td>${o.order_number}</td>
        <td>${o.customer_name || 'Consumidor Final'}</td>
        <td>${formatDate(o.created_at)}</td>
        <td>${o.channel}</td>
        <td>${o.status}</td>
        <td style="text-align: right; font-weight: bold;">${formatCurrency(o.total_amount)}</td>
      </tr>
    `
      )
      .join('')

    const html = `
      <div style="margin-bottom: 16px;">
        <h3>Loja: ${storeName}</h3>
        <p>Vendas Hoje: <b>${formatCurrency(metrics?.salesTodayTotal)}</b> | Vendas no Mês: <b>${formatCurrency(
      metrics?.salesMonthTotal
    )}</b></p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Canal</th>
            <th>Status</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `
    printFormattedDocument(`Relatório Executivo - ${storeName}`, html)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t.nav.reports}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Demonstrativos de desempenho, curvas de estoque e exportação de dados
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handlePrintSummary}>
          <Printer className="h-4 w-4 mr-1.5" /> Imprimir Demonstrativo
        </Button>
      </div>

      {/* Reports Available Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sales Report Card */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="pb-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-2">
              <DollarSign className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Relatório Completo de Vendas</CardTitle>
            <p className="text-xs text-muted-foreground">
              Histórico de vendas, faturamento diário, mensal, canais e descontos aplicados.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleExportSales}
              disabled={orders.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar Vendas (CSV)
            </Button>
          </CardContent>
        </Card>

        {/* Inventory Report Card */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="pb-3">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 w-fit mb-2">
              <Layers className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Relatório de Estoque & Reposição</CardTitle>
            <p className="text-xs text-muted-foreground">
              Saldos físicos, níveis críticos de estoque mínimo e posições de produto.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleExportStock}
              disabled={balances.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar Estoque (CSV)
            </Button>
          </CardContent>
        </Card>

        {/* Customers Report Card */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="pb-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 w-fit mb-2">
              <Users className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Base de Clientes Ativos</CardTitle>
            <p className="text-xs text-muted-foreground">
              Cadastro completo de clientes com contatos e documentos para campanhas.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() =>
                exportToCSV(
                  'relatorio_clientes',
                  customers,
                  [
                    { header: 'Nome', key: 'name' },
                    { header: 'CPF/CNPJ', key: (r) => r.document || '-' },
                    { header: 'Telefone', key: (r) => r.phone || '-' },
                    { header: 'E-mail', key: (r) => r.email || '-' },
                  ]
                )
              }
              disabled={customers.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar Clientes (CSV)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
