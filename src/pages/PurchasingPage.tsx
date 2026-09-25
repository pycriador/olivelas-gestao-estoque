import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasingService } from '@/services/purchasingService'
import { supplierService } from '@/services/supplierService'
import { productService } from '@/services/productService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import {
  FileText,
  Plus,
  Truck,
  CheckCircle2,
  PackageCheck,
  AlertCircle
} from 'lucide-react'
import type { PurchaseOrder } from '@/types/purchasing.types'

export function PurchasingPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false)
  const [receivingPO, setReceivingPO] = React.useState<PurchaseOrder | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Form states for new purchase order
  const [supplierId, setSupplierId] = React.useState('')
  const [shippingCost, setShippingCost] = React.useState(0)
  const [notes, setNotes] = React.useState('')
  const [items, setItems] = React.useState<
    { productId: string; quantityOrdered: number; unitCost: number; lotNumber?: string; expirationDate?: string }[]
  >([{ productId: '', quantityOrdered: 1, unitCost: 0 }])

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', storeId],
    queryFn: () => purchasingService.listPurchaseOrders(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-select', storeId],
    queryFn: () => supplierService.listSuppliers(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-select', storeId],
    queryFn: () => productService.listProducts(storeId, { pageSize: 100 }),
    enabled: Boolean(hasActiveStore),
  })

  const productList = productsData?.data || []

  // Create PO Mutation
  const createMutation = useMutation({
    mutationFn: () =>
      purchasingService.createPurchaseOrder({
        storeId,
        supplierId,
        items,
        shippingCost,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
      setIsNewModalOpen(false)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  // Receive Stock Mutation
  const receiveMutation = useMutation({
    mutationFn: (poId: string) => purchasingService.receivePurchaseOrder(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setReceivingPO(null)
    },
    onError: (err) => alert(parseApiError(err)),
  })

  const resetForm = () => {
    setSupplierId('')
    setShippingCost(0)
    setNotes('')
    setItems([{ productId: '', quantityOrdered: 1, unitCost: 0 }])
    setErrorMsg(null)
  }

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantityOrdered: 1, unitCost: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }

    // If product selected, prefill cost
    if (field === 'productId') {
      const p = productList.find((x) => x.id === value)
      if (p) {
        updated[index].unitCost = Number(p.cost_price)
      }
    }
    setItems(updated)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Ordens de Compra & Entrada de Estoque
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Emissão de compras de fornecedores e conferência física com geração de lotes
          </p>
        </div>

        <Button onClick={() => setIsNewModalOpen(true)} className="shadow-md">
          <Plus className="h-4 w-4 mr-1.5" /> Nova Ordem de Compra
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-12" />
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<FileText className="h-10 w-10 text-primary" />}
                title="Nenhuma ordem de compra cadastrada"
                description="Emita pedidos para seus fornecedores para repor o estoque e atualizar custos automaticamente no recebimento."
                actionLabel="Emitir Ordem de Compra"
                onAction={() => setIsNewModalOpen(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Ordem #</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Itens</th>
                    <th className="py-3 px-4">Data de Emissão</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {po.order_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {po.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {po.items?.length || 0} produtos
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatDate(po.issued_at || po.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={po.status === 'RECEIVED' ? 'success' : 'default'}>
                          {po.status === 'RECEIVED' ? 'RECEBIDA & ESTOCADA' : po.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {po.status !== 'RECEIVED' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="text-[11px] h-7 px-2.5 shadow-sm"
                            onClick={() => setReceivingPO(po)}
                          >
                            <PackageCheck className="h-3.5 w-3.5 mr-1" /> Receber Mercadoria
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Purchase Order Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Nova Ordem de Compra"
        description="Selecione o fornecedor, produtos, quantidades e lotes para emissão"
        maxWidth="xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="space-y-4 pt-2 text-xs"
        >
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium">Fornecedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none"
              required
            >
              <option value="">Selecione um fornecedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.trade_name || s.corporate_name}
                </option>
              ))}
            </select>
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-[10px] text-muted-foreground">
                Itens a Comprar
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-primary hover:underline text-xs font-semibold"
              >
                + Adicionar Item
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-border bg-surface-elevated space-y-2"
                >
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <label className="text-[10px] text-muted-foreground block">Produto</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs"
                        required
                      >
                        <option value="">Selecione...</option>
                        {productList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="text-[10px] text-muted-foreground block">Qtd</label>
                      <Input
                        type="number"
                        min="1"
                        className="h-8"
                        value={item.quantityOrdered}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantityOrdered', parseFloat(e.target.value) || 1)
                        }
                        required
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="text-[10px] text-muted-foreground block">Custo Unit (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8"
                        value={item.unitCost}
                        onChange={(e) =>
                          handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 pt-1 border-t border-border/50">
                    <div className="col-span-6">
                      <Input
                        placeholder="Nº Lote (Ex: LT-2026-A)"
                        className="h-7 text-[11px]"
                        value={item.lotNumber || ''}
                        onChange={(e) => handleItemChange(idx, 'lotNumber', e.target.value)}
                      />
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="date"
                        className="h-7 text-[11px]"
                        value={item.expirationDate || ''}
                        onChange={(e) => handleItemChange(idx, 'expirationDate', e.target.value)}
                      />
                    </div>
                    {items.length > 1 && (
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-danger hover:underline text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Emitir Ordem de Compra
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receive Stock Confirmation Modal */}
      <Modal
        isOpen={Boolean(receivingPO)}
        onClose={() => setReceivingPO(null)}
        title="Receber Mercadorias & Entrar no Estoque"
        description="Esta ação atualizará os saldos em estoque, gerará os lotes e registrará os movimentos de entrada"
      >
        {receivingPO && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <div className="flex justify-between font-semibold text-foreground">
                <span>Ordem: {receivingPO.order_number}</span>
                <span>{formatCurrency(receivingPO.total_amount)}</span>
              </div>
              <div className="text-muted-foreground">Fornecedor: {receivingPO.supplier_name}</div>
            </div>

            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
              {receivingPO.items?.map((it) => (
                <div key={it.id} className="p-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-foreground">{it.product_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Qtd: <b>{it.quantity_ordered}</b> | Lote: {it.lot_number || 'Sem lote'}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    {formatCurrency(it.total_cost)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setReceivingPO(null)}>
                Voltar
              </Button>
              <Button
                variant="default"
                isLoading={receiveMutation.isPending}
                onClick={() => receiveMutation.mutate(receivingPO.id)}
              >
                Confirmar Recebimento & Entrada no Estoque
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
