import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Trash2,
  Truck,
} from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'
import { storeService } from '@/services/storeService'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import type { StockBalance } from '@/types/inventory.types'

export interface TransferRowItem {
  productId: string
  productName: string
  productSku: string
  unit: string
  availableStock: number
  batchId: string
  quantity: number
  unitCost: number
  sellingPrice: number
  notes: string
}

export interface StockBranchTransferModalProps {
  isOpen: boolean
  onClose: () => void
  originStoreId?: string
  originStoreName?: string
  preselectedBalances?: StockBalance[]
  preselectedDestinationStoreId?: string
  onSuccess?: () => void
}

export function StockBranchTransferModal({
  isOpen,
  onClose,
  originStoreId,
  originStoreName,
  preselectedBalances = [],
  preselectedDestinationStoreId = '',
  onSuccess,
}: StockBranchTransferModalProps) {
  const { storeId: tenantStoreId, storeName: tenantStoreName } = useTenant()
  const storeId = originStoreId || tenantStoreId
  const activeOriginName = originStoreName || tenantStoreName || 'Matriz'
  const queryClient = useQueryClient()

  const [destinationStoreId, setDestinationStoreId] = React.useState(
    preselectedDestinationStoreId
  )
  const [driverName, setDriverName] = React.useState('')
  const [vehiclePlate, setVehiclePlate] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [productSearch, setProductSearch] = React.useState('')
  const [items, setItems] = React.useState<TransferRowItem[]>([])
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Quick branch creation inline
  const [isCreatingBranch, setIsCreatingBranch] = React.useState(false)
  const [newBranchName, setNewBranchName] = React.useState('')
  const [newBranchCode, setNewBranchCode] = React.useState('')
  const [newBranchManager, setNewBranchManager] = React.useState('')
  const [newBranchCity, setNewBranchCity] = React.useState('')

  React.useEffect(() => {
    if (isOpen) {
      if (preselectedDestinationStoreId) {
        setDestinationStoreId(preselectedDestinationStoreId)
      }
      if (preselectedBalances.length > 0) {
        setItems(
          preselectedBalances
            .filter((b) => b.available_quantity > 0)
            .map((b) => ({
              productId: b.product_id,
              productName: b.product_name || 'Produto',
              productSku: b.product_sku || '',
              unit: b.unit || 'UN',
              availableStock: b.available_quantity,
              batchId: '',
              quantity: Math.min(5, b.available_quantity),
              unitCost: b.cost_price || 0,
              sellingPrice: b.selling_price || 0,
              notes: '',
            }))
        )
      } else {
        setItems([])
      }
      setErrorMsg(null)
    }
  }, [isOpen, preselectedBalances, preselectedDestinationStoreId])

  const { data: destinationStores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['transfer-destination-stores', storeId],
    queryFn: () => storeService.listTransferDestinationStores(storeId),
    enabled: Boolean(storeId) && isOpen,
  })

  const { data: stockBalancesData } = useQuery({
    queryKey: ['stock-balances-transfer-picker', storeId, productSearch],
    queryFn: () =>
      inventoryService.getStockBalances(storeId, {
        search: productSearch || undefined,
        stockStatus: 'in',
        pageSize: 50,
      }),
    enabled: Boolean(storeId) && isOpen,
  })

  const { data: batchesData } = useQuery({
    queryKey: ['stock-batches-all', storeId],
    queryFn: () => inventoryService.getBatches(storeId, { pageSize: 250 }),
    enabled: Boolean(storeId) && isOpen,
  })

  const allBatches = batchesData?.data || []
  const availableBalances = (stockBalancesData?.data || []).filter(
    (b) => b.available_quantity > 0 && !items.some((i) => i.productId === b.product_id)
  )

  const createBranchMutation = useMutation({
    mutationFn: async () => {
      if (!newBranchName.trim()) throw new Error('Informe o nome da filial.')
      const slugBase = newBranchName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const branch = await storeService.createStore({
        name: newBranchName.trim(),
        slug: `${slugBase}-${Math.floor(100 + Math.random() * 900)}`,
        parent_store_id: storeId,
        is_branch: true,
        branch_code: newBranchCode.trim() || `FIL-${Math.floor(10 + Math.random() * 89)}`,
        manager_name: newBranchManager.trim() || null,
        address_city: newBranchCity.trim() || null,
        description: `Filial vinculada à matriz ${activeOriginName}`,
      })
      return branch
    },
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: ['transfer-destination-stores', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      setDestinationStoreId(branch.id)
      setIsCreatingBranch(false)
      setNewBranchName('')
      setNewBranchCode('')
      setNewBranchManager('')
      setNewBranchCity('')
      toast.success(`Filial "${branch.name}" cadastrada e selecionada para remessa!`)
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const handleAddBalanceItem = (b: StockBalance) => {
    if (items.some((i) => i.productId === b.product_id)) return
    setItems((prev) => [
      ...prev,
      {
        productId: b.product_id,
        productName: b.product_name || 'Produto',
        productSku: b.product_sku || '',
        unit: b.unit || 'UN',
        availableStock: b.available_quantity,
        batchId: '',
        quantity: Math.min(1, b.available_quantity),
        unitCost: b.cost_price || 0,
        sellingPrice: b.selling_price || 0,
        notes: '',
      },
    ])
  }

  const handleUpdateItem = (productId: string, patch: Partial<TransferRowItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it))
    )
  }

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId))
  }

  const transferMutation = useMutation({
    mutationFn: () =>
      inventoryService.executeStockTransferToBranch(storeId, {
        destinationStoreId,
        driverName: driverName || null,
        vehiclePlate: vehiclePlate || null,
        notes: notes || null,
        items: items.map((it) => ({
          productId: it.productId,
          batchId: it.batchId || null,
          quantity: it.quantity,
          unitCost: it.unitCost,
          sellingPrice: it.sellingPrice,
          notes: it.notes || null,
        })),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-transfers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(
        `Remessa ${result.transfer_code} concluída! ${result.total_items} item(ns) enviado(s) para a filial (${formatCurrency(result.total_cost_value)}).`
      )
      onSuccess?.()
      onClose()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const totalUnits = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
  const totalCost = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
    0
  )
  const totalSellingPotential = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.sellingPrice) || 0),
    0
  )

  const hasInvalidItem = items.some(
    (it) => !it.quantity || it.quantity <= 0 || it.quantity > it.availableStock
  )

  const canSubmit =
    Boolean(destinationStoreId) && items.length > 0 && !hasInvalidItem

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!destinationStoreId) {
      setErrorMsg('Selecione a filial de destino para enviar os produtos.')
      return
    }
    if (items.length === 0) {
      setErrorMsg('Adicione pelo menos um produto à remessa.')
      return
    }
    if (hasInvalidItem) {
      setErrorMsg('Verifique as quantidades informadas (não podem exceder o saldo disponível).')
      return
    }
    transferMutation.mutate()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar Produtos do Estoque para Filial (Sem Venda)"
      description="Transferência interna de mercadorias entre Matriz e Filial — o produto é debitado desta unidade e disponibilizado para venda na filial de destino."
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
        {errorMsg && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Banner explicativo da operação sem venda */}
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2.5">
          <ArrowRightLeft className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-[11px] text-foreground leading-relaxed">
            <span className="font-bold text-primary">Operação de Remessa Interna (Sem Venda):</span>{' '}
            Nenhum pedido de venda ou cobrança de cliente é gerado na origem. Os produtos, categorias, imagens e lotes são sincronizados automaticamente na filial de destino para serem vendidos pelo PDV/Catálogo da filial.
          </div>
        </div>

        {/* 1. Filial de Destino & Logística */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              1. Filial de Destino e Transporte
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setIsCreatingBranch((v) => !v)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {isCreatingBranch ? 'Cancelar Nova Filial' : 'Cadastrar Nova Filial Rápida'}
            </Button>
          </div>

          {isCreatingBranch && (
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Cadastro Rápido de Filial Vinculada à {activeOriginName}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold">Nome da Filial *</label>
                  <Input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Ex: Filial 02 - Shopping Jardins"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold">Código da Filial</label>
                  <Input
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="Ex: FIL-02"
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold">Gerente / Responsável</label>
                  <Input
                    value={newBranchManager}
                    onChange={(e) => setNewBranchManager(e.target.value)}
                    placeholder="Ex: Carlos Mendes"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  placeholder="Cidade / UF (ex: São Paulo - SP)"
                  className="h-8 text-xs max-w-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  isLoading={createBranchMutation.isPending}
                  onClick={() => createBranchMutation.mutate()}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Salvar e Selecionar Filial
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Filial / Unidade de Destino *
              </label>
              <select
                value={destinationStoreId}
                onChange={(e) => setDestinationStoreId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">
                  {loadingStores
                    ? 'Carregando filiais...'
                    : destinationStores.length === 0
                      ? 'Nenhuma filial cadastrada — clique em Cadastrar Nova Filial'
                      : 'Selecione a filial de destino...'}
                </option>
                {destinationStores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.branch_code ? `[${st.branch_code}] ` : ''}
                    {st.name}
                    {st.parent_store_id === storeId ? ' (Filial Vinculada)' : ''}
                    {st.address_city ? ` — ${st.address_city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Responsável pelo Transporte / Motorista
              </label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Ex: Marcos Oliveira / Logística Interna"
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Placa do Veículo / Romaneio
              </label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="Ex: BRA-2E19"
                className="h-10 text-xs font-mono uppercase"
              />
            </div>
          </div>
        </section>

        {/* 2. Seleção de Produtos do Estoque */}
        <section className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
              <Package className="h-3.5 w-3.5 text-primary" />
              2. Produtos a Enviar para a Filial ({items.length})
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto no estoque para adicionar..."
                  className="h-8 text-xs"
                  icon={<Search className="h-3.5 w-3.5" />}
                />
              </div>
              <select
                value=""
                onChange={(e) => {
                  const found = availableBalances.find((b) => b.product_id === e.target.value)
                  if (found) handleAddBalanceItem(found)
                }}
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground max-w-[240px]"
              >
                <option value="">+ Adicionar produto ({availableBalances.length})...</option>
                {availableBalances.map((b) => (
                  <option key={b.product_id} value={b.product_id}>
                    {b.product_sku} — {b.product_name} ({b.available_quantity} {b.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-surface divide-y divide-border">
            <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted/60 font-bold uppercase text-[10px] text-muted-foreground">
              <div className="col-span-4">Produto & SKU</div>
              <div className="col-span-3">Lote de Origem (Opcional)</div>
              <div className="col-span-2 text-center">Qtd a Enviar *</div>
              <div className="col-span-2 text-right">Preço Venda Filial</div>
              <div className="col-span-1 text-right">Ação</div>
            </div>

            <div className="max-h-[34vh] overflow-y-auto divide-y divide-border custom-scrollbar">
              {items.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  Selecione um ou mais produtos acima para compor a remessa para a filial.
                </div>
              ) : (
                items.map((it) => {
                  const prodBatches = allBatches.filter(
                    (b) => b.product_id === it.productId && b.quantity > 0
                  )
                  const isOver = it.quantity > it.availableStock
                  return (
                    <div
                      key={it.productId}
                      className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-muted/20"
                    >
                      <div className="col-span-4 min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {it.productName}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {it.productSku} · disp: <b>{it.availableStock}</b> {it.unit} · custo{' '}
                          {formatCurrency(it.unitCost)}
                        </div>
                      </div>

                      <div className="col-span-3">
                        <select
                          value={it.batchId}
                          onChange={(e) =>
                            handleUpdateItem(it.productId, { batchId: e.target.value })
                          }
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-[11px]"
                        >
                          <option value="">Baixa geral (sem lote específico)</option>
                          {prodBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.lot_number} ({b.quantity} un · val{' '}
                              {b.expiration_date ? formatDate(b.expiration_date) : '—'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 text-center">
                        <Input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max={it.availableStock}
                          value={it.quantity}
                          onChange={(e) =>
                            handleUpdateItem(it.productId, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`h-8 text-xs font-mono font-bold text-center ${
                            isOver ? 'border-danger text-danger' : ''
                          }`}
                        />
                        {isOver && (
                          <span className="text-[9px] text-danger block">
                            Máx: {it.availableStock}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.sellingPrice}
                          onChange={(e) =>
                            handleUpdateItem(it.productId, {
                              sellingPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-xs font-mono text-right"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.productId)}
                          className="p-1.5 text-muted-foreground hover:text-danger rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Resumo financeiro da transferência */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <span>
                Volume Total: <b className="font-mono text-foreground">{totalUnits} un</b>
              </span>
              <span>
                Custo Transferido:{' '}
                <b className="font-mono text-foreground">{formatCurrency(totalCost)}</b>
              </span>
              <span>
                Potencial de Venda na Filial:{' '}
                <b className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalSellingPotential)}
                </b>
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
              Sem tributação/venda na origem
            </span>
          </div>
        </section>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Observações da Remessa / Nota de Transferência
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Reposição semanal de estoque para venda no final de semana na filial..."
            className="h-9 text-xs"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-10"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto h-10 font-semibold"
            disabled={!canSubmit}
            isLoading={transferMutation.isPending}
          >
            <Truck className="h-4 w-4 mr-2" />
            Confirmar Envio de Estoque para Filial
          </Button>
        </div>
      </form>
    </Modal>
  )
}
