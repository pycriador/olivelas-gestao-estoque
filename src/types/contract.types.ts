export type ProposalStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'CONTRACT_GENERATED'
  | 'SIGNED'
  | 'ARCHIVED'

export interface ProposalAddonModule {
  code: string
  name: string
  monthlyPrice: number
}

export interface CommercialPlanProposal {
  id: string
  protocolCode?: string
  customerName: string
  customerEmail: string
  customerPhone: string
  companyName?: string | null
  selectedPlanId: string | null
  selectedPlanName: string
  selectedPlanBasePrice: number
  billingCycle: 'MONTHLY' | 'YEARLY'
  selectedAddonModules: ProposalAddonModule[]
  addonsTotalPrice: number
  estimatedEmployees: number
  totalPrice: number
  notes?: string | null
  status: ProposalStatus
  adminNotes?: string | null
  contractId?: string | null
  createdAt: string
  updatedAt: string
}

export type ContractStatus =
  | 'DRAFT'
  | 'SENT_FOR_SIGNATURE'
  | 'SIGNED'
  | 'CANCELLED'

export interface PlatformContract {
  id: string
  proposalId?: string | null
  contractNumber: string
  title: string
  status: ContractStatus
  providerName: string
  providerDocument: string
  providerEmail: string
  providerRepresentative: string
  customerName: string
  customerDocument: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  purchasedProduct: string
  additionalModules: string[]
  billingCycle: 'MONTHLY' | 'YEARLY'
  basePrice: number
  addonsPrice: number
  discountValue: number
  totalValue: number
  paymentTerms: string
  effectiveDate: string
  customTerms: string
  renderedHtml?: string | null
  supabaseStorageBucket?: string | null
  supabaseStoragePath?: string | null
  supabasePublicUrl?: string | null
  googleDriveFileId?: string | null
  googleDriveWebLink?: string | null
  googleDriveFolderId?: string | null
  googleDriveSyncedAt?: string | null
  signedAt?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

export interface GlobalAdminGoogleDriveConfig {
  enabled: boolean
  folderUrlOrId: string
  clientEmail: string
  accessToken?: string
  autoSyncOnSave: boolean
  updatedAt?: string
}

export const DEFAULT_CONTRACT_TERMS_TEMPLATE = `CLÁUSULA 1ª – DO OBJETO E PRODUTO CONTRATADO
1.1. O presente instrumento tem por objeto o licenciamento de uso não exclusivo do software em nuvem (SaaS) denominado "{{PRODUTO_COMPRADO}}", fornecido por {{MEU_NOME}} (CONTRATADA) em favor de {{NOME_CLIENTE}}, inscrito(a) no CPF/CNPJ sob nº {{DOCUMENTO_CLIENTE}}, e-mail {{EMAIL_CLIENTE}}, telefone {{TELEFONE_CLIENTE}} (CONTRATANTE).
1.2. Módulos Adicionais Avulsos Contratados: {{MODULOS_ADICIONAIS}}.

CLÁUSULA 2ª – DA FRANQUIA DE USUÁRIOS E MULTI-LOJA
2.1. O plano contratado contempla a franquia gratuita de até 10 (dez) funcionários operacionais ativos por loja cadastrada (vendedores, estoquistas, aprovadores de baixa e financeiro), sem cobrança de assinatura individual para os funcionários dentro da franquia.

CLÁUSULA 3ª – DOS VALORES, CICLO E CONDIÇÕES DE PAGAMENTO
3.1. Pela licença de uso do software e módulos descritos na Cláusula 1ª, o(a) CONTRATANTE pagará à CONTRATADA o valor total de {{VALOR_TOTAL}} no ciclo {{CICLO_COBRANCA}}.
3.2. Forma e Condições de Pagamento: {{FORMA_PAGAMENTO}}.

CLÁUSULA 4ª – DA VIGÊNCIA, SUPORTE E DISPONIBILIDADE (SLA)
4.1. Este contrato (Nº {{NUMERO_CONTRATO}}) entra em vigor na data de {{DATA_VIGENCIA}} pelo prazo inicial de 12 (doze) meses, renovando-se automaticamente por iguais períodos.
4.2. A CONTRATADA garante disponibilidade de infraestrutura em nuvem (Supabase Cloud & CDN), backups periódicos e suporte técnico comercial em horário útil.

CLÁUSULA 5ª – DA PROTEÇÃO DE DADOS (LGPD) E CONFIDENCIALIDADE
5.1. As partes comprometem-se a cumprir integralmente a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), mantendo sigilo absoluto sobre os dados operacionais, fiscais, cadastros de clientes e movimentações de estoque armazenados na plataforma.

CLÁUSULA 6ª – DO FORO E ASSINATURAS
6.1. As partes reconhecem a validade jurídica deste contrato firmado em meio físico ou eletrônico (ICP-Brasil / Assinatura Eletrônica), elegendo o foro da Comarca da sede da CONTRATADA para dirimir eventuais controvérsias.`
