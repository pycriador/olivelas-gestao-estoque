import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Clock,
  Hash,
  KeyRound,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'
import { productService } from '@/services/productService'
import { userService } from '@/services/userService'
import { useTenant } from '@/hooks/useTenant'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { isMemberStockApprover, ROLE_METADATA } from '@/constants/granularPermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { parseApiError } from '@/utils/errorHandler'
import { formatDate } from '@/utils/dates'
import { formatCurrency } from '@/utils/currency'
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
  const { canApproveWriteoff } = usePermissions()
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
  const [approverPin, setApproverPin] = React.useState('')
  const [executionMode, setExecutionMode] = React.useState<'IMMEDIATE' | 'REQUEST'>('IMMEDIATE')
  const [notes, setNotes] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isOpen) {
      setExecutionMode(canApproveWriteoff ? 'IMMEDIATE' : 'REQUEST')
      if (canApproveWriteoff && user?.id) {
        setApprovedBy(user.id)
      }
    }
  }, [isOpen, canApproveWriteoff, user?.id])

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
    setApproverPin('')
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

  // SOMENTE quem é Aprovador de Baixa de Estoque pode autorizar a baixa
  const approvers = React.useMemo(
    () => members.filter((m) => m.isActive && isMemberStockApprover(m)),
    [members]
  )

  const selectedApproverMember = approvers.find((m) => m.userId === approvedBy) || null
  const requiresPinFromSelectedApprover = Boolean(
    executionMode === 'IMMEDIATE' &&
      selectedApproverMember?.approvalPin &&
      selectedApproverMember.userId !== user?.id
  )

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

  const estimatedLossValue = quantity * (Number(selectedProduct?.cost_price) || 0)
  const isOverApproverLimit = Boolean(
    executionMode === 'IMMEDIATE' &&
      selectedApproverMember?.maxWriteoffValue !== null &&
      selectedApproverMember?.maxWriteoffValue !== undefined &&
      estimatedLossValue > selectedApproverMember.maxWriteoffValue
  )

  // ---------------------------------------------------------------- submit
  const writeoffMutation = useMutation({
    mutationFn: async () => {
      if (executionMode === 'REQUEST') {
        await inventoryService.createWriteoffRequest(storeId, {
          productId: productIdValue,
          batchId: batchId || null,
          movementType,
          quantity,
          unitCost: Number(selectedProduct?.cost_price) || null,
          reasonCode,
          reasonDetail: reasonDetail || null,
          costCenterId: effectiveCostCenterId,
          notes: notes || null,
        })
        return 'REQUEST'
      }

      if (requiresPinFromSelectedApprover) {
        if (approverPin.trim() !== selectedApproverMember?.approvalPin) {
          throw new Error('PIN do Aprovador de Baixa inválido. Verifique com o responsável.')
        }
      }

      await inventoryService.applyMovement({
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
        approvedBy: approvedBy || (canApproveWriteoff ? user?.id || null : null),
      })
      return 'IMMEDIATE'
    },
    onSuccess: (mode) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-writeoff-requests', storeId] })
      queryClient.invalidateQueries({ queryKey: ['writeoff-requests', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      if (mode === 'REQUEST') {
        toast.success(
          'Solicitação enviada para a fila! Um Aprovador de Baixa de Estoque precisará autorizá-la.'
        )
      } else {
        toast.success('Baixa de estoque autorizada e concluída com sucesso!')
      }
      handleClose()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const canSubmit =
    Boolean(productIdValue) &&
    Boolean(reasonCode) &&
    Boolean(effectiveCostCenterId) &&
    (executionMode === 'REQUEST' || !requiresApproval || Boolean(approvedBy)) &&
    (!requiresPinFromSelectedApprover || approverPin.trim().length > 0) &&
    !isOverApproverLimit &&
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
      description="Saída por perda ou ajuste de inventário — autorização exclusiva por Aprovador de Baixa"
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
                      {selectedProduct.unit || 'UN'} · custo{' '}
                      {formatCurrency(Number(selectedProduct.cost_price) || 0)}
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
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  · exige autorização exclusiva de um Aprovador de Baixa de Estoque
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
                      : `Disponível: ${availableStock} ${selectedProduct.unit || 'UN'} · Impacto: ${formatCurrency(estimatedLossValue)}`}
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <SectionTitle
              icon={<UserCheck className="h-3.5 w-3.5" />}
              text="Autorização do Aprovador de Baixa de Estoque"
            />

            {/* Modo: Autorização Imediata vs Solicitar na Fila */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setExecutionMode('IMMEDIATE')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1',
                  executionMode === 'IMMEDIATE'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Autorização Imediata
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('REQUEST')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1',
                  executionMode === 'REQUEST'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Clock className="h-3 w-3 text-amber-500" />
                Enviar p/ Fila de Aprovação
              </button>
            </div>
          </div>

          {!canApproveWriteoff && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                Seu perfil atual não possui permissão de <b>Aprovador de Baixa de Estoque</b>. Para dar baixa imediata, selecione um Aprovador habilitado abaixo ou envie a solicitação para a <b>Fila de Aprovação</b>.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Operador Solicitante *</label>
              <div className="h-10 px-3 rounded-lg border border-input bg-muted/40 text-xs flex flex-col justify-center">
                <span className="font-semibold text-foreground truncate">
                  {user?.fullName || user?.email || 'Usuário atual'}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {operatorRegistration
                    ? `Matrícula ${operatorRegistration}`
                    : 'Sem matrícula cadastrada'}
                  {canApproveWriteoff ? ' · Aprovador Habilitado' : ''}
                </span>
              </div>
            </div>

            {executionMode === 'IMMEDIATE' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Aprovador de Baixa {requiresApproval ? '*' : '(opcional)'}</span>
                  <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                    Somente Aprovadores habilitados ({approvers.length})
                  </span>
                </label>
                <select
                  value={approvedBy}
                  onChange={(e) => {
                    setApprovedBy(e.target.value)
                    setApproverPin('')
                  }}
                  required={requiresApproval}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">
                    {approvers.length === 0
                      ? 'Nenhum Aprovador de Baixa cadastrado na loja'
                      : 'Selecione o Aprovador de Baixa...'}
                  </option>
                  {approvers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName || m.email} — {m.customRoleName || ROLE_METADATA[m.role]?.label || m.role}
                      {m.userId === user?.id ? ' (Você)' : ''}
                      {m.maxWriteoffValue ? ` [Alçada: ${formatCurrency(m.maxWriteoffValue)}]` : ''}
                    </option>
                  ))}
                </select>
                {isOverApproverLimit && (
                  <p className="text-[10px] text-danger font-semibold">
                    O valor desta baixa ({formatCurrency(estimatedLossValue)}) excede a alçada máxima deste aprovador (
                    {formatCurrency(selectedApproverMember?.maxWriteoffValue || 0)}).
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Fluxo de Aprovação</label>
                <div className="h-10 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">
                    Ficará pendente na aba &ldquo;Aprovações de Baixa&rdquo; até um Aprovador autorizar.
                  </span>
                </div>
              </div>
            )}
          </div>

          {requiresPinFromSelectedApprover && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                PIN de Autorização de {selectedApproverMember?.fullName || selectedApproverMember?.email} *
              </label>
              <Input
                type="password"
                value={approverPin}
                onChange={(e) => setApproverPin(e.target.value)}
                placeholder="Digite o PIN do Aprovador para autorizar imediatamente..."
                className="h-9 text-xs font-mono max-w-xs"
                required
              />
            </div>
          )}

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
            variant={executionMode === 'REQUEST' ? 'default' : 'destructive'}
            className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
            isLoading={writeoffMutation.isPending}
            disabled={!canSubmit}
          >
            {executionMode === 'REQUEST' ? (
              <>
                <Clock className="h-4 w-4 mr-2" /> Solicitar Aprovação de Baixa
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" /> Autorizar e Confirmar Baixa
              </>
            )}
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
