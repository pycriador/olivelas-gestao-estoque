import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService, type ProductFilters } from '@/services/productService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { formatCurrency } from '@/utils/currency'
import { exportToCSV } from '@/utils/export'
import { generateSKU } from '@/utils/barcode'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import {
  Package,
  Plus,
  Search,
  Download,
  Filter,
  Trash2,
  Edit2,
  AlertTriangle,
  QrCode
} from 'lucide-react'
import type { Product } from '@/types/product.types'

export function ProductsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  // Filter states
  const [search, setSearch] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('')
  const [page, setPage] = React.useState(1)
  const pageSize = 15

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

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

  const filters: ProductFilters = {
    search: search || undefined,
    categoryId: selectedCategory || undefined,
    page,
    pageSize,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['products', storeId, filters],
    queryFn: () => productService.listProducts(storeId, filters),
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

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t.products.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t.products.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={products.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> {t.common.export} CSV
          </Button>
          <Button size="sm" onClick={handleOpenCreate} className="shadow-md">
            <Plus className="h-4 w-4 mr-1.5" /> {t.products.newProduct}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <Input
              placeholder="Pesquisar por nome, SKU ou código de barras..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Product List / Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={6} className="h-12" />
            </div>
          ) : products.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Package className="h-10 w-10 text-primary" />}
                title="Nenhum produto cadastrado"
                description="Cadastre seus produtos com preços, códigos de barras e estoque inicial para começar a vender."
                actionLabel="Cadastrar Primeiro Produto"
                onAction={handleOpenCreate}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Produto</th>
                    <th className="py-3.5 px-4">SKU / Barcode</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4 text-right">Custo</th>
                    <th className="py-3.5 px-4 text-right">Preço de Venda</th>
                    <th className="py-3.5 px-4 text-center">Estoque Atual</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {products.map((p) => {
                    const isLowStock = (p.stock_quantity ?? 0) <= Number(p.min_stock)
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0">
                              {p.images?.[0] ? (
                                <img
                                  src={p.images[0].public_url}
                                  alt={p.name}
                                  className="h-full w-full object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{p.name}</div>
                              <span className="text-[11px] text-muted-foreground">{p.unit}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div>{p.sku}</div>
                          {p.barcode && (
                            <span className="text-[10px] text-muted-foreground block">{p.barcode}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.category_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          {formatCurrency(p.cost_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatCurrency(p.selling_price)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 font-bold font-mono">
                            {p.stock_quantity ?? 0}
                            {isLowStock && (
                              <span title="Estoque no limite mínimo ou zerado">
                                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={p.is_active ? 'success' : 'secondary'}>
                            {p.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Editar Produto"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Deseja realmente desativar o produto "${p.name}"?`)) {
                                  deleteMutation.mutate(p.id)
                                }
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-danger/15 hover:text-danger"
                              title="Excluir Produto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-xs text-muted-foreground">
              <span>
                Página {page} de {totalPages} ({totalItems} itens no total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isNewModalOpen || Boolean(editingProduct)}
        onClose={() => {
          setIsNewModalOpen(false)
          setEditingProduct(null)
        }}
        title={editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
        description="Preencha os dados cadastrais, fiscais e operacionais do produto"
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium">Nome do Produto *</label>
              <Input
                placeholder="Ex: Azeite Extra Virgem 500ml"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">SKU / Código Interno *</label>
              <Input
                placeholder="PRD-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Código de Barras / EAN-13</label>
              <Input
                placeholder="7891234567890"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Categoria</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              <label className="text-xs font-medium">Unidade de Medida</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="UN">Unidade (UN)</option>
                <option value="KG">Quilograma (KG)</option>
                <option value="CX">Caixa (CX)</option>
                <option value="LT">Litro (LT)</option>
                <option value="FD">Fardo (FD)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Preço de Custo (R$)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Preço de Venda (R$) *</label>
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
              <label className="text-xs font-medium">Estoque Mínimo</label>
              <Input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Estoque Máximo</label>
              <Input
                type="number"
                value={formData.maxStock}
                onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Checkbox controls */}
            <div className="sm:col-span-2 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.controlsBatch}
                  onChange={(e) => setFormData({ ...formData, controlsBatch: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Controla Lote</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.controlsExpiration}
                  onChange={(e) => setFormData({ ...formData, controlsExpiration: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span>Controla Validade</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
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

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsNewModalOpen(false)
                setEditingProduct(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
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
