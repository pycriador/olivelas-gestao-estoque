import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supplierService } from '@/services/supplierService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { parseApiError } from '@/utils/errorHandler'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Truck, Plus, Search, Download, Trash2, Edit2, Phone, Mail } from 'lucide-react'
import type { Supplier } from '@/types/supplier.types'

export function SuppliersPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState('')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null)
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

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', storeId, search],
    queryFn: () => supplierService.listSuppliers(storeId, search),
    enabled: Boolean(hasActiveStore),
  })

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
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t.nav.suppliers}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Cadastro de distribuidores, indústrias e fornecedores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={suppliers.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Novo Fornecedor
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Truck className="h-10 w-10 text-primary" />}
                title="Nenhum fornecedor cadastrado"
                description="Cadastre fornecedores para registrar ordens de compra e dar entrada no estoque com conferência de lote e validade."
                actionLabel="Cadastrar Fornecedor"
                onAction={() => {
                  resetForm()
                  setIsModalOpen(true)
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">CNPJ</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4">Contatos</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {s.corporate_name}
                        {s.trade_name && (
                          <span className="block text-[11px] text-muted-foreground font-normal">
                            {s.trade_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{s.document || '-'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{s.contact_name || '-'}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <div className="space-y-0.5">
                          {s.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {s.phone}
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {s.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={s.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {s.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja desativar o fornecedor "${s.corporate_name}"?`)) {
                                deleteMutation.mutate(s.id)
                              }
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-danger/15 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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
    </div>
  )
}
