import type { UserRole } from '@/types/database.types'
import type { StoreMember } from '@/types/user.types'

export interface GranularPermissionDef {
  code: string
  name: string
  description: string
  resourceGroup:
    | 'products'
    | 'inventory'
    | 'branches'
    | 'sales'
    | 'purchasing'
    | 'customers'
    | 'reports'
    | 'stores'
  highlight?: 'warning' | 'emerald'
}

export interface ResourcePermissionGroup {
  id: GranularPermissionDef['resourceGroup']
  title: string
  subtitle: string
  permissions: GranularPermissionDef[]
}

export const GRANULAR_PERMISSION_GROUPS: ResourcePermissionGroup[] = [
  {
    id: 'inventory',
    title: 'Estoque, Lotes & Aprovação de Baixas',
    subtitle: 'Controle de entradas, ajustes, validades e autorização de baixas por perda ou quebra',
    permissions: [
      {
        code: 'inventory.read',
        name: 'Visualizar Saldos e Movimentações',
        description: 'Permite consultar saldos de estoque, histórico de entradas/saídas e rastreabilidade.',
        resourceGroup: 'inventory',
      },
      {
        code: 'inventory.receive',
        name: 'Dar Entrada Manual de Mercadoria',
        description: 'Permite lançar entradas avulsas e em lote no estoque com custo e validade.',
        resourceGroup: 'inventory',
      },
      {
        code: 'inventory.adjust',
        name: 'Ajuste de Contagem / Inventário',
        description: 'Permite corrigir divergências de contagem física no estoque.',
        resourceGroup: 'inventory',
      },
      {
        code: 'inventory.writeoff_request',
        name: 'Solicitar Baixa de Estoque',
        description: 'Permite registrar solicitações de baixa por perda, quebra, avaria ou vencimento.',
        resourceGroup: 'inventory',
      },
      {
        code: 'inventory.approve_writeoff',
        name: 'Aprovador de Baixa de Estoque (Autorizador)',
        description:
          'Permissão exclusiva para AUTORIZAR e efetivar baixas de estoque (presencialmente ou na fila de aprovação).',
        resourceGroup: 'inventory',
        highlight: 'emerald',
      },
      {
        code: 'inventory.batches',
        name: 'Gerenciar Lotes e Validades',
        description: 'Permite gerenciar lotes na tela de validades e registrar justificativas de descarte.',
        resourceGroup: 'inventory',
      },
      {
        code: 'inventory.cost_centers',
        name: 'Gerenciar Centros de Custo de Perda',
        description: 'Permite criar e editar centros de custo operacionais.',
        resourceGroup: 'inventory',
      },
      {
        code: 'inventory.import',
        name: 'Importar Planilha CSV de Estoque',
        description: 'Permite importar saldos e preços em massa via arquivo CSV.',
        resourceGroup: 'inventory',
      },
    ],
  },
  {
    id: 'branches',
    title: 'Filiais & Remessas Sem Venda',
    subtitle: 'Cadastro de unidades filiais e transferência interna de produtos para venda na filial',
    permissions: [
      {
        code: 'branches.read',
        name: 'Visualizar Filiais e Remessas',
        description: 'Permite consultar filiais da rede e histórico de transferências entre unidades.',
        resourceGroup: 'branches',
      },
      {
        code: 'branches.manage',
        name: 'Cadastrar e Editar Filiais',
        description: 'Permite criar novas filiais vinculadas à Matriz e editar dados da unidade.',
        resourceGroup: 'branches',
      },
      {
        code: 'branches.transfer_send',
        name: 'Enviar Produtos para Filial (Sem Venda)',
        description:
          'Permite transferir produtos e lotes do estoque para outra filial sem registrar venda na origem.',
        resourceGroup: 'branches',
        highlight: 'emerald',
      },
      {
        code: 'branches.transfer_receive',
        name: 'Receber Transferência na Filial',
        description: 'Permite conferir e receber remessas de estoque enviadas pela Matriz.',
        resourceGroup: 'branches',
      },
    ],
  },
  {
    id: 'products',
    title: 'Produtos, Preços & Catálogo',
    subtitle: 'Gestão do catálogo mestre, fotos, categorias e visibilidade de custos',
    permissions: [
      {
        code: 'products.read',
        name: 'Visualizar Catálogo de Produtos',
        description: 'Permite consultar produtos, códigos SKU e preços de venda.',
        resourceGroup: 'products',
      },
      {
        code: 'products.view_cost',
        name: 'Ver Preço de Custo e Margem de Lucro',
        description: 'Permite visualizar quanto o produto custou e qual é o lucro previsto.',
        resourceGroup: 'products',
        highlight: 'warning',
      },
      {
        code: 'products.create',
        name: 'Cadastrar Novos Produtos',
        description: 'Permite adicionar novos itens e fotos ao catálogo da loja.',
        resourceGroup: 'products',
      },
      {
        code: 'products.update',
        name: 'Editar Dados de Produtos',
        description: 'Permite alterar nome, descrição, SKU, estoque mínimo e fotos.',
        resourceGroup: 'products',
      },
      {
        code: 'products.change_price',
        name: 'Alterar Preços de Venda e Custo',
        description: 'Permite reajustar valores comerciais dos produtos.',
        resourceGroup: 'products',
        highlight: 'warning',
      },
      {
        code: 'products.delete',
        name: 'Excluir / Inativar Produtos',
        description: 'Permite remover produtos do catálogo ativo.',
        resourceGroup: 'products',
      },
      {
        code: 'categories.manage',
        name: 'Gerenciar Categorias',
        description: 'Permite criar, editar e remover categorias do catálogo.',
        resourceGroup: 'products',
      },
      {
        code: 'catalog.whatsapp',
        name: 'Configurar Catálogo Público / WhatsApp',
        description: 'Permite gerenciar a vitrine digital e compartilhamento por WhatsApp.',
        resourceGroup: 'products',
      },
    ],
  },
  {
    id: 'sales',
    title: 'Vendas PDV & Pedidos',
    subtitle: 'Operação de frente de caixa, descontos, estornos e gestão de pedidos',
    permissions: [
      {
        code: 'sales.pos',
        name: 'Operar Frente de Caixa (PDV)',
        description: 'Permite realizar vendas presenciais com baixa imediata no estoque.',
        resourceGroup: 'sales',
      },
      {
        code: 'sales.read',
        name: 'Visualizar Histórico de Vendas',
        description: 'Permite consultar vendas realizadas e comprovantes.',
        resourceGroup: 'sales',
      },
      {
        code: 'sales.apply_discount',
        name: 'Aplicar Desconto Manual no PDV',
        description: 'Permite conceder descontos sobre o valor dos itens na venda.',
        resourceGroup: 'sales',
        highlight: 'warning',
      },
      {
        code: 'sales.cancel',
        name: 'Cancelar Venda e Estornar Estoque',
        description: 'Permite cancelar vendas concluídas devolvendo os itens ao saldo.',
        resourceGroup: 'sales',
        highlight: 'warning',
      },
      {
        code: 'orders.read',
        name: 'Visualizar Pedidos (WhatsApp / Catálogo)',
        description: 'Permite acompanhar fila de pedidos recebidos.',
        resourceGroup: 'sales',
      },
      {
        code: 'orders.manage',
        name: 'Aprovar, Separar e Despachar Pedidos',
        description: 'Permite alterar status operacional de pedidos de clientes.',
        resourceGroup: 'sales',
      },
      {
        code: 'orders.delete',
        name: 'Excluir Pedidos Cancelados',
        description: 'Permite limpar registros de pedidos cancelados.',
        resourceGroup: 'sales',
      },
    ],
  },
  {
    id: 'purchasing',
    title: 'Compras & Fornecedores',
    subtitle: 'Emissão de ordens de compra, cotação, aprovação e entrada de nota',
    permissions: [
      {
        code: 'purchase_orders.read',
        name: 'Visualizar Ordens de Compra',
        description: 'Permite consultar pedidos de reposição junto aos fornecedores.',
        resourceGroup: 'purchasing',
      },
      {
        code: 'purchase_orders.create',
        name: 'Emitir Nova Ordem de Compra',
        description: 'Permite criar pedidos de compra com cálculo de markup.',
        resourceGroup: 'purchasing',
      },
      {
        code: 'purchase_orders.approve',
        name: 'Aprovar Ordem de Compra',
        description: 'Permite autorizar financeiramente ordens de compra.',
        resourceGroup: 'purchasing',
      },
      {
        code: 'purchase_orders.receive',
        name: 'Receber Mercadoria de Compra no Estoque',
        description: 'Permite confirmar a chegada dos itens e alimentar lotes/saldos.',
        resourceGroup: 'purchasing',
      },
      {
        code: 'purchase_orders.cancel',
        name: 'Cancelar Ordem de Compra',
        description: 'Permite cancelar pedidos de compra em aberto.',
        resourceGroup: 'purchasing',
      },
      {
        code: 'suppliers.read',
        name: 'Visualizar Fornecedores',
        description: 'Permite consultar dados e contatos de fornecedores.',
        resourceGroup: 'purchasing',
      },
      {
        code: 'suppliers.create',
        name: 'Cadastrar e Editar Fornecedores',
        description: 'Permite incluir e atualizar parceiros fornecedores.',
        resourceGroup: 'purchasing',
      },
      {
        code: 'suppliers.delete',
        name: 'Excluir Fornecedores',
        description: 'Permite remover fornecedores sem vínculos ativos.',
        resourceGroup: 'purchasing',
      },
    ],
  },
  {
    id: 'customers',
    title: 'Clientes & CRM',
    subtitle: 'Cadastro de clientes, endereços de entrega e histórico de compras',
    permissions: [
      {
        code: 'customers.read',
        name: 'Visualizar Clientes',
        description: 'Permite consultar carteira de clientes e histórico de pedidos.',
        resourceGroup: 'customers',
      },
      {
        code: 'customers.create',
        name: 'Cadastrar Novos Clientes',
        description: 'Permite registrar clientes no PDV e na tela de clientes.',
        resourceGroup: 'customers',
      },
      {
        code: 'customers.update',
        name: 'Editar Dados de Clientes',
        description: 'Permite atualizar telefone, endereço e observações.',
        resourceGroup: 'customers',
      },
      {
        code: 'customers.delete',
        name: 'Excluir Clientes',
        description: 'Permite remover cadastros de clientes.',
        resourceGroup: 'customers',
      },
      {
        code: 'customers.export',
        name: 'Exportar Carteira de Clientes (CSV)',
        description: 'Permite baixar planilha com dados dos clientes da loja.',
        resourceGroup: 'customers',
      },
    ],
  },
  {
    id: 'reports',
    title: 'Relatórios & Inteligência',
    subtitle: 'Acesso a indicadores analíticos, curva ABC, perdas e exportação de dados',
    permissions: [
      {
        code: 'reports.sales',
        name: 'Relatórios de Vendas e Faturamento',
        description: 'Permite visualizar desempenho comercial e produtos mais vendidos.',
        resourceGroup: 'reports',
      },
      {
        code: 'reports.inventory',
        name: 'Relatórios de Estoque, Perdas e Validades',
        description: 'Permite analisar giro de estoque, baixas e vencimentos.',
        resourceGroup: 'reports',
      },
      {
        code: 'reports.financial',
        name: 'Relatórios Financeiros, Custos e Curva ABC',
        description: 'Permite visualizar margem líquida, valorização a custo e rentabilidade.',
        resourceGroup: 'reports',
        highlight: 'warning',
      },
      {
        code: 'reports.customers',
        name: 'Relatórios de Clientes e Ticket Médio',
        description: 'Permite analisar recorrência e ranking de clientes.',
        resourceGroup: 'reports',
      },
      {
        code: 'reports.suppliers',
        name: 'Relatórios de Compras por Fornecedor',
        description: 'Permite analisar volume de compras e dependência de fornecedores.',
        resourceGroup: 'reports',
      },
      {
        code: 'reports.export',
        name: 'Exportar Relatórios em CSV',
        description: 'Permite baixar arquivos CSV de todas as visões analíticas.',
        resourceGroup: 'reports',
      },
    ],
  },
  {
    id: 'stores',
    title: 'Administração da Loja, Equipe & Auditoria',
    subtitle: 'Gerenciamento de funcionários, papéis, configurações da unidade e logs',
    permissions: [
      {
        code: 'users.manage',
        name: 'Gerenciar Funcionários e Permissões',
        description: 'Permite cadastrar funcionários, definir aprovadores e ajustar permissões.',
        resourceGroup: 'stores',
        highlight: 'warning',
      },
      {
        code: 'roles.manage',
        name: 'Criar e Editar Papéis Customizados',
        description: 'Permite criar perfis de acesso sob medida para a loja.',
        resourceGroup: 'stores',
      },
      {
        code: 'stores.manage',
        name: 'Alterar Configurações e Tema da Loja',
        description: 'Permite editar dados cadastrais, WhatsApp, logo e cores da loja.',
        resourceGroup: 'stores',
      },
      {
        code: 'audit.view',
        name: 'Visualizar Trilha de Auditoria',
        description: 'Permite auditar todas as ações realizadas pelos funcionários.',
        resourceGroup: 'stores',
      },
      {
        code: 'integrations.manage',
        name: 'Configurar Integrações de API (API Studio)',
        description: 'Permite gerenciar conectores externos e sincronizações de dados.',
        resourceGroup: 'stores',
      },
    ],
  },
]

