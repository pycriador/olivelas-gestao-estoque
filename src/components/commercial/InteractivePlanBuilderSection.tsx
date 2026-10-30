import { useState, useEffect, useMemo } from 'react'
import {
  Check,
  Sparkles,
  Plus,
  Layers,
  Users,
  Send,
  CheckCircle2,
  PackagePlus,
  Building2,
  Phone,
  Mail,
  User,
  Calculator,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { permissionGroupService } from '@/services/permissionGroupService'
import { contractService } from '@/services/contractService'
import type {
  ModuleCategory,
  ModuleCode,
  PermissionGroup,
  PermissionModule,
} from '@/types/permissionGroup.types'
import { toast } from 'sonner'

const FREE_EMPLOYEES_PER_STORE = 10
const DEFAULT_EXTRA_EMPLOYEE_PRICE = 19.9

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  VENDAS: 'Vendas, PDV & Catálogo WhatsApp',
  CATALOGO_ESTOQUE: 'Estoque, Lotes & Validades',
  COMPRAS_SUPRIMENTOS: 'Compras, Fornecedores & Suprimentos',
  GESTAO_BI: 'Clientes, BI, Relatórios & Equipe',
  TECNOLOGIA: 'Integrações REST & API Studio',
}

interface InteractivePlanBuilderSectionProps {
  id?: string
  showHeader?: boolean
}

