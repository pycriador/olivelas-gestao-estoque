import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { userService } from '@/services/userService'
import { permissionGroupService } from '@/services/permissionGroupService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import {
  isMemberStockApprover,
  ROLE_METADATA,
  resolveEmployeePermissions,
} from '@/constants/granularPermissions'
import { StoreCustomRolesModal } from '@/components/team/StoreCustomRolesModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Trash2,
  Power,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Lock,
} from 'lucide-react'
import { formatDateTime } from '@/utils/dates'
import { formatCurrency } from '@/utils/currency'
import { parseApiError } from '@/utils/errorHandler'
import { cn } from '@/utils/cn'
import type { StoreMember } from '@/types/user.types'

export function TeamPage() {
  const { storeId, storeName, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const {
    search,
    filters,
    setSearch,
    setFilter,
  } = useTablePagination({
    defaultPageSize: 50,
  })

  const roleFilter = filters.role || 'ALL'
  const statusFilter = filters.status || 'ALL'

  // Modal states
  const [isCustomRolesModalOpen, setIsCustomRolesModalOpen] = React.useState(false)
  const [removingMember, setRemovingMember] = React.useState<StoreMember | null>(null)
  const [togglingMember, setTogglingMember] = React.useState<StoreMember | null>(null)

  // Query members of this store
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['store-members', storeId],
    queryFn: () => userService.listStoreMembers(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: licenseSummary } = useQuery({
    queryKey: ['store-license-summary', storeId, members.length],
    queryFn: () => permissionGroupService.getStoreEmployeeLicenseSummary(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const { data: customRoles = [] } = useQuery({
    queryKey: ['store-custom-roles', storeId],
    queryFn: () => userService.listStoreCustomRoles(storeId),
    enabled: Boolean(hasActiveStore),
  })

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: ({
      id,
      isActive,
      canApproveWriteoff,
    }: {
      id: string
      isActive?: boolean
      canApproveWriteoff?: boolean
    }) => userService.updateStoreMemberRole(id, { isActive, canApproveWriteoff }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      window.dispatchEvent(new CustomEvent('olivelas:employee-permissions-updated'))
      toast.success('Cadastro do funcionário atualizado!')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => userService.removeStoreMember(id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      toast.success('Funcionário removido da equipe da loja.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => userService.sendPasswordReset(email),
    onSuccess: () => {
      toast.success('Link de redefinição de senha enviado por e-mail!')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })

  const handleOpenAdd = () => {
    navigate('/team/new')
  }

  const handleOpenEdit = (m: StoreMember) => {
    navigate(`/team/${m.id}`)
  }

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const q = search
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const normEmail = (m.email || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const normName = (m.fullName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const normReg = (m.employeeRegistration || '').toLowerCase()
    const normJob = (m.jobTitle || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    const matchSearch =
      !q ||
      normEmail.includes(q) ||
      normName.includes(q) ||
      normReg.includes(q) ||
      normJob.includes(q)

    const matchRole =
      roleFilter === 'ALL' ||
      roleFilter === 'all' ||
      (roleFilter === 'APPROVER_ONLY' && isMemberStockApprover(m)) ||
      m.role === roleFilter

    const matchStatus =
      statusFilter === 'ALL' ||
      statusFilter === 'all' ||
      (statusFilter === 'ACTIVE' && m.isActive) ||
      (statusFilter === 'INACTIVE' && !m.isActive)

    return matchSearch && matchRole && matchStatus
  })

  const totalApprovers = members.filter((m) => m.isActive && isMemberStockApprover(m)).length
  const totalActive = members.filter((m) => m.isActive).length

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Funcionários & Papéis da Loja">
        <Input
          placeholder="Buscar por nome, e-mail, matrícula ou cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-shrink-0">
        <div className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Total na Equipe
            </div>
            <div className="text-base font-extrabold text-foreground">
              {members.length} funcionários
            </div>
          </div>
          <Users className="h-5 w-5 text-primary opacity-80" />
        </div>

        <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
              Aprovadores de Baixa
            </div>
            <div className="text-base font-extrabold text-foreground">
              {totalApprovers} habilitados
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-amber-500" />
        </div>

        <div className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Papéis Customizados
            </div>
            <div className="text-base font-extrabold text-foreground">
              {customRoles.length} perfis
            </div>
          </div>
          <Shield className="h-5 w-5 text-primary opacity-80" />
        </div>

        <div className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground">
              Cota de Licenças Grátis
            </div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {licenseSummary
                ? `${licenseSummary.activeEmployeesCount} / ${licenseSummary.freeEmployeesQuota} grátis`
                : `${totalActive} ativos`}
            </div>
            {licenseSummary && licenseSummary.extraBillableEmployees > 0 && (
              <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                +{licenseSummary.extraBillableEmployees} extra ({formatCurrency(licenseSummary.extraEmployeesMonthlyCost)}/mês)
              </div>
            )}
          </div>
          <SlidersHorizontal className="h-5 w-5 text-emerald-500 opacity-80" />
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'funcionário' : 'funcionários'}
          </Badge>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            | Gestão de colaboradores, Aprovadores de Baixa de Estoque e permissões granulares de{' '}
            <b>{storeName}</b>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select
            value={roleFilter}
            onChange={(e) => setFilter('role', e.target.value)}
            aria-label="Filtrar por papel"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todos os Papéis</option>
            <option value="APPROVER_ONLY">★ Somente Aprovadores de Baixa</option>
            <option value="STORE_ADMIN">Administrador da Loja</option>
            <option value="STOCK_APPROVER">Aprovador de Baixa de Estoque</option>
            <option value="INVENTORY">Estoquista / Almoxarifado</option>
            <option value="SELLER">Vendedor / Operador de PDV</option>
            <option value="FINANCE">Gerente / Financeiro & Compras</option>
            <option value="VIEWER">Visualizador / Auditor</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="Filtrar por status"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Apenas Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomRolesModalOpen(true)}
            className="h-8 text-xs px-2.5 font-semibold"
          >
            <Shield className="h-3.5 w-3.5 mr-1 text-primary" /> Papéis da Loja
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="h-8 text-xs px-2.5 shadow-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar Funcionário
          </Button>
        </div>
      </div>

      {/* Members Table Viewport */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<Users className="h-10 w-10 text-primary" />}
                title="Nenhum funcionário encontrado"
                description="Cadastre os funcionários da loja e defina seus papéis (como Aprovador de Baixa de Estoque, Estoquista ou Vendedor PDV) com permissões granulares."
                actionLabel="Cadastrar Funcionário"
                onAction={handleOpenAdd}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Funcionário & Matrícula</th>
                    <th className="py-2.5 px-4">Papel & Cargo</th>
                    <th className="py-2.5 px-4">Autorização de Baixa de Estoque</th>
                    <th className="py-2.5 px-4">Permissões Granulares</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMembers.map((m) => {
                    const roleMeta = ROLE_METADATA[m.role] || ROLE_METADATA.VIEWER
                    const isApprover = isMemberStockApprover(m)
                    const customRole = customRoles.find((r) => r.id === m.customRoleId)
                    const resolvedPerms = resolveEmployeePermissions({
                      role: m.role,
                      customRolePermissions: customRole?.permissions,
                      grantedPermissions: m.grantedPermissions,
                      revokedPermissions: m.revokedPermissions,
                      canApproveWriteoff: isApprover,
                    })

                    return (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {m.fullName?.slice(0, 2) || m.email.slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{m.fullName || 'Funcionário'}</span>
                                {m.employeeRegistration && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {m.employeeRegistration}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {m.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                                  roleMeta.badgeClass
                                )}
                              >
                                {roleMeta.label}
                              </span>
                              {m.customRoleName && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                  {m.customRoleName}
                                </span>
                              )}
                            </div>
                            {m.jobTitle && (
                              <div className="text-[11px] text-muted-foreground">
                                Cargo: <b className="text-foreground">{m.jobTitle}</b>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          {isApprover ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Aprovador Autorizado
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>
                                  Alçada:{' '}
                                  <b>
                                    {m.maxWriteoffValue
                                      ? formatCurrency(m.maxWriteoffValue)
                                      : 'Ilimitada'}
                                  </b>
                                </span>
                                {m.approvalPin && (
                                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-mono">
                                    <Lock className="h-2.5 w-2.5" /> PIN Ativo
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Sem alçada de aprovação de baixa
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {resolvedPerms.effectivePermissions.length} recursos ativos
                            </Badge>
                            {(m.grantedPermissions?.length || 0) > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                                +{m.grantedPermissions?.length} extra
                              </span>
                            )}
                            {(m.revokedPermissions?.length || 0) > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/15 text-danger font-semibold">
                                -{m.revokedPermissions?.length} bloq.
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Vínculo: {formatDateTime(m.createdAt)}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-center">
                          <Badge
                            variant={m.isActive ? 'success' : 'destructive'}
                            className="text-[10px] px-2 py-0.5"
                          >
                            {m.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <DropdownMenu
                            triggerLabel="Ações Rápidas"
                            items={[
                              {
                                key: 'edit-role-perms',
                                label: 'Abrir Tela Completa (Papel & Permissões)',
                                icon: <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />,
                                onSelect: () => handleOpenEdit(m),
                              },
                              {
                                key: 'reset-password',
                                label: 'Enviar Redefinição de Senha',
                                icon: <KeyRound className="h-3.5 w-3.5 text-amber-500" />,
                                onSelect: () => resetPasswordMutation.mutate(m.email),
                              },
                              {
                                key: 'toggle-status',
                                label: m.isActive ? 'Desativar Acesso' : 'Ativar Acesso',
                                icon: <Power className="h-3.5 w-3.5" />,
                                onSelect: () => setTogglingMember(m),
                              },
                              {
                                key: 'remove-member',
                                label: 'Remover Funcionário da Loja',
                                icon: <Trash2 className="h-3.5 w-3.5" />,
                                variant: 'danger',
                                onSelect: () => setRemovingMember(m),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </ResponsiveTable>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Papéis Customizados da Loja */}
      <StoreCustomRolesModal
        isOpen={isCustomRolesModalOpen}
        onClose={() => setIsCustomRolesModalOpen(false)}
        storeId={storeId}
        storeName={storeName}
      />

      {/* Confirm Remove Member Modal */}
      <ConfirmModal
        isOpen={Boolean(removingMember)}
        onClose={() => setRemovingMember(null)}
        onConfirm={() => {
          if (removingMember) {
            removeMemberMutation.mutate(removingMember.id)
            setRemovingMember(null)
          }
        }}
        title="Remover Funcionário da Loja"
        description={`Tem certeza que deseja desvincular o funcionário "${removingMember?.fullName || removingMember?.email}" desta loja? Ele perderá o acesso imediatamente.`}
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        variant="danger"
        isLoading={removeMemberMutation.isPending}
      />

      {/* Confirm Toggle Member Status Modal */}
      <ConfirmModal
        isOpen={Boolean(togglingMember)}
        onClose={() => setTogglingMember(null)}
        onConfirm={() => {
          if (togglingMember) {
            updateRoleMutation.mutate({
              id: togglingMember.id,
              isActive: !togglingMember.isActive,
            })
            setTogglingMember(null)
          }
        }}
        title={
          togglingMember?.isActive
            ? 'Desativar Acesso do Funcionário'
            : 'Ativar Acesso do Funcionário'
        }
        description={
          togglingMember?.isActive
            ? `Deseja suspender temporariamente o acesso de "${togglingMember?.fullName || togglingMember?.email}" à loja?`
            : `Deseja reativar o acesso de "${togglingMember?.fullName || togglingMember?.email}" para operar na loja?`
        }
        confirmText={togglingMember?.isActive ? 'Sim, Desativar' : 'Sim, Ativar'}
        cancelText="Cancelar"
        variant={togglingMember?.isActive ? 'warning' : 'primary'}
        isLoading={updateRoleMutation.isPending}
      />
    </div>
  )
}