export const ALL_GRANULAR_PERMISSIONS: GranularPermissionDef[] =
  GRANULAR_PERMISSION_GROUPS.flatMap((g) => g.permissions)

export const ALL_GRANULAR_PERMISSION_CODES: string[] = ALL_GRANULAR_PERMISSIONS.map(
  (p) => p.code
)

export const ROLE_METADATA: Record<
  UserRole,
  {
    label: string
    shortLabel: string
    variant: 'default' | 'success' | 'warning' | 'secondary' | 'outline'
    badgeClass: string
    description: string
    defaultCanApproveWriteoff: boolean
  }
> = {
  GLOBAL_ADMIN: {
    label: 'Global Admin',
    shortLabel: 'Global Admin',
    variant: 'default',
    badgeClass: 'bg-primary text-primary-foreground border-primary',
    description: 'Acesso administrativo irrestrito a todas as lojas, filiais e configurações.',
    defaultCanApproveWriteoff: true,
  },
  STORE_ADMIN: {
    label: 'Admin Loja',
    shortLabel: 'Admin Loja',
    variant: 'default',
    badgeClass: 'bg-primary/15 text-primary border-primary/30',
    description: 'Gestão completa da loja, filiais, equipe, aprovadores, estoque e vendas.',
    defaultCanApproveWriteoff: true,
  },
  STOCK_APPROVER: {
    label: 'Aprovador de Baixa de Estoque',
    shortLabel: 'Aprovador de Estoque',
    variant: 'warning',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    description:
      'Supervisor habilitado exclusivamente para autorizar baixas de estoque, perdas, validades e remessas entre filiais.',
    defaultCanApproveWriteoff: true,
  },
  FINANCE: {
    label: 'Gerente / Financeiro',
    shortLabel: 'Financeiro',
    variant: 'success',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    description: 'Acesso a relatórios financeiros, margens, compras, fornecedores e auditoria.',
    defaultCanApproveWriteoff: false,
  },
  SELLER: {
    label: 'Vendedor / Operador de Caixa',
    shortLabel: 'Vendedor / PDV',
    variant: 'secondary',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    description: 'Operação de vendas no PDV, atendimento de pedidos e cadastro de clientes.',
    defaultCanApproveWriteoff: false,
  },
  INVENTORY: {
    label: 'Estoquista Operacional',
    shortLabel: 'Estoquista',
    variant: 'outline',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
    description:
      'Lança entradas, contagens e solicita baixas de estoque (depende de um Aprovador para efetivar baixas restritas).',
    defaultCanApproveWriteoff: false,
  },
  VIEWER: {
    label: 'Visualizador / Auditoria Leitura',
    shortLabel: 'Visualizador',
    variant: 'outline',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    description: 'Acesso estritamente de leitura para consulta de catálogo, saldos e pedidos.',
    defaultCanApproveWriteoff: false,
  },
}

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  GLOBAL_ADMIN: [...ALL_GRANULAR_PERMISSION_CODES],
  STORE_ADMIN: [...ALL_GRANULAR_PERMISSION_CODES],
  STOCK_APPROVER: [
    'products.read',
    'products.view_cost',
    'inventory.read',
    'inventory.receive',
    'inventory.adjust',
    'inventory.writeoff_request',
    'inventory.approve_writeoff',
    'inventory.batches',
    'inventory.cost_centers',
    'branches.read',
    'branches.transfer_send',
    'branches.transfer_receive',
    'purchase_orders.read',
    'purchase_orders.receive',
    'suppliers.read',
    'reports.inventory',
    'reports.financial',
  ],
  FINANCE: [
    'products.read',
    'products.view_cost',
    'products.change_price',
    'inventory.read',
    'branches.read',
    'sales.read',
    'orders.read',
    'purchase_orders.read',
    'purchase_orders.create',
    'purchase_orders.approve',
    'purchase_orders.cancel',
    'suppliers.read',
    'suppliers.create',
    'customers.read',
    'customers.export',
    'reports.sales',
    'reports.inventory',
    'reports.financial',
    'reports.customers',
    'reports.suppliers',
    'reports.export',
    'audit.view',
  ],
  SELLER: [
    'products.read',
    'catalog.whatsapp',
    'inventory.read',
    'sales.pos',
    'sales.read',
    'orders.read',
    'orders.manage',
    'customers.read',
    'customers.create',
    'customers.update',
    'reports.sales',
  ],
  INVENTORY: [
    'products.read',
    'products.create',
    'products.update',
    'categories.manage',
    'inventory.read',
    'inventory.receive',
    'inventory.adjust',
    'inventory.writeoff_request',
    'inventory.batches',
    'branches.read',
    'branches.transfer_receive',
    'purchase_orders.read',
    'purchase_orders.receive',
    'suppliers.read',
    'reports.inventory',
  ],
  VIEWER: [
    'products.read',
    'inventory.read',
    'branches.read',
    'sales.read',
    'orders.read',
    'customers.read',
    'suppliers.read',
    'purchase_orders.read',
    'reports.sales',
    'reports.inventory',
  ],
}

