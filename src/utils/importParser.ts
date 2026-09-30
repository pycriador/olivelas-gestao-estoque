/**
 * Import parsing utilities for robust CSV and JSON ingestion
 */

export function parseCSVContent(csvText: string): Record<string, string>[] {
  if (!csvText || !csvText.trim()) return []

  // Remove UTF-8 BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, '').trim()

  // Detect delimiter based on first line
  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || ''
  let delimiter = ','
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';'
  } else if (firstLine.includes('\t')) {
    delimiter = '\t'
  }

  // Parse lines with quote handling
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuotes = false

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // skip escaped quote
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow)
    }
  }

  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim())
  const result: Record<string, string>[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const obj: Record<string, string> = {}
    let hasValue = false

    headers.forEach((header, colIndex) => {
      const val = row[colIndex] !== undefined ? row[colIndex] : ''
      obj[header] = val
      if (val) hasValue = true
    })

    if (hasValue) {
      result.push(obj)
    }
  }

  return result
}

export function parseJSONContent(jsonText: string): Record<string, any>[] {
  if (!jsonText || !jsonText.trim()) return []

  const parsed = JSON.parse(jsonText)
  if (Array.isArray(parsed)) {
    return parsed
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.products)) return parsed.products
    if (Array.isArray(parsed.items)) return parsed.items
    if (Array.isArray(parsed.stock_movements)) return parsed.stock_movements
    if (Array.isArray(parsed.data)) return parsed.data
  }

  throw new Error('O JSON deve ser um array, ou conter a chave "products" / "stock_movements" / "data" com um array.')
}

// ==========================================================================
// Importação de Produtos
// ==========================================================================

export interface NormalizedProductImportItem {
  name: string
  sku: string
  barcode?: string
  category_name?: string
  selling_price: number
  cost_price: number
  unit: string
  min_stock: number
  initial_stock: number
  description?: string
  controls_batch: boolean
  controls_expiration: boolean
  is_published: boolean
  raw?: Record<string, any>
}

/** Limpa e normaliza strings de chaves (sem acentos, lowercase, sem pontuação extra) */
function cleanKey(rawKey: string): string {
  return rawKey
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Conversão robusta de valores para número (suporta "12,50", "R$ 1.250,00", etc.) */
export function parseImportNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (value === undefined || value === null || String(value).trim() === '') return fallback

  const str = String(value).trim()
  let clean = str.replace(/[^\d,.-]/g, '').trim()
  if (!clean) return fallback

  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // Ex: 1.234,56 -> 1234.56
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      // Ex: 1,234.56 -> 1234.56
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    // Ex: 1234,56 -> 1234.56
    clean = clean.replace(',', '.')
  }

  const num = parseFloat(clean)
  return Number.isFinite(num) ? num : fallback
}

/** Conversão robusta de valores para booleano */
export function parseImportBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  const str = String(value).trim().toLowerCase()
  if (['true', '1', 'sim', 's', 'yes', 'y', 'ativo', 'v'].includes(str)) return true
  if (['false', '0', 'nao', 'não', 'n', 'no', 'inativo', 'f'].includes(str)) return false
  return fallback
}

