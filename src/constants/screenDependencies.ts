import type {
  ModuleCode,
  PermissionGroup,
  PermissionModule,
  ScreenDependencyImpact,
} from '@/types/permissionGroup.types'

export const ALL_MODULE_CODES: ModuleCode[] = [
  'MOD_CATALOG_WA',
  'MOD_POS_SALES',
  'MOD_INVENTORY',
  'MOD_EXPIRATION',
  'MOD_PURCHASING',
  'MOD_SUPPLIERS',
  'MOD_CUSTOMERS',
  'MOD_REPORTS',
  'MOD_TEAM_AUDIT',
  'MOD_API_INTEGRATIONS',
]

export const DEFAULT_PERMISSION_MODULES: PermissionModule[] = [
  {
    code: 'MOD_CATALOG_WA',
    name: 'Catálogo de Produtos & Vendas WhatsApp',
    description:
      'Cadastro de produtos (/products), categorias (/categories), vitrine pública (/store/:slug) e recebimento/gestão de pedidos via WhatsApp (/orders).',
    category: 'VENDAS',
    routes: ['/products', '/categories', '/orders'],
    permissions: [
      'products.read',
      'products.create',
      'products.update',
      'products.delete',
      'categories.manage',
      'orders.read',
      'orders.manage',
      'catalog.whatsapp',
    ],
    monthlyPrice: 49.9,
    sortOrder: 1,
    isActive: true,
  },
  {
    code: 'MOD_POS_SALES',
    name: 'Vendas PDV (Frente de Caixa Presencial)',
    description:
      'Ponto de Venda rápido (/sales) com busca por código de barras/SKU, carrinho presencial, desconto e múltiplos meios de pagamento.',
    category: 'VENDAS',
    routes: ['/sales'],
    permissions: ['sales.pos', 'sales.read', 'sales.create', 'sales.update'],
    monthlyPrice: 59.9,
    sortOrder: 2,
    isActive: true,
  },
  {
    code: 'MOD_INVENTORY',
    name: 'Controle de Estoque (Saldos, Kardex e Baixas)',
    description:
      'Gestão de saldos de estoque (/inventory), ajustes manuais de inventário, baixas por perda/avaria e histórico completo de movimentações.',
    category: 'CATALOGO_ESTOQUE',
    routes: ['/inventory'],
    permissions: ['inventory.read', 'inventory.adjust', 'inventory.receive', 'inventory.writeoff'],
    monthlyPrice: 49.9,
    sortOrder: 3,
    isActive: true,
  },
  {
    code: 'MOD_EXPIRATION',
    name: 'Controle de Lotes & Validades (FEFO)',
    description:
      'Monitoramento de validades (/expiration), semáforo de lotes próximos de vencer e tratativas auditáveis (devolução, descarte, retenção).',
    category: 'CATALOGO_ESTOQUE',
    routes: ['/expiration'],
    permissions: ['inventory.expiration', 'inventory.batches'],
    monthlyPrice: 29.9,
    sortOrder: 4,
    isActive: true,
  },
  {
    code: 'MOD_PURCHASING',
    name: 'Gestão de Compras (Ordens de Compra)',
    description:
      'Emissão de Ordens de Compra (/purchases), recebimento de mercadorias com entrada automática de lote/saldo e sincronização de preço de custo/markup.',
    category: 'COMPRAS_SUPRIMENTOS',
    routes: ['/purchases'],
    permissions: [
      'purchasing.read',
      'purchasing.create',
      'purchasing.receive',
      'purchase_orders.read',
      'purchase_orders.create',
      'purchase_orders.receive',
    ],
    monthlyPrice: 39.9,
    sortOrder: 5,
    isActive: true,
  },
  {
    code: 'MOD_SUPPLIERS',
    name: 'Cadastro & Gestão de Fornecedores',
    description:
      'Base de fornecedores (/suppliers), CNPJ, contatos comerciais e vínculo direto com produtos e ordens de compra.',
    category: 'COMPRAS_SUPRIMENTOS',
    routes: ['/suppliers'],
    permissions: ['suppliers.read', 'suppliers.create', 'suppliers.update', 'suppliers.delete'],
    monthlyPrice: 19.9,
    sortOrder: 6,
    isActive: true,
  },
  {
    code: 'MOD_CUSTOMERS',
    name: 'Cadastro de Clientes & CRM',
    description:
      'Gestão da carteira de clientes (/customers), endereços de entrega e histórico nominal de compras no PDV e WhatsApp.',
    category: 'VENDAS',
    routes: ['/customers'],
    permissions: ['customers.read', 'customers.create', 'customers.update', 'customers.delete'],
    monthlyPrice: 24.9,
    sortOrder: 7,
    isActive: true,
  },
  {
    code: 'MOD_REPORTS',
    name: 'Gestão de Relatórios & BI (Curva ABC, Valuation, CSV)',
    description:
      'Painel executivo (/reports) com Curva ABC de produtos, Valuation financeiro do estoque, Perdas, Compras por Fornecedor, Ticket Médio, Previsão de Demanda e exportação CSV.',
    category: 'GESTAO_BI',
    routes: ['/reports'],
    permissions: [
      'reports.view',
      'reports.sales',
      'reports.inventory',
      'reports.purchasing',
      'reports.export',
    ],
    monthlyPrice: 49.9,
    sortOrder: 8,
    isActive: true,
  },
  {
    code: 'MOD_TEAM_AUDIT',
    name: 'Gestão de Equipe, Configurações & Auditoria',
    description:
      'Administração de colaboradores da loja (/team), trilha de auditoria (/audit) e personalização visual/dados da loja (/settings).',
    category: 'GESTAO_BI',
    routes: ['/team', '/audit', '/settings', '/stores'],
    permissions: ['users.manage', 'stores.manage', 'audit.view'],
    monthlyPrice: 29.9,
    sortOrder: 9,
    isActive: true,
  },
  {
    code: 'MOD_API_INTEGRATIONS',
    name: 'Integrações Externas API (Conector REST & HBAC)',
    description:
      'Conectores HTTP estilo Postman (/integrations) para sincronizar Clientes, Produtos, Fornecedores e Estoque com ERPs e plataformas externas.',
    category: 'TECNOLOGIA',
    routes: ['/integrations'],
    permissions: ['integrations.manage'],
    monthlyPrice: 79.9,
    sortOrder: 10,
    isActive: true,
  },
]

