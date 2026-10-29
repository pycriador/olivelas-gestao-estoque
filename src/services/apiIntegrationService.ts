import { supabase } from '@/lib/supabase/client'
import { generateSKU } from '@/utils/barcode'
import type {
  ApiIntegrationConnector,
  ApiIntegrationLog,
  DetectedJsonArrayPath,
  DryRunPreviewRow,
  FieldMappingsMap,
  FieldTransformType,
  HttpExecutionResult,
  HttpMethod,
  IntegrationAuthConfig,
  IntegrationAuthType,
  IntegrationBodyType,
  IntegrationPresetTemplate,
  IntegrationTargetService,
  KeyValueParam,
  ServiceSchemaDefinition,
  SyncExecutionSummary,
} from '@/types/apiIntegration.types'

function slugifyCategoryName(value: string): string {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `grupo-${Date.now()}`
}

export const SERVICE_SCHEMAS: Record<IntegrationTargetService, ServiceSchemaDefinition> = {
  customers: {
    service: 'customers',
    label: 'Clientes (CRM & Contatos)',
    shortLabel: 'Clientes',
    description:
      'Sincroniza contatos, clientes de ERPs, WhatsApp, Chatwoot ou gateways de pagamento direto para a base de Clientes da loja.',
    upsertOptions: [
      { key: 'phone', label: 'Telefone / WhatsApp (Evita duplicar número)' },
      { key: 'document', label: 'CPF / CNPJ (Documento)' },
      { key: 'email', label: 'E-mail' },
      { key: 'name', label: 'Nome Exato' },
    ],
    defaultUpsertKey: 'phone',
    fields: [
      {
        field: 'name',
        label: 'Nome Completo / Razão Social',
        required: true,
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Nome principal do cliente.',
        placeholder: 'Ex: name, nome, full_name, pushName',
        aliases: ['name', 'nome', 'full_name', 'fullname', 'razao_social', 'cliente', 'contact_name', 'pushName', 'title'],
      },
      {
        field: 'phone',
        label: 'Telefone / WhatsApp',
        type: 'string',
        defaultTransform: 'DIGITS_ONLY',
        description: 'Número de telefone ou WhatsApp (JID/celular).',
        placeholder: 'Ex: phone, telefone, whatsapp, phone_number, celular',
        aliases: ['phone', 'telefone', 'whatsapp', 'celular', 'mobile', 'phone_number', 'phonenumber', 'fone', 'jid', 'displayPhone'],
      },
      {
        field: 'email',
        label: 'E-mail',
        type: 'string',
        defaultTransform: 'LOWERCASE',
        description: 'Endereço de e-mail do cliente.',
        placeholder: 'Ex: email, mail, e_mail',
        aliases: ['email', 'e_mail', 'mail', 'correo', 'contact_email'],
      },
      {
        field: 'document',
        label: 'CPF / CNPJ',
        type: 'string',
        defaultTransform: 'DIGITS_ONLY',
        description: 'Documento fiscal do cliente.',
        placeholder: 'Ex: document, cpf, cnpj, cpfCnpj, tax_id',
        aliases: ['document', 'documento', 'cpf', 'cnpj', 'cpfcnpj', 'cpf_cnpj', 'tax_id', 'doc'],
      },
      {
        field: 'notes',
        label: 'Observações / Grupo / Tags',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Observações gerais, grupo de origem ou etiquetas externas.',
        placeholder: 'Ex: notes, observacoes, group_name, tags',
        aliases: ['notes', 'observacoes', 'obs', 'description', 'group', 'group_name', 'tags', 'origem'],
      },
      {
        field: 'street',
        label: 'Endereço — Logradouro / Rua',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Se preenchido, cria/atualiza o endereço principal do cliente.',
        placeholder: 'Ex: address.street, logradouro, rua, address',
        aliases: ['street', 'logradouro', 'rua', 'address', 'endereco', 'address.street'],
      },
      {
        field: 'city',
        label: 'Endereço — Cidade',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Cidade do endereço do cliente.',
        placeholder: 'Ex: address.city, cidade, municipio',
        aliases: ['city', 'cidade', 'municipio', 'address.city'],
      },
      {
        field: 'state',
        label: 'Endereço — UF / Estado',
        type: 'string',
        defaultTransform: 'UPPERCASE',
        description: 'Sigla do estado (ex: SP, RJ, MG).',
        placeholder: 'Ex: address.state, uf, estado',
        aliases: ['state', 'uf', 'estado', 'address.state'],
      },
      {
        field: 'zip_code',
        label: 'Endereço — CEP',
        type: 'string',
        defaultTransform: 'DIGITS_ONLY',
        description: 'CEP do cliente.',
        placeholder: 'Ex: address.zip_code, cep, postalCode',
        aliases: ['zip_code', 'zipcode', 'cep', 'postal_code', 'postalcode', 'address.zip_code'],
      },
    ],
  },

  categories: {
    service: 'categories',
    label: 'Grupos & Categorias',
    shortLabel: 'Grupos / Categorias',
    description:
      'Sincroniza grupos (WhatsApp, CRM, departamentos) ou categorias de produtos diretamente para a árvore de Grupos/Categorias da loja.',
    upsertOptions: [
      { key: 'name', label: 'Nome do Grupo / Categoria' },
      { key: 'slug', label: 'Slug / Identificador Único (JID / Código)' },
    ],
    defaultUpsertKey: 'name',
    fields: [
      {
        field: 'name',
        label: 'Nome do Grupo / Categoria',
        required: true,
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Nome exibido na listagem de grupos/categorias e no catálogo.',
        placeholder: 'Ex: name, nome, subject, group_name, title',
        aliases: ['name', 'nome', 'subject', 'group_name', 'category_name', 'title', 'grupo', 'categoria', 'label'],
      },
      {
        field: 'slug',
        label: 'Slug / Código / JID Externo',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Identificador único (gerado automaticamente a partir do nome se omitido).',
        placeholder: 'Ex: slug, jid, id, code, external_id',
        aliases: ['slug', 'jid', 'code', 'codigo', 'external_id'],
      },
      {
        field: 'parent_name',
        label: 'Grupo / Categoria Pai (Opcional)',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Se informado, vincula ou cria automaticamente a categoria pai.',
        placeholder: 'Ex: parent_name, parent, grupo_pai',
        aliases: ['parent_name', 'parent', 'categoria_pai', 'grupo_pai', 'parent_category'],
      },
    ],
  },

  products: {
    service: 'products',
    label: 'Produtos (Catálogo + Grupo + Estoque)',
    shortLabel: 'Produtos',
    description:
      'Sincroniza itens de catálogo, preços, códigos de barras, cria automaticamente o Grupo/Categoria vinculado e ajusta o saldo de estoque se mapeado.',
    upsertOptions: [
      { key: 'sku', label: 'Código SKU (Recomendado)' },
      { key: 'barcode', label: 'Código de Barras (EAN / GTIN)' },
      { key: 'name', label: 'Nome Exato do Produto' },
    ],
    defaultUpsertKey: 'sku',
    fields: [
      {
        field: 'name',
        label: 'Nome do Produto',
        required: true,
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Título comercial do produto no PDV e catálogo.',
        placeholder: 'Ex: name, nome, title, descricao_curta',
        aliases: ['name', 'nome', 'title', 'produto', 'product_name', 'descricao'],
      },
      {
        field: 'sku',
        label: 'Código SKU',
        required: true,
        type: 'string',
        defaultTransform: 'AUTO_SKU',
        description: 'Código interno único. Se a API externa não tiver SKU, o transformador AUTO_SKU gera automaticamente.',
        placeholder: 'Ex: sku, codigo, code, id, ref',
        aliases: ['sku', 'codigo', 'code', 'ref', 'referencia', 'id', 'product_code'],
      },
      {
        field: 'barcode',
        label: 'Código de Barras (EAN)',
        type: 'string',
        defaultTransform: 'DIGITS_ONLY',
        description: 'Código EAN/GTIN para leitura no PDV.',
        placeholder: 'Ex: barcode, ean, gtin, codigo_barras',
        aliases: ['barcode', 'ean', 'gtin', 'codigo_barras', 'cod_barras'],
      },
      {
        field: 'selling_price',
        label: 'Preço de Venda (R$)',
        type: 'number',
        defaultTransform: 'CURRENCY_NUMBER',
        description: 'Valor de venda ao consumidor.',
        placeholder: 'Ex: selling_price, price, preco, valor_venda',
        aliases: ['selling_price', 'price', 'preco', 'preco_venda', 'valor', 'sale_price', ' unit_price'],
      },
      {
        field: 'cost_price',
        label: 'Preço de Custo (R$)',
        type: 'number',
        defaultTransform: 'CURRENCY_NUMBER',
        description: 'Custo unitário de aquisição.',
        placeholder: 'Ex: cost_price, cost, preco_custo, custo',
        aliases: ['cost_price', 'cost', 'custo', 'preco_custo', ' purchase_price'],
      },
      {
        field: 'category_name',
        label: 'Nome do Grupo / Categoria',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Se informado, localiza ou cria o grupo/categoria automaticamente e vincula ao produto.',
        placeholder: 'Ex: category, category_name, categoria, grupo',
        aliases: ['category_name', 'category', 'categoria', 'grupo', 'group', 'group_name', 'department'],
      },
      {
        field: 'stock_quantity',
        label: 'Saldo de Estoque Atual',
        type: 'number',
        defaultTransform: 'CURRENCY_NUMBER',
        description: 'Se mapeado, sincroniza automaticamente o saldo físico da loja em stock_balances.',
        placeholder: 'Ex: stock_quantity, stock, estoque, quantity, saldo',
        aliases: ['stock_quantity', 'stock', 'estoque', 'quantity', 'quantidade', 'saldo', 'balance', 'available_quantity'],
      },
      {
        field: 'unit',
        label: 'Unidade de Medida',
        type: 'string',
        defaultTransform: 'UPPERCASE',
        description: 'Ex: UN, KG, LT, CX (Padrão: UN).',
        placeholder: 'Ex: unit, unidade, un',
        aliases: ['unit', 'unidade', 'un', 'uom', 'measure_unit'],
      },
      {
        field: 'min_stock',
        label: 'Estoque Mínimo',
        type: 'number',
        defaultTransform: 'CURRENCY_NUMBER',
        description: 'Gatilho para alerta de estoque crítico.',
        placeholder: 'Ex: min_stock, estoque_minimo',
        aliases: ['min_stock', 'estoque_minimo', 'min_quantity'],
      },
      {
        field: 'description',
        label: 'Descrição Detalhada',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Detalhes técnicos ou comerciais do produto.',
        placeholder: 'Ex: description, descricao_complementar, details',
        aliases: ['description', 'descricao_complementar', 'detalhes', 'details', 'notes', 'body'],
      },
    ],
  },

  suppliers: {
    service: 'suppliers',
    label: 'Fornecedores',
    shortLabel: 'Fornecedores',
    description: 'Sincroniza cadastro de fornecedores, fabricantes e parceiros comerciais.',
    upsertOptions: [
      { key: 'document', label: 'CNPJ / CPF (Documento)' },
      { key: 'name', label: 'Razão Social / Nome' },
    ],
    defaultUpsertKey: 'document',
    fields: [
      {
        field: 'name',
        label: 'Razão Social / Nome',
        required: true,
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Razão social ou nome principal do fornecedor.',
        aliases: ['name', 'nome', 'razao_social', 'company_name', 'supplier_name', 'fornecedor'],
      },
      {
        field: 'trade_name',
        label: 'Nome Fantasia',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Nome fantasia comercial.',
        aliases: ['trade_name', 'nome_fantasia', 'fantasia', 'brand'],
      },
      {
        field: 'document',
        label: 'CNPJ / CPF',
        type: 'string',
        defaultTransform: 'DIGITS_ONLY',
        description: 'Documento fiscal do fornecedor.',
        aliases: ['document', 'cnpj', 'cpf', 'documento', 'tax_id'],
      },
      {
        field: 'email',
        label: 'E-mail Comercial',
        type: 'string',
        defaultTransform: 'LOWERCASE',
        description: 'E-mail de contato ou pedidos.',
        aliases: ['email', 'mail', 'e_mail', 'contact_email'],
      },
      {
        field: 'phone',
        label: 'Telefone',
        type: 'string',
        defaultTransform: 'DIGITS_ONLY',
        description: 'Telefone fixo ou comercial.',
        aliases: ['phone', 'telefone', 'fone', 'phone_number'],
      },
      {
        field: 'whatsapp',
        label: 'WhatsApp',
        type: 'string',
        defaultTransform: 'DIGITS_ONLY',
        description: 'WhatsApp do representante.',
        aliases: ['whatsapp', 'celular', 'mobile'],
      },
      {
        field: 'notes',
        label: 'Observações',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Condições comerciais, prazos ou anotações.',
        aliases: ['notes', 'observacoes', 'obs', 'description'],
      },
    ],
  },

  inventory: {
    service: 'inventory',
    label: 'Estoque & Movimentações',
    shortLabel: 'Estoque',
    description: 'Lança entradas ou ajustes de saldo em lote vinculando pelo SKU do produto.',
    upsertOptions: [{ key: 'sku', label: 'SKU do Produto' }],
    defaultUpsertKey: 'sku',
    fields: [
      {
        field: 'sku',
        label: 'SKU do Produto',
        required: true,
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'SKU do produto já cadastrado na loja.',
        aliases: ['sku', 'codigo', 'product_sku', 'code', 'ref'],
      },
      {
        field: 'quantity',
        label: 'Quantidade',
        required: true,
        type: 'number',
        defaultTransform: 'CURRENCY_NUMBER',
        description: 'Quantidade a movimentar/ajustar.',
        aliases: ['quantity', 'quantidade', 'stock', 'estoque', 'saldo', 'qty'],
      },
      {
        field: 'unit_cost',
        label: 'Custo Unitário (R$)',
        type: 'number',
        defaultTransform: 'CURRENCY_NUMBER',
        description: 'Custo unitário da movimentação (opcional).',
        aliases: ['unit_cost', 'cost', 'cost_price', 'custo', 'preco_custo'],
      },
      {
        field: 'notes',
        label: 'Motivo / Observação',
        type: 'string',
        defaultTransform: 'TRIM',
        description: 'Identificação da origem da movimentação.',
        aliases: ['notes', 'observacao', 'reason', 'motivo', 'description'],
      },
    ],
  },
}

