import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  DollarSign,
  Layers,
  Lock,
  Unlock,
  Zap,
  Calendar,
  FileText,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { permissionGroupService } from '@/services/permissionGroupService'
import {
  ALL_MODULE_CODES,
  DEFAULT_PERMISSION_GROUPS,
  DEFAULT_PERMISSION_MODULES,
  analyzeScreenDependencies,
} from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import { parseApiError } from '@/utils/errorHandler'
import type { PlatformUser } from '@/types/user.types'
import type {
  BillingCycle,
  ModuleCode,
  PermissionGroup,
  SubscriptionPaymentStatus,
} from '@/types/permissionGroup.types'

interface UserPermissionsAndPricingModalProps {
  isOpen: boolean
  user: PlatformUser | null
  onClose: () => void
  onSaved?: (message: string) => void
  onOpenBillingModal?: (user: PlatformUser) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  VENDAS: '1. Vendas, PDV, Catálogo WhatsApp & Clientes',
  CATALOGO_ESTOQUE: '2. Controle de Estoque & Validades de Lotes',
  COMPRAS_SUPRIMENTOS: '3. Compras & Fornecedores',
  GESTAO_BI: '4. Gestão de Relatórios (BI), Equipe & Auditoria',
  TECNOLOGIA: '5. Integrações API Externas & Conectores',
}