export const DEFAULT_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'default-plan-whatsapp-only',
    code: 'PLAN_WHATSAPP_ONLY',
    name: 'Catálogo de Venda Somente por WhatsApp',
    description:
      'Ideal para negócios que vendem exclusivamente pelo link do catálogo online e recebem pedidos no WhatsApp, sem PDV presencial, Compras ou Relatórios BI.',
    badgeColor: 'emerald',
    enabledModules: ['MOD_CATALOG_WA', 'MOD_CUSTOMERS'],
    enabledPermissions: [
      'products.read',
      'products.create',
      'products.update',
      'products.delete',
      'categories.manage',
      'orders.read',
      'orders.manage',
      'catalog.whatsapp',
      'customers.read',
      'customers.create',
      'customers.update',
    ],
    baseMonthlyPrice: 59.9,
    annualPrice: 599.0,
    setupFee: 0,
    isSystemDefault: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'default-plan-inventory-control',
    code: 'PLAN_INVENTORY_CONTROL',
    name: 'Controle de Estoque, Validades & Compras',
    description:
      'Focado em operação de almoxarifado, restaurantes e controle rigoroso de saldos, lotes/validades FEFO, fornecedores e ordens de compra (sem PDV e sem Relatórios BI).',
    badgeColor: 'amber',
    enabledModules: [
      'MOD_CATALOG_WA',
      'MOD_INVENTORY',
      'MOD_EXPIRATION',
      'MOD_PURCHASING',
      'MOD_SUPPLIERS',
    ],
    enabledPermissions: [
      'products.read',
      'products.create',
      'products.update',
      'categories.manage',
      'inventory.read',
      'inventory.adjust',
      'inventory.receive',
      'inventory.writeoff',
      'inventory.expiration',
      'inventory.batches',
      'purchasing.read',
      'purchasing.create',
      'purchasing.receive',
      'purchase_orders.read',
      'purchase_orders.create',
      'purchase_orders.receive',
      'suppliers.read',
      'suppliers.create',
      'suppliers.update',
    ],
    baseMonthlyPrice: 119.9,
    annualPrice: 1199.0,
    setupFee: 150.0,
    isSystemDefault: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'default-plan-pos-and-stock',
    code: 'PLAN_POS_AND_STOCK',
    name: 'Comercial PDV + Estoque + Catálogo WhatsApp',
    description:
      'Operação completa de frente de caixa presencial (PDV), vendas por WhatsApp, clientes e controle de estoque/validades (sem módulo de Compras e sem Relatórios BI).',
    badgeColor: 'blue',
    enabledModules: [
      'MOD_CATALOG_WA',
      'MOD_POS_SALES',
      'MOD_INVENTORY',
      'MOD_EXPIRATION',
      'MOD_CUSTOMERS',
    ],
    enabledPermissions: [
      'products.read',
      'products.create',
      'products.update',
      'categories.manage',
      'orders.read',
      'orders.manage',
      'catalog.whatsapp',
      'sales.pos',
      'sales.read',
      'sales.create',
      'sales.update',
      'inventory.read',
      'inventory.adjust',
      'inventory.receive',
      'inventory.writeoff',
      'inventory.expiration',
      'inventory.batches',
      'customers.read',
      'customers.create',
      'customers.update',
    ],
    baseMonthlyPrice: 149.9,
    annualPrice: 1499.0,
    setupFee: 150.0,
    isSystemDefault: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'default-plan-pro-management',
    code: 'PLAN_PRO_MANAGEMENT',
    name: 'Gestão Completa Pro (PDV + Estoque + Compras + Relatórios)',
    description:
      'Inclui todas as ferramentas operacionais da loja, gestão de compras, controle de equipe/auditoria e relatórios gerenciais completos.',
    badgeColor: 'indigo',
    enabledModules: [
      'MOD_CATALOG_WA',
      'MOD_POS_SALES',
      'MOD_INVENTORY',
      'MOD_EXPIRATION',
      'MOD_PURCHASING',
      'MOD_SUPPLIERS',
      'MOD_CUSTOMERS',
      'MOD_REPORTS',
      'MOD_TEAM_AUDIT',
    ],
    enabledPermissions: [
      'products.*',
      'categories.manage',
      'orders.*',
      'catalog.whatsapp',
      'sales.*',
      'inventory.*',
      'purchasing.*',
      'purchase_orders.*',
      'suppliers.*',
      'customers.*',
      'reports.*',
      'users.manage',
      'stores.manage',
      'audit.view',
    ],
    baseMonthlyPrice: 199.9,
    annualPrice: 1999.0,
    setupFee: 250.0,
    isSystemDefault: true,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'default-plan-enterprise-full',
    code: 'PLAN_ENTERPRISE_FULL',
    name: 'Enterprise Full + Integrações API Externa',
    description:
      'Acesso total irrestrito a todos os módulos da plataforma, incluindo o Integrador de APIs Externas (ERP/CRM) e Tokens HBAC.',
    badgeColor: 'violet',
    enabledModules: [...ALL_MODULE_CODES],
    enabledPermissions: ['*'],
    baseMonthlyPrice: 269.9,
    annualPrice: 2699.0,
    setupFee: 350.0,
    isSystemDefault: false,
    isActive: true,
    sortOrder: 5,
  },
]

