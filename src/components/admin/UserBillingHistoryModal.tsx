import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  DollarSign,
  FileText,
  XCircle,
  Shield,
  Calendar,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { permissionGroupService } from '@/services/permissionGroupService'
import { ALL_MODULE_CODES } from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import { formatDate, formatDateTime } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import type { PlatformUser } from '@/types/user.types'
import type {
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  SubscriptionPayment,
} from '@/types/permissionGroup.types'

interface UserBillingHistoryModalProps {
  isOpen: boolean
  user: PlatformUser | null
  onClose: () => void
  onOpenPermissionsModal?: (user: PlatformUser) => void
  onSuccessMessage?: (msg: string) => void
}

const PAYMENT_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  PIX: 'PIX Instantâneo',
  BOLETO: 'Boleto Bancário',
  CREDIT_CARD: 'Cartão de Crédito',
  TRANSFER: 'Transferência / TED',
  CASH: 'Dinheiro / Espécie',
  OTHER: 'Outro',
}

export function UserBillingHistoryModal({
  isOpen,
  user,
  onClose,
  onOpenPermissionsModal,
  onSuccessMessage,
}: UserBillingHistoryModalProps) {
  const queryClient = useQueryClient()
  const [activeSubTab, setActiveSubTab] = React.useState<'payments' | 'new' | 'audit'>('payments')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const currentMonthRef = React.useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [formReferenceMonth, setFormReferenceMonth] = React.useState(currentMonthRef)
  const [formDescription, setFormDescription] = React.useState('')
  const [formAmount, setFormAmount] = React.useState('199.90')
  const [formDiscount, setFormDiscount] = React.useState('0')
  const [formMethod, setFormMethod] = React.useState<InvoicePaymentMethod>('PIX')
  const [formStatus, setFormStatus] = React.useState<InvoicePaymentStatus>('PAID')
  const [formDueDate, setFormDueDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [formTxId, setFormTxId] = React.useState('')
  const [formNotes, setFormNotes] = React.useState('')

  React.useEffect(() => {
    if (!isOpen || !user) return
    setErrorMsg(null)
    setActiveSubTab('payments')

    const prof = user.permissionProfile
    const planLabel = prof?.customPlanName || prof?.permissionGroup?.name || 'Mensalidade Plataforma Olivelas'
    const agreedVal = prof?.agreedMonthlyValue ?? 199.9

    setFormReferenceMonth(currentMonthRef)
    setFormDescription(`Mensalidade ${planLabel} (${currentMonthRef})`)
    setFormAmount(String(agreedVal))
    setFormDiscount('0')
    setFormMethod('PIX')
    setFormStatus('PAID')
    setFormDueDate(prof?.nextDueDate || new Date().toISOString().slice(0, 10))
    setFormTxId('')
    setFormNotes('')
  }, [isOpen, user, currentMonthRef])

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['user-subscription-payments', user?.id],
    queryFn: () => permissionGroupService.listUserPayments(user!.id),
    enabled: Boolean(isOpen && user?.id),
  })

  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ['user-permission-billing-audit', user?.id],
    queryFn: () => permissionGroupService.listUserBillingAuditLogs(user!.id),
    enabled: Boolean(isOpen && user?.id),
  })

  const financialStats = React.useMemo(() => {
    const totalPaid = payments
      .filter((p) => p.status === 'PAID')
      .reduce((acc, p) => acc + (p.paidAmount || p.amount), 0)
    const totalPending = payments
      .filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE')
      .reduce((acc, p) => acc + Math.max(0, p.amount - p.discountAmount), 0)
    const paidCount = payments.filter((p) => p.status === 'PAID').length

    return { totalPaid, totalPending, paidCount }
  }, [payments])

  const createPaymentMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault()
      if (!user) throw new Error('Usuário inválido')
      const prof = user.permissionProfile
      return permissionGroupService.createSubscriptionPayment({
        userId: user.id,
        storeId: user.stores[0]?.storeId || null,
        referenceMonth: formReferenceMonth.trim() || currentMonthRef,
        description: formDescription.trim() || `Mensalidade (${formReferenceMonth})`,
        snapshotPlanName: prof?.customPlanName || 'Plano Olivelas',
        snapshotModules: prof?.enabledModules || ALL_MODULE_CODES,
        amount: Number(formAmount || 0),
        discountAmount: Number(formDiscount || 0),
        paymentMethod: formMethod,
        status: formStatus,
        dueDate: formDueDate,
        externalTransactionId: formTxId.trim() || undefined,
        notes: formNotes.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription-payments', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-permission-billing-audit', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      setActiveSubTab('payments')
      onSuccessMessage?.('Registro financeiro salvo com sucesso no histórico do cliente!')
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const markPaidMutation = useMutation({
    mutationFn: (payment: SubscriptionPayment) => permissionGroupService.markPaymentAsPaid(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription-payments', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-permission-billing-audit', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      onSuccessMessage?.('Baixa de pagamento realizada com sucesso!')
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const cancelPaymentMutation = useMutation({
    mutationFn: (payment: SubscriptionPayment) =>
      permissionGroupService.updatePaymentStatus(payment, 'CANCELLED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription-payments', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-permission-billing-audit', user?.id] })
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  if (!user) return null
  const prof = user.permissionProfile

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Controle de Pagamentos, Histórico & Auditoria — ${user.fullName || user.email}`}
      description="Gerencie cobranças recorrentes, registre pagamentos (PIX, Boleto, Cartão) e consulte a trilha completa de auditoria deste usuário."
      maxWidth="4xl"
    >
      <div className="space-y-4 pt-1 max-h-[78vh] overflow-y-auto pr-1 custom-scrollbar">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger">
            {errorMsg}
          </div>
        )}

        {/* Top KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl border border-border bg-card">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              Plano / Mensalidade
            </span>
            <div className="text-sm font-extrabold text-primary mt-0.5 truncate">
              {formatCurrency(prof?.agreedMonthlyValue ?? 199.9)}/mês
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {prof?.customPlanName || 'Gestão Completa Pro'}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              Total Recebido (LTV)
            </span>
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(financialStats.totalPaid)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {financialStats.paidCount} pagamento(s) baixado(s)
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              Em Aberto / Pendente
            </span>
            <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
              {formatCurrency(financialStats.totalPending)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Próx. venc: {prof?.nextDueDate ? formatDate(prof.nextDueDate) : 'Não definido'}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              Status da Assinatura
            </span>
            <div className="mt-1">
              <Badge
                variant={
                  prof?.paymentStatus === 'SUSPENDED' || prof?.paymentStatus === 'PAST_DUE'
                    ? 'destructive'
                    : prof?.paymentStatus === 'PENDING'
                      ? 'outline'
                      : 'success'
                }
                className="text-[10px]"
              >
                {prof?.paymentStatus || 'ACTIVE'}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {prof?.enabledModules?.length ?? 10}/10 módulos ativos
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setActiveSubTab('payments')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'payments'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 inline mr-1.5" />
              Histórico de Pagamentos ({payments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('new')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'new'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              Registrar Pagamento / Cobrança
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'audit'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="h-3.5 w-3.5 inline mr-1.5" />
              Auditoria de Mudanças ({auditLogs.length})
            </button>
          </div>

          {onOpenPermissionsModal && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
              onClick={() => {
                onClose()
                onOpenPermissionsModal(user)
              }}
            >
              <Shield className="h-3.5 w-3.5 text-primary" />
              Configurar Telas & Valores do Plano
            </Button>
          )}
        </div>

        {/* TAB 1: PAYMENT HISTORY LIST */}
        {activeSubTab === 'payments' && (
          <div className="space-y-3">
            {loadingPayments ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Carregando histórico financeiro...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2.5">
                <DollarSign className="h-8 w-8 text-muted-foreground mx-auto" />
                <div className="text-xs font-bold text-foreground">
                  Nenhum pagamento ou fatura registrado para este cliente ainda
                </div>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  Registre pagamentos recebidos via PIX, Boleto ou Cartão, ou gere cobranças pendentes para controle de vencimento.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveSubTab('new')}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar Primeiro Pagamento
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/80 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Competência / Descrição</th>
                      <th className="py-2.5 px-3">Método</th>
                      <th className="py-2.5 px-3">Vencimento / Pago em</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-card">
                    {payments.map((pay) => {
                      const netVal = Math.max(0, pay.amount - pay.discountAmount)
                      return (
                        <tr key={pay.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                {pay.referenceMonth}
                              </span>
                              <span>{pay.description}</span>
                            </div>
                            {pay.externalTransactionId && (
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                Comprovante/ID: {pay.externalTransactionId}
                              </div>
                            )}
                            {pay.notes && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Obs: {pay.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                            <div>Venc: {formatDate(pay.dueDate)}</div>
                            {pay.paidAt && (
                              <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Pago: {formatDateTime(pay.paidAt)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            {formatCurrency(pay.status === 'PAID' ? pay.paidAmount || netVal : netVal)}
                            {pay.discountAmount > 0 && (
                              <div className="text-[9px] text-emerald-600 font-normal">
                                Desc: -{formatCurrency(pay.discountAmount)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {pay.status === 'PAID' ? (
                              <Badge variant="success" className="text-[10px] gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Pago
                              </Badge>
                            ) : pay.status === 'OVERDUE' ? (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="h-3 w-3" /> Vencido
                              </Badge>
                            ) : pay.status === 'CANCELLED' ? (
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                Cancelado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] gap-1 text-amber-600">
                                <Clock className="h-3 w-3" /> Pendente
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(pay.status === 'PENDING' || pay.status === 'OVERDUE') && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => markPaidMutation.mutate(pay)}
                                    isLoading={markPaidMutation.isPending}
                                    className="h-7 px-2 text-[10px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Dar Baixa
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => cancelPaymentMutation.mutate(pay)}
                                    className="h-7 px-2 text-[10px] text-danger hover:bg-danger/10"
                                    title="Cancelar Fatura"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTER NEW PAYMENT / INVOICE */}
        {activeSubTab === 'new' && (
          <form onSubmit={(e) => createPaymentMutation.mutate(e)} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Registrar Novo Pagamento ou Gerar Cobrança Mensal
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Mês de Competência (AAAA-MM) *
                </label>
                <Input
                  value={formReferenceMonth}
                  onChange={(e) => setFormReferenceMonth(e.target.value)}
                  placeholder="2026-10"
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-foreground">
                  Descrição da Cobrança / Pacote *
                </label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Mensalidade Plano Catálogo WhatsApp + Estoque"
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Valor Nominal (R$) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Desconto (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Data de Vencimento *
                </label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Meio de Pagamento *
                </label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as InvoicePaymentMethod)}
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
                >
                  <option value="PIX">PIX Instantâneo</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="TRANSFER">Transferência / TED</option>
                  <option value="CASH">Dinheiro / Espécie</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Situação do Lançamento *
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as InvoicePaymentStatus)}
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
                >
                  <option value="PAID">✅ Já Pago (Dar Baixa Agora)</option>
                  <option value="PENDING">⏳ Pendente (Aguardando Pagamento)</option>
                  <option value="OVERDUE">⚠️ Vencido / Em Atraso</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  ID da Transação / Comprovante PIX
                </label>
                <Input
                  value={formTxId}
                  onChange={(e) => setFormTxId(e.target.value)}
                  placeholder="Ex: E1823612020261029..."
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Observações Financeiras
                </label>
                <Input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Pagamento referente à ativação do módulo de Controle de Estoque..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveSubTab('payments')}
                className="h-8 text-xs"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={createPaymentMutation.isPending}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirmar Lançamento Financeiro
              </Button>
            </div>
          </form>
        )}

        {/* TAB 3: PERMISSION & BILLING AUDIT TRAIL */}
        {activeSubTab === 'audit' && (
          <div className="space-y-2.5">
            {loadingAudit ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Carregando trilha de auditoria...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Nenhuma alteração de permissão ou pagamento registrada ainda para este usuário.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-border bg-card flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {log.eventType}
                        </Badge>
                        <span className="font-semibold text-foreground">{log.summary}</span>
                      </div>
                      {log.newState && Object.keys(log.newState).length > 0 && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {JSON.stringify(log.newState)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
