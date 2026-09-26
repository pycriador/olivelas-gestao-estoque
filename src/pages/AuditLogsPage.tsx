import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditService, type AuditLog } from '@/services/auditService'
import { storeService } from '@/services/storeService'
import { useTenant } from '@/hooks/useTenant'
import { useAuth } from '@/hooks/useAuth'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDateTime } from '@/utils/dates'
import { exportToCSV, exportToJSON } from '@/utils/export'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { PageHeader } from '@/components/common/PageHeader'
import { Shield, Eye, Search, Store as StoreIcon, User, Globe, Laptop, FileDown, Braces, X } from 'lucide-react'

export function AuditLogsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const { isGlobalAdmin } = useAuth()

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
    defaultFilters: {
      entity: 'ALL',
      selectedStoreId: isGlobalAdmin ? 'ALL' : storeId || 'ALL',
      dateFrom: '',
      dateTo: '',
    },
  })

  const selectedEntity = filters.entity || 'ALL'
  const dateFrom = filters.dateFrom || ''
  const dateTo = filters.dateTo || ''
  const filterStoreId = filters.selectedStoreId || (isGlobalAdmin ? 'ALL' : storeId)
  const [inspectLog, setInspectLog] = React.useState<AuditLog | null>(null)

  // Fetch all stores if global admin
  const { data: allStores = [] } = useQuery({
    queryKey: ['all-stores-audit-filter'],
    queryFn: () => storeService.listAllStores(),
    enabled: Boolean(isGlobalAdmin),
  })

  const effectiveStoreId = isGlobalAdmin
    ? filterStoreId === 'ALL'
      ? undefined
      : filterStoreId
    : storeId

  const { data, isLoading } = useQuery({
    queryKey: [
      'audit-logs',
      effectiveStoreId,
      { search, selectedEntity, dateFrom, dateTo, page, pageSize, sortBy, sortOrder },
    ],
    queryFn: () =>
      auditService.listAuditLogs(effectiveStoreId, {
        search: search || undefined,
        entity: selectedEntity !== 'ALL' ? selectedEntity : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: Boolean(isGlobalAdmin || hasActiveStore),
  })

  const logs = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  // Exporta o periodo inteiro, nao so a pagina visivel. Os mesmos filtros
  // da tela sao reaplicados na consulta de exportacao.
  const [isExporting, setIsExporting] = React.useState(false)
  const [exportError, setExportError] = React.useState('')

  const auditExportColumns = [
    { header: 'Data/Hora', key: (r: AuditLog) => formatDateTime(r.created_at) },
    { header: 'Loja', key: (r: AuditLog) => r.store_name || '-' },
    { header: 'Usuário', key: (r: AuditLog) => r.user_name || r.user_email || 'Sistema' },
    { header: 'Ação', key: (r: AuditLog) => r.action },
    { header: 'Entidade', key: (r: AuditLog) => r.entity },
    { header: 'ID da Entidade', key: (r: AuditLog) => r.entity_id || '-' },
    {
      header: 'Antes',
      key: (r: AuditLog) => (r.before_data ? JSON.stringify(r.before_data) : ''),
    },
    {
      header: 'Depois',
      key: (r: AuditLog) => (r.after_data ? JSON.stringify(r.after_data) : ''),
    },
  ]

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true)
    setExportError('')
    try {
      const res = await auditService.listAuditLogs(effectiveStoreId, {
        search: search || undefined,
        entity: selectedEntity !== 'ALL' ? selectedEntity : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: 'created_at',
        sortOrder: 'desc',
        page: 1,
        pageSize: 10000,
      })
      if (format === 'csv') {
        exportToCSV('auditoria', res.data, auditExportColumns)
      } else {
        exportToJSON('auditoria', res.data, auditExportColumns)
      }
    } catch (e: any) {
      setExportError(e?.message || 'Não foi possível exportar os logs.')
    } finally {
      setIsExporting(false)
    }
  }

  const hasDateFilter = Boolean(dateFrom || dateTo)

  const clearDateFilter = () => {
    setFilter('dateFrom', '')
    setFilter('dateTo', '')
    setPage(1)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 animate-in fade-in duration-150">
      {/* Top Navbar Title & Search */}
      <PageHeader
        title="Logs de Auditoria"
        badge={
          <Shield className="h-3.5 w-3.5 text-primary" />
        }
      >
        <Input
          placeholder="Buscar por ação, entidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-background/90"
          icon={<Search className="h-3.5 w-3.5" />}
        />
      </PageHeader>

      {/* Page Toolbar (Count, Store selector & Entity filter) */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5">
            {totalItems} {totalItems === 1 ? 'evento' : 'eventos'}
          </Badge>
          {exportError && (
            <span className="text-[11px] text-danger">{exportError}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Periodo */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="audit-date-from" className="sr-only">
              Data inicial
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setFilter('dateFrom', e.target.value)
                setPage(1)
              }}
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-[11px] text-muted-foreground">até</span>
            <label htmlFor="audit-date-to" className="sr-only">
              Data final
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setFilter('dateTo', e.target.value)
                setPage(1)
              }}
              className="h-8 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {hasDateFilter && (
              <button
                type="button"
                onClick={clearDateFilter}
                title="Limpar período"
                className="inline-flex items-center h-8 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Export */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[11px] px-2.5"
            disabled={isExporting || totalItems === 0}
            onClick={() => handleExport('csv')}
          >
            <FileDown className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[11px] px-2.5"
            disabled={isExporting || totalItems === 0}
            onClick={() => handleExport('json')}
          >
            <Braces className="h-3.5 w-3.5" />
            JSON
          </Button>
          {/* Global Admin Store Selector */}
          {isGlobalAdmin && (
            <div className="flex items-center gap-1.5">
              <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterStoreId}
                onChange={(e) => {
                  setFilter('selectedStoreId', e.target.value)
                  setPage(1)
                }}
                aria-label="Filtrar por loja"
                className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">🌐 Todas as Lojas (Global)</option>
                {allStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏪 {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            value={selectedEntity}
            onChange={(e) => setFilter('entity', e.target.value)}
            aria-label="Filtrar por entidade"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="ALL">Todas Entidades</option>
            <option value="products">Produtos</option>
            <option value="orders">Pedidos / Vendas</option>
            <option value="purchase_orders">Compras</option>
            <option value="stock_movements">Estoque / Movimentos</option>
            <option value="customers">Clientes</option>
            <option value="suppliers">Fornecedores</option>
            <option value="stores">Lojas</option>
            <option value="auth">Autenticação</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
              Carregando registros de auditoria...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
              <Shield className="h-8 w-8 text-muted-foreground/40 mb-2" />
              Nenhum evento registrado com os filtros informados.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="created_at"
                      label="Data / Hora"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    {isGlobalAdmin && <th className="py-2.5 px-3">Loja</th>}
                    <SortableHeader
                      column="action"
                      label="Ação Registrada"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="entity"
                      label="Entidade"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">ID do Recurso</th>
                    <th className="py-2.5 px-3 text-right">Inspecionar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((log) => {
                    const isDelete = log.action.includes('DELETE') || log.action.includes('CANCEL') || log.action.includes('EXPIRATION')
                    const isCreate = log.action.includes('CREATE') || log.action.includes('IMPORT')
                    const isUpdate = log.action.includes('UPDATE') || log.action.includes('RECEIVE')

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>

                        {isGlobalAdmin && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground text-[11px]">
                              <StoreIcon className="h-3 w-3 text-primary" />
                              {log.store_name}
                            </span>
                          </td>
                        )}

                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              isDelete
                                ? 'destructive'
                                : isCreate
                                ? 'success'
                                : isUpdate
                                ? 'warning'
                                : 'default'
                            }
                            className="text-[10px] font-mono"
                          >
                            {log.action}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-foreground uppercase text-[10px]">
                          {log.entity}
                        </td>

                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground/70" />
                            {log.user_name || log.user_email || (log.user_id ? log.user_id.slice(0, 8) : 'Sistema')}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-muted-foreground text-[10px] truncate max-w-[120px]">
                          {log.entity_id || '-'}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setInspectLog(log)}
                            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Inspecionar Payload"
                          >
                            <Eye className="h-4 w-4" />
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

      {/* Inspect Modal */}
      <Modal
        isOpen={Boolean(inspectLog)}
        onClose={() => setInspectLog(null)}
        title="Detalhes do Log de Auditoria"
        description={`Evento: ${inspectLog?.action} na entidade ${inspectLog?.entity}`}
        maxWidth="3xl"
      >
        {inspectLog && (
          <div className="space-y-4 pt-1 text-xs">
            {/* Metadata Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/40 p-3 rounded-xl border border-border">
              <div>
                <span className="text-[10px] text-muted-foreground block font-semibold">Loja</span>
                <span className="font-bold text-foreground truncate block">{inspectLog.store_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-semibold">Usuário</span>
                <span className="font-bold text-foreground truncate block">{inspectLog.user_name || inspectLog.user_email || 'Sistema'}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-semibold">Data / Hora</span>
                <span className="font-mono text-foreground">{formatDateTime(inspectLog.created_at)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-semibold">ID do Recurso</span>
                <span className="font-mono text-foreground truncate block">{inspectLog.entity_id || '-'}</span>
              </div>
            </div>

            {inspectLog.user_agent && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono bg-muted/20 p-2 rounded-lg border border-border/50 truncate">
                <Laptop className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{inspectLog.user_agent}</span>
              </div>
            )}

            {/* Before / After Payloads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                  Estado Anterior (Before Data)
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl border border-border font-mono text-[11px] overflow-auto max-h-64 leading-relaxed text-foreground">
                  {inspectLog.before_data ? JSON.stringify(inspectLog.before_data, null, 2) : 'Nenhum dado anterior registrado'}
                </pre>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                  Novo Estado (After Data)
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl border border-border font-mono text-[11px] overflow-auto max-h-64 leading-relaxed text-foreground">
                  {inspectLog.after_data ? JSON.stringify(inspectLog.after_data, null, 2) : 'Nenhum dado posterior registrado'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectLog(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
