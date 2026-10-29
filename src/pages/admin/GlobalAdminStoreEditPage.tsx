import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Crown,
  Edit,
  ExternalLink,
  GitBranch,
  Layers,
  MapPin,
  Plus,
  Save,
  Shield,
  Store as StoreIcon,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { storeService } from '@/services/storeService'
import { userService } from '@/services/userService'
import { permissionGroupService } from '@/services/permissionGroupService'
import { formatCurrency } from '@/utils/currency'
import { ROLE_METADATA } from '@/constants/granularPermissions'
import type { Store } from '@/types/store.types'
import type { PlatformUser, StoreMember } from '@/types/user.types'
import type { PlatformBillingRules } from '@/types/permissionGroup.types'

export const GlobalAdminStoreEditPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const isCreateMode = !storeId || storeId === 'new'
  const preselectedParentId = searchParams.get('parentStoreId') || ''

  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)

  // Store fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [document, setDocument] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Affiliation (Matriz / Filial)
  const [isBranch, setIsBranch] = useState(Boolean(preselectedParentId))
  const [parentStoreId, setParentStoreId] = useState<string>(preselectedParentId)
  const [branchCode, setBranchCode] = useState('')
  const [managerName, setManagerName] = useState('')

  // Address
  const [addressStreet, setAddressStreet] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressNeighborhood, setAddressNeighborhood] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressZipcode, setAddressZipcode] = useState('')

  // Licensing Override
  const [customFreeLimit, setCustomFreeLimit] = useState<string>('')
  const [customExtraPrice, setCustomExtraPrice] = useState<string>('')

  // Related data
  const [allStores, setAllStores] = useState<Store[]>([])
  const [members, setMembers] = useState<StoreMember[]>([])
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([])
  const [billingRules, setBillingRules] = useState<PlatformBillingRules | null>(null)

  // Quick add Admin / Link Child Branch state
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [creatingNewAdmin, setCreatingNewAdmin] = useState(false)
  const [branchToAttachId, setBranchToAttachId] = useState('')
  const [attachingBranch, setAttachingBranch] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [storesList, rules, usersRes] = await Promise.all([
        storeService.listAllStores(),
        permissionGroupService.getPlatformBillingRules(),
        userService.listPlatformUsers({ page: 1, pageSize: 200, excludeStoreEmployees: false }),
      ])

      setAllStores(storesList)
      setBillingRules(rules)
      setPlatformUsers(usersRes.data)

      if (!isCreateMode && storeId) {
        const [store, storeMembers] = await Promise.all([
          storeService.getStoreById(storeId),
          userService.listStoreMembers(storeId),
        ])

        if (!store) {
          toast.error('Loja não encontrada.')
          navigate('/global-admin?tab=stores')
          return
        }

        setName(store.name || '')
        setSlug(store.slug || '')
        setDocument(store.document || '')
        setEmail(store.email || '')
        setPhone(store.phone || '')
        setWhatsapp(store.whatsapp || '')
        setDescription(store.description || '')
        setIsActive(store.is_active !== false)

        const branchFlag = Boolean(store.is_branch || store.parent_store_id)
        setIsBranch(branchFlag)
        setParentStoreId(store.parent_store_id || '')
        setBranchCode(store.branch_code || '')
        setManagerName(store.manager_name || '')

        setAddressStreet(store.address_street || '')
        setAddressNumber(store.address_number || '')
        setAddressNeighborhood(store.address_neighborhood || '')
        setAddressCity(store.address_city || '')
        setAddressState(store.address_state || '')
        setAddressZipcode(store.address_zipcode || '')

        const localOverride = rules.storeOverrides?.[store.id]
        const effLimit =
          store.free_employees_limit !== undefined && store.free_employees_limit !== null
            ? String(store.free_employees_limit)
            : localOverride?.freeEmployeesLimit !== undefined &&
                localOverride?.freeEmployeesLimit !== null
              ? String(localOverride.freeEmployeesLimit)
              : ''
        const effPrice =
          store.extra_employee_price !== undefined && store.extra_employee_price !== null
            ? String(store.extra_employee_price)
            : localOverride?.extraEmployeePrice !== undefined &&
                localOverride?.extraEmployeePrice !== null
              ? String(localOverride.extraEmployeePrice)
              : ''

        setCustomFreeLimit(effLimit)
        setCustomExtraPrice(effPrice)
        setMembers(storeMembers)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar dados da loja.')
    } finally {
      setLoading(false)
    }
  }, [isCreateMode, navigate, storeId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const headquartersCandidates = useMemo(
    () =>
      allStores.filter(
        (s) => s.id !== storeId && !s.is_branch && !s.parent_store_id
      ),
    [allStores, storeId]
  )

  const childBranches = useMemo(
    () =>
      storeId && !isCreateMode
        ? allStores.filter((s) => s.parent_store_id === storeId)
        : [],
    [allStores, isCreateMode, storeId]
  )

  const attachableStores = useMemo(
    () =>
      allStores.filter(
        (s) => s.id !== storeId && s.parent_store_id !== storeId
      ),
    [allStores, storeId]
  )

  const storeAdmins = useMemo(
    () => members.filter((m) => m.role === 'STORE_ADMIN'),
    [members]
  )

  const operationalEmployees = useMemo(
    () => members.filter((m) => m.role !== 'STORE_ADMIN'),
    [members]
  )

  const activeEmployeesCount = useMemo(
    () => operationalEmployees.filter((m) => m.isActive !== false).length,
    [operationalEmployees]
  )

  const freeQuota = useMemo(() => {
    if (customFreeLimit.trim() !== '' && !Number.isNaN(Number(customFreeLimit))) {
      return Math.max(0, Number(customFreeLimit))
    }
    return billingRules?.defaultFreeEmployeesPerStore ?? 10
  }, [billingRules?.defaultFreeEmployeesPerStore, customFreeLimit])

  const extraUnitPrice = useMemo(() => {
    if (customExtraPrice.trim() !== '' && !Number.isNaN(Number(customExtraPrice))) {
      return Math.max(0, Number(customExtraPrice))
    }
    return billingRules?.defaultExtraEmployeePrice ?? 19.9
  }, [billingRules?.defaultExtraEmployeePrice, customExtraPrice])

  const extraBillableEmployees = Math.max(0, activeEmployeesCount - freeQuota)
  const extraMonthlyCost = extraBillableEmployees * extraUnitPrice

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) {
      toast.error('Nome e Slug da loja são obrigatórios.')
      return
    }

    setSaving(true)
    try {
      const normalizedSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')

      if (isCreateMode) {
        const created = await storeService.createStore({
          name: name.trim(),
          slug: normalizedSlug,
          document: document.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          description: description.trim() || undefined,
          is_branch: isBranch,
          parent_store_id: isBranch ? parentStoreId || null : null,
          branch_code: isBranch ? branchCode.trim().toUpperCase() || null : null,
          manager_name: managerName.trim() || null,
          address_street: addressStreet.trim() || null,
          address_number: addressNumber.trim() || null,
          address_neighborhood: addressNeighborhood.trim() || null,
          address_city: addressCity.trim() || null,
          address_state: addressState.trim() || null,
        })

        if (customFreeLimit.trim() !== '' || customExtraPrice.trim() !== '') {
          await permissionGroupService.saveStoreLicensingOverride(created.id, {
            freeEmployeesLimit:
              customFreeLimit.trim() !== '' ? Number(customFreeLimit) : null,
            extraEmployeePrice:
              customExtraPrice.trim() !== '' ? Number(customExtraPrice) : null,
          })
        }

        toast.success(
          isBranch
            ? `Filial "${created.name}" cadastrada com sucesso!`
            : `Loja Matriz "${created.name}" cadastrada com sucesso!`
        )
        navigate(`/global-admin/stores/${created.id}/edit`)
      } else if (storeId) {
        await storeService.updateStore(storeId, {
          name: name.trim(),
          slug: normalizedSlug,
          document: document.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          description: description.trim() || null,
          is_active: isActive,
          is_branch: isBranch,
          parent_store_id: isBranch ? parentStoreId || null : null,
          branch_code: isBranch ? branchCode.trim().toUpperCase() || null : null,
          manager_name: managerName.trim() || null,
          address_street: addressStreet.trim() || null,
          address_number: addressNumber.trim() || null,
          address_neighborhood: addressNeighborhood.trim() || null,
          address_city: addressCity.trim() || null,
          address_state: addressState.trim() || null,
          address_zipcode: addressZipcode.trim() || null,
        })

        await permissionGroupService.saveStoreLicensingOverride(storeId, {
          freeEmployeesLimit:
            customFreeLimit.trim() !== '' ? Number(customFreeLimit) : null,
          extraEmployeePrice:
            customExtraPrice.trim() !== '' ? Number(customExtraPrice) : null,
        })

        toast.success('Dados da loja, filiação e licenciamento atualizados com sucesso!')
        await loadData()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar loja.')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignExistingAdmin = async () => {
    if (!storeId || !selectedAdminUserId) return
    setAddingAdmin(true)
    try {
      await userService.transferStoreOwnership(storeId, selectedAdminUserId)
      toast.success('Usuário definido como Administrador (STORE_ADMIN) desta loja!')
      setSelectedAdminUserId('')
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao vincular administrador.')
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleCreateNewStoreAdmin = async () => {
    if (!storeId || !newAdminEmail.trim() || !newAdminName.trim()) {
      toast.error('Informe nome e e-mail do novo Administrador da Loja.')
      return
    }
    setCreatingNewAdmin(true)
    try {
      await userService.upsertStoreEmployee(storeId, {
        email: newAdminEmail.trim(),
        fullName: newAdminName.trim(),
        password: newAdminPassword.trim() || undefined,
        role: 'STORE_ADMIN',
        canApproveWriteoff: true,
        isActive: true,
      })
      toast.success(`Administrador ${newAdminName} criado e vinculado à loja!`)
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPassword('')
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar Administrador da Loja.')
    } finally {
      setCreatingNewAdmin(false)
    }
  }

  const handleAttachChildBranch = async () => {
    if (!storeId || !branchToAttachId) return
    setAttachingBranch(true)
    try {
      const targetBranch = allStores.find((s) => s.id === branchToAttachId)
      await storeService.updateStore(branchToAttachId, {
        is_branch: true,
        parent_store_id: storeId,
        branch_code:
          targetBranch?.branch_code ||
          `FIL-${String(childBranches.length + 1).padStart(2, '0')}`,
      })
      toast.success('Filial vinculada abaixo desta Matriz com sucesso!')
      setBranchToAttachId('')
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao vincular filial.')
    } finally {
      setAttachingBranch(false)
    }
  }

  const handleDetachChildBranch = async (branchId: string, branchName: string) => {
    try {
      await storeService.updateStore(branchId, {
        is_branch: false,
        parent_store_id: null,
      })
      toast.success(`"${branchName}" foi desvinculada e promovida a Loja Matriz independente.`)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao desvincular filial.')
    }
  }

  const handleRemoveMember = async (member: StoreMember) => {
    if (!storeId) return
    try {
      await userService.removeStoreMember(member.id, storeId)
      toast.success(`Vínculo de ${member.fullName || member.email} removido da loja.`)
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover membro da loja.')
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={
          isCreateMode
            ? preselectedParentId
              ? 'Nova Filial Vinculada'
              : 'Nova Loja / Unidade'
            : `Loja: ${name}`
        }
        badge={
          <Badge variant={isBranch ? 'secondary' : 'default'}>
            {isBranch ? 'FILIAL' : 'MATRIZ'}
          </Badge>
        }
      />

      {/* Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-foreground">
            {isCreateMode
              ? preselectedParentId
                ? 'Cadastrar Nova Filial Vinculada à Matriz'
                : 'Cadastrar Nova Loja na Plataforma'
              : `Gestão Completa da Loja & Filiação: ${name}`}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isCreateMode
              ? 'Configure os dados cadastrais, filiação (Matriz ou Filial) e cota de licenças.'
              : `ID da Loja: ${storeId} • Gerencie filiação (Matriz/Filial), usuários STORE_ADMIN e funcionários.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/global-admin?tab=stores')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar às Lojas
          </Button>
          {!isCreateMode && slug && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`${import.meta.env.BASE_URL}c/${slug}`, '_blank')}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Abrir Catálogo
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveStore}
            isLoading={saving}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {isCreateMode ? 'Criar Loja' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">
          Carregando configurações completas da loja...
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top Identification Banner */}
          {!isCreateMode && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  {isBranch ? (
                    <GitBranch className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      /global-admin/stores/{storeId}/edit
                    </span>
                    <Badge variant={isBranch ? 'secondary' : 'default'}>
                      {isBranch ? `FILIAL ${branchCode ? `(${branchCode})` : ''}` : 'LOJA MATRIZ'}
                    </Badge>
                    <Badge variant={isActive ? 'success' : 'danger'}>
                      {isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isBranch && parentStoreId
                      ? `Filial vinculada à Matriz: ${allStores.find((s) => s.id === parentStoreId)?.name || parentStoreId}`
                      : `Matriz com ${childBranches.length} filial(is) vinculada(s) • ${storeAdmins.length} STORE_ADMIN • ${activeEmployeesCount}/${freeQuota} funcionários na cota gratuita`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(`/global-admin/stores/${storeId}/employees/new`)
                  }
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Novo Funcionário
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/global-admin/finance/rules')}
                >
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Regras Financeiras
                </Button>
              </div>
            </div>
          )}

          {/* Form Grid: Store Info + Affiliation */}
          <form onSubmit={handleSaveStore} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Col 1 & 2: Dados Cadastrais e Endereço */}
            <Card className="space-y-5 p-6 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <StoreIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    1. Dados Cadastrais da Loja
                  </h2>
                </div>
                {!isCreateMode && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    Loja Ativa em Operação
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nome da Loja / Unidade *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (isCreateMode) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        )
                      }
                    }}
                    placeholder="Ex: Restaurante Sabor da Vila - Centro"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Slug da URL (Catálogo) *
                  </label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="restaurante-sabor-centro"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CNPJ / CPF</label>
                  <Input
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Gerente / Responsável Local
                  </label>
                  <Input
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Nome do gerente da unidade"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    E-mail da Unidade
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@loja.com.br"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Telefone</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 3333-4444"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      WhatsApp Pedidos
                    </label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="5511999999999"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Descrição / Observações Operacionais
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da loja ou filial"
                />
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Endereço Físico da Unidade
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground">
                      Logradouro / Rua
                    </label>
                    <Input
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      placeholder="Av. Paulista"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground">Número</label>
                    <Input
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Bairro</label>
                    <Input
                      value={addressNeighborhood}
                      onChange={(e) => setAddressNeighborhood(e.target.value)}
                      placeholder="Bela Vista"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                    <Input
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="São Paulo"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground">UF</label>
                    <Input
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      placeholder="SP"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">CEP</label>
                    <Input
                      value={addressZipcode}
                      onChange={(e) => setAddressZipcode(e.target.value)}
                      placeholder="01310-100"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Col 3: Hierarquia (Matriz vs Filial) + Cota de Funcionários */}
            <div className="space-y-6">
              <Card className="space-y-4 p-6">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    2. Filiação (Matriz / Filial)
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBranch(false)
                      setParentStoreId('')
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                      !isBranch
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Building2 className="mb-1 h-5 w-5 text-primary" />
                    <span className="text-xs font-bold">Loja Matriz</span>
                    <span className="text-[11px] opacity-75">Sede principal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBranch(true)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                      isBranch
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <GitBranch className="mb-1 h-5 w-5 text-primary" />
                    <span className="text-xs font-bold">Filial Vinculada</span>
                    <span className="text-[11px] opacity-75">Item filho da Matriz</span>
                  </button>
                </div>

                {isBranch ? (
                  <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Loja Matriz Principal *
                      </label>
                      <select
                        value={parentStoreId}
                        onChange={(e) => setParentStoreId(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Selecione a Loja Matriz...</option>
                        {headquartersCandidates.map((hq) => (
                          <option key={hq.id} value={hq.id}>
                            {hq.name} ({hq.slug})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Código da Filial
                      </label>
                      <Input
                        value={branchCode}
                        onChange={(e) => setBranchCode(e.target.value)}
                        placeholder="Ex: FIL-01, ZONA-SUL"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Esta unidade aparecerá indentada como item filho debaixo da Matriz no Global Admin e poderá receber remessas de estoque sem necessidade de venda.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
                    Esta loja opera como <strong>Matriz</strong>. Você pode vincular filiais abaixo dela para transferir estoque e consolidar a operação.
                  </div>
                )}
              </Card>

              {/* Regra de Licenciamento de Funcionários da Loja */}
              <Card className="space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-base font-bold text-foreground">
                      3. Licenças de Funcionários
                    </h2>
                  </div>
                  <Badge variant={extraBillableEmployees > 0 ? 'warning' : 'success'}>
                    {activeEmployeesCount} / {freeQuota} grátis
                  </Badge>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Funcionários ativos (não pagam plano próprio):
                    </span>
                    <span className="font-bold text-foreground">
                      {activeEmployeesCount}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cota gratuita da loja:</span>
                    <span className="font-semibold text-emerald-600">
                      {freeQuota} funcionários grátis
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Licenças adicionais:</span>
                    <span className="font-bold text-amber-500">
                      {extraBillableEmployees} × {formatCurrency(extraUnitPrice)} ={' '}
                      {formatCurrency(extraMonthlyCost)}/mês
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Cota Grátis desta Loja
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={customFreeLimit}
                      onChange={(e) => setCustomFreeLimit(e.target.value)}
                      placeholder={`Padrão (${billingRules?.defaultFreeEmployeesPerStore ?? 10})`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Valor Licença Extra (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={customExtraPrice}
                      onChange={(e) => setCustomExtraPrice(e.target.value)}
                      placeholder={`Padrão (${(billingRules?.defaultExtraEmployeePrice ?? 19.9).toFixed(2)})`}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Deixe em branco para usar a regra global do Financeiro ({billingRules?.defaultFreeEmployeesPerStore ?? 10} funcionários grátis por loja).
                </p>
              </Card>
            </div>
          </form>

          {/* Se for Matriz e já estiver criada: Gestão de Filiais Filhas */}
          {!isCreateMode && !isBranch && (
            <Card className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Layers className="h-5 w-5 text-primary" />
                    Filiais Vinculadas a esta Matriz ({childBranches.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Vincule lojas existentes como filiais filhas ou cadastre uma nova filial diretamente abaixo desta Matriz.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={branchToAttachId}
                    onChange={(e) => setBranchToAttachId(e.target.value)}
                    className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground"
                  >
                    <option value="">Vincular loja existente como filial...</option>
                    {attachableStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.slug})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!branchToAttachId}
                    isLoading={attachingBranch}
                    onClick={handleAttachChildBranch}
                  >
                    Vincular Filial
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() =>
                      navigate(`/global-admin/stores/new?parentStoreId=${storeId}`)
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Criar Nova Filial
                  </Button>
                </div>
              </div>

              {childBranches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhuma filial vinculada a esta Matriz ainda.
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {childBranches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold text-primary">└─</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {branch.name}
                            </span>
                            <Badge variant="secondary">
                              {branch.branch_code || 'FILIAL'}
                            </Badge>
                            <Badge variant={branch.is_active ? 'success' : 'danger'}>
                              {branch.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Slug: /{branch.slug} • Gerente: {branch.manager_name || 'Não informado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/global-admin/stores/${branch.id}/edit`)
                          }
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Editar Filial
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDetachChildBranch(branch.id, branch.name)}
                        >
                          Desvincular
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Gestão de Usuários Administradores da Loja (STORE_ADMIN) */}
          {!isCreateMode && (
            <Card className="space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Crown className="h-5 w-5 text-amber-500" />
                    4. Usuários Administradores da Loja (STORE_ADMIN)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Somente o <strong>STORE_ADMIN</strong> possui plano de assinatura comercial e aparece na aba de Usuários Pagantes do Global Admin.
                  </p>
                </div>
              </div>

              {/* Lista de STORE_ADMIN atuais */}
              <div className="divide-y divide-border rounded-xl border border-border">
                {storeAdmins.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum STORE_ADMIN vinculado a esta loja. Adicione ou promova um abaixo.
                  </div>
                ) : (
                  storeAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 font-bold text-amber-600">
                          {(admin.fullName || admin.email || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {admin.fullName || 'Sem nome'}
                            </span>
                            <Badge variant="warning">STORE_ADMIN (Titular do Plano)</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {admin.email} • ID: {admin.userId}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/global-admin/users/${admin.userId}/permissions`)
                          }
                        >
                          <Shield className="mr-1.5 h-3.5 w-3.5" />
                          Plano & Telas
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/global-admin/users/${admin.userId}/billing`)
                          }
                        >
                          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                          Pagamentos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/global-admin/users/${admin.userId}/edit`)
                          }
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Editar Conta
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Vincular usuário existente ou criar novo STORE_ADMIN */}
              <div className="grid grid-cols-1 gap-4 pt-2 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    Vincular Conta Existente como STORE_ADMIN
                  </h3>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <select
                        value={selectedAdminUserId}
                        onChange={(e) => setSelectedAdminUserId(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Escolha um usuário da plataforma...</option>
                        {platformUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName || u.email} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="default"
                      disabled={!selectedAdminUserId}
                      isLoading={addingAdmin}
                      onClick={handleAssignExistingAdmin}
                    >
                      Definir Admin
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    Criar Novo Usuário STORE_ADMIN para esta Loja
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="Nome completo"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                    />
                    <Input
                      placeholder="E-mail"
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Senha inicial"
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                      />
                      <Button
                        variant="default"
                        isLoading={creatingNewAdmin}
                        onClick={handleCreateNewStoreAdmin}
                      >
                        Criar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Lista de Funcionários Operacionais da Loja (com links para URL própria de cada funcionário) */}
          {!isCreateMode && (
            <Card className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Users className="h-5 w-5 text-primary" />
                    5. Funcionários da Loja ({operationalEmployees.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Funcionários operacionais não pagam plano individual. Cada loja tem{' '}
                    <strong>{freeQuota} funcionários grátis</strong> e cada licença adicional custa{' '}
                    <strong>{formatCurrency(extraUnitPrice)}/mês</strong>. Clique em Ações Rápidas para abrir a URL exclusiva do funcionário.
                  </p>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    navigate(`/global-admin/stores/${storeId}/employees/new`)
                  }
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Cadastrar Funcionário nesta Loja
                </Button>
              </div>

              {operationalEmployees.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nenhum funcionário operacional cadastrado nesta loja.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-3 pr-4">Funcionário</th>
                        <th className="px-4 py-3">Papel / Cargo</th>
                        <th className="px-4 py-3">Aprovador de Baixa</th>
                        <th className="px-4 py-3">Licença na Loja</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="py-3 pl-4 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {operationalEmployees.map((emp, idx) => {
                        const seatNumber = idx + 1
                        const isFreeSeat = seatNumber <= freeQuota
                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-muted/30"
                          >
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-foreground">
                                {emp.fullName || 'Sem nome'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {emp.email}{' '}
                                {emp.employeeRegistration
                                  ? `• Matrícula: ${emp.employeeRegistration}`
                                  : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary">
                                {emp.customRoleName || ROLE_METADATA[emp.role]?.label || emp.role}
                              </Badge>
                              {emp.jobTitle && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {emp.jobTitle}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {emp.canApproveWriteoff || emp.role === 'STOCK_APPROVER' ? (
                                <Badge variant="success">
                                  Aprovador Autorizado
                                  {emp.maxWriteoffValue
                                    ? ` (até ${formatCurrency(emp.maxWriteoffValue)})`
                                    : ''}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Não autoriza baixa</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {emp.isActive === false ? (
                                <Badge variant="outline">Inativo (Não consome cota)</Badge>
                              ) : isFreeSeat ? (
                                <Badge variant="success">
                                  Grátis ({seatNumber}/{freeQuota})
                                </Badge>
                              ) : (
                                <Badge variant="warning">
                                  Licença Extra (+{formatCurrency(extraUnitPrice)}/mês)
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={emp.isActive !== false ? 'success' : 'danger'}>
                                {emp.isActive !== false ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <DropdownMenu
                                triggerLabel="Ações Rápidas"
                                items={[
                                  {
                                    key: 'edit-emp',
                                    label: 'Abrir Tela Completa do Funcionário',
                                    icon: <Edit className="h-4 w-4" />,
                                    onSelect: () =>
                                      navigate(
                                        `/global-admin/stores/${storeId}/employees/${emp.userId}`
                                      ),
                                  },
                                  {
                                    key: 'promote-admin',
                                    label: 'Promover a STORE_ADMIN',
                                    icon: <Crown className="h-4 w-4" />,
                                    onSelect: async () => {
                                      await userService.transferStoreOwnership(
                                        storeId,
                                        emp.userId
                                      )
                                      toast.success(
                                        `${emp.fullName || emp.email} promovido a STORE_ADMIN!`
                                      )
                                      loadData()
                                    },
                                  },
                                  {
                                    key: 'remove-emp',
                                    label: 'Remover Funcionário da Loja',
                                    icon: <Trash2 className="h-4 w-4" />,
                                    variant: 'danger',
                                    onSelect: () => handleRemoveMember(emp),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
export default GlobalAdminStoreEditPage