/**
 * Calcula a lista final de permissões granulares de um funcionário na loja,
 * combinando o papel base (ou papel customizado), flag de aprovador de baixa,
 * permissões concedidas (`grantedPermissions`) e revogadas (`revokedPermissions`).
 */
export function resolveEmployeePermissions(params: {
  role: UserRole
  canApproveWriteoff?: boolean
  customRolePermissions?: string[] | null
  grantedPermissions?: string[]
  revokedPermissions?: string[]
}): {
  effectivePermissions: string[]
  canApproveWriteoff: boolean
} {
  const baseList =
    params.customRolePermissions && params.customRolePermissions.length > 0
      ? params.customRolePermissions
      : ROLE_DEFAULT_PERMISSIONS[params.role] || []

  const set = new Set<string>(baseList)

  for (const granted of params.grantedPermissions || []) {
    set.add(granted)
  }

  if (params.canApproveWriteoff || params.role === 'STOCK_APPROVER') {
    set.add('inventory.approve_writeoff')
    set.add('inventory.writeoff_request')
    set.add('inventory.read')
  }

  for (const revoked of params.revokedPermissions || []) {
    set.delete(revoked)
  }

  // Se canApproveWriteoff foi explicitamente definido como false, remove a permissão de aprovar baixa
  if (params.canApproveWriteoff === false && params.role !== 'GLOBAL_ADMIN') {
    set.delete('inventory.approve_writeoff')
  }

  return {
    effectivePermissions: Array.from(set),
    canApproveWriteoff: set.has('inventory.approve_writeoff'),
  }
}

export function isMemberStockApprover(member: StoreMember): boolean {
  const resolved = resolveEmployeePermissions({
    role: member.role,
    canApproveWriteoff: member.canApproveWriteoff,
    grantedPermissions: member.grantedPermissions,
    revokedPermissions: member.revokedPermissions,
  })
  return resolved.canApproveWriteoff
}

export function formatRoleLabel(role?: string | null): string {
  if (!role) return 'Visualizador'
  if (role === 'STORE_ADMIN') return 'Admin Loja'
  if (role === 'GLOBAL_ADMIN') return 'Global Admin'
  const meta = ROLE_METADATA[role as UserRole]
  return meta?.shortLabel || meta?.label || role
}

