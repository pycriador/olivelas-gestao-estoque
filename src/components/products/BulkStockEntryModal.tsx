import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/utils/currency'
import type { Product } from '@/types/product.types'

export interface BulkStockEntryItem {
  product: Product
  quantity: number
  unitCost: number
  lotNumber: string
  expirationDate: string
}

export interface BulkStockEntryModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  onSuccess?: () => void
}

export function BulkStockEntryModal({
  isOpen,
  onClose,
  products,
  onSuccess,
}: BulkStockEntryModalProps) {
  const { storeId } = useTenant()
  const queryClient = useQueryClient()

  const [items, setItems] = React.useState<BulkStockEntryItem[]>([])
  const [defaultQuantity, setDefaultQuantity] = React.useState<number>(10)
  const [globalLotNumber, setGlobalLotNumber] = React.useState('')
  const [globalExpirationDate, setGlobalExpirationDate] = React.useState('')
  const [globalNotes, setGlobalNotes] = React.useState('Entrada manual em lote')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Initialize items when products prop changes
  React.useEffect(() => {
    if (isOpen && products.length > 0) {
      setItems(
        products.map((p) => ({
          product: p,
          quantity: defaultQuantity > 0 ? defaultQuantity : 10,
          unitCost: Number(p.cost_price) || 0,
          lotNumber: '',
          expirationDate: '',
        }))
      )
      setErrorMsg(null)
    }
  }, [isOpen, products])

  const handleApplyGlobalQuantity = () => {
    if (defaultQuantity <= 0) return
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantity: defaultQuantity,
      }))
    )
    toast.success(`Quantidade ${defaultQuantity} aplicada a todos os ${items.length} produtos.`)
  }

  const handleApplyGlobalLotAndExp = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        lotNumber: globalLotNumber || item.lotNumber,
        expirationDate: globalExpirationDate || item.expirationDate,
      }))
    )
    toast.success('Lote e validade aplicados aos produtos da lista.')
  }

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId))
  }

  const handleUpdateItem = (productId: string, updates: Partial<BulkStockEntryItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.product.id === productId ? { ...it, ...updates } : it))
    )
  }

  const entryMutation = useMutation({
    mutationFn: async () => {
      const payload = items.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
        unitCost: it.unitCost,
        lotNumber: it.lotNumber || globalLotNumber || undefined,
        expirationDate: it.expirationDate || globalExpirationDate || undefined,
        notes: globalNotes || undefined,
      }))

      return inventoryService.addBulkStock(storeId, payload)
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })

      if (result.successCount > 0) {
        toast.success(
          `${result.successCount} produto(s) tiveram o estoque atualizado com sucesso!`
        )
      }
      if (result.errorCount > 0) {
        toast.error(`${result.errorCount} falha(s) ao atualizar estoque.`)
      }

      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Falha ao processar entrada de estoque.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      setErrorMsg('Nenhum produto selecionado para entrada de estoque.')
      return
    }

    const invalid = items.some((it) => !it.quantity || it.quantity <= 0)
    if (invalid) {
      setErrorMsg('Todos os produtos devem ter uma quantidade maior que zero.')
      return
    }

    setErrorMsg(null)
    entryMutation.mutate()
  }

  const totalQuantitySum = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entrada de Estoque em Lote"
      description={`Adicionar saldo diretamente para ${items.length} produto(s) selecionado(s)`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
        {errorMsg && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Global Batch Controls Bar */}
        <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/60 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Configurações Rápidas para Todos os Selecionados</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Total a Adicionar: <b>{totalQuantitySum} un</b>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-[11px] font-semibold text-foreground">
                Qtd Padrão
              </label>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min="1"
                  value={defaultQuantity}
                  onChange={(e) => setDefaultQuantity(parseInt(e.target.value) || 0)}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyGlobalQuantity}
                  className="h-8 px-2 text-[11px] shrink-0"
                  title="Aplicar quantidade a todos da lista"
                >
                  Aplicar
                </Button>
              </div>
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="text-[11px] font-semibold text-foreground">
                Lote Global (opcional)
              </label>
              <Input
                placeholder="Ex: LOT-2026"
                value={globalLotNumber}
                onChange={(e) => setGlobalLotNumber(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="text-[11px] font-semibold text-foreground">
                Validade Global (opcional)
              </label>
              <Input
                type="date"
                value={globalExpirationDate}
                onChange={(e) => setGlobalExpirationDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyGlobalLotAndExp}
                className="w-full h-8 text-[11px]"
                disabled={!globalLotNumber && !globalExpirationDate}
              >
                Aplicar Lote/Data
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Products List */}
        <div className="border border-border rounded-2xl overflow-hidden bg-surface divide-y divide-border">
          <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted/60 font-bold uppercase text-[10px] text-muted-foreground">
            <div className="col-span-4">Produto & SKU</div>
            <div className="col-span-2 text-center">Saldo Atual</div>
            <div className="col-span-2 text-center">Qtd Entrada *</div>
            <div className="col-span-2 text-center">Lote / Validade</div>
            <div className="col-span-2 text-right">Ação</div>
          </div>

          <div className="max-h-[38vh] overflow-y-auto divide-y divide-border custom-scrollbar">
            {items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Nenhum produto na lista.
              </div>
            ) : (
              items.map((it) => (
                <div
                  key={it.product.id}
                  className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-muted/20 transition-colors"
                >
                  {/* Product Info */}
                  <div className="col-span-4 min-w-0">
                    <div className="font-semibold text-foreground truncate" title={it.product.name}>
                      {it.product.name}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {it.product.sku} {it.product.category_name ? `· ${it.product.category_name}` : ''}
                    </div>
                  </div>

                  {/* Current Stock */}
                  <div className="col-span-2 text-center font-mono text-xs font-bold text-muted-foreground">
                    {it.product.stock_quantity ?? 0} {it.product.unit || 'UN'}
                  </div>

                  {/* Input Quantity */}
                  <div className="col-span-2 text-center">
                    <Input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) =>
                        handleUpdateItem(it.product.id, {
                          quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-8 text-xs font-mono font-bold text-center border-primary/40 focus:border-primary"
                      required
                    />
                  </div>

                  {/* Lot / Exp */}
                  <div className="col-span-2 space-y-1">
                    <input
                      type="text"
                      placeholder="Lote"
                      value={it.lotNumber}
                      onChange={(e) =>
                        handleUpdateItem(it.product.id, { lotNumber: e.target.value })
                      }
                      className="w-full h-6 px-1.5 text-[10px] font-mono rounded border border-input bg-background text-foreground"
                    />
                    <input
                      type="date"
                      value={it.expirationDate}
                      onChange={(e) =>
                        handleUpdateItem(it.product.id, { expirationDate: e.target.value })
                      }
                      className="w-full h-6 px-1.5 text-[10px] font-mono rounded border border-input bg-background text-foreground"
                    />
                  </div>

                  {/* Action */}
                  <div className="col-span-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.product.id)}
                      title="Remover da lista de entrada"
                      className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-foreground">
            Observações do Lançamento
          </label>
          <Input
            value={globalNotes}
            onChange={(e) => setGlobalNotes(e.target.value)}
            placeholder="Ex: Recebimento fornecedor, conferência em loja, etc."
            className="h-8 text-xs"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-10 sm:h-9"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto h-10 sm:h-9 font-semibold"
            disabled={items.length === 0}
            isLoading={entryMutation.isPending}
          >
            <ArrowDownRight className="h-4 w-4 mr-1.5" /> Confirmar Entrada ({items.length} itens)
          </Button>
        </div>
      </form>
    </Modal>
  )
}
