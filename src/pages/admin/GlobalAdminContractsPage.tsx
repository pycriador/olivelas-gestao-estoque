import { useState, useEffect, useMemo } from 'react'
import {
  FileSignature,
  Sparkles,
  Search,
  MessageCircle,
  Mail,
  Phone,
  Plus,
  Trash2,
  FileCode2,
  FileText,
  Printer,
  CloudUpload,
  Database,
  CheckCircle2,
  ExternalLink,
  Eye,
  Edit3,
  RotateCcw,
  UserCheck,
  Package,
  Calendar,
  DollarSign,
  Building2,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import { Pagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { contractService } from '@/services/contractService'
import { permissionGroupService } from '@/services/permissionGroupService'
import { useAuthStore } from '@/stores/authStore'
import type {
  CommercialPlanProposal,
  ProposalStatus,
  PlatformContract,
  ContractStatus,
  GlobalAdminGoogleDriveConfig,
} from '@/types/contract.types'
import { DEFAULT_CONTRACT_TERMS_TEMPLATE } from '@/types/contract.types'
import type { PermissionGroup, PermissionModule } from '@/types/permissionGroup.types'
import { toast } from 'sonner'

const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  NEW: 'Nova Solicitação',
  CONTACTED: 'Em Contato',
  CONTRACT_GENERATED: 'Contrato Gerado',
  SIGNED: 'Contrato Assinado',
  ARCHIVED: 'Arquivado',
}

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  SENT_FOR_SIGNATURE: 'Enviado p/ Assinatura',
  SIGNED: 'Assinado / Vigente',
  CANCELLED: 'Cancelado',
}

const TEMPLATE_VARIABLES = [
  { token: '{{NUMERO_CONTRATO}}', label: 'Nº Contrato' },
  { token: '{{MEU_NOME}}', label: 'Meu Nome (Contratada)' },
  { token: '{{NOME_CLIENTE}}', label: 'Nome do Cliente' },
  { token: '{{DOCUMENTO_CLIENTE}}', label: 'CPF/CNPJ Cliente' },
  { token: '{{EMAIL_CLIENTE}}', label: 'E-mail Cliente' },
  { token: '{{TELEFONE_CLIENTE}}', label: 'Celular Cliente' },
  { token: '{{PRODUTO_COMPRADO}}', label: 'Produto Comprado' },
  { token: '{{MODULOS_ADICIONAIS}}', label: 'Módulos Adicionais' },
  { token: '{{CICLO_COBRANCA}}', label: 'Ciclo (Mensal/Anual)' },
  { token: '{{VALOR_TOTAL}}', label: 'Valor Total' },
  { token: '{{FORMA_PAGAMENTO}}', label: 'Condições Pagto' },
  { token: '{{DATA_VIGENCIA}}', label: 'Data Vigência' },
]

