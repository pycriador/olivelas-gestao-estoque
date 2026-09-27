import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  globalAdminService,
  GLOBAL_DELETE_ENTITIES,
  type GlobalDeleteEntity,
  type GlobalEntityRow,
} from '@/services/globalAdminService'
import { storeService } from '@/services/storeService'
import { useTablePagination } from '@/hooks/useTablePagination'
import { formatDateTime } from '@/utils/dates'
import { parseApiError } from '@/utils/errorHandler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ResponsiveTable } from '@/components/common/ResponsiveTable'
import { Trash2, Search, Store as StoreIcon, AlertTriangle } from 'lucide-react'

/**
 * Exclusao definitiva cross-store.
 *
 * Sem justificativa por requisito, mas com duas protecoes:
 * 1. Confirmacao explicita mostrando loja + registro.
 * 2. A propria RPC bloqueia o que tem historico comercial e devolve o motivo.
 *
 * A trilha e garantida no servidor: a RPC grava em audit_logs dentro da mesma
 * transacao da exclusao, entao ou o registro some e ha log, ou nada acontece.
 */
export function GlobalDeletePanel() {
  const queryClient = useQueryClient()

  const {
    page,
    pageSize,
    search,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
  } = useTablePagination({
    defaultPageSize: 20,
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
    defaultFilters: {
      entity: 'orders',
      storeId: 'all',
    },
  })

  const entity = (filters.entity || 'orders') as GlobalDeleteEntity
  const storeFilter = filters.storeId || 'all'

  const [target, setTarget] = React.useState<GlobalEntityRow | null>(null)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')

  const { data: stores = [] } = useQuery({
    queryKey: ['all-stores'],
    queryFn: () => storeService.listAllStores(),
    staleTime: 5 * 60_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['global-delete-entities', entity, storeFilter, search, page, pageSize],
    queryFn: () =>
      globalAdminService.listEntities(entity, {
        storeId: storeFilter,
        search: search || undefined,
        page,
        pageSize,
      }),
    enabled: Boolean(entity),
    // Conta de registros nao deve exigir migracao de query key.
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (row: GlobalEntityRow) => globalAdminService.hardDelete(entity, row.id),
    onSuccess: (summary) => {
      setTarget(null)
      setError('')
      setSuccess(summary)
      // A exclusao mexe em pedidos/estoque/lojas: invalida o que faz sentido.
      queryClient.invalidateQueries({ queryKey: ['global-delete-entities'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['all-stores'] })
    },
    onError: (err) => {
      // Erro vem do servidor (ex.: registro com historico comercial).
      setError(parseApiError(err))
    },
  })

  const rows = data?.data || []
  const totalItems = data?.total || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const entityLabel =
    GLOBAL_DELETE_ENTITIES.find((e) => e.value === entity)?.label || 'Registro'

  const switchEntity = (value: string) => {
    setFilter('entity', value)
    setPage(1)
    setError('')
    setSuccess('')
  }

  return (
    <>
      <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[11px] text-foreground flex-shrink-0">
        <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-danger">Exclusão definitiva.</span> O registro é
          removido fisicamente de qualquer loja, sem restauração. Tudo é registrado em{' '}
          <Link to="/audit" className="underline underline-offset-2">
            Auditoria
          </Link>
          . Registros com histórico comercial (produtos em pedidos, fornecedores em compras) não
          podem ser excluídos — o servidor explica o que bloqueia.
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        <select
          value={entity}
          onChange={(e) => switchEntity(e.target.value)}
          aria-label="Tipo de registro"
          className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {GLOBAL_DELETE_ENTITIES.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={storeFilter}
            onChange={(e) => {
              setFilter('storeId', e.target.value)
              setPage(1)
            }}
            aria-label="Filtrar por loja"
            className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">Todas as lojas</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar registro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-background/90"
            icon={<Search className="h-3.5 w-3.5" />}
          />
        </div>

        <Badge variant="outline" className="text-[11px] font-normal px-2 py-0.5 ml-auto">
          {totalItems} {totalItems === 1 ? 'registro' : 'registros'}
        </Badge>
      </div>

      {success && (
        <div className="p-2.5 rounded-lg bg-success/15 border border-success/30 text-xs text-foreground flex-shrink-0">
          {success}
        </div>
      )}
      {error && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger flex-shrink-0">
          {error}
        </div>
      )}

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden border border-border shadow-xs bg-card">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} className="h-10" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={<Trash2 className="h-10 w-10 text-muted-foreground" />}
                title="Nenhum registro encontrado"
                description="Ajuste a loja, o tipo ou a busca para ver outros registros."
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ResponsiveTable className="w-full text-xs">
                <thead className="border-b border-border bg-card/95 backdrop-blur text-muted-foreground font-semibold uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 text-left">Registro</th>
                    <th className="py-3 px-4 text-left">Loja</th>
                    <th className="py-3 px-4 text-left">Detalhe</th>
                    <th className="py-3 px-4 text-left">Criado em</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="truncate max-w-xs">{row.label}</div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {row.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <div className="truncate max-w-[10rem]">{row.store_name}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {row.detail || '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {row.created_at ? formatDateTime(row.created_at) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-danger hover:bg-danger/10"
                          onClick={() => {
                            setError('')
                            setSuccess('')
                            setTarget(row)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ResponsiveTable>
            </div>
          )}
        </CardContent>

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

      <ConfirmModal
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (target) deleteMutation.mutate(target)
        }}
        title={`Excluir ${entityLabel.toLowerCase()} definitivamente`}
        description={`"${target?.label}" da loja "${target?.store_name}" será removido fisicamente, sem restauração e sem justificativa. A operação fica registrada na auditoria.`}
        confirmText="Excluir definitivamente"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}