export const INTEGRATION_PRESETS: IntegrationPresetTemplate[] = [
  {
    id: 'wpp-clients',
    name: 'Sistema WPP / CRM — Importar Clientes',
    category: 'WhatsApp & CRM',
    description: 'Busca a lista de clientes/contatos de uma API REST (ex: Olivelas WPP Chat, Evolution, Chatwoot) e sincroniza com Clientes.',
    target_service: 'customers',
    method: 'GET',
    url: 'http://localhost:3001/api/clients',
    auth_type: 'BEARER',
    auth_config: { bearerToken: '' },
    query_params: [
      { id: 'qp-1', key: 'page', value: '1', description: 'Página inicial', enabled: true },
      { id: 'qp-2', key: 'limit', value: '100', description: 'Limite por página', enabled: true },
    ],
    headers: [{ id: 'h-1', key: 'Accept', value: 'application/json', enabled: true }],
    body_type: 'none',
    body_content: '',
    response_root_path: '$',
    upsert_key: 'phone',
    field_mappings: {
      name: { sourcePath: 'name', transform: 'TRIM', defaultValue: '' },
      phone: { sourcePath: 'phone', transform: 'DIGITS_ONLY', defaultValue: '' },
      email: { sourcePath: 'email', transform: 'LOWERCASE', defaultValue: '' },
      notes: { sourcePath: 'notes', transform: 'TRIM', defaultValue: 'Importado via API WPP' },
    },
  },
  {
    id: 'wpp-groups',
    name: 'Sistema WPP — Importar Grupos para Categorias',
    category: 'WhatsApp & CRM',
    description: 'Resgata grupos cadastrados na plataforma externa e vincula em Grupos / Categorias.',
    target_service: 'categories',
    method: 'GET',
    url: 'http://localhost:3001/api/groups',
    auth_type: 'BEARER',
    auth_config: { bearerToken: '' },
    query_params: [{ id: 'qp-1', key: 'limit', value: '100', description: 'Máximo de grupos', enabled: true }],
    headers: [{ id: 'h-1', key: 'Accept', value: 'application/json', enabled: true }],
    body_type: 'none',
    body_content: '',
    response_root_path: '$',
    upsert_key: 'name',
    field_mappings: {
      name: { sourcePath: 'name', transform: 'TRIM', defaultValue: '' },
      slug: { sourcePath: 'jid', transform: 'TRIM', defaultValue: '' },
    },
  },
  {
    id: 'wpp-products',
    name: 'ERP / Catálogo Externo — Importar Produtos + Grupo + Estoque',
    category: 'ERP & E-commerce',
    description: 'Importa produtos completos (nome, preço, SKU, categoria/grupo e saldo de estoque) de outra API.',
    target_service: 'products',
    method: 'GET',
    url: 'http://localhost:3001/api/products',
    auth_type: 'BEARER',
    auth_config: { bearerToken: '' },
    query_params: [{ id: 'qp-1', key: 'limit', value: '100', description: 'Itens por requisição', enabled: true }],
    headers: [{ id: 'h-1', key: 'Accept', value: 'application/json', enabled: true }],
    body_type: 'none',
    body_content: '',
    response_root_path: '$',
    upsert_key: 'sku',
    field_mappings: {
      name: { sourcePath: 'name', transform: 'TRIM', defaultValue: '' },
      sku: { sourcePath: 'sku', transform: 'AUTO_SKU', defaultValue: '' },
      selling_price: { sourcePath: 'price', transform: 'CURRENCY_NUMBER', defaultValue: '0' },
      cost_price: { sourcePath: 'cost_price', transform: 'CURRENCY_NUMBER', defaultValue: '0' },
      category_name: { sourcePath: 'category', transform: 'TRIM', defaultValue: 'Geral' },
      stock_quantity: { sourcePath: 'stock_quantity', transform: 'CURRENCY_NUMBER', defaultValue: '' },
      description: { sourcePath: 'description', transform: 'TRIM', defaultValue: '' },
    },
  },
  {
    id: 'asaas-customers',
    name: 'Asaas Pagamentos — Importar Clientes (GET /v3/customers)',
    category: 'Financeiro & ERP',
    description: 'Conecta na API v3 do Asaas via header access_token e sincroniza clientes pelo CPF/CNPJ ou telefone.',
    target_service: 'customers',
    method: 'GET',
    url: 'https://api.asaas.com/v3/customers',
    auth_type: 'API_KEY',
    auth_config: { apiKeyName: 'access_token', apiKeyValue: '', apiKeyIn: 'header' },
    query_params: [{ id: 'qp-1', key: 'limit', value: '100', description: 'Limite Asaas', enabled: true }],
    headers: [{ id: 'h-1', key: 'Accept', value: 'application/json', enabled: true }],
    body_type: 'none',
    body_content: '',
    response_root_path: 'data',
    upsert_key: 'document',
    field_mappings: {
      name: { sourcePath: 'name', transform: 'TRIM', defaultValue: '' },
      document: { sourcePath: 'cpfCnpj', transform: 'DIGITS_ONLY', defaultValue: '' },
      phone: { sourcePath: 'mobilePhone', transform: 'DIGITS_ONLY', defaultValue: '' },
      email: { sourcePath: 'email', transform: 'LOWERCASE', defaultValue: '' },
      street: { sourcePath: 'address', transform: 'TRIM', defaultValue: '' },
      zip_code: { sourcePath: 'postalCode', transform: 'DIGITS_ONLY', defaultValue: '' },
    },
  },
]