/** Alias de colunas aceitas no import de produtos → chave canônica. */
export const PRODUCT_COLUMN_ALIASES: Record<string, string> = {
  // Name
  name: 'name',
  nome: 'name',
  produto: 'name',
  'nome do produto': 'name',
  'nome produto': 'name',
  'descricao do item': 'name',
  'descricao do produto': 'name',
  item: 'name',
  titulo: 'name',

  // SKU
  sku: 'sku',
  codigo: 'sku',
  'codigo interno': 'sku',
  'codigo do produto': 'sku',
  'codigo produto': 'sku',
  'codigo item': 'sku',
  cod: 'sku',
  'cod.': 'sku',
  ref: 'sku',
  'ref.': 'sku',
  referencia: 'sku',

  // Barcode
  barcode: 'barcode',
  ean: 'barcode',
  'ean 13': 'barcode',
  ean13: 'barcode',
  'codigo de barras': 'barcode',
  'cod de barras': 'barcode',
  'cod barras': 'barcode',
  gtin: 'barcode',

  // Category
  category_name: 'category_name',
  category: 'category_name',
  categoria: 'category_name',
  departamento: 'category_name',
  secao: 'category_name',
  grupo: 'category_name',
  'grupo de produtos': 'category_name',
  'categoria do produto': 'category_name',

  // Selling price
  selling_price: 'selling_price',
  sellingprice: 'selling_price',
  preco_venda: 'selling_price',
  'preco de venda': 'selling_price',
  'preco venda': 'selling_price',
  preco: 'selling_price',
  price: 'selling_price',
  valor: 'selling_price',
  'valor de venda': 'selling_price',
  'valor venda': 'selling_price',
  'preco unitario': 'selling_price',
  'preco unit': 'selling_price',
  'valor unitario': 'selling_price',
  'valor unit': 'selling_price',
  venda: 'selling_price',
  pv: 'selling_price',

  // Cost price
  cost_price: 'cost_price',
  costprice: 'cost_price',
  preco_custo: 'cost_price',
  'preco de custo': 'cost_price',
  'preco custo': 'cost_price',
  custo: 'cost_price',
  'valor de custo': 'cost_price',
  'valor custo': 'cost_price',
  pc: 'cost_price',

  // Unit
  unit: 'unit',
  unidade: 'unit',
  und: 'unit',
  un: 'unit',
  medida: 'unit',
  'unidade de medida': 'unit',
  'un.': 'unit',

  // Min Stock
  min_stock: 'min_stock',
  minstock: 'min_stock',
  estoque_minimo: 'min_stock',
  'estoque minimo': 'min_stock',
  'est minimo': 'min_stock',
  minimo: 'min_stock',

  // Initial Stock
  initial_stock: 'initial_stock',
  initialstock: 'initial_stock',
  stock_quantity: 'initial_stock',
  estoque_inicial: 'initial_stock',
  'estoque inicial': 'initial_stock',
  estoque: 'initial_stock',
  quantidade: 'initial_stock',
  qtd: 'initial_stock',
  quant: 'initial_stock',
  'qtd.': 'initial_stock',
  saldo: 'initial_stock',
  'saldo inicial': 'initial_stock',
  'saldo atual': 'initial_stock',

  // Description
  description: 'description',
  descricao: 'description',
  detalhes: 'description',
  observacao: 'description',
  observacoes: 'description',
  obs: 'description',

  // Controls
  controls_batch: 'controls_batch',
  controlsbatch: 'controls_batch',
  controla_lote: 'controls_batch',
  'controla lote': 'controls_batch',
  lote: 'controls_batch',

  controls_expiration: 'controls_expiration',
  controlsexpiration: 'controls_expiration',
  controla_validade: 'controls_expiration',
  'controla validade': 'controls_expiration',
  validade: 'controls_expiration',

  is_published: 'is_published',
  ispublished: 'is_published',
  publicado: 'is_published',
  'publicar catalogo': 'is_published',
  'publicado catalogo': 'is_published',
  catalogo: 'is_published',
}

/** Normaliza um objeto qualquer de linha de produto para o tipo canônico */
export function normalizeProductRow(row: Record<string, any>): NormalizedProductImportItem {
  if (!row || typeof row !== 'object') {
    return {
      name: '',
      sku: '',
      selling_price: 0,
      cost_price: 0,
      unit: 'UN',
      min_stock: 5,
      initial_stock: 0,
      controls_batch: false,
      controls_expiration: false,
      is_published: true,
      raw: row,
    }
  }

  const canonicalMap: Record<string, any> = {}

  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null) continue
    const cleaned = cleanKey(key)
    const canonical = PRODUCT_COLUMN_ALIASES[cleaned]
    if (canonical) {
      if (canonicalMap[canonical] === undefined || canonicalMap[canonical] === '') {
        canonicalMap[canonical] = val
      }
    }
  }

  // Fallbacks heurísticos caso o nome da coluna contenha palavras-chave
  if (canonicalMap.selling_price === undefined) {
    for (const [key, val] of Object.entries(row)) {
      const cleaned = cleanKey(key)
      if (
        (cleaned.includes('preco') || cleaned.includes('valor') || cleaned.includes('price')) &&
        !cleaned.includes('custo') &&
        !cleaned.includes('cost')
      ) {
        canonicalMap.selling_price = val
        break
      }
    }
  }

  if (canonicalMap.cost_price === undefined) {
    for (const [key, val] of Object.entries(row)) {
      const cleaned = cleanKey(key)
      if (cleaned.includes('custo') || cleaned.includes('cost')) {
        canonicalMap.cost_price = val
        break
      }
    }
  }

  if (canonicalMap.name === undefined) {
    for (const [key, val] of Object.entries(row)) {
      const cleaned = cleanKey(key)
      if (
        cleaned.includes('nome') ||
        cleaned.includes('produto') ||
        cleaned.includes('item') ||
        cleaned.includes('name')
      ) {
        canonicalMap.name = val
        break
      }
    }
  }

  const name = String(canonicalMap.name ?? '').trim()
  const sku = String(canonicalMap.sku ?? '').trim()
  const barcode = canonicalMap.barcode ? String(canonicalMap.barcode).trim() : undefined
  const category_name = canonicalMap.category_name ? String(canonicalMap.category_name).trim() : undefined
  const selling_price = parseImportNumber(canonicalMap.selling_price, 0)
  const cost_price = parseImportNumber(canonicalMap.cost_price, 0)
  const unit = (canonicalMap.unit ? String(canonicalMap.unit).trim().toUpperCase() : 'UN') || 'UN'
  const min_stock = parseImportNumber(canonicalMap.min_stock, 5)
  const initial_stock = parseImportNumber(canonicalMap.initial_stock, 0)
  const description = canonicalMap.description ? String(canonicalMap.description).trim() : undefined
  const controls_batch = parseImportBoolean(canonicalMap.controls_batch, false)
  const controls_expiration = parseImportBoolean(canonicalMap.controls_expiration, false)
  const is_published = parseImportBoolean(canonicalMap.is_published, true)

  return {
    name,
    sku,
    barcode,
    category_name,
    selling_price,
    cost_price,
    unit,
    min_stock,
    initial_stock,
    description,
    controls_batch,
    controls_expiration,
    is_published,
    raw: row,
  }
}

/** Faz o parse de texto CSV/JSON e devolve um array de produtos totalmente normalizados */
export function parseProductsImport(content: string, isJsonHint = false): NormalizedProductImportItem[] {
  const trimmed = content.trim()
  if (!trimmed) return []

  let rawRows: Record<string, any>[] = []
  if (isJsonHint || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    rawRows = parseJSONContent(trimmed)
  } else {
    rawRows = parseCSVContent(trimmed)
  }

  return rawRows.map(normalizeProductRow)
}

export function downloadTemplateCSV(): void {
  const headers = [
    'name',
    'sku',
    'barcode',
    'category_name',
    'selling_price',
    'cost_price',
    'unit',
    'min_stock',
    'initial_stock',
    'description',
  ].join(';')

  const sampleRows = [
    [
      '"Azeite de Oliva Extra Virgem 500ml"',
      '"AZE-001"',
      '"7891234567890"',
      '"Azeites"',
      '"49.90"',
      '"28.50"',
      '"UN"',
      '"10"',
      '"50"',
      '"Azeite de oliva prensado a frio"',
    ].join(';'),
    [
      '"Azeitona Preta Azapa 500g"',
      '"AZE-002"',
      '"7891234567891"',
      '"Conservas"',
      '"24.50"',
      '"14.00"',
      '"UN"',
      '"5"',
      '"30"',
      '"Azeitonas chilenas em conserva"',
    ].join(';'),
    [
      '"Vinagre Balsâmico de Modena 250ml"',
      '"VIN-001"',
      '"7891234567892"',
      '"Molhos & Vinagres"',
      '"38.00"',
      '"21.00"',
      '"UN"',
      '"8"',
      '"25"',
      '"Aceto balsâmico tradicional"',
    ].join(';'),
  ]

  const csv = '\uFEFF' + [headers, ...sampleRows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_produtos.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadTemplateJSON(): void {
  const sampleData = [
    {
      name: 'Azeite de Oliva Extra Virgem 500ml',
      sku: 'AZE-001',
      barcode: '7891234567890',
      category_name: 'Azeites',
      selling_price: 49.9,
      cost_price: 28.5,
      unit: 'UN',
      min_stock: 10,
      initial_stock: 50,
      description: 'Azeite de oliva prensado a frio',
      controls_batch: true,
      controls_expiration: true,
      is_published: true,
    },
    {
      name: 'Azeitona Preta Azapa 500g',
      sku: 'AZE-002',
      barcode: '7891234567891',
      category_name: 'Conservas',
      selling_price: 24.5,
      cost_price: 14.0,
      unit: 'UN',
      min_stock: 5,
      initial_stock: 30,
      description: 'Azeitonas chilenas em conserva',
      controls_batch: false,
      controls_expiration: true,
      is_published: true,
    },
  ]

  const jsonString = JSON.stringify(sampleData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_produtos.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ==========================================================================
// Importação de Movimentações de Estoque
// ==========================================================================

/** Alias de colunas aceitas no import de estoque → chave canônica. */
export const STOCK_COLUMN_ALIASES: Record<string, string> = {
  sku: 'sku',
  codigo: 'sku',
  'codigo do item': 'sku',
  'codigo item': 'sku',
  product_id: 'product_id',
  movement_type: 'movement_type',
  tipo: 'movement_type',
  'tipo de movimento': 'movement_type',
  quantity: 'quantity',
  quantidade: 'quantity',
  lot_number: 'lot_number',
  lote: 'lot_number',
  expiration_date: 'expiration_date',
  validade: 'expiration_date',
  'data de validade': 'expiration_date',
  manufacturing_date: 'manufacturing_date',
  fabricacao: 'manufacturing_date',
  unit_cost: 'unit_cost',
  'custo unitario': 'unit_cost',
  reason_code: 'reason_code',
  motivo: 'reason_code',
  cost_center_code: 'cost_center_code',
  'centro de custo': 'cost_center_code',
  'centro de custo de perda': 'cost_center_code',
  approver_email: 'approver_email',
  aprovador: 'approver_email',
  'email do aprovador': 'approver_email',
  notes: 'notes',
  observacoes: 'notes',
  'observações': 'notes',
}

/** Normaliza as chaves de um registro de estoque para as chaves canonicas. */
export function normalizeStockRow(
  row: Record<string, any>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
    const canonical = STOCK_COLUMN_ALIASES[normalizedKey]
    if (canonical && value !== undefined && value !== null && String(value).trim() !== '') {
      out[canonical] = String(value).trim()
    }
  }
  return out
}

export function downloadStockTemplateCSV(): void {
  const headers = [
    'sku',
    'movement_type',
    'quantity',
    'lot_number',
    'expiration_date',
    'unit_cost',
    'reason_code',
    'cost_center_code',
    'approver_email',
    'notes',
  ].join(';')

  const sampleRows = [
    [
      '"AZE-001"',
      '"ENTRY"',
      '"120"',
      '"L2026-01"',
      '"2027-01-31"',
      '"28.50"',
      '""',
      '""',
      '""',
      '"Recebimento lote de janeiro"',
    ].join(';'),
    [
      '"VIN-001"',
      '"EXPIRATION"',
      '"8"',
      '"L2025-07"',
      '"2025-08-10"',
      '"21.00"',
      '"VENCIMENTO"',
      '"VENC-OP"',
      '"gerente@olivelas.com"',
      '"Descarte de lote vencido"',
    ].join(';'),
    [
      '"AZE-002"',
      '"DAMAGE"',
      '"3"',
      '""',
      '""',
      '"14.00"',
      '"QUEBRA"',
      '"AVARIA-OP"',
      '"gerente@olivelas.com"',
      '"Frascos quebrados no transporte"',
    ].join(';'),
  ]

  const csv = '\uFEFF' + [headers, ...sampleRows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_estoque.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadStockTemplateJSON(): void {
  const sampleData = [
    {
      sku: 'AZE-001',
      movement_type: 'ENTRY',
      quantity: 120,
      lot_number: 'L2026-01',
      expiration_date: '2027-01-31',
      unit_cost: 28.5,
      notes: 'Recebimento lote de janeiro',
    },
    {
      sku: 'VIN-001',
      movement_type: 'EXPIRATION',
      quantity: 8,
      lot_number: 'L2025-07',
      expiration_date: '2025-08-10',
      unit_cost: 21.0,
      reason_code: 'VENCIMENTO',
      cost_center_code: 'VENC-OP',
      approver_email: 'gerente@olivelas.com',
      notes: 'Descarte de lote vencido',
    },
  ]

  const jsonString = JSON.stringify({ stock_movements: sampleData }, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_estoque.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

