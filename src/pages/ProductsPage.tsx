import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatCurrency } from '@/utils/currency'
import { exportToCSV } from '@/utils/export'
import { generateSKU } from '@/utils/barcode'
import { parseApiError } from '@/utils/errorHandler'
import {
  parseCSVContent,
  parseJSONContent,
  downloadTemplateCSV,
  downloadTemplateJSON,
} from '@/utils/importParser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
} from 'lucide-react'
import type { Product } from '@/types/product.types'

export function ProductsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  // URL-bound Pagination, Sorting and Filters
  const {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setPageSize,
    setSearch,
    toggleSort,
    setFilter,
  } = useTablePagination({
    defaultPageSize: 15,
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
  })

  const selectedCategory = filters.category || ''

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Bulk Import state
  const [importMode, setImportMode] = React.useState<'file' | 'paste'>('file')
  const [pastedText, setPastedText] = React.useState('')
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [parsedItems, setParsedItems] = React.useState<any[]>([])
  const [importError, setImportError] = React.useState<string | null>(null)
  const [importResult, setImportResult] = React.useState<{
    successCount: number
    errorCount: number
    errors: string[]
  } | null>(null)

  // Form fields
  const [formData, setFormData] = React.useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    costPrice: 0,
    sellingPrice: 0,
    unit: 'UN',
    minStock: 5,
    maxStock: 500,
    controlsBatch: false,
    controlsExpiration: false,
    isPublished: true,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['products', storeId, { search, selectedCategory, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      productService.listProducts(storeId, {
        search: search || undefined,
        categoryId: selectedCategory || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => productService.listCategories(storeId),
    enabled: Boolean(hasActiveStore),
  })

  const products = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newP: Partial<Product>) => productService.createProduct(storeId, newP),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setIsNewModalOpen(false)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) =>
      productService.updateProduct(id, storeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      setEditingProduct(null)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.softDeleteProduct(id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
    },
    onError: (err) => alert(parseApiError(err)),
  })

  const bulkImportMutation = useMutation({
    mutationFn: (items: any[]) => productService.importProductsBulk(storeId, items),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['categories', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setImportResult(result)
    },
    onError: (err) => setImportError(parseApiError(err)),
  })

  const resetForm = () => {
    setFormData({
      name: '',
      sku: generateSKU('PRD'),
      barcode: '',
      description: '',
      categoryId: '',
      costPrice: 0,
      sellingPrice: 0,
      unit: 'UN',
      minStock: 5,
      maxStock: 500,
      controlsBatch: false,
      controlsExpiration: false,
      isPublished: true,
    })
    setErrorMsg(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsNewModalOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p)
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      description: p.description || '',
      categoryId: p.category_id || '',
      costPrice: Number(p.cost_price),
      sellingPrice: Number(p.selling_price),
      unit: p.unit || 'UN',
      minStock: Number(p.min_stock),
      maxStock: Number(p.max_stock),
      controlsBatch: Boolean(p.controls_batch),
      controlsExpiration: Boolean(p.controls_expiration),
      isPublished: Boolean(p.is_published_catalog),
    })
    setErrorMsg(null)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.sku) return

    const payload: Partial<Product> = {
      name: formData.name,
      sku: formData.sku,
      barcode: formData.barcode || null,
      description: formData.description || null,
      category_id: formData.categoryId || null,
      cost_price: formData.costPrice,
      selling_price: formData.sellingPrice,
      unit: formData.unit,
      min_stock: formData.minStock,
      max_stock: formData.maxStock,
      controls_batch: formData.controlsBatch,
      controls_expiration: formData.controlsExpiration,
      is_published_catalog: formData.isPublished,
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, updates: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleExportCSV = () => {
    if (products.length === 0) return
    exportToCSV(
      'produtos',
      products,
      [
        { header: 'ID', key: 'id' },
        { header: 'Nome', key: 'name' },
        { header: 'SKU', key: 'sku' },
        { header: 'Código de Barras', key: (r) => r.barcode || '-' },
        { header: 'Categoria', key: (r) => r.category_name || '-' },
        { header: 'Preço de Custo', key: (r) => r.cost_price },
        { header: 'Preço de Venda', key: (r) => r.selling_price },
        { header: 'Estoque Atual', key: (r) => r.stock_quantity ?? 0 },
        { header: 'Estoque Mínimo', key: 'min_stock' },
        { header: 'Unidade', key: 'unit' },
      ]
    )
  }

  // File / Text import processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setImportError(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      processRawImportText(content, file.name.endsWith('.json'))
    }
    reader.onerror = () => setImportError('Erro ao ler o arquivo selecionado.')
    reader.readAsText(file, 'UTF-8')
  }

  const processRawImportText = (text: string, isJsonHint = false) => {
    try {
      setImportError(null)
      setImportResult(null)
      const trimmed = text.trim()
      if (!trimmed) {
        setParsedItems([])
        return
      }

      if (isJsonHint || trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const items = parseJSONContent(trimmed)
        setParsedItems(items)
      } else {
        const items = parseCSVContent(trimmed)
        setParsedItems(items)
      }
    } catch (err: any) {
      setImportError(err.message || 'Formato inválido. Verifique o conteúdo CSV ou JSON.')
      setParsedItems([])
    }
  }

  const handleOpenImport = () => {
    setFileName(null)
    setPastedText('')
    setParsedItems([])
    setImportError(null)
    setImportResult(null)
    setIsImportModalOpen(true)
  }

  const handleExecuteImport = () => {
    if (parsedItems.length === 0) return
    bulkImportMutation.mutate(parsedItems)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Unified Compact Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            {t.products.title}
            <Badge variant="outline" className="text-[11px] font-normal px-2 py-0">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </Badge>
          </h1>
          <span className="hidden sm:inline text-xs text-muted-foreground">| {t.products.subtitle}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-full sm:w-56 relative">
            <Input
              placeholder="Buscar nome, SKU, código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
              icon={<Search className="h-3.5 w-3.5" />}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setFilter('category', e.target.value)}
            aria-label="Filtrar por categoria"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="">Todas Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={handleOpenImport} className="h-8 text-xs px-2.5">
            <Upload className="h-3.5 w-3.5 mr-1" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={products.length === 0} className="h-8 text-xs px-2.5">
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={handleOpenCreate} className="h-8 text-xs px-2.5 shadow-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* Products Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={6} />
            </div>
          ) : products.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={<Package className="h-10 w-10 text-muted-foreground" />}
                title="Nenhum produto cadastrado"
                description="Cadastre seu primeiro produto ou importe em massa via CSV/JSON para iniciar as vendas"
                actionLabel={t.products.newProduct}
                onAction={handleOpenCreate}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <SortableHeader
                      column="name"
                      label="Produto"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="sku"
                      label="SKU / Barcode"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4 font-semibold">Categoria</th>
                    <SortableHeader
                      column="cost_price"
                      label="Preço de Custo"
                      align="right"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="selling_price"
                      label="Preço de Venda"
                      align="right"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4 font-semibold text-center">Estoque</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => {
                    const isLowStock = (p.stock_quantity ?? 0) <= (p.min_stock ?? 5)
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-foreground">{p.name}</div>
                          {p.description && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                              {p.description}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-mono">
                          <div className="text-foreground">{p.sku}</div>
                          {p.barcode && (
                            <div className="text-[10px] text-muted-foreground">{p.barcode}</div>
                          )}
                        </td>

                        <td className="py-2.5 px-4">
                          {p.category_name ? (
                            <Badge variant="outline">{p.category_name}</Badge>
                          ) : (
                            <span className="text-muted-foreground italic">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                          {formatCurrency(p.cost_price || 0)}
                        </td>

                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                          {formatCurrency(p.selling_price || 0)}
                        </td>

                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                              isLowStock
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {p.stock_quantity ?? 0} {p.unit || 'UN'}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-center">
                          <Badge variant={p.is_active ? 'success' : 'secondary'}>
                            {p.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente desativar o produto ${p.name}?`)) {
                                deleteMutation.mutate(p.id)
                              }
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Desativar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pin Pagination at the bottom of the card */}
        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>

      {/* Bulk Import Modal (CSV & JSON) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importação Rápida de Produtos (CSV / JSON)"
        description="Suba múltiplos produtos de uma só vez a partir de planilhas ou arquivos de dados"
        maxWidth="3xl"
      >
        <div className="space-y-4 pt-1 text-xs">
          {/* Instructions and Download Templates Bar */}
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-foreground">Modelos Prontos para Download</div>
              <div className="text-muted-foreground text-[11px] mt-0.5">
                Utilize as colunas padrão para garantir o cadastro automático de categorias e saldos.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={downloadTemplateCSV}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Modelo .CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={downloadTemplateJSON}
              >
                <FileCode className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Modelo .JSON
              </Button>
            </div>
          </div>

          {/* Format Tabs */}
          <div className="flex border-b border-border gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setImportMode('file')}
              className={`pb-2.5 transition-colors border-b-2 ${
                importMode === 'file'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Upload de Arquivo (.csv, .json)
            </button>
            <button
              type="button"
              onClick={() => setImportMode('paste')}
              className={`pb-2.5 transition-colors border-b-2 ${
                importMode === 'paste'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Colar Texto Diretamente
            </button>
          </div>

          {/* Mode 1: File Drop Zone */}
          {importMode === 'file' && (
            <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-6 text-center bg-surface-elevated/40">
              <input
                type="file"
                id="file-product-import"
                accept=".csv, .json, .txt, text/csv, application/json"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label
                htmlFor="file-product-import"
                className="flex flex-col items-center justify-center cursor-pointer space-y-2"
              >
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {fileName ? (
                    <span className="text-primary font-bold">{fileName}</span>
                  ) : (
                    'Clique para selecionar ou arraste o arquivo aqui'
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Suporta arquivos delimitados por vírgula/ponto-e-vírgula (.CSV) ou JSON nativo (.JSON)
                </div>
              </label>
            </div>
          )}

          {/* Mode 2: Paste Raw Content */}
          {importMode === 'paste' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground text-xs">
                Cole o conteúdo CSV ou array JSON abaixo:
              </label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value)
                  processRawImportText(e.target.value)
                }}
                placeholder={`name;sku;selling_price;cost_price;category_name;initial_stock\nAzeite Extra Virgem;AZE-01;49.90;28.00;Azeites;50`}
                className="w-full p-3 rounded-xl border border-input bg-background font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Error Message */}
          {importError && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Success Banner */}
          {importResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>Importação Concluída com Sucesso!</span>
              </div>
              <div className="text-xs text-foreground">
                <b>{importResult.successCount}</b> produto(s) importado(s) e integrados ao catálogo.
                {importResult.errorCount > 0 && (
                  <span className="text-danger ml-2 font-medium">
                    ({importResult.errorCount} falha(s))
                  </span>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 p-2.5 bg-surface rounded-lg border border-border max-h-32 overflow-y-auto font-mono text-[11px] text-danger space-y-1">
                  {importResult.errors.map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parsed Items Preview */}
          {parsedItems.length > 0 && !importResult && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <span>Pré-visualização dos Dados</span>
                  <Badge variant="default">{parsedItems.length} registros identificados</Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Exibindo os primeiros {Math.min(5, parsedItems.length)} registros
                </span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-surface">
                <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted/60 font-bold uppercase text-[10px] text-muted-foreground">
                  <div className="col-span-4">Produto</div>
                  <div className="col-span-2">SKU</div>
                  <div className="col-span-2">Categoria</div>
                  <div className="col-span-2 text-right">Preço Venda</div>
                  <div className="col-span-2 text-center">Estoque Inicial</div>
                </div>
                {parsedItems.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 items-center font-mono text-xs">
                    <div className="col-span-4 font-sans font-semibold text-foreground truncate">
                      {item.name || item.Nome || item.nome || item.produto || <span className="text-danger">Sem nome</span>}
                    </div>
                    <div className="col-span-2 text-muted-foreground truncate">
                      {item.sku || item.SKU || <span className="text-primary italic">Automático</span>}
                    </div>
                    <div className="col-span-2 font-sans text-muted-foreground truncate">
                      {item.category_name || item.category || item.categoria || '-'}
                    </div>
                    <div className="col-span-2 text-right font-bold text-foreground">
                      {item.selling_price || item.preco_venda || item.preco || item.price ? `R$ ${item.selling_price || item.preco_venda || item.preco || item.price}` : 'R$ 0,00'}
                    </div>
                    <div className="col-span-2 text-center text-primary font-bold">
                      {item.initial_stock ?? item.stock_quantity ?? item.estoque ?? item.quantidade ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => setIsImportModalOpen(false)}
            >
              {importResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {!importResult && (
              <Button
                type="button"
                className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
                disabled={parsedItems.length === 0}
                isLoading={bulkImportMutation.isPending}
                onClick={handleExecuteImport}
              >
                <Upload className="h-4 w-4 mr-2" /> Iniciar Importação ({parsedItems.length})
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isNewModalOpen || Boolean(editingProduct)}
        onClose={() => {
          setIsNewModalOpen(false)
          setEditingProduct(null)
        }}
        title={editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
        description="Preencha os dados cadastrais, fiscais e operacionais do produto"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Nome do Produto *</label>
              <Input
                placeholder="Ex: Azeite Extra Virgem 500ml"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">SKU / Código Interno *</label>
              <Input
                placeholder="PRD-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Código de Barras / EAN-13</label>
              <Input
                placeholder="7891234567890"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Categoria</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Unidade de Medida</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                <option value="UN">Unidade (UN)</option>
                <option value="KG">Quilograma (KG)</option>
                <option value="CX">Caixa (CX)</option>
                <option value="LT">Litro (LT)</option>
                <option value="FD">Fardo (FD)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Preço de Custo (R$)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Preço de Venda (R$) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Estoque Mínimo</label>
              <Input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Estoque Máximo</label>
              <Input
                type="number"
                value={formData.maxStock}
                onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Checkbox controls */}
            <div className="sm:col-span-2 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border">
              <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 text-xs font-medium cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.controlsBatch}
                  onChange={(e) => setFormData({ ...formData, controlsBatch: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Controla Lote</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 text-xs font-medium cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.controlsExpiration}
                  onChange={(e) => setFormData({ ...formData, controlsExpiration: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Controla Validade</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 text-xs font-medium cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Publicar no Catálogo</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => {
                setIsNewModalOpen(false)
                setEditingProduct(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              Salvar Produto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
