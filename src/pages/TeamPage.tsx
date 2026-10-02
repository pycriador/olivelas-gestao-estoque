import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/userService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Badge } from '@/components/ui/badge'
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
  Edit2,
  Power,
  UserPlus,
  Send,
} from 'lucide-react'
import { formatDateTime } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import type { StoreMember } from '@/types/user.types'
import type { UserRole } from '@/types/database.types'

const ROLE_LABELS: Record<UserRole, { label: string; variant: 'default' | 'outline' | 'secondary' | 'success'; description: string }> = {
  STORE_ADMIN: {
    label: 'Administrador',
    variant: 'default',
    description: 'Acesso total a produtos, vendas, relatórios, configurações e equipe.',
  },
  FINANCE: {
    label: 'Gerente / Financeiro',
    variant: 'success',
    description: 'Acesso a vendas, compras, relatórios, contas e gestão de estoque.',
  },
  SELLER: {
    label: 'Vendedor / Caixa',
    variant: 'secondary',
    description: 'Acesso ao PDV (Frente de Caixa), pedidos e catálogo.',
  },
  INVENTORY: {
    label: 'Estoquista',
    variant: 'outline',
    description: 'Acesso a movimentações de estoque, lotes e validades.',
  },
  VIEWER: {
    label: 'Visualizador',
    variant: 'outline',
    description: 'Apenas leitura de informações.',
  },
  GLOBAL_ADMIN: {
    label: 'Global Admin',
    variant: 'default',
    description: 'Acesso administrativo irrestrito a todo o sistema.',
  },
};

