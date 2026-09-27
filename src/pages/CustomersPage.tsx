import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '@/services/customerService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { parseApiError } from '@/utils/errorHandler'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Users, Plus, Search, Download, Trash2, Edit2, Phone, Mail } from 'lucide-react'
import type { Customer } from '@/types/customer.types'

import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'

export function CustomersPage() {
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
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
  })

  const statusFilter = filters.status || 'ALL'

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = React.useState<Customer | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    name: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['customers', storeId, { search, statusFilter, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      customerService.listCustomers(storeId, {
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const customerList = Array.isArray(data) ? data : data?.data || []
  const totalItems = Array.isArray(data) ? data.length : data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const createMutation = useMutation({
    mutationFn: (c: Partial<Customer>) => customerService.createCustomer(storeId, c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Customer> }) =>
      customerService.updateCustomer(id, storeId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      setEditingCustomer(null)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerService.softDeleteCustomer(id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      notes: '',
    })
    setErrorMsg(null)
  }

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c)
    setFormData({
      name: c.name,
      document: c.document || '',
      email: c.email || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      notes: c.notes || '',
    })
    setErrorMsg(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) return

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, updates: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleExportCSV = () => {
    if (customerList.length === 0) return
    exportToCSV(
      'clientes',
      customerList,
      [
        { header: 'Nome', key: 'name' },
        { header: 'CPF/CNPJ', key: (r) => r.document || '-' },
        { header: 'E-mail', key: (r) => r.email || '-' },
        { header: 'Telefone', key: (r) => r.phone || '-' },
        { header: 'WhatsApp', key: (r) => r.whatsapp || '-' },
        { header: 'Status', key: 'status' },
      ]
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Gestão de Clientes">
        <Input
          placeholder="Buscar nome, CPF, e-mail..."
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
            {totalItems} {totalItems === 1 ? 'cliente' : 'clientes'}
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

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={customerList.length === 0} className="h-8 text-xs px-2.5">
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
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Cliente
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
          ) : customerList.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<Users className="h-10 w-10 text-primary" />}
                title="Nenhum cliente encontrado"
                description="Cadastre clientes para vincular vendas, pedidos e emitir relatórios de faturamento por cliente."
                actionLabel="Cadastrar Cliente"
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
                      column="name"
                      label="Nome do Cliente"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="document"
                      label="CPF / CNPJ"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4">Contatos</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerList.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">
                        {c.name}
                        {c.notes && (
                          <span className="block text-[11px] text-muted-foreground font-normal">
                            {c.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono">{c.document || '-'}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        <div className="space-y-0.5">
                          {c.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" /> {c.phone}
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" /> {c.email}
                            </div>
                          )}
                          {!c.phone && !c.email && <span>-</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {c.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCustomer(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-danger/15 hover:text-danger transition-colors"
                            title="Desativar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Customer Modal */}
      <Modal
        isOpen={isModalOpen || Boolean(editingCustomer)}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCustomer(null)
        }}
        title={editingCustomer ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
        description="Informações cadastrais e de contato do cliente"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Nome Completo / Razão Social *</label>
            <Input
              placeholder="Ex: Maria Fernandes"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">CPF ou CNPJ</label>
              <Input
                placeholder="000.000.000-00"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Telefone / Celular</label>
              <Input
                placeholder="(11) 98765-4321"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">E-mail</label>
            <Input
              type="email"
              placeholder="cliente@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Observações</label>
            <Input
              placeholder="Ex: Preferência por entregas no período da tarde"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => {
                setIsModalOpen(false)
                setEditingCustomer(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              Salvar Cliente
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => {
          if (deletingCustomer) {
            deleteMutation.mutate(deletingCustomer.id)
            setDeletingCustomer(null)
          }
        }}
        title="Desativar Cliente"
        description={`Tem certeza que deseja desativar o cliente "${deletingCustomer?.name}"? O histórico de compras e saldo permanecerão preservados.`}
        confirmText="Sim, Desativar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
