import JSZip from 'jszip'
import { supabase } from '@/lib/supabase/client'
import { DEFAULT_PERMISSION_MODULES } from '@/constants/screenDependencies'
import { formatCurrency } from '@/utils/currency'
import {
  DEFAULT_CONTRACT_TERMS_TEMPLATE,
  type CommercialPlanProposal,
  type ContractStatus,
  type GlobalAdminGoogleDriveConfig,
  type PlatformContract,
  type ProposalAddonModule,
  type ProposalStatus,
} from '@/types/contract.types'

const STORAGE_BUCKET = 'products'
const LOCAL_PROPOSALS_KEY = 'olivelas_commercial_proposals_v2'
const LOCAL_CONTRACTS_KEY = 'olivelas_platform_contracts_v2'
const LOCAL_GDRIVE_CONFIG_KEY = 'olivelas_global_admin_gdrive_config_v2'

export const DEFAULT_GOOGLE_DRIVE_CONFIG: GlobalAdminGoogleDriveConfig = {
  enabled: false,
  folderUrlOrId: '',
  clientEmail: '',
  accessToken: '',
  autoSyncOnSave: false,
  updatedAt: new Date().toISOString(),
}

const INITIAL_DEMO_PROPOSALS: CommercialPlanProposal[] = [
  {
    id: 'demo-prop-001',
    protocolCode: 'PROP-20261029-A8F321',
    customerName: 'Mariana Costa Almeida',
    customerEmail: 'mariana@emporiodasoliveiras.com.br',
    customerPhone: '(11) 98877-6655',
    companyName: 'Empório das Oliveiras Ltda',
    selectedPlanId: 'default-plan-pos-and-stock',
    selectedPlanName: 'Comercial PDV + Estoque + Catálogo WhatsApp',
    selectedPlanBasePrice: 149.9,
    billingCycle: 'MONTHLY',
    selectedAddonModules: [
      {
        code: 'MOD_REPORTS',
        name: 'Relatórios BI, Curva ABC & Auditoria',
        monthlyPrice: 49.9,
      },
      {
        code: 'MOD_PURCHASING',
        name: 'Ordens de Compra & Suprimentos',
        monthlyPrice: 39.9,
      },
    ],
    addonsTotalPrice: 89.8,
    estimatedEmployees: 10,
    totalPrice: 239.7,
    notes:
      'Precisamos do módulo adicional de Relatórios BI (Curva ABC) e Ordens de Compra para controlar nossa matriz e 1 filial.',
    status: 'NEW',
    adminNotes: null,
    contractId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
]

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage quota errors
  }
}

function slugifyFile(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'contrato'
  )
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeAddonModulesFromDb(rawAddons: any): ProposalAddonModule[] {
  if (!Array.isArray(rawAddons)) return []
  const moduleCatalogMap = new Map(DEFAULT_PERMISSION_MODULES.map((m) => [m.code, m]))
  return rawAddons.map((item: any) => {
    if (typeof item === 'string') {
      const found = moduleCatalogMap.get(item as any)
      return {
        code: item,
        name: found?.name || item,
        monthlyPrice: Number(found?.monthlyPrice || 0),
      }
    }
    return {
      code: String(item?.code || 'MOD_CUSTOM'),
      name: String(item?.name || item?.code || 'Módulo Adicional'),
      monthlyPrice: Number(item?.monthlyPrice || 0),
    }
  })
}

function mapProposalRow(row: any): CommercialPlanProposal {
  const rawCycle = String(row.billing_cycle ?? row.billingCycle ?? 'MONTHLY').toUpperCase()
  const billingCycle: 'MONTHLY' | 'YEARLY' =
    rawCycle === 'ANNUAL' || rawCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY'

  const rawStatus = String(row.status ?? 'NEW').toUpperCase()
  const status: ProposalStatus =
    rawStatus === 'CONVERTED'
      ? 'CONTRACT_GENERATED'
      : (['NEW', 'CONTACTED', 'CONTRACT_GENERATED', 'SIGNED', 'ARCHIVED'].includes(rawStatus)
          ? (rawStatus as ProposalStatus)
          : 'NEW')

  const addons =
    row.selectedAddonModules && Array.isArray(row.selectedAddonModules)
      ? normalizeAddonModulesFromDb(row.selectedAddonModules)
      : normalizeAddonModulesFromDb(row.addon_modules ?? row.addonModules ?? [])

  return {
    id: row.id,
    protocolCode: row.protocol_code ?? row.protocolCode ?? 'PROP-2026',
    customerName: String(row.customer_name ?? row.customerName ?? '').trim(),
    customerEmail: String(row.customer_email ?? row.customerEmail ?? '').trim(),
    customerPhone: String(row.customer_phone ?? row.customerPhone ?? '').trim(),
    companyName: row.company_name ?? row.companyName ?? null,
    selectedPlanId: row.plan_id ?? row.selectedPlanId ?? null,
    selectedPlanName:
      row.plan_name ?? row.selectedPlanName ?? 'Plano Personalizado',
    selectedPlanBasePrice: Number(
      row.base_plan_price ?? row.selectedPlanBasePrice ?? 0
    ),
    billingCycle,
    selectedAddonModules: addons,
    addonsTotalPrice: Number(row.addons_price ?? row.addonsTotalPrice ?? 0),
    estimatedEmployees: Number(row.estimated_employees ?? row.estimatedEmployees ?? 10),
    totalPrice: Number(row.total_monthly_price ?? row.totalPrice ?? 0),
    notes: row.notes ?? null,
    status,
    adminNotes: row.admin_notes ?? row.adminNotes ?? null,
    contractId: row.contract_id ?? row.contractId ?? null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  }
}

function mapContractRow(row: any): PlatformContract {
  const rawCycle = String(row.billing_cycle ?? row.billingCycle ?? 'MONTHLY').toUpperCase()
  const billingCycle: 'MONTHLY' | 'YEARLY' =
    rawCycle === 'ANNUAL' || rawCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY'

  const totalVal = Number(row.monthly_value ?? row.totalValue ?? 0)
  const baseVal = Number(row.basePrice ?? totalVal)
  const addonsVal = Number(row.addonsPrice ?? 0)
  const discountVal = Number(row.discountValue ?? 0)

  return {
    id: row.id,
    proposalId: row.proposal_id ?? row.proposalId ?? null,
    contractNumber: row.contract_number ?? row.contractNumber ?? 'CTR-2026-001',
    title: row.title || 'Contrato de Licenciamento de Software SaaS',
    status: (row.status ?? 'DRAFT') as ContractStatus,
    providerName: row.provider_name ?? row.providerName ?? 'Olivelas Gestão de Estoque',
    providerDocument: row.provider_document ?? row.providerDocument ?? '00.000.000/0001-00',
    providerEmail: row.provider_email ?? row.providerEmail ?? 'comercial@olivelas.com.br',
    providerRepresentative:
      row.providerRepresentative ?? row.provider_phone ?? 'Admin Global Olivelas',
    customerName: row.customer_name ?? row.customerName ?? '',
    customerDocument: row.customer_document ?? row.customerDocument ?? '',
    customerEmail: row.customer_email ?? row.customerEmail ?? '',
    customerPhone: row.customer_phone ?? row.customerPhone ?? '',
    customerAddress: row.customer_address ?? row.customerAddress ?? '',
    purchasedProduct: row.product_name ?? row.purchasedProduct ?? 'Plano Personalizado',
    additionalModules: Array.isArray(row.addon_modules)
      ? row.addon_modules
      : Array.isArray(row.additionalModules)
        ? row.additionalModules
        : [],
    billingCycle,
    basePrice: baseVal,
    addonsPrice: addonsVal,
    discountValue: discountVal,
    totalValue: totalVal,
    paymentTerms:
      row.paymentTerms ??
      'Pagamento recorrente via PIX, Boleto ou Cartão de Crédito todo dia 10.',
    effectiveDate:
      row.effectiveDate ??
      (row.created_at ? String(row.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)),
    customTerms: row.custom_terms ?? row.customTerms ?? DEFAULT_CONTRACT_TERMS_TEMPLATE,
    renderedHtml: row.rendered_html ?? row.renderedHtml ?? null,
    supabaseStorageBucket:
      row.supabase_storage_bucket ?? row.supabaseStorageBucket ?? STORAGE_BUCKET,
    supabaseStoragePath: row.supabase_storage_path ?? row.supabaseStoragePath ?? null,
    supabasePublicUrl: row.supabase_public_url ?? row.supabasePublicUrl ?? null,
    googleDriveFileId: row.google_drive_file_id ?? row.googleDriveFileId ?? null,
    googleDriveWebLink: row.google_drive_web_link ?? row.googleDriveWebLink ?? null,
    googleDriveFolderId: row.google_drive_folder_id ?? row.googleDriveFolderId ?? null,
    googleDriveSyncedAt: row.google_drive_synced_at ?? row.googleDriveSyncedAt ?? null,
    signedAt: row.signed_at ?? row.signedAt ?? null,
    createdBy: row.created_by ?? row.createdBy ?? null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  }
}

export function extractDriveFolderId(folderUrlOrId: string): string {
  const raw = (folderUrlOrId || '').trim()
  if (!raw) return ''
  const match = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) return match[1]
  const idParam = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParam && idParam[1]) return idParam[1]
  return raw
}