export function TeamPage() {
  const { storeId, storeName, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

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
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [editingMember, setEditingMember] = React.useState<StoreMember | null>(null)
  const [removingMember, setRemovingMember] = React.useState<StoreMember | null>(null)
  const [togglingMember, setTogglingMember] = React.useState<StoreMember | null>(null)
  const [modalMode, setModalMode] = React.useState<'create' | 'invite'>('create')

  const [formData, setFormData] = React.useState({
    fullName: '',
    email: '',
    password: '',
    role: 'SELLER' as UserRole,
  })

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Query members of this store
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['store-members', storeId],
    queryFn: () => userService.listStoreMembers(storeId),
    enabled: Boolean(hasActiveStore),
  })

  // Mutations
  const addMemberMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      userService.inviteOrAddStoreMember(storeId, {
        email: data.email,
        fullName: data.fullName || undefined,
        role: data.role,
        password: data.password || undefined,
      }),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      setIsAddModalOpen(false)
      resetForm()
      setSuccessMessage(`Funcionário ${newMember.email} vinculado à loja com sucesso!`)
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role, isActive }: { id: string; role?: UserRole; isActive?: boolean }) =>
      userService.updateStoreMemberRole(id, { role, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      setEditingMember(null)
      setSuccessMessage('Papel do funcionário atualizado!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => userService.removeStoreMember(id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      setSuccessMessage('Membro removido da equipe.')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => userService.sendPasswordReset(email),
    onSuccess: () => {
      setSuccessMessage('Link de redefinição de senha enviado por e-mail!')
    },
    onError: (err) => setErrorMessage(parseApiError(err)),
  })

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'SELLER',
    })
    setEditingMember(null)
    setErrorMessage(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setModalMode('create')
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (m: StoreMember) => {
    setEditingMember(m)
    setFormData({
      fullName: m.fullName || '',
      email: m.email,
      password: '',
      role: m.role,
    })
    setErrorMessage(null)
    setIsAddModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email) return
    setErrorMessage(null)

    if (editingMember) {
      updateRoleMutation.mutate({
        id: editingMember.id,
        role: formData.role,
      })
      setIsAddModalOpen(false)
    } else {
      addMemberMutation.mutate(formData)
    }
  }

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const matchSearch =
      !search ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.fullName && m.fullName.toLowerCase().includes(search.toLowerCase()))
    const matchRole = roleFilter === 'ALL' || m.role === roleFilter
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && m.isActive) ||
      (statusFilter === 'INACTIVE' && !m.isActive)
    return matchSearch && matchRole && matchStatus
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Equipe da Loja">
        <Input
          placeholder="Buscar funcionário por nome, e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-2.5 rounded-lg bg-success/15 border border-success/30 flex items-center justify-between text-xs text-foreground animate-in fade-in flex-shrink-0">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-muted-foreground hover:text-foreground font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'membro' : 'membros'}
          </Badge>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            | Equipe e permissões de acesso da loja <b>{storeName}</b>
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
            <option value="STORE_ADMIN">Administrador</option>
            <option value="FINANCE">Gerente / Financeiro</option>
            <option value="SELLER">Vendedor / Caixa</option>
            <option value="INVENTORY">Estoquista</option>
            <option value="VIEWER">Visualizador</option>
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
            size="sm"
            onClick={handleOpenAdd}
            className="h-8 text-xs px-2.5 shadow-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Convidar / Novo Funcionário
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
                title="Nenhum membro encontrado"
                description="Convide os funcionários da sua loja para operar o PDV, estoque, compras ou financeiro com permissões isoladas."
                actionLabel="Convidar Funcionário"
                onAction={handleOpenAdd}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Funcionário</th>
                    <th className="py-2.5 px-4">Papel na Loja</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4">Data de Vínculo</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMembers.map((m) => {
                    const roleInfo = ROLE_LABELS[m.role] || {
                      label: m.role,
                      variant: 'outline' as const,
                      description: '',
                    }

                    return (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {m.fullName?.slice(0, 2) || m.email.slice(0, 2)}
                            </div>
                            <div>
                              <div>{m.fullName || 'Funcionário'}</div>
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {m.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-4">
                          <div>
                            <Badge variant={roleInfo.variant} className="text-[10px] px-2 py-0.5">
                              {roleInfo.label}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs">
                              {roleInfo.description}
                            </p>
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

                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          {formatDateTime(m.createdAt)}
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => resetPasswordMutation.mutate(m.email)}
                              title="Resetar Senha (Enviar link por e-mail)"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(m)}
                              title="Editar Papel"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${
                                m.isActive
                                  ? 'text-destructive/80 hover:text-destructive'
                                  : 'text-success/80 hover:text-success'
                              }`}
                              onClick={() => setTogglingMember(m)}
                              title={m.isActive ? 'Desativar Acesso' : 'Ativar Acesso'}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setRemovingMember(m)}
                              title="Remover da Loja"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* MODAL: ADD / INVITE EMPLOYEE */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          resetForm()
        }}
        title={editingMember ? 'Editar Permissões do Funcionário' : 'Adicionar / Convidar Funcionário'}
        description={
          editingMember
            ? `Alteração de papel de acesso para ${editingMember.email} na loja ${storeName}`
            : `Cadastre ou convide um novo colaborador para fazer parte da equipe de ${storeName}`
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {errorMessage && (
            <div className="p-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {errorMessage}
            </div>
          )}

          {!editingMember && (
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border mb-2">
              <button
                type="button"
                onClick={() => setModalMode('create')}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  modalMode === 'create'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5 inline mr-1" /> Cadastro Direto com Senha
              </button>
              <button
                type="button"
                onClick={() => setModalMode('invite')}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  modalMode === 'invite'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Send className="h-3.5 w-3.5 inline mr-1" /> Convidar por E-mail
              </button>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Nome do Funcionário *</label>
            <Input
              placeholder="Ex: Carlos Eduardo"
              value={formData.fullName}
              disabled={Boolean(editingMember)}
              onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              required={modalMode === 'create' && !editingMember}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">E-mail Corporativo ou Pessoal *</label>
            <Input
              type="email"
              placeholder="carlos@empresa.com"
              value={formData.email}
              disabled={Boolean(editingMember)}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="h-8 text-xs"
            />
          </div>

          {!editingMember && modalMode === 'create' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Senha Provisória (Opcional - mínimo 6 dígitos)
              </label>
              <Input
                type="password"
                placeholder="Gerada automaticamente caso deixe em branco"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-foreground">Papel / Nível de Acesso na Loja *</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { role: 'SELLER' as UserRole, label: 'Vendedor / Operador de Caixa (PDV)', desc: 'Realiza vendas, emite comprovantes e consulta estoque.' },
                { role: 'INVENTORY' as UserRole, label: 'Estoquista', desc: 'Controla entradas, saídas, contagem de inventário e lotes.' },
                { role: 'FINANCE' as UserRole, label: 'Gerente / Financeiro', desc: 'Gerencia vendas, estoque, compras de fornecedores, contas e relatórios.' },
                { role: 'STORE_ADMIN' as UserRole, label: 'Administrador da Loja', desc: 'Acesso irrestrito a todos os módulos e equipe desta loja.' },
                { role: 'VIEWER' as UserRole, label: 'Visualizador (Somente Leitura)', desc: 'Consulta dados sem permissão de gravação ou alteração.' },
              ].map((item) => (
                <label
                  key={item.role}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer ${
                    formData.role === item.role
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="memberRole"
                    value={item.role}
                    checked={formData.role === item.role}
                    onChange={() => setFormData((prev) => ({ ...prev, role: item.role }))}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs"
              onClick={() => {
                setIsAddModalOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto h-8 text-xs font-semibold"
              isLoading={addMemberMutation.isPending || updateRoleMutation.isPending}
            >
              {editingMember
                ? 'Salvar Papel'
                : modalMode === 'invite'
                ? 'Enviar Convite'
                : 'Cadastrar Funcionário'}
            </Button>
          </div>
        </form>
      </Modal>

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
        description={`Tem certeza que deseja desvincular o funcionário "${removingMember?.fullName || removingMember?.email}" desta loja? Ele perderá o acesso às rotinas da filial imediatamente.`}
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
        title={togglingMember?.isActive ? 'Desativar Acesso do Funcionário' : 'Ativar Acesso do Funcionário'}
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