export function GlobalAdminContractsPage() {
  const { user } = useAuthStore()

  const [activeSection, setActiveSection] = useState<'PROPOSALS' | 'CONTRACT_MANAGER'>('PROPOSALS')
  const [proposals, setProposals] = useState<CommercialPlanProposal[]>([])
  const [contracts, setContracts] = useState<PlatformContract[]>([])
  const [plans, setPlans] = useState<PermissionGroup[]>([])
  const [modules, setModules] = useState<PermissionModule[]>([])
  const [loading, setLoading] = useState(true)

  // Proposals Filter & Pagination
  const [proposalSearch, setProposalSearch] = useState('')
  const [proposalStatusFilter, setProposalStatusFilter] = useState<string>('ALL')
  const [proposalPage, setProposalPage] = useState(1)
  const [proposalPageSize, setProposalPageSize] = useState(15)

  // Contract Editor State
  const [editingContractId, setEditingContractId] = useState<string | null>(null)
  const [linkedProposalId, setLinkedProposalId] = useState<string | null>(null)
  const [contractNumber, setContractNumber] = useState(contractService.generateContractNumber())
  const [contractTitle, setContractTitle] = useState(
    'Contrato de Licenciamento de Software SaaS e Módulos Adicionais'
  )
  // Provider ("Meu Nome")
  const [providerName, setProviderName] = useState(
    user?.fullName
      ? `${user.fullName} — Olivelas Tecnologia & Gestão SaaS`
      : 'Olivelas Tecnologia & Gestão de Estoque Ltda'
  )
  const [providerDocument, setProviderDocument] = useState('00.000.000/0001-00')
  const [providerEmail, setProviderEmail] = useState(user?.email || 'comercial@olivelas.com.br')
  const [providerRepresentative, setProviderRepresentative] = useState(
    user?.fullName || 'Admin Global Olivelas'
  )

  // Customer ("Nome do Cliente")
  const [customerName, setCustomerName] = useState('')
  const [customerDocument, setCustomerDocument] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Purchased Product & Modules
  const [purchasedProduct, setPurchasedProduct] = useState('ERP Completo + PDV + Filiais')
  const [selectedAddonNames, setSelectedAddonNames] = useState<string[]>([])
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [basePrice, setBasePrice] = useState<number>(189.9)
  const [addonsPrice, setAddonsPrice] = useState<number>(0)
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [paymentTerms, setPaymentTerms] = useState(
    'Pagamento recorrente via PIX, Boleto ou Cartão de Crédito todo dia 10.'
  )
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [contractStatus, setContractStatus] = useState<ContractStatus>('DRAFT')
  const [customTerms, setCustomTerms] = useState(DEFAULT_CONTRACT_TERMS_TEMPLATE)
  const [showLivePreview, setShowLivePreview] = useState(true)
  const [savingContract, setSavingContract] = useState(false)
  const [syncingDrive, setSyncingDrive] = useState(false)

  // Google Drive Config Modal
  const [driveModalOpen, setDriveModalOpen] = useState(false)
  const [driveConfig, setDriveConfig] = useState<GlobalAdminGoogleDriveConfig>(() =>
    contractService.getGoogleDriveConfig()
  )

  const loadData = async () => {
    setLoading(true)
    try {
      const [loadedProposals, loadedContracts, loadedPlans, loadedModules] = await Promise.all([
        contractService.listProposals(),
        contractService.listContracts(),
        permissionGroupService.listPermissionGroups(),
        permissionGroupService.listModules(),
      ])
      setProposals(loadedProposals)
      setContracts(loadedContracts)
      setPlans(loadedPlans)
      setModules(loadedModules)
    } catch {
      toast.error('Erro ao carregar solicitações e contratos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const totalContractValue = useMemo(() => {
    return Math.max(0, Number((basePrice + addonsPrice - discountValue).toFixed(2)))
  }, [basePrice, addonsPrice, discountValue])

  const draftContractObject: PlatformContract = useMemo(
    () => ({
      id: editingContractId || 'preview',
      proposalId: linkedProposalId,
      contractNumber,
      title: contractTitle,
      providerName,
      providerDocument,
      providerEmail,
      providerRepresentative,
      customerName: customerName || '[Nome do Cliente]',
      customerDocument,
      customerEmail,
      customerPhone,
      customerAddress,
      purchasedProduct,
      additionalModules: selectedAddonNames,
      billingCycle,
      basePrice,
      addonsPrice,
      discountValue,
      totalValue: totalContractValue,
      paymentTerms,
      effectiveDate,
      customTerms,
      status: contractStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      editingContractId,
      linkedProposalId,
      contractNumber,
      contractTitle,
      providerName,
      providerDocument,
      providerEmail,
      providerRepresentative,
      customerName,
      customerDocument,
      customerEmail,
      customerPhone,
      customerAddress,
      purchasedProduct,
      selectedAddonNames,
      billingCycle,
      basePrice,
      addonsPrice,
      discountValue,
      totalContractValue,
      paymentTerms,
      effectiveDate,
      customTerms,
      contractStatus,
    ]
  )

  const interpolatedPreviewText = useMemo(
    () => contractService.interpolateContractTerms(draftContractObject),
    [draftContractObject]
  )

  // Convert a Landing Page Proposal into a pre-filled Contract in 1 click
  const handleCreateContractFromProposal = (proposal: CommercialPlanProposal) => {
    setEditingContractId(null)
    setLinkedProposalId(proposal.id)
    setContractNumber(contractService.generateContractNumber())
    setContractTitle(
      `Contrato de Licenciamento SaaS — ${proposal.companyName || proposal.customerName}`
    )
    setCustomerName(
      proposal.companyName
        ? `${proposal.customerName} (${proposal.companyName})`
        : proposal.customerName
    )
    setCustomerDocument('')
    setCustomerEmail(proposal.customerEmail)
    setCustomerPhone(proposal.customerPhone)
    setCustomerAddress('')
    setPurchasedProduct(proposal.selectedPlanName)
    setSelectedAddonNames(proposal.selectedAddonModules.map((m) => m.name))
    setBillingCycle(proposal.billingCycle)
    setBasePrice(proposal.selectedPlanBasePrice)
    setAddonsPrice(proposal.addonsTotalPrice)
    setDiscountValue(0)
    setContractStatus('DRAFT')
    setCustomTerms(DEFAULT_CONTRACT_TERMS_TEMPLATE)
    setActiveSection('CONTRACT_MANAGER')
    toast.success(
      `Dados de "${proposal.customerName}" carregados no Gerenciador de Contratos!`
    )
  }

  const handleEditSavedContract = (contract: PlatformContract) => {
    setEditingContractId(contract.id)
    setLinkedProposalId(contract.proposalId || null)
    setContractNumber(contract.contractNumber)
    setContractTitle(contract.title)
    setProviderName(contract.providerName)
    setProviderDocument(contract.providerDocument)
    setProviderEmail(contract.providerEmail)
    setProviderRepresentative(contract.providerRepresentative)
    setCustomerName(contract.customerName)
    setCustomerDocument(contract.customerDocument)
    setCustomerEmail(contract.customerEmail)
    setCustomerPhone(contract.customerPhone)
    setCustomerAddress(contract.customerAddress)
    setPurchasedProduct(contract.purchasedProduct)
    setSelectedAddonNames(contract.additionalModules || [])
    setBillingCycle(contract.billingCycle)
    setBasePrice(contract.basePrice)
    setAddonsPrice(contract.addonsPrice)
    setDiscountValue(contract.discountValue)
    setPaymentTerms(contract.paymentTerms)
    setEffectiveDate(contract.effectiveDate)
    setContractStatus(contract.status)
    setCustomTerms(contract.customTerms)
    setActiveSection('CONTRACT_MANAGER')
    toast.info(`Editando contrato ${contract.contractNumber}`)
  }

  const handleResetNewContract = () => {
    setEditingContractId(null)
    setLinkedProposalId(null)
    setContractNumber(contractService.generateContractNumber())
    setContractTitle('Contrato de Licenciamento de Software SaaS e Módulos Adicionais')
    setCustomerName('')
    setCustomerDocument('')
    setCustomerEmail('')
    setCustomerPhone('')
    setCustomerAddress('')
    setPurchasedProduct('ERP Completo + PDV + Filiais')
    setSelectedAddonNames([])
    setBillingCycle('MONTHLY')
    setBasePrice(189.9)
    setAddonsPrice(0)
    setDiscountValue(0)
    setContractStatus('DRAFT')
    setCustomTerms(DEFAULT_CONTRACT_TERMS_TEMPLATE)
  }

  const handleSaveContract = async () => {
    if (!customerName.trim()) {
      toast.error('Informe o Nome do Cliente (Contratante) antes de salvar.')
      return
    }
    if (!providerName.trim()) {
      toast.error('Informe o Meu Nome / Contratada antes de salvar.')
      return
    }
    if (!purchasedProduct.trim()) {
      toast.error('Informe o Produto / Plano comprado.')
      return
    }

    setSavingContract(true)
    try {
      const saved = await contractService.saveContract({
        id: editingContractId || undefined,
        proposalId: linkedProposalId,
        contractNumber,
        title: contractTitle,
        providerName,
        providerDocument,
        providerEmail,
        providerRepresentative,
        customerName,
        customerDocument,
        customerEmail,
        customerPhone,
        customerAddress,
        purchasedProduct,
        additionalModules: selectedAddonNames,
        billingCycle,
        basePrice,
        addonsPrice,
        discountValue,
        totalValue: totalContractValue,
        paymentTerms,
        effectiveDate,
        customTerms,
        status: contractStatus,
        createdBy: user?.id,
      })

      setEditingContractId(saved.id)

      if (linkedProposalId) {
        await contractService.updateProposalStatus(linkedProposalId, 'CONTRACT_GENERATED')
      }

      if (driveConfig.enabled && driveConfig.autoSyncOnSave) {
        const syncResult = await contractService.syncContractToGoogleDrive(saved)
        if (syncResult.success) {
          toast.success('Contrato salvo no Supabase e sincronizado com o Google Drive!')
        } else {
          toast.success('Contrato salvo no Supabase!')
        }
      } else {
        toast.success('Contrato salvo com sucesso no Supabase!')
      }

      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar contrato.')
    } finally {
      setSavingContract(false)
    }
  }

  const handleSyncToGoogleDrive = async (contractToSync?: PlatformContract) => {
    const target = contractToSync || draftContractObject
    if (!target.customerName || target.customerName === '[Nome do Cliente]') {
      toast.error('Preencha o Nome do Cliente antes de enviar ao Google Drive.')
      return
    }

    setSyncingDrive(true)
    try {
      const saved =
        target.id === 'preview'
          ? await contractService.saveContract({
              ...target,
              id: undefined,
              createdBy: user?.id,
            })
          : target

      const res = await contractService.syncContractToGoogleDrive(saved)
      toast.success(res.message)
      if (!driveConfig.accessToken && res.webViewLink) {
        await contractService.exportContractAsDOCX(saved)
        window.open(res.webViewLink, '_blank', 'noopener,noreferrer')
      }
      await loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível sincronizar com o Google Drive.')
    } finally {
      setSyncingDrive(false)
    }
  }

  const handleSaveDriveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    contractService.saveGoogleDriveConfig(driveConfig)
    setDriveModalOpen(false)
    toast.success('Configuração do Google Drive do Global Admin salva!')
  }

  const toggleAddonSelection = (mod: PermissionModule) => {
    setSelectedAddonNames((prev) => {
      const exists = prev.includes(mod.name)
      const next = exists ? prev.filter((item) => item !== mod.name) : [...prev, mod.name]
      const newAddonsTotal = modules
        .filter((m) => next.includes(m.name))
        .reduce((acc, m) => acc + (m.monthlyPrice || 0), 0)
      setAddonsPrice(Number(newAddonsTotal.toFixed(2)))
      return next
    })
  }

  const insertVariableIntoTerms = (token: string) => {
    setCustomTerms((prev) => `${prev}\n${token}`)
    toast.info(`Variável ${token} adicionada ao final dos termos.`)
  }

  const openWhatsAppContact = (proposal: CommercialPlanProposal) => {
    const cleanPhone = proposal.customerPhone.replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
    const addonsText =
      proposal.selectedAddonModules.length > 0
        ? ` + adicionais (${proposal.selectedAddonModules.map((a) => a.name).join(', ')})`
        : ''
    const message = encodeURIComponent(
      `Olá ${proposal.customerName}! Recebemos sua solicitação de proposta na plataforma Olivelas para o plano *${proposal.selectedPlanName}*${addonsText} no valor de R$ ${proposal.totalPrice.toFixed(2)}. Podemos avançar com a liberação do seu ambiente e envio do contrato?`
    )
    window.open(`https://wa.me/${fullPhone}?text=${message}`, '_blank', 'noopener,noreferrer')
  }

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    const q = proposalSearch.trim().toLowerCase()
    return proposals.filter((p) => {
      const matchesStatus =
        proposalStatusFilter === 'ALL' || p.status === proposalStatusFilter
      const matchesQuery =
        !q ||
        p.customerName.toLowerCase().includes(q) ||
        p.customerEmail.toLowerCase().includes(q) ||
        p.customerPhone.toLowerCase().includes(q) ||
        (p.companyName || '').toLowerCase().includes(q) ||
        p.selectedPlanName.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [proposals, proposalSearch, proposalStatusFilter])

  const totalProposalPages = Math.max(
    1,
    Math.ceil(filteredProposals.length / proposalPageSize)
  )

  const paginatedProposals = useMemo(() => {
    const start = (proposalPage - 1) * proposalPageSize
    return filteredProposals.slice(start, start + proposalPageSize)
  }, [filteredProposals, proposalPage, proposalPageSize])

  // KPIs
  const newProposalsCount = proposals.filter((p) => p.status === 'NEW').length
  const totalPipelineValue = proposals.reduce((acc, p) => acc + (p.totalPrice || 0), 0)

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <PageHeader
          title="Novos Contratos & Gerenciador de Contratos"
          badge={<Badge variant="outline">Comercial & Jurídico</Badge>}
        />
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">
            Novos Contratos & Gerenciador de Contratos
          </h2>
          <p className="text-xs text-muted-foreground">
            Visualize propostas personalizadas na Landing Page, entre em contato com clientes e emita contratos em HTML, DOCX e PDF com armazenamento no Supabase e Google Drive.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDriveModalOpen(true)}
            className="text-xs font-semibold"
          >
            <CloudUpload className="h-4 w-4 mr-1.5 text-primary" />
            Google Drive ({driveConfig.enabled ? 'Vinculado' : 'Configurar'})
          </Button>
          <Button
            variant={activeSection === 'PROPOSALS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('PROPOSALS')}
            className="text-xs font-bold"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Novos Contratos ({proposals.length})
          </Button>
          <Button
            variant={activeSection === 'CONTRACT_MANAGER' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('CONTRACT_MANAGER')}
            className="text-xs font-bold"
          >
            <FileSignature className="h-4 w-4 mr-1.5" />
            Gerenciador de Contratos ({contracts.length})
          </Button>
        </div>
      </div>

      {/* SECTION 1: NOVOS CONTRATOS (PROPOSALS FROM LANDING PAGE) */}
      {activeSection === 'PROPOSALS' && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            <Card className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Novas Solicitações Pendentes</p>
                <p className="text-xl font-extrabold text-foreground">{newProposalsCount}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Pré-Cadastros</p>
                <p className="text-xl font-extrabold text-foreground">{proposals.length}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline em Propostas</p>
                <p className="text-xl font-extrabold text-foreground">
                  R$ {totalPipelineValue.toFixed(2)}
                </p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contratos Emitidos (Supabase)</p>
                <p className="text-xl font-extrabold text-foreground">{contracts.length}</p>
              </div>
            </Card>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome, e-mail, celular, empresa ou plano..."
                value={proposalSearch}
                onChange={(e) => {
                  setProposalSearch(e.target.value)
                  setProposalPage(1)
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(['ALL', 'NEW', 'CONTACTED', 'CONTRACT_GENERATED', 'SIGNED'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setProposalStatusFilter(st)
                      setProposalPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      proposalStatusFilter === st
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-surface text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    {st === 'ALL' ? 'Todas' : PROPOSAL_STATUS_LABELS[st as ProposalStatus] || st}
                  </button>
                )
              )}
              <Button
                size="sm"
                onClick={() => {
                  handleResetNewContract()
                  setActiveSection('CONTRACT_MANAGER')
                }}
                className="text-xs font-bold"
              >
                <Plus className="h-4 w-4 mr-1" /> Novo Contrato Manual
              </Button>
            </div>
          </div>

          {/* Proposals Full-Height Table Card */}
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  Carregando solicitações de planos...
                </div>
              ) : paginatedProposals.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">
                    Nenhuma solicitação encontrada para os filtros selecionados.
                  </p>
                  <p>
                    Quando um visitante personalizar um plano e preencher Nome, E-mail e Celular na Landing Page, a solicitação aparecerá aqui automaticamente.
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                  <ResponsiveTable>
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4">Cliente / Empresa</th>
                        <th className="py-3 px-4">Contato (E-mail & Celular)</th>
                        <th className="py-3 px-4">Plano Escolhido</th>
                        <th className="py-3 px-4">Módulos Adicionais Avulsos</th>
                        <th className="py-3 px-4">Valor Proposta</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {paginatedProposals.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="font-bold text-foreground">{row.customerName}</div>
                              {row.companyName && (
                                <div className="text-[11px] text-primary font-medium flex items-center gap-1">
                                  <Building2 className="h-3 w-3" /> {row.companyName}
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(row.createdAt).toLocaleString('pt-BR')}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-foreground">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <a
                                  href={`mailto:${row.customerEmail}`}
                                  className="hover:underline truncate max-w-[180px]"
                                >
                                  {row.customerEmail}
                                </a>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="font-mono text-[11px]">{row.customerPhone}</span>
                                <button
                                  type="button"
                                  onClick={() => openWhatsAppContact(row)}
                                  className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors inline-flex items-center gap-1"
                                >
                                  <MessageCircle className="h-3 w-3" /> WhatsApp
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="font-semibold text-foreground">
                                {row.selectedPlanName}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">
                                  {row.billingCycle === 'YEARLY' ? 'Ciclo Anual' : 'Ciclo Mensal'}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {row.estimatedEmployees} func.
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {row.selectedAddonModules && row.selectedAddonModules.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {row.selectedAddonModules.map((mod) => (
                                  <span
                                    key={mod.code}
                                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium"
                                  >
                                    + {mod.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Sem adicionais avulsos
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                              R$ {Number(row.totalPrice || 0).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Base: R$ {Number(row.selectedPlanBasePrice || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={row.status}
                              onChange={async (e) => {
                                const nextStatus = e.target.value as ProposalStatus
                                await contractService.updateProposalStatus(row.id, nextStatus)
                                toast.success('Status da solicitação atualizado!')
                                loadData()
                              }}
                              className="h-8 rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-foreground"
                            >
                              <option value="NEW">Nova Solicitação</option>
                              <option value="CONTACTED">Em Contato</option>
                              <option value="CONTRACT_GENERATED">Contrato Gerado</option>
                              <option value="SIGNED">Assinado</option>
                              <option value="ARCHIVED">Arquivado</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleCreateContractFromProposal(row)}
                                className="h-8 text-xs font-bold"
                              >
                                <FileSignature className="h-3.5 w-3.5 mr-1.5" /> Gerar Contrato
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await contractService.deleteProposal(row.id)
                                  toast.success('Solicitação removida.')
                                  loadData()
                                }}
                                className="h-8 w-8 p-0 text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </ResponsiveTable>
                </div>
              )}
            </CardContent>

            <div className="p-3 border-t border-border bg-surface shrink-0">
              <Pagination
                currentPage={proposalPage}
                totalPages={totalProposalPages}
                totalItems={filteredProposals.length}
                pageSize={proposalPageSize}
                onPageChange={setProposalPage}
                onPageSizeChange={setProposalPageSize}
              />
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2: GERENCIADOR DE CONTRATOS (HTML, DOCX, PDF + SUPABASE + GOOGLE DRIVE) */}
      {activeSection === 'CONTRACT_MANAGER' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-8">
          {/* Left Column: Contract Form & Saved Contracts List */}
          <div className="xl:col-span-7 space-y-6">
            {/* Saved Contracts Strip */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Contratos Armazenados no Supabase ({contracts.length})
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetNewContract}
                  className="h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Criar Novo Contrato Limpo
                </Button>
              </div>

              {contracts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum contrato salvo ainda. Preencha os campos abaixo e clique em &quot;Salvar no Supabase&quot;.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {contracts.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-2 transition-all ${
                        editingContractId === c.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-surface hover:border-primary/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-primary">
                            {c.contractNumber}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {CONTRACT_STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        </div>
                        <div className="font-bold text-foreground truncate">{c.customerName}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.purchasedProduct} · R$ {Number(c.totalValue || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSavedContract(c)}
                            className="h-7 px-2 text-[11px]"
                          >
                            <Edit3 className="h-3 w-3 mr-1" /> Abrir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => contractService.exportContractAsDOCX(c)}
                            className="h-7 px-2 text-[11px]"
                            title="Baixar DOCX"
                          >
                            DOCX
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => contractService.exportContractAsPDF(c)}
                            className="h-7 px-2 text-[11px]"
                            title="Exportar PDF"
                          >
                            PDF
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await contractService.deleteContract(c.id)
                            toast.success('Contrato excluído.')
                            loadData()
                          }}
                          className="h-7 w-7 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Contract Generator Form */}
            <Card className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    {editingContractId
                      ? `Editando Contrato ${contractNumber}`
                      : `Novo Contrato (${contractNumber})`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Personalize as partes, o produto comprado, os termos e exporte em HTML, DOCX ou PDF.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={contractStatus}
                    onChange={(e) => setContractStatus(e.target.value as ContractStatus)}
                    className="h-9 rounded-lg border border-border bg-surface px-3 text-xs font-semibold"
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="SENT_FOR_SIGNATURE">Enviado p/ Assinatura</option>
                    <option value="SIGNED">Assinado / Vigente</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Identificação do Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Número do Contrato
                  </label>
                  <Input
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Título do Instrumento Contratual
                  </label>
                  <Input
                    value={contractTitle}
                    onChange={(e) => setContractTitle(e.target.value)}
                  />
                </div>
              </div>

              {/* 1. Dados da Contratada ("Meu Nome") */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  1. Dados da Contratada (Meu Nome / Plataforma)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Meu Nome / Razão Social da Contratada *
                    </label>
                    <Input
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      placeholder="Seu Nome ou Empresa"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      CPF / CNPJ da Contratada
                    </label>
                    <Input
                      value={providerDocument}
                      onChange={(e) => setProviderDocument(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Representante Legal (Assinante)
                    </label>
                    <Input
                      value={providerRepresentative}
                      onChange={(e) => setProviderRepresentative(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      E-mail da Contratada
                    </label>
                    <Input
                      value={providerEmail}
                      onChange={(e) => setProviderEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Dados do Cliente ("Nome do Cliente") */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  2. Dados do Cliente (Contratante)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Nome do Cliente / Razão Social *
                    </label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex.: Supermercado & Hortifruti Silva Ltda"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      CPF / CNPJ do Cliente
                    </label>
                    <Input
                      value={customerDocument}
                      onChange={(e) => setCustomerDocument(e.target.value)}
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      E-mail do Cliente
                    </label>
                    <Input
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="cliente@empresa.com.br"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Celular / WhatsApp do Cliente
                    </label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Endereço Comercial do Cliente (opcional)
                    </label>
                    <Input
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Produto Comprado, Módulos Adicionais & Valores */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    <span>3. Produto Comprado, Módulos Adicionais & Valores</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Produto / Plano Comprado *
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={purchasedProduct}
                        onChange={(e) => setPurchasedProduct(e.target.value)}
                        placeholder="Nome do plano ou pacote contratado"
                      />
                      <select
                        onChange={(e) => {
                          const found = plans.find((p) => p.id === e.target.value)
                          if (found) {
                            setPurchasedProduct(found.name)
                            setBasePrice(
                              billingCycle === 'YEARLY'
                                ? found.annualPrice
                                : found.baseMonthlyPrice
                            )
                          }
                        }}
                        className="h-10 rounded-lg border border-border bg-surface px-2 text-xs"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Carregar Plano...
                        </option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (R$ {p.baseMonthlyPrice})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Ciclo de Cobrança
                    </label>
                    <select
                      value={billingCycle}
                      onChange={(e) =>
                        setBillingCycle(e.target.value as 'MONTHLY' | 'YEARLY')
                      }
                      className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-xs font-semibold"
                    >
                      <option value="MONTHLY">Mensal</option>
                      <option value="YEARLY">Anual</option>
                    </select>
                  </div>
                </div>

                {/* Addon Modules Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Módulos Adicionais Avulsos Inclusos no Contrato ({selectedAddonNames.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {modules.map((mod) => {
                      const active = selectedAddonNames.includes(mod.name)
                      return (
                        <button
                          key={mod.code}
                          type="button"
                          onClick={() => toggleAddonSelection(mod)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-surface text-muted-foreground border-border hover:text-foreground'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {mod.name} (R$ {mod.monthlyPrice.toFixed(2)})
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Valor Base (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={basePrice}
                      onChange={(e) => setBasePrice(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Adicionais (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={addonsPrice}
                      onChange={(e) => setAddonsPrice(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Desconto (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-primary">
                      Valor Final (R$)
                    </label>
                    <div className="h-10 rounded-lg border-2 border-primary/40 bg-primary/5 px-3 flex items-center font-extrabold text-sm text-primary">
                      R$ {totalContractValue.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Condições e Forma de Pagamento
                    </label>
                    <Input
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Início da Vigência
                    </label>
                    <Input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Termos Personalizados do Contrato */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-primary">
                      4. Cláusulas e Termos Personalizados do Contrato
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Clique nas variáveis abaixo para inserir marcadores dinâmicos ou edite livremente o texto.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setCustomTerms(DEFAULT_CONTRACT_TERMS_TEMPLATE)}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar Minuta Padrão
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariableIntoTerms(v.token)}
                      className="px-2 py-1 rounded-md bg-muted hover:bg-primary/15 hover:text-primary border border-border text-[10px] font-mono transition-colors"
                      title={`Inserir ${v.token}`}
                    >
                      {v.label} ({v.token})
                    </button>
                  ))}
                </div>

                <textarea
                  rows={14}
                  value={customTerms}
                  onChange={(e) => setCustomTerms(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface p-4 text-xs font-mono leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Action Bar: Save to Supabase, Sync Google Drive, Export HTML / DOCX / PDF */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveContract}
                    disabled={savingContract}
                    className="font-bold text-xs"
                  >
                    <Database className="h-4 w-4 mr-1.5" />
                    {savingContract ? 'Salvando no Supabase...' : 'Salvar no Supabase'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={syncingDrive}
                    onClick={() => handleSyncToGoogleDrive()}
                    className="font-semibold text-xs"
                  >
                    <CloudUpload className="h-4 w-4 mr-1.5 text-primary" />
                    {syncingDrive ? 'Sincronizando...' : 'Vincular / Enviar ao Google Drive'}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      contractService.exportContractAsHTML(draftContractObject)
                      toast.success('Contrato exportado em HTML (.html) para assinatura!')
                    }}
                    className="text-xs font-bold"
                  >
                    <FileCode2 className="h-4 w-4 mr-1.5 text-amber-500" />
                    Exportar HTML
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await contractService.exportContractAsDOCX(draftContractObject)
                      toast.success('Contrato exportado em Word (.docx) para assinatura!')
                    }}
                    className="text-xs font-bold"
                  >
                    <FileText className="h-4 w-4 mr-1.5 text-sky-500" />
                    Exportar DOCX
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      contractService.exportContractAsPDF(draftContractObject)
                      toast.success('Janela de geração de PDF para assinatura aberta!')
                    }}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Live A4 Contract Preview */}
          <div className="xl:col-span-5 space-y-4">
            <Card className="p-5 space-y-4 xl:sticky xl:top-20">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Visualização em Tempo Real (Minuta p/ Assinatura)
                  </h3>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowLivePreview((v) => !v)}
                  className="h-7 text-xs"
                >
                  {showLivePreview ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>

              {showLivePreview && (
                <div className="rounded-xl bg-white text-slate-900 p-6 sm:p-8 shadow-inner border border-slate-200 max-h-[760px] overflow-y-auto space-y-5 font-serif text-xs leading-relaxed">
                  <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                    <div className="text-[10px] font-sans uppercase tracking-widest text-slate-500">
                      Instrumento Particular · Nº {contractNumber}
                    </div>
                    <h4 className="text-sm font-bold uppercase text-slate-900">
                      {contractTitle}
                    </h4>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 font-sans text-[11px] space-y-1.5">
                    <div>
                      <strong>CONTRATADA (MEU NOME):</strong> {providerName} ({providerDocument})
                    </div>
                    <div>
                      <strong>CONTRATANTE (CLIENTE):</strong>{' '}
                      {customerName || '[Nome do Cliente]'} ({customerDocument || 'Doc. a informar'})
                    </div>
                    <div>
                      <strong>PRODUTO COMPRADO:</strong> {purchasedProduct} (
                      {billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'})
                    </div>
                    <div>
                      <strong>MÓDULOS ADICIONAIS:</strong>{' '}
                      {selectedAddonNames.length > 0
                        ? selectedAddonNames.join(', ')
                        : 'Sem módulos avulsos adicionais'}
                    </div>
                    <div className="text-emerald-700 font-bold pt-1 border-t border-slate-200">
                      VALOR TOTAL CONTRATADO: R$ {totalContractValue.toFixed(2)}
                    </div>
                  </div>

                  {/* Interpolated Body */}
                  <div className="space-y-2.5 whitespace-pre-line text-justify">
                    {interpolatedPreviewText}
                  </div>

                  {/* Signatures Preview */}
                  <div className="pt-10 grid grid-cols-2 gap-6 text-center font-sans text-[11px]">
                    <div className="border-t border-slate-900 pt-2">
                      <div className="font-bold">{providerName}</div>
                      <div className="text-slate-600">{providerRepresentative}</div>
                      <div className="text-[10px] text-slate-400">CONTRATADA</div>
                    </div>
                    <div className="border-t border-slate-900 pt-2">
                      <div className="font-bold">{customerName || '[Nome do Cliente]'}</div>
                      <div className="text-slate-600">
                        {customerDocument || 'Representante Legal'}
                      </div>
                      <div className="text-[10px] text-slate-400">CONTRATANTE</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Modal: Google Drive Integration for Global Admin (modeled after Store Backup Drive Module) */}
      <Modal
        isOpen={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        title="Vincular Google Drive do Global Admin (Contratos)"
      >
        <form onSubmit={handleSaveDriveConfig} className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Assim como no módulo de armazenamento das lojas, os contratos são salvos primariamente no{' '}
            <strong className="text-foreground">Supabase</strong> (tabela{' '}
            <code>platform_contracts</code> + bucket Storage) e podem ser vinculados ao{' '}
            <strong className="text-foreground">Google Drive do Global Admin</strong>.
          </p>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/30 cursor-pointer">
            <input
              type="checkbox"
              checked={driveConfig.enabled}
              onChange={(e) =>
                setDriveConfig((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="h-4 w-4 accent-primary"
            />
            <div className="text-xs">
              <div className="font-bold text-foreground">
                Ativar vinculação com Google Drive do Global Admin
              </div>
              <div className="text-muted-foreground">
                Habilita envio de contratos e atalho direto para a pasta de contratos no Drive
              </div>
            </div>
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Link ou ID da Pasta no Google Drive *
            </label>
            <Input
              placeholder="https://drive.google.com/drive/folders/1a2b3c4d5e..."
              value={driveConfig.folderUrlOrId}
              onChange={(e) =>
                setDriveConfig((prev) => ({ ...prev, folderUrlOrId: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              E-mail da Conta Google do Global Admin
            </label>
            <Input
              type="email"
              placeholder="admin@olivelas.com.br"
              value={driveConfig.clientEmail}
              onChange={(e) =>
                setDriveConfig((prev) => ({ ...prev, clientEmail: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              OAuth2 Access Token do Google Drive API (opcional p/ upload direto via API v3)
            </label>
            <Input
              type="password"
              placeholder="ya29.a0AfH6SM..."
              value={driveConfig.accessToken || ''}
              onChange={(e) =>
                setDriveConfig((prev) => ({ ...prev, accessToken: e.target.value }))
              }
            />
            <p className="text-[11px] text-muted-foreground">
              Se preenchido, o sistema envia o arquivo diretamente via API REST{' '}
              <code>googleapis.com/upload/drive/v3/files</code> para a pasta informada. Caso em branco, abre a pasta vinculada e baixa o contrato pronto.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={driveConfig.autoSyncOnSave}
              onChange={(e) =>
                setDriveConfig((prev) => ({ ...prev, autoSyncOnSave: e.target.checked }))
              }
              className="h-4 w-4 accent-primary"
            />
            <span>Sincronizar automaticamente com o Google Drive ao salvar no Supabase</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            {driveConfig.folderUrlOrId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = driveConfig.folderUrlOrId.startsWith('http')
                    ? driveConfig.folderUrlOrId
                    : `https://drive.google.com/drive/folders/${driveConfig.folderUrlOrId}`
                  window.open(link, '_blank', 'noopener,noreferrer')
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir Pasta no Drive
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setDriveModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Salvar Vinculação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
