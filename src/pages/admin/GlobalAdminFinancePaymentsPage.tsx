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
import { Pagination } from '@/components/ui/pagination'
import { Card, CardContent } from '@/components/ui/card'
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

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

  const totalItems = filteredAdmins.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedAdmins = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredAdmins.slice(start, start + pageSize)
  }, [filteredAdmins, page, pageSize])

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      <PageHeader
        title="Financeiro: Controle de Pagamentos & Assinaturas (Admin Loja)"
        badge={
          <Badge variant="success">
            MRR Total: {formatCurrency(mrrBasePlans + mrrExtraEmployeeSeats)}
          </Badge>
        }
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar Admin Loja ou loja..."
            className="h-8 text-xs w-56"
            icon={<Search className="h-3.5 w-3.5" />}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Em Dia (ACTIVE)</option>
            <option value="TRIAL">Em Teste (TRIAL)</option>
            <option value="PENDING">Pendente (PENDING)</option>
            <option value="PAST_DUE">Em Atraso (PAST_DUE)</option>
            <option value="SUSPENDED">Suspenso (SUSPENDED)</option>
          </select>
        </div>
      </PageHeader>

      {/* Compact Top Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary shrink-0" />
          <span className="font-mono text-[11px] font-semibold text-primary">
            /global-admin/finance/payments
          </span>
          <Badge variant="warning" className="text-[10px]">
            Apenas Titulares Admin Loja
          </Badge>
          <span className="hidden xl:inline text-[11px] text-muted-foreground">
            — Funcionários operacionais não pagam plano individual (10 grátis/loja).
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => navigate('/global-admin?tab=finance')}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Voltar ao Financeiro
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => navigate('/global-admin/finance/rules')}
          >
            <Sliders className="mr-1 h-3.5 w-3.5" />
            Regras & Licenças (10 Grátis)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => navigate('/global-admin/finance/plans')}
          >
            <Layers className="mr-1 h-3.5 w-3.5" />
            Planos & Preços de Telas
          </Button>
        </div>
      </div>

      {/* Compact 1-Line KPI Pills (matching /expiration) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 flex-shrink-0">
        <div className="px-3 py-1.5 rounded-lg border bg-card border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Assinantes (Admin Loja)</span>
          <span className="text-sm font-bold font-mono text-foreground">{storeAdminUsers.length}</span>
        </div>

        <div className="px-3 py-1.5 rounded-lg border bg-primary/5 border-primary/20 flex items-center justify-between">
          <span className="text-xs font-medium text-primary">MRR Planos Acordados</span>
          <span className="text-sm font-bold font-mono text-primary">
            {formatCurrency(mrrBasePlans)}/mês
          </span>
        </div>

        <div className="px-3 py-1.5 rounded-lg border bg-amber-500/5 border-amber-500/20 flex items-center justify-between">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">MRR Licenças Extras</span>
          <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(mrrExtraEmployeeSeats)}/mês
          </span>
        </div>

        <div className="px-3 py-1.5 rounded-lg border bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Faturas Pagas</span>
          <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaidInvoices)}
          </span>
        </div>
      </div>

      {/* Tabela de Assinantes Admin Loja (Viewport-fitted with pinned bottom Pagination) */}
      <Card className="flex-1 min-h-0 flex flex-col border border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-12 text-center text-muted-foreground text-sm">
              Carregando controle de pagamentos e assinaturas...
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Titular (Admin Loja)</th>
                    <th className="px-3 py-2.5 font-semibold">Lojas & Cota de Funcionários</th>
                    <th className="px-3 py-2.5 font-semibold">Plano de Telas</th>
                    <th className="px-3 py-2.5 font-semibold">Mensalidade + Licenças</th>
                    <th className="px-3 py-2.5 font-semibold">Próx. Vencimento</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedAdmins.map((u) => {
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
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-foreground">
                            {u.fullName || 'Sem nome'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.email}
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
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

                        <td className="px-3 py-2.5">
                          <div className="font-medium text-foreground">
                            {u.permissionProfile?.customPlanName ||
                              'Acesso Total Padrão'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.permissionProfile?.enabledModules?.length ?? 10}/10
                            módulos ativos
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="font-bold text-foreground font-mono">
                            {formatCurrency(baseValue + extraSeatsCost)}/mês
                          </div>
                          {extraSeatsCost > 0 && (
                            <div className="text-[11px] text-amber-500">
                              Inclui +{formatCurrency(extraSeatsCost)} licenças extras
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                          {u.permissionProfile?.nextDueDate
                            ? formatDate(u.permissionProfile.nextDueDate)
                            : `Todo dia ${u.permissionProfile?.billingDay || 10}`}
                        </td>

                        <td className="px-3 py-2.5">
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

                        <td className="py-2.5 px-4 text-right">
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
          )}
        </CardContent>

        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
          />
        </div>
      </Card>
    </div>
  )
}

export default GlobalAdminFinancePaymentsPage