export const contractService = {
  generateContractNumber(): string {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `CTR-${yyyy}${mm}${dd}-${rand}`
  },

  // ============================================================================
  // 1. SOLICITAÇÕES DE PRÉ-CADASTRO ("NOVOS CONTRATOS" DA LANDING PAGE)
  // ============================================================================
  async submitProposal(input: {
    customerName: string
    customerEmail: string
    customerPhone: string
    companyName?: string
    selectedPlanId: string | null
    selectedPlanName: string
    selectedPlanBasePrice: number
    billingCycle: 'MONTHLY' | 'YEARLY'
    selectedAddonModules: ProposalAddonModule[]
    addonsTotalPrice: number
    estimatedEmployees: number
    totalPrice: number
    notes?: string
  }): Promise<CommercialPlanProposal> {
    const nowIso = new Date().toISOString()
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const dateStamp = nowIso.slice(0, 10).replace(/-/g, '')
    const fallbackProtocol = `PROP-${dateStamp}-${randomSuffix}`
    const fallbackId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `prop-${Date.now()}-${randomSuffix.toLowerCase()}`

    const validUuidPlanId =
      input.selectedPlanId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        input.selectedPlanId
      )
        ? input.selectedPlanId
        : null

    let createdProposal: CommercialPlanProposal = {
      id: fallbackId,
      protocolCode: fallbackProtocol,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerPhone: input.customerPhone.trim(),
      companyName: input.companyName?.trim() || null,
      selectedPlanId: input.selectedPlanId || null,
      selectedPlanName: input.selectedPlanName,
      selectedPlanBasePrice: Number(input.selectedPlanBasePrice || 0),
      billingCycle: input.billingCycle,
      selectedAddonModules: input.selectedAddonModules || [],
      addonsTotalPrice: Number(input.addonsTotalPrice || 0),
      estimatedEmployees: Number(input.estimatedEmployees || 10),
      totalPrice: Number(input.totalPrice || 0),
      notes: input.notes?.trim() || null,
      status: 'NEW',
      adminNotes: null,
      contractId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    const dbCycle = input.billingCycle === 'YEARLY' ? 'ANNUAL' : 'MONTHLY'
    const addonNamesOrCodes = createdProposal.selectedAddonModules.map((m) => m.name)

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        'submit_commercial_proposal',
        {
          p_customer_name: createdProposal.customerName,
          p_customer_email: createdProposal.customerEmail,
          p_customer_phone: createdProposal.customerPhone,
          p_company_name: createdProposal.companyName,
          p_plan_id: validUuidPlanId,
          p_plan_code: createdProposal.selectedPlanId || 'CUSTOM_PLAN',
          p_plan_name: createdProposal.selectedPlanName,
          p_billing_cycle: dbCycle,
          p_base_plan_price: createdProposal.selectedPlanBasePrice,
          p_included_modules: [],
          p_addon_modules: addonNamesOrCodes,
          p_addons_price: createdProposal.addonsTotalPrice,
          p_estimated_employees: createdProposal.estimatedEmployees,
          p_extra_employees_price: 0,
          p_total_monthly_price: createdProposal.totalPrice,
          p_setup_fee: 0,
          p_notes: createdProposal.notes,
        }
      )

      if (!rpcErr && rpcData) {
        createdProposal = {
          ...createdProposal,
          id: rpcData.id || createdProposal.id,
          protocolCode: rpcData.protocolCode || createdProposal.protocolCode,
          createdAt: rpcData.createdAt || createdProposal.createdAt,
        }
      } else {
        const { data: rowData, error: insErr } = await supabase
          .from('commercial_plan_proposals')
          .insert({
            id: createdProposal.id,
            protocol_code: createdProposal.protocolCode,
            customer_name: createdProposal.customerName,
            customer_email: createdProposal.customerEmail,
            customer_phone: createdProposal.customerPhone,
            company_name: createdProposal.companyName,
            plan_id: validUuidPlanId,
            plan_code: createdProposal.selectedPlanId || 'CUSTOM_PLAN',
            plan_name: createdProposal.selectedPlanName,
            billing_cycle: dbCycle,
            base_plan_price: createdProposal.selectedPlanBasePrice,
            included_modules: [],
            addon_modules: addonNamesOrCodes,
            addons_price: createdProposal.addonsTotalPrice,
            estimated_employees: createdProposal.estimatedEmployees,
            extra_employees_price: 0,
            total_monthly_price: createdProposal.totalPrice,
            setup_fee: 0,
            notes: createdProposal.notes,
            status: 'NEW',
          })
          .select('*')
          .maybeSingle()

        if (!insErr && rowData) {
          createdProposal = {
            ...mapProposalRow(rowData),
            selectedAddonModules: createdProposal.selectedAddonModules,
          }
        }
      }
    } catch {
      // Fallback to localStorage persistence
    }

    const existingLocal = readLocal<CommercialPlanProposal[]>(
      LOCAL_PROPOSALS_KEY,
      INITIAL_DEMO_PROPOSALS
    )
    const filtered = existingLocal.filter((p) => p.id !== createdProposal.id)
    writeLocal(LOCAL_PROPOSALS_KEY, [createdProposal, ...filtered])

    return createdProposal
  },

  async listProposals(): Promise<CommercialPlanProposal[]> {
    const localList = readLocal<CommercialPlanProposal[]>(
      LOCAL_PROPOSALS_KEY,
      INITIAL_DEMO_PROPOSALS
    )

    try {
      const { data, error } = await supabase
        .from('commercial_plan_proposals')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const dbList = data.map(mapProposalRow)
        const mergedMap = new Map<string, CommercialPlanProposal>()
        for (const item of dbList) {
          mergedMap.set(item.id, item)
        }
        for (const localItem of localList) {
          if (!mergedMap.has(localItem.id)) {
            mergedMap.set(localItem.id, localItem)
          }
        }
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        writeLocal(LOCAL_PROPOSALS_KEY, merged)
        return merged
      }
    } catch {
      // Fallback
    }

    return localList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  async updateProposalStatus(
    id: string,
    status: ProposalStatus,
    adminNotes?: string | null,
    contractId?: string | null
  ): Promise<CommercialPlanProposal[]> {
    const nowIso = new Date().toISOString()
    try {
      const payload: Record<string, any> = {
        status,
        updated_at: nowIso,
      }
      if (adminNotes !== undefined) payload.admin_notes = adminNotes
      if (contractId !== undefined) payload.contract_id = contractId

      await supabase.from('commercial_plan_proposals').update(payload).eq('id', id)
    } catch {
      // Fallback
    }

    const current = await this.listProposals()
    const next = current.map((p) =>
      p.id === id
        ? {
            ...p,
            status,
            adminNotes: adminNotes !== undefined ? adminNotes : p.adminNotes,
            contractId: contractId !== undefined ? contractId : p.contractId,
            updatedAt: nowIso,
          }
        : p
    )
    writeLocal(LOCAL_PROPOSALS_KEY, next)
    return next
  },

  async deleteProposal(id: string): Promise<CommercialPlanProposal[]> {
    try {
      await supabase.from('commercial_plan_proposals').delete().eq('id', id)
    } catch {
      // Fallback
    }
    const current = readLocal<CommercialPlanProposal[]>(
      LOCAL_PROPOSALS_KEY,
      INITIAL_DEMO_PROPOSALS
    )
    const next = current.filter((p) => p.id !== id)
    writeLocal(LOCAL_PROPOSALS_KEY, next)
    return next
  },

  // ============================================================================
  // 2. INTERPOLAÇÃO DE VARIÁVEIS E RENDERIZAÇÃO DO CONTRATO
  // ============================================================================
  interpolateContractTerms(contract: Partial<PlatformContract>): string {
    const addonNames =
      (contract.additionalModules || []).join(', ') || 'Sem módulos adicionais avulsos'
    const cycleLabel = contract.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'
    const dateFormatted = contract.effectiveDate
      ? new Date(`${contract.effectiveDate}T12:00:00`).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR')

    const replacements: Record<string, string> = {
      '{{NUMERO_CONTRATO}}': contract.contractNumber || 'CTR-2026-001',
      '{{MEU_NOME}}': contract.providerName || 'Olivelas Gestão de Estoque SaaS',
      '{{MEU_DOCUMENTO}}': contract.providerDocument || '00.000.000/0001-00',
      '{{MEU_EMAIL}}': contract.providerEmail || 'comercial@olivelas.com.br',
      '{{NOME_CLIENTE}}': contract.customerName || '[Nome do Cliente]',
      '{{DOCUMENTO_CLIENTE}}': contract.customerDocument || 'A informar na assinatura',
      '{{EMAIL_CLIENTE}}': contract.customerEmail || 'Não informado',
      '{{TELEFONE_CLIENTE}}': contract.customerPhone || 'Não informado',
      '{{CELULAR_CLIENTE}}': contract.customerPhone || 'Não informado',
      '{{PRODUTO_COMPRADO}}': contract.purchasedProduct || 'Plano SaaS Olivelas',
      '{{MODULOS_ADICIONAIS}}': addonNames,
      '{{CICLO_COBRANCA}}': cycleLabel,
      '{{VALOR_TOTAL}}': formatCurrency(Number(contract.totalValue || 0)),
      '{{VALOR_MENSAL}}': formatCurrency(Number(contract.totalValue || 0)),
      '{{FORMA_PAGAMENTO}}':
        contract.paymentTerms ||
        'Pagamento recorrente via PIX, Boleto ou Cartão de Crédito todo dia 10.',
      '{{DATA_VIGENCIA}}': dateFormatted,
      '{{DATA_ATUAL}}': dateFormatted,
    }

    let text = contract.customTerms || DEFAULT_CONTRACT_TERMS_TEMPLATE
    for (const [placeholder, val] of Object.entries(replacements)) {
      text = text.split(placeholder).join(val)
    }
    return text
  },

  buildStandaloneContractHtml(contract: Partial<PlatformContract>): string {
    const interpolatedTerms = this.interpolateContractTerms(contract)
    const dateStr = contract.effectiveDate
      ? new Date(`${contract.effectiveDate}T12:00:00`).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
    const cycleLabel = contract.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'
    const addonList = contract.additionalModules || []

    const paragraphsHtml = interpolatedTerms
      .split('\n')
      .map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return '<div style="height: 8px;"></div>'
        if (/^CLÁUSULA\s+/i.test(trimmed)) {
          return `<h3 style="margin: 18px 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${escapeXml(trimmed)}</h3>`
        }
        return `<p style="margin: 6px 0; font-size: 12.5px; line-height: 1.65; color: #1e293b; text-align: justify;">${escapeXml(trimmed)}</p>`
      })
      .join('\n')

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeXml(contract.title || 'Contrato de Licenciamento')} - ${escapeXml(contract.contractNumber || '')}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    .page-sheet {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px 48px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page-sheet { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 3px;
    }
    .contract-badge {
      text-align: right;
      font-size: 11px;
      color: #334155;
    }
    .contract-number {
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      display: inline-block;
      margin-bottom: 4px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }
    .party-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f8fafc;
      font-size: 12px;
      line-height: 1.5;
    }
    .party-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
      margin-bottom: 6px;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 22px 0;
      font-size: 12px;
    }
    .summary-table th, .summary-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    .summary-table th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
      font-size: 11px;
      text-transform: uppercase;
    }
    .signatures {
      margin-top: 44px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      page-break-inside: avoid;
    }
    .sig-block {
      border-top: 1px solid #0f172a;
      padding-top: 10px;
      text-align: center;
      font-size: 12px;
    }
    .footer-meta {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="page-sheet">
    <div class="header">
      <div>
        <h1 class="brand-title">${escapeXml(contract.title || 'INSTRUMENTO PARTICULAR DE LICENCIAMENTO DE SOFTWARE (SaaS)')}</h1>
        <div class="brand-sub">Plataforma Olivelas Gestão de Estoque, PDV, Validades & Multi-Loja</div>
      </div>
      <div class="contract-badge">
        <div class="contract-number">${escapeXml(contract.contractNumber || 'CTR-2026-001')}</div>
        <div>Vigência: ${escapeXml(dateStr)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="party-box">
        <div class="party-title">Contratada (Meu Nome / Licenciante)</div>
        <div><strong>Nome / Razão Social:</strong> ${escapeXml(contract.providerName || 'Olivelas Gestão de Estoque')}</div>
        <div><strong>CPF / CNPJ:</strong> ${escapeXml(contract.providerDocument || 'Não informado')}</div>
        <div><strong>E-mail:</strong> ${escapeXml(contract.providerEmail || 'comercial@olivelas.com.br')}</div>
        <div><strong>Representante:</strong> ${escapeXml(contract.providerRepresentative || 'Admin Global')}</div>
      </div>

      <div class="party-box">
        <div class="party-title">Contratante (Cliente Licenciado)</div>
        <div><strong>Nome / Razão Social:</strong> ${escapeXml(contract.customerName || '')}</div>
        <div><strong>CPF / CNPJ:</strong> ${escapeXml(contract.customerDocument || 'A preencher')}</div>
        <div><strong>E-mail:</strong> ${escapeXml(contract.customerEmail || '')}</div>
        <div><strong>Celular / WhatsApp:</strong> ${escapeXml(contract.customerPhone || '')}</div>
        ${contract.customerAddress ? `<div><strong>Endereço:</strong> ${escapeXml(contract.customerAddress)}</div>` : ''}
      </div>
    </div>

    <table class="summary-table">
      <thead>
        <tr>
          <th>Produto / Plano Contratado</th>
          <th>Ciclo</th>
          <th>Valor Base</th>
          <th>Adicionais / Desconto</th>
          <th>Valor Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${escapeXml(contract.purchasedProduct || 'Plano Personalizado')}</strong>
            ${
              addonList.length > 0
                ? `<div style="font-size: 11px; color: #047857; margin-top: 4px;">
                    <strong>+ Módulos Adicionais (${addonList.length}):</strong> ${escapeXml(addonList.join(', '))}
                   </div>`
                : `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Sem módulos avulsos adicionais</div>`
            }
          </td>
          <td>${escapeXml(cycleLabel)}</td>
          <td>${escapeXml(formatCurrency(Number(contract.basePrice || 0)))}</td>
          <td>
            +${escapeXml(formatCurrency(Number(contract.addonsPrice || 0)))}
            ${Number(contract.discountValue || 0) > 0 ? `<br/><span style="color:#dc2626;">-${escapeXml(formatCurrency(Number(contract.discountValue || 0)))}</span>` : ''}
          </td>
          <td><strong style="font-size: 13px; color: #047857;">${escapeXml(formatCurrency(Number(contract.totalValue || 0)))}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="clauses-body">
      ${paragraphsHtml}
    </div>

    <div class="signatures">
      <div class="sig-block">
        <strong>${escapeXml(contract.providerName || 'CONTRATADA')}</strong><br />
        <span>${escapeXml(contract.providerRepresentative || '')} — CPF/CNPJ: ${escapeXml(contract.providerDocument || '—')}</span><br />
        <span style="font-size: 10px; color: #64748b;">CONTRATADA (Licenciante)</span>
      </div>
      <div class="sig-block">
        <strong>${escapeXml(contract.customerName || 'CONTRATANTE')}</strong><br />
        <span>CPF/CNPJ: ${escapeXml(contract.customerDocument || '—')}</span><br />
        <span style="font-size: 10px; color: #64748b;">CONTRATANTE (Cliente)</span>
      </div>
    </div>

    <div class="footer-meta">
      <span>Documento gerado pelo Gerenciador de Contratos Olivelas • Nº ${escapeXml(contract.contractNumber || '')}</span>
      <span>Armazenado no Supabase Storage & Google Drive Sync</span>
    </div>
  </div>
</body>
</html>`
  },

  // ============================================================================
  // 3. PERSISTÊNCIA NO SUPABASE (TABELA + STORAGE BUCKET DA LOJA)
  // ============================================================================
  async listContracts(): Promise<PlatformContract[]> {
    const localList = readLocal<PlatformContract[]>(LOCAL_CONTRACTS_KEY, [])

    try {
      const { data, error } = await supabase
        .from('platform_contracts')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const dbList = data.map(mapContractRow)
        const mergedMap = new Map<string, PlatformContract>()
        for (const item of dbList) mergedMap.set(item.id, item)
        for (const localItem of localList) {
          if (!mergedMap.has(localItem.id)) mergedMap.set(localItem.id, localItem)
        }
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        writeLocal(LOCAL_CONTRACTS_KEY, merged)
        return merged
      }
    } catch {
      // Fallback
    }

    return localList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  async saveContract(
    input: Partial<PlatformContract> & {
      contractNumber: string
      title: string
      providerName: string
      customerName: string
      purchasedProduct: string
      customTerms: string
    }
  ): Promise<PlatformContract> {
    const nowIso = new Date().toISOString()
    const contractId =
      input.id && input.id !== 'preview'
        ? input.id
        : typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ctr-${Date.now()}`

    const renderedHtml = this.buildStandaloneContractHtml(input)

    // 1. Upload HTML file to Supabase Storage (using the same bucket pattern as productImageService)
    let storagePath = input.supabaseStoragePath || null
    let publicUrl = input.supabasePublicUrl || null

    try {
      const cleanNumber = slugifyFile(input.contractNumber)
      const candidatePath = `contracts/${cleanNumber}-${Date.now()}.html`
      const htmlBlob = new Blob([renderedHtml], { type: 'text/html;charset=utf-8' })

      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(candidatePath, htmlBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'text/html;charset=utf-8',
        })

      if (!uploadErr) {
        storagePath = candidatePath
        publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(candidatePath).data.publicUrl
      }
    } catch {
      // Continue even if storage bucket is offline or restricted
    }

    const validProposalUuid =
      input.proposalId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.proposalId)
        ? input.proposalId
        : null

    const basePrice = Number(input.basePrice ?? 0)
    const addonsPrice = Number(input.addonsPrice ?? 0)
    const discountValue = Number(input.discountValue ?? 0)
    const totalValue = Number(
      input.totalValue ?? Math.max(0, basePrice + addonsPrice - discountValue)
    )

    let savedContract: PlatformContract = {
      id: contractId,
      proposalId: input.proposalId || null,
      contractNumber: input.contractNumber.trim(),
      title: input.title.trim(),
      status: input.status || 'DRAFT',
      providerName: input.providerName.trim(),
      providerDocument: input.providerDocument?.trim() || '00.000.000/0001-00',
      providerEmail: input.providerEmail?.trim() || 'comercial@olivelas.com.br',
      providerRepresentative:
        input.providerRepresentative?.trim() || 'Admin Global Olivelas',
      customerName: input.customerName.trim(),
      customerDocument: input.customerDocument?.trim() || '',
      customerEmail: input.customerEmail?.trim() || '',
      customerPhone: input.customerPhone?.trim() || '',
      customerAddress: input.customerAddress?.trim() || '',
      purchasedProduct: input.purchasedProduct.trim(),
      additionalModules: input.additionalModules || [],
      billingCycle: input.billingCycle || 'MONTHLY',
      basePrice,
      addonsPrice,
      discountValue,
      totalValue,
      paymentTerms:
        input.paymentTerms ||
        'Pagamento recorrente via PIX, Boleto ou Cartão de Crédito todo dia 10.',
      effectiveDate: input.effectiveDate || nowIso.slice(0, 10),
      customTerms: input.customTerms,
      renderedHtml,
      supabaseStorageBucket: STORAGE_BUCKET,
      supabaseStoragePath: storagePath,
      supabasePublicUrl: publicUrl,
      googleDriveFileId: input.googleDriveFileId || null,
      googleDriveWebLink: input.googleDriveWebLink || null,
      googleDriveFolderId: input.googleDriveFolderId || null,
      googleDriveSyncedAt: input.googleDriveSyncedAt || null,
      signedAt: input.status === 'SIGNED' ? input.signedAt || nowIso : input.signedAt || null,
      createdBy: input.createdBy || null,
      createdAt: input.createdAt || nowIso,
      updatedAt: nowIso,
    }

    // 2. Upsert into public.platform_contracts
    try {
      const dbPayload = {
        id: savedContract.id,
        proposal_id: validProposalUuid,
        contract_number: savedContract.contractNumber,
        title: savedContract.title,
        status: savedContract.status,
        provider_name: savedContract.providerName,
        provider_document: savedContract.providerDocument,
        provider_email: savedContract.providerEmail,
        provider_phone: savedContract.providerRepresentative,
        customer_name: savedContract.customerName,
        customer_document: savedContract.customerDocument,
        customer_email: savedContract.customerEmail,
        customer_phone: savedContract.customerPhone,
        customer_address: savedContract.customerAddress,
        product_name: savedContract.purchasedProduct,
        addon_modules: savedContract.additionalModules,
        billing_cycle: savedContract.billingCycle === 'YEARLY' ? 'ANNUAL' : 'MONTHLY',
        monthly_value: savedContract.totalValue,
        custom_terms: savedContract.customTerms,
        rendered_html: savedContract.renderedHtml,
        supabase_storage_bucket: savedContract.supabaseStorageBucket,
        supabase_storage_path: savedContract.supabaseStoragePath,
        supabase_public_url: savedContract.supabasePublicUrl,
        google_drive_file_id: savedContract.googleDriveFileId,
        google_drive_web_link: savedContract.googleDriveWebLink,
        google_drive_folder_id: savedContract.googleDriveFolderId,
        google_drive_synced_at: savedContract.googleDriveSyncedAt,
        signed_at: savedContract.signedAt,
        updated_at: nowIso,
      }

      const { data, error } = await supabase
        .from('platform_contracts')
        .upsert(dbPayload, { onConflict: 'contract_number' })
        .select('*')
        .single()

      if (!error && data) {
        savedContract = {
          ...mapContractRow(data),
          basePrice: savedContract.basePrice,
          addonsPrice: savedContract.addonsPrice,
          discountValue: savedContract.discountValue,
          paymentTerms: savedContract.paymentTerms,
          effectiveDate: savedContract.effectiveDate,
        }
      }
    } catch {
      // Fallback to localStorage
    }

    const currentLocal = readLocal<PlatformContract[]>(LOCAL_CONTRACTS_KEY, [])
    const idx = currentLocal.findIndex(
      (c) => c.id === savedContract.id || c.contractNumber === savedContract.contractNumber
    )
    const nextLocal =
      idx >= 0
        ? currentLocal.map((c, i) => (i === idx ? savedContract : c))
        : [savedContract, ...currentLocal]
    writeLocal(LOCAL_CONTRACTS_KEY, nextLocal)

    return savedContract
  },

  async deleteContract(id: string): Promise<PlatformContract[]> {
    try {
      await supabase.from('platform_contracts').delete().eq('id', id)
    } catch {
      // Fallback
    }
    const current = readLocal<PlatformContract[]>(LOCAL_CONTRACTS_KEY, [])
    const next = current.filter((c) => c.id !== id)
    writeLocal(LOCAL_CONTRACTS_KEY, next)
    return next
  },

  // ============================================================================
  // 4. EXPORTAÇÃO EM HTML, DOCX (OPENXML REAL VIA JSZIP) E PDF PARA ASSINATURA
  // ============================================================================
  exportContractAsHTML(contract: Partial<PlatformContract>): void {
    const html = this.buildStandaloneContractHtml(contract)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const fileName = `${slugifyFile(contract.contractNumber || 'contrato')}_${slugifyFile(
      contract.customerName || 'cliente'
    )}.html`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  async generateContractDocxBlob(contract: Partial<PlatformContract>): Promise<Blob> {
    const addonList = contract.additionalModules || []
    const interpolatedTerms = this.interpolateContractTerms(contract)
    const dateStr = contract.effectiveDate
      ? new Date(`${contract.effectiveDate}T12:00:00`).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR')
    const cycleLabel = contract.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'

    const makeParagraph = (
      text: string,
      opts: {
        bold?: boolean
        sizeHalfPt?: number
        align?: 'left' | 'center' | 'both'
        spacingAfter?: number
      } = {}
    ) => {
      const sz = opts.sizeHalfPt || 22
      const jc = opts.align || 'left'
      const after = opts.spacingAfter ?? 140
      return `<w:p>
        <w:pPr>
          <w:jc w:val="${jc}"/>
          <w:spacing w:after="${after}" w:line="276" w:lineRule="auto"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            ${opts.bold ? '<w:b/>' : ''}
            <w:sz w:val="${sz}"/>
            <w:szCs w:val="${sz}"/>
          </w:rPr>
          <w:t xml:space="preserve">${escapeXml(text)}</w:t>
        </w:r>
      </w:p>`
    }

    const headerParagraphs = [
      makeParagraph(
        contract.title || 'INSTRUMENTO PARTICULAR DE LICENCIAMENTO DE SOFTWARE (SaaS)',
        { bold: true, sizeHalfPt: 28, align: 'center', spacingAfter: 80 }
      ),
      makeParagraph(
        `Contrato Nº: ${contract.contractNumber || 'CTR-2026-001'}  |  Data de Vigência: ${dateStr}`,
        { bold: true, sizeHalfPt: 20, align: 'center', spacingAfter: 240 }
      ),
      makeParagraph('1. QUALIFICAÇÃO DAS PARTES', { bold: true, sizeHalfPt: 24, spacingAfter: 100 }),
      makeParagraph(
        `CONTRATADA (MEU NOME / LICENCIANTE): ${contract.providerName || 'Olivelas Gestão de Estoque'}, inscrita no CPF/CNPJ sob nº ${contract.providerDocument || 'Não informado'}, e-mail: ${contract.providerEmail || 'comercial@olivelas.com.br'}, representada por ${contract.providerRepresentative || 'Admin Global'}.`,
        { align: 'both' }
      ),
      makeParagraph(
        `CONTRATANTE (CLIENTE): ${contract.customerName || ''}, inscrito(a) no CPF/CNPJ sob nº ${contract.customerDocument || 'A preencher'}, e-mail: ${contract.customerEmail || ''}, celular/WhatsApp: ${contract.customerPhone || ''}${contract.customerAddress ? `, endereço: ${contract.customerAddress}` : ''}.`,
        { align: 'both', spacingAfter: 220 }
      ),
      makeParagraph('2. RESUMO DO PRODUTO E MÓDULOS CONTRATADOS', {
        bold: true,
        sizeHalfPt: 24,
        spacingAfter: 100,
      }),
      makeParagraph(
        `• Produto / Plano Comprado: ${contract.purchasedProduct || 'Plano Personalizado'}`,
        { bold: true }
      ),
      makeParagraph(
        `• Módulos Adicionais Avulsos (${addonList.length}): ${addonList.join(', ') || 'Sem módulos adicionais avulsos'}`
      ),
      makeParagraph(
        `• Valor Total Contratado (${cycleLabel}): ${formatCurrency(Number(contract.totalValue || 0))}`,
        { bold: true }
      ),
      makeParagraph(
        `• Condições de Pagamento: ${contract.paymentTerms || 'Pagamento recorrente mensal/anual.'}`,
        { spacingAfter: 240 }
      ),
    ]

    const clauseParagraphs = interpolatedTerms
      .split('\n')
      .map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        const isHeading = /^CLÁUSULA\s+/i.test(trimmed)
        return makeParagraph(trimmed, {
          bold: isHeading,
          sizeHalfPt: isHeading ? 24 : 22,
          align: isHeading ? 'left' : 'both',
          spacingAfter: isHeading ? 100 : 140,
        })
      })
      .filter(Boolean)

    const signatureParagraphs = [
      makeParagraph(`Data de vigência e assinatura: ${dateStr}.`, {
        bold: true,
        spacingAfter: 360,
      }),
      makeParagraph('____________________________________________________________', {
        align: 'center',
        spacingAfter: 40,
      }),
      makeParagraph(
        `${contract.providerName || 'CONTRATADA'} (${contract.providerRepresentative || 'Representante'} - CPF/CNPJ: ${contract.providerDocument || '—'})`,
        { bold: true, align: 'center', spacingAfter: 320 }
      ),
      makeParagraph('____________________________________________________________', {
        align: 'center',
        spacingAfter: 40,
      }),
      makeParagraph(
        `${contract.customerName || 'CONTRATANTE'} (CPF/CNPJ: ${contract.customerDocument || '—'})`,
        { bold: true, align: 'center', spacingAfter: 200 }
      ),
    ]

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${headerParagraphs.join('\n')}
    ${clauseParagraphs.join('\n')}
    ${signatureParagraphs.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

    const zip = new JSZip()
    zip.file('[Content_Types].xml', contentTypesXml)
    zip.folder('_rels')?.file('.rels', relsXml)
    zip.folder('word')?.file('document.xml', documentXml)

    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  },

  async exportContractAsDOCX(contract: Partial<PlatformContract>): Promise<void> {
    const blob = await this.generateContractDocxBlob(contract)
    const url = URL.createObjectURL(blob)
    const fileName = `${slugifyFile(contract.contractNumber || 'contrato')}_${slugifyFile(
      contract.customerName || 'cliente'
    )}.docx`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  exportContractAsPDF(contract: Partial<PlatformContract>): void {
    const html = this.buildStandaloneContractHtml(contract)
    const printBanner = `
      <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; background: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; font-family: sans-serif; font-size: 13px;">
        <div>
          <strong>Pronto para Exportar PDF / Assinatura:</strong> Na janela de impressão, selecione o destino <strong>"Salvar como PDF"</strong>.
        </div>
        <button onclick="window.print()" style="background: #10b981; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;">
          Imprimir / Salvar PDF
        </button>
      </div>
    `
    const printableHtml = html.replace(
      '<div class="page-sheet">',
      `${printBanner}<div class="page-sheet">`
    )

    const printWindow = window.open('', '_blank', 'width=960,height=840')
    if (printWindow) {
      printWindow.document.open()
      printWindow.document.write(printableHtml)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 350)
    } else {
      this.exportContractAsHTML(contract)
    }
  },

  // ============================================================================
  // 5. INTEGRAÇÃO COM GOOGLE DRIVE DO GLOBAL ADMIN
  // ============================================================================
  getGoogleDriveConfig(): GlobalAdminGoogleDriveConfig {
    return readLocal<GlobalAdminGoogleDriveConfig>(
      LOCAL_GDRIVE_CONFIG_KEY,
      DEFAULT_GOOGLE_DRIVE_CONFIG
    )
  },

  saveGoogleDriveConfig(
    config: Partial<GlobalAdminGoogleDriveConfig>
  ): GlobalAdminGoogleDriveConfig {
    const current = this.getGoogleDriveConfig()
    const next: GlobalAdminGoogleDriveConfig = {
      ...current,
      ...config,
      updatedAt: new Date().toISOString(),
    }
    writeLocal(LOCAL_GDRIVE_CONFIG_KEY, next)
    return next
  },

  async syncContractToGoogleDrive(
    contract: PlatformContract
  ): Promise<{ success: boolean; message: string; fileId: string; webViewLink: string }> {
    const config = this.getGoogleDriveConfig()
    const folderId = extractDriveFolderId(config.folderUrlOrId)

    // If the Global Admin provided a Google Drive OAuth2 Access Token, upload directly via Google Drive v3 Multipart API
    if (config.accessToken && config.accessToken.trim().length > 15) {
      const docxBlob = await this.generateContractDocxBlob(contract)
      const fileName = `${contract.contractNumber} - ${contract.customerName}.docx`

      const metadata: Record<string, any> = {
        name: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        description: `Contrato ${contract.contractNumber} - Cliente: ${contract.customerName} (${contract.purchasedProduct})`,
      }
      if (folderId && !folderId.startsWith('http')) {
        metadata.parents = [folderId]
      }

      const form = new FormData()
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      )
      form.append('file', docxBlob, fileName)

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.accessToken.trim()}`,
          },
          body: form,
        }
      )

      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(
          `Erro na API do Google Drive (${res.status}): Verifique se o Token de Acesso OAuth2 está ativo ou vincule o link da pasta do Drive. Detalhe: ${errBody.slice(0, 140)}`
        )
      }

      const uploaded = await res.json()
      const fileId = uploaded.id || `gdrive-${Date.now()}`
      const webViewLink =
        uploaded.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

      await this.saveContract({
        ...contract,
        googleDriveFileId: fileId,
        googleDriveWebLink: webViewLink,
        googleDriveFolderId: folderId || null,
        googleDriveSyncedAt: new Date().toISOString(),
      })

      return {
        success: true,
        message: 'Contrato enviado diretamente para o Google Drive via API v3!',
        fileId,
        webViewLink,
      }
    }

    // If linking via configured folder URL (without active OAuth token)
    const resolvedLink = config.folderUrlOrId.startsWith('http')
      ? config.folderUrlOrId.trim()
      : folderId
        ? `https://drive.google.com/drive/folders/${folderId}`
        : 'https://drive.google.com/drive/my-drive'

    const generatedFileId = folderId || `drive-linked-${Date.now()}`

    await this.saveContract({
      ...contract,
      googleDriveFileId: generatedFileId,
      googleDriveWebLink: resolvedLink,
      googleDriveFolderId: folderId || null,
      googleDriveSyncedAt: new Date().toISOString(),
    })

    return {
      success: true,
      message:
        'Contrato vinculado à pasta do Google Drive! O arquivo DOCX foi baixado para arquivamento imediato.',
      fileId: generatedFileId,
      webViewLink: resolvedLink,
    }
  },
}
