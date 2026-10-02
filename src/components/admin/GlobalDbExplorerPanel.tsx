import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { dbManagerService, MANAGED_TABLES } from '@/services/dbManagerService'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Database,
  Search,
  Plus,
  Edit2,
  Trash2,
  Table as TableIcon,
  RefreshCw,
  Eye,
} from 'lucide-react'
import type { Store } from '@/types/store.types'

interface GlobalDbExplorerPanelProps {
  stores: Store[]
}

export function GlobalDbExplorerPanel({ stores }: GlobalDbExplorerPanelProps) {
  const queryClient = useQueryClient()
  const [selectedTable, setSelectedTable] = React.useState<string>('stores')
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('all')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(15)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [editingRow, setEditingRow] = React.useState<Record<string, any> | null>(null)
  const [deletingRow, setDeletingRow] = React.useState<Record<string, any> | null>(null)
  const [rawJsonModalRow, setRawJsonModalRow] = React.useState<Record<string, any> | null>(null)

  const [rowFormData, setRowFormData] = React.useState<Record<string, any>>({})
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const currentTableMeta = MANAGED_TABLES.find((t) => t.tableName === selectedTable) || MANAGED_TABLES[0]

  // Reset pagination on table/filter change
  const handleTableChange = (tbl: string) => {
    setSelectedTable(tbl)
    setPage(1)
    setSearch('')
  }

  // Fetch Table Data Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['db-explorer-rows', selectedTable, selectedStoreId, page, pageSize, search],
    queryFn: () =>
      dbManagerService.fetchTableRows(selectedTable, {
        storeId: selectedStoreId,
        page,
        pageSize,
        sortBy: currentTableMeta.primaryKey,
        sortOrder: 'desc',
      }),
  })

  const rows = data?.data || []
  const columns = data?.columns || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  // Filter client-side if search is typed
  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    )
  }, [rows, search])

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => dbManagerService.insertRow(selectedTable, payload),
    onSuccess: () => {
      toast.success(`Registro criado com sucesso na tabela ${selectedTable}!`)
      setIsCreateModalOpen(false)
      setRowFormData({})
      queryClient.invalidateQueries({ queryKey: ['db-explorer-rows', selectedTable] })
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, any> }) =>
      dbManagerService.updateRow(selectedTable, currentTableMeta.primaryKey, id, updates),
    onSuccess: () => {
      toast.success(`Registro atualizado na tabela ${selectedTable}!`)
      setEditingRow(null)
      setRowFormData({})
      queryClient.invalidateQueries({ queryKey: ['db-explorer-rows', selectedTable] })
    },
    onError: (err) => setErrorMsg(parseApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      dbManagerService.deleteRow(selectedTable, currentTableMeta.primaryKey, id),
    onSuccess: () => {
      toast.success(`Registro excluído com sucesso da tabela ${selectedTable}!`)
      setDeletingRow(null)
      queryClient.invalidateQueries({ queryKey: ['db-explorer-rows', selectedTable] })
    },
    onError: (err) => toast.error(parseApiError(err)),
  })

  const handleOpenCreate = () => {
    setErrorMsg(null)
    const initial: Record<string, any> = {}
    if (currentTableMeta.supportsStoreFilter && selectedStoreId !== 'all') {
      initial.store_id = selectedStoreId
    }
    setRowFormData(initial)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (row: Record<string, any>) => {
    setErrorMsg(null)
    setEditingRow(row)
    setRowFormData({ ...row })
  }

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRow) {
      const id = editingRow[currentTableMeta.primaryKey]
      updateMutation.mutate({ id, updates: rowFormData })
    } else {
      createMutation.mutate(rowFormData)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3 animate-in fade-in duration-150">
      {/* Table Selector & Top Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-card rounded-2xl border border-border flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <TableIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Tabela:</span>
          </div>

          <select
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            aria-label="Selecionar tabela do banco"
            className="h-8 px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {MANAGED_TABLES.map((t) => (
              <option key={t.tableName} value={t.tableName}>
                {t.displayName}
              </option>
            ))}
          </select>

          {currentTableMeta.supportsStoreFilter && (
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                setPage(1)
              }}
              aria-label="Filtrar por loja"
              className="h-8 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="all">Todas as Lojas</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  Loja: {s.name}
                </option>
              ))}
            </select>
          )}

          <Badge variant="outline" className="text-[11px] font-mono">
            {totalItems} linha(s)
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Pesquisar registros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs w-full lg:w-48"
            icon={<Search className="h-3.5 w-3.5" />}
          />
          <Button size="sm" onClick={() => refetch()} variant="outline" className="h-8 text-xs px-2.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={handleOpenCreate} className="h-8 text-xs font-semibold px-2.5">
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Registro
          </Button>
        </div>
      </div>

      {/* Main Table Card with Scrollable Viewport */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={8} />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={<Database className="h-10 w-10 text-muted-foreground" />}
                title={`Nenhum registro em public.${selectedTable}`}
                description="Adicione o primeiro registro ou modifique os filtros de loja selecionados."
                actionLabel="Inserir Registro"
                onAction={handleOpenCreate}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">Ações</th>
                    {columns.slice(0, 8).map((col) => (
                      <th key={col} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((row, idx) => {
                    const rowId = String(row[currentTableMeta.primaryKey] || idx)
                    return (
                      <tr key={rowId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            title="Ver JSON completo"
                            onClick={() => setRawJsonModalRow(row)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Editar Registro"
                            onClick={() => handleOpenEdit(row)}
                            className="p-1 text-primary hover:bg-primary/10 rounded"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Excluir Registro"
                            onClick={() => setDeletingRow(row)}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>

                        {columns.slice(0, 8).map((col) => {
                          const val = row[col]
                          let rendered = String(val ?? '')
                          if (typeof val === 'boolean') rendered = val ? 'true' : 'false'
                          else if (typeof val === 'object' && val !== null) rendered = JSON.stringify(val)

                          return (
                            <td key={col} className="py-2 px-3 whitespace-nowrap max-w-xs truncate text-[11px]">
                              {rendered.length > 35 ? `${rendered.slice(0, 35)}...` : rendered || <span className="text-muted-foreground italic">null</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pinned Pagination */}
        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(val) => {
              setPageSize(val)
              setPage(1)
            }}
          />
        </div>
      </Card>

      {/* Create / Edit Row Modal */}
      <Modal
        isOpen={isCreateModalOpen || Boolean(editingRow)}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingRow(null)
        }}
        title={editingRow ? `Editar Linha (public.${selectedTable})` : `Inserir Linha em public.${selectedTable}`}
        description="Preencha ou atualize os campos da tabela conforme os tipos de dados aceitos"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveForm} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Payload do Registro (JSON Estruturado):</label>
            <textarea
              rows={12}
              value={JSON.stringify(rowFormData, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setRowFormData(parsed)
                  setErrorMsg(null)
                } catch {
                  // Keep typing while raw invalid JSON
                }
              }}
              className="w-full p-3 rounded-xl border border-input bg-background font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Edite diretamente o objeto JSON com os valores dos campos da tabela.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false)
                setEditingRow(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              Salvar no Banco
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Raw JSON Modal */}
      <Modal
        isOpen={Boolean(rawJsonModalRow)}
        onClose={() => setRawJsonModalRow(null)}
        title="Visualização Completa do Registro"
        description={`Registro da tabela public.${selectedTable}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 pt-1">
          <div className="p-4 bg-muted/60 rounded-xl border border-border max-h-[60vh] overflow-y-auto">
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
              {JSON.stringify(rawJsonModalRow, null, 2)}
            </pre>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setRawJsonModalRow(null)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingRow)}
        onClose={() => setDeletingRow(null)}
        onConfirm={() => {
          if (deletingRow) {
            deleteMutation.mutate(String(deletingRow[currentTableMeta.primaryKey]))
          }
        }}
        title="Excluir Registro da Base"
        description={`Tem certeza que deseja deletar este registro (${currentTableMeta.primaryKey}: ${deletingRow?.[currentTableMeta.primaryKey]}) da tabela ${selectedTable}? Esta ação é permanente.`}
        confirmText="Sim, Deletar Linha"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
