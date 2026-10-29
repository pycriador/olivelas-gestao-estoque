import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Plus,
  CheckCircle2,
  DollarSign,
  Layers,
  Edit2,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { permissionGroupService } from '@/services/permissionGroupService'
import {
  DEFAULT_PERMISSION_GROUPS,
  DEFAULT_PERMISSION_MODULES,
} from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import { parseApiError } from '@/utils/errorHandler'
import type {
  ModuleCode,
  PermissionGroup,
  PermissionModule,
} from '@/types/permissionGroup.types'

interface PermissionGroupsManagerModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (msg: string) => void
}

export function PermissionGroupsManagerModal({
  isOpen,
  onClose,
  onSaved,
}: PermissionGroupsManagerModalProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = React.useState<'groups' | 'modules' | 'form'>('groups')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const { data: groups = DEFAULT_PERMISSION_GROUPS } = useQuery({
    queryKey: ['permission-groups-catalog'],
    queryFn: () => permissionGroupService.listPermissionGroups(),
    enabled: isOpen,
  })

  const { data: modules = DEFAULT_PERMISSION_MODULES } = useQuery({
    queryKey: ['permission-modules-catalog'],
    queryFn: () => permissionGroupService.listModules(),
    enabled: isOpen,
  })

  // State for creating/editing a group
  const [editingGroupId, setEditingGroupId] = React.useState<string | undefined>(undefined)
  const [groupCode, setGroupCode] = React.useState('')
  const [groupName, setGroupName] = React.useState('')
  const [groupDescription, setGroupDescription] = React.useState('')
  const [groupMonthlyPrice, setGroupMonthlyPrice] = React.useState('99.90')
  const [groupAnnualPrice, setGroupAnnualPrice] = React.useState('999.00')
  const [groupSetupFee, setGroupSetupFee] = React.useState('0')
  const [groupModules, setGroupModules] = React.useState<ModuleCode[]>(['MOD_CATALOG_WA'])

  // State for editing module prices inline
  const [modulePrices, setModulePrices] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!isOpen) return
    const map: Record<string, string> = {}
    for (const m of modules) {
      map[m.code] = String(m.monthlyPrice)
    }
    setModulePrices(map)
  }, [isOpen, modules])

  const handleEditGroup = (g: PermissionGroup) => {
    setEditingGroupId(g.id)
    setGroupCode(g.code)
    setGroupName(g.name)
    setGroupDescription(g.description)
    setGroupMonthlyPrice(String(g.baseMonthlyPrice))
    setGroupAnnualPrice(String(g.annualPrice))
    setGroupSetupFee(String(g.setupFee))
    setGroupModules([...g.enabledModules])
    setErrorMsg(null)
    setTab('form')
  }

  const handleNewGroup = () => {
    setEditingGroupId(undefined)
    setGroupCode(`PLAN_CUSTOM_${Date.now().toString().slice(-4)}`)
    setGroupName('')
    setGroupDescription('')
    setGroupMonthlyPrice('89.90')
    setGroupAnnualPrice('899.00')
    setGroupSetupFee('0')
    setGroupModules(['MOD_CATALOG_WA', 'MOD_INVENTORY'])
    setErrorMsg(null)
    setTab('form')
  }

  const saveGroupMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault()
      const perms = Array.from(
        new Set(
          modules
            .filter((m) => groupModules.includes(m.code))
            .flatMap((m) => m.permissions)
        )
      )
      return permissionGroupService.savePermissionGroup({
        id: editingGroupId,
        code: groupCode,
        name: groupName,
        description: groupDescription,
        badgeColor: 'indigo',
        enabledModules: groupModules,
        enabledPermissions: perms,
        baseMonthlyPrice: Number(groupMonthlyPrice || 0),
        annualPrice: Number(groupAnnualPrice || 0),
        setupFee: Number(groupSetupFee || 0),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-groups-catalog'] })
      setTab('groups')
      onSaved?.('Grupo de Perfil Comercial salvo com sucesso!')
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const saveModulePriceMutation = useMutation({
    mutationFn: async (mod: PermissionModule) => {
      const price = Number(modulePrices[mod.code] ?? mod.monthlyPrice)
      return permissionGroupService.updateModule(mod.code, { monthlyPrice: price })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-modules-catalog'] })
      onSaved?.('Valor comercial do módulo atualizado!')
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catálogo de Grupos de Perfil & Tabela de Preços dos Módulos"
      description="Configure os valores comerciais ('Controle de estoque valor X', 'Catálogo somente por WhatsApp valor Y', etc.) para vender funcionalidades sob medida aos clientes."
      maxWidth="4xl"
    >
      <div className="space-y-4 pt-1 max-h-[78vh] overflow-y-auto pr-1 custom-scrollbar">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-b border-border pb-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setTab('groups')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                tab === 'groups'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 inline mr-1.5" />
              Grupos de Perfil ({groups.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('modules')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                tab === 'modules'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5 inline mr-1.5" />
              Valores por Funcionalidade / Tela ({modules.length})
            </button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleNewGroup}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Novo Grupo de Perfil
          </Button>
        </div>

        {/* TAB 1: GROUPS LIST */}
        {tab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.map((g) => (
              <div
                key={g.id}
                className="p-3.5 rounded-xl border border-border bg-card flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground block">
                        {g.code}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{g.name}</h4>
                    </div>
                    <Badge className="text-xs font-mono bg-primary text-primary-foreground shrink-0">
                      {formatCurrency(g.baseMonthlyPrice)}/mês
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {g.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {g.enabledModules.map((mc) => {
                      const modName =
                        modules.find((m) => m.code === mc)?.name.split(' (')[0] || mc
                      return (
                        <span
                          key={mc}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
                        >
                          {modName}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Anual: <strong>{formatCurrency(g.annualPrice)}</strong> • Implantação:{' '}
                    <strong>{formatCurrency(g.setupFee)}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditGroup(g)}
                    className="h-7 px-2.5 text-xs font-semibold gap-1"
                  >
                    <Edit2 className="h-3 w-3" /> Editar Valores & Telas
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: INDIVIDUAL MODULE PRICING */}
        {tab === 'modules' && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/80 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3">Funcionalidade / Tela</th>
                  <th className="py-2.5 px-3">Rotas Controladas</th>
                  <th className="py-2.5 px-3 text-right">Valor Mensal Avulso (R$)</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {modules.map((mod) => (
                  <tr key={mod.code} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-foreground">{mod.name}</div>
                      <div className="text-[10px] text-muted-foreground">{mod.description}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {mod.routes.map((r) => (
                          <span
                            key={r}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right w-40">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={modulePrices[mod.code] ?? String(mod.monthlyPrice)}
                        onChange={(e) =>
                          setModulePrices((prev) => ({
                            ...prev,
                            [mod.code]: e.target.value,
                          }))
                        }
                        className="h-8 text-xs font-mono text-right"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isLoading={saveModulePriceMutation.isPending}
                        onClick={() => saveModulePriceMutation.mutate(mod)}
                        className="h-8 text-xs font-semibold gap-1"
                      >
                        <DollarSign className="h-3 w-3 text-primary" />
                        Salvar Valor
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CREATE / EDIT GROUP FORM */}
        {tab === 'form' && (
          <form onSubmit={(e) => saveGroupMutation.mutate(e)} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-foreground">
                  Nome Comercial do Grupo de Perfil *
                </label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Catálogo de Produtos (Venda Somente por WhatsApp)"
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Código Identificador *
                </label>
                <Input
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-[11px] font-semibold text-foreground">
                  Descrição Comercial (Argumento de Venda)
                </label>
                <Input
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Descreva o que está incluso neste pacote..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-primary">
                  Valor Mensal do Pacote (R$) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={groupMonthlyPrice}
                  onChange={(e) => setGroupMonthlyPrice(e.target.value)}
                  required
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Valor Anual (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={groupAnnualPrice}
                  onChange={(e) => setGroupAnnualPrice(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Taxa de Implantação (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={groupSetupFee}
                  onChange={(e) => setGroupSetupFee(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-bold text-foreground">
                Módulos de Tela Incluídos Neste Grupo:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modules.map((m) => {
                  const checked = groupModules.includes(m.code)
                  return (
                    <label
                      key={m.code}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer ${
                        checked ? 'border-primary bg-primary/10 font-semibold' : 'border-border bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setGroupModules((prev) =>
                              prev.includes(m.code)
                                ? prev.filter((c) => c !== m.code)
                                : [...prev, m.code]
                            )
                          }
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{m.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatCurrency(m.monthlyPrice)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTab('groups')}
                className="h-8 text-xs"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={saveGroupMutation.isPending}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Salvar Grupo Comercial
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
