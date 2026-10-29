import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/hooks/useTenant'
import { storeService } from '@/services/storeService'
import { userService } from '@/services/userService'
import { permissionGroupService } from '@/services/permissionGroupService'
import {
  GRANULAR_PERMISSION_GROUPS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_METADATA,
  resolveEmployeePermissions,
} from '@/constants/granularPermissions'
import {
  DEFAULT_PIN_REQUIREMENTS,
  PIN_PRESET_POLICIES,
  evaluatePinRequirements,
  generateCompliantPin,
  normalizePinRequirements,
} from '@/utils/pinValidator'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/dates'
import { cn } from '@/utils/cn'
import type { Store } from '@/types/store.types'
import type {
  EmployeePinRequirements,
  StoreCustomRole,
  StoreMember,
} from '@/types/user.types'
import type { UserRole } from '@/types/database.types'
import type { StoreEmployeeLicenseSummary } from '@/types/permissionGroup.types'

const ASSIGNABLE_ROLES: UserRole[] = [
  'STORE_ADMIN',
  'STOCK_APPROVER',
  'INVENTORY',
  'SELLER',
  'FINANCE',
  'VIEWER',
]

export const StoreEmployeeEditPage: React.FC = () => {
  const { storeId: routeStoreId, employeeId } = useParams<{
    storeId?: string
    employeeId?: string
  }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { storeId: tenantStoreId } = useTenant()

  const isGlobalAdminRoute = location.pathname.startsWith('/global-admin')
  const isCreateMode = !employeeId || employeeId === 'new'

  const [resolvedStoreId, setResolvedStoreId] = useState<string>(
    routeStoreId || (tenantStoreId !== 'all' ? tenantStoreId : '') || ''
  )
  const effectiveStoreId =
    routeStoreId ||
    resolvedStoreId ||
    (tenantStoreId !== 'all' ? tenantStoreId : '') ||
    ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [store, setStore] = useState<Store | null>(null)
  const [licenseSummary, setLicenseSummary] =
    useState<StoreEmployeeLicenseSummary | null>(null)
  const [customRoles, setCustomRoles] = useState<StoreCustomRole[]>([])
  const [member, setMember] = useState<StoreMember | null>(null)

  // Employee Form Fields
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [employeeRegistration, setEmployeeRegistration] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [role, setRole] = useState<UserRole>('SELLER')
  const [customRoleId, setCustomRoleId] = useState<string>('')
  const [canApproveWriteoff, setCanApproveWriteoff] = useState(false)
  const [approvalPin, setApprovalPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [requirePinReset, setRequirePinReset] = useState(false)
  const [pinRequirements, setPinRequirements] =
    useState<EmployeePinRequirements>(DEFAULT_PIN_REQUIREMENTS)
  const [maxWriteoffValue, setMaxWriteoffValue] = useState<string>('')
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>([])
  const [revokedPermissions, setRevokedPermissions] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [activeGroupKey, setActiveGroupKey] = useState<string>(
    GRANULAR_PERMISSION_GROUPS[0]?.id || 'inventory'
  )

  const backUrl = isGlobalAdminRoute
    ? `/global-admin/stores/${effectiveStoreId}/edit`
    : '/team'

  const populateMemberState = useCallback((found: StoreMember) => {
    setMember(found)
    setEmail(found.email || '')
    setFullName(found.fullName || '')
    setPhone(found.phone || '')
    setEmployeeRegistration(found.employeeRegistration || '')
    setJobTitle(found.jobTitle || '')
    setRole(found.role || 'SELLER')
    setCustomRoleId(found.customRoleId || '')
    setCanApproveWriteoff(
      Boolean(
        found.canApproveWriteoff ||
          found.role === 'STOCK_APPROVER' ||
          found.role === 'STORE_ADMIN'
      )
    )
    setApprovalPin(found.approvalPin || '')
    setRequirePinReset(Boolean(found.requirePinReset))
    setPinRequirements(normalizePinRequirements(found.pinRequirements))
    setMaxWriteoffValue(
      found.maxWriteoffValue !== null && found.maxWriteoffValue !== undefined
        ? String(found.maxWriteoffValue)
        : ''
    )
    setGrantedPermissions(found.grantedPermissions || [])
    setRevokedPermissions(found.revokedPermissions || [])
    setIsActive(found.isActive !== false)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      let targetStoreId =
        routeStoreId || (tenantStoreId !== 'all' ? tenantStoreId : '') || ''
      let foundMember: StoreMember | null = null

      if (!isCreateMode && employeeId) {
        const lookup = await userService.findStoreMemberByIdOrUserId(
          employeeId,
          targetStoreId || undefined
        )
        if (lookup) {
          targetStoreId = lookup.storeId
          foundMember = lookup.member
          setResolvedStoreId(lookup.storeId)
        }
      }

      if (!targetStoreId) {
        setLoading(false)
        return
      }

      const [storeObj, rolesList, membersList, licSummary] = await Promise.all([
        storeService.getStoreById(targetStoreId),
        userService.listStoreCustomRoles(targetStoreId),
        userService.listStoreMembers(targetStoreId),
        permissionGroupService.getStoreEmployeeLicenseSummary(targetStoreId),
      ])

      setStore(storeObj)
      setCustomRoles(rolesList)
      setLicenseSummary(licSummary)

      if (!isCreateMode && employeeId) {
        const found =
          membersList.find(
            (m) => m.userId === employeeId || m.id === employeeId
          ) || foundMember

        if (!found) {
          toast.error('Funcionário não encontrado nesta loja.')
          navigate(backUrl)
          return
        }
        populateMemberState(found)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar dados do funcionário.')
    } finally {
      setLoading(false)
    }
  }, [
    backUrl,
    employeeId,
    isCreateMode,
    navigate,
    populateMemberState,
    routeStoreId,
    tenantStoreId,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedCustomRole = useMemo(
    () => customRoles.find((r) => r.id === customRoleId) || null,
    [customRoles, customRoleId]
  )

  const basePermissions = useMemo(() => {
    if (selectedCustomRole) {
      return selectedCustomRole.permissions
    }
    return ROLE_DEFAULT_PERMISSIONS[role] || []
  }, [role, selectedCustomRole])

  const effectivePermissions = useMemo(
    () =>
      resolveEmployeePermissions({
        role,
        customRolePermissions: selectedCustomRole?.permissions,
        grantedPermissions,
        revokedPermissions,
        canApproveWriteoff,
      }).effectivePermissions,
    [
      role,
      selectedCustomRole,
      grantedPermissions,
      revokedPermissions,
      canApproveWriteoff,
    ]
  )

  const pinEvaluation = useMemo(
    () => evaluatePinRequirements(approvalPin, pinRequirements),
    [approvalPin, pinRequirements]
  )

  const updatePinReqField = <K extends keyof EmployeePinRequirements>(
    key: K,
    value: EmployeePinRequirements[K]
  ) => {
    setPinRequirements((prev) =>
      normalizePinRequirements({
        ...prev,
        [key]: value,
      })
    )
  }

  const handleGeneratePin = (forceResetOnNextLogin = false) => {
    const generated = generateCompliantPin(pinRequirements)
    setApprovalPin(generated)
    setShowPin(true)
    if (forceResetOnNextLogin) {
      setRequirePinReset(true)
      toast.success(
        `PIN temporário "${generated}" gerado! O funcionário deverá redefinir o PIN no próximo login.`
      )
    } else {
      toast.info(
        `PIN compatível "${generated}" gerado de acordo com os pré-requisitos selecionados.`
      )
    }
  }

  const togglePermission = (permCode: string) => {
    const isCurrentlyEffective = effectivePermissions.includes(permCode)
    const isInBase = basePermissions.includes(permCode)

    if (permCode === 'inventory.approve_writeoff') {
      setCanApproveWriteoff(!isCurrentlyEffective)
    }

    if (isCurrentlyEffective) {
      setGrantedPermissions((prev) => prev.filter((p) => p !== permCode))
      if (isInBase) {
        setRevokedPermissions((prev) =>
          prev.includes(permCode) ? prev : [...prev, permCode]
        )
      }
    } else {
      setRevokedPermissions((prev) => prev.filter((p) => p !== permCode))
      if (!isInBase) {
        setGrantedPermissions((prev) =>
          prev.includes(permCode) ? prev : [...prev, permCode]
        )
      }
    }
  }

  const handleResetToRoleDefaults = () => {
    setGrantedPermissions([])
    setRevokedPermissions([])
    setCanApproveWriteoff(role === 'STOCK_APPROVER' || role === 'STORE_ADMIN')
    toast.info('Permissões redefinidas para o padrão do papel selecionado.')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveStoreId) {
      toast.error('Loja não identificada.')
      return
    }
    if (!email.trim()) {
      toast.error('O e-mail do funcionário é obrigatório.')
      return
    }

    // Validate PIN against configured prerequisites if a PIN is entered and we are not forcing reset on next login
    if (approvalPin.trim() !== '' && !pinEvaluation.isValid) {
      const failedLabels = pinEvaluation.checks
        .filter((c) => !c.passed)
        .map((c) => c.label)
        .join(', ')
      toast.error(
        `O PIN informado não atende aos pré-requisitos configurados: ${failedLabels}`
      )
      return
    }

    setSaving(true)
    try {
      const saved = await userService.upsertStoreEmployee(effectiveStoreId, {
        email: email.trim().toLowerCase(),
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || null,
        password: password.trim() || undefined,
        role,
        employeeRegistration: employeeRegistration.trim() || null,
        jobTitle: jobTitle.trim() || null,
        customRoleId: customRoleId || null,
        canApproveWriteoff: Boolean(
          canApproveWriteoff ||
            role === 'STOCK_APPROVER' ||
            role === 'STORE_ADMIN' ||
            effectivePermissions.includes('inventory.approve_writeoff')
        ),
        approvalPin: approvalPin.trim() || null,
        requirePinReset,
        pinRequirements,
        maxWriteoffValue:
          maxWriteoffValue.trim() !== '' && !Number.isNaN(Number(maxWriteoffValue))
            ? Number(maxWriteoffValue)
            : null,
        grantedPermissions,
        revokedPermissions,
        isActive,
      })

      toast.success(
        isCreateMode
          ? `Funcionário "${saved.fullName || saved.email}" cadastrado com sucesso!`
          : `Configurações, PIN e permissões de "${saved.fullName || saved.email}" atualizados!`
      )

      if (isCreateMode && saved.userId) {
        navigate(
          isGlobalAdminRoute
            ? `/global-admin/stores/${effectiveStoreId}/employees/${saved.userId}`
            : `/team/${saved.userId}`
        )
      } else {
        await loadData()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar funcionário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={
          isCreateMode
            ? 'Novo Funcionário da Loja'
            : `Funcionário: ${fullName || email}`
        }
        badge={
          <div className="flex items-center gap-1.5">
            <Badge variant={canApproveWriteoff ? 'success' : 'secondary'}>
              {ROLE_METADATA[role]?.label || role}
            </Badge>
            {requirePinReset && (
              <Badge variant="warning">Reset de PIN no Próximo Login</Badge>
            )}
          </div>
        }
      />

      {/* Top Identification Banner with Store ID & Employee ID */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            {isCreateMode ? (
              <UserPlus className="h-6 w-6" />
            ) : (
              <UserCheck className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                Loja ID: {effectiveStoreId || 'Resolvendo...'}
              </span>
              {!isCreateMode && (
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  • Vínculo ID: {member?.id || employeeId}
                </span>
              )}
              {store && (
                <Badge variant={store.is_branch ? 'secondary' : 'default'}>
                  {store.is_branch
                    ? `Filial: ${store.name}`
                    : `Matriz: ${store.name}`}
                </Badge>
              )}
              {licenseSummary && (
                <Badge
                  variant={
                    licenseSummary.extraBillableEmployees > 0
                      ? 'warning'
                      : 'success'
                  }
                >
                  Licenças da Loja: {licenseSummary.activeEmployeesCount}/
                  {licenseSummary.freeEmployeesQuota} grátis
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Gerencie o papel operacional, alçada de aprovação de baixa de estoque, política de pré-requisitos do PIN, reset obrigatório no próximo login e permissões granulares.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar para {isGlobalAdminRoute ? 'Edição da Loja' : 'Equipe'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {isCreateMode ? 'Cadastrar Funcionário' : 'Salvar Funcionário'}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando perfil, política de PIN e matriz de permissões do funcionário...
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Col 1: Dados Pessoais e Credenciais */}
            <Card className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  1. Identificação do Funcionário
                </h2>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  Ativo
                </label>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nome Completo *
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silva"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    E-mail de Acesso *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@restaurante.com.br"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Matrícula / Código
                    </label>
                    <Input
                      value={employeeRegistration}
                      onChange={(e) => setEmployeeRegistration(e.target.value)}
                      placeholder="MAT-0042"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Cargo / Função
                    </label>
                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Chefe de Estoque"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Telefone / WhatsApp
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98888-7777"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      {isCreateMode ? 'Senha Inicial' : 'Redefinir Senha'}
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        isCreateMode ? 'Mín. 6 dígitos' : 'Em branco p/ manter'
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Resumo de Licença */}
              {licenseSummary && (
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs">
                  <div className="font-semibold text-foreground">
                    Status da Licença na Loja ({store?.name})
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Esta loja possui{' '}
                    <strong>
                      {licenseSummary.freeEmployeesQuota} licenças gratuitas
                    </strong>
                    . Atualmente há{' '}
                    <strong>
                      {licenseSummary.activeEmployeesCount} funcionários ativos
                    </strong>{' '}
                    (
                    {licenseSummary.extraBillableEmployees > 0
                      ? `${licenseSummary.extraBillableEmployees} licença(s) adicional(is) por ${formatCurrency(licenseSummary.extraEmployeeUnitPrice)}/mês`
                      : 'dentro da cota gratuita sem custo extra'}
                    ).
                  </p>
                </div>
              )}
            </Card>

            {/* Col 2: Papel Operacional & Aprovador de Baixa de Estoque */}
            <Card className="space-y-4 p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Shield className="h-5 w-5 text-primary" />
                  2. Papel Base & Credencial de Aprovador de Baixa de Estoque
                </h2>
                {customRoles.length > 0 && (
                  <select
                    value={customRoleId}
                    onChange={(e) => setCustomRoleId(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground"
                  >
                    <option value="">
                      Sem papel customizado (Usar papel padrão)
                    </option>
                    {customRoles.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        Papel Customizado: {cr.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cards de Seleção de Papel */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {ASSIGNABLE_ROLES.map((r) => {
                  const meta = ROLE_METADATA[r]
                  const selected = role === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r)
                        if (r === 'STOCK_APPROVER' || r === 'STORE_ADMIN') {
                          setCanApproveWriteoff(true)
                        }
                      }}
                      className={cn(
                        'flex flex-col items-start rounded-xl border p-3 text-left transition',
                        selected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border bg-background hover:bg-muted/50'
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {meta?.label || r}
                        </span>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <span className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {meta?.description || ''}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Painel Exclusivo: Aprovador de Baixa de Estoque */}
              <div
                className={cn(
                  'rounded-xl border p-4 transition',
                  canApproveWriteoff
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-border bg-muted/20'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        canApproveWriteoff
                          ? 'bg-emerald-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Autorizador Oficial de Baixa de Estoque (Perdas, Avarias e Vencimento)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Somente usuários com esta autorização ativa podem aprovar baixas definitivas de estoque na fila de aprovação.
                      </p>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-xs">
                    <input
                      type="checkbox"
                      checked={canApproveWriteoff}
                      onChange={(e) => setCanApproveWriteoff(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-emerald-600"
                    />
                    Habilitar Aprovação de Baixa
                  </label>
                </div>

                {canApproveWriteoff && (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-emerald-500/20 pt-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Alçada Máxima por Baixa (R$ - vazio = sem limite)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={maxWriteoffValue}
                        onChange={(e) => setMaxWriteoffValue(e.target.value)}
                        placeholder="Ex: 500.00 (ou livre)"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full rounded-lg border border-emerald-500/30 bg-background/80 p-2.5 text-xs text-muted-foreground">
                        Configure o <b className="text-foreground">PIN de Segurança</b>, os{' '}
                        <b className="text-foreground">Pré-requisitos do PIN</b> e o{' '}
                        <b className="text-foreground">Reset no Próximo Login</b> na seção dedicada abaixo.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Seção 3: Configuração de PIN de Segurança, Reset no Próximo Login & Pré-requisitos do PIN */}
          <Card className="space-y-5 p-6 border-primary/25">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Lock className="h-5 w-5 text-primary" />
                  3. Configuração de PIN, Reset no Próximo Login & Pré-requisitos de Segurança
                </h2>
                <p className="text-xs text-muted-foreground">
                  Defina as regras obrigatórias para o PIN deste funcionário (números, letras maiúsculas, minúsculas, símbolos, tamanho) e force a redefinição do PIN no próximo login.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {member?.pinUpdatedAt && (
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Última atualização do PIN: {formatDateTime(member.pinUpdatedAt)}
                  </Badge>
                )}
                <Badge variant={requirePinReset ? 'warning' : 'success'}>
                  {requirePinReset
                    ? 'Reset Obrigatório Pendente no Próximo Login'
                    : 'PIN Regularizado'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Coluna Esquerda: Reset no Próximo Login + Campo de PIN + Checklist Ao Vivo */}
              <div className="space-y-4 lg:col-span-5">
                {/* Bloco de Reset de PIN no Próximo Login */}
                <div
                  className={cn(
                    'rounded-xl border p-4 transition',
                    requirePinReset
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-border bg-muted/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <RefreshCw
                        className={cn(
                          'mt-0.5 h-5 w-5 shrink-0',
                          requirePinReset
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-muted-foreground'
                        )}
                      />
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          Exigir Reset de PIN no Próximo Login
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Quando ativado, assim que o funcionário entrar no sistema, será exibido um modal obrigatório para cadastrar um novo PIN que cumpra todos os pré-requisitos ao lado.
                        </p>
                      </div>
                    </div>

                    <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-xs">
                      <input
                        type="checkbox"
                        checked={requirePinReset}
                        onChange={(e) => setRequirePinReset(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-amber-600"
                      />
                      Forçar Reset
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleGeneratePin(true)}
                      className="h-7 text-[11px]"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                      Gerar PIN Temporário + Exigir Reset no Login
                    </Button>
                  </div>
                </div>

                {/* Campo do PIN Atual / Temporário */}
                <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      PIN de Autorização / Operação do Funcionário
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleGeneratePin(false)}
                      className="h-6 px-2 text-[11px] text-primary"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Gerar PIN Compatível
                    </Button>
                  </div>

                  <div className="relative">
                    <Input
                      type={showPin ? 'text' : 'password'}
                      maxLength={pinRequirements.maxLength}
                      value={approvalPin}
                      onChange={(e) => setApprovalPin(e.target.value)}
                      placeholder={`Digite um PIN (${pinRequirements.minLength} a ${pinRequirements.maxLength} caracteres)`}
                      className="pr-10 font-mono text-sm tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      {showPin ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Barra de Força + Checklist de Pré-requisitos em Tempo Real */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-muted-foreground">
                        Validação dos Pré-requisitos do PIN:
                      </span>
                      <span
                        className={cn(
                          'font-bold',
                          !approvalPin
                            ? 'text-muted-foreground'
                            : pinEvaluation.isValid
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {!approvalPin
                          ? 'Sem PIN definido'
                          : pinEvaluation.isValid
                            ? `PIN Válido (${pinEvaluation.strengthLabel})`
                            : 'PIN não atende aos pré-requisitos'}
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full transition-all duration-200',
                          !approvalPin
                            ? 'w-0'
                            : pinEvaluation.isValid
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                        )}
                        style={{
                          width: `${approvalPin ? pinEvaluation.strengthPercent : 0}%`,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {pinEvaluation.checks.map((chk) => (
                        <div
                          key={chk.key}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]',
                            !approvalPin
                              ? 'border-border/60 bg-muted/20 text-muted-foreground'
                              : chk.passed
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          )}
                        >
                          {!approvalPin ? (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : chk.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                          <span>{chk.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Configuração dos Pré-requisitos Obrigatórios do PIN */}
              <div className="space-y-4 lg:col-span-7">
                <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Pré-requisitos Obrigatórios para o PIN deste Funcionário
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Selecione quais elementos são exigidos no cadastro e no reset de PIN do colaborador:
                      </p>
                    </div>

                    {/* Presets rápidos de política de PIN */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Object.entries(PIN_PRESET_POLICIES).map(([key, preset]) => (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPinRequirements(
                              normalizePinRequirements(preset.requirements)
                            )
                            toast.info(`Política "${preset.label}" aplicada aos pré-requisitos do PIN.`)
                          }}
                          className="h-7 px-2 text-[11px]"
                          title={preset.description}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Tamanho Mínimo e Máximo */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-lg border border-border bg-background p-3">
                      <label className="text-xs font-semibold text-foreground">
                        Comprimento Mínimo do PIN (caracteres)
                      </label>
                      <Input
                        type="number"
                        min={4}
                        max={16}
                        value={pinRequirements.minLength}
                        onChange={(e) =>
                          updatePinReqField('minLength', Number(e.target.value) || 4)
                        }
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Mínimo recomendado: 6 caracteres
                      </span>
                    </div>

                    <div className="space-y-1 rounded-lg border border-border bg-background p-3">
                      <label className="text-xs font-semibold text-foreground">
                        Comprimento Máximo do PIN (caracteres)
                      </label>
                      <Input
                        type="number"
                        min={pinRequirements.minLength}
                        max={32}
                        value={pinRequirements.maxLength}
                        onChange={(e) =>
                          updatePinReqField('maxLength', Number(e.target.value) || 12)
                        }
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Até 32 caracteres alfanuméricos e símbolos
                      </span>
                    </div>
                  </div>

                  {/* Checkboxes de Regras de Complexidade do PIN */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <label
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition',
                        pinRequirements.requireNumbers
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">
                          Exigir Números (0-9)
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          O PIN deve conter pelo menos um algarismo numérico (ex: 4, 8, 9).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pinRequirements.requireNumbers}
                        onChange={(e) =>
                          updatePinReqField('requireNumbers', e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                      />
                    </label>

                    <label
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition',
                        pinRequirements.requireUppercase
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">
                          Exigir Letras Maiúsculas (A-Z)
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          O PIN deve conter pelo menos uma letra maiúscula (ex: A, K, Z).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pinRequirements.requireUppercase}
                        onChange={(e) =>
                          updatePinReqField('requireUppercase', e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                      />
                    </label>

                    <label
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition',
                        pinRequirements.requireLowercase
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">
                          Exigir Letras Minúsculas (a-z)
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          O PIN deve conter pelo menos uma letra minúscula (ex: b, m, x).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pinRequirements.requireLowercase}
                        onChange={(e) =>
                          updatePinReqField('requireLowercase', e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                      />
                    </label>

                    <label
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition',
                        pinRequirements.requireSymbols
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">
                          Exigir Símbolos Especiais (@#$%&*!?)
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          O PIN deve incluir pelo menos um caractere especial ou símbolo.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pinRequirements.requireSymbols}
                        onChange={(e) =>
                          updatePinReqField('requireSymbols', e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                      />
                    </label>

                    <label
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition sm:col-span-2',
                        pinRequirements.disallowSequential
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">
                          Bloquear Sequências Óbvias e Caracteres Repetidos (1234, 0000, AAAA)
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Impede que o funcionário escolha PINs triviais como 123456, 9876, 1111 ou AAAA no momento do reset.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pinRequirements.disallowSequential}
                        onChange={(e) =>
                          updatePinReqField('disallowSequential', e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Matriz Granular Completa de Permissões por Recurso */}
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <KeyRound className="h-5 w-5 text-primary" />
                  4. Matriz Granular de Permissões por Recurso (
                  {effectivePermissions.length} permissões ativas)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Personalize exatamente o que este funcionário pode visualizar, criar, editar, excluir ou aprovar dentro da loja.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {grantedPermissions.length > 0 && (
                  <Badge variant="success">
                    +{grantedPermissions.length} extras
                  </Badge>
                )}
                {revokedPermissions.length > 0 && (
                  <Badge variant="danger">
                    -{revokedPermissions.length} revogadas
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetToRoleDefaults}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Restaurar Padrão do Papel
                </Button>
              </div>
            </div>

            {/* Abas de Grupos de Recursos */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              {GRANULAR_PERMISSION_GROUPS.map((grp) => {
                const activeCount = grp.permissions.filter((p) =>
                  effectivePermissions.includes(p.code)
                ).length
                const isSelected = activeGroupKey === grp.id
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setActiveGroupKey(grp.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span>{grp.title}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px]',
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-background text-foreground'
                      )}
                    >
                      {activeCount}/{grp.permissions.length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Lista de Permissões do Grupo Ativo */}
            {GRANULAR_PERMISSION_GROUPS.filter(
              (g) => g.id === activeGroupKey
            ).map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {group.subtitle}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {group.permissions.map((perm) => {
                    const isChecked = effectivePermissions.includes(perm.code)
                    const isGrantedOverride = grantedPermissions.includes(
                      perm.code
                    )
                    const isRevokedOverride = revokedPermissions.includes(
                      perm.code
                    )

                    return (
                      <div
                        key={perm.code}
                        onClick={() => togglePermission(perm.code)}
                        className={cn(
                          'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 transition',
                          isChecked
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-background opacity-75 hover:opacity-100'
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">
                              {perm.name}
                            </span>
                            {perm.highlight && (
                              <Badge
                                variant={
                                  perm.highlight === 'emerald'
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                Destaque
                              </Badge>
                            )}
                            {isGrantedOverride && (
                              <Badge variant="success">Concedida</Badge>
                            )}
                            {isRevokedOverride && (
                              <Badge variant="danger">Bloqueada</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {perm.description}
                          </p>
                          <div className="font-mono text-[10px] text-muted-foreground/80">
                            {perm.code}
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-1 h-4 w-4 rounded border-border text-primary"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </Card>
        </form>
      )}
    </div>
  )
}

export default StoreEmployeeEditPage
