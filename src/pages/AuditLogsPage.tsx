import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditService } from '@/services/auditService'
import { useTenant } from '@/hooks/useTenant'
import { formatDateTime } from '@/utils/dates'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Shield, Eye, FileText, User } from 'lucide-react'

export function AuditLogsPage() {
  const { storeId, hasActiveStore } = useTenant()
  const [inspectLog, setInspectLog] = React.useState<any | null>(null)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', storeId],
    queryFn: () => auditService.listAuditLogs(storeId),
    enabled: Boolean(hasActiveStore),
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-1">
          <Shield className="h-3 w-3" /> Trilha de Auditoria & Conformidade
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Logs de Auditoria
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Histórico imutável de operações críticas realizadas por usuários na loja
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Carregando registros de auditoria...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum evento registrado até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Ação</th>
                    <th className="py-3 px-4">Entidade</th>
                    <th className="py-3 px-4">ID do Objeto</th>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
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
                      <td className="py-3 px-4 font-semibold text-foreground uppercase text-[11px]">
                        {log.entity}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground text-[10px]">
                        {log.entity_id || '-'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {log.user_id ? log.user_id.slice(0, 8) : 'Sistema'}
                      </td>
                      <td className="py-3 px-4 text-right">
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
      </Card>

      {/* Inspect Modal */}
      <Modal
        isOpen={Boolean(inspectLog)}
        onClose={() => setInspectLog(null)}
        title="Inspeção de Auditoria"
        description={`Ação: ${inspectLog?.action} na entidade ${inspectLog?.entity}`}
        maxWidth="xl"
      >
        {inspectLog && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                  Estado Anterior (Before)
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl border border-border font-mono text-[11px] overflow-x-auto max-h-64">
                  {JSON.stringify(inspectLog.before_data, null, 2) || 'Nenhum dado anterior'}
                </pre>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                  Novo Estado (After)
                </span>
                <pre className="p-3 bg-muted/60 rounded-xl border border-border font-mono text-[11px] overflow-x-auto max-h-64">
                  {JSON.stringify(inspectLog.after_data, null, 2) || 'Nenhum novo dado'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
