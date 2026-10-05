import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supplierService } from '@/services/supplierService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { parseApiError } from '@/utils/errorHandler'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import { Truck, Plus, Search, Download, Trash2, Edit2, Phone, Mail } from 'lucide-react'
import type { Supplier } from '@/types/supplier.types'

export function SuppliersPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

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
    defaultSortBy: 'corporate_name',
    defaultSortOrder: 'asc',
  })

  const statusFilter = filters.status || 'ALL'

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = React.useState<Supplier | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    corporateName: '',
    tradeName: '',
    document: '',
    contactName: '',
    phone: '',
    email: '',
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', storeId, { search, statusFilter, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      supplierService.listSuppliers(storeId, {
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const suppliers = Array.isArray(data) ? data : data?.data || []
  const totalItems = Array.isArray(data) ? data.length : data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const createMutation = useMutation({
    mutationFn: (s: Partial<Supplier>) => supplierService.createSupplier(storeId, s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Supplier> }) =>
      supplierService.updateSupplier(id, storeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
      setEditingSupplier(null)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplierService.softDeleteSupplier(id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
    },
  })

  const resetForm = () => {
    setFormData({
      corporateName: '',
      tradeName: '',
      document: '',
      contactName: '',
      phone: '',
      email: '',
      notes: '',
    })
    setErrorMsg(null)
  }

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s)
    setFormData({
      corporateName: s.corporate_name,
      tradeName: s.trade_name || '',
      document: s.document || '',
      contactName: s.contact_name || '',
      phone: s.phone || '',
      email: s.email || '',
      notes: s.notes || '',
    })
    setErrorMsg(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.corporateName) return

    const payload: Partial<Supplier> = {
      corporate_name: formData.corporateName,
      trade_name: formData.tradeName || null,
      document: formData.document || null,
      contact_name: formData.contactName || null,
      phone: formData.phone || null,
      email: formData.email || null,
      notes: formData.notes || null,
    }

    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, updates: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleExportCSV = () => {
    if (suppliers.length === 0) return
    exportToCSV(
      'fornecedores',
      suppliers,
      [
        { header: 'Razão Social', key: 'corporate_name' },
        { header: 'Nome Fantasia', key: (r) => r.trade_name || '-' },
        { header: 'CNPJ', key: (r) => r.document || '-' },
        { header: 'Contato', key: (r) => r.contact_name || '-' },
        { header: 'Telefone', key: (r) => r.phone || '-' },
        { header: 'E-mail', key: (r) => r.email || '-' },
      ]
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title={t.nav.suppliers}>
        <Input
          placeholder="Buscar razão, fantasia, CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Count, Filters & Actions) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalItems} {totalItems === 1 ? 'fornecedor' : 'fornecedores'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select
            value={statusFilter}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="Filtrar por status"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Apenas Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={suppliers.length === 0} className="h-8 text-xs px-2.5">
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="h-8 text-xs px-2.5 shadow-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<Truck className="h-10 w-10 text-primary" />}
                title="Nenhum fornecedor encontrado"
                description="Cadastre seus fornecedores para emitir ordens de compra e dar entrada no estoque com controle de lotes."
                actionLabel="Novo Fornecedor"
                onAction={() => {
                  resetForm()
                  setIsModalOpen(true)
                }}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="corporate_name"
                      label="Empresa / Razão Social"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="document"
                      label="CNPJ"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4">Representante & Contato</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">
                        {s.corporate_name}
                        {s.trade_name && (
                          <span className="block text-[11px] text-muted-foreground font-normal">
                            Fantasia: {s.trade_name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono">{s.document || '-'}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        <div className="space-y-0.5">
                          {s.contact_name && (
                            <div className="font-medium text-foreground text-[11px]">{s.contact_name}</div>
                          )}
                          {s.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" /> {s.phone}
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" /> {s.email}
                            </div>
                          )}
                          {!s.phone && !s.email && !s.contact_name && <span>-</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant={s.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {s.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(s)}
                            className="h-8 text-xs font-semibold px-2.5"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingSupplier(s)}
                            className="h-8 text-xs font-semibold px-2.5 text-danger hover:bg-danger/10 border-danger/30"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Desativar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ResponsiveTable>
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

      {/* Supplier Modal */}
      <Modal
        isOpen={isModalOpen || Boolean(editingSupplier)}
        onClose={() => {
          setIsModalOpen(false)
          setEditingSupplier(null)
        }}
        title={editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        description="Dados da empresa fornecedora e canais de atendimento"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Razão Social *</label>
            <Input
              placeholder="Ex: Distribuidora de Alimentos Paulista LTDA"
              value={formData.corporateName}
              onChange={(e) => setFormData({ ...formData, corporateName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nome Fantasia</label>
              <Input
                placeholder="Ex: Alimentos Paulista"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">CNPJ</label>
              <Input
                placeholder="00.000.000/0001-00"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nome do Representante</label>
              <Input
                placeholder="Ex: Carlos Oliveira"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Telefone de Contato</label>
              <Input
                placeholder="(11) 3000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">E-mail</label>
            <Input
              type="email"
              placeholder="pedidos@fornecedor.com.br"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => {
                setIsModalOpen(false)
                setEditingSupplier(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              Salvar Fornecedor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={() => {
          if (deletingSupplier) {
            deleteMutation.mutate(deletingSupplier.id)
            setDeletingSupplier(null)
          }
        }}
        title="Desativar Fornecedor"
        description={`Tem certeza que deseja desativar o fornecedor "${deletingSupplier?.corporate_name}"? As ordens de compra e histórico anteriores serão mantidos.`}
        confirmText="Sim, Desativar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
