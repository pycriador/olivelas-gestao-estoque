import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  FileText,
  History,
  Plus,
  Shield,
  Users,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { userService } from '@/services/userService'
import { permissionGroupService } from '@/services/permissionGroupService'
import { ALL_MODULE_CODES } from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import { formatDate, formatDateTime } from '@/utils/dates'
import type { PlatformUser } from '@/types/user.types'
import type {
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  PermissionBillingAuditLog,
  StoreEmployeeLicenseSummary,
  SubscriptionPayment,
} from '@/types/permissionGroup.types'

const PAYMENT_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  PIX: 'PIX Instantâneo',
  BOLETO: 'Boleto Bancário',
  CREDIT_CARD: 'Cartão de Crédito',
  TRANSFER: 'Transferência / TED',
  CASH: 'Espécie / Dinheiro',
  OTHER: 'Outro Meio',
}

export const GlobalAdminUserBillingPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [creatingPayment, setCreatingPayment] = useState(false)

  const [user, setUser] = useState<PlatformUser | null>(null)
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [auditLogs, setAuditLogs] = useState<PermissionBillingAuditLog[]>([])
  const [storeLicenses, setStoreLicenses] = useState<StoreEmployeeLicenseSummary[]>([])

  // New payment form
  const now = new Date()
  const defaultRefMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [referenceMonth, setReferenceMonth] = useState(defaultRefMonth)
  const [description, setDescription] = useState('Mensalidade Plano SaaS + Licenças de Funcionários')
  const [amount, setAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>('PIX')
  const [status, setStatus] = useState<InvoicePaymentStatus>('PAID')
  const [dueDate, setDueDate] = useState(now.toISOString().slice(0, 10))
  const [externalTransactionId, setExternalTransactionId] = useState('')
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [loadedUser, userPayments, logs, allStoreLics] = await Promise.all([
        userService.getPlatformUserById(userId),
        permissionGroupService.listUserPayments(userId),
        permissionGroupService.listUserBillingAuditLogs(userId),
        permissionGroupService.getStoresEmployeeLicenseSummaries(),
      ])

      if (!loadedUser) {
        toast.error('Usuário não encontrado.')
        navigate('/global-admin?tab=users')
        return
      }

      setUser(loadedUser)
      setPayments(userPayments)
      setAuditLogs(logs)

      const userStoreIds = new Set(loadedUser.stores.map((s) => s.storeId))
      const matchedStores = allStoreLics.filter((sl) =>
        userStoreIds.has(sl.storeId)
      )
      setStoreLicenses(matchedStores)

      const extraLicCost = matchedStores.reduce(
        (acc, s) => acc + (s.extraEmployeesMonthlyCost || 0),
        0
      )
      const baseAgreed = loadedUser.permissionProfile?.agreedMonthlyValue ?? 149.9
      setAmount(String((baseAgreed || extraLicCost || 149.9).toFixed(2)))
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar histórico financeiro.')
    } finally {
      setLoading(false)
    }
  }, [navigate, userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalPaid = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'PAID')
        .reduce((acc, p) => acc + Number(p.paidAmount || p.amount || 0), 0),
    [payments]
  )

  const totalPendingOrOverdue = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE')
        .reduce(
          (acc, p) => acc + Math.max(0, Number(p.amount || 0) - Number(p.discountAmount || 0)),
          0
        ),
    [payments]
  )

  const extraEmployeesCost = useMemo(
    () =>
      storeLicenses.reduce(
        (acc, s) => acc + (s.extraEmployeesMonthlyCost || 0),
        0
      ),
    [storeLicenses]
  )

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !amount || Number(amount) <= 0) {
      toast.error('Informe um valor válido para a cobrança/pagamento.')
      return
    }

    setCreatingPayment(true)
    try {
      await permissionGroupService.createSubscriptionPayment({
        userId,
        storeId: user?.stores?.[0]?.storeId || null,
        referenceMonth,
        description: description.trim() || `Mensalidade ${referenceMonth}`,
        snapshotPlanName:
          user?.permissionProfile?.customPlanName || 'Assinatura Mensal',
        snapshotModules:
          user?.permissionProfile?.enabledModules || ALL_MODULE_CODES,
        amount: Number(amount),
        discountAmount: Number(discountAmount || 0),
        paymentMethod,
        status,
        dueDate,
        externalTransactionId: externalTransactionId.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      toast.success(
        status === 'PAID'
          ? 'Pagamento registrado e assinatura ativada com sucesso!'
          : 'Fatura gerada com sucesso no histórico do cliente!'
      )
      setExternalTransactionId('')
      setNotes('')
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao registrar pagamento.')
    } finally {
      setCreatingPayment(false)
    }
  }

  const handleMarkAsPaid = async (payment: SubscriptionPayment) => {
    try {
      await permissionGroupService.markPaymentAsPaid(payment)
      toast.success(`Fatura ${payment.referenceMonth} baixada como PAGA!`)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao dar baixa na fatura.')
    }
  }

  const handleChangeInvoiceStatus = async (
    payment: SubscriptionPayment,
    newStatus: InvoicePaymentStatus
  ) => {
    try {
      await permissionGroupService.updatePaymentStatus(payment, newStatus)
      toast.success(`Status da fatura atualizado para ${newStatus}.`)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar status da fatura.')
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={`Controle de Pagamentos: ${user?.fullName || user?.email || ''}`}
        badge={
          <Badge
            variant={
              user?.permissionProfile?.paymentStatus === 'ACTIVE'
                ? 'success'
                : 'warning'
            }
          >
            {user?.permissionProfile?.paymentStatus || 'ACTIVE'}
          </Badge>
        }
      />

      {/* Top Identification Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                /global-admin/users/{userId}/billing
              </span>
              <Badge variant="warning">Admin Loja Titular</Badge>
              <span className="text-xs font-semibold text-foreground">
                {user?.fullName} ({user?.email})
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Livro-razão de faturas, histórico de recebimentos, licenças excedentes de funcionários das lojas e trilha de auditoria financeira.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin?tab=users')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar aos Usuários
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin/finance/payments')}
          >
            <DollarSign className="mr-1.5 h-4 w-4" />
            Painel Geral de Pagamentos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/global-admin/users/${userId}/permissions`)}
          >
            <Shield className="mr-1.5 h-4 w-4" />
            Plano & Telas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/global-admin/users/${userId}/edit`)}
          >
            <Edit className="mr-1.5 h-4 w-4" />
            Conta & Lojas
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando livro-razão de pagamentos e licenças das lojas...
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPIs Financeiros do Assinante */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Mensalidade Acordada (Plano Atual)
              </div>
              <div className="mt-1 text-2xl font-extrabold text-foreground">
                {formatCurrency(
                  user?.permissionProfile?.agreedMonthlyValue || 0
                )}
                <span className="text-xs font-normal text-muted-foreground">
                  /mês
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {user?.permissionProfile?.customPlanName || 'Plano Padrão'}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Adicional Licenças de Funcionários
              </div>
              <div className="mt-1 text-2xl font-extrabold text-amber-500">
                {formatCurrency(extraEmployeesCost)}
                <span className="text-xs font-normal text-muted-foreground">
                  /mês
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {storeLicenses.length} loja(s) vinculada(s) (10 grátis/loja)
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Total Recebido (Histórico Pago)
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-500">
                {formatCurrency(totalPaid)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {payments.filter((p) => p.status === 'PAID').length} fatura(s) quitada(s)
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Em Aberto / Pendente
              </div>
              <div className="mt-1 text-2xl font-extrabold text-danger">
                {formatCurrency(totalPendingOrOverdue)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Próx. vencimento:{' '}
                {user?.permissionProfile?.nextDueDate
                  ? formatDate(user.permissionProfile.nextDueDate)
                  : 'Não definido'}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Formulário de Nova Cobrança / Baixa de Pagamento */}
            <Card className="space-y-4 p-6">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Plus className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  Registrar Cobrança ou Pagamento
                </h2>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Competência (Mês)
                    </label>
                    <Input
                      type="month"
                      value={referenceMonth}
                      onChange={(e) => setReferenceMonth(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Data de Vencimento
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Descrição da Fatura
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mensalidade + Licenças Extras"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Valor Bruto (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Desconto (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Meio de Pagamento
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as InvoicePaymentMethod)
                      }
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, lbl]) => (
                        <option key={k} value={k}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Status Inicial
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as InvoicePaymentStatus)
                      }
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                    >
                      <option value="PAID">Pago (Confirmado)</option>
                      <option value="PENDING">Aguardando Pagamento</option>
                      <option value="OVERDUE">Vencido / Em Atraso</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    ID da Transação / Comprovante PIX (Opcional)
                  </label>
                  <Input
                    value={externalTransactionId}
                    onChange={(e) => setExternalTransactionId(e.target.value)}
                    placeholder="E000000002026..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Observações Financeiras
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Inclui 2 licenças adicionais de funcionários"
                  />
                </div>

                <Button
                  type="submit"
                  variant="default"
                  className="w-full"
                  isLoading={creatingPayment}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {status === 'PAID'
                    ? 'Registrar Pagamento Confirmado'
                    : 'Gerar Cobrança em Aberto'}
                </Button>
              </form>
            </Card>

            {/* Livro-Razão de Faturas & Histórico */}
            <Card className="space-y-4 p-6 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    Histórico de Faturas & Pagamentos ({payments.length})
                  </h2>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nenhuma fatura ou pagamento registrado para este Admin Loja ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2.5 pr-3">Competência</th>
                        <th className="px-3 py-2.5">Descrição / Plano</th>
                        <th className="px-3 py-2.5">Vencimento</th>
                        <th className="px-3 py-2.5">Valor</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="py-2.5 pl-3 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-muted/30">
                          <td className="py-3 pr-3 font-mono text-xs font-bold text-foreground">
                            {pay.referenceMonth}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-foreground">
                              {pay.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {PAYMENT_METHOD_LABELS[pay.paymentMethod] || pay.paymentMethod}
                              {pay.externalTransactionId
                                ? ` • ID: ${pay.externalTransactionId}`
                                : ''}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {formatDate(pay.dueDate)}
                          </td>
                          <td className="px-3 py-3 font-bold text-foreground">
                            {formatCurrency(
                              Math.max(0, pay.amount - pay.discountAmount)
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant={
                                pay.status === 'PAID'
                                  ? 'success'
                                  : pay.status === 'OVERDUE'
                                    ? 'danger'
                                    : pay.status === 'PENDING'
                                      ? 'warning'
                                      : 'outline'
                              }
                            >
                              {pay.status === 'PAID'
                                ? 'PAGO'
                                : pay.status === 'PENDING'
                                  ? 'PENDENTE'
                                  : pay.status === 'OVERDUE'
                                    ? 'ATRASADO'
                                    : pay.status}
                            </Badge>
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <DropdownMenu
                              triggerLabel="Ações Rápidas"
                              items={[
                                ...(pay.status !== 'PAID'
                                  ? [
                                      {
                                        key: 'mark-paid',
                                        label: 'Confirmar Baixa (Marcar como PAGO)',
                                        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                                        onSelect: () => handleMarkAsPaid(pay),
                                      },
                                    ]
                                  : []),
                                ...(pay.status !== 'OVERDUE' && pay.status !== 'PAID'
                                  ? [
                                      {
                                        key: 'mark-overdue',
                                        label: 'Marcar como Vencida (Em Atraso)',
                                        icon: <Clock className="h-4 w-4 text-amber-500" />,
                                        onSelect: () =>
                                          handleChangeInvoiceStatus(pay, 'OVERDUE'),
                                      },
                                    ]
                                  : []),
                                ...(pay.status !== 'CANCELLED'
                                  ? [
                                      {
                                        key: 'cancel',
                                        label: 'Cancelar Fatura',
                                        icon: <XCircle className="h-4 w-4" />,
                                        variant: 'danger' as const,
                                        onSelect: () =>
                                          handleChangeInvoiceStatus(pay, 'CANCELLED'),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Trilha de Auditoria Financeira */}
              <div className="border-t border-border pt-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <History className="h-4 w-4" />
                  Trilha de Auditoria Financeira & Alterações de Plano ({auditLogs.length})
                </h3>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum evento financeiro registrado ainda.
                  </p>
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 p-2.5 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-foreground">
                            {log.summary}
                          </span>
                          <div className="text-[11px] text-muted-foreground">
                            Evento: {log.eventType}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalAdminUserBillingPage
