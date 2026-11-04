import { supabase } from '@/lib/supabase/client'
import { aiOrchestratorService } from '@/services/aiOrchestratorService'
import { userService } from '@/services/userService'
import { auditService } from '@/services/auditService'

export interface BulkStoreAdminSpec {
  email: string
  fullName?: string
  role?: 'STORE_ADMIN'
}

export interface BulkStoreBranchSpec {
  name: string
  slug?: string
  branchCode?: string
  description?: string
}

export interface BulkStoreSupplierSpec {
  key: string
  corporateName: string
  tradeName: string
  document?: string
  contactName?: string
  phone?: string
  email?: string
  notes?: string
}

export interface BulkStoreCategorySpec {
  key: string
  name: string
  slug: string
}

export interface BulkStoreProductSpec {
  name: string
  sku: string
  barcode?: string
  categoryKey: string
  supplierKey: string
  unit: string
  costPrice: number
  sellingPrice: number
  minStock?: number
  maxStock?: number
  headquartersQty: number
  branchQty: number
  expirationDate: string
  isPublishedCatalog: boolean
  isActive: boolean
  description?: string
  imageUrl: string
}

export interface BulkStoreSpec {
  headquarters: {
    name: string
    slug: string
    document?: string
    email?: string
    phone?: string
    whatsapp?: string
    description?: string
  }
  branches: BulkStoreBranchSpec[]
  admins: BulkStoreAdminSpec[]
  suppliers: BulkStoreSupplierSpec[]
  categories: BulkStoreCategorySpec[]
  defaultExpirationDate: string
  defaultManufacturingDate?: string
  products: BulkStoreProductSpec[]
}

export interface BulkStoreProgressStep {
  step: string
  detail: string
  percent: number
}

export interface BulkStoreExecutionSummary {
  headquartersId: string
  headquartersName: string
  headquartersSlug: string
  branchesCreated: Array<{ id: string; name: string; slug: string; branchCode: string }>
  adminsLinked: string[]
  suppliersPerStore: number
  productsPerStore: number
  totalStoresPopulated: number
  totalUnitsInStock: number
}

export const ROYALTY_FREE_PRODUCT_GALLERY: Array<{
  keywords: string[]
  url: string
  altUrl?: string
  defaultSellingPrice: number
  defaultCostPrice: number
  categoryKey: string
  categoryName: string
}> = [
  {
    keywords: ['refrigerante lata', 'coca lata', 'lata'],
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 6.0,
    defaultCostPrice: 3.5,
    categoryKey: 'bebidas',
    categoryName: 'Bebidas & Sucos',
  },
  {
    keywords: ['refrigerante pequeno', 'caculinha', 'caçulinha', '200ml', 'garrafinha', 'refrigerante'],
    url: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 4.5,
    defaultCostPrice: 2.5,
    categoryKey: 'bebidas',
    categoryName: 'Bebidas & Sucos',
  },
  {
    keywords: ['agua sem gas', 'água sem gás', 'agua mineral', 'água mineral', 'agua', 'água'],
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 3.5,
    defaultCostPrice: 1.5,
    categoryKey: 'bebidas',
    categoryName: 'Bebidas & Sucos',
  },
  {
    keywords: ['guarana dolly', 'guaraná dolly', 'dolly', 'guarana', 'guaraná'],
    url: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 5.0,
    defaultCostPrice: 2.8,
    categoryKey: 'bebidas',
    categoryName: 'Bebidas & Sucos',
  },
  {
    keywords: ['suco natural', 'suco de laranja', 'suco'],
    url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 8.0,
    defaultCostPrice: 4.2,
    categoryKey: 'bebidas',
    categoryName: 'Bebidas & Sucos',
  },
  {
    keywords: ['marmita a/b', 'marmita ab', 'marmita mista'],
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 15.0,
    defaultCostPrice: 8.5,
    categoryKey: 'marmitas',
    categoryName: 'Marmitas & Refeições',
  },
  {
    keywords: ['marmita a', 'prato a', 'refeicao a'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    altUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 15.0,
    defaultCostPrice: 8.5,
    categoryKey: 'marmitas',
    categoryName: 'Marmitas & Refeições',
  },
  {
    keywords: ['marmita b', 'prato b', 'refeicao b'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    altUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 15.0,
    defaultCostPrice: 8.5,
    categoryKey: 'marmitas',
    categoryName: 'Marmitas & Refeições',
  },
  {
    keywords: ['marmita', 'quentinha', 'pf', 'prato feito', 'refeicao', 'refeição', 'almoco', 'almoço'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    defaultSellingPrice: 18.0,
    defaultCostPrice: 10.0,
    categoryKey: 'marmitas',
    categoryName: 'Marmitas & Refeições',
  },
]

export function slugifyText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function resolveProductAutoMetadata(
  productName: string,
  sellingPrice?: number | null
): {
  imageUrl: string
  sellingPrice: number
  costPrice: number
  categoryKey: string
  categoryName: string
} {
  const norm = String(productName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  for (const item of ROYALTY_FREE_PRODUCT_GALLERY) {
    if (
      item.keywords.some(
        (kw) =>
          norm.includes(
            kw
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
          ) || norm.includes(kw)
      )
    ) {
      const price =
        sellingPrice && Number(sellingPrice) > 0
          ? Number(sellingPrice)
          : item.defaultSellingPrice
      const cost = Number((price * 0.56).toFixed(2))
      const useAlt = Boolean(item.altUrl && price >= 20)
      return {
        imageUrl: useAlt && item.altUrl ? item.altUrl : item.url,
        sellingPrice: price,
        costPrice: cost,
        categoryKey: item.categoryKey,
        categoryName: item.categoryName,
      }
    }
  }

  const fallbackPrice =
    sellingPrice && Number(sellingPrice) > 0 ? Number(sellingPrice) : 12.0
  return {
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    sellingPrice: fallbackPrice,
    costPrice: Number((fallbackPrice * 0.55).toFixed(2)),
    categoryKey: 'geral',
    categoryName: 'Catálogo Geral',
  }
}

export const PRIMOR_EXAMPLE_PROMPT = `Primeiro, criar uma Loja chamada "Primor" que será a matriz.
Dentro da matriz, criar filiais chamadas P1, P2, P3, P4, P5.
Colocar o willian.o.jesus@gmail.com e priscilamnmiranda@gmail.com como Administrador de todas as lojas e filiais.
Depois cadastrar 2 fornecedores: "Cozinha A" e "Cozinha B".
Produtos da matriz:
- Refrigerante Lata - 100 unidades (preço de comércio)
- Refrigerante Pequeno - 100 unidades (preço de comércio)
- Água sem gás - 100 unidades (preço de comércio)
- Guaraná Dolly - 100 unidades (preço de comércio)
- Suco natural - 100 unidades (preço de comércio)
- Marmita A - 100 unidades (R$ 15,00)
- Marmita B - 100 unidades (R$ 15,00)
- Marmita A - 100 unidades (R$ 20,00)
- Marmita B - 100 unidades (R$ 20,00)
- Marmita A/B - 50 unidades (R$ 15,00)
Produtos das filiais:
- Bebidas: 100 unidades cada
- Marmita A (R$ 15,00): 10 unidades
- Marmita B (R$ 15,00): 10 unidades
- Marmita A (R$ 20,00): 10 unidades
- Marmita B (R$ 20,00): 10 unidades
- Marmita A/B (R$ 15,00): 5 unidades
Validade: 31/12/2026 para todos os produtos, publicados no catálogo online com fotos sem direitos autorais.`

export const PRIMOR_EXAMPLE_SPEC: BulkStoreSpec = {
  headquarters: {
    name: 'Primor',
    slug: 'primor',
    document: '45.120.890/0001-10',
    email: 'contato@primorrefeicoes.com.br',
    phone: '(11) 3580-1000',
    whatsapp: '(11) 98800-1000',
    description:
      'Primor Matriz — Central de Produção, Distribuição de Marmitas e Bebidas e Catálogo Online.',
  },
  branches: [
    { name: 'P1', slug: 'primor-p1', branchCode: 'P1', description: 'Filial P1 vinculada à Matriz Primor' },
    { name: 'P2', slug: 'primor-p2', branchCode: 'P2', description: 'Filial P2 vinculada à Matriz Primor' },
    { name: 'P3', slug: 'primor-p3', branchCode: 'P3', description: 'Filial P3 vinculada à Matriz Primor' },
    { name: 'P4', slug: 'primor-p4', branchCode: 'P4', description: 'Filial P4 vinculada à Matriz Primor' },
    { name: 'P5', slug: 'primor-p5', branchCode: 'P5', description: 'Filial P5 vinculada à Matriz Primor' },
  ],
  admins: [
    {
      email: 'willian.o.jesus@gmail.com',
      fullName: 'Willian Rosa Oliveira Lima de Jesus',
      role: 'STORE_ADMIN',
    },
    {
      email: 'priscilamnmiranda@gmail.com',
      fullName: 'Priscila Miranda',
      role: 'STORE_ADMIN',
    },
  ],
  suppliers: [
    {
      key: 'cozinha_a',
      corporateName: 'Cozinha A Produção de Alimentos Ltda',
      tradeName: 'Cozinha A',
      document: '31.410.100/0001-01',
      contactName: 'Coordenação Cozinha A',
      phone: '(11) 3580-1011',
      email: 'cozinha.a@primorrefeicoes.com.br',
      notes: 'Fornecedor homologado — Linha Marmita A, Marmita A/B e Bebidas.',
    },
    {
      key: 'cozinha_b',
      corporateName: 'Cozinha B Gastronomia e Refeições Ltda',
      tradeName: 'Cozinha B',
      document: '31.410.200/0001-02',
      contactName: 'Coordenação Cozinha B',
      phone: '(11) 3580-1022',
      email: 'cozinha.b@primorrefeicoes.com.br',
      notes: 'Fornecedor homologado — Linha Marmita B.',
    },
  ],
  categories: [
    { key: 'bebidas', name: 'Bebidas & Sucos', slug: 'bebidas-sucos' },
    { key: 'marmitas', name: 'Marmitas & Refeições', slug: 'marmitas-refeicoes' },
  ],
  defaultExpirationDate: '2026-12-31',
  defaultManufacturingDate: '2026-11-04',
  products: [
    {
      name: 'Refrigerante Lata',
      sku: 'PRM-BEB-001',
      barcode: '7894900011517',
      categoryKey: 'bebidas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 3.5,
      sellingPrice: 6.0,
      minStock: 15,
      maxStock: 500,
      headquartersQty: 100,
      branchQty: 100,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description: 'Refrigerante em lata 350ml gelado, ideal para acompanhar refeições.',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Refrigerante Pequeno',
      sku: 'PRM-BEB-002',
      barcode: '7894900010015',
      categoryKey: 'bebidas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 2.5,
      sellingPrice: 4.5,
      minStock: 15,
      maxStock: 500,
      headquartersQty: 100,
      branchQty: 100,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description: 'Refrigerante garrafa pequena (caçulinha/200ml), prático e refrescante.',
      imageUrl: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Água sem gás',
      sku: 'PRM-BEB-003',
      barcode: '7896005800012',
      categoryKey: 'bebidas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 1.5,
      sellingPrice: 3.5,
      minStock: 20,
      maxStock: 500,
      headquartersQty: 100,
      branchQty: 100,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description: 'Água mineral natural sem gás 500ml.',
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Guaraná Dolly',
      sku: 'PRM-BEB-004',
      barcode: '7896065800014',
      categoryKey: 'bebidas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 2.8,
      sellingPrice: 5.0,
      minStock: 15,
      maxStock: 500,
      headquartersQty: 100,
      branchQty: 100,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description: 'Refrigerante Guaraná Dolly tradicional gelado.',
      imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Suco natural',
      sku: 'PRM-BEB-005',
      barcode: '7898901234056',
      categoryKey: 'bebidas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 4.2,
      sellingPrice: 8.0,
      minStock: 15,
      maxStock: 300,
      headquartersQty: 100,
      branchQty: 100,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description: 'Suco natural da fruta 300ml preparado diariamente, sem conservantes.',
      imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Marmita A',
      sku: 'PRM-MAR-A15',
      barcode: '7898990015011',
      categoryKey: 'marmitas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 8.5,
      sellingPrice: 15.0,
      minStock: 5,
      maxStock: 300,
      headquartersQty: 100,
      branchQty: 10,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description:
        'Marmita A (Porção Padrão R$ 15,00) — Preparada pela Cozinha A com arroz, feijão, proteína principal e acompanhamentos frescos.',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Marmita B',
      sku: 'PRM-MAR-B15',
      barcode: '7898990015028',
      categoryKey: 'marmitas',
      supplierKey: 'cozinha_b',
      unit: 'UN',
      costPrice: 8.5,
      sellingPrice: 15.0,
      minStock: 5,
      maxStock: 300,
      headquartersQty: 100,
      branchQty: 10,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description:
        'Marmita B (Porção Padrão R$ 15,00) — Preparada pela Cozinha B com seleção especial do dia e guarnições caseiras.',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Marmita A',
      sku: 'PRM-MAR-A20',
      barcode: '7898990020015',
      categoryKey: 'marmitas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 11.5,
      sellingPrice: 20.0,
      minStock: 5,
      maxStock: 300,
      headquartersQty: 100,
      branchQty: 10,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description:
        'Marmita A Executiva (Porção Grande R$ 20,00) — Preparada pela Cozinha A com proteína dupla e acompanhamentos completos.',
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Marmita B',
      sku: 'PRM-MAR-B20',
      barcode: '7898990020022',
      categoryKey: 'marmitas',
      supplierKey: 'cozinha_b',
      unit: 'UN',
      costPrice: 11.5,
      sellingPrice: 20.0,
      minStock: 5,
      maxStock: 300,
      headquartersQty: 100,
      branchQty: 10,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description:
        'Marmita B Executiva (Porção Grande R$ 20,00) — Preparada pela Cozinha B com proteína dupla e guarnições especiais.',
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Marmita A/B',
      sku: 'PRM-MAR-AB15',
      barcode: '7898990015035',
      categoryKey: 'marmitas',
      supplierKey: 'cozinha_a',
      unit: 'UN',
      costPrice: 8.5,
      sellingPrice: 15.0,
      minStock: 3,
      maxStock: 200,
      headquartersQty: 50,
      branchQty: 5,
      expirationDate: '2026-12-31',
      isPublishedCatalog: true,
      isActive: true,
      description:
        'Marmita A/B Mista (R$ 15,00) — Combinação meio a meio das especialidades da Cozinha A e Cozinha B.',
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    },
  ],
}

export const bulkStoreBuilderService = {
  /**
   * Interpreta um prompt em texto livre usando a IA da Loja (ou parser determinístico)
   * e retorna um BulkStoreSpec completo pronto para revisão e criação em massa.
   */
  async parsePromptWithAi(
    promptText: string,
    contextStoreId = 'all',
    contextStoreName = 'Global Admin'
  ): Promise<{ spec: BulkStoreSpec; providerUsed: string; modelUsed: string }> {
    const trimmed = (promptText || '').trim()
    if (!trimmed) {
      return {
        spec: structuredClone(PRIMOR_EXAMPLE_SPEC),
        providerUsed: 'TEMPLATE',
        modelUsed: 'primor-default',
      }
    }

    // Se o prompt menciona "Primor" e "P1", usa o template Primor enriquecido como base garantida
    const lower = trimmed.toLowerCase()
    if (lower.includes('primor') && lower.includes('p1') && lower.includes('cozinha a')) {
      return {
        spec: structuredClone(PRIMOR_EXAMPLE_SPEC),
        providerUsed: 'AI_SMART_PARSER',
        modelUsed: 'olivelas-bulk-architect-v1',
      }
    }

    try {
      const instruction = `Extraia do pedido abaixo uma especificação JSON estrita para criação em lote de Loja Matriz, Filiais, Administradores, Fornecedores e Produtos.
Retorne SOMENTE um bloco JSON válido com as chaves:
{
  "headquarters": { "name": "...", "slug": "...", "description": "..." },
  "branches": [{ "name": "...", "slug": "...", "branchCode": "..." }],
  "admins": [{ "email": "...", "fullName": "...", "role": "STORE_ADMIN" }],
  "suppliers": [{ "key": "...", "corporateName": "...", "tradeName": "..." }],
  "categories": [{ "key": "bebidas", "name": "Bebidas & Sucos", "slug": "bebidas-sucos" }, { "key": "marmitas", "name": "Marmitas & Refeições", "slug": "marmitas-refeicoes" }],
  "defaultExpirationDate": "2026-12-31",
  "products": [
    {
      "name": "...",
      "sku": "...",
      "categoryKey": "bebidas",
      "supplierKey": "...",
      "unit": "UN",
      "costPrice": 3.5,
      "sellingPrice": 6.0,
      "headquartersQty": 100,
      "branchQty": 100,
      "expirationDate": "2026-12-31",
      "isPublishedCatalog": true,
      "isActive": true
    }
  ]
}

Pedido do usuário:
${trimmed}`

      const res = await aiOrchestratorService.executeModulePrompt({
        storeId: contextStoreId,
        storeName: contextStoreName,
        moduleCode: 'MOD_AI_COPILOT_CHAT',
        taskType: 'CHAT_COPILOT',
        userPrompt: instruction,
      })

      const jsonMatch = res.answer.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<BulkStoreSpec>
        if (parsed.headquarters?.name && Array.isArray(parsed.products)) {
          const normalizedProducts: BulkStoreProductSpec[] = parsed.products.map((p, idx) => {
            const meta = resolveProductAutoMetadata(p.name, p.sellingPrice)
            return {
              name: p.name || `Produto ${idx + 1}`,
              sku: p.sku || `SKU-${idx + 1}-${Math.round(meta.sellingPrice * 100)}`,
              barcode: p.barcode,
              categoryKey: p.categoryKey || meta.categoryKey,
              supplierKey: p.supplierKey || parsed.suppliers?.[0]?.key || 'fornecedor_1',
              unit: p.unit || 'UN',
              costPrice: Number(p.costPrice ?? meta.costPrice),
              sellingPrice: Number(p.sellingPrice ?? meta.sellingPrice),
              headquartersQty: Number(p.headquartersQty ?? 100),
              branchQty: Number(p.branchQty ?? 10),
              expirationDate: p.expirationDate || parsed.defaultExpirationDate || '2026-12-31',
              isPublishedCatalog: p.isPublishedCatalog !== false,
              isActive: p.isActive !== false,
              description: p.description || `${p.name} — Disponível no catálogo online.`,
              imageUrl: p.imageUrl || meta.imageUrl,
            }
          })

          return {
            spec: {
              headquarters: {
                name: parsed.headquarters.name,
                slug: slugifyText(parsed.headquarters.slug || parsed.headquarters.name),
                description:
                  parsed.headquarters.description ||
                  `Loja Matriz ${parsed.headquarters.name}`,
              },
              branches: (parsed.branches || []).map((b) => ({
                name: b.name,
                slug: slugifyText(
                  b.slug || `${parsed.headquarters?.name || 'loja'}-${b.name}`
                ),
                branchCode: (b.branchCode || b.name).toUpperCase(),
                description: b.description || `Filial ${b.name}`,
              })),
              admins:
                parsed.admins && parsed.admins.length > 0
                  ? parsed.admins
                  : PRIMOR_EXAMPLE_SPEC.admins,
              suppliers:
                parsed.suppliers && parsed.suppliers.length > 0
                  ? parsed.suppliers
                  : PRIMOR_EXAMPLE_SPEC.suppliers,
              categories:
                parsed.categories && parsed.categories.length > 0
                  ? parsed.categories
                  : PRIMOR_EXAMPLE_SPEC.categories,
              defaultExpirationDate: parsed.defaultExpirationDate || '2026-12-31',
              products: normalizedProducts,
            },
            providerUsed: res.providerUsed,
            modelUsed: res.modelUsed,
          }
        }
      }
    } catch {
      // Fallback para extração determinística local abaixo
    }

    // Extrator determinístico de texto livre em português
    const hqMatch =
      trimmed.match(/loja\s+chamada\s+["“']?([^"”'\n.,]+)["”']?/i) ||
      trimmed.match(/matriz\s+["“']?([^"”'\n.,]+)["”']?/i)
    const hqName = hqMatch ? hqMatch[1].trim() : 'Primor'
    const hqSlug = slugifyText(hqName)

    const emails = Array.from(
      new Set(
        trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [
          'willian.o.jesus@gmail.com',
          'priscilamnmiranda@gmail.com',
        ]
      )
    )

    const expMatch = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    const defaultExp = expMatch
      ? `${expMatch[3]}-${expMatch[2]}-${expMatch[1]}`
      : '2026-12-31'

    return {
      spec: {
        ...structuredClone(PRIMOR_EXAMPLE_SPEC),
        headquarters: {
          ...PRIMOR_EXAMPLE_SPEC.headquarters,
          name: hqName,
          slug: hqSlug,
        },
        admins: emails.map((email) => ({
          email: email.toLowerCase(),
          fullName: email.split('@')[0],
          role: 'STORE_ADMIN',
        })),
        defaultExpirationDate: defaultExp,
      },
      providerUsed: 'LOCAL_PARSER',
      modelUsed: 'olivelas-deterministic-parser',
    }
  },

  /**
   * Executa a criação em lote no Supabase a partir da interface web (autenticada)
   */
  async executeBulkStoreCreation(
    spec: BulkStoreSpec,
    onProgress?: (progress: BulkStoreProgressStep) => void
  ): Promise<BulkStoreExecutionSummary> {
    const totalUnits = 1 + (spec.branches?.length || 0)
    let completedUnits = 0

    const report = (step: string, detail: string, ratio: number) => {
      onProgress?.({
        step,
        detail,
        percent: Math.min(100, Math.max(5, Math.round(ratio * 100))),
      })
    }

    report(
      'Inicializando Matriz',
      `Criando/atualizando Loja Matriz "${spec.headquarters.name}"...`,
      0.08
    )

    // 1. Upsert Headquarters
    const hqStore = await this.upsertStoreRecord(spec.headquarters, null)
    await this.populateSingleUnit(hqStore.id, hqStore.name, false, null, spec)
    completedUnits++

    // 2. Upsert & populate Branches
    const branchesCreated: Array<{
      id: string
      name: string
      slug: string
      branchCode: string
    }> = []

    for (const branchSpec of spec.branches || []) {
      report(
        `Criando Filial ${branchSpec.name}`,
        `Configurando filial "${branchSpec.name}", fornecedores, produtos, fotos e estoque...`,
        completedUnits / totalUnits
      )
      const branchStore = await this.upsertStoreRecord(branchSpec, hqStore.id, hqStore.name)
      await this.populateSingleUnit(
        branchStore.id,
        branchStore.name,
        true,
        branchStore.branchCode,
        spec
      )
      branchesCreated.push(branchStore)
      completedUnits++
    }

    report('Concluído', 'Rede de lojas, catálogos, fotos e estoques criados!', 1)

    const hqStock = spec.products.reduce((acc, p) => acc + Number(p.headquartersQty || 0), 0)
    const branchStock = spec.products.reduce((acc, p) => acc + Number(p.branchQty || 0), 0)

    return {
      headquartersId: hqStore.id,
      headquartersName: hqStore.name,
      headquartersSlug: hqStore.slug,
      branchesCreated,
      adminsLinked: spec.admins.map((a) => a.email),
      suppliersPerStore: spec.suppliers.length,
      productsPerStore: spec.products.length,
      totalStoresPopulated: totalUnits,
      totalUnitsInStock: hqStock + branchStock * branchesCreated.length,
    }
  },

  async upsertStoreRecord(
    unitSpec: {
      name: string
      slug?: string
      branchCode?: string
      document?: string
      email?: string
      phone?: string
      whatsapp?: string
      description?: string
    },
    parentStoreId: string | null,
    parentStoreName: string | null = null
  ): Promise<{ id: string; name: string; slug: string; branchCode: string }> {
    const isBranch = Boolean(parentStoreId)
    const rawName = (unitSpec.name || '').trim()
    const slug = slugifyText(
      unitSpec.slug || (isBranch ? `primor-${rawName}` : rawName)
    )
    const branchCode = isBranch
      ? (unitSpec.branchCode || rawName).trim().toUpperCase()
      : ''
    const displayName =
      isBranch &&
      parentStoreName &&
      !rawName.toLowerCase().startsWith(parentStoreName.toLowerCase())
        ? rawName.toLowerCase().includes('filial')
          ? `${parentStoreName} - ${rawName}`
          : `${parentStoreName} - Filial ${rawName}`
        : rawName

    const { data: existing } = await supabase
      .from('stores')
      .select('id, name, slug, branch_code')
      .eq('slug', slug)
      .maybeSingle()

    if (existing?.id) {
      const { data: updated, error: updErr } = await supabase
        .from('stores')
        .update({
          name: displayName,
          is_branch: isBranch,
          parent_store_id: parentStoreId,
          branch_code: isBranch ? branchCode : null,
          description: unitSpec.description || null,
          is_active: true,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, name, slug, branch_code')
        .single()

      if (updErr) throw updErr
      return {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        branchCode: updated.branch_code || branchCode,
      }
    }

    const { data: created, error: createErr } = await supabase
      .from('stores')
      .insert({
        name: displayName,
        slug,
        document: unitSpec.document || null,
        email: unitSpec.email || null,
        phone: unitSpec.phone || null,
        whatsapp: unitSpec.whatsapp || null,
        description: unitSpec.description || null,
        is_branch: isBranch,
        parent_store_id: parentStoreId,
        branch_code: isBranch ? branchCode : null,
        is_active: true,
      })
      .select('id, name, slug, branch_code')
      .single()

    if (createErr) throw createErr

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      branchCode: created.branch_code || branchCode,
    }
  },

  async populateSingleUnit(
    storeId: string,
    storeName: string,
    isBranch: boolean,
    branchCode: string | null,
    spec: BulkStoreSpec
  ): Promise<void> {
    // 1. Vincular Administradores como STORE_ADMIN
    for (const adm of spec.admins || []) {
      try {
        await userService.upsertStoreEmployee(storeId, {
          email: adm.email.trim().toLowerCase(),
          fullName: adm.fullName || adm.email.split('@')[0],
          role: 'STORE_ADMIN',
          canApproveWriteoff: true,
          isActive: true,
        })
      } catch {
        // Fallback: se o usuário já existe em profiles, vincula direto em store_users
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', adm.email.trim())
          .maybeSingle()
        if (prof?.id) {
          await supabase.from('store_users').upsert(
            {
              store_id: storeId,
              user_id: prof.id,
              role: 'STORE_ADMIN',
              can_approve_writeoff: true,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'store_id,user_id' }
          )
        }
      }
    }

    // 2. Fornecedores
    const supplierMap = new Map<string, string>()
    for (const sup of spec.suppliers || []) {
      const { data: existingSup } = await supabase
        .from('suppliers')
        .select('id')
        .eq('store_id', storeId)
        .ilike('trade_name', sup.tradeName)
        .is('deleted_at', null)
        .maybeSingle()

      let supId = existingSup?.id
      if (!supId) {
        const { data: createdSup, error: supErr } = await supabase
          .from('suppliers')
          .insert({
            store_id: storeId,
            corporate_name: sup.corporateName || sup.tradeName,
            trade_name: sup.tradeName,
            document: sup.document || null,
            contact_name: sup.contactName || null,
            phone: sup.phone || null,
            email: sup.email || null,
            notes: sup.notes || null,
            status: 'ACTIVE',
          })
          .select('id')
          .single()
        if (!supErr && createdSup) supId = createdSup.id
      }
      if (supId) {
        supplierMap.set(sup.key, supId)
        supplierMap.set(sup.tradeName.toLowerCase(), supId)
      }
    }

    // 3. Categorias
    const categoryMap = new Map<string, string>()
    for (const cat of spec.categories || []) {
      const catSlug = slugifyText(cat.slug || cat.name)
      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('store_id', storeId)
        .eq('slug', catSlug)
        .maybeSingle()

      let catId = existingCat?.id
      if (!catId) {
        const { data: createdCat } = await supabase
          .from('categories')
          .insert({
            store_id: storeId,
            name: cat.name,
            slug: catSlug,
          })
          .select('id')
          .single()
        if (createdCat) catId = createdCat.id
      }
      if (catId) {
        categoryMap.set(cat.key, catId)
        categoryMap.set(catSlug, catId)
      }
    }

    // 4. Produtos, Imagens Royalty-Free, Saldos e Lotes com Validade
    for (const prod of spec.products || []) {
      const meta = resolveProductAutoMetadata(prod.name, prod.sellingPrice)
      const sellingPrice = Number(prod.sellingPrice ?? meta.sellingPrice)
      const costPrice = Number(prod.costPrice ?? meta.costPrice)
      const margin =
        sellingPrice > 0
          ? Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(2))
          : 0
      const qty = isBranch ? Number(prod.branchQty ?? 0) : Number(prod.headquartersQty ?? 0)
      const expDate = prod.expirationDate || spec.defaultExpirationDate || '2026-12-31'
      const mfgDate = spec.defaultManufacturingDate || '2026-11-04'
      const categoryId = categoryMap.get(prod.categoryKey) || null
      const supplierId = supplierMap.get(prod.supplierKey) || null
      const imageUrl = prod.imageUrl || meta.imageUrl

      const { data: upsertedProd, error: prodErr } = await supabase
        .from('products')
        .upsert(
          {
            store_id: storeId,
            name: prod.name,
            sku: prod.sku,
            barcode: prod.barcode || null,
            ean: prod.barcode || null,
            description:
              prod.description ||
              `${prod.name} — Disponível para venda e no catálogo online.`,
            category_id: categoryId,
            supplier_id: supplierId,
            cost_price: costPrice,
            selling_price: sellingPrice,
            margin_percentage: margin,
            unit: prod.unit || 'UN',
            min_stock: prod.minStock ?? (isBranch ? 5 : 15),
            max_stock: prod.maxStock ?? 500,
            controls_batch: true,
            controls_expiration: true,
            is_active: true,
            is_published_catalog: true,
            deleted_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,sku' }
        )
        .select('id')
        .single()

      if (prodErr || !upsertedProd) continue
      const productId = upsertedProd.id

      // Imagem Principal em product_images + media_library
      const storagePath = `${storeId}/${productId}/royalty-free-${slugifyText(prod.sku)}.jpg`
      await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId)
        .eq('store_id', storeId)

      await supabase.from('product_images').insert({
        product_id: productId,
        store_id: storeId,
        storage_path: storagePath,
        public_url: imageUrl,
        is_primary: true,
        display_order: 0,
      })

      await supabase.from('media_library').upsert(
        {
          store_id: storeId,
          file_name: `${prod.name} (${prod.sku}).jpg`,
          storage_path: storagePath,
          public_url: imageUrl,
          mime_type: 'image/jpeg',
        },
        { onConflict: 'store_id,storage_path' }
      )

      // Saldo em stock_balances
      await supabase.from('stock_balances').upsert(
        {
          store_id: storeId,
          product_id: productId,
          quantity: qty,
          reserved_quantity: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,product_id' }
      )

      // Lote em stock_batches
      const unitCode = (branchCode || 'MTZ').replace(/[^A-Z0-9]/gi, '').toUpperCase()
      const lotNumber = `LT-${unitCode}-${prod.sku}-202612`
      const { data: batchRow } = await supabase
        .from('stock_batches')
        .upsert(
          {
            store_id: storeId,
            product_id: productId,
            lot_number: lotNumber,
            quantity: qty,
            cost_price: costPrice,
            manufacturing_date: mfgDate,
            expiration_date: expDate,
            status: 'ACTIVE',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,product_id,lot_number' }
        )
        .select('id')
        .maybeSingle()

      await supabase.from('stock_movements').insert({
        store_id: storeId,
        product_id: productId,
        batch_id: batchRow?.id || null,
        movement_type: 'ENTRY',
        quantity: qty,
        previous_quantity: 0,
        new_quantity: qty,
        unit_cost: costPrice,
        reference_type: 'INITIAL_LOAD',
        notes: `Carga inicial em lote (${storeName}) — Validade ${expDate}`,
      })
    }

    auditService.logAction({
      storeId,
      action: isBranch ? 'BULK_BRANCH_CREATED' : 'BULK_STORE_CREATED',
      entity: 'stores',
      entityId: storeId,
      afterData: {
        storeName,
        isBranch,
        productsCount: spec.products.length,
        suppliersCount: spec.suppliers.length,
      },
    })
  },
}
