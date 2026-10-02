import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  BadgeCheck,
  Package,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'
import { userService } from '@/services/userService'
import { useTenant } from '@/hooks/useTenant'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { parseApiError } from '@/utils/errorHandler'
import type { StockBalance } from '@/types/inventory.types'
import type { StockMovementType } from '@/types/database.types'

const WRITEOFF_TYPES: { value: StockMovementType; label: string }[] = [
  { value: 'LOSS', label: 'Saída por perda' },
  { value: 'EXPIRATION', label: 'Descarte por vencimento' },
  { value: 'DAMAGE', label: 'Avaria / quebra' },
  { value: 'ADJUSTMENT', label: 'Ajuste de inventário' },
  { value: 'INVENTORY_COUNT', label: 'Ajuste por contagem' },
  { value: 'EXIT', label: 'Outra saída' },
]

export interface BulkStockWriteoffItem {
  balanceId: string
  productId: string
  productName: string
  productSku: string
  currentStock: number
  quantity: number
  lotNumber?: string
  expirationDate?: string
  unitCost?: number
}

export interface BulkStockWriteoffModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBalances: StockBalance[]
  onSuccess?: () => void
}

export function BulkStockWriteoffModal({
  isOpen,
  onClose,
  selectedBalances,
  onSuccess,
}: BulkStockWriteoffModalProps) {
  const { storeId } = useTenant()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [items, setItems] = React.useState<BulkStockWriteoffItem[]>([])
  const [movementType, setMovementType] = React.useState<StockMovementType>('LOSS')
  const [reasonCode, setReasonCode] = React.useState('')
  const [reasonDetail, setReasonDetail] = React.useState('')
  const [costCenterId, setCostCenterId] = React.useState('')
  const [approvedBy, setApprovedBy] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [defaultQuantity, setDefaultQuantity] = React.useState<number>(1)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Initialize items when selectedBalances prop changes
  React.useEffect(() => {
    if (isOpen && selectedBalances.length > 0) {
      setItems(
        selectedBalances.map((b) => ({
          balanceId: b.id,
          productId: b.product_id,
          productName: b.product_name || 'Produto',
          productSku: b.product_sku || '',
          currentStock: b.available_quantity,
          quantity: b.available_quantity > 0 ? b.available_quantity : 1,
        }))
      )
      setErrorMsg(null)
    }
  }, [isOpen, selectedBalances])

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

  const selectedReason = lossReasons.find((r) => r.code === reasonCode) || null
  const approvers = members.filter((m) => m.isActive && m.userId !== user?.id)
  const operatorRegistration =
    members.find((m) => m.userId === user?.id)?.employeeRegistration || null

  const suggestedCostCenterId =
    costCenters.find((c) => c.code === selectedReason?.default_cost_center_code)?.id || ''
  const effectiveCostCenterId = costCenterId || suggestedCostCenterId

  const requiresApproval = selectedReason?.requires_approval ?? false
  const isTargetQuantity = movementType === 'ADJUSTMENT'

  // Quick Action: Baixar todo o saldo de todos os itens
  const handleSetAllToCurrentStock = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        quantity: it.currentStock > 0 ? it.currentStock : 1,
      }))
    )
    toast.success('Quantidade ajustada para o saldo total disponível de cada item.')
  }

  // Quick Action: Aplicar quantidade fixa a todos
  const handleApplyFixedQuantity = () => {
    if (defaultQuantity <= 0) return
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        quantity: defaultQuantity,
      }))
    )
    toast.success(`Quantidade ${defaultQuantity} aplicada a todos os itens.`)
  }

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId))
  }

  const handleUpdateItem = (productId: string, updates: Partial<BulkStockWriteoffItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, ...updates } : it))
    )
  }

  const writeoffMutation = useMutation({
    mutationFn: async () => {
      const payload = items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        lotNumber: it.lotNumber || null,
        expirationDate: it.expirationDate || null,
        unitCost: it.unitCost || null,
      }))

      return inventoryService.writeoffBulkStock(storeId, payload, {
        movementType,
        reasonCode,
        reasonDetail: reasonDetail || null,
        costCenterId: effectiveCostCenterId,
        approvedBy: approvedBy || null,
        notes: notes || null,
      })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })

      if (result.successCount > 0) {
        toast.success(
          `${result.successCount} produto(s) tiveram a baixa registrada com sucesso!`
        )
      }
      if (result.errorCount > 0) {
        toast.error(`${result.errorCount} falha(s) ao registrar baixa.`)
      }

      onSuccess?.()
      onClose()
    },
    onError: (err: any) => {
      setErrorMsg(parseApiError(err))
    },
  })

  // Validation
  const hasInvalidQty = items.some((it) => !it.quantity || it.quantity <= 0)

  const canSubmit =
    items.length > 0 &&
    Boolean(reasonCode) &&
    Boolean(effectiveCostCenterId) &&
    (!requiresApproval || Boolean(approvedBy)) &&
    !hasInvalidQty

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      setErrorMsg('Nenhum item selecionado para dar baixa.')
      return
    }
    if (!reasonCode) {
      setErrorMsg('Selecione o motivo da movimentação.')
      return
    }
    if (!effectiveCostCenterId) {
      setErrorMsg('Selecione o centro de custo de perda operacional.')
      return
    }
    if (requiresApproval && !approvedBy) {
      setErrorMsg('Este motivo exige a seleção de um aprovador.')
      return
    }
    if (hasInvalidQty) {
      setErrorMsg('Todos os itens devem ter quantidade maior que zero.')
      return
    }

    setErrorMsg(null)
    writeoffMutation.mutate()
  }

  const totalQuantitySum = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Baixa de Estoque em Lote"
      description={`Registrar saída / baixa para ${items.length} produto(s) selecionado(s)`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
        {errorMsg && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Motivo e Classificação */}
        <section className="space-y-3">
          <SectionTitle
            icon={<ShieldAlert className="h-3.5 w-3.5 text-danger" />}
            text="1. Classificação e Motivo da Baixa"
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
                  · exige aprovação de um segundo responsável
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Centro de custo *
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Detalhamento do motivo (opcional)
              </label>
              <Input
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder="Ex: Descarte de lote avariado / validade"
                className="h-10 text-xs"
              />
            </div>
          </div>
        </section>

        {/* 2. Responsáveis (Operador e Aprovador) */}
        <section className="space-y-3 pt-3 border-t border-border">
          <SectionTitle
            icon={<UserCheck className="h-3.5 w-3.5 text-primary" />}
            text="2. Responsáveis pela Operação"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Operador</label>
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
            </div>
          </div>
        </section>

        {/* 3. Ações Rápidas e Itens Selecionados */}
        <section className="space-y-3 pt-3 border-t border-border">
          <SectionTitle
            icon={<Package className="h-3.5 w-3.5 text-danger" />}
            text="3. Itens Selecionados e Quantidades a Baixar"
          />

          {/* Quick Toolbar */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetAllToCurrentStock}
                className="h-8 text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                Baixar Todo Saldo Disponível
              </Button>

              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  value={defaultQuantity}
                  onChange={(e) => setDefaultQuantity(parseInt(e.target.value) || 0)}
                  className="h-8 w-16 text-xs font-mono text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyFixedQuantity}
                  className="h-8 text-xs"
                >
                  Aplicar Qtd
                </Button>
              </div>
            </div>

            <div className="text-[11px] font-mono text-muted-foreground">
              Total a Baixar:{' '}
              <b className="text-danger font-bold">{totalQuantitySum} un</b> ({items.length} itens)
            </div>
          </div>

          {/* Table of items */}
          <div className="border border-border rounded-xl overflow-hidden bg-surface divide-y divide-border">
            <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted/60 font-bold uppercase text-[10px] text-muted-foreground">
              <div className="col-span-5">Produto & SKU</div>
              <div className="col-span-2 text-center">Disponível</div>
              <div className="col-span-3 text-center">Qtd a Baixar *</div>
              <div className="col-span-2 text-right">Ação</div>
            </div>

            <div className="max-h-[35vh] overflow-y-auto divide-y divide-border custom-scrollbar">
              {items.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  Nenhum produto na lista de baixa.
                </div>
              ) : (
                items.map((it) => {
                  const isItemOver =
                    !isTargetQuantity && it.quantity > it.currentStock && it.currentStock >= 0
                  return (
                    <div
                      key={it.productId}
                      className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-muted/20 transition-colors"
                    >
                      {/* Product Name */}
                      <div className="col-span-5 min-w-0">
                        <div
                          className="font-semibold text-foreground truncate"
                          title={it.productName}
                        >
                          {it.productName}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">
                          {it.productSku || 'Sem SKU'}
                        </div>
                      </div>

                      {/* Available Stock */}
                      <div className="col-span-2 text-center font-mono text-xs font-bold text-foreground">
                        {it.currentStock} un
                      </div>

                      {/* Quantity Input */}
                      <div className="col-span-3 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={it.quantity}
                            onChange={(e) =>
                              handleUpdateItem(it.productId, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                            className={`h-8 text-xs font-mono font-bold text-center ${
                              isItemOver ? 'border-danger text-danger' : 'border-input'
                            }`}
                            required
                          />
                        </div>
                        {it.currentStock > 0 && it.quantity !== it.currentStock && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItem(it.productId, { quantity: it.currentStock })
                            }
                            className="text-[10px] font-mono text-primary hover:underline block mx-auto"
                          >
                            baixar tudo ({it.currentStock})
                          </button>
                        )}
                        {isItemOver && (
                          <span className="text-[9px] text-danger font-medium block">
                            Maior que saldo ({it.currentStock})
                          </span>
                        )}
                      </div>

                      {/* Remove Action */}
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.productId)}
                          title="Remover da lista de baixa"
                          className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
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
        </section>

        {/* 4. Observações gerais */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-foreground">
            Observações gerais do lançamento
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações complementares sobre o lote de baixas..."
            className="h-9 text-xs"
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
            variant="destructive"
            className="w-full sm:w-auto h-10 sm:h-9 font-semibold"
            disabled={!canSubmit}
            isLoading={writeoffMutation.isPending}
          >
            <ShieldAlert className="h-4 w-4 mr-1.5" /> Confirmar Baixa em Lote ({items.length} itens)
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
