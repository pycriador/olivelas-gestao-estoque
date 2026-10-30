import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Edit,
  Info,
  Layers,
  Lock,
  Save,
  Shield,
  Sparkles,
  Unlock,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { userService } from '@/services/userService'
import { permissionGroupService } from '@/services/permissionGroupService'
import {
  ALL_MODULE_CODES,
  DEFAULT_PERMISSION_GROUPS,
  DEFAULT_PERMISSION_MODULES,
  analyzeScreenDependencies,
} from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { PlatformUser } from '@/types/user.types'
import type {
  BillingCycle,
  ModuleCode,
  PermissionGroup,
  PermissionModule,
  StoreEmployeeLicenseSummary,
  SubscriptionPaymentStatus,
} from '@/types/permissionGroup.types'

const CATEGORY_LABELS: Record<string, string> = {
  VENDAS: '1. Vendas, PDV, Catálogo WhatsApp & Clientes',
  CATALOGO_ESTOQUE: '2. Controle de Estoque & Validades de Lotes',
  COMPRAS_SUPRIMENTOS: '3. Compras & Fornecedores',
  GESTAO_BI: '4. Gestão de Relatórios (BI), Equipe & Auditoria',
  TECNOLOGIA: '5. Integrações API Externas & Conectores',
}

export const GlobalAdminUserPermissionsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [user, setUser] = useState<PlatformUser | null>(null)
  const [modules, setModules] = useState<PermissionModule[]>(DEFAULT_PERMISSION_MODULES)
  const [groups, setGroups] = useState<PermissionGroup[]>(DEFAULT_PERMISSION_GROUPS)
  const [storeLicenses, setStoreLicenses] = useState<StoreEmployeeLicenseSummary[]>([])

  // Form state
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [customPlanName, setCustomPlanName] = useState<string>('')
  const [enforceOverStoreAdmin, setEnforceOverStoreAdmin] = useState<boolean>(true)
  const [enabledModules, setEnabledModules] = useState<ModuleCode[]>(ALL_MODULE_CODES)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY')
  const [discountAmount, setDiscountAmount] = useState<string>('0')
  const [agreedMonthlyValue, setAgreedMonthlyValue] = useState<string>('')
  const [manualValueOverride, setManualValueOverride] = useState<boolean>(false)
  const [paymentStatus, setPaymentStatus] = useState<SubscriptionPaymentStatus>('ACTIVE')
  const [blockOnOverdue, setBlockOnOverdue] = useState<boolean>(true)
  const [billingDay, setBillingDay] = useState<string>('10')
  const [nextDueDate, setNextDueDate] = useState<string>('')
  const [commercialNotes, setCommercialNotes] = useState<string>('')

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [loadedUser, mods, grps, allStoreLics] = await Promise.all([
        userService.getPlatformUserById(userId),
        permissionGroupService.listModules(),
        permissionGroupService.listPermissionGroups(),
        permissionGroupService.getStoresEmployeeLicenseSummaries(),
      ])

      if (!loadedUser) {
        toast.error('Usuário não encontrado.')
        navigate('/global-admin?tab=users')
        return
      }

      setUser(loadedUser)
      setModules(mods)
      setGroups(grps)

      const userStoreIds = new Set(loadedUser.stores.map((s) => s.storeId))
      setStoreLicenses(allStoreLics.filter((sl) => userStoreIds.has(sl.storeId)))

      const prof = loadedUser.permissionProfile
      if (prof) {
        setSelectedGroupId(prof.permissionGroupId || '')
        setCustomPlanName(prof.customPlanName || '')
        setEnforceOverStoreAdmin(prof.enforceOverStoreAdmin)
        setEnabledModules(prof.enabledModules || ALL_MODULE_CODES)
        setBillingCycle(prof.billingCycle || 'MONTHLY')
        setDiscountAmount(String(prof.discountAmount || 0))
        setAgreedMonthlyValue(String(prof.agreedMonthlyValue || 0))
        setManualValueOverride(true)
        setPaymentStatus(prof.paymentStatus || 'ACTIVE')
        setBlockOnOverdue(prof.blockOnOverdue)
        setBillingDay(String(prof.billingDay || 10))
        setNextDueDate(prof.nextDueDate ? prof.nextDueDate.slice(0, 10) : '')
        setCommercialNotes(prof.commercialNotes || '')
      } else {
        const defaultGroup =
          grps.find((g) => g.code === 'ERP_PRO_COMPLETO') || grps[0]
        if (defaultGroup) {
          setSelectedGroupId(defaultGroup.id)
          setCustomPlanName(defaultGroup.name)
          setEnabledModules(defaultGroup.enabledModules)
          setAgreedMonthlyValue(String(defaultGroup.baseMonthlyPrice))
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar permissões e plano do usuário.')
    } finally {
      setLoading(false)
    }
  }, [navigate, userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Extra employee licenses across the user's stores
  const extraEmployeeLicensesTotalCost = useMemo(
    () =>
      storeLicenses.reduce(
        (acc, s) => acc + (s.extraEmployeesMonthlyCost || 0),
        0
      ),
    [storeLicenses]
  )

  const extraEmployeeLicensesCount = useMemo(
    () =>
      storeLicenses.reduce((acc, s) => acc + (s.extraBillableEmployees || 0), 0),
    [storeLicenses]
  )

  const calculatedModulesSum = useMemo(() => {
    return modules
      .filter((m) => enabledModules.includes(m.code))
      .reduce((acc, m) => acc + Number(m.monthlyPrice || 0), 0)
  }, [enabledModules, modules])

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  )

  const calculatedGrossMonthly = useMemo(() => {
    const basePlanOrModules = selectedGroup
      ? Number(selectedGroup.baseMonthlyPrice || calculatedModulesSum)
      : calculatedModulesSum
    return basePlanOrModules + extraEmployeeLicensesTotalCost
  }, [calculatedModulesSum, extraEmployeeLicensesTotalCost, selectedGroup])

  useEffect(() => {
    if (!manualValueOverride) {
      const disc = Number(discountAmount || 0)
      const net = Math.max(0, calculatedGrossMonthly - disc)
      setAgreedMonthlyValue(net.toFixed(2))
    }
  }, [calculatedGrossMonthly, discountAmount, manualValueOverride])

  const dependencyImpacts = useMemo(
    () => analyzeScreenDependencies(enabledModules),
    [enabledModules]
  )

  const handleApplyGroup = (group: PermissionGroup) => {
    setSelectedGroupId(group.id)
    setCustomPlanName(group.name)
    setEnabledModules(group.enabledModules)
    setManualValueOverride(false)
    const disc = Number(discountAmount || 0)
    const net = Math.max(
      0,
      Number(group.baseMonthlyPrice) + extraEmployeeLicensesTotalCost - disc
    )
    setAgreedMonthlyValue(net.toFixed(2))
  }

  const handleToggleModule = (code: ModuleCode) => {
    setManualValueOverride(false)
    setSelectedGroupId('')
    setEnabledModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const handleQuickFixImpact = (
    action: 'ENABLE_MODULE' | 'DISABLE_DEPENDENT',
    targetModule: ModuleCode
  ) => {
    setManualValueOverride(false)
    if (action === 'ENABLE_MODULE') {
      setEnabledModules((prev) =>
        prev.includes(targetModule) ? prev : [...prev, targetModule]
      )
    } else {
      setEnabledModules((prev) => prev.filter((m) => m !== targetModule))
    }
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const primaryStoreId = user?.stores?.[0]?.storeId || null
      await permissionGroupService.saveUserPermissionProfile({
        userId,
        storeId: primaryStoreId,
        permissionGroupId: selectedGroupId || null,
        customPlanName:
          customPlanName.trim() ||
          selectedGroup?.name ||
          'Plano Comercial Personalizado',
        enforceOverStoreAdmin,
        enabledModules,
        grantedPermissions: [],
        revokedPermissions: [],
        billingCycle,
        calculatedMonthlyValue: calculatedGrossMonthly,
        discountAmount: Number(discountAmount || 0),
        agreedMonthlyValue: Number(agreedMonthlyValue || 0),
        paymentStatus,
        blockOnOverdue,
        billingDay: Number(billingDay || 10),
        nextDueDate: nextDueDate || null,
        commercialNotes: commercialNotes.trim() || null,
      })

      toast.success(
        'Plano comercial, permissões de tela e regras de cobrança atualizados com sucesso!'
      )
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar perfil de permissões.')
    } finally {
      setSaving(false)
    }
  }

  const groupedModules = useMemo(() => {
    const map: Record<string, PermissionModule[]> = {}
    for (const m of modules) {
      const cat = m.category || 'VENDAS'
      if (!map[cat]) map[cat] = []
      map[cat].push(m)
    }
    return map
  }, [modules])

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={`Permissões de Tela & Plano: ${user?.fullName || user?.email || ''}`}
        badge={
          <Badge variant="default">
            {enabledModules.length}/{modules.length} Telas Ativas
          </Badge>
        }
      />

      {/* Top Identification & Navigation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                /global-admin/users/{userId}/permissions
              </span>
              <Badge variant="warning">Admin Loja</Badge>
              <span className="text-xs font-semibold text-foreground">
                {user?.fullName} ({user?.email})
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Limite ou libere telas da plataforma para este Administrador de Loja, analise impactos cruzados entre módulos e defina o valor comercial da assinatura.
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
            onClick={() => navigate(`/global-admin/users/${userId}/edit`)}
          >
            <Edit className="mr-1.5 h-4 w-4" />
            Conta & Lojas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/global-admin/users/${userId}/billing`)}
          >
            <CreditCard className="mr-1.5 h-4 w-4" />
            Controle de Pagamentos
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Salvar Plano & Permissões
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando módulos de tela, análise de dependências e regras comerciais...
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 1. Seleção Rápida de Grupo de Perfil Comercial */}
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-primary" />
                  1. Pacotes e Grupos de Perfil Comercial (Com Valores)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Selecione um pacote base ou personalize módulo por módulo abaixo.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/global-admin/finance/plans')}
              >
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Editar Catálogo de Planos & Preços
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {groups.map((grp) => {
                const isSelected = selectedGroupId === grp.id
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => handleApplyGroup(grp)}
                    className={cn(
                      'flex flex-col justify-between rounded-xl border p-4 text-left transition',
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-background hover:bg-muted/50'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {grp.name}
                        </span>
                        <Badge variant={isSelected ? 'default' : 'secondary'}>
                          {grp.enabledModules.length} telas
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {grp.description}
                      </p>
                    </div>
                    <div className="mt-3 border-t border-border/60 pt-2 text-sm font-extrabold text-primary">
                      {formatCurrency(grp.baseMonthlyPrice)}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        /mês
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* 2. Chave de Sobreposição sobre STORE_ADMIN & Alertas de Dependência entre Telas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="space-y-4 p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Layers className="h-5 w-5 text-primary" />
                    2. Controle de Acesso às Telas e Funcionalidades
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Marque ou desmarque as telas contratadas pelo cliente.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={enforceOverStoreAdmin}
                    onChange={(e) => setEnforceOverStoreAdmin(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  {enforceOverStoreAdmin ? (
                    <Lock className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  Restringir mesmo sendo Admin Loja
                </label>
              </div>

              {/* Diagnóstico Inteligente de Dependências entre Telas */}
              {dependencyImpacts.length > 0 ? (
                <div className="space-y-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    Impacto Cruzado Detectado ({dependencyImpacts.length} aviso(s) ao desmarcar telas)
                  </div>
                  <div className="space-y-2">
                    {dependencyImpacts.map((imp, idx) => (
                      <div
                        key={`${imp.disabledModule}-${idx}`}
                        className="rounded-lg border border-amber-500/30 bg-background/90 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-foreground">
                            {imp.severity === 'CRITICAL' ? '🚨 ' : '⚠️ '}
                            {imp.title}
                          </span>
                          {imp.suggestedQuickFix && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleQuickFixImpact(
                                  imp.suggestedQuickFix!.action,
                                  imp.suggestedQuickFix!.targetModule
                                )
                              }
                            >
                              <Zap className="mr-1 h-3 w-3 text-amber-500" />
                              {imp.suggestedQuickFix.label}
                            </Button>
                          )}
                        </div>
                        <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <span className="font-semibold text-danger">
                              O que para de funcionar:
                            </span>
                            <ul className="ml-4 list-disc text-[11px] text-muted-foreground">
                              {imp.whatStopsWorking.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-semibold text-emerald-600">
                              O que continua funcionando:
                            </span>
                            <ul className="ml-4 list-disc text-[11px] text-muted-foreground">
                              {imp.whatStillWorks.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Nenhum conflito de dependência entre as telas habilitadas. Todos os fluxos integrados operarão normalmente.
                  </span>
                </div>
              )}

              {/* Lista de Módulos por Categoria */}
              <div className="space-y-5">
                {Object.entries(groupedModules).map(([cat, catModules]) => (
                  <div key={cat} className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABELS[cat] || cat}
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {catModules.map((mod) => {
                        const checked = enabledModules.includes(mod.code)
                        return (
                          <div
                            key={mod.code}
                            onClick={() => handleToggleModule(mod.code)}
                            className={cn(
                              'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 transition',
                              checked
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-border bg-background opacity-70 hover:opacity-100'
                            )}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {mod.name}
                                </span>
                                <Badge variant={checked ? 'default' : 'outline'}>
                                  {formatCurrency(mod.monthlyPrice)}/mês
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {mod.description}
                              </p>
                              <div className="font-mono text-[10px] text-muted-foreground/80">
                                Rotas: {mod.routes.join(', ')}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}}
                              className="mt-1 h-4 w-4 rounded border-border text-primary"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Col 3: Resumo Comercial, Licenças de Funcionários e Precificação */}
            <div className="space-y-6">
              <Card className="space-y-4 p-6">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-base font-bold text-foreground">
                    3. Precificação & Licenças das Lojas
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Nome Comercial do Plano Contratado
                    </label>
                    <Input
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      placeholder="Ex: Plano Controle de Estoque + PDV"
                    />
                  </div>

                  {/* Breakdown de Lojas e Licenças de Funcionários (10 grátis por loja) */}
                  <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Cota de Funcionários nas Lojas
                      </span>
                      <Badge
                        variant={
                          extraEmployeeLicensesCount > 0 ? 'warning' : 'success'
                        }
                      >
                        {extraEmployeeLicensesCount > 0
                          ? `+${extraEmployeeLicensesCount} licenças extras`
                          : '100% Grátis'}
                      </Badge>
                    </div>

                    {storeLicenses.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        Nenhuma loja vinculada a este usuário ainda.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {storeLicenses.map((sl) => (
                          <div
                            key={sl.storeId}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate text-muted-foreground">
                              {sl.isBranch ? '└─ ' : ''}
                              {sl.storeName} ({sl.activeEmployeesCount}/
                              {sl.freeEmployeesQuota} grátis)
                            </span>
                            <span className="font-semibold text-foreground">
                              {sl.extraBillableEmployees > 0
                                ? `+${formatCurrency(sl.extraEmployeesMonthlyCost)}`
                                : 'R$ 0,00'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resumo de Cálculo */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Valor Base Telas/Pacote:
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(
                          calculatedGrossMonthly - extraEmployeeLicensesTotalCost
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Licenças Extras de Funcionários:
                      </span>
                      <span className="font-semibold text-amber-600">
                        + {formatCurrency(extraEmployeeLicensesTotalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 font-bold text-foreground">
                      <span>Subtotal Calculado:</span>
                      <span>{formatCurrency(calculatedGrossMonthly)}/mês</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Desconto Comercial (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={discountAmount}
                        onChange={(e) => {
                          setManualValueOverride(false)
                          setDiscountAmount(e.target.value)
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Valor Final Acordado (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={agreedMonthlyValue}
                        onChange={(e) => {
                          setManualValueOverride(true)
                          setAgreedMonthlyValue(e.target.value)
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Status da Assinatura
                      </label>
                      <select
                        value={paymentStatus}
                        onChange={(e) =>
                          setPaymentStatus(
                            e.target.value as SubscriptionPaymentStatus
                          )
                        }
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
                      >
                        <option value="ACTIVE">Ativa (Em dia)</option>
                        <option value="TRIAL">Período de Teste (Trial)</option>
                        <option value="PENDING">Aguardando 1º Pagamento</option>
                        <option value="PAST_DUE">Em Atraso (Inadimplente)</option>
                        <option value="SUSPENDED">Suspensa por Inadimplência</option>
                        <option value="EXEMPT">Isento / Cortesia</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Dia de Vencimento
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={billingDay}
                        onChange={(e) => setBillingDay(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Próximo Vencimento
                    </label>
                    <Input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={blockOnOverdue}
                      onChange={(e) => setBlockOnOverdue(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    Bloquear acesso automaticamente se fatura vencer
                  </label>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Observações do Contrato Comercial
                    </label>
                    <Input
                      value={commercialNotes}
                      onChange={(e) => setCommercialNotes(e.target.value)}
                      placeholder="Condições negociadas com o cliente..."
                    />
                  </div>

                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleSave}
                    isLoading={saving}
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    Salvar Plano & Permissões de Tela
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalAdminUserPermissionsPage
