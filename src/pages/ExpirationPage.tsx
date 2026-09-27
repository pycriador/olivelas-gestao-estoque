import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import type { ExpirationAction } from '@/services/inventoryService'
import { EXPIRATION_ACTIONS } from '@/services/inventoryService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDate } from '@/utils/dates'
import { exportToCSV } from '@/utils/export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import type { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import {
  Clock,
  AlertTriangle,
  PackageX,
  CheckCircle,
  Download,
  Search,
  RotateCcw
} from 'lucide-react'

/** Rotulo curto da acao registrada, usado no badge e no export. */
function dispositionLabel(action: string): string {
  return EXPIRATION_ACTIONS.find((a) => a.value === action)?.label || ''
}

export function ExpirationPage() {
  const { storeId, hasActiveStore } = useTenant()
  const queryClient = useQueryClient()

  // Sincronização de paginação e filtros via URL
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
    defaultPage: 1,
    defaultPageSize: 10,
    defaultSortBy: 'expiration_date',
    defaultSortOrder: 'asc',
    defaultFilters: {
      status: 'ALL',
    },
  })

  const filterStatus = filters.status || 'ALL'

  // Query batches with server-side pagination & summary
  const { data: batchesResult, isLoading } = useQuery({
    queryKey: ['stock-batches', storeId, page, pageSize, search, filterStatus, sortBy, sortOrder],
    queryFn: () =>
      inventoryService.getBatches(storeId, {
        page,
        pageSize,
        search: search || undefined,
        status: filterStatus,
        sortBy,
        sortOrder,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const batches = batchesResult?.data || []
  const totalBatches = batchesResult?.total || 0
  const totalBatchesPages = Math.ceil(totalBatches / pageSize) || 1
  const summary = batchesResult?.summary || {
    total: 0,
    expired: 0,
    critical7d: 0,
    warning30d: 0,
    normal: 0,
  }

  const [writeoffBatch, setWriteoffBatch] = React.useState<any | null>(null)

  // Disposicao mais recente por lote (badge "Justificado" + reuso no export)
  const { data: dispositions = {} } = useQuery({
    queryKey: ['batch-dispositions', storeId],
    queryFn: () => inventoryService.getBatchDispositions(storeId),
    enabled: hasActiveStore,
    staleTime: 30_000,
  })

  // Modal de justificativa: guarda o alvo e a acao pré-escolhida
  const [dispositionDraft, setDispositionDraft] = React.useState<{
    batch: any
    action: ExpirationAction
  } | null>(null)
  const [dispositionNote, setDispositionNote] = React.useState('')
  const [dispositionError, setDispositionError] = React.useState('')

  const dispositionMutation = useMutation({
    mutationFn: (vars: { batch: any; action: ExpirationAction; note: string }) =>
      inventoryService.setBatchDisposition({
        batchId: vars.batch.id,
        action: vars.action,
        note: vars.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-dispositions', storeId] })
      setDispositionDraft(null)
      setDispositionNote('')
      setDispositionError('')
    },
    onError: (err: any) => {
      setDispositionError(err?.message || 'Não foi possível registrar a justificativa.')
    },
  })

  const openDisposition = (batch: any, action: ExpirationAction) => {
    setDispositionError('')
    setDispositionNote('')
    setDispositionDraft({ batch, action })
  }

  // Acoes do dropdown "Acao": a linha ja justificada oferece primeiro
  // "Trocar justificativa" e "Remover justificativa".
  const dispositionMenuItems = React.useCallback(
    (batch: any): DropdownMenuItem[] => {
      const current = dispositions[batch.id]
      const base: DropdownMenuItem[] = EXPIRATION_ACTIONS.map((action) => ({
        key: action.value,
        label: current?.action === action.value ? `${action.label} (atual)` : action.label,
        disabled: current?.action === action.value,
        onSelect: () => openDisposition(batch, action.value),
      }))

      if (!current) return base

      return [
        ...base,
        {
          key: '__clear',
          label: 'Remover justificativa',
          variant: 'danger',
          onSelect: () => openDisposition(batch, 'KEPT'),
        },
      ]
    },
    [dispositions]
  )

  // Writeoff expired batch mutation
  const writeoffMutation = useMutation({
    mutationFn: (batch: any) =>
      inventoryService.createManualMovement({
        storeId,
        productId: batch.product_id,
        movementType: 'EXPIRATION',
        quantity: batch.quantity,
        batchId: batch.id,
        notes: `Baixa por vencimento do lote ${batch.lot_number}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
    },
  })

  const handleExportCSV = async () => {
    try {
      const res = await inventoryService.getBatches(storeId, { pageSize: 1000 })
      if (!res.data || res.data.length === 0) return
      exportToCSV(
        'lotes_e_validades',
        res.data,
        [
          { header: 'Produto', key: (r) => r.product_name || '-' },
          { header: 'Nº Lote', key: 'lot_number' },
          { header: 'Quantidade', key: 'quantity' },
          { header: 'Data de Fabricação', key: (r) => formatDate(r.manufacturing_date) },
          { header: 'Data de Validade', key: (r) => formatDate(r.expiration_date) },
          { header: 'Status de Validade', key: (r) => r.expirationInfo?.status || '-' },
          {
            header: 'Justificativa',
            key: (r) => dispositionLabel(dispositions[r.id]?.action || ''),
          },
          { header: 'Observação', key: (r) => dispositions[r.id]?.note || '-' },
        ]
      )
    } catch (e) {
      console.error('Export error:', e)
    }
  }

  return (
    <div className="h-full flex flex-col space-y-2.5 animate-in fade-in duration-150 min-h-0">
      {/* Top Navbar Title & Search */}
      <PageHeader title="Lotes & Validades">
        <Input
          placeholder="Buscar lote ou produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Count & Export) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalBatches} {totalBatches === 1 ? 'lote' : 'lotes'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={totalBatches === 0}
            className="h-8 text-xs px-2.5"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      {/* Ultra-compact Interactive KPI Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
        <button
          onClick={() => {
            setFilter('status', filterStatus === 'EXPIRED' ? 'ALL' : 'EXPIRED')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === 'EXPIRED'
              ? 'border-danger bg-danger/10 text-danger ring-1 ring-danger'
              : 'border-border bg-card hover:border-danger/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <PackageX className="h-3.5 w-3.5 text-danger" />
            <span className="text-xs font-semibold">Vencidos</span>
          </div>
          <span className="text-xs font-bold font-mono text-danger">{summary.expired}</span>
        </button>

        <button
          onClick={() => {
            setFilter('status', filterStatus === '7D' ? 'ALL' : '7D')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === '7D'
              ? 'border-orange-500 bg-orange-500/10 text-orange-500 ring-1 ring-orange-500'
              : 'border-border bg-card hover:border-orange-500/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-semibold">&le; 7 Dias</span>
          </div>
          <span className="text-xs font-bold font-mono text-orange-500">{summary.critical7d}</span>
        </button>

        <button
          onClick={() => {
            setFilter('status', filterStatus === '30D' ? 'ALL' : '30D')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === '30D'
              ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500'
              : 'border-border bg-card hover:border-amber-500/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold">&le; 30 Dias</span>
          </div>
          <span className="text-xs font-bold font-mono text-amber-500">{summary.warning30d}</span>
        </button>

        <button
          onClick={() => {
            setFilter('status', filterStatus === 'NORMAL' ? 'ALL' : 'NORMAL')
            setPage(1)
          }}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-all ${
            filterStatus === 'NORMAL'
              ? 'border-success bg-success/10 text-success ring-1 ring-success'
              : 'border-border bg-card hover:border-success/40 text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-semibold">No Prazo</span>
          </div>
          <span className="text-xs font-bold font-mono text-success">{summary.normal}</span>
        </button>
      </div>

      {/* Batches Table Card */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-sm bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : batches.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
              <PackageX className="h-8 w-8 text-muted-foreground/50 mb-2" />
              Nenhum lote encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <ResponsiveTable className="w-full text-xs text-left">
                <thead className="border-b border-border bg-card/95 backdrop-blur text-muted-foreground font-semibold uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Produto</th>
                    <SortableHeader
                      column="lot_number"
                      label="Nº Lote"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="quantity"
                      label="Quantidade"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                      align="center"
                    />
                    <SortableHeader
                      column="manufacturing_date"
                      label="Fabricação"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="expiration_date"
                      label="Validade"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-3 px-4 text-center">Situação</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {batches.map((batch) => {
                    const status = batch.expirationInfo?.status
                    const disposition = dispositions[batch.id]
                    return (
                      <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {batch.product_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {batch.lot_number}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {batch.quantity}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(batch.manufacturing_date)}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {formatDate(batch.expiration_date)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {disposition && (
                            <Badge
                              variant="success"
                              className="gap-1"
                              title={
                                disposition.note ||
                                `Justificado por ${
                                  dispositionLabel(disposition.action) || disposition.action
                                }`
                              }
                            >
                              <CheckCircle className="h-3 w-3" />
                              {dispositionLabel(disposition.action) || 'JUSTIFICADO'}
                            </Badge>
                          )}
                          {!disposition && status === 'expired' && (
                            <Badge variant="destructive" className="gap-1">
                              <PackageX className="h-3 w-3" /> VENCIDO
                            </Badge>
                          )}
                          {!disposition && status === 'critical_7_days' && (
                            <Badge variant="warning" className="gap-1 text-orange-500">
                              <AlertTriangle className="h-3 w-3" /> &le; 7 DIAS
                            </Badge>
                          )}
                          {!disposition && status === 'warning_30_days' && (
                            <Badge variant="warning" className="gap-1">
                              <Clock className="h-3 w-3" /> &le; 30 DIAS
                            </Badge>
                          )}
                          {!disposition && status === 'normal' && (
                            <Badge variant="success">OK</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {status === 'expired' && batch.quantity > 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="text-[11px] h-7 px-2"
                                onClick={() => setWriteoffBatch(batch)}
                              >
                                Dar Baixa
                              </Button>
                            )}
                            <DropdownMenu
                              triggerLabel="Ação"
                              items={dispositionMenuItems(batch)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </ResponsiveTable>
            </div>
          )}
        </CardContent>

        {/* Pin Pagination at the bottom of the card */}
        <div className="p-3 border-t border-border bg-surface flex-shrink-0">
          <Pagination
            currentPage={page}
            totalPages={totalBatchesPages}
            totalItems={totalBatches}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>

      {/* Confirm Writeoff Modal */}
      <ConfirmModal
        isOpen={Boolean(writeoffBatch)}
        onClose={() => setWriteoffBatch(null)}
        onConfirm={() => {
          if (writeoffBatch) {
            writeoffMutation.mutate(writeoffBatch)
            setWriteoffBatch(null)
          }
        }}
        title="Confirmar Baixa por Vencimento"
        description={`Deseja registrar o descarte/baixa por validade do lote "${writeoffBatch?.lot_number}" (${writeoffBatch?.quantity} unidades de "${writeoffBatch?.products?.name}")? O saldo será deduzido do estoque e registrado no histórico.`}
        confirmText="Sim, Dar Baixa"
        cancelText="Cancelar"
        variant="danger"
        isLoading={writeoffMutation.isPending}
      />

      {/* Justificativa do alerta de validade */}
      <Modal
        isOpen={Boolean(dispositionDraft)}
        onClose={() => setDispositionDraft(null)}
        title="Justificar alerta de validade"
        description={`Lote ${dispositionDraft?.batch?.lot_number || ''} — ${
          dispositionDraft?.batch?.products?.name || ''
        }`}
      >
        <div className="space-y-3 pt-1 text-xs">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <div className="text-[11px] text-muted-foreground">Ação registrada</div>
            <div className="mt-0.5 font-semibold text-foreground">
              {dispositionLabel(dispositionDraft?.action || '')}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="expiration-note">
              Observação (opcional)
            </label>
            <textarea
              id="expiration-note"
              rows={3}
              value={dispositionNote}
              onChange={(e) => setDispositionNote(e.target.value)}
              placeholder="Ex.: nota fiscal 1234, lote substituído pelo lote 8891..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          {dispositionError && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[11px] text-danger">
              {dispositionError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDispositionDraft(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dispositionDraft || dispositionMutation.isPending}
              onClick={() => {
                if (!dispositionDraft) return
                dispositionMutation.mutate({
                  batch: dispositionDraft.batch,
                  action: dispositionDraft.action,
                  note: dispositionNote,
                })
              }}
            >
              {dispositionMutation.isPending ? 'Salvando...' : 'Salvar justificativa'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