export function InteractivePlanBuilderSection({
  id = 'personalizar-plano',
  showHeader = true,
}: InteractivePlanBuilderSectionProps) {
  const [plans, setPlans] = useState<PermissionGroup[]>([])
  const [modules, setModules] = useState<PermissionModule[]>([])
  const [loading, setLoading] = useState(true)

  // Builder state
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'CUSTOM'>('')
  const [addonModuleCodes, setAddonModuleCodes] = useState<ModuleCode[]>([])
  const [employeeCount, setEmployeeCount] = useState<number>(5)

  // Pre-registration form state
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedProposalId, setSubmittedProposalId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadCatalog() {
      setLoading(true)
      try {
        const [loadedPlans, loadedModules] = await Promise.all([
          permissionGroupService.listPublicLandingPlans(),
          permissionGroupService.listModules(),
        ])
        if (!active) return
        setPlans(loadedPlans)
        setModules(loadedModules)
        const highlighted = loadedPlans.find((p) => p.isHighlightedOnLanding) || loadedPlans[0]
        if (highlighted) {
          setSelectedPlanId(highlighted.id)
        } else {
          setSelectedPlanId('CUSTOM')
        }
      } catch {
        // Fallback already handled inside service
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCatalog()
    return () => {
      active = false
    }
  }, [])

  const selectedPlan = useMemo(
    () => (selectedPlanId === 'CUSTOM' ? null : plans.find((p) => p.id === selectedPlanId) || null),
    [plans, selectedPlanId]
  )

  const planIncludedModules = useMemo(() => {
    return new Set<ModuleCode>(selectedPlan?.enabledModules || [])
  }, [selectedPlan])

  // Whenever user switches base plan, remove addons that are already part of the new base plan
  const handleSelectPlan = (planId: string | 'CUSTOM') => {
    setSelectedPlanId(planId)
    if (planId !== 'CUSTOM') {
      const targetPlan = plans.find((p) => p.id === planId)
      if (targetPlan) {
        const included = new Set<ModuleCode>(targetPlan.enabledModules || [])
        setAddonModuleCodes((prev) => prev.filter((code) => !included.has(code)))
      }
    }
  }

  const toggleAddonModule = (code: ModuleCode) => {
    if (planIncludedModules.has(code)) return
    setAddonModuleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  // Price calculations
  const basePlanMonthlyPrice = useMemo(() => {
    if (!selectedPlan) return 0
    if (billingCycle === 'YEARLY') {
      return Number(((selectedPlan.annualPrice || selectedPlan.baseMonthlyPrice * 10) / 12).toFixed(2))
    }
    return selectedPlan.baseMonthlyPrice || 0
  }, [selectedPlan, billingCycle])

  const selectedAddons = useMemo(() => {
    return modules.filter(
      (m) => addonModuleCodes.includes(m.code) && !planIncludedModules.has(m.code)
    )
  }, [modules, addonModuleCodes, planIncludedModules])

  const addonsMonthlyPrice = useMemo(() => {
    const rawMonthly = selectedAddons.reduce((acc, m) => acc + (m.monthlyPrice || 0), 0)
    if (billingCycle === 'YEARLY') {
      // 15% discount on annual commitment for standalone modules
      return Number((rawMonthly * 0.85).toFixed(2))
    }
    return Number(rawMonthly.toFixed(2))
  }, [selectedAddons, billingCycle])

  const extraEmployees = Math.max(0, employeeCount - FREE_EMPLOYEES_PER_STORE)
  const extraEmployeesMonthlyPrice = Number(
    (extraEmployees * DEFAULT_EXTRA_EMPLOYEE_PRICE).toFixed(2)
  )

  const totalMonthlyEquivalent = Number(
    (basePlanMonthlyPrice + addonsMonthlyPrice + extraEmployeesMonthlyPrice).toFixed(2)
  )

  const totalContractCyclePrice =
    billingCycle === 'YEARLY'
      ? Number(
          (
            (selectedPlan?.annualPrice || 0) +
            addonsMonthlyPrice * 12 +
            extraEmployeesMonthlyPrice * 12
          ).toFixed(2)
        )
      : totalMonthlyEquivalent

  const formatPhoneInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      toast.error('Informe seu nome completo para registrar a proposta.')
      return
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Informe um e-mail válido para contato.')
      return
    }
    if (customerPhone.replace(/\D/g, '').length < 10) {
      toast.error('Informe um número de celular/WhatsApp válido com DDD.')
      return
    }
    if (!selectedPlan && selectedAddons.length === 0) {
      toast.error('Escolha um plano base ou selecione ao menos 1 módulo avulso.')
      return
    }

    setSubmitting(true)
    try {
      const proposal = await contractService.submitProposal({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        companyName: companyName.trim() || undefined,
        selectedPlanId: selectedPlan ? selectedPlan.id : null,
        selectedPlanName: selectedPlan
          ? selectedPlan.name
          : 'Plano 100% Personalizado (Avulso)',
        selectedPlanBasePrice:
          billingCycle === 'YEARLY'
            ? selectedPlan?.annualPrice || 0
            : selectedPlan?.baseMonthlyPrice || 0,
        billingCycle,
        selectedAddonModules: selectedAddons.map((m) => ({
          code: m.code,
          name: m.name,
          monthlyPrice: m.monthlyPrice,
        })),
        addonsTotalPrice:
          billingCycle === 'YEARLY'
            ? Number((addonsMonthlyPrice * 12).toFixed(2))
            : addonsMonthlyPrice,
        estimatedEmployees: employeeCount,
        totalPrice: totalContractCyclePrice,
        notes: notes.trim() || undefined,
      })

      setSubmittedProposalId(proposal.id)
      toast.success('Proposta e pré-cadastro registrados com sucesso!')
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível registrar sua proposta. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const groupedModules = useMemo(() => {
    const groups: Record<ModuleCategory, PermissionModule[]> = {
      VENDAS: [],
      CATALOGO_ESTOQUE: [],
      COMPRAS_SUPRIMENTOS: [],
      GESTAO_BI: [],
      TECNOLOGIA: [],
    }
    modules.forEach((m) => {
      if (groups[m.category]) {
        groups[m.category].push(m)
      } else {
        groups.VENDAS.push(m)
      }
    })
    return groups
  }, [modules])

  return (
    <section id={id} className="max-w-7xl mx-auto px-4 sm:px-6 scroll-mt-20">
      <div className="rounded-3xl bg-gradient-to-b from-surface via-surface to-muted/20 border border-border p-6 sm:p-10 shadow-xl space-y-8">
        {showHeader && (
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> Configurador Interativo de Planos & Módulos Avulsos
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Personalize seu Plano, Adicione Módulos Avulsos e Faça seu Pré-Cadastro
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Escolha um plano base vinculado pelo Global Admin ou monte uma solução sob medida combinando módulos avulsos. Registre sua solicitação para atendimento imediato.
              </p>
            </div>

            {/* Billing Cycle Switch */}
            <div className="inline-flex items-center p-1 rounded-xl bg-muted border border-border self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ciclo Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'YEARLY'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Ciclo Anual</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-extrabold">
                  -17%
                </span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Carregando planos e módulos interativos...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Step 1 (Plans) + Step 2 (Add-on Modules & Team Simulator) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-8">
              {/* STEP 1: Base Plan Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-extrabold flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      Escolha o Plano Base
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {plans.length} planos ativos na vitrine
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id
                    const displayPrice =
                      billingCycle === 'YEARLY'
                        ? Number(((plan.annualPrice || plan.baseMonthlyPrice * 10) / 12).toFixed(2))
                        : plan.baseMonthlyPrice

                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`cursor-pointer rounded-2xl p-5 border transition-all relative flex flex-col justify-between gap-4 ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                            : 'border-border bg-background/70 hover:border-primary/40'
                        }`}
                      >
                        {plan.isHighlightedOnLanding && (
                          <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                            Mais Popular
                          </span>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-sm text-foreground">{plan.name}</div>
                            <div
                              className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {plan.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-end justify-between gap-2">
                          <div>
                            <div className="text-xl font-extrabold text-foreground">
                              R$ {Number(displayPrice || 0).toFixed(2)}
                              <span className="text-[11px] font-normal text-muted-foreground">
                                /mês
                              </span>
                            </div>
                            {billingCycle === 'YEARLY' && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                R$ {Number(plan.annualPrice || 0).toFixed(2)} cobrado anualmente
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {(plan.enabledModules || []).length} módulos inclusos
                          </Badge>
                        </div>
                      </div>
                    )
                  })}

                  {/* Option: 100% Custom Standalone Build */}
                  <div
                    onClick={() => handleSelectPlan('CUSTOM')}
                    className={`cursor-pointer rounded-2xl p-5 border border-dashed transition-all flex flex-col justify-between gap-4 ${
                      selectedPlanId === 'CUSTOM'
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                        : 'border-border bg-background/40 hover:border-primary/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <PackagePlus className="h-4 w-4 text-primary" />
                          <span>Montar 100% Avulso</span>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedPlanId === 'CUSTOM'
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {selectedPlanId === 'CUSTOM' && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Sem plano base fixo. Escolha abaixo apenas os módulos individuais que sua loja precisa.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">A partir de R$ 19,90/mês</span>
                      <Badge variant="outline" className="text-[10px]">
                        Sob Medida
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Add-on Modules (Adicionais Avulsos) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-extrabold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">
                        Personalize os Módulos e Adicionais Avulsos
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Módulos em verde já fazem parte do plano escolhido. Clique nos demais para adicionar como avulso.
                      </p>
                    </div>
                  </div>
                  {addonModuleCodes.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddonModuleCodes([])}
                      className="text-xs h-7 self-start sm:self-auto"
                    >
                      Limpar adicionais ({addonModuleCodes.length})
                    </Button>
                  )}
                </div>

                <div className="space-y-5">
                  {(Object.keys(groupedModules) as ModuleCategory[]).map((cat) => {
                    const catModules = groupedModules[cat]
                    if (!catModules || catModules.length === 0) return null
                    return (
                      <div key={cat} className="space-y-2.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          <span>{CATEGORY_LABELS[cat]}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {catModules.map((mod) => {
                            const isIncludedInPlan = planIncludedModules.has(mod.code)
                            const isAddedAsAddon = addonModuleCodes.includes(mod.code)

                            return (
                              <div
                                key={mod.code}
                                onClick={() => toggleAddonModule(mod.code)}
                                className={`rounded-xl p-3.5 border transition-all flex items-start justify-between gap-3 ${
                                  isIncludedInPlan
                                    ? 'border-emerald-500/30 bg-emerald-500/5 cursor-default'
                                    : isAddedAsAddon
                                      ? 'border-primary bg-primary/10 shadow-xs cursor-pointer'
                                      : 'border-border bg-background/60 hover:border-primary/40 cursor-pointer'
                                }`}
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-foreground">
                                      {mod.name}
                                    </span>
                                    {isIncludedInPlan ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                        Incluso no Plano
                                      </span>
                                    ) : isAddedAsAddon ? (
                                      <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                        + Adicional Ativo
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                    {mod.description}
                                  </p>
                                </div>

                                <div className="text-right shrink-0 flex flex-col items-end justify-between">
                                  {isIncludedInPlan ? (
                                    <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                      <Check className="h-3.5 w-3.5" />
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs font-extrabold text-foreground">
                                        + R$ {mod.monthlyPrice.toFixed(2)}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        /mês avulso
                                      </span>
                                      <div
                                        className={`mt-1 h-5 w-5 rounded-md border flex items-center justify-center ${
                                          isAddedAsAddon
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'border-border'
                                        }`}
                                      >
                                        {isAddedAsAddon ? (
                                          <Check className="h-3 w-3" />
                                        ) : (
                                          <Plus className="h-3 w-3 text-muted-foreground" />
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* STEP 3: Employee Counter Simulator */}
              <div className="rounded-2xl border border-border bg-background/70 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      Quantidade Estimada de Funcionários na Loja
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] w-fit">
                    Até {FREE_EMPLOYEES_PER_STORE} funcionários grátis por loja
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-extrabold text-foreground shrink-0 min-w-[110px] text-center">
                    {employeeCount} {employeeCount === 1 ? 'funcionário' : 'funcionários'}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {extraEmployees === 0
                    ? `Dentro da franquia gratuita de ${FREE_EMPLOYEES_PER_STORE} funcionários operacionais (R$ 0,00 adicional).`
                    : `${extraEmployees} licença(s) extra(s) além da franquia gratuita (+ R$ ${extraEmployeesMonthlyPrice.toFixed(2)}/mês).`}
                </p>
              </div>
            </div>

            {/* Right Column: Live Proposal Summary & Pre-Registration Form */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
              <div className="rounded-3xl bg-surface border-2 border-primary/30 shadow-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-base font-extrabold text-foreground">
                        Resumo & Pré-Cadastro
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Sua proposta fica registrada para o Global Admin
                      </p>
                    </div>
                  </div>
                  <Badge>{billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'}</Badge>
                </div>

                {/* Live Price Breakdown */}
                <div className="space-y-2.5 text-xs bg-muted/40 p-4 rounded-2xl border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Plano Base:</span>
                    <span className="font-bold text-foreground text-right">
                      {selectedPlan ? selectedPlan.name : 'Pacote 100% Avulso'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Valor do Plano Base:</span>
                    <span className="font-semibold text-foreground">
                      R$ {basePlanMonthlyPrice.toFixed(2)}/mês
                    </span>
                  </div>

                  {selectedAddons.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      <div className="font-semibold text-foreground">
                        Módulos Adicionais Avulsos ({selectedAddons.length}):
                      </div>
                      {selectedAddons.map((addon) => (
                        <div
                          key={addon.code}
                          className="flex items-center justify-between text-[11px] text-muted-foreground"
                        >
                          <span className="truncate pr-2">+ {addon.name}</span>
                          <span className="font-mono shrink-0">
                            R$ {addon.monthlyPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {extraEmployees > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                      <span className="text-muted-foreground">
                        +{extraEmployees} Funcionário(s) Extra(s):
                      </span>
                      <span className="font-semibold text-foreground">
                        R$ {extraEmployeesMonthlyPrice.toFixed(2)}/mês
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border flex items-baseline justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Investimento Total</div>
                      <div className="text-[10px] text-muted-foreground">
                        {billingCycle === 'YEARLY'
                          ? `Total anual: R$ ${totalContractCyclePrice.toFixed(2)}`
                          : 'Cobrança mensal sem fidelidade'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-primary">
                        R$ {totalMonthlyEquivalent.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">/mês</span>
                    </div>
                  </div>
                </div>

                {submittedProposalId ? (
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">
                      Solicitação Registrada com Sucesso!
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sua proposta personalizada foi enviada para a seção{' '}
                      <strong className="text-foreground">Novos Contratos</strong> do Global Admin.
                      Nossa equipe entrará em contato pelo WhatsApp e E-mail informados.
                    </p>
                    <div className="text-[11px] font-mono bg-background/80 py-1.5 px-3 rounded-lg border border-border">
                      Protocolo: #{submittedProposalId.slice(0, 8).toUpperCase()}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setSubmittedProposalId(null)
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Simular Outra Proposta
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProposal} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" /> Nome Completo *
                      </label>
                      <Input
                        required
                        placeholder="Ex.: Carlos Eduardo Silva"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" /> E-mail *
                      </label>
                      <Input
                        required
                        type="email"
                        placeholder="contato@suaempresa.com.br"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-primary" /> Celular / WhatsApp *
                      </label>
                      <Input
                        required
                        placeholder="(11) 99999-9999"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(formatPhoneInput(e.target.value))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-primary" /> Nome da Loja / Empresa (opcional)
                      </label>
                      <Input
                        placeholder="Ex.: Empório & Hortifruti Central"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Observações ou Dúvidas (opcional)
                      </label>
                      <Input
                        placeholder="Ex.: Tenho 1 matriz e 2 filiais..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitting}
                      className="w-full font-bold shadow-lg shadow-primary/20 mt-2"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitting ? 'Registrando Proposta...' : 'Registrar Proposta & Pré-Cadastro'}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>

                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Sem compromisso imediato. Receba o contrato formal para revisão.</span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
