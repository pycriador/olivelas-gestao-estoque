import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import { productService } from '@/services/productService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDateTime } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PageHeader } from '@/components/common/PageHeader'
import {
  Layers,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Download,
  AlertTriangle,
  History,
  Filter
} from 'lucide-react'
import type { StockMovementType } from '@/types/database.types'

export function InventoryPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  // Sincronização via URL
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
    defaultSortBy: 'quantity',
    defaultSortOrder: 'asc',
    defaultFilters: {
      tab: 'balances',
      movementType: 'ALL',
    },
  })

  const activeTab = (filters.tab as 'balances' | 'movements') || 'balances'
  const movementTypeFilter = filters.movementType || 'ALL'

  const [isMovementModalOpen, setIsMovementModalOpen] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Form states
  const [productId, setProductId] = React.useState('')
  const [movementType, setMovementType] = React.useState<StockMovementType>('ENTRY')
  const [quantity, setQuantity] = React.useState<number>(1)
  const [notes, setNotes] = React.useState('')

  // Query Balances
  const { data: balancesData, isLoading: loadingBalances } = useQuery({
    queryKey: ['stock-balances', storeId, page, pageSize, search, sortBy, sortOrder],
    queryFn: () =>
      inventoryService.getStockBalances(storeId, {
        page,
        pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
      }),
    enabled: Boolean(hasActiveStore && activeTab === 'balances'),
  })

  // Query Movements
  const { data: movementsData, isLoading: loadingMovements } = useQuery({
    queryKey: ['stock-movements', storeId, page, pageSize, search, movementTypeFilter, sortBy, sortOrder],
    queryFn: () =>
      inventoryService.getMovements(storeId, {
        page,
        pageSize,
        search: search || undefined,
        movementType: movementTypeFilter !== 'ALL' ? movementTypeFilter : undefined,
        sortBy: sortBy === 'quantity' ? 'quantity' : 'created_at',
        sortOrder,
      }),
    enabled: Boolean(hasActiveStore && activeTab === 'movements'),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-select', storeId],
    queryFn: () => productService.listProducts(storeId, { pageSize: 100 }),
    enabled: Boolean(hasActiveStore),
  })

  const productList = productsData?.data || []
  const balances = balancesData?.data || []
  const totalBalances = balancesData?.total || 0
  const totalBalancesPages = Math.ceil(totalBalances / pageSize) || 1

  const movements = movementsData?.data || []
  const totalMovements = movementsData?.total || 0
  const totalMovementsPages = Math.ceil(totalMovements / pageSize) || 1

  const movementMutation = useMutation({
    mutationFn: () =>
      inventoryService.createManualMovement({
        storeId,
        productId,
        movementType,
        quantity,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setIsMovementModalOpen(false)
      setProductId('')
      setQuantity(1)
      setNotes('')
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const handleExportBalances = async () => {
    try {
      const allBalances = await inventoryService.getStockBalances(storeId, { pageSize: 1000 })
      if (!allBalances.data || allBalances.data.length === 0) return
      exportToCSV(
        'saldos_estoque',
        allBalances.data,
        [
          { header: 'Produto', key: (r) => r.product_name || '-' },
          { header: 'SKU', key: (r) => r.product_sku || '-' },
          { header: 'Saldo Físico', key: 'quantity' },
          { header: 'Reservado', key: 'reserved_quantity' },
          { header: 'Disponível', key: 'available_quantity' },
          { header: 'Estoque Mínimo', key: (r) => r.min_stock ?? 0 },
        ]
      )
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  return (
    <div className="h-full flex flex-col space-y-2.5 animate-in fade-in duration-150 min-h-0">
      {/* Top Navbar Title & Search */}
      <PageHeader title={t.inventory.title}>
        <Input
          placeholder={activeTab === 'balances' ? 'Buscar produto ou SKU...' : 'Buscar em observações...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Tabs, Filters & Actions) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        {/* Tab Selector Pills */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
          <button
            onClick={() => {
              setFilter('tab', 'balances')
              setPage(1)
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'balances'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5 inline mr-1" /> Saldos ({totalBalances})
          </button>
          <button
            onClick={() => {
              setFilter('tab', 'movements')
              setPage(1)
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'movements'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5 inline mr-1" /> Movimentos ({totalMovements})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {activeTab === 'movements' && (
            <select
              value={movementTypeFilter}
              onChange={(e) => {
                setFilter('movementType', e.target.value)
                setPage(1)
              }}
              aria-label="Filtrar por tipo"
              className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Saída</option>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="LOSS">Perda</option>
              <option value="DAMAGE">Avaria</option>
              <option value="EXPIRATION">Vencimento</option>
              <option value="RETURN">Devolução</option>
            </select>
          )}

          {activeTab === 'balances' && (
            <Button variant="outline" size="sm" onClick={handleExportBalances} className="h-8 text-xs px-2.5">
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar
            </Button>
          )}

          <Button size="sm" onClick={() => setIsMovementModalOpen(true)} className="h-8 text-xs px-2.5 shadow-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Lançar Movimento
          </Button>
        </div>
      </div>

      {/* Balances View */}
      {activeTab === 'balances' && (
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
            {loadingBalances ? (
              <div className="p-6">
                <LoadingSkeleton count={6} className="h-10" />
              </div>
            ) : balances.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                <Layers className="h-8 w-8 text-muted-foreground/50 mb-2" />
                Nenhum saldo encontrado para os filtros informados.
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border bg-card/95 backdrop-blur text-muted-foreground font-semibold uppercase text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">SKU</th>
                      <SortableHeader
                        column="quantity"
                        label="Físico"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                        align="center"
                      />
                      <SortableHeader
                        column="reserved_quantity"
                        label="Reservado"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                        align="center"
                      />
                      <SortableHeader
                        column="available_quantity"
                        label="Disponível"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                        align="center"
                      />
                      <th className="py-3 px-4 text-center">Mínimo</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {balances.map((b) => {
                      const isLow = b.quantity <= (b.min_stock || 0)
                      return (
                        <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {b.product_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {b.product_sku || '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono">
                            {b.quantity}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                            {b.reserved_quantity}
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono text-primary">
                            {b.available_quantity}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                            {b.min_stock || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isLow ? (
                              <Badge variant="warning" className="gap-1">
                                <AlertTriangle className="h-3 w-3" /> Reposição
                              </Badge>
                            ) : (
                              <Badge variant="success">Normal</Badge>
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
                totalPages={totalBalancesPages}
                totalItems={totalBalances}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movements View */}
      {activeTab === 'movements' && (
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
            {loadingMovements ? (
              <div className="p-6">
                <LoadingSkeleton count={6} className="h-10" />
              </div>
            ) : movements.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                <History className="h-8 w-8 text-muted-foreground/50 mb-2" />
                Nenhuma movimentação registrada para os filtros aplicados.
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border bg-card/95 backdrop-blur text-muted-foreground font-semibold uppercase text-[10px] sticky top-0 z-10">
                    <tr>
                      <SortableHeader
                        column="created_at"
                        label="Data / Hora"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                      />
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">Tipo de Movimento</th>
                      <SortableHeader
                        column="quantity"
                        label="Qtd"
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        onSort={toggleSort}
                        align="center"
                      />
                      <th className="py-3 px-4 text-center">Antes &rarr; Depois</th>
                      <th className="py-3 px-4">Usuário / Origem</th>
                      <th className="py-3 px-4">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {movements.map((m) => {
                      const isEntry = ['ENTRY', 'RETURN'].includes(m.movement_type)
                      return (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                            {formatDateTime(m.created_at)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {m.product_name}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                                isEntry ? 'text-success' : 'text-danger'
                              }`}
                            >
                              {isEntry ? (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                              {m.movement_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {m.quantity}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                            {m.previous_quantity} &rarr;{' '}
                            <span className="font-bold text-foreground">{m.new_quantity}</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {m.user_name}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground italic">
                            {m.notes || '-'}
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
                totalPages={totalMovementsPages}
                totalItems={totalMovements}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movement Modal */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Lançar Movimento de Estoque"
        description="Registre entradas, saídas, perdas, quebras ou ajustes manuais"
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setErrorMsg(null)
            movementMutation.mutate()
          }}
          className="space-y-4 pt-1"
        >
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Produto *</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Selecione um produto...</option>
              {productList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Estoque: {p.stock_quantity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tipo de Movimento *</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as StockMovementType)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ENTRY">Entrada Manual</option>
                <option value="EXIT">Saída Manual</option>
                <option value="ADJUSTMENT">Ajuste de Saldo</option>
                <option value="LOSS">Perda</option>
                <option value="DAMAGE">Avaria / Quebra</option>
                <option value="EXPIRATION">Descarte por Vencimento</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Quantidade *</label>
              <Input
                type="number"
                step="1"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Justificativa / Observações</label>
            <Input
              placeholder="Ex: Quebra de frasco durante movimentação"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => setIsMovementModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              isLoading={movementMutation.isPending}
            >
              Confirmar Movimento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
