import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Hash,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'
import { productService } from '@/services/productService'
import { userService } from '@/services/userService'
import { useTenant } from '@/hooks/useTenant'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { parseApiError } from '@/utils/errorHandler'
import { formatDate } from '@/utils/dates'
import { cn } from '@/utils/cn'
import type { StockMovementType } from '@/types/database.types'

/** Tipos de saida por perda / ajuste de inventario. */
const WRITEOFF_TYPES: { value: StockMovementType; label: string }[] = [
  { value: 'LOSS', label: 'Saída por perda' },
  { value: 'EXPIRATION', label: 'Descarte por vencimento' },
  { value: 'DAMAGE', label: 'Avaria / quebra' },
  { value: 'ADJUSTMENT', label: 'Ajuste de inventário' },
  { value: 'INVENTORY_COUNT', label: 'Ajuste por contagem' },
  { value: 'EXIT', label: 'Outra saída' },
]

export interface StockWriteoffModalProps {
  isOpen: boolean
  onClose: () => void
  /** Produto pre-selecionado (opcional). */
  productId?: string
}

export function StockWriteoffModal({ isOpen, onClose, productId }: StockWriteoffModalProps) {
  const { storeId } = useTenant()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [skuSearch, setSkuSearch] = React.useState('')
  const [productIdValue, setProductIdValue] = React.useState(productId || '')
  const [movementType, setMovementType] = React.useState<StockMovementType>('LOSS')
  const [reasonCode, setReasonCode] = React.useState('')
  const [reasonDetail, setReasonDetail] = React.useState('')
  const [batchId, setBatchId] = React.useState('')
  const [quantity, setQuantity] = React.useState<number>(1)
  const [costCenterId, setCostCenterId] = React.useState('')
  const [approvedBy, setApprovedBy] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // ---------------------------------------------------------------- dados
  const handleClose = React.useCallback(() => {
    setProductIdValue(productId || '')
    setMovementType('LOSS')
    setReasonCode('')
    setReasonDetail('')
    setBatchId('')
    setQuantity(1)
    setCostCenterId('')
    setApprovedBy('')
    setNotes('')
    setSkuSearch('')
    setErrorMsg(null)
    onClose()
  }, [onClose, productId])

  const handleSelectProduct = (id: string) => {
    setProductIdValue(id)
    setBatchId('')
    setQuantity(1)
  }

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-select', storeId, skuSearch],
    queryFn: () =>
      productService.listProducts(storeId, {
        search: skuSearch || undefined,
        pageSize: 25,
      }),
    enabled: Boolean(storeId) && isOpen,
  })

  const { data: productBatches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['stock-batches', storeId, productIdValue],
    queryFn: () =>
      inventoryService.getBatches(storeId, { pageSize: 100 }).then((res) =>
        res.data.filter((b) => b.product_id === productIdValue)
      ),
    enabled: Boolean(storeId) && Boolean(productIdValue) && isOpen,
  })

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers', storeId],
    queryFn: () => inventoryService.getCostCenters(storeId),
    enabled: Boolean(storeId) && isOpen,
  })

  const { data: lossReasons = [] } = useQuery({
    queryKey: ['loss-reasons'],
    queryFn: () => inventoryService.getLossReasons(),
    enabled: isOpen,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['store-members', storeId],
    queryFn: () => userService.listStoreMembers(storeId),
    enabled: Boolean(storeId) && isOpen,
  })

  const products = productsData?.data || []
  const selectedProduct = products.find((p) => p.id === productIdValue) || null
  const selectedBatch = productBatches.find((b) => b.id === batchId) || null
  const selectedReason = lossReasons.find((r) => r.code === reasonCode) || null
  const approvers = members.filter((m) => m.isActive && m.userId !== user?.id)
  const operatorRegistration =
    members.find((m) => m.userId === user?.id)?.employeeRegistration || null

  // Centro de custo padrao do motivo; a escolha manual tem precedencia
  const suggestedCostCenterId =
    costCenters.find((c) => c.code === selectedReason?.default_cost_center_code)?.id || ''
  const effectiveCostCenterId = costCenterId || suggestedCostCenterId

  const requiresApproval = selectedReason?.requires_approval ?? true
  const isTargetQuantity = movementType === 'ADJUSTMENT'

  const availableStock = selectedProduct?.stock_quantity ?? 0
  const maxBatchQty = selectedBatch?.quantity ?? 0
  const isOverBalance = !isTargetQuantity && quantity > availableStock
  const isOverBatch = Boolean(selectedBatch) && !isTargetQuantity && quantity > maxBatchQty

  // ---------------------------------------------------------------- submit
  const writeoffMutation = useMutation({
    mutationFn: () =>
      inventoryService.applyMovement({
        productId: productIdValue,
        movementType,
        quantity,
        batchId: batchId || null,
        lotNumber: selectedBatch?.lot_number || null,
        expirationDate: selectedBatch?.expiration_date || null,
        unitCost: Number(selectedProduct?.cost_price) || null,
        reasonCode: reasonCode || null,
        reasonDetail: reasonDetail || null,
        costCenterId: effectiveCostCenterId || null,
        notes: notes || null,
        approvedBy: approvedBy || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      onClose()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const canSubmit =
    Boolean(productIdValue) &&
    Boolean(reasonCode) &&
    Boolean(effectiveCostCenterId) &&
    (!requiresApproval || Boolean(approvedBy)) &&
    quantity > 0 &&
    !isOverBalance &&
    !isOverBatch

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!canSubmit) return
    writeoffMutation.mutate()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Baixa de Estoque"
      description="Saída por perda ou ajuste de inventário com rastreabilidade"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errorMsg && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------ 1. Item */}
        <section className="space-y-3">
          <SectionTitle icon={<Package className="h-3.5 w-3.5" />} text="Item e lote" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Código do item (SKU) *
              </label>
              {productIdValue && selectedProduct ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-10 px-3 rounded-lg border border-input bg-muted/40 text-xs flex flex-col justify-center">
                    <span className="font-semibold text-foreground truncate">
                      {selectedProduct.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {selectedProduct.sku} · saldo {availableStock}{' '}
                      {selectedProduct.unit || 'UN'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={() => handleSelectProduct('')}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    placeholder="Buscar por nome ou SKU..."
                    className="h-9 text-xs"
                    icon={<Search className="h-3.5 w-3.5" />}
                  />
                  <select
                    value={productIdValue}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">
                      {loadingProducts ? 'Carregando...' : 'Selecione o item...'}
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} (saldo {p.stock_quantity ?? 0})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Número do lote e validade original
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={!productIdValue}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {productIdValue ? 'Sem controle de lote' : 'Selecione o item primeiro'}
                </option>
                {productBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.lot_number} · val. {b.expiration_date ? formatDate(b.expiration_date) : '—'} ·{' '}
                    {b.quantity} disp.
                  </option>
                ))}
              </select>
              {loadingBatches && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando lotes...
                </div>
              )}
              {selectedBatch && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    <Hash className="h-2.5 w-2.5" /> {selectedBatch.lot_number}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    <Calendar className="h-2.5 w-2.5" />{' '}
                    {selectedBatch.expiration_date
                      ? formatDate(selectedBatch.expiration_date)
                      : 'sem validade'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    saldo do lote: {selectedBatch.quantity}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ 2. Motivo */}
        <section className="space-y-3 pt-3 border-t border-border">
          <SectionTitle
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            text="Classificação da movimentação"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Tipo de movimento *
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as StockMovementType)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {WRITEOFF_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Motivo específico *
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o motivo...</option>
                {lossReasons.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedReason && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Lançamento registrado como <b className="text-foreground">{selectedReason.label}</b>
              </span>
              {requiresApproval && (
                <span className="text-amber-600 dark:text-amber-400">
                  · exige aprovação de um segundo responsável
                </span>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Detalhamento do motivo
            </label>
            <Input
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder="Ex: 12 unidades com embalagem rompida na gôndola 3"
              className="h-9 text-xs"
            />
          </div>
        </section>

        {/* ------------------------------------------------ 3. Quantidade */}
        <section className="space-y-3 pt-3 border-t border-border">
          <SectionTitle icon={<Trash2 className="h-3.5 w-3.5" />} text="Quantidade e centro de custo" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {isTargetQuantity ? 'Saldo final do item *' : 'Quantidade a ser baixada *'}
              </label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                required
                className={cn('h-10 font-mono', isOverBalance && 'border-danger')}
              />
              {selectedProduct && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    {isTargetQuantity
                      ? `Saldo atual: ${availableStock}`
                      : `Disponível: ${availableStock} ${selectedProduct.unit || 'UN'}`}
                  </span>
                  {!isTargetQuantity && availableStock > 0 && (
                    <button
                      type="button"
                      className="font-mono font-semibold text-primary hover:underline"
                      onClick={() => setQuantity(availableStock)}
                    >
                      baixar tudo
                    </button>
                  )}
                </div>
              )}
              {isOverBalance && (
                <p className="text-[10px] text-danger font-medium">
                  Quantidade maior que o saldo disponível.
                </p>
              )}
              {isOverBatch && (
                <p className="text-[10px] text-danger font-medium">
                  Quantidade maior que o saldo do lote ({maxBatchQty}).
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Centro de custo de perda operacional *
              </label>
              <select
                value={effectiveCostCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione o centro de custo...</option>
                {costCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              {!costCenterId && suggestedCostCenterId && (
                <p className="text-[10px] text-muted-foreground">
                  Preenchido automaticamente conforme o motivo selecionado.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ 4. Operador e aprovador */}
        <section className="space-y-3 pt-3 border-t border-border">
          <SectionTitle
            icon={<UserCheck className="h-3.5 w-3.5" />}
            text="Operador e aprovador"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Operador *</label>
              <div className="h-10 px-3 rounded-lg border border-input bg-muted/40 text-xs flex flex-col justify-center">
                <span className="font-semibold text-foreground truncate">
                  {user?.fullName || user?.email || 'Usuário atual'}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {operatorRegistration
                    ? `Matrícula ${operatorRegistration}`
                    : 'Sem matrícula cadastrada'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Registrado automaticamente a partir da sessão.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Aprovador {requiresApproval ? '*' : '(opcional)'}
              </label>
              <select
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                required={requiresApproval}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">
                  {approvers.length === 0
                    ? 'Nenhum aprovador disponível'
                    : 'Selecione o aprovador...'}
                </option>
                {approvers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName || m.email}
                    {m.employeeRegistration ? ` (${m.employeeRegistration})` : ''}
                  </option>
                ))}
              </select>
              {requiresApproval && !approvedBy && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Aprovador obrigatório e não pode ser o próprio operador.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Observações</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais do lançamento"
              className="h-9 text-xs"
            />
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-11 sm:h-10"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="destructive"
            className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
            isLoading={writeoffMutation.isPending}
            disabled={!canSubmit}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Confirmar baixa
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
      {icon}
      {text}
    </div>
  )
}