export function getValueByPath(obj: any, path: string): any {
  if (!obj || !path || path === '$') return obj
  const normalized = path.replace(/^\$\.?/, '').trim()
  if (!normalized) return obj

  const parts = normalized.split('.')
  let current: any = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    const arrayMatch = part.match(/^([^\[\]]+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, key, idx] = arrayMatch
      current = current?.[key]?.[Number(idx)]
    } else {
      current = current?.[part]
    }
  }
  return current
}

export function detectJsonArrays(payload: any): DetectedJsonArrayPath[] {
  const results: DetectedJsonArrayPath[] = []
  if (!payload) return results

  if (Array.isArray(payload)) {
    const firstObj = payload.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || null
    results.push({
      path: '$',
      label: `Raiz do JSON ($) — ${payload.length} registro(s)`,
      count: payload.length,
      sampleItem: firstObj,
    })
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const visit = (node: any, prefix: string, depth: number) => {
      if (depth > 3 || !node || typeof node !== 'object') return
      for (const [key, value] of Object.entries(node)) {
        const currentPath = prefix ? `${prefix}.${key}` : key
        if (Array.isArray(value)) {
          const firstObj = value.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || null
          results.push({
            path: currentPath,
            label: `${currentPath} (${value.length} registro(s))`,
            count: value.length,
            sampleItem: firstObj,
          })
        } else if (value && typeof value === 'object') {
          visit(value, currentPath, depth + 1)
        }
      }
    }
    visit(payload, '', 0)

    // Se o próprio objeto raiz for um único item (ex: retorno de 1 cliente/produto)
    if (results.length === 0 && Object.keys(payload).length > 0) {
      results.push({
        path: '$',
        label: 'Objeto Único na Raiz ($) — 1 registro',
        count: 1,
        sampleItem: payload,
      })
    }
  }

  return results
}

