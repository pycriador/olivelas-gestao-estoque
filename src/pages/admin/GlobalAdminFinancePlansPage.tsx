import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Edit,
  Layers,
  Plus,
  Save,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { permissionGroupService } from '@/services/permissionGroupService'
import {
  DEFAULT_PERMISSION_GROUPS,
  DEFAULT_PERMISSION_MODULES,
} from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type {
  ModuleCode,
  PermissionGroup,
  PermissionModule,
} from '@/types/permissionGroup.types'

export const GlobalAdminFinancePlansPage: React.FC = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [savingGroup, setSavingGroup] = useState(false)
  const [savingModuleCode, setSavingModuleCode] = useState<string | null>(null)

  const [groups, setGroups] = useState<PermissionGroup[]>(
    DEFAULT_PERMISSION_GROUPS
  )
  const [modules, setModules] = useState<PermissionModule[]>(
    DEFAULT_PERMISSION_MODULES
  )

  // Group editor state
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>(
    undefined
  )
  const [groupCode, setGroupCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [badgeColor, setBadgeColor] = useState('indigo')
  const [baseMonthlyPrice, setBaseMonthlyPrice] = useState('99.90')
  const [annualPrice, setAnnualPrice] = useState('999.00')
  const [setupFee, setSetupFee] = useState('0')
  const [enabledModules, setEnabledModules] = useState<ModuleCode[]>([
    'MOD_CATALOG_WA',
    'MOD_INVENTORY',
  ])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [grps, mods] = await Promise.all([
        permissionGroupService.listPermissionGroups(),
        permissionGroupService.listModules(),
      ])
      setGroups(grps)
      setModules(mods)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar catálogo comercial.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelectGroupForEdit = (grp: PermissionGroup) => {
    setEditingGroupId(grp.id)
    setGroupCode(grp.code)
    setGroupName(grp.name)
    setGroupDescription(grp.description)
    setBadgeColor(grp.badgeColor || 'indigo')
    setBaseMonthlyPrice(String(grp.baseMonthlyPrice))
    setAnnualPrice(String(grp.annualPrice))
    setSetupFee(String(grp.setupFee))
    setEnabledModules(grp.enabledModules)
  }

  const handleResetGroupForm = () => {
    setEditingGroupId(undefined)
    setGroupCode('')
    setGroupName('')
    setGroupDescription('')
    setBadgeColor('indigo')
    setBaseMonthlyPrice('99.90')
    setAnnualPrice('999.00')
    setSetupFee('0')
    setEnabledModules(['MOD_CATALOG_WA', 'MOD_INVENTORY'])
  }

  const handleToggleGroupModule = (code: ModuleCode) => {
    setEnabledModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !groupCode.trim()) {
      toast.error('Informe o código e nome comercial do grupo/pacote.')
      return
    }
    setSavingGroup(true)
    try {
      await permissionGroupService.savePermissionGroup({
        id: editingGroupId,
        code: groupCode,
        name: groupName,
        description: groupDescription,
        badgeColor,
        enabledModules,
        enabledPermissions: [],
        baseMonthlyPrice: Number(baseMonthlyPrice || 0),
        annualPrice: Number(annualPrice || 0),
        setupFee: Number(setupFee || 0),
      })
      toast.success('Pacote / Grupo Comercial salvo com sucesso!')
      handleResetGroupForm()
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar pacote comercial.')
    } finally {
      setSavingGroup(false)
    }
  }

  const handleSaveModulePrice = async (mod: PermissionModule, newPrice: number) => {
    setSavingModuleCode(mod.code)
    try {
      await permissionGroupService.updateModule(mod.code, {
        monthlyPrice: newPrice,
      })
      toast.success(`Valor do módulo "${mod.name}" atualizado para ${formatCurrency(newPrice)}/mês!`)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar preço do módulo.')
    } finally {
      setSavingModuleCode(null)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Financeiro: Catálogo de Planos & Preços de Telas"
        badge={<Badge variant="default">{groups.length} Pacotes Comerciais</Badge>}
      />

      {/* Top Navigation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                /global-admin/finance/plans
              </span>
              <Badge variant="success">Tabela Comercial</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure os pacotes comerciais (ex: "Controle de estoque valor X", "Catálogo WhatsApp") e a tabela de preços avulsos por módulo de tela.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin?tab=finance')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar ao Financeiro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin/finance/rules')}
          >
            <Sliders className="mr-1.5 h-4 w-4" />
            Regras & Licenças (10 Grátis)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin/finance/payments')}
          >
            <CreditCard className="mr-1.5 h-4 w-4" />
            Controle de Pagamentos
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando pacotes comerciais e tabela de preços de telas...
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Col 1: Formulário Criar/Editar Grupo de Perfil Comercial */}
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                {editingGroupId
                  ? 'Editar Pacote Comercial'
                  : 'Novo Pacote Comercial'}
              </h2>
              {editingGroupId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetGroupForm}
                >
                  Novo
                </Button>
              )}
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Nome Comercial do Pacote *
                </label>
                <Input
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value)
                    if (!editingGroupId) {
                      setGroupCode(
                        e.target.value
                          .toUpperCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^A-Z0-9]+/g, '_')
                      )
                    }
                  }}
                  placeholder="Ex: Controle de Estoque + Validades"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Código Identificador *
                </label>
                <Input
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  placeholder="CONTROLE_ESTOQUE_PRO"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Descrição Comercial
                </label>
                <Input
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="O que está incluso neste pacote..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Mensal (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={baseMonthlyPrice}
                    onChange={(e) => setBaseMonthlyPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Anual (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={annualPrice}
                    onChange={(e) => setAnnualPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Implantação
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={setupFee}
                    onChange={(e) => setSetupFee(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-foreground">
                  Telas Inclusas no Pacote ({enabledModules.length})
                </label>
                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2.5">
                  {modules.map((m) => {
                    const checked = enabledModules.includes(m.code)
                    return (
                      <label
                        key={m.code}
                        className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleGroupModule(m.code)}
                            className="h-3.5 w-3.5 rounded border-border text-primary"
                          />
                          <span className="font-medium text-foreground">
                            {m.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatCurrency(m.monthlyPrice)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full"
                isLoading={savingGroup}
              >
                <Save className="mr-1.5 h-4 w-4" />
                {editingGroupId
                  ? 'Atualizar Pacote Comercial'
                  : 'Criar Pacote Comercial'}
              </Button>
            </form>
          </Card>

          {/* Col 2 & 3: Lista de Pacotes Comerciais + Tabela de Preços Individuais de Telas */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="space-y-4 p-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">
                  Pacotes Comerciais Cadastrados ({groups.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Clique em "Editar" em qualquer pacote para alterar suas telas inclusas ou seu valor mensal.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {groups.map((grp) => (
                  <div
                    key={grp.id}
                    className="flex flex-col justify-between rounded-xl border border-border p-4 hover:bg-muted/20"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          {grp.name}
                        </span>
                        <Badge variant="default">
                          {formatCurrency(grp.baseMonthlyPrice)}/mês
                        </Badge>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        Código: {grp.code}
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {grp.description}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {grp.enabledModules.length} módulos de tela ativos
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectGroupForEdit(grp)}
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Editar Pacote
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Preço Individual por Módulo de Tela */}
            <Card className="space-y-4 p-6">
              <div className="border-b border-border pb-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Tabela de Preços Avulsos por Módulo de Tela ({modules.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Valores unitários utilizados quando você monta um plano sob medida marcando/desmarcando telas para um cliente.
                </p>
              </div>

              <div className="divide-y divide-border">
                {modules.map((mod) => (
                  <div
                    key={mod.code}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {mod.name}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          ({mod.code})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {mod.description} • Rotas: {mod.routes.join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        defaultValue={mod.monthlyPrice.toFixed(2)}
                        onBlur={(e) => {
                          const val = Number(e.target.value)
                          if (
                            !Number.isNaN(val) &&
                            val !== mod.monthlyPrice
                          ) {
                            handleSaveModulePrice(mod, val)
                          }
                        }}
                        className="h-9 w-28 text-sm font-bold"
                      />
                      <span className="text-xs text-muted-foreground">
                        /mês
                      </span>
                      {savingModuleCode === mod.code && (
                        <Badge variant="secondary">Salvando...</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalAdminFinancePlansPage
