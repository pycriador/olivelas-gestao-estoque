import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDate } from '@/utils/dates'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Clock,
  AlertTriangle,
  PackageX,
  CheckCircle,
  Download,
  Search,
  RotateCcw
} from 'lucide-react'

export function ExpirationPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

  // Sincronização de paginação e filtros via URL
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
    defaultPage: 1,
    defaultPageSize: 10,
    defaultSortBy: 'expiration_date',
    defaultSortOrder: 'asc',
    defaultFilters: {
      status: 'ALL',
    },
  })

  const filterStatus = filters.status || 'ALL'

  // Query batches with server-side pagination & summary
  const { data: batchesResult, isLoading } = useQuery({
    queryKey: ['stock-batches', storeId, page, pageSize, search, filterStatus, sortBy, sortOrder],
    queryFn: () =>
      inventoryService.getBatches(storeId, {
        page,
        pageSize,
        search: search || undefined,
        status: filterStatus,
        sortBy,
        sortOrder,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const batches = batchesResult?.data || []
  const totalBatches = batchesResult?.total || 0
  const totalBatchesPages = Math.ceil(totalBatches / pageSize) || 1
  const summary = batchesResult?.summary || {
    total: 0,
    expired: 0,
    critical7d: 0,
    warning30d: 0,
    normal: 0,
  }

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

  const handleExportCSV = async () => {
    try {
      const res = await inventoryService.getBatches(storeId, { pageSize: 1000 })
      if (!res.data || res.data.length === 0) return
      exportToCSV(
        'lotes_e_validades',
        res.data,
        [
          { header: 'Produto', key: (r) => r.product_name || '-' },
          { header: 'Nº Lote', key: 'lot_number' },
          { header: 'Quantidade', key: 'quantity' },
          { header: 'Data de Fabricação', key: (r) => formatDate(r.manufacturing_date) },
          { header: 'Data de Validade', key: (r) => formatDate(r.expiration_date) },
          { header: 'Status de Validade', key: (r) => r.expirationInfo?.status || '-' },
        ]
      )
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  return (
    <div className="h-full flex flex-col space-y-2.5 animate-in fade-in duration-150 min-h-0">
      {/* Unified Compact Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            Lotes & Validades
            <Badge variant="outline" className="text-[11px] font-normal px-2 py-0">
              {totalBatches} {totalBatches === 1 ? 'lote' : 'lotes'}
            </Badge>
          </h1>
          <span className="hidden sm:inline text-xs text-muted-foreground">| Prevenção de perdas e perecíveis</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-full sm:w-56 relative">
            <Input
              placeholder="Buscar lote ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
              icon={<Search className="h-3.5 w-3.5" />}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={totalBatches === 0}
            className="h-8 text-xs px-2.5"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* Ultra-compact Interactive KPI Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
        <button
          onClick={() => {
            setFilter('status', filterStatus === 'EXPIRED' ? 'ALL' : 'EXPIRED')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === 'EXPIRED'
              ? 'border-danger bg-danger/10 text-danger ring-1 ring-danger'
              : 'border-border bg-card hover:border-danger/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <PackageX className="h-3.5 w-3.5 text-danger" />
            <span className="text-xs font-semibold">Vencidos</span>
          </div>
          <span className="text-xs font-bold font-mono text-danger">{summary.expired}</span>
        </button>

        <button
          onClick={() => {
            setFilter('status', filterStatus === '7D' ? 'ALL' : '7D')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === '7D'
              ? 'border-orange-500 bg-orange-500/10 text-orange-500 ring-1 ring-orange-500'
              : 'border-border bg-card hover:border-orange-500/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-semibold">&le; 7 Dias</span>
          </div>
          <span className="text-xs font-bold font-mono text-orange-500">{summary.critical7d}</span>
        </button>

        <button
          onClick={() => {
            setFilter('status', filterStatus === '30D' ? 'ALL' : '30D')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === '30D'
              ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500'
              : 'border-border bg-card hover:border-amber-500/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold">&le; 30 Dias</span>
          </div>
          <span className="text-xs font-bold font-mono text-amber-500">{summary.warning30d}</span>
        </button>

        <button
          onClick={() => {
            setFilter('status', filterStatus === 'NORMAL' ? 'ALL' : 'NORMAL')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === 'NORMAL'
              ? 'border-success bg-success/10 text-success ring-1 ring-success'
              : 'border-border bg-card hover:border-success/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-semibold">No Prazo</span>
          </div>
          <span className="text-xs font-bold font-mono text-success">{summary.normal}</span>
        </button>
      </div>

      {/* Batches Table Card */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-sm bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : batches.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
              <PackageX className="h-8 w-8 text-muted-foreground/50 mb-2" />
              Nenhum lote encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-card/95 backdrop-blur text-muted-foreground font-semibold uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Produto</th>
                    <SortableHeader
                      column="lot_number"
                      label="Nº Lote"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="quantity"
                      label="Quantidade"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                      align="center"
                    />
                    <SortableHeader
                      column="manufacturing_date"
                      label="Fabricação"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="expiration_date"
                      label="Validade"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4 text-center">Situação</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {batches.map((batch) => {
                    const status = batch.expirationInfo?.status
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
                                if (
                                  confirm(
                                    `Confirmar descarte/baixa por vencimento do lote ${batch.lot_number}?`
                                  )
                                ) {
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

          {/* Pinned Pagination */}
          <div className="border-t border-border bg-card/80 flex-shrink-0">
            <Pagination
              currentPage={page}
              totalPages={totalBatchesPages}
              totalItems={totalBatches}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