export const ROUTE_TO_MODULE_MAP: Record<string, ModuleCode> = {
  '/products': 'MOD_CATALOG_WA',
  '/categories': 'MOD_CATALOG_WA',
  '/orders': 'MOD_CATALOG_WA',
  '/sales': 'MOD_POS_SALES',
  '/inventory': 'MOD_INVENTORY',
  '/expiration': 'MOD_EXPIRATION',
  '/purchases': 'MOD_PURCHASING',
  '/suppliers': 'MOD_SUPPLIERS',
  '/customers': 'MOD_CUSTOMERS',
  '/reports': 'MOD_REPORTS',
  '/team': 'MOD_TEAM_AUDIT',
  '/team/new': 'MOD_TEAM_AUDIT',
  '/audit': 'MOD_TEAM_AUDIT',
  '/settings': 'MOD_TEAM_AUDIT',
  '/stores': 'MOD_TEAM_AUDIT',
  '/integrations': 'MOD_API_INTEGRATIONS',
}

/**
 * Motor determinístico de análise de dependências entre telas.
 * Sempre que uma tela/módulo está desmarcada, informa exatamente o que
 * para de funcionar ou muda de comportamento nas outras telas que continuam ativas.
 */
export function analyzeScreenDependencies(enabledModules: ModuleCode[]): ScreenDependencyImpact[] {
  const impacts: ScreenDependencyImpact[] = []
  const isEnabled = (code: ModuleCode) => enabledModules.includes(code)

  // 1. Vendas PDV (/sales) desmarcado
  if (!isEnabled('MOD_POS_SALES')) {
    impacts.push({
      disabledModule: 'MOD_POS_SALES',
      disabledModuleName: 'Vendas PDV (/sales)',
      affectedScreens: ['Catálogo Público (/store/:slug)', 'Pedidos (/orders)', 'Relatórios (/reports)', 'Dashboard (/dashboard)'],
      severity: 'INFO',
      title: 'Operação sem Frente de Caixa Presencial (PDV)',
      whatStopsWorking: [
        'A tela de Vendas Rápidas no balcão (/sales) e o atalho "Nova Venda (PDV)" no Command-K ficam bloqueados.',
        'Em Relatórios (/reports), as abas de Vendas, Curva ABC e Ticket Médio não terão lançamentos de caixa presencial.',
      ],
      whatStillWorks: [
        'O Catálogo Público (/store/:slug) e a tela de Pedidos (/orders) continuam 100% funcionais para vendas somente por WhatsApp.',
        'A aprovação de pedidos recebidos via WhatsApp em /orders continua baixando estoque normalmente.',
      ],
    })
  }

  // 2. Fornecedores (/suppliers) desmarcado enquanto Compras (/purchases) está ativo -> CRÍTICO
  if (!isEnabled('MOD_SUPPLIERS') && isEnabled('MOD_PURCHASING')) {
    impacts.push({
      disabledModule: 'MOD_SUPPLIERS',
      disabledModuleName: 'Fornecedores (/suppliers)',
      affectedModule: 'MOD_PURCHASING',
      affectedScreens: ['Compras (/purchases)', 'Produtos (/products)'],
      severity: 'CRITICAL',
      title: 'Conflito Direto: Compras depende de Fornecedores',
      whatStopsWorking: [
        'Na tela de Compras (/purchases), o usuário NÃO conseguirá criar novas Ordens de Compra sem cadastrar/gerenciar fornecedores (supplier_id é obrigatório).',
        'No cadastro de Produtos (/products), o vínculo de fornecedor principal ficará indisponível.',
      ],
      whatStillWorks: [
        'Ordens de compra antigas já cadastradas ainda podem ser consultadas.',
      ],
      suggestedQuickFix: {
        label: 'Reativar Fornecedores (+R$ 19,90)',
        action: 'ENABLE_MODULE',
        targetModule: 'MOD_SUPPLIERS',
      },
    })
  } else if (!isEnabled('MOD_SUPPLIERS')) {
    impacts.push({
      disabledModule: 'MOD_SUPPLIERS',
      disabledModuleName: 'Fornecedores (/suppliers)',
      affectedScreens: ['Produtos (/products)'],
      severity: 'INFO',
      title: 'Produtos sem vínculo de Fornecedor',
      whatStopsWorking: [
        'O gerenciamento da carteira de fornecedores (/suppliers) fica oculto.',
        'Produtos não terão histórico de fornecedor vinculado.',
      ],
      whatStillWorks: [
        'Cadastro de produtos, categorias e vendas operam normalmente sem fornecedor.',
      ],
    })
  }

  // 3. Controle de Estoque (/inventory) desmarcado
  if (!isEnabled('MOD_INVENTORY')) {
    const hasExpiration = isEnabled('MOD_EXPIRATION')
    const hasSalesOrCatalog = isEnabled('MOD_POS_SALES') || isEnabled('MOD_CATALOG_WA')

    impacts.push({
      disabledModule: 'MOD_INVENTORY',
      disabledModuleName: 'Controle de Estoque (/inventory)',
      affectedModule: hasExpiration ? 'MOD_EXPIRATION' : undefined,
      affectedScreens: [
        ...(hasExpiration ? ['Lotes e Validades (/expiration)'] : []),
        'Produtos (/products)',
        ...(isEnabled('MOD_POS_SALES') ? ['Vendas PDV (/sales)'] : []),
        ...(isEnabled('MOD_REPORTS') ? ['Relatórios (/reports)'] : []),
      ],
      severity: hasExpiration ? 'CRITICAL' : 'WARNING',
      title: hasExpiration
        ? 'Validades (/expiration) ativa sem Controle de Estoque (/inventory)'
        : 'Operação sem Gestão de Saldos e Ajustes de Estoque',
      whatStopsWorking: [
        'O usuário não poderá realizar ajustes manuais de saldo, contagens físicas nem registrar baixas por perda/avaria (/inventory).',
        ...(hasExpiration
          ? ['Na tela de Validades (/expiration), o usuário verá os lotes mas não poderá ajustar saldos físicos no Kardex.']
          : []),
        ...(hasSalesOrCatalog
          ? ['Caso um produto zere o saldo, o usuário não terá a tela /inventory para repor ou corrigir divergências de estoque.']
          : []),
        ...(isEnabled('MOD_REPORTS')
          ? ['Em Relatórios (/reports), as abas de Valuation de Estoque, Perdas/Baixas e Ruptura perdem o gerenciamento operacional.']
          : []),
      ],
      whatStillWorks: [
        'A entrada rápida de saldo inicial diretamente pelo cadastro de Produtos (/products) continua disponível.',
      ],
      suggestedQuickFix: hasExpiration
        ? {
            label: 'Reativar Controle de Estoque (+R$ 49,90)',
            action: 'ENABLE_MODULE',
            targetModule: 'MOD_INVENTORY',
          }
        : undefined,
    })
  }

  // 4. Compras (/purchases) desmarcado
  if (!isEnabled('MOD_PURCHASING')) {
    impacts.push({
      disabledModule: 'MOD_PURCHASING',
      disabledModuleName: 'Gestão de Compras (/purchases)',
      affectedScreens: [
        'Controle de Estoque (/inventory)',
        'Lotes e Validades (/expiration)',
        'Produtos (/products)',
        ...(isEnabled('MOD_REPORTS') ? ['Relatórios (/reports)'] : []),
      ],
      severity: 'WARNING',
      title: 'Abastecimento de Estoque somente Manual (Sem Ordem de Compra)',
      whatStopsWorking: [
        'A entrada automática de estoque e criação de lotes via Recebimento de Ordem de Compra (receive_purchase_order_stock) deixa de existir.',
        'A atualização automática de Preço de Custo (cost_price) e Markup no cadastro de Produtos (/products) ao receber mercadoria para de ocorrer.',
        ...(isEnabled('MOD_REPORTS')
          ? ['Em Relatórios (/reports), a aba "Compras por Fornecedor" não terá novos lançamentos.']
          : []),
      ],
      whatStillWorks: [
        'O usuário ainda pode alimentar o estoque manualmente pela tela de Controle de Estoque (/inventory) ou Entrada em Lote em Produtos (/products).',
      ],
    })
  }

  // 5. Lotes e Validades (/expiration) desmarcado
  if (!isEnabled('MOD_EXPIRATION') && isEnabled('MOD_INVENTORY')) {
    impacts.push({
      disabledModule: 'MOD_EXPIRATION',
      disabledModuleName: 'Lotes & Validades (/expiration)',
      affectedScreens: ['Controle de Estoque (/inventory)', 'Notificações (/notifications)'],
      severity: 'INFO',
      title: 'Estoque sem Controle de Vencimento de Lotes (FEFO)',
      whatStopsWorking: [
        'O semáforo de produtos vencidos/próximos de vencer (/expiration) e as tratativas (Devolvido, Descartado, Em Análise) ficam bloqueados.',
        'Os alertas de vencimento em Notificações (/notifications) não poderão ser tratados lote a lote.',
      ],
      whatStillWorks: [
        'O controle de quantidade global em estoque (/inventory) continua funcionando normalmente.',
      ],
    })
  }

  // 6. Clientes (/customers) desmarcado
  if (!isEnabled('MOD_CUSTOMERS') && (isEnabled('MOD_POS_SALES') || isEnabled('MOD_CATALOG_WA'))) {
    impacts.push({
      disabledModule: 'MOD_CUSTOMERS',
      disabledModuleName: 'Clientes & CRM (/customers)',
      affectedScreens: [
        ...(isEnabled('MOD_POS_SALES') ? ['Vendas PDV (/sales)'] : []),
        'Pedidos (/orders)',
        ...(isEnabled('MOD_REPORTS') ? ['Relatórios (/reports)'] : []),
      ],
      severity: 'WARNING',
      title: 'Vendas restritas a "Cliente Genérico" (Sem histórico por cliente)',
      whatStopsWorking: [
        'No PDV (/sales) e em Pedidos (/orders), não será possível cadastrar novos clientes nem consultar a ficha cadastral em /customers.',
        'Em Relatórios (/reports), a aba de "Ticket Médio / Ranking de Clientes" não terá detalhamento nominal.',
      ],
      whatStillWorks: [
        'As vendas no PDV e WhatsApp continuam funcionando utilizando automaticamente o "Cliente Genérico / Consumidor Final".',
      ],
      suggestedQuickFix: {
        label: 'Ativar Clientes (+R$ 24,90)',
        action: 'ENABLE_MODULE',
        targetModule: 'MOD_CUSTOMERS',
      },
    })
  }

  // 7. Gestão de Relatórios (/reports) desmarcado
  if (!isEnabled('MOD_REPORTS')) {
    impacts.push({
      disabledModule: 'MOD_REPORTS',
      disabledModuleName: 'Gestão de Relatórios & BI (/reports)',
      affectedScreens: ['Dashboard (/dashboard)'],
      severity: 'INFO',
      title: 'Operação sem Inteligência Analítica (BI) e Exportação CSV',
      whatStopsWorking: [
        'A tela de Relatórios Gerenciais (/reports) com Curva ABC, Valuation Financeiro, Perdas, Ticket Médio, Demanda e Exportação CSV fica bloqueada.',
      ],
      whatStillWorks: [
        'O Dashboard inicial (/dashboard) continua exibindo os 4 indicadores rápidos do dia e todas as telas operacionais contratadas funcionam sem restrições.',
      ],
    })
  }

  // 8. Catálogo & Produtos (MOD_CATALOG_WA) desmarcado enquanto outros módulos estão marcados -> CRÍTICO
  if (!isEnabled('MOD_CATALOG_WA') && enabledModules.length > 0) {
    impacts.push({
      disabledModule: 'MOD_CATALOG_WA',
      disabledModuleName: 'Catálogo de Produtos & Pedidos (/products, /orders)',
      affectedScreens: ['Vendas PDV (/sales)', 'Controle de Estoque (/inventory)', 'Compras (/purchases)', 'Catálogo Público (/store/:slug)'],
      severity: 'CRITICAL',
      title: 'Base de Produtos Desmarcada: Impacta toda a plataforma',
      whatStopsWorking: [
        'Sem o módulo de Produtos & Categorias (/products, /categories), o usuário não consegue cadastrar novos itens nem gerenciar pedidos (/orders).',
        'O PDV (/sales), Estoque (/inventory) e Compras (/purchases) dependem diretamente do cadastro de produtos.',
      ],
      whatStillWorks: [
        'Apenas consulta de produtos já existentes caso concedida permissão manual products.read.',
      ],
      suggestedQuickFix: {
        label: 'Manter Produtos & Catálogo Ativo (+R$ 49,90)',
        action: 'ENABLE_MODULE',
        targetModule: 'MOD_CATALOG_WA',
      },
    })
  }

  return impacts
}
