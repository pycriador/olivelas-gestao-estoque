import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Tags, Pencil, Trash2, FolderTree } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { usePermissions } from '@/hooks/usePermissions'
import { useI18n } from '@/hooks/useI18n'
import { categoryService } from '@/services/categoryService'
import { parseApiError } from '@/utils/errorHandler'
import type { CategoryWithUsage } from '@/services/categoryService'

export function CategoriesPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()

  const canCreate = hasPermission('products.create')
  const canUpdate = hasPermission('products.update')
  const canDelete = hasPermission('products.delete')

  const {
    page,
    pageSize,
    search,
    setPage,
    setPageSize,
    setSearch,
  } = useTablePagination({ defaultPageSize: 15, defaultSortBy: 'name', defaultSortOrder: 'asc' })

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<CategoryWithUsage | null>(null)
  const [deletingCategory, setDeletingCategory] = React.useState<CategoryWithUsage | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({ name: '', parentId: '' })

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => categoryService.listCategories(storeId),
    enabled: Boolean(hasActiveStore),
    // A lista alimenta o select de categoria do /products e do catalogo
    // publico; revalidar sempre evita categoria recem-criada nao aparecer.
    staleTime: 0,
    refetchOnMount: true,
  })

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return categories
    return categories.filter(
      (c) => c.name.toLowerCase().includes(term) || c.slug.includes(term)
    )
  }, [categories, search])

  const totalItems = filtered.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const safePage = Math.min(Math.max(1, page), totalPages)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['categories', storeId] })
    // O catalogo publico usa a mesma store em outra chave.
    queryClient.invalidateQueries({ queryKey: ['public-categories', storeId] })
    // Deletar uma categoria zera products.category_id via ON DELETE SET NULL.
    queryClient.invalidateQueries({ queryKey: ['products', storeId] })
    queryClient.invalidateQueries({ queryKey: ['public-products', storeId] })
  }, [queryClient, storeId])

  const createMutation = useMutation({
    mutationFn: () =>
      categoryService.createCategory(storeId, {
        name: formData.name,
        parentId: formData.parentId || null,
      }),
    onSuccess: () => {
      invalidate()
      closeModal()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      categoryService.updateCategory(editingCategory!.id, storeId, {
        name: formData.name,
        parentId: formData.parentId || null,
      }),
    onSuccess: () => {
      invalidate()
      closeModal()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id, storeId),
    onSuccess: () => {
      invalidate()
      setDeletingCategory(null)
    },
    onError: (err) => {
      setErrorMsg(parseApiError(err))
      setDeletingCategory(null)
    },
  })

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({ name: '', parentId: '' })
    setErrorMsg(null)
  }

  const handleOpenCreate = () => {
    setEditingCategory(null)
    setFormData({ name: '', parentId: '' })
    setErrorMsg(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (category: CategoryWithUsage) => {
    setEditingCategory(category)
    setFormData({ name: category.name, parentId: category.parent_id || '' })
    setErrorMsg(null)
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrorMsg('Informe o nome da categoria.')
      return
    }
    if (editingCategory) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  // Impede a categoria de ser pai de si mesma.
  const parentOptions = categories.filter((c) => c.id !== editingCategory?.id)

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      <PageHeader title={t.nav.categories}>
        <Input
          placeholder="Buscar categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalItems} {totalItems === 1 ? 'categoria' : 'categorias'}
          </Badge>
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 text-xs px-2.5 shadow-xs font-semibold ml-auto"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Categoria
          </Button>
        )}
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<Tags className="h-10 w-10 text-primary" />}
                title="Nenhuma categoria cadastrada"
                description="Crie as categorias usadas para organizar os produtos. Elas aparecem automaticamente no cadastro e na edição de produtos e no catálogo público."
                actionLabel={canCreate ? 'Nova Categoria' : undefined}
                onAction={canCreate ? handleOpenCreate : undefined}
              />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                Nenhuma categoria encontrada para &quot;{search}&quot;.
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <ResponsiveTable className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Nome</th>
                    <th className="py-3 px-4 font-semibold">Slug</th>
                    <th className="py-3 px-4 font-semibold">Categoria Pai</th>
                    <th className="py-3 px-4 font-semibold text-center">Produtos</th>
                    {canUpdate && <th className="py-3 px-4 font-semibold text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((c) => {
                    const parent = categories.find((p) => p.id === c.parent_id)
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Tags className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {c.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">
                          {c.slug}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {parent ? (
                            <span className="inline-flex items-center gap-1">
                              <FolderTree className="h-3 w-3 shrink-0" />
                              {parent.name}
                            </span>
                          ) : (
                            <span className="italic">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Badge
                            variant={c.product_count > 0 ? 'secondary' : 'outline'}
                            className="text-[10px] font-mono font-normal px-1.5 py-0"
                          >
                            {c.product_count}
                          </Badge>
                        </td>
                        {(canUpdate || canDelete) && (
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {canUpdate && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEdit(c)}
                                  title="Editar categoria"
                                  aria-label={`Editar ${c.name}`}
                                  className="h-8 sm:h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium"
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  <span>Editar</span>
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingCategory(c)}
                                  title="Excluir categoria"
                                  aria-label={`Excluir ${c.name}`}
                                  className="h-8 sm:h-7 px-2.5 text-xs text-muted-foreground hover:text-danger hover:border-danger/30 font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1 text-danger" />
                                  <span>Excluir</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </ResponsiveTable>
            </div>
          )}
        </CardContent>

        {totalItems > 0 && (
          <div className="p-3 border-t border-border bg-surface flex-shrink-0">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        description={
          editingCategory
            ? 'Atualize o nome ou a categoria pai. O slug e derivado do nome.'
            : 'A categoria fica disponível imediatamente no cadastro de produtos.'
        }
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Nome *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Hortifruti"
              required
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Categoria Pai</label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sem categoria pai</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={closeModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => {
          if (deletingCategory) deleteMutation.mutate(deletingCategory.id)
        }}
        title="Excluir Categoria"
        description={
          deletingCategory
            ? deletingCategory.product_count > 0
              ? `A categoria "${deletingCategory.name}" será removida e ${deletingCategory.product_count} produto(s) ficarão sem categoria. Os produtos não são excluídos.`
              : `A categoria "${deletingCategory.name}" será removida.`
            : ''
        }
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
