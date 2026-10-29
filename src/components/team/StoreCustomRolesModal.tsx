import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Check,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { userService } from '@/services/userService'
import {
  GRANULAR_PERMISSION_GROUPS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_METADATA,
} from '@/constants/granularPermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/utils/currency'
import { parseApiError } from '@/utils/errorHandler'
import { cn } from '@/utils/cn'
import type { StoreCustomRole } from '@/types/user.types'
import type { UserRole } from '@/types/database.types'

export interface StoreCustomRolesModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  storeName?: string
}

const BASE_ROLES: UserRole[] = [
  'STOCK_APPROVER',
  'INVENTORY',
  'SELLER',
  'FINANCE',
  'STORE_ADMIN',
  'VIEWER',
]

export function StoreCustomRolesModal({
  isOpen,
  onClose,
  storeId,
  storeName,
}: StoreCustomRolesModalProps) {
  const queryClient = useQueryClient()

  const [editingRole, setEditingRole] = React.useState<StoreCustomRole | null>(null)
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [baseRole, setBaseRole] = React.useState<UserRole>('STOCK_APPROVER')
  const [canApproveWriteoff, setCanApproveWriteoff] = React.useState(true)
  const [maxWriteoffValue, setMaxWriteoffValue] = React.useState('')
  const [permissions, setPermissions] = React.useState<string[]>(
    ROLE_DEFAULT_PERMISSIONS.STOCK_APPROVER
  )
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ['store-custom-roles', storeId],
    queryFn: () => userService.listStoreCustomRoles(storeId),
    enabled: Boolean(storeId) && isOpen,
  })

  const resetForm = (base: UserRole = 'STOCK_APPROVER') => {
    setEditingRole(null)
    setName('')
    setCode('')
    setDescription('')
    setBaseRole(base)
    setCanApproveWriteoff(base === 'STOCK_APPROVER' || base === 'STORE_ADMIN')
    setMaxWriteoffValue('')
    setPermissions([...(ROLE_DEFAULT_PERMISSIONS[base] || [])])
    setErrorMsg(null)
  }

  const handleEdit = (r: StoreCustomRole) => {
    setEditingRole(r)
    setName(r.name)
    setCode(r.code)
    setDescription(r.description || '')
    setBaseRole(r.baseRole)
    setCanApproveWriteoff(r.canApproveWriteoff)
    setMaxWriteoffValue(r.maxWriteoffValue !== null ? String(r.maxWriteoffValue) : '')
    setPermissions([...r.permissions])
    setErrorMsg(null)
  }

  const handleTogglePerm = (permCode: string) => {
    setPermissions((prev) =>
      prev.includes(permCode)
        ? prev.filter((p) => p !== permCode)
        : [...prev, permCode]
    )
    if (permCode === 'inventory.approve_writeoff') {
      setCanApproveWriteoff(!permissions.includes('inventory.approve_writeoff'))
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Informe o nome do papel.')
      const generatedCode =
        code.trim() ||
        name
          .trim()
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9]+/g, '_')

      const finalPerms = new Set(permissions)
      if (canApproveWriteoff) finalPerms.add('inventory.approve_writeoff')

      return userService.upsertStoreCustomRole(storeId, {
        id: editingRole?.id,
        code: generatedCode,
        name: name.trim(),
        description: description.trim() || null,
        baseRole,
        permissions: Array.from(finalPerms),
        canApproveWriteoff,
        maxWriteoffValue:
          maxWriteoffValue.trim() !== '' ? parseFloat(maxWriteoffValue) : null,
        isActive: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-custom-roles', storeId] })
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      toast.success(
        editingRole
          ? 'Papel customizado atualizado com sucesso!'
          : 'Novo papel da loja criado com sucesso!'
      )
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteStoreCustomRole(id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-custom-roles', storeId] })
      queryClient.invalidateQueries({ queryKey: ['store-members', storeId] })
      toast.success('Papel removido.')
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Papéis e Perfis de Função da Loja"
      description={
        storeName
          ? `Crie papéis personalizados para os funcionários de ${storeName} (ex: Aprovador de Baixa de Estoque, Conferente, Gerente de Turno).`
          : 'Crie e gerencie papéis personalizados com permissões granulares para atribuir aos funcionários.'
      }
      maxWidth="4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1 text-xs">
        {/* Lista de papéis existentes */}
        <div className="md:col-span-5 space-y-2.5 border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-3">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase text-[11px] text-muted-foreground">
              Papéis Cadastrados ({customRoles.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => resetForm('STOCK_APPROVER')}
            >
              <Plus className="h-3 w-3 mr-1" /> Novo Papel
            </Button>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando papéis...
              </div>
            ) : customRoles.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground space-y-1">
                <Shield className="h-5 w-5 mx-auto opacity-50" />
                <p>Nenhum papel customizado criado ainda.</p>
                <p className="text-[10px]">
                  Use o formulário ao lado para criar perfis como &ldquo;Supervisor Aprovador de Baixa&rdquo;.
                </p>
              </div>
            ) : (
              customRoles.map((cr) => (
                <div
                  key={cr.id}
                  onClick={() => handleEdit(cr)}
                  className={cn(
                    'p-3 rounded-xl border cursor-pointer transition-all space-y-1.5',
                    editingRole?.id === cr.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground">{cr.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Remover o papel "${cr.name}"?`)) {
                          deleteMutation.mutate(cr.id)
                        }
                      }}
                      className="p-1 text-muted-foreground hover:text-danger rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {cr.code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                      {cr.permissions.length} permissões
                    </span>
                    {cr.canApproveWriteoff && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                        <ShieldCheck className="h-3 w-3" /> Aprovador de Baixa
                        {cr.maxWriteoffValue
                          ? ` (${formatCurrency(cr.maxWriteoffValue)})`
                          : ''}
                      </span>
                    )}
                  </div>
                  {cr.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {cr.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor de Papel */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="md:col-span-7 space-y-3"
        >
          {errorMsg && (
            <div className="p-2.5 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="font-bold text-foreground uppercase text-[11px]">
            {editingRole ? `Editando Papel: ${editingRole.name}` : 'Criar Novo Papel da Loja'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold">Nome do Papel *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Supervisor Aprovador de Baixa"
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold">Papel Base</label>
              <select
                value={baseRole}
                onChange={(e) => {
                  const r = e.target.value as UserRole
                  setBaseRole(r)
                  if (!editingRole) {
                    setPermissions([...(ROLE_DEFAULT_PERMISSIONS[r] || [])])
                    setCanApproveWriteoff(r === 'STOCK_APPROVER' || r === 'STORE_ADMIN')
                  }
                }}
                className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs"
              >
                {BASE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_METADATA[r]?.label || r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold">Descrição da Função</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Autorizado a aprovar baixas de estoque até R$ 2.000,00 e transferir produtos para filiais"
              className="h-8 text-xs"
            />
          </div>

          {/* Configuração de Aprovador de Baixa */}
          <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={canApproveWriteoff}
                onChange={(e) => {
                  const checked = e.target.checked
                  setCanApproveWriteoff(checked)
                  if (checked && !permissions.includes('inventory.approve_writeoff')) {
                    setPermissions((prev) => [...prev, 'inventory.approve_writeoff'])
                  } else if (!checked) {
                    setPermissions((prev) =>
                      prev.filter((p) => p !== 'inventory.approve_writeoff')
                    )
                  }
                }}
                className="rounded border-amber-500"
              />
              <span className="font-bold text-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                Autoriza Baixa de Estoque
              </span>
            </label>

            {canApproveWriteoff && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Alçada máx (R$):</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maxWriteoffValue}
                  onChange={(e) => setMaxWriteoffValue(e.target.value)}
                  placeholder="Ilimitado"
                  className="h-7 w-28 text-xs font-mono"
                />
              </div>
            )}
          </div>

          {/* Permissões do Papel */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto border border-border rounded-xl p-2.5 bg-surface custom-scrollbar">
            {GRANULAR_PERMISSION_GROUPS.map((grp) => (
              <div key={grp.id} className="space-y-1.5 pb-2 border-b border-border/60 last:border-b-0">
                <div className="font-bold text-[11px] text-primary">{grp.title}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {grp.permissions.map((p) => {
                    const checked = permissions.includes(p.code)
                    return (
                      <label
                        key={p.code}
                        className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-muted/40 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleTogglePerm(p.code)}
                          className="rounded border-input"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button type="submit" size="sm" isLoading={saveMutation.isPending}>
              <Check className="h-3.5 w-3.5 mr-1" />
              {editingRole ? 'Atualizar Papel' : 'Salvar Novo Papel'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
