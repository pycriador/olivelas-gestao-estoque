import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  DollarSign,
  Edit,
  GitBranch,
  Layers,
  Save,
  Settings,
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
import { permissionGroupService } from '@/services/permissionGroupService'
import { formatCurrency } from '@/utils/currency'
import type {
  PlatformBillingRules,
  StoreEmployeeLicenseSummary,
} from '@/types/permissionGroup.types'

export const GlobalAdminFinanceRulesPage: React.FC = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [rules, setRules] = useState<PlatformBillingRules | null>(null)
  const [storeSummaries, setStoreSummaries] = useState<
    StoreEmployeeLicenseSummary[]
  >([])

  // Editable global rule fields
  const [defaultFreeEmployees, setDefaultFreeEmployees] = useState('10')
  const [defaultExtraPrice, setDefaultExtraPrice] = useState('19.90')
  const [countStoreAdminsInQuota, setCountStoreAdminsInQuota] = useState(false)
  const [gracePeriodDays, setGracePeriodDays] = useState('5')
  const [autoBlockOverdue, setAutoBlockOverdue] = useState(true)
  const [pixKey, setPixKey] = useState('')
  const [billingSupportWhatsapp, setBillingSupportWhatsapp] = useState('')
  const [notes, setNotes] = useState('')

  // Inline store override editing
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null)
  const [overrideFreeLimit, setOverrideFreeLimit] = useState<string>('')
  const [overrideExtraPrice, setOverrideExtraPrice] = useState<string>('')
  const [savingOverride, setSavingOverride] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [loadedRules, summaries] = await Promise.all([
        permissionGroupService.getPlatformBillingRules(),
        permissionGroupService.getStoresEmployeeLicenseSummaries(),
      ])

      setRules(loadedRules)
      setStoreSummaries(summaries)

      setDefaultFreeEmployees(
        String(loadedRules.defaultFreeEmployeesPerStore ?? 10)
      )
      setDefaultExtraPrice(
        String((loadedRules.defaultExtraEmployeePrice ?? 19.9).toFixed(2))
      )
      setCountStoreAdminsInQuota(Boolean(loadedRules.countStoreAdminsInQuota))
      setGracePeriodDays(String(loadedRules.gracePeriodDays ?? 5))
      setAutoBlockOverdue(Boolean(loadedRules.autoBlockOverdue))
      setPixKey(loadedRules.pixKey || '')
      setBillingSupportWhatsapp(loadedRules.billingSupportWhatsapp || '')
      setNotes(loadedRules.notes || '')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar regras financeiras.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Organize stores hierarchically (Matriz -> Filiais)
  const hierarchicalSummaries = useMemo(() => {
    const mapById = new Map(storeSummaries.map((s) => [s.storeId, s]))
    const roots = storeSummaries.filter(
      (s) => !s.isBranch || !s.parentStoreId || !mapById.has(s.parentStoreId)
    )
    const childrenByParent = new Map<string, StoreEmployeeLicenseSummary[]>()

    for (const s of storeSummaries) {
      if (s.isBranch && s.parentStoreId && mapById.has(s.parentStoreId)) {
        const list = childrenByParent.get(s.parentStoreId) || []
        list.push(s)
        childrenByParent.set(s.parentStoreId, list)
      }
    }

    const ordered: StoreEmployeeLicenseSummary[] = []
    for (const r of roots) {
      ordered.push(r)
      const children = childrenByParent.get(r.storeId) || []
      for (const c of children) {
        ordered.push(c)
      }
    }
    return ordered
  }, [storeSummaries])

  const totalActiveEmployees = useMemo(
    () =>
      storeSummaries.reduce((acc, s) => acc + s.activeEmployeesCount, 0),
    [storeSummaries]
  )

  const totalExtraSeats = useMemo(
    () =>
      storeSummaries.reduce((acc, s) => acc + s.extraBillableEmployees, 0),
    [storeSummaries]
  )

  const totalExtraRevenue = useMemo(
    () =>
      storeSummaries.reduce((acc, s) => acc + s.extraEmployeesMonthlyCost, 0),
    [storeSummaries]
  )

  const handleSaveGlobalRules = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await permissionGroupService.savePlatformBillingRules({
        defaultFreeEmployeesPerStore: Math.max(
          0,
          Number(defaultFreeEmployees || 10)
        ),
        defaultExtraEmployeePrice: Math.max(
          0,
          Number(defaultExtraPrice || 19.9)
        ),
        countStoreAdminsInQuota,
        gracePeriodDays: Math.max(0, Number(gracePeriodDays || 5)),
        autoBlockOverdue,
        pixKey: pixKey.trim() || null,
        billingSupportWhatsapp: billingSupportWhatsapp.trim() || null,
        notes: notes.trim() || null,
      })

      toast.success(
        'Regras globais de licenciamento de funcionários e cobrança atualizadas!'
      )
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar regras financeiras.')
    } finally {
      setSaving(false)
    }
  }

  const handleStartEditOverride = (summary: StoreEmployeeLicenseSummary) => {
    setEditingStoreId(summary.storeId)
    setOverrideFreeLimit(String(summary.freeEmployeesQuota))
    setOverrideExtraPrice(String(summary.extraEmployeeUnitPrice.toFixed(2)))
  }

  const handleSaveStoreOverride = async (storeId: string, resetToDefault = false) => {
    setSavingOverride(true)
    try {
      if (resetToDefault) {
        await permissionGroupService.saveStoreLicensingOverride(storeId, {
          freeEmployeesLimit: null,
          extraEmployeePrice: null,
        })
        toast.success('Loja restaurada para a regra padrão da plataforma.')
      } else {
        await permissionGroupService.saveStoreLicensingOverride(storeId, {
          freeEmployeesLimit:
            overrideFreeLimit.trim() !== '' ? Number(overrideFreeLimit) : null,
          extraEmployeePrice:
            overrideExtraPrice.trim() !== '' ? Number(overrideExtraPrice) : null,
        })
        toast.success('Regra específica da loja salva com sucesso!')
      }
      setEditingStoreId(null)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar exceção da loja.')
    } finally {
      setSavingOverride(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Financeiro: Gestão de Regras & Licenças de Funcionários"
        badge={
          <Badge variant="default">
            {defaultFreeEmployees} Grátis / Loja
          </Badge>
        }
      />

      {/* Top Navigation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                /global-admin/finance/rules
              </span>
              <Badge variant="success">Regra Ativa</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Defina quantos funcionários gratuitos cada loja possui por padrão (ex: 10 grátis) e o valor mensal cobrado por cada licença adicional de funcionário ativo.
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
            onClick={() => navigate('/global-admin/finance/plans')}
          >
            <Layers className="mr-1.5 h-4 w-4" />
            Planos & Preços de Telas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin/finance/payments')}
          >
            <CreditCard className="mr-1.5 h-4 w-4" />
            Controle de Pagamentos
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveGlobalRules}
            isLoading={saving}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Salvar Regras Globais
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando regras financeiras e uso de licenças por loja...
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPIs de Licenciamento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Cota Gratuita Padrão por Loja
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-500">
                {defaultFreeEmployees} funcionários
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Funcionários da loja não pagam plano próprio
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Valor por Licença Adicional
              </div>
              <div className="mt-1 text-2xl font-extrabold text-primary">
                {formatCurrency(Number(defaultExtraPrice || 0))}
                <span className="text-xs font-normal text-muted-foreground">
                  /usuário/mês
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Cobrado na fatura do STORE_ADMIN titular
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Total de Funcionários Ativos nas Lojas
              </div>
              <div className="mt-1 text-2xl font-extrabold text-foreground">
                {totalActiveEmployees}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Distribuídos em {storeSummaries.length} loja(s) e filial(is)
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Receita Mensal de Licenças Extras
              </div>
              <div className="mt-1 text-2xl font-extrabold text-amber-500">
                {formatCurrency(totalExtraRevenue)}
                <span className="text-xs font-normal text-muted-foreground">
                  /mês
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {totalExtraSeats} licença(s) excedente(s) ativa(s)
              </div>
            </Card>
          </div>

          {/* Formulário das Regras Globais */}
          <Card className="space-y-5 p-6">
            <div className="border-b border-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Settings className="h-5 w-5 text-primary" />
                1. Parâmetros Globais de Licenciamento de Funcionários & Cobrança
              </h2>
              <p className="text-xs text-muted-foreground">
                Estas regras valem para todas as lojas e filiais da plataforma (salvo quando uma loja possui exceção individual configurada abaixo).
              </p>
            </div>

            <form
              onSubmit={handleSaveGlobalRules}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Funcionários Grátis por Loja *
                </label>
                <Input
                  type="number"
                  min={0}
                  value={defaultFreeEmployees}
                  onChange={(e) => setDefaultFreeEmployees(e.target.value)}
                  required
                />
                <span className="text-[11px] text-muted-foreground">
                  Padrão recomendado: 10 funcionários grátis
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Preço por Licença Adicional (R$/mês) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={defaultExtraPrice}
                  onChange={(e) => setDefaultExtraPrice(e.target.value)}
                  required
                />
                <span className="text-[11px] text-muted-foreground">
                  Cobrado por cada funcionário ativo além da cota
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Dias de Tolerância após Vencimento
                </label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">
                  Carência antes de alerta/bloqueio
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Chave PIX Oficial para Recebimento
                </label>
                <Input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="financeiro@olivelas.com.br"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Texto / Regra Comercial Exibida nas Faturas
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cada loja tem direito a 10 funcionários grátis..."
                />
              </div>

              <div className="flex flex-col justify-center gap-2 sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={autoBlockOverdue}
                    onChange={(e) => setAutoBlockOverdue(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Habilitar bloqueio automático de assinaturas inadimplentes após carência
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={countStoreAdminsInQuota}
                    onChange={(e) =>
                      setCountStoreAdminsInQuota(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Contabilizar também usuários STORE_ADMIN dentro da cota de 10 funcionários
                </label>
              </div>
            </form>
          </Card>

          {/* Tabela de Lojas (Matriz -> Filiais) e Uso de Licenças de Funcionários */}
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  2. Cota de Funcionários e Licenças Adicionais por Loja / Filial
                </h2>
                <p className="text-xs text-muted-foreground">
                  Visualize o uso de funcionários em cada Matriz e Filial e personalize a cota gratuita ou o valor da licença adicional para lojas específicas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Loja (Matriz / Filial)</th>
                    <th className="px-3 py-3">Titular (STORE_ADMIN)</th>
                    <th className="px-3 py-3">Funcionários Ativos</th>
                    <th className="px-3 py-3">Cota Gratuita</th>
                    <th className="px-3 py-3">Licenças Extras</th>
                    <th className="px-3 py-3">Adicional Mensal</th>
                    <th className="py-3 pl-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hierarchicalSummaries.map((row) => {
                    const isEditingThis = editingStoreId === row.storeId
                    const primaryAdmin = row.storeAdminUsers[0]
                    return (
                      <tr
                        key={row.storeId}
                        className={
                          row.isBranch
                            ? 'bg-muted/20 hover:bg-muted/40'
                            : 'hover:bg-muted/30'
                        }
                      >
                        <td className="py-3 pr-4">
                          <div
                            className={`flex items-center gap-2 ${
                              row.isBranch ? 'pl-6' : ''
                            }`}
                          >
                            {row.isBranch ? (
                              <span className="font-mono text-sm font-bold text-primary">
                                └─
                              </span>
                            ) : (
                              <Building2 className="h-4 w-4 text-primary" />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">
                                  {row.storeName}
                                </span>
                                <Badge
                                  variant={row.isBranch ? 'secondary' : 'default'}
                                >
                                  {row.isBranch
                                    ? `FILIAL ${row.branchCode ? `(${row.branchCode})` : ''}`
                                    : 'MATRIZ'}
                                </Badge>
                                {row.hasCustomStoreOverride && (
                                  <Badge variant="warning">Regra Customizada</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                /{row.storeSlug}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          {primaryAdmin ? (
                            <div>
                              <div className="font-medium text-foreground">
                                {primaryAdmin.fullName || primaryAdmin.email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {primaryAdmin.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sem STORE_ADMIN
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <Badge
                            variant={
                              row.extraBillableEmployees > 0 ? 'warning' : 'success'
                            }
                          >
                            {row.activeEmployeesCount} ativos
                          </Badge>
                          {row.inactiveEmployeesCount > 0 && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (+{row.inactiveEmployeesCount} inativos)
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {isEditingThis ? (
                            <Input
                              type="number"
                              min={0}
                              value={overrideFreeLimit}
                              onChange={(e) =>
                                setOverrideFreeLimit(e.target.value)
                              }
                              className="h-8 w-24 text-xs"
                            />
                          ) : (
                            <span className="font-semibold text-emerald-600">
                              {row.freeEmployeesQuota} grátis
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {isEditingThis ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={overrideExtraPrice}
                                onChange={(e) =>
                                  setOverrideExtraPrice(e.target.value)
                                }
                                className="h-8 w-24 text-xs"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-foreground">
                              {row.extraBillableEmployees} ×{' '}
                              {formatCurrency(row.extraEmployeeUnitPrice)}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 font-bold text-foreground">
                          {row.extraEmployeesMonthlyCost > 0 ? (
                            <span className="text-amber-500">
                              + {formatCurrency(row.extraEmployeesMonthlyCost)}/mês
                            </span>
                          ) : (
                            <span className="text-emerald-600">R$ 0,00 (Grátis)</span>
                          )}
                        </td>

                        <td className="py-3 pl-3 text-right">
                          {isEditingThis ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                isLoading={savingOverride}
                                onClick={() =>
                                  handleSaveStoreOverride(row.storeId, false)
                                }
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSaveStoreOverride(row.storeId, true)
                                }
                              >
                                Padrão
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingStoreId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu
                              triggerLabel="Ações Rápidas"
                              items={[
                                {
                                  key: 'custom-rule',
                                  label: 'Editar Cota / Valor desta Loja',
                                  icon: <Sliders className="h-4 w-4" />,
                                  onSelect: () => handleStartEditOverride(row),
                                },
                                {
                                  key: 'open-store',
                                  label: 'Abrir Página da Loja & Funcionários',
                                  icon: <Edit className="h-4 w-4" />,
                                  onSelect: () =>
                                    navigate(
                                      `/global-admin/stores/${row.storeId}/edit`
                                    ),
                                },
                                ...(primaryAdmin
                                  ? [
                                      {
                                        key: 'open-admin-billing',
                                        label: 'Faturas do STORE_ADMIN Titular',
                                        icon: <CreditCard className="h-4 w-4" />,
                                        onSelect: () =>
                                          navigate(
                                            `/global-admin/users/${primaryAdmin.userId}/billing`
                                          ),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          )}
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

export default GlobalAdminFinanceRulesPage
