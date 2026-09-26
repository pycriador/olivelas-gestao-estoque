import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import { productService } from '@/services/productService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { formatDateTime } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Layers,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Download,
  AlertTriangle,
  History
} from 'lucide-react'
import type { StockMovementType } from '@/types/database.types'

export function InventoryPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = React.useState<'balances' | 'movements'>('balances')
  const [search, setSearch] = React.useState('')
  const [isMovementModalOpen, setIsMovementModalOpen] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Form
  const [productId, setProductId] = React.useState('')
  const [movementType, setMovementType] = React.useState<StockMovementType>('ENTRY')
  const [quantity, setQuantity] = React.useState<number>(1)
  const [notes, setNotes] = React.useState('')

  const { data: balances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ['stock-balances', storeId],
    queryFn: () => inventoryService.getStockBalances(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['stock-movements', storeId],
    queryFn: () => inventoryService.getMovements(storeId, 100),
    enabled: Boolean(hasActiveStore),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-select', storeId],
    queryFn: () => productService.listProducts(storeId, { pageSize: 100 }),
    enabled: Boolean(hasActiveStore),
  })

  const productList = productsData?.data || []

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

  const filteredBalances = balances.filter(
    (b) =>
      b.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.product_sku?.toLowerCase().includes(search.toLowerCase())
  )

  const handleExportBalances = () => {
    if (balances.length === 0) return
    exportToCSV(
      'saldos_estoque',
      balances,
      [
        { header: 'Produto', key: (r) => r.product_name || '-' },
        { header: 'SKU', key: (r) => r.product_sku || '-' },
        { header: 'Saldo Físico', key: 'quantity' },
        { header: 'Reservado', key: 'reserved_quantity' },
        { header: 'Disponível', key: 'available_quantity' },
        { header: 'Estoque Mínimo', key: (r) => r.min_stock ?? 0 },
      ]
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t.inventory.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t.inventory.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportBalances}>
            <Download className="h-4 w-4 mr-1.5" /> Exportar Saldos
          </Button>
          <Button size="sm" onClick={() => setIsMovementModalOpen(true)} className="shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> Lançar Movimento
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'balances'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4 inline mr-1.5" /> Saldos Atuais por Produto
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'movements'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4 inline mr-1.5" /> Histórico de Movimentações
        </button>
      </div>

      {/* Balances View */}
      {activeTab === 'balances' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
            <CardTitle className="text-base font-bold">Posição de Estoque</CardTitle>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Filtrar por produto ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingBalances ? (
              <div className="p-6">
                <LoadingSkeleton count={6} className="h-10" />
              </div>
            ) : filteredBalances.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum saldo encontrado para os filtros informados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-center">Físico</th>
                      <th className="py-3 px-4 text-center">Reservado</th>
                      <th className="py-3 px-4 text-center">Disponível</th>
                      <th className="py-3 px-4 text-center">Mínimo</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredBalances.map((b) => {
                      const isLow = b.quantity <= (b.min_stock || 0)
                      return (
                        <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {b.product_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {b.product_sku}
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
          </CardContent>
        </Card>
      )}

      {/* Movements View */}
      {activeTab === 'movements' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Trilha de Movimentos de Estoque</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMovements ? (
              <div className="p-6">
                <LoadingSkeleton count={6} className="h-10" />
              </div>
            ) : movements.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhuma movimentação registrada até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4">Tipo de Movimento</th>
                      <th className="py-3 px-4 text-center">Qtd</th>
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