export function UserPermissionsAndPricingModal({
  isOpen,
  user,
  onClose,
  onSaved,
  onOpenBillingModal,
}: UserPermissionsAndPricingModalProps) {
  const queryClient = useQueryClient()

  const { data: modules = DEFAULT_PERMISSION_MODULES } = useQuery({
    queryKey: ['permission-modules-catalog'],
    queryFn: () => permissionGroupService.listModules(),
    enabled: isOpen,
  })

  const { data: groups = DEFAULT_PERMISSION_GROUPS } = useQuery({
    queryKey: ['permission-groups-catalog'],
    queryFn: () => permissionGroupService.listPermissionGroups(),
    enabled: isOpen,
  })

  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [customPlanName, setCustomPlanName] = React.useState('')
  const [enforceOverStoreAdmin, setEnforceOverStoreAdmin] = React.useState(true)
  const [enabledModules, setEnabledModules] = React.useState<ModuleCode[]>([...ALL_MODULE_CODES])
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>('MONTHLY')
  const [discountAmount, setDiscountAmount] = React.useState<string>('0')
  const [manualAgreedPrice, setManualAgreedPrice] = React.useState<string>('')
  const [isManualPriceOverride, setIsManualPriceOverride] = React.useState(false)
  const [paymentStatus, setPaymentStatus] = React.useState<SubscriptionPaymentStatus>('ACTIVE')
  const [blockOnOverdue, setBlockOnOverdue] = React.useState(true)
  const [billingDay, setBillingDay] = React.useState<number>(10)
  const [nextDueDate, setNextDueDate] = React.useState<string>('')
  const [commercialNotes, setCommercialNotes] = React.useState('')
  const [lastToggledModule, setLastToggledModule] = React.useState<ModuleCode | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Inicializa o estado com o perfil atual do usuário quando abrir o modal
  React.useEffect(() => {
    if (!isOpen || !user) return
    setErrorMsg(null)
    setLastToggledModule(null)

    const prof = user.permissionProfile
    if (prof) {
      setSelectedGroupId(prof.permissionGroupId)
      setCustomPlanName(prof.customPlanName || prof.permissionGroup?.name || 'Plano Personalizado')
      setEnforceOverStoreAdmin(prof.enforceOverStoreAdmin !== false)
      setEnabledModules(
        prof.enabledModules && prof.enabledModules.length > 0
          ? [...prof.enabledModules]
          : [...ALL_MODULE_CODES]
      )
      setBillingCycle(prof.billingCycle || 'MONTHLY')
      setDiscountAmount(String(prof.discountAmount || 0))
      setManualAgreedPrice(String(prof.agreedMonthlyValue || 0))
      setIsManualPriceOverride(
        Math.abs(
          (prof.calculatedMonthlyValue || 0) -
            (prof.discountAmount || 0) -
            (prof.agreedMonthlyValue || 0)
        ) > 0.05
      )
      setPaymentStatus(prof.paymentStatus || 'ACTIVE')
      setBlockOnOverdue(Boolean(prof.blockOnOverdue))
      setBillingDay(prof.billingDay || 10)
      setNextDueDate(prof.nextDueDate || getDefaultNextDueDate(prof.billingDay || 10))
      setCommercialNotes(prof.commercialNotes || '')
    } else {
      const defaultGroup =
        groups.find((g) => g.code === 'PLAN_PRO_MANAGEMENT') || groups[0] || null
      setSelectedGroupId(defaultGroup?.id || null)
      setCustomPlanName(defaultGroup?.name || 'Gestão Completa Pro')
      setEnforceOverStoreAdmin(true)
      setEnabledModules(
        defaultGroup ? [...defaultGroup.enabledModules] : [...ALL_MODULE_CODES]
      )
      setBillingCycle('MONTHLY')
      setDiscountAmount('0')
      setManualAgreedPrice(String(defaultGroup?.baseMonthlyPrice || 199.9))
      setIsManualPriceOverride(false)
      setPaymentStatus('ACTIVE')
      setBlockOnOverdue(true)
      setBillingDay(10)
      setNextDueDate(getDefaultNextDueDate(10))
      setCommercialNotes('')
    }
  }, [isOpen, user, groups])

  // Calcula valor automático baseado no grupo selecionado + módulos adicionais (ou soma avulsa)
  const pricingSummary = React.useMemo(() => {
    const activeGroup = groups.find((g) => g.id === selectedGroupId) || null
    const modulesMap = new Map(modules.map((m) => [m.code, m]))

    let baseCalculated = 0
    if (activeGroup) {
      // Preço do pacote base + eventuais módulos extras adicionados além do grupo
      const extraModules = enabledModules.filter(
        (code) => !activeGroup.enabledModules.includes(code)
      )
      const extrasSum = extraModules.reduce(
        (acc, code) => acc + (modulesMap.get(code)?.monthlyPrice || 0),
        0
      )
      baseCalculated = activeGroup.baseMonthlyPrice + extrasSum
    } else {
      // Soma à la carte dos módulos marcados
      baseCalculated = enabledModules.reduce(
        (acc, code) => acc + (modulesMap.get(code)?.monthlyPrice || 0),
        0
      )
    }

    const numericDiscount = Math.max(0, Number(discountAmount) || 0)
    const autoNetPrice = Math.max(0, Number((baseCalculated - numericDiscount).toFixed(2)))
    const finalAgreedPrice = isManualPriceOverride
      ? Math.max(0, Number(manualAgreedPrice) || 0)
      : autoNetPrice

    return {
      activeGroup,
      baseCalculated: Number(baseCalculated.toFixed(2)),
      numericDiscount,
      autoNetPrice,
      finalAgreedPrice,
    }
  }, [groups, selectedGroupId, modules, enabledModules, discountAmount, isManualPriceOverride, manualAgreedPrice])

  // Motor de impacto cruzado entre telas
  const dependencyImpacts = React.useMemo(
    () => analyzeScreenDependencies(enabledModules),
    [enabledModules]
  )

  const handleSelectGroup = (group: PermissionGroup) => {
    setSelectedGroupId(group.id)
    setCustomPlanName(group.name)
    setEnabledModules([...group.enabledModules])
    setIsManualPriceOverride(false)
    setManualAgreedPrice(String(group.baseMonthlyPrice))
    setLastToggledModule(null)
  }

  const handleToggleModule = (code: ModuleCode) => {
    setLastToggledModule(code)
    setEnabledModules((prev) => {
      const exists = prev.includes(code)
      const next = exists ? prev.filter((c) => c !== code) : [...prev, code]

      // Verifica se ainda corresponde exatamente a algum grupo comercial
      const matchingGroup = groups.find(
        (g) =>
          g.enabledModules.length === next.length &&
          g.enabledModules.every((m) => next.includes(m))
      )
      if (matchingGroup) {
        setSelectedGroupId(matchingGroup.id)
        setCustomPlanName(matchingGroup.name)
      } else {
        setSelectedGroupId(null)
        if (!customPlanName.includes('Personalizado')) {
          setCustomPlanName(`${customPlanName.split(' (')[0]} (Personalizado)`)
        }
      }
      return next
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não selecionado.')

      // Coleta permissões revogadas dos módulos desmarcados
      const disabledMods = modules.filter((m) => !enabledModules.includes(m.code))
      const revokedPermissions = Array.from(
        new Set(disabledMods.flatMap((m) => m.permissions))
      )
      const grantedPermissions = Array.from(
        new Set(
          modules
            .filter((m) => enabledModules.includes(m.code))
            .flatMap((m) => m.permissions)
        )
      )

      return permissionGroupService.saveUserPermissionProfile({
        userId: user.id,
        storeId: user.stores[0]?.storeId || null,
        permissionGroupId: selectedGroupId,
        customPlanName: customPlanName.trim() || 'Plano Personalizado',
        enforceOverStoreAdmin,
        enabledModules,
        grantedPermissions,
        revokedPermissions,
        billingCycle,
        calculatedMonthlyValue: pricingSummary.baseCalculated,
        discountAmount: pricingSummary.numericDiscount,
        agreedMonthlyValue: pricingSummary.finalAgreedPrice,
        paymentStatus,
        blockOnOverdue,
        billingDay,
        nextDueDate: nextDueDate || null,
        commercialNotes: commercialNotes.trim() || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      onSaved?.(
        `Permissões em tela e contrato comercial de "${user?.fullName || user?.email}" atualizados com sucesso!`
      )
      onClose()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  if (!user) return null

  const groupedModules = Object.keys(CATEGORY_LABELS).map((catKey) => ({
    category: catKey,
    label: CATEGORY_LABELS[catKey],
    items: modules.filter((m) => m.category === catKey),
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Permissões de Tela, Pacote Comercial & Impactos — ${user.fullName || user.email}`}
      description="Atribua um Grupo de Perfil com valores comerciais ou ligue/desligue funcionalidades específicas (mesmo para usuários STORE_ADMIN)."
      maxWidth="5xl"
    >
      <div className="space-y-4 pt-1 max-h-[78vh] overflow-y-auto pr-1 custom-scrollbar">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
            {errorMsg}
          </div>
        )}

        {/* Top User & Store Context Bar */}
        <div className="p-3 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                {user.fullName || 'Usuário Sem Nome'} ({user.email})
              </span>
              {user.stores.map((st) => (
                <Badge key={st.storeId} variant="outline" className="text-[10px] px-2 py-0.5 bg-primary/5">
                  {st.storeName} • {st.role}
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Módulos habilitados: <strong className="text-foreground">{enabledModules.length} de {modules.length}</strong> telas operacionais
            </p>
          </div>

          <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-primary/30 bg-primary/5 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={enforceOverStoreAdmin}
              onChange={(e) => setEnforceOverStoreAdmin(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Restringir mesmo sendo STORE_ADMIN
              </div>
              <div className="text-[10px] text-muted-foreground">
                Garante que o dono da loja só acesse os módulos contratados
              </div>
            </div>
          </label>
        </div>

        {/* Section 1: Commercial Permission Groups (Plans with Pricing) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              1. Escolha um Grupo de Perfil Comercial (Pacotes Prontos para Venda)
            </label>
            <span className="text-[11px] text-muted-foreground">
              Clique em um pacote para preencher as telas e o valor sugerido
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {groups.map((grp) => {
              const isSelected = selectedGroupId === grp.id
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => handleSelectGroup(grp)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/25 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <Badge
                        variant={isSelected ? 'default' : 'outline'}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {grp.enabledModules.length} módulos
                      </Badge>
                      {grp.code === 'PLAN_WHATSAPP_ONLY' && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          WhatsApp
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-foreground leading-snug pt-0.5">
                      {grp.name}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {grp.description}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-border/60 flex items-baseline justify-between">
                    <span className="text-xs font-extrabold text-primary">
                      {formatCurrency(grp.baseMonthlyPrice)}
                    </span>
                    <span className="text-[9px] text-muted-foreground">/mês</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 2: Interactive Screen Toggles + Real-Time Cross-Screen Dependency Analyzer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (7 cols): Screen Modules Checkboxes */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                2. Funcionalidades e Telas Liberadas (Marque ou Desmarque)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEnabledModules([...ALL_MODULE_CODES])}
                  className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Marcar Todas
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => setEnabledModules(['MOD_CATALOG_WA'])}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Apenas Catálogo WhatsApp
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {groupedModules.map((grp) => (
                <div
                  key={grp.category}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className="px-3 py-1.5 bg-muted/50 border-b border-border text-[11px] font-bold text-foreground">
                    {grp.label}
                  </div>
                  <div className="divide-y divide-border/60">
                    {grp.items.map((mod) => {
                      const isChecked = enabledModules.includes(mod.code)
                      const isJustToggled = lastToggledModule === mod.code

                      return (
                        <label
                          key={mod.code}
                          className={`flex items-start justify-between gap-3 p-2.5 transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-card hover:bg-muted/20'
                              : 'bg-danger/5 hover:bg-danger/10'
                          } ${isJustToggled ? 'ring-1 ring-inset ring-primary/40' : ''}`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleModule(mod.code)}
                              className="mt-0.5 rounded border-input text-primary focus:ring-primary h-4 w-4 shrink-0"
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-xs font-bold ${
                                    isChecked
                                      ? 'text-foreground'
                                      : 'text-muted-foreground line-through'
                                  }`}
                                >
                                  {mod.name}
                                </span>
                                {mod.routes.map((rt) => (
                                  <span
                                    key={rt}
                                    className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60"
                                  >
                                    {rt}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {mod.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <Badge
                              variant={isChecked ? 'outline' : 'secondary'}
                              className="text-[10px] font-mono px-2 py-0.5"
                            >
                              {formatCurrency(mod.monthlyPrice)}/mês
                            </Badge>
                            <div className="text-[9px] mt-0.5 font-semibold">
                              {isChecked ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                                  <Unlock className="h-2.5 w-2.5" /> Liberado
                                </span>
                              ) : (
                                <span className="text-danger flex items-center justify-end gap-0.5">
                                  <Lock className="h-2.5 w-2.5" /> Bloqueado
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (5 cols): Cross-Screen Dependency Impact Analyzer */}
          <div className="lg:col-span-5 space-y-3">
            <div className="sticky top-0 space-y-3">
              <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Relação Entre Telas & Impactos ao Desmarcar
                  </span>
                  <Badge
                    variant={dependencyImpacts.length === 0 ? 'success' : 'outline'}
                    className="text-[10px]"
                  >
                    {dependencyImpacts.length === 0
                      ? '100% Integrado'
                      : `${dependencyImpacts.length} aviso(s)`}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ao desmarcar uma funcionalidade ao lado, veja exatamente <strong>o que para de funcionar ou muda de comportamento nas outras telas</strong> da plataforma:
                </p>

                {dependencyImpacts.length === 0 ? (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Todas as telas operacionais estão ativas!</div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        Nenhuma funcionalidade dependente sofrerá restrição ou perda de vínculo.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    {dependencyImpacts.map((imp) => {
                      const isCritical = imp.severity === 'CRITICAL'
                      const isWarning = imp.severity === 'WARNING'

                      return (
                        <div
                          key={imp.disabledModule}
                          className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                            isCritical
                              ? 'border-danger/50 bg-danger/10'
                              : isWarning
                                ? 'border-amber-500/40 bg-amber-500/10'
                                : 'border-blue-500/30 bg-blue-500/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              {isCritical ? (
                                <AlertOctagon className="h-4 w-4 text-danger shrink-0" />
                              ) : isWarning ? (
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                              ) : (
                                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                              )}
                              <span>{imp.title}</span>
                            </div>
                            <Badge
                              variant={isCritical ? 'destructive' : 'outline'}
                              className="text-[9px] shrink-0"
                            >
                              Desmarcado: {imp.disabledModuleName}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1 items-center text-[10px]">
                            <span className="text-muted-foreground font-semibold">
                              Telas relacionadas:
                            </span>
                            {imp.affectedScreens.map((sc) => (
                              <span
                                key={sc}
                                className="px-1.5 py-0.5 rounded bg-background/80 border border-border text-[9px] font-medium"
                              >
                                {sc}
                              </span>
                            ))}
                          </div>

                          <div className="space-y-1 pt-1 border-t border-border/50">
                            <div className="text-[10px] font-bold text-danger">
                              O que para de funcionar / muda:
                            </div>
                            <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-foreground/90">
                              {imp.whatStopsWorking.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </div>

                          {imp.whatStillWorks.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                O que continua funcionando normalmente:
                              </div>
                              <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-muted-foreground">
                                {imp.whatStillWorks.map((line, i) => (
                                  <li key={i}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {imp.suggestedQuickFix && (
                            <div className="pt-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleToggleModule(imp.suggestedQuickFix!.targetModule)
                                }
                                className="h-7 text-[10px] font-bold gap-1 bg-background"
                              >
                                <Zap className="h-3 w-3 text-primary" />
                                {imp.suggestedQuickFix.label}
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Section 3: Commercial Contract & Payment Setup */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    3. Valores Comerciais & Controle de Assinatura
                  </span>
                  <Badge className="text-[10px] bg-primary text-primary-foreground">
                    Proposta Comercial
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-foreground">
                      Nome Comercial do Plano / Perfil Contratado
                    </label>
                    <Input
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      placeholder="Ex: Catálogo de Venda Somente por WhatsApp"
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Valor Base Calculado (R$)
                    </label>
                    <Input
                      value={formatCurrency(pricingSummary.baseCalculated)}
                      disabled
                      className="h-8 text-xs font-mono bg-muted"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Desconto Comercial (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => {
                        setDiscountAmount(e.target.value)
                        setIsManualPriceOverride(false)
                      }}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-primary">
                      Valor Final Mensal Acordado (R$) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={
                        isManualPriceOverride
                          ? manualAgreedPrice
                          : String(pricingSummary.autoNetPrice)
                      }
                      onChange={(e) => {
                        setIsManualPriceOverride(true)
                        setManualAgreedPrice(e.target.value)
                      }}
                      className="h-8 text-xs font-bold font-mono border-primary bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Ciclo de Cobrança
                    </label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
                    >
                      <option value="MONTHLY">Mensal Recorrente</option>
                      <option value="ANNUAL">Anual (Com Desconto)</option>
                      <option value="FREE_TRIAL">Período de Testes (Trial)</option>
                      <option value="LIFETIME">Licença Vitalícia / Cortesia</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Status do Pagamento
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) =>
                        setPaymentStatus(e.target.value as SubscriptionPaymentStatus)
                      }
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
                    >
                      <option value="ACTIVE">🟢 Em Dia (Ativo)</option>
                      <option value="TRIAL">🔵 Em Teste Grátis (Trial)</option>
                      <option value="PENDING">🟡 Aguardando 1º Pagamento</option>
                      <option value="PAST_DUE">🟠 Pagamento em Atraso</option>
                      <option value="SUSPENDED">🔴 Suspenso por Inadimplência</option>
                      <option value="EXEMPT">⚪ Isento / Uso Interno</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Próximo Vencimento
                    </label>
                    <Input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Observações Comerciais / Acordo com Cliente
                    </label>
                    <Input
                      value={commercialNotes}
                      onChange={(e) => setCommercialNotes(e.target.value)}
                      placeholder="Ex: Vendido plano Catálogo WhatsApp + Controle de Estoque por R$ 99,90/mês via PIX..."
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={blockOnOverdue}
                    onChange={(e) => setBlockOnOverdue(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>
                    Bloquear acesso às telas automaticamente quando o status for{' '}
                    <strong>Suspenso por Inadimplência</strong>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border bg-surface sticky bottom-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenBillingModal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5"
                onClick={() => {
                  onClose()
                  onOpenBillingModal(user)
                }}
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                Ver Histórico de Pagamentos & Faturas
              </Button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Salvar Permissões & Valor ({formatCurrency(pricingSummary.finalAgreedPrice)}/mês)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function getDefaultNextDueDate(billingDay: number): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(28, billingDay || 10))
  return next.toISOString().slice(0, 10)
}
