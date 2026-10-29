import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  KeyRound,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { userService } from '@/services/userService'
import {
  GRANULAR_PERMISSION_GROUPS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_METADATA,
  resolveEmployeePermissions,
} from '@/constants/granularPermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/utils/currency'
import { parseApiError } from '@/utils/errorHandler'
import { cn } from '@/utils/cn'
import type { StoreCustomRole, StoreMember } from '@/types/user.types'
import type { UserRole } from '@/types/database.types'

export interface EmployeeRolePermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  storeName?: string
  member?: StoreMember | null
  onSuccess?: () => void
}

const ASSIGNABLE_ROLES: UserRole[] = [
  'STORE_ADMIN',
  'STOCK_APPROVER',
  'INVENTORY',
  'SELLER',
  'FINANCE',
  'VIEWER',
]

export function EmployeeRolePermissionsModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  member,
  onSuccess,
}: EmployeeRolePermissionsModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(member?.id)

  const [email, setEmail] = React.useState('')
  const [fullName, setFullName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [employeeRegistration, setEmployeeRegistration] = React.useState('')
  const [jobTitle, setJobTitle] = React.useState('')
  const [role, setRole] = React.useState<UserRole>('SELLER')
  const [customRoleId, setCustomRoleId] = React.useState<string>('')
  const [canApproveWriteoff, setCanApproveWriteoff] = React.useState(false)
  const [approvalPin, setApprovalPin] = React.useState('')
  const [maxWriteoffValue, setMaxWriteoffValue] = React.useState<string>('')
  const [grantedPermissions, setGrantedPermissions] = React.useState<string[]>([])
  const [revokedPermissions, setRevokedPermissions] = React.useState<string[]>([])
  const [isActive, setIsActive] = React.useState(true)
  const [activeGroupKey, setActiveGroupKey] = React.useState<string>('inventory')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const { data: customRoles = [] } = useQuery({
    queryKey: ['store-custom-roles', storeId],
    queryFn: () => userService.listStoreCustomRoles(storeId),
    enabled: Boolean(storeId) && isOpen,
  })

  React.useEffect(() => {
    if (!isOpen) return
    setErrorMsg(null)
    if (member) {
      setEmail(member.email || '')
      setFullName(member.fullName || '')
      setPhone(member.phone || '')
      setPassword('')
      setEmployeeRegistration(member.employeeRegistration || '')
      setJobTitle(member.jobTitle || '')
      setRole(member.role || 'SELLER')
      setCustomRoleId(member.customRoleId || '')
      setCanApproveWriteoff(
        Boolean(
          member.canApproveWriteoff ||
            member.role === 'STOCK_APPROVER' ||
            member.role === 'STORE_ADMIN'
        )
      )
      setApprovalPin(member.approvalPin || '')
      setMaxWriteoffValue(
        member.maxWriteoffValue !== null && member.maxWriteoffValue !== undefined
          ? String(member.maxWriteoffValue)
          : ''
      )
      setGrantedPermissions(member.grantedPermissions || [])
      setRevokedPermissions(member.revokedPermissions || [])
      setIsActive(member.isActive !== false)
    } else {
      setEmail('')
      setFullName('')
      setPhone('')
      setPassword('')
      setEmployeeRegistration(`MAT-${Math.floor(1000 + Math.random() * 9000)}`)
      setJobTitle('')
      setRole('SELLER')
      setCustomRoleId('')
      setCanApproveWriteoff(false)
      setApprovalPin('')
      setMaxWriteoffValue('')
      setGrantedPermissions([])
      setRevokedPermissions([])
      setIsActive(true)
    }
  }, [isOpen, member])

  const selectedCustomRole: StoreCustomRole | null = React.useMemo(
    () => customRoles.find((r) => r.id === customRoleId) || null,
    [customRoles, customRoleId]
  )

  const basePermissionsForCurrentRole = React.useMemo(() => {
    if (selectedCustomRole && selectedCustomRole.permissions.length > 0) {
      return new Set(selectedCustomRole.permissions)
    }
    return new Set(ROLE_DEFAULT_PERMISSIONS[role] || [])
  }, [role, selectedCustomRole])

  const effectivePermissions = React.useMemo(
    () =>
      new Set(
        resolveEmployeePermissions({
          role,
          customRolePermissions: selectedCustomRole?.permissions,
          grantedPermissions,
          revokedPermissions,
          canApproveWriteoff: Boolean(
            canApproveWriteoff || selectedCustomRole?.canApproveWriteoff
          ),
        }).effectivePermissions
      ),
    [role, selectedCustomRole, grantedPermissions, revokedPermissions, canApproveWriteoff]
  )

  const handleSelectRole = (newRole: UserRole) => {
    setRole(newRole)
    if (newRole === 'STOCK_APPROVER' || newRole === 'STORE_ADMIN') {
      setCanApproveWriteoff(true)
      setRevokedPermissions((prev) => prev.filter((p) => p !== 'inventory.approve_writeoff'))
    }
  }

  const handleToggleApprover = (checked: boolean) => {
    setCanApproveWriteoff(checked)
    if (checked) {
      setRevokedPermissions((prev) => prev.filter((p) => p !== 'inventory.approve_writeoff'))
      if (!basePermissionsForCurrentRole.has('inventory.approve_writeoff')) {
        setGrantedPermissions((prev) =>
          prev.includes('inventory.approve_writeoff')
            ? prev
            : [...prev, 'inventory.approve_writeoff']
        )
      }
    } else {
      setGrantedPermissions((prev) => prev.filter((p) => p !== 'inventory.approve_writeoff'))
      if (basePermissionsForCurrentRole.has('inventory.approve_writeoff')) {
        setRevokedPermissions((prev) =>
          prev.includes('inventory.approve_writeoff')
            ? prev
            : [...prev, 'inventory.approve_writeoff']
        )
      }
    }
  }

  const handleTogglePermission = (permCode: string) => {
    if (permCode === 'inventory.approve_writeoff') {
      handleToggleApprover(!effectivePermissions.has('inventory.approve_writeoff'))
      return
    }

    const isCurrentlyEnabled = effectivePermissions.has(permCode)
    const isInBase = basePermissionsForCurrentRole.has(permCode)

    if (isCurrentlyEnabled) {
      // Desativando a permissão
      setGrantedPermissions((prev) => prev.filter((p) => p !== permCode))
      if (isInBase) {
        setRevokedPermissions((prev) =>
          prev.includes(permCode) ? prev : [...prev, permCode]
        )
      }
    } else {
      // Ativando a permissão
      setRevokedPermissions((prev) => prev.filter((p) => p !== permCode))
      if (!isInBase) {
        setGrantedPermissions((prev) =>
          prev.includes(permCode) ? prev : [...prev, permCode]
        )
      }
    }
  }

  const handleToggleEntireGroup = (groupKey: string, enableAll: boolean) => {
    const group = GRANULAR_PERMISSION_GROUPS.find((g) => g.id === groupKey)
    if (!group) return
    for (const p of group.permissions) {
      const hasIt = effectivePermissions.has(p.code)
      if (enableAll && !hasIt) {
        handleTogglePermission(p.code)
      } else if (!enableAll && hasIt) {
        handleTogglePermission(p.code)
      }
    }
  }

  const handleResetToRoleDefault = () => {
    setGrantedPermissions([])
    setRevokedPermissions([])
    setCanApproveWriteoff(role === 'STOCK_APPROVER' || role === 'STORE_ADMIN')
    toast.info('Permissões restauradas para o padrão do papel selecionado.')
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error('Informe o e-mail do funcionário.')
      return userService.upsertStoreEmployee(storeId, {
        email: email.trim(),
        fullName: fullName.trim() || email.split('@')[0],
        phone: phone.trim() || undefined,
        password: password.trim() || undefined,
        role,
        employeeRegistration: employeeRegistration.trim() || null,
        jobTitle: jobTitle.trim() || null,
        customRoleId: customRoleId || null,
        canApproveWriteoff: Boolean(
          canApproveWriteoff || effectivePermissions.has('inventory.approve_writeoff')
        ),
        approvalPin: approvalPin.trim() || null,
        maxWriteoffValue:
          maxWriteoffValue.trim() !== '' ? parseFloat(maxWriteoffValue) : null,
        grantedPermissions,
        revokedPermissions,
        isActive,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
      window.dispatchEvent(new CustomEvent('olivelas:employee-permissions-updated'))
      toast.success(
        isEditing
          ? 'Cadastro, papel e permissões granulares do funcionário atualizados!'
          : 'Funcionário cadastrado com sucesso na equipe da loja!'
      )
      onSuccess?.()
      onClose()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const activeGroup =
    GRANULAR_PERMISSION_GROUPS.find((g) => g.id === activeGroupKey) ||
    GRANULAR_PERMISSION_GROUPS[0]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? `Gerenciar Funcionário & Permissões Granulares`
          : `Cadastrar Funcionário da Loja & Definir Papéis`
      }
      description={
        storeName
          ? `Unidade: ${storeName} — Configure o cargo, alçada de aprovação de baixa de estoque e permissões por recurso.`
          : 'Configure os dados do colaborador, papel operacional, aprovação de baixa de estoque e permissões granulares.'
      }
      maxWidth="4xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
        className="space-y-4 pt-1 text-xs"
      >
        {errorMsg && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Dados de Identificação do Funcionário */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              1. Identificação do Funcionário
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-xs font-semibold text-foreground">
                Acesso Ativo na Loja
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Nome Completo *
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Fernanda Costa"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                E-mail de Acesso *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isEditing}
                placeholder="funcionario@loja.com.br"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                {isEditing ? 'Nova Senha (deixe em branco p/ manter)' : 'Senha Inicial *'}
              </label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? '••••••••' : 'Ex: Mudar@123'}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Matrícula Interna
              </label>
              <Input
                value={employeeRegistration}
                onChange={(e) => setEmployeeRegistration(e.target.value)}
                placeholder="Ex: MAT-2045"
                className="h-9 text-xs font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Cargo / Função na Loja
              </label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Ex: Supervisor de Estoque / Aprovador"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Telefone / WhatsApp
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </section>

        {/* 2. Papel Principal e Credencial de Aprovador de Baixa de Estoque */}
        <section className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
              <Shield className="h-3.5 w-3.5 text-primary" />
              2. Papel do Funcionário & Aprovador de Baixa de Estoque
            </div>

            {customRoles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Papel Customizado:</span>
                <select
                  value={customRoleId}
                  onChange={(e) => {
                    const id = e.target.value
                    setCustomRoleId(id)
                    const cr = customRoles.find((r) => r.id === id)
                    if (cr) {
                      setRole(cr.baseRole)
                      setCanApproveWriteoff(cr.canApproveWriteoff)
                      if (cr.maxWriteoffValue !== null) {
                        setMaxWriteoffValue(String(cr.maxWriteoffValue))
                      }
                    }
                  }}
                  className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs"
                >
                  <option value="">Usar Papel Padrão do Sistema</option>
                  {customRoles.map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.name} ({ROLE_METADATA[cr.baseRole]?.label})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cards de Seleção de Papel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ASSIGNABLE_ROLES.map((rKey) => {
              const meta = ROLE_METADATA[rKey]
              const isSelected = role === rKey
              return (
                <button
                  key={rKey}
                  type="button"
                  onClick={() => handleSelectRole(rKey)}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border bg-surface hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'text-[11px] font-bold px-2 py-0.5 rounded-md border',
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>
                    {isSelected && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {meta.description}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Destaque Exclusivo: Credencial de Aprovador de Baixa de Estoque */}
          <div
            className={cn(
              'p-3.5 rounded-xl border transition-all space-y-3',
              canApproveWriteoff || effectivePermissions.has('inventory.approve_writeoff')
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-border bg-muted/30'
            )}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>Autorizador Oficial de Baixa de Estoque (Stock Approver)</span>
                    {(canApproveWriteoff ||
                      effectivePermissions.has('inventory.approve_writeoff')) && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500 text-white">
                        Habilitado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Somente funcionários com esta credencial ativa podem autorizar baixas de estoque (perdas, avarias, vencimento e fila de solicitações).
                  </p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-background cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    canApproveWriteoff ||
                    effectivePermissions.has('inventory.approve_writeoff')
                  }
                  onChange={(e) => handleToggleApprover(e.target.checked)}
                  className="rounded border-amber-500 text-amber-500"
                />
                <span className="text-xs font-bold text-foreground">
                  Pode Aprovar Baixa de Estoque
                </span>
              </label>
            </div>

            {(canApproveWriteoff ||
              effectivePermissions.has('inventory.approve_writeoff')) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-500/20">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-amber-500" />
                    PIN de Autorização de Baixa (Opcional)
                  </label>
                  <Input
                    type="text"
                    maxLength={12}
                    value={approvalPin}
                    onChange={(e) => setApprovalPin(e.target.value)}
                    placeholder="Ex: 4820 (exigido no balcão ao aprovar baixa)"
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3 text-amber-500" />
                    Alçada Máxima por Baixa em R$ (Deixe vazio p/ ilimitado)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={maxWriteoffValue}
                    onChange={(e) => setMaxWriteoffValue(e.target.value)}
                    placeholder="Ex: 1500.00"
                    className="h-8 text-xs font-mono bg-background"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. Matriz Granular de Permissões por Recurso */}
        <section className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                3. Permissões Granulares por Recurso do Sistema ({effectivePermissions.size} ativas)
              </div>
              <p className="text-[11px] text-muted-foreground">
                Personalize exatamente o que este funcionário pode visualizar, criar, editar, excluir ou aprovar em cada área.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={handleResetToRoleDefault}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restaurar Padrão do Papel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border border-border rounded-xl overflow-hidden bg-surface">
            {/* Sidebar de Recursos */}
            <div className="md:col-span-4 bg-muted/30 border-b md:border-b-0 md:border-r border-border p-2 space-y-1">
              {GRANULAR_PERMISSION_GROUPS.map((grp) => {
                const enabledCount = grp.permissions.filter((p) =>
                  effectivePermissions.has(p.code)
                ).length
                const isSelected = grp.id === activeGroup.id
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setActiveGroupKey(grp.id)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <span className="truncate text-xs">{grp.title}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded',
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {enabledCount}/{grp.permissions.length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Lista de Permissões do Recurso Selecionado */}
            <div className="md:col-span-8 p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">{activeGroup.title}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {activeGroup.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => handleToggleEntireGroup(activeGroup.id, true)}
                  >
                    Marcar Tudo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => handleToggleEntireGroup(activeGroup.id, false)}
                  >
                    Desmarcar Tudo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                {activeGroup.permissions.map((perm) => {
                  const isChecked = effectivePermissions.has(perm.code)
                  const isGrantedOverride = grantedPermissions.includes(perm.code)
                  const isRevokedOverride = revokedPermissions.includes(perm.code)
                  return (
                    <label
                      key={perm.code}
                      className={cn(
                        'p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5',
                        isChecked
                          ? perm.highlight
                            ? 'border-amber-500/40 bg-amber-500/10'
                            : 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background opacity-75 hover:opacity-100'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(perm.code)}
                        className="mt-0.5 rounded border-input"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {perm.name}
                          </span>
                          {perm.highlight && (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                          {perm.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {perm.code}
                          </span>
                          {isGrantedOverride && (
                            <span className="text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                              +Extra
                            </span>
                          )}
                          {isRevokedOverride && (
                            <span className="text-[9px] px-1 rounded bg-danger/15 text-danger font-semibold">
                              -Bloqueado
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
          <div className="text-[11px] text-muted-foreground">
            {grantedPermissions.length > 0 || revokedPermissions.length > 0 ? (
              <span>
                Overrides individuais: <b className="text-emerald-600">+{grantedPermissions.length} concedida(s)</b> ·{' '}
                <b className="text-danger">-{revokedPermissions.length} revogada(s)</b>
              </span>
            ) : (
              <span>Seguindo permissões padrão do papel {ROLE_METADATA[role]?.label}</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-10 font-semibold"
              isLoading={saveMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {isEditing ? 'Salvar Alterações do Funcionário' : 'Cadastrar Funcionário'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
