import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditService } from '@/services/auditService'
import { useTenant } from '@/hooks/useTenant'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDateTime } from '@/utils/dates'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { Shield, Eye, Search } from 'lucide-react'

export function AuditLogsPage() {
  const { storeId, hasActiveStore } = useTenant()

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

  const selectedEntity = filters.entity || 'ALL'
  const [inspectLog, setInspectLog] = React.useState<any | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', storeId, { search, selectedEntity, page, pageSize, sortBy, sortOrder }],
    queryFn: () =>
      auditService.listAuditLogs(storeId, {
        search: search || undefined,
        entity: selectedEntity !== 'ALL' ? selectedEntity : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }),
    enabled: Boolean(hasActiveStore),
  })

  const logs = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-1">
            <Shield className="h-3 w-3" /> Trilha de Auditoria & Conformidade
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Logs de Auditoria
          </h1>
          <p className="text-xs text-muted-foreground">
            Histórico imutável de operações críticas realizadas por usuários na loja
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="flex-shrink-0">
        <CardContent className="p-3 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="flex-1 w-full relative">
            <Input
              placeholder="Buscar por ação ou entidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
              icon={<Search className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={selectedEntity}
              onChange={(e) => setFilter('entity', e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="ALL">Todas as Entidades</option>
              <option value="products">Produtos</option>
              <option value="orders">Pedidos / Vendas</option>
              <option value="purchase_orders">Compras</option>
              <option value="stock">Estoque</option>
              <option value="customers">Clientes</option>
              <option value="suppliers">Fornecedores</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table Card - Viewport fitting with internal scroll */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between flex-shrink-0">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Eventos Registrados
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total de {totalItems} evento(s) auditado(s)
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Carregando registros de auditoria...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-center text-xs text-muted-foreground">
              Nenhum evento registrado até o momento.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <SortableHeader
                      column="created_at"
                      label="Data / Hora"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      column="action"
                      label="Ação"
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
                    <th className="py-3 px-4">ID do Objeto</th>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-foreground">
                        <Badge
                          variant={
                            log.action.includes('DELETE') || log.action.includes('CANCEL')
                              ? 'destructive'
                              : log.action.includes('CREATE')
                              ? 'success'
                              : 'default'
                          }
                          className="text-[10px]"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-foreground uppercase text-[11px]">
                        {log.entity}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground text-[10px]">
                        {log.entity_id || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {log.user_id ? log.user_id.slice(0, 8) : 'Sistema'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {(log.before_data || log.after_data) && (
                          <button
                            onClick={() => setInspectLog(log)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Inspecionar Diferenças"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
        title="Inspeção de Auditoria"
        description={`Ação: ${inspectLog?.action} na entidade ${inspectLog?.entity}`}
        maxWidth="3xl"
      >
        {inspectLog && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1.5">
                  Estado Anterior (Before)
                </span>
                <pre className="p-3.5 bg-muted/60 rounded-xl border border-border font-mono text-[11px] overflow-x-auto max-h-80 leading-relaxed text-foreground">
                  {JSON.stringify(inspectLog.before_data, null, 2) || 'Nenhum dado anterior'}
                </pre>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1.5">
                  Novo Estado (After)
                </span>
                <pre className="p-3.5 bg-muted/60 rounded-xl border border-border font-mono text-[11px] overflow-x-auto max-h-80 leading-relaxed text-foreground">
                  {JSON.stringify(inspectLog.after_data, null, 2) || 'Nenhum novo dado'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-11 sm:h-10"
                onClick={() => setInspectLog(null)}
              >
                Fechar Inspeção
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
