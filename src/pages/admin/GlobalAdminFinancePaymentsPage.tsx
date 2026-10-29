import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  FileText,
  Layers,
  Search,
  Shield,
  Sliders,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { userService } from '@/services/userService'
import { permissionGroupService } from '@/services/permissionGroupService'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import type { PlatformUser } from '@/types/user.types'
import type {
  StoreEmployeeLicenseSummary,
  SubscriptionPayment,
} from '@/types/permissionGroup.types'

export const GlobalAdminFinancePaymentsPage: React.FC = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [storeAdminUsers, setStoreAdminUsers] = useState<PlatformUser[]>([])
  const [allPayments, setAllPayments] = useState<SubscriptionPayment[]>([])
  const [storeLicenses, setStoreLicenses] = useState<
    StoreEmployeeLicenseSummary[]
  >([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, paymentsList, licsList] = await Promise.all([
        userService.listPlatformUsers({
          page: 1,
          pageSize: 200,
          excludeStoreEmployees: true,
        }),
        permissionGroupService.listAllPlatformPayments(),
        permissionGroupService.getStoresEmployeeLicenseSummaries(),
      ])

      setStoreAdminUsers(usersRes.data)
      setAllPayments(paymentsList)
      setStoreLicenses(licsList)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar controle de pagamentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredAdmins = useMemo(() => {
    return storeAdminUsers.filter((u) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        (u.fullName || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.stores.some((s) => s.storeName.toLowerCase().includes(q))

      const st = u.permissionProfile?.paymentStatus || 'ACTIVE'
      const matchesStatus = statusFilter === 'ALL' || st === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter, storeAdminUsers])

  const mrrBasePlans = useMemo(
    () =>
      storeAdminUsers.reduce(
        (acc, u) => acc + Number(u.permissionProfile?.agreedMonthlyValue || 0),
        0
      ),
    [storeAdminUsers]
  )

  const mrrExtraEmployeeSeats = useMemo(
    () =>
      storeLicenses.reduce(
        (acc, s) => acc + Number(s.extraEmployeesMonthlyCost || 0),
        0
      ),
    [storeLicenses]
  )

  const totalPaidInvoices = useMemo(
    () =>
      allPayments
        .filter((p) => p.status === 'PAID')
        .reduce((acc, p) => acc + Number(p.paidAmount || p.amount || 0), 0),
    [allPayments]
  )

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Financeiro: Controle de Pagamentos & Assinaturas (STORE_ADMIN)"
        badge={
          <Badge variant="success">
            MRR Total: {formatCurrency(mrrBasePlans + mrrExtraEmployeeSeats)}
          </Badge>
        }
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar STORE_ADMIN ou loja..."
          icon={<Search className="h-4 w-4" />}
        />
      </PageHeader>

      {/* Top Navigation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                /global-admin/finance/payments
              </span>
              <Badge variant="warning">Apenas Titulares STORE_ADMIN</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Controle de pagamentos consolidado. Funcionários das lojas não pagam plano individual — apenas o STORE_ADMIN possui assinatura e eventuais licenças excedentes (&gt;10 funcionários).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin?tab=finance')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar ao Financeiro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin/finance/rules')}
          >
            <Sliders className="mr-1.5 h-4 w-4" />
            Regras & Licenças (10 Grátis)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin/finance/plans')}
          >
            <Layers className="mr-1.5 h-4 w-4" />
            Planos & Preços de Telas
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando controle de pagamentos e assinaturas...
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPIs Consolidados */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Assinantes Titulares (STORE_ADMIN)
              </div>
              <div className="mt-1 text-2xl font-extrabold text-foreground">
                {storeAdminUsers.length}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Funcionários operacionais isentos de plano
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                MRR Planos de Telas Acordados
              </div>
              <div className="mt-1 text-2xl font-extrabold text-primary">
                {formatCurrency(mrrBasePlans)}
                <span className="text-xs font-normal text-muted-foreground">
                  /mês
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Soma das mensalidades de pacotes/telas
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                MRR Licenças Extras de Funcionários
              </div>
              <div className="mt-1 text-2xl font-extrabold text-amber-500">
                {formatCurrency(mrrExtraEmployeeSeats)}
                <span className="text-xs font-normal text-muted-foreground">
                  /mês
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Excedente acima dos 10 grátis por loja
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Faturas Pagas Registradas
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-500">
                {formatCurrency(totalPaidInvoices)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {allPayments.length} lançamento(s) no livro-razão
              </div>
            </Card>
          </div>

          {/* Tabela de Assinantes STORE_ADMIN */}
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Contratos e Status de Pagamento por Titular (STORE_ADMIN)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Clique em Ações Rápidas para abrir a página individual de faturas (`/global-admin/users/:userId/billing`) ou de permissões de tela (`/global-admin/users/:userId/permissions`).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="ACTIVE">Em Dia (ACTIVE)</option>
                  <option value="TRIAL">Em Teste (TRIAL)</option>
                  <option value="PENDING">Pendente (PENDING)</option>
                  <option value="PAST_DUE">Em Atraso (PAST_DUE)</option>
                  <option value="SUSPENDED">Suspenso (SUSPENDED)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Titular (STORE_ADMIN)</th>
                    <th className="px-3 py-3">Lojas & Cota de Funcionários</th>
                    <th className="px-3 py-3">Plano de Telas</th>
                    <th className="px-3 py-3">Mensalidade + Licenças</th>
                    <th className="px-3 py-3">Próx. Vencimento</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="py-3 pl-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAdmins.map((u) => {
                    const userStoreIds = new Set(u.stores.map((s) => s.storeId))
                    const userStoreLics = storeLicenses.filter((sl) =>
                      userStoreIds.has(sl.storeId)
                    )
                    const extraSeatsCost = userStoreLics.reduce(
                      (acc, s) => acc + s.extraEmployeesMonthlyCost,
                      0
                    )
                    const baseValue = Number(
                      u.permissionProfile?.agreedMonthlyValue || 0
                    )
                    const payStatus =
                      u.permissionProfile?.paymentStatus || 'ACTIVE'

                    return (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-foreground">
                            {u.fullName || 'Sem nome'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.email}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          {userStoreLics.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Sem loja vinculada
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {userStoreLics.map((sl) => (
                                <div
                                  key={sl.storeId}
                                  className="flex items-center gap-1.5 text-xs"
                                >
                                  <span className="font-medium text-foreground">
                                    {sl.isBranch ? '└─ ' : ''}
                                    {sl.storeName}
                                  </span>
                                  <Badge
                                    variant={
                                      sl.extraBillableEmployees > 0
                                        ? 'warning'
                                        : 'success'
                                    }
                                  >
                                    {sl.activeEmployeesCount}/
                                    {sl.freeEmployeesQuota} grátis
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <div className="font-medium text-foreground">
                            {u.permissionProfile?.customPlanName ||
                              'Acesso Total Padrão'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.permissionProfile?.enabledModules?.length ?? 10}/10
                            módulos ativos
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground">
                            {formatCurrency(baseValue + extraSeatsCost)}/mês
                          </div>
                          {extraSeatsCost > 0 && (
                            <div className="text-[11px] text-amber-500">
                              Inclui +{formatCurrency(extraSeatsCost)} licenças extras
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {u.permissionProfile?.nextDueDate
                            ? formatDate(u.permissionProfile.nextDueDate)
                            : `Todo dia ${u.permissionProfile?.billingDay || 10}`}
                        </td>

                        <td className="px-3 py-3">
                          <Badge
                            variant={
                              payStatus === 'ACTIVE'
                                ? 'success'
                                : payStatus === 'PAST_DUE' ||
                                    payStatus === 'SUSPENDED'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {payStatus}
                          </Badge>
                        </td>

                        <td className="py-3 pl-3 text-right">
                          <DropdownMenu
                            triggerLabel="Ações Rápidas"
                            items={[
                              {
                                key: 'billing',
                                label: 'Controle de Pagamentos & Faturas',
                                icon: <CreditCard className="h-4 w-4" />,
                                onSelect: () =>
                                  navigate(`/global-admin/users/${u.id}/billing`),
                              },
                              {
                                key: 'permissions',
                                label: 'Permissões de Tela & Plano Comercial',
                                icon: <Shield className="h-4 w-4" />,
                                onSelect: () =>
                                  navigate(
                                    `/global-admin/users/${u.id}/permissions`
                                  ),
                              },
                              {
                                key: 'edit-user',
                                label: 'Editar Conta & Lojas Vinculadas',
                                icon: <Edit className="h-4 w-4" />,
                                onSelect: () =>
                                  navigate(`/global-admin/users/${u.id}/edit`),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default GlobalAdminFinancePaymentsPage
