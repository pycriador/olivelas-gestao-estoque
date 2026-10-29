import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  Check,
  GitBranch,
  KeyRound,
  Lock,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
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
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type { Store } from '@/types/store.types'
import type { StoreCustomRole, StoreMember } from '@/types/user.types'
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
  const effectiveStoreId = routeStoreId || tenantStoreId || ''
  const isCreateMode = !employeeId || employeeId === 'new'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [store, setStore] = useState<Store | null>(null)
  const [licenseSummary, setLicenseSummary] = useState<StoreEmployeeLicenseSummary | null>(null)
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

  const loadData = useCallback(async () => {
    if (!effectiveStoreId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [storeObj, rolesList, membersList, licSummary] = await Promise.all([
        storeService.getStoreById(effectiveStoreId),
        userService.listStoreCustomRoles(effectiveStoreId),
        userService.listStoreMembers(effectiveStoreId),
        permissionGroupService.getStoreEmployeeLicenseSummary(effectiveStoreId),
      ])

      setStore(storeObj)
      setCustomRoles(rolesList)
      setLicenseSummary(licSummary)

      if (!isCreateMode && employeeId) {
        const found = membersList.find(
          (m) => m.userId === employeeId || m.id === employeeId
        )
        if (!found) {
          toast.error('Funcionário não encontrado nesta loja.')
          navigate(backUrl)
          return
        }
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
        setMaxWriteoffValue(
          found.maxWriteoffValue !== null && found.maxWriteoffValue !== undefined
            ? String(found.maxWriteoffValue)
            : ''
        )
        setGrantedPermissions(found.grantedPermissions || [])
        setRevokedPermissions(found.revokedPermissions || [])
        setIsActive(found.isActive !== false)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar dados do funcionário.')
    } finally {
      setLoading(false)
    }
  }, [backUrl, effectiveStoreId, employeeId, isCreateMode, navigate])

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

  const togglePermission = (permCode: string) => {
    const isCurrentlyEffective = effectivePermissions.includes(permCode)
    const isInBase = basePermissions.includes(permCode)

    if (permCode === 'inventory.approve_writeoff') {
      setCanApproveWriteoff(!isCurrentlyEffective)
    }

    if (isCurrentlyEffective) {
      // Turning OFF
      setGrantedPermissions((prev) => prev.filter((p) => p !== permCode))
      if (isInBase) {
        setRevokedPermissions((prev) =>
          prev.includes(permCode) ? prev : [...prev, permCode]
        )
      }
    } else {
      // Turning ON
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
          : `Permissões e dados de "${saved.fullName || saved.email}" atualizados!`
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
          <Badge variant={canApproveWriteoff ? 'success' : 'secondary'}>
            {ROLE_METADATA[role]?.label || role}
          </Badge>
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
                Loja ID: {effectiveStoreId}
              </span>
              {!isCreateMode && (
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  • Funcionário ID: {member?.userId || employeeId}
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
              Funcionários operacionais não pagam plano individual. Gerencie aqui o papel, alçada de aprovação de baixa de estoque e permissões granulares em todas as áreas do sistema.
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
          Carregando perfil e matriz de permissões do funcionário...
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
                      placeholder={isCreateMode ? 'Mín. 6 dígitos' : 'Em branco p/ manter'}
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
                    Esta loja possui <strong>{licenseSummary.freeEmployeesQuota} licenças gratuitas</strong>. Atualmente há{' '}
                    <strong>{licenseSummary.activeEmployeesCount} funcionários ativos</strong>{' '}
                    ({licenseSummary.extraBillableEmployees > 0
                      ? `${licenseSummary.extraBillableEmployees} licença(s) adicional(is) por ${formatCurrency(licenseSummary.extraEmployeeUnitPrice)}/mês`
                      : 'dentro da cota gratuita sem custo extra'}).
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
                    <option value="">Sem papel customizado (Usar papel padrão)</option>
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
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        PIN de Confirmação de Baixa (Opcional)
                      </label>
                      <Input
                        type="password"
                        maxLength={8}
                        value={approvalPin}
                        onChange={(e) => setApprovalPin(e.target.value)}
                        placeholder="PIN numérico de 4 a 6 dígitos"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Matriz Granular Completa de Permissões por Recurso */}
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <KeyRound className="h-5 w-5 text-primary" />
                  3. Matriz Granular de Permissões por Recurso ({effectivePermissions.length}{' '}
                  permissões ativas)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Personalize exatamente o que este funcionário pode visualizar, criar, editar, excluir ou aprovar dentro da loja.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {grantedPermissions.length > 0 && (
                  <Badge variant="success">+{grantedPermissions.length} extras</Badge>
                )}
                {revokedPermissions.length > 0 && (
                  <Badge variant="danger">-{revokedPermissions.length} revogadas</Badge>
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
            {GRANULAR_PERMISSION_GROUPS.filter((g) => g.id === activeGroupKey).map(
              (group) => (
                <div key={group.id} className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {group.subtitle}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {group.permissions.map((perm) => {
                      const isChecked = effectivePermissions.includes(perm.code)
                      const isGrantedOverride = grantedPermissions.includes(perm.code)
                      const isRevokedOverride = revokedPermissions.includes(perm.code)

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
                                <Badge variant={perm.highlight === 'emerald' ? 'success' : 'warning'}>
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
              )
            )}
          </Card>
        </form>
      )}
    </div>
  )
}

export default StoreEmployeeEditPage
