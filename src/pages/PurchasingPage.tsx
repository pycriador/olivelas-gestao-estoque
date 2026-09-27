import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasingService } from '@/services/purchasingService'
import { supplierService } from '@/services/supplierService'
import { productService } from '@/services/productService'
import { useTenant } from '@/hooks/useTenant'
import { useI18n } from '@/hooks/useI18n'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import {
  FileText,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Eye,
} from 'lucide-react'
import type { PurchaseOrder } from '@/types/purchasing.types'

export function PurchasingPage() {
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
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
  })

  const selectedSupplier = filters.supplier || 'ALL'
  const selectedStatus = filters.status || 'ALL'

  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false)
  const [receivingPO, setReceivingPO] = React.useState<PurchaseOrder | null>(null)
  const [viewingPO, setViewingPO] = React.useState<PurchaseOrder | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Form states for new purchase order
  const [supplierId, setSupplierId] = React.useState('')
  const [shippingCost, setShippingCost] = React.useState(0)
  const [notes, setNotes] = React.useState('')
  const [items, setItems] = React.useState<
    { productId: string; quantityOrdered: number; unitCost: number; lotNumber?: string; expirationDate?: string }[]
  >([{ productId: '', quantityOrdered: 1, unitCost: 0 }])

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', storeId, { search, selectedSupplier, selectedStatus, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      purchasingService.listPurchaseOrders(storeId, {
        search: search || undefined,
        supplierId: selectedSupplier !== 'ALL' ? selectedSupplier : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const purchaseOrders = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const {
    data: suppliersData,
    isLoading: loadingSuppliers,
    isError: suppliersError,
    error: suppliersErrorObj,
  } = useQuery({
    // Chave com o mesmo prefixo de /suppliers de proposito: a invalidacao
    // `['suppliers', storeId]` feita la cascata para ca. A chave antiga
    // ('suppliers-select') nunca era invalidada, entao um resultado vazio
    // antigo ficava em cache para sempre (refetchOnMount e global false).
    queryKey: ['suppliers', storeId, { all: true }],
    queryFn: () => supplierService.listSuppliers(storeId, { pageSize: 200 }),
    enabled: Boolean(hasActiveStore),
    staleTime: 0,
    refetchOnMount: true,
  })

  const suppliers = Array.isArray(suppliersData) ? suppliersData : suppliersData?.data || []
  const suppliersErrorMsg = suppliersError ? parseApiError(suppliersErrorObj) : null

  const { data: productsData } = useQuery({
    queryKey: ['products-select', storeId],
    queryFn: () => productService.listProducts(storeId, { pageSize: 100 }),
    enabled: Boolean(hasActiveStore),
    staleTime: 0,
    refetchOnMount: true,
  })

  const productList = productsData?.data || []

  // Create PO Mutation
  const createMutation = useMutation({
    mutationFn: () =>
      purchasingService.createPurchaseOrder({
        storeId,
        supplierId,
        items,
        shippingCost,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
      setIsNewModalOpen(false)
      resetForm()
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  // Receive Stock Mutation
  const receiveMutation = useMutation({
    mutationFn: (poId: string) => purchasingService.receivePurchaseOrder(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setReceivingPO(null)
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const resetForm = () => {
    setSupplierId('')
    setShippingCost(0)
    setNotes('')
    setItems([{ productId: '', quantityOrdered: 1, unitCost: 0 }])
    setErrorMsg(null)
  }

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantityOrdered: 1, unitCost: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'productId') {
      const p = productList.find((x) => x.id === value)
      if (p) {
        updated[index].unitCost = Number(p.cost_price)
      }
    }
    setItems(updated)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Ordens de Compra">
        <Input
          placeholder="Buscar compras, fornecedor..."
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
            {totalItems} {totalItems === 1 ? 'ordem' : 'ordens'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select
            value={selectedSupplier}
            onChange={(e) => setFilter('supplier', e.target.value)}
            aria-label="Filtrar por fornecedor"
            disabled={loadingSuppliers}
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50"
          >
            <option value="ALL">Todos Fornecedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.trade_name || s.corporate_name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="Filtrar por status"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todos Status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="ISSUED">Emitido</option>
            <option value="PARTIALLY_RECEIVED">Parcialmente Recebido</option>
            <option value="RECEIVED">Recebido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          <Button onClick={() => setIsNewModalOpen(true)} className="h-8 text-xs px-2.5 shadow-xs font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Ordem
          </Button>
        </div>
      </div>

      {suppliersErrorMsg && (
        <div className="flex-shrink-0 p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
          Não foi possível carregar os fornecedores: {suppliersErrorMsg}
        </div>
      )}

      {/* Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-12" />
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<FileText className="h-10 w-10 text-primary" />}
                title="Nenhuma ordem de compra cadastrada"
                description="Emita pedidos para seus fornecedores para repor o estoque e atualizar custos automaticamente no recebimento."
                actionLabel="Emitir Ordem de Compra"
                onAction={() => setIsNewModalOpen(true)}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="order_number"
                      label="Ordem #"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Itens</th>
                    <SortableHeader
                      column="created_at"
                      label="Data de Emissão"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="total_amount"
                      label="Valor Total"
                      align="right"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                        {po.order_number}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-foreground">
                        {po.supplier_name}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {po.items?.length || 0} produtos
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatDate(po.issued_at || po.created_at)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant={po.status === 'RECEIVED' ? 'success' : 'default'}>
                          {po.status === 'RECEIVED' ? 'RECEBIDA & ESTOCADA' : po.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <DropdownMenu
                          triggerLabel="Ações"
                          items={[
                            {
                              key: 'details',
                              label: 'Ver detalhes',
                              icon: <Eye className="h-3.5 w-3.5 shrink-0" />,
                              onSelect: () => setViewingPO(po),
                            },
                            ...(po.status === 'ISSUED'
                              ? [{
                                  key: 'receive',
                                  label: 'Receber Mercadoria',
                                  icon: <PackageCheck className="h-3.5 w-3.5 shrink-0" />,
                                  onSelect: () => setReceivingPO(po),
                                }]
                              : []),
                          ]}
                        />
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

      <Modal
        isOpen={Boolean(viewingPO)}
        onClose={() => setViewingPO(null)}
        title={viewingPO ? `Ordem ${viewingPO.order_number}` : 'Detalhes da Ordem'}
        description={viewingPO?.supplier_name}
        maxWidth="lg"
      >
        {viewingPO && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Emitida em</div>
                <div className="mt-1 font-medium text-foreground">
                  {formatDate(viewingPO.issued_at || viewingPO.created_at)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Status</div>
                <div className="mt-1">
                  <Badge variant={viewingPO.status === 'RECEIVED' ? 'success' : 'default'}>
                    {viewingPO.status === 'RECEIVED' ? 'RECEBIDA & ESTOCADA' : viewingPO.status}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Total</div>
                <div className="mt-1 font-mono font-bold text-foreground">
                  {formatCurrency(viewingPO.total_amount)}
                </div>
              </div>
              {viewingPO.notes && (
                <div className="col-span-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Observações</div>
                  <div className="mt-1 text-foreground">{viewingPO.notes}</div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
              {viewingPO.items?.map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{item.product_name}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {item.quantity_received} / {item.quantity_ordered} recebidos
                      {item.lot_number ? ` · Lote ${item.lot_number}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-foreground">
                      {formatCurrency(item.total_cost)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatCurrency(item.unit_cost)} / unidade
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setViewingPO(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Purchase Order Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Nova Ordem de Compra"
        description="Selecione o fornecedor, produtos, quantidades e lotes para emissão"
        maxWidth="3xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="space-y-4 pt-1 text-xs"
        >
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Fornecedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={loadingSuppliers}
            >
              <option value="">
                {loadingSuppliers
                  ? 'Carregando fornecedores...'
                  : suppliers.length === 0
                    ? 'Nenhum fornecedor cadastrado'
                    : 'Selecione um fornecedor...'}
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.trade_name || s.corporate_name}
                </option>
              ))}
            </select>
            {!loadingSuppliers && !suppliersErrorMsg && suppliers.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Cadastre o fornecedor em{' '}
                <a
                  href="/suppliers"
                  className="text-primary hover:underline font-medium"
                >
                  Fornecedores
                </a>{' '}
                para emitir uma ordem de compra.
              </p>
            )}
            {suppliersErrorMsg && (
              <p className="text-[11px] text-danger">Falha ao carregar: {suppliersErrorMsg}</p>
            )}
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-[11px] text-muted-foreground">
                Itens a Comprar ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-primary hover:underline text-xs font-semibold px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
              >
                + Adicionar Item
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border bg-surface-elevated space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Produto *</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        required
                      >
                        <option value="">Selecione...</option>
                        {productList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:contents gap-2">
                      <div className="sm:col-span-3">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Qtd *</label>
                        <Input
                          type="number"
                          min="1"
                          className="h-9"
                          value={item.quantityOrdered}
                          onChange={(e) =>
                            handleItemChange(idx, 'quantityOrdered', parseFloat(e.target.value) || 1)
                          }
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Custo Unit (R$) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-9"
                          value={item.unitCost}
                          onChange={(e) =>
                            handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-border/50 items-center">
                    <div className="sm:col-span-6">
                      <Input
                        placeholder="Nº Lote (Ex: LT-2026-A)"
                        className="h-8 text-[11px]"
                        value={item.lotNumber || ''}
                        onChange={(e) => handleItemChange(idx, 'lotNumber', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-6">
                      <Input
                        type="date"
                        className="h-8 text-[11px] flex-1"
                        value={item.expirationDate || ''}
                        onChange={(e) => handleItemChange(idx, 'expirationDate', e.target.value)}
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-danger hover:bg-danger/10 p-2 rounded-lg text-xs font-semibold shrink-0 transition-colors"
                          title="Remover item"
                        >
                          ✕ Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto h-11 sm:h-10"
              onClick={() => setIsNewModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              isLoading={createMutation.isPending}
            >
              Emitir Ordem de Compra
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receive Stock Confirmation Modal */}
      <Modal
        isOpen={Boolean(receivingPO)}
        onClose={() => setReceivingPO(null)}
        title="Receber Mercadorias & Entrar no Estoque"
        description="Esta ação atualizará os saldos em estoque, gerará os lotes e registrará os movimentos de entrada"
        maxWidth="lg"
      >
        {receivingPO && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1 border border-border/50">
              <div className="flex justify-between font-bold text-sm text-foreground">
                <span>Ordem: {receivingPO.order_number}</span>
                <span className="text-primary font-mono">{formatCurrency(receivingPO.total_amount)}</span>
              </div>
              <div className="text-muted-foreground">Fornecedor: {receivingPO.supplier_name}</div>
            </div>

            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
              {receivingPO.items?.map((it) => (
                <div key={it.id} className="p-3 flex justify-between items-center bg-surface">
                  <div>
                    <div className="font-semibold text-foreground text-sm">{it.product_name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Qtd: <b>{it.quantity_ordered}</b> | Lote: {it.lot_number || 'Sem lote'}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-foreground">
                    {formatCurrency(it.total_cost)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 sm:h-10"
                onClick={() => setReceivingPO(null)}
              >
                Voltar
              </Button>
              <Button
                variant="default"
                className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
                isLoading={receiveMutation.isPending}
                onClick={() => receiveMutation.mutate(receivingPO.id)}
              >
                Confirmar Recebimento
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