export function extractItemsFromResponse(parsedJson: any, rootPath: string): Record<string, any>[] {
  if (!parsedJson) return []
  const target = !rootPath || rootPath === '$' ? parsedJson : getValueByPath(parsedJson, rootPath)
  if (Array.isArray(target)) {
    return target.filter((item) => item && typeof item === 'object')
  }
  if (target && typeof target === 'object') {
    return [target]
  }
  return []
}

export function extractSampleKeys(items: Record<string, any>[]): Array<{ path: string; sampleValue: string; type: string }> {
  const keysMap = new Map<string, { path: string; sampleValue: string; type: string }>()
  const sampleSlice = items.slice(0, 5)

  const flattenObject = (obj: Record<string, any>, prefix = '', depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 2) return
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${k}` : k
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        flattenObject(v, fullPath, depth + 1)
      } else if (!keysMap.has(fullPath)) {
        let preview = ''
        if (v === null || v === undefined) preview = 'null'
        else if (Array.isArray(v)) preview = `[Array(${v.length})]`
        else preview = String(v).slice(0, 45)
        keysMap.set(fullPath, {
          path: fullPath,
          sampleValue: preview,
          type: Array.isArray(v) ? 'array' : typeof v,
        })
      }
    }
  }

  for (const item of sampleSlice) {
    flattenObject(item)
  }

  return Array.from(keysMap.values())
}

export function autoMapFields(
  service: IntegrationTargetService,
  availableKeys: Array<{ path: string; sampleValue: string; type: string }>
): FieldMappingsMap {
  const schema = SERVICE_SCHEMAS[service]
  const mappings: FieldMappingsMap = {}

  for (const fieldSpec of schema.fields) {
    const lowerAliases = fieldSpec.aliases.map((a) => a.toLowerCase().trim())
    let matchedPath = ''

    // 1. Exact match by key or leaf name
    for (const alias of lowerAliases) {
      const exact = availableKeys.find(
        (k) => k.path.toLowerCase() === alias || k.path.split('.').pop()?.toLowerCase() === alias
      )
      if (exact) {
        matchedPath = exact.path
        break
      }
    }

    // 2. Partial match
    if (!matchedPath) {
      for (const alias of lowerAliases) {
        const partial = availableKeys.find((k) => k.path.toLowerCase().includes(alias))
        if (partial) {
          matchedPath = partial.path
          break
        }
      }
    }

    mappings[fieldSpec.field] = {
      sourcePath: matchedPath,
      transform: fieldSpec.defaultTransform,
      defaultValue: fieldSpec.field === 'unit' ? 'UN' : '',
    }
  }

  return mappings
}

export function applyFieldTransform(rawValue: any, transform: FieldTransformType, fallbackValue = ''): any {
  const isEmpty = rawValue === undefined || rawValue === null || String(rawValue).trim() === ''
  const baseVal = isEmpty ? fallbackValue : rawValue

  switch (transform) {
    case 'TRIM':
      return String(baseVal ?? '').trim()
    case 'DIGITS_ONLY':
      return String(baseVal ?? '').replace(/\D+/g, '')
    case 'UPPERCASE':
      return String(baseVal ?? '').trim().toUpperCase()
    case 'LOWERCASE':
      return String(baseVal ?? '').trim().toLowerCase()
    case 'CURRENCY_NUMBER': {
      if (typeof baseVal === 'number') return Number.isFinite(baseVal) ? baseVal : 0
      const str = String(baseVal ?? '').trim()
      if (!str) return 0
      const normalized =
        str.includes(',') && str.includes('.')
          ? str.replace(/\./g, '').replace(',', '.')
          : str.replace(',', '.')
      const cleaned = normalized.replace(/[^0-9.-]/g, '')
      const num = parseFloat(cleaned)
      return Number.isFinite(num) ? num : 0
    }
    case 'BOOLEAN': {
      if (typeof baseVal === 'boolean') return baseVal
      const s = String(baseVal ?? '').trim().toLowerCase()
      return ['true', '1', 'sim', 'yes', 'ativo', 'active'].includes(s)
    }
    case 'AUTO_SKU': {
      const str = String(baseVal ?? '').trim()
      if (str) return str.toUpperCase().slice(0, 64)
      return generateSKU('API')
    }
    case 'NONE':
    default:
      return baseVal ?? ''
  }
}

export function parseCurlCommand(curlInput: string): {
  method: HttpMethod
  url: string
  auth_type: IntegrationAuthType
  auth_config: IntegrationAuthConfig
  query_params: KeyValueParam[]
  headers: KeyValueParam[]
  body_type: IntegrationBodyType
  body_content: string
} {
  const cleaned = curlInput
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  let method: HttpMethod = 'GET'
  const methodMatch = cleaned.match(/(?:-X|--request)\s+['"]?(GET|POST|PUT|PATCH|DELETE)['"]?/i)
  if (methodMatch) {
    method = methodMatch[1].toUpperCase() as HttpMethod
  }

  let rawUrl = ''
  const urlMatch = cleaned.match(/(https?:\/\/[^\s'"]+)/i)
  if (urlMatch) {
    rawUrl = urlMatch[1]
  }

  const headers: KeyValueParam[] = []
  let auth_type: IntegrationAuthType = 'NONE'
  const auth_config: IntegrationAuthConfig = {}

  const headerRegex = /(?:-H|--header)\s+(['"])(.*?)\1/gi
  let hMatch: RegExpExecArray | null
  let idx = 1
  while ((hMatch = headerRegex.exec(cleaned)) !== null) {
    const headerLine = hMatch[2]
    const sepIdx = headerLine.indexOf(':')
    if (sepIdx > 0) {
      const hKey = headerLine.slice(0, sepIdx).trim()
      const hVal = headerLine.slice(sepIdx + 1).trim()
      const lowerKey = hKey.toLowerCase()

      if (lowerKey === 'authorization' && hVal.toLowerCase().startsWith('bearer ')) {
        auth_type = 'BEARER'
        auth_config.bearerToken = hVal.slice(7).trim()
      } else if (
        auth_type === 'NONE' &&
        ['x-api-key', 'api_access_token', 'access_token', 'x-hbac-token'].includes(lowerKey)
      ) {
        auth_type = 'API_KEY'
        auth_config.apiKeyName = hKey
        auth_config.apiKeyValue = hVal
        auth_config.apiKeyIn = 'header'
      } else {
        headers.push({
          id: `curl-h-${idx++}`,
          key: hKey,
          value: hVal,
          enabled: true,
        })
      }
    }
  }

  let body_type: IntegrationBodyType = 'none'
  let body_content = ''
  const dataMatch = cleaned.match(/(?:-d|--data|--data-raw|--data-binary)\s+(['"])([\s\S]*?)\1/i)
  if (dataMatch) {
    body_content = dataMatch[2]
    body_type = 'json'
    if (!methodMatch) {
      method = 'POST'
    }
    try {
      body_content = JSON.stringify(JSON.parse(body_content), null, 2)
    } catch {
      // mantém raw
    }
  }

  const query_params: KeyValueParam[] = []
  let baseUrl = rawUrl
  try {
    const u = new URL(rawUrl)
    u.searchParams.forEach((value, key) => {
      query_params.push({
        id: `curl-qp-${query_params.length + 1}`,
        key,
        value,
        enabled: true,
      })
    })
    baseUrl = `${u.origin}${u.pathname}`
  } catch {
    // URL sem parse completo
  }

  return {
    method,
    url: baseUrl || rawUrl,
    auth_type,
    auth_config,
    query_params,
    headers,
    body_type,
    body_content,
  }
}

export function generateCurlCommand(
  config: {
    method: HttpMethod
    url: string
    auth_type: IntegrationAuthType
    auth_config: IntegrationAuthConfig
    query_params: KeyValueParam[]
    headers: KeyValueParam[]
    body_type: IntegrationBodyType
    body_content: string
  },
  maskSecrets = false
): string {
  const finalUrl = buildUrlWithParams(config.url, config.query_params, config.auth_type, config.auth_config, maskSecrets)
  const lines: string[] = [`curl -X ${config.method} "${finalUrl}"`]

  const allHeaders = buildRequestHeaders(config.auth_type, config.auth_config, config.headers, config.body_type, maskSecrets)
  for (const [k, v] of Object.entries(allHeaders)) {
    lines.push(`  -H "${k}: ${v}"`)
  }

  if (config.method !== 'GET' && config.body_type !== 'none' && config.body_content.trim()) {
    const compact = config.body_content.replace(/'/g, "\\'")
    lines.push(`  -d '${compact}'`)
  }

  return lines.join(' \\\n')
}

export function buildUrlWithParams(
  rawUrl: string,
  queryParams: KeyValueParam[],
  authType: IntegrationAuthType,
  authConfig: IntegrationAuthConfig,
  maskSecrets = false,
  variables: Record<string, string> = {}
): string {
  let interpolated = (rawUrl || '').trim()
  for (const [varKey, varVal] of Object.entries(variables)) {
    interpolated = interpolated.replace(new RegExp(`\\{\\{\\s*${varKey}\\s*\\}\\}`, 'g'), varVal)
  }

  if (!interpolated) return ''

  const enabledParams = (queryParams || []).filter((p) => p.enabled && p.key.trim())
  const searchParts: string[] = []

  for (const p of enabledParams) {
    let val = p.value || ''
    for (const [varKey, varVal] of Object.entries(variables)) {
      val = val.replace(new RegExp(`\\{\\{\\s*${varKey}\\s*\\}\\}`, 'g'), varVal)
    }
    searchParts.push(`${encodeURIComponent(p.key.trim())}=${encodeURIComponent(val)}`)
  }

  if (authType === 'API_KEY' && authConfig.apiKeyIn === 'query' && authConfig.apiKeyName) {
    const secretVal = maskSecrets ? '••••••••••••' : authConfig.apiKeyValue || ''
    searchParts.push(`${encodeURIComponent(authConfig.apiKeyName)}=${encodeURIComponent(secretVal)}`)
  }

  if (searchParts.length === 0) return interpolated
  const separator = interpolated.includes('?') ? '&' : '?'
  return `${interpolated}${separator}${searchParts.join('&')}`
}

export function buildRequestHeaders(
  authType: IntegrationAuthType,
  authConfig: IntegrationAuthConfig,
  headersList: KeyValueParam[],
  bodyType: IntegrationBodyType,
  maskSecrets = false
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const h of headersList || []) {
    if (h.enabled && h.key.trim()) {
      result[h.key.trim()] = h.value
    }
  }

  if (authType === 'BEARER' && authConfig.bearerToken) {
    result['Authorization'] = `Bearer ${maskSecrets ? '••••••••••••' : authConfig.bearerToken.trim()}`
  } else if (authType === 'API_KEY' && authConfig.apiKeyIn !== 'query' && authConfig.apiKeyName) {
    result[authConfig.apiKeyName.trim()] = maskSecrets ? '••••••••••••' : (authConfig.apiKeyValue || '').trim()
  } else if (authType === 'BASIC' && (authConfig.basicUsername || authConfig.basicPassword)) {
    const rawCreds = `${authConfig.basicUsername || ''}:${authConfig.basicPassword || ''}`
    const encoded = typeof btoa === 'function' ? btoa(rawCreds) : rawCreds
    result['Authorization'] = `Basic ${maskSecrets ? '••••••••••••' : encoded}`
  } else if (authType === 'CUSTOM_HEADER' && Array.isArray(authConfig.customHeaders)) {
    for (const ch of authConfig.customHeaders) {
      if (ch.key?.trim()) {
        result[ch.key.trim()] = maskSecrets ? '••••••••••••' : ch.value || ''
      }
    }
  }

  if (bodyType === 'json' && !Object.keys(result).some((k) => k.toLowerCase() === 'content-type')) {
    result['Content-Type'] = 'application/json'
  } else if (bodyType === 'form-urlencoded' && !Object.keys(result).some((k) => k.toLowerCase() === 'content-type')) {
    result['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  return result
}

export const apiIntegrationService = {
  async listIntegrations(storeId: string): Promise<ApiIntegrationConnector[]> {
    let query = supabase
      .from('api_integrations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (storeId && storeId !== 'all') {
      query = query.or(`store_id.eq.${storeId},store_id.is.null`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as ApiIntegrationConnector[]
  },

  async saveIntegration(
    storeId: string,
    payload: Partial<ApiIntegrationConnector> & { name: string; url: string; target_service: IntegrationTargetService }
  ): Promise<ApiIntegrationConnector> {
    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : payload.store_id || null

    const row = {
      store_id: effectiveStoreId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      target_service: payload.target_service,
      method: payload.method || 'GET',
      url: payload.url.trim(),
      auth_type: payload.auth_type || 'NONE',
      auth_config: payload.auth_config || {},
      query_params: payload.query_params || [],
      headers: payload.headers || [],
      body_type: payload.body_type || 'none',
      body_content: payload.body_content || '',
      response_root_path: payload.response_root_path || '$',
      upsert_key: payload.upsert_key || SERVICE_SCHEMAS[payload.target_service].defaultUpsertKey,
      field_mappings: payload.field_mappings || {},
      is_active: payload.is_active ?? true,
    }

    if (payload.id) {
      const { data, error } = await supabase
        .from('api_integrations')
        .update(row)
        .eq('id', payload.id)
        .select('*')
        .single()
      if (error) throw error
      return data as ApiIntegrationConnector
    } else {
      const { data, error } = await supabase
        .from('api_integrations')
        .insert(row)
        .select('*')
        .single()
      if (error) throw error
      return data as ApiIntegrationConnector
    }
  },

  async deleteIntegration(id: string): Promise<void> {
    const { error } = await supabase.from('api_integrations').delete().eq('id', id)
    if (error) throw error
  },

  async listLogs(storeId: string, limit = 30): Promise<ApiIntegrationLog[]> {
    let query = supabase
      .from('api_integration_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as ApiIntegrationLog[]
  },

  async executeHttpRequest(
    config: {
      method: HttpMethod
      url: string
      auth_type: IntegrationAuthType
      auth_config: IntegrationAuthConfig
      query_params: KeyValueParam[]
      headers: KeyValueParam[]
      body_type: IntegrationBodyType
      body_content: string
      response_root_path: string
    },
    storeId: string
  ): Promise<HttpExecutionResult> {
    const variables: Record<string, string> = {
      store_id: storeId !== 'all' ? storeId : '',
      today: new Date().toISOString().split('T')[0],
      page: '1',
      limit: '100',
    }

    const finalUrl = buildUrlWithParams(
      config.url,
      config.query_params,
      config.auth_type,
      config.auth_config,
      false,
      variables
    )

    if (!finalUrl || (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://'))) {
      throw new Error('Informe uma URL válida iniciando com https:// ou http://')
    }

    // Bloqueio Anti-SSRF para metadados de nuvem
    if (finalUrl.includes('169.254.169.254') || finalUrl.includes('metadata.google.internal')) {
      throw new Error('Endereço de destino bloqueado pelas políticas de segurança (Anti-SSRF).')
    }

    const requestHeaders = buildRequestHeaders(
      config.auth_type,
      config.auth_config,
      config.headers,
      config.body_type,
      false
    )

    const fetchOptions: RequestInit = {
      method: config.method,
      headers: requestHeaders,
    }

    if (config.method !== 'GET' && config.body_type !== 'none' && config.body_content.trim()) {
      fetchOptions.body = config.body_content
    }

    const startTime = performance.now()
    try {
      const response = await fetch(finalUrl, fetchOptions)
      const durationMs = Math.round(performance.now() - startTime)
      const rawBody = await response.text()
      const sizeBytes = new Blob([rawBody]).size

      const respHeaders: Record<string, string> = {}
      response.headers.forEach((val, key) => {
        respHeaders[key] = val
      })

      let parsedJson: any = null
      try {
        parsedJson = rawBody ? JSON.parse(rawBody) : null
      } catch {
        parsedJson = null
      }

      const detectedArrays = detectJsonArrays(parsedJson)
      const effectiveRootPath =
        config.response_root_path && config.response_root_path !== '$'
          ? config.response_root_path
          : detectedArrays[0]?.path || '$'

      const extractedItems = extractItemsFromResponse(parsedJson, effectiveRootPath)
      const sampleKeys = extractSampleKeys(extractedItems)

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
        durationMs,
        sizeBytes,
        headers: respHeaders,
        rawBody,
        parsedJson,
        detectedArrays,
        extractedItems,
        sampleKeys,
        finalUrl,
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime)
      return {
        ok: false,
        status: 0,
        statusText: 'Network / CORS Error',
        durationMs,
        sizeBytes: 0,
        headers: {},
        rawBody: '',
        parsedJson: null,
        detectedArrays: [],
        extractedItems: [],
        sampleKeys: [],
        finalUrl,
        errorMessage:
          err?.message === 'Failed to fetch'
            ? 'Falha de conexão ou bloqueio de CORS no servidor de destino. Verifique se a URL está acessível e se os headers estão corretos.'
            : err?.message || 'Erro desconhecido ao executar requisição HTTP.',
      }
    }
  },

  mapRecordToService(
    rawItem: Record<string, any>,
    service: IntegrationTargetService,
    mappings: FieldMappingsMap
  ): { mapped: Record<string, any>; validationError?: string } {
    const schema = SERVICE_SCHEMAS[service]
    const mapped: Record<string, any> = {}

    for (const fieldSpec of schema.fields) {
      const rule = mappings[fieldSpec.field]
      const rawValue = rule?.sourcePath ? getValueByPath(rawItem, rule.sourcePath) : undefined
      const transform = rule?.transform || fieldSpec.defaultTransform
      const fallback = rule?.defaultValue ?? ''

      if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') {
        mapped[fieldSpec.field] = applyFieldTransform(rawValue, transform, fallback)
      } else if (fallback !== '' || transform === 'AUTO_SKU') {
        mapped[fieldSpec.field] = applyFieldTransform('', transform, fallback)
      } else {
        mapped[fieldSpec.field] = fieldSpec.type === 'number' ? 0 : ''
      }
    }

    // Validação de campos obrigatórios
    for (const fieldSpec of schema.fields) {
      if (fieldSpec.required) {
        const val = mapped[fieldSpec.field]
        if (val === undefined || val === null || String(val).trim() === '') {
          return {
            mapped,
            validationError: `Campo obrigatório "${fieldSpec.label}" está vazio (verifique o mapeamento de "${fieldSpec.field}").`,
          }
        }
      }
    }

    return { mapped }
  },

  async simulateSync(
    storeId: string,
    service: IntegrationTargetService,
    items: Record<string, any>[],
    mappings: FieldMappingsMap,
    upsertKey: string
  ): Promise<DryRunPreviewRow[]> {
    if (!storeId || storeId === 'all') {
      throw new Error('Selecione uma loja específica no topo da plataforma para simular ou sincronizar dados.')
    }

    const existingLookup = new Map<string, string>()

    if (service === 'customers') {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, email, document')
        .eq('store_id', storeId)
        .eq('is_active', true)
      for (const c of data || []) {
        const keyVal = String((c as any)[upsertKey] || '').trim().toLowerCase()
        if (keyVal) existingLookup.set(keyVal, c.id)
      }
    } else if (service === 'categories') {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('store_id', storeId)
      for (const c of data || []) {
        const keyVal = String((c as any)[upsertKey] || '').trim().toLowerCase()
        if (keyVal) existingLookup.set(keyVal, c.id)
      }
    } else if (service === 'products') {
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, barcode')
        .eq('store_id', storeId)
      for (const p of data || []) {
        const keyVal = String((p as any)[upsertKey] || '').trim().toLowerCase()
        if (keyVal) existingLookup.set(keyVal, p.id)
      }
    } else if (service === 'suppliers') {
      const { data } = await supabase
        .from('suppliers')
        .select('id, name, document')
        .eq('store_id', storeId)
      for (const s of data || []) {
        const keyVal = String((s as any)[upsertKey] || '').trim().toLowerCase()
        if (keyVal) existingLookup.set(keyVal, s.id)
      }
    } else if (service === 'inventory') {
      const { data } = await supabase
        .from('products')
        .select('id, sku')
        .eq('store_id', storeId)
      for (const p of data || []) {
        const keyVal = String(p.sku || '').trim().toLowerCase()
        if (keyVal) existingLookup.set(keyVal, p.id)
      }
    }

    return items.map((rawItem, index) => {
      const { mapped, validationError } = this.mapRecordToService(rawItem, service, mappings)
      if (validationError) {
        return {
          index,
          action: 'INVALID',
          mappedData: mapped,
          rawSource: rawItem,
          validationError,
        }
      }

      const matchVal = String(mapped[upsertKey] || '').trim().toLowerCase()
      const existingId = matchVal ? existingLookup.get(matchVal) : undefined

      if (service === 'inventory' && !existingId) {
        return {
          index,
          action: 'INVALID',
          mappedData: mapped,
          rawSource: rawItem,
          validationError: `Produto com SKU "${mapped.sku}" não encontrado na loja.`,
        }
      }

      return {
        index,
        action: existingId ? 'UPDATE' : 'CREATE',
        existingId,
        upsertMatchValue: matchVal,
        mappedData: mapped,
        rawSource: rawItem,
      }
    })
  },

  async executeSync(params: {
    storeId: string
    integrationId?: string | null
    integrationName: string
    service: IntegrationTargetService
    items: Record<string, any>[]
    mappings: FieldMappingsMap
    upsertKey: string
    httpStatus?: number
  }): Promise<SyncExecutionSummary> {
    const { storeId, integrationId, integrationName, service, items, mappings, upsertKey, httpStatus } = params
    if (!storeId || storeId === 'all') {
      throw new Error('Selecione uma loja específica antes de executar a sincronização.')
    }

    const startTime = performance.now()
    const previewRows = await this.simulateSync(storeId, service, items, mappings, upsertKey)

    let recordsCreated = 0
    let recordsUpdated = 0
    let recordsFailed = 0
    const errors: string[] = []

    // Cache de categorias da loja quando sincronizando produtos ou categorias
    const categoryCache = new Map<string, string>()
    if (service === 'products' || service === 'categories') {
      const { data: existingCats } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('store_id', storeId)
      for (const cat of existingCats || []) {
        categoryCache.set(cat.name.trim().toLowerCase(), cat.id)
      }
    }

    const ensureCategoryByName = async (catName: string): Promise<string | null> => {
      const trimmed = (catName || '').trim()
      if (!trimmed) return null
      const key = trimmed.toLowerCase()
      if (categoryCache.has(key)) return categoryCache.get(key)!

      const slug = `${slugifyCategoryName(trimmed)}-${Math.random().toString(36).slice(2, 6)}`
      const { data: created, error } = await supabase
        .from('categories')
        .insert({ store_id: storeId, name: trimmed, slug })
        .select('id')
        .single()
      if (!error && created?.id) {
        categoryCache.set(key, created.id)
        return created.id
      }
      return null
    }

    for (const row of previewRows) {
      if (row.action === 'INVALID') {
        recordsFailed++
        if (row.validationError) errors.push(`Linha ${row.index + 1}: ${row.validationError}`)
        continue
      }

      const d = row.mappedData
      try {
        if (service === 'customers') {
          const payload = {
            store_id: storeId,
            name: String(d.name).trim(),
            phone: d.phone ? String(d.phone).trim() : null,
            email: d.email ? String(d.email).trim() : null,
            document: d.document ? String(d.document).trim() : null,
            notes: d.notes ? String(d.notes).trim() : null,
            is_active: true,
          }

          let customerId = row.existingId
          if (row.action === 'UPDATE' && customerId) {
            const { error } = await supabase.from('customers').update(payload).eq('id', customerId)
            if (error) throw error
            recordsUpdated++
          } else {
            const { data: created, error } = await supabase
              .from('customers')
              .insert(payload)
              .select('id')
              .single()
            if (error) throw error
            customerId = created.id
            recordsCreated++
          }

          if (customerId && (d.street || d.city)) {
            await supabase.from('customer_addresses').insert({
              customer_id: customerId,
              label: 'Principal (API)',
              street: String(d.street || 'Não informado'),
              city: String(d.city || 'Não informada'),
              state: String(d.state || 'SP').slice(0, 2).toUpperCase(),
              zip_code: d.zip_code ? String(d.zip_code) : null,
              is_default: true,
            })
          }
        } else if (service === 'categories') {
          const parentId = d.parent_name ? await ensureCategoryByName(String(d.parent_name)) : null
          const slug = d.slug ? slugifyCategoryName(String(d.slug)) : slugifyCategoryName(String(d.name))
          const payload = {
            store_id: storeId,
            name: String(d.name).trim(),
            slug,
            parent_id: parentId,
          }

          if (row.action === 'UPDATE' && row.existingId) {
            const { error } = await supabase
              .from('categories')
              .update({ name: payload.name, parent_id: payload.parent_id })
              .eq('id', row.existingId)
            if (error) throw error
            recordsUpdated++
          } else {
            const { error } = await supabase.from('categories').insert(payload)
            if (error) throw error
            recordsCreated++
          }
        } else if (service === 'products') {
          const categoryId = d.category_name ? await ensureCategoryByName(String(d.category_name)) : null
          const payload = {
            store_id: storeId,
            name: String(d.name).trim(),
            sku: String(d.sku).trim(),
            barcode: d.barcode ? String(d.barcode).trim() : null,
            selling_price: Number(d.selling_price) || 0,
            cost_price: Number(d.cost_price) || 0,
            unit: d.unit ? String(d.unit).trim() : 'UN',
            min_stock: Number(d.min_stock) || 5,
            max_stock: 500,
            category_id: categoryId,
            description: d.description ? String(d.description).trim() : null,
            is_active: true,
            is_published_catalog: true,
          }

          let productId = row.existingId
          if (row.action === 'UPDATE' && productId) {
            const { error } = await supabase.from('products').update(payload).eq('id', productId)
            if (error) throw error
            recordsUpdated++
          } else {
            const { data: created, error } = await supabase
              .from('products')
              .insert(payload)
              .select('id')
              .single()
            if (error) throw error
            productId = created.id
            recordsCreated++
          }

          // Se mapeou stock_quantity > 0 em novo produto, cria movimento de entrada
          const targetStock = Number(d.stock_quantity)
          if (productId && Number.isFinite(targetStock) && targetStock > 0 && row.action === 'CREATE') {
            await supabase.from('stock_movements').insert({
              store_id: storeId,
              product_id: productId,
              movement_type: 'ENTRY',
              quantity: targetStock,
              unit_cost: Number(d.cost_price) || 0,
              reason: `Saldo inicial sincronizado via API (${integrationName})`,
            })
          }
        } else if (service === 'suppliers') {
          const payload = {
            store_id: storeId,
            name: String(d.name).trim(),
            trade_name: d.trade_name ? String(d.trade_name).trim() : null,
            document: d.document ? String(d.document).trim() : null,
            email: d.email ? String(d.email).trim() : null,
            phone: d.phone ? String(d.phone).trim() : null,
            whatsapp: d.whatsapp ? String(d.whatsapp).trim() : null,
            notes: d.notes ? String(d.notes).trim() : null,
            is_active: true,
          }

          if (row.action === 'UPDATE' && row.existingId) {
            const { error } = await supabase.from('suppliers').update(payload).eq('id', row.existingId)
            if (error) throw error
            recordsUpdated++
          } else {
            const { error } = await supabase.from('suppliers').insert(payload)
            if (error) throw error
            recordsCreated++
          }
        } else if (service === 'inventory' && row.existingId) {
          const qty = Number(d.quantity) || 0
          if (qty > 0) {
            const { error } = await supabase.from('stock_movements').insert({
              store_id: storeId,
              product_id: row.existingId,
              movement_type: 'ENTRY',
              quantity: qty,
              unit_cost: Number(d.unit_cost) || 0,
              reason: d.notes ? String(d.notes) : `Sincronização de estoque via API (${integrationName})`,
            })
            if (error) throw error
            recordsUpdated++
          }
        }
      } catch (err: any) {
        recordsFailed++
        errors.push(`Linha ${row.index + 1}: ${err?.message || 'Erro ao gravar registro'}`)
      }
    }

    const durationMs = Math.round(performance.now() - startTime)
    const status: 'SUCCESS' | 'PARTIAL' | 'ERROR' =
      recordsFailed === 0
        ? 'SUCCESS'
        : recordsCreated + recordsUpdated > 0
          ? 'PARTIAL'
          : 'ERROR'

    const summary: SyncExecutionSummary = {
      recordsFetched: items.length,
      recordsCreated,
      recordsUpdated,
      recordsFailed,
      durationMs,
      httpStatus,
      errors: errors.slice(0, 20),
      executedAt: new Date().toISOString(),
    }

    // Gravar no histórico de logs da integração
    await supabase.from('api_integration_logs').insert({
      integration_id: integrationId || null,
      store_id: storeId,
      integration_name: integrationName,
      target_service: service,
      status,
      http_status: httpStatus || 200,
      duration_ms: durationMs,
      records_fetched: items.length,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_failed: recordsFailed,
      error_message: errors[0] || null,
      details: summary,
    })

    if (integrationId) {
      await supabase
        .from('api_integrations')
        .update({
          last_run_at: summary.executedAt,
          last_run_status: status,
          last_run_summary: summary,
        })
        .eq('id', integrationId)
    }

    return summary
  },
}
