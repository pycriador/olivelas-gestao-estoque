import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import { useTenant } from '@/hooks/useTenant'
import { formatDate, checkExpirationStatus } from '@/utils/dates'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Calendar,
  Clock,
  AlertTriangle,
  PackageX,
  CheckCircle,
  Download,
  Trash2
} from 'lucide-react'

export function ExpirationPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = React.useState<string>('ALL')

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['stock-batches', storeId],
    queryFn: () => inventoryService.getBatches(storeId),
    enabled: Boolean(hasActiveStore),
  })

  // Writeoff expired batch mutation
  const writeoffMutation = useMutation({
    mutationFn: (batch: any) =>
      inventoryService.createManualMovement({
        storeId,
        productId: batch.product_id,
        movementType: 'EXPIRATION',
        quantity: batch.quantity,
        batchId: batch.id,
        notes: `Baixa por vencimento do lote ${batch.lot_number}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
    },
  })

  // Categorize batches
  const batchesWithStatus = batches.map((b) => {
    const info = checkExpirationStatus(b.expiration_date)
    return {
      ...b,
      expirationInfo: info,
    }
  })

  const expiredList = batchesWithStatus.filter((b) => b.expirationInfo.status === 'expired')
  const critical7dList = batchesWithStatus.filter((b) => b.expirationInfo.status === 'critical_7_days')
  const warning30dList = batchesWithStatus.filter((b) => b.expirationInfo.status === 'warning_30_days')
  const normalList = batchesWithStatus.filter((b) => b.expirationInfo.status === 'normal')

  const displayedBatches = batchesWithStatus.filter((b) => {
    if (filterStatus === 'EXPIRED') return b.expirationInfo.status === 'expired'
    if (filterStatus === '7D') return b.expirationInfo.status === 'critical_7_days'
    if (filterStatus === '30D') return b.expirationInfo.status === 'warning_30_days'
    if (filterStatus === 'NORMAL') return b.expirationInfo.status === 'normal'
    return true
  })

  const handleExportCSV = () => {
    if (batches.length === 0) return
    exportToCSV(
      'lotes_e_validades',
      batchesWithStatus,
      [
        { header: 'Produto', key: (r) => r.product_name || '-' },
        { header: 'Nº Lote', key: 'lot_number' },
        { header: 'Quantidade', key: 'quantity' },
        { header: 'Data de Fabricação', key: (r) => formatDate(r.manufacturing_date) },
        { header: 'Data de Validade', key: (r) => formatDate(r.expiration_date) },
        { header: 'Status de Validade', key: (r) => r.expirationInfo.status },
      ]
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Lotes & Controle de Validades
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitoramento de produtos perecíveis com prevenção contra perdas
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={batches.length === 0}>
          <Download className="h-4 w-4 mr-1.5" /> Exportar Lotes CSV
        </Button>
      </div>

      {/* Summary Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          onClick={() => setFilterStatus('EXPIRED')}
          className={`cursor-pointer transition-all ${
            filterStatus === 'EXPIRED' ? 'ring-2 ring-danger' : 'hover:border-danger/50'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Produtos Vencidos</span>
            <div className="p-2 rounded-xl bg-danger/10 text-danger">
              <PackageX className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-danger">
              {expiredList.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Bloqueio de venda recomendado</span>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterStatus('7D')}
          className={`cursor-pointer transition-all ${
            filterStatus === '7D' ? 'ring-2 ring-orange-500' : 'hover:border-orange-500/50'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Vencendo em 7 Dias</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-orange-500">
              {critical7dList.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Ação promocional urgente</span>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterStatus('30D')}
          className={`cursor-pointer transition-all ${
            filterStatus === '30D' ? 'ring-2 ring-amber-500' : 'hover:border-amber-500/50'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Vencendo em 30 Dias</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-amber-500">
              {warning30dList.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Alerta de giro prioritário</span>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterStatus('NORMAL')}
          className={`cursor-pointer transition-all ${
            filterStatus === 'NORMAL' ? 'ring-2 ring-success' : 'hover:border-success/50'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-5">
            <span className="text-xs font-medium text-muted-foreground">Dentro do Prazo</span>
            <div className="p-2 rounded-xl bg-success/10 text-success">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-success">
              {normalList.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Lotes normais</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Reset Button */}
      {filterStatus !== 'ALL' && (
        <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border">
          <span className="text-xs font-medium">
            Exibindo filtro: <b>{filterStatus}</b> ({displayedBatches.length} lotes)
          </span>
          <Button variant="ghost" size="sm" onClick={() => setFilterStatus('ALL')}>
            Ver todos os lotes
          </Button>
        </div>
      )}

      {/* Batches Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : displayedBatches.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum lote com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Número do Lote</th>
                    <th className="py-3 px-4 text-center">Quantidade</th>
                    <th className="py-3 px-4">Fabricação</th>
                    <th className="py-3 px-4">Validade</th>
                    <th className="py-3 px-4 text-center">Situação</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedBatches.map((batch) => {
                    const status = batch.expirationInfo.status
                    return (
                      <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {batch.product_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {batch.lot_number}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {batch.quantity}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(batch.manufacturing_date)}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {formatDate(batch.expiration_date)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {status === 'expired' && (
                            <Badge variant="destructive" className="gap-1">
                              <PackageX className="h-3 w-3" /> VENCIDO
                            </Badge>
                          )}
                          {status === 'critical_7_days' && (
                            <Badge variant="warning" className="gap-1 text-orange-500">
                              <AlertTriangle className="h-3 w-3" /> &le; 7 DIAS
                            </Badge>
                          )}
                          {status === 'warning_30_days' && (
                            <Badge variant="warning" className="gap-1">
                              <Clock className="h-3 w-3" /> &le; 30 DIAS
                            </Badge>
                          )}
                          {status === 'normal' && (
                            <Badge variant="success">OK</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {status === 'expired' && batch.quantity > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-[11px] h-7 px-2"
                              onClick={() => {
                                if (confirm(`Confirmar descarte/baixa por vencimento do lote ${batch.lot_number}?`)) {
                                  writeoffMutation.mutate(batch)
                                }
                              }}
                            >
                              Dar Baixa
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
