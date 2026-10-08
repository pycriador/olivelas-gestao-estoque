import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import { formatCurrency } from '@/utils/currency'
import { formatDate, formatDateTime, checkExpirationStatus } from '@/utils/dates'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Package,
  Building2,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingUp,
  ExternalLink,
  ShieldAlert,
  Clock,
  CircleDollarSign,
  PlusCircle,
  Phone,
  Mail,
  User,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StockBalance } from '@/types/inventory.types'

interface ProductStockDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  balance: StockBalance | null
  storeId: string
  onOpenMovementModal?: (productId: string) => void
}

export function ProductStockDetailsModal({
  isOpen,
  onClose,
  balance,
  storeId,
  onOpenMovementModal,
}: ProductStockDetailsModalProps) {
  const productId = balance?.product_id

  const { data: details, isLoading } = useQuery({
    queryKey: ['product-stock-traceability', storeId, productId],
    queryFn: () => inventoryService.getProductStockTraceability(storeId, productId!),
    enabled: Boolean(isOpen && storeId && productId),
  })

  if (!balance) return null

  const product = details?.product || {
    id: balance.product_id,
    name: balance.product_name || 'Produto',
    sku: balance.product_sku || '',
    cost_price: balance.cost_price || 0,
    selling_price: balance.selling_price || 0,
    unit: balance.unit || 'UN',
    controls_batch: balance.controls_batch ?? false,
    controls_expiration: balance.controls_expiration ?? false,
    min_stock: balance.min_stock || 0,
  }

  const supplier = details?.supplier || (balance.supplier_name ? {
    id: balance.supplier_id || '',
    corporate_name: balance.supplier_name,
    trade_name: balance.supplier_name,
    document: null,
    phone: null,
    email: null,
    contact_name: null,
  } : null)

  const batches = details?.batches || []
  const recentEntries = details?.recentEntries || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rastreabilidade & Origem do Estoque"
      description={`${product.name} (SKU: ${product.sku || '-'})`}
      maxWidth="3xl"
    >
      <div className="space-y-4 pt-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <LoadingSkeleton count={4} className="h-12" />
          </div>
        ) : (
          <>
            {/* KPI Banner Resumo de Preços e Saldo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-muted/40 p-3 rounded-xl border border-border">
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Saldo Físico</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {balance.quantity} {product.unit}
                </div>
                <div className="text-[10px] text-primary">Disp: {balance.available_quantity}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Custo de Compra</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {formatCurrency(product.cost_price)}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Total: {formatCurrency(balance.quantity * product.cost_price)}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Preço de Venda (PDV)</div>
                <div className="text-base font-bold font-mono text-primary mt-0.5">
                  {formatCurrency(product.selling_price)}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Total: {formatCurrency(balance.quantity * product.selling_price)}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Margem Unitária</div>
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(product.selling_price - product.cost_price)}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  {product.selling_price > 0
                    ? `${(((product.selling_price - product.cost_price) / product.selling_price) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* Seção 1: Fornecedor e Origem de Compra */}
            <div className="border border-border rounded-xl p-3.5 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Fornecedor & Local de Compra</span>
                </div>
                {supplier && (
                  <Badge variant="success" className="text-[10px]">
                    Vinculado
                  </Badge>
                )}
              </div>

              {supplier ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Razão Social / Nome Fantasia:</div>
                    <div className="font-semibold text-foreground">
                      {supplier.trade_name || supplier.corporate_name}
                      {supplier.trade_name && supplier.corporate_name !== supplier.trade_name && (
                        <span className="text-muted-foreground text-[11px] block font-normal">
                          {supplier.corporate_name}
                        </span>
                      )}
                    </div>
                    {supplier.document && (
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        CNPJ/CPF: {supplier.document}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {supplier.contact_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <User className="h-3 w-3 text-primary" /> Contato: <span className="text-foreground font-medium">{supplier.contact_name}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                        <Phone className="h-3 w-3 text-emerald-500" /> {supplier.phone}
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Mail className="h-3 w-3 text-blue-500" /> {supplier.email}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <span>Nenhum fornecedor principal vinculado no cadastro deste produto.</span>
                  </div>
                  <Link
                    to="/products"
                    className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                  >
                    Vincular em Produtos <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Seção 2: Lotes e Validades */}
            <div className="border border-border rounded-xl p-3.5 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <span>Lotes & Validades do Produto</span>
                  <Badge variant="default" className="text-[10px]">
                    {batches.length} lote(s) registrado(s)
                  </Badge>
                </div>
                <Link
                  to="/expiration"
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  Gestão de Validades <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {batches.length === 0 ? (
                <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center">
                  Nenhum lote específico com validade registrado.
                  Ao lançar uma nova entrada manual ou receber uma ordem de compra com lote e validade, eles serão listados aqui.
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden bg-surface">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Lote</th>
                        <th className="py-2 px-3 font-semibold text-center">Qtd no Lote</th>
                        <th className="py-2 px-3 font-semibold text-right">Custo do Lote</th>
                        <th className="py-2 px-3 font-semibold">Validade</th>
                        <th className="py-2 px-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {batches.map((b) => {
                        const expStatus = checkExpirationStatus(b.expiration_date)
                        return (
                          <tr key={b.id} className="hover:bg-muted/30">
                            <td className="py-2 px-3 font-mono font-bold text-foreground">
                              {b.lot_number}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold">
                              {b.quantity} {product.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {b.cost_price ? formatCurrency(b.cost_price) : '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px]">
                              {b.expiration_date ? formatDate(b.expiration_date) : '-'}
                              {expStatus.daysRemaining !== null && (
                                <span className="text-[10px] text-muted-foreground ml-1.5">
                                  ({expStatus.daysRemaining > 0 ? `${expStatus.daysRemaining}d restantes` : 'vencido'})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {expStatus.status === 'expired' && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                  Vencido
                                </Badge>
                              )}
                              {expStatus.status === 'critical_7_days' && (
                                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                                  Crítico 7d
                                </Badge>
                              )}
                              {expStatus.status === 'warning_30_days' && (
                                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                                  Atenção 30d
                                </Badge>
                              )}
                              {expStatus.status === 'normal' && (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                                  Em dia
                                </Badge>
                              )}
                              {expStatus.status === 'unknown' && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                  Sem validade
                                </Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Seção 3: Histórico de Entradas e Compras Recentes */}
            <div className="border border-border rounded-xl p-3.5 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ArrowDownRight className="h-4 w-4 text-primary" />
                  <span>Histórico de Entradas & Preços Pagos</span>
                </div>
                <Link
                  to="/purchasing"
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  Ordens de Compra <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {recentEntries.length === 0 ? (
                <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center">
                  Nenhuma entrada recente registrada para este produto.
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden bg-surface max-h-48 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/90 text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Data</th>
                        <th className="py-2 px-3 font-semibold">Origem / Tipo</th>
                        <th className="py-2 px-3 font-semibold text-center">Qtd</th>
                        <th className="py-2 px-3 font-semibold text-right">Preço Pago (Custo)</th>
                        <th className="py-2 px-3 font-semibold">Lote / Validade</th>
                        <th className="py-2 px-3 font-semibold">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-success">
                              {entry.reference_type === 'PURCHASE_ORDER'
                                ? 'Ordem de Compra'
                                : entry.movement_type === 'ENTRY'
                                ? 'Entrada Manual'
                                : entry.movement_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                            +{entry.quantity} {product.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                            {entry.unit_cost !== null ? formatCurrency(entry.unit_cost) : '-'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                            {entry.lot_number ? (
                              <span>
                                {entry.lot_number}{' '}
                                {entry.expiration_date ? `(Val: ${formatDate(entry.expiration_date)})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground text-[11px] truncate max-w-[10rem]">
                            {entry.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rodapé de Ações Rápidas */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-10 text-xs"
                onClick={onClose}
              >
                Fechar
              </Button>
              {onOpenMovementModal && (
                <Button
                  type="button"
                  className="w-full sm:w-auto h-10 text-xs font-semibold shadow-xs"
                  onClick={() => {
                    onClose()
                    onOpenMovementModal(product.id)
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-1.5" /> Lançar Nova Entrada para este Produto
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
