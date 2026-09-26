import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  Upload,
} from 'lucide-react'
import { inventoryService } from '@/services/inventoryService'
import { productService } from '@/services/productService'
import { userService } from '@/services/userService'
import { useTenant } from '@/hooks/useTenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { parseApiError } from '@/utils/errorHandler'
import {
  downloadStockTemplateCSV,
  downloadStockTemplateJSON,
  normalizeStockRow,
  parseCSVContent,
  parseJSONContent,
} from '@/utils/importParser'
import type { StockMovementInput } from '@/types/inventory.types'
import type { StockMovementType } from '@/types/database.types'

const MOVEMENT_TYPES: Record<string, StockMovementType> = {
  ENTRY: 'ENTRY',
  ENTRADA: 'ENTRY',
  EXIT: 'EXIT',
  SAIDA: 'EXIT',
  SAÍDA: 'EXIT',
  LOSS: 'LOSS',
  PERDA: 'LOSS',
  DAMAGE: 'DAMAGE',
  AVARIA: 'DAMAGE',
  EXPIRATION: 'EXPIRATION',
  VENCIMENTO: 'EXPIRATION',
  ADJUSTMENT: 'ADJUSTMENT',
  AJUSTE: 'ADJUSTMENT',
  RETURN: 'RETURN',
  DEVOLUCAO: 'RETURN',
  DEVOLUÇÃO: 'RETURN',
}

const EXIT_TYPES: StockMovementType[] = [
  'EXIT',
  'LOSS',
  'DAMAGE',
  'EXPIRATION',
  'ADJUSTMENT',
  'INVENTORY_COUNT',
]

interface ResolvedRow extends StockMovementInput {
  rowNumber: number
  sku: string
  productLabel: string
  lotLabel: string
  costCenterCode: string
  approverLabel: string
}

export interface StockImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function StockImportModal({ isOpen, onClose }: StockImportModalProps) {
  const { storeId } = useTenant()
  const queryClient = useQueryClient()

  const [importMode, setImportMode] = React.useState<'file' | 'paste'>('file')
  const [pastedText, setPastedText] = React.useState('')
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [parsedItems, setParsedItems] = React.useState<Record<string, any>[]>([])
  const [importError, setImportError] = React.useState<string | null>(null)
  const [importResult, setImportResult] = React.useState<{
    successCount: number
    errorCount: number
    errors: string[]
  } | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products-select', storeId],
    queryFn: () => productService.listProducts(storeId, { pageSize: 1000 }),
    enabled: Boolean(storeId) && isOpen,
  })

  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers', storeId],
    queryFn: () => inventoryService.getCostCenters(storeId),
    enabled: Boolean(storeId) && isOpen,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['store-members', storeId],
    queryFn: () => userService.listStoreMembers(storeId),
    enabled: Boolean(storeId) && isOpen,
  })

  // Resolucao SKU -> produto, centro de custo por codigo, aprovador por e-mail
  const resolved = React.useMemo<ResolvedRow[]>(() => {
    const products = productsData?.data || []
    const bySku = new Map(products.map((p) => [p.sku.toLowerCase(), p]))
    const byId = new Map(products.map((p) => [p.id, p]))
    const centersByCode = new Map(costCenters.map((c) => [c.code.toLowerCase(), c]))
    const approversByEmail = new Map(
      members
        .filter((m) => m.isActive)
        .map((m) => [(m.email || '').toLowerCase(), m.userId])
    )

    return parsedItems.map((raw, index) => {
      const row = normalizeStockRow(raw)
      const sku = row.sku || ''
      const product = row.product_id ? byId.get(row.product_id) : bySku.get(sku.toLowerCase())
      const typeKey = (row.movement_type || 'ENTRY').toUpperCase()
      const movementType = MOVEMENT_TYPES[typeKey] || 'ENTRY'
      const costCenter = row.cost_center_code
        ? centersByCode.get(row.cost_center_code.toLowerCase())
        : undefined
      const approverEmail = (row.approver_email || '').toLowerCase()
      const approvedBy = approversByEmail.get(approverEmail) || null

      return {
        rowNumber: index + 1,
        productId: product?.id || '',
        sku,
        productLabel: product ? `${product.sku} — ${product.name}` : '',
        movementType,
        quantity: parseFloat(row.quantity || '0') || 0,
        batchId: null,
        lotNumber: row.lot_number || null,
        expirationDate: row.expiration_date || null,
        unitCost: row.unit_cost ? parseFloat(row.unit_cost) : null,
        reasonCode: row.reason_code || null,
        reasonDetail: null,
        costCenterId: costCenter?.id || null,
        costCenterCode: costCenter?.code || row.cost_center_code || '',
        notes: row.notes || null,
        approvedBy,
        approverLabel: approverEmail,
        lotLabel: row.lot_number
          ? `${row.lot_number}${row.expiration_date ? ` · ${row.expiration_date}` : ''}`
          : '—',
      }
    })
  }, [parsedItems, productsData, costCenters, members])

  const isExit = (row: ResolvedRow) => EXIT_TYPES.includes(row.movementType)

  const problems = React.useMemo(
    () =>
      resolved
        .map((row, index) => {
          if (!row.productId) return { index, text: `L${row.rowNumber}: SKU "${row.sku}" não encontrado` }
          if (!row.quantity || row.quantity <= 0)
            return { index, text: `L${row.rowNumber}: quantidade inválida` }
          if (isExit(row) && !row.reasonCode)
            return { index, text: `L${row.rowNumber}: saída sem motivo (reason_code)` }
          if (isExit(row) && !row.costCenterId)
            return {
              index,
              text: `L${row.rowNumber}: centro de custo "${row.costCenterCode || '—'}" não encontrado`,
            }
          if (isExit(row) && !row.approvedBy)
            return {
              index,
              text: `L${row.rowNumber}: aprovador "${row.approverLabel || '—'}" não encontrado`,
            }
          return null
        })
        .filter((p): p is { index: number; text: string } => p !== null),
    [resolved]
  )

  const invalidIndexes = new Set(problems.map((p) => p.index))
  const validRows = resolved.filter((_, index) => !invalidIndexes.has(index))

  const importMutation = useMutation({
    mutationFn: () => inventoryService.importMovementsBulk(storeId, validRows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-batches', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      setImportResult(result)
    },
    onError: (err) => setImportError(parseApiError(err)),
  })

  const processRawImportText = (text: string, isJsonHint = false) => {
    try {
      setImportError(null)
      setImportResult(null)
      const trimmed = text.trim()
      if (!trimmed) {
        setParsedItems([])
        return
      }
      if (isJsonHint || trimmed.startsWith('[') || trimmed.startsWith('{')) {
        setParsedItems(parseJSONContent(trimmed))
      } else {
        setParsedItems(parseCSVContent(trimmed))
      }
    } catch (err: any) {
      setImportError(err.message || 'Formato inválido. Verifique o conteúdo CSV ou JSON.')
      setParsedItems([])
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setImportError(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      processRawImportText(content, file.name.endsWith('.json'))
    }
    reader.onerror = () => setImportError('Erro ao ler o arquivo selecionado.')
    reader.readAsText(file, 'UTF-8')
  }

  const handleOpen = () => {
    setFileName(null)
    setPastedText('')
    setParsedItems([])
    setImportError(null)
    setImportResult(null)
  }

  const handleExecute = () => {
    if (validRows.length === 0) return
    importMutation.mutate()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importação Rápida de Movimentações (CSV / JSON)"
      description="Suba entradas, baixas e ajustes de estoque em lote"
      maxWidth="3xl"
    >
      <div className="space-y-4 pt-1 text-xs">
        <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-foreground">Modelos Prontos para Download</div>
            <div className="text-muted-foreground text-[11px] mt-0.5">
              Saídas exigem <b>reason_code</b>, <b>cost_center_code</b> e <b>approver_email</b>.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={downloadStockTemplateCSV}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Modelo .CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={downloadStockTemplateJSON}
            >
              <FileCode className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Modelo .JSON
            </Button>
          </div>
        </div>

        <div className="flex border-b border-border gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setImportMode('file')}
            className={`pb-2.5 transition-colors border-b-2 ${
              importMode === 'file'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Upload de Arquivo (.csv, .json)
          </button>
          <button
            type="button"
            onClick={() => setImportMode('paste')}
            className={`pb-2.5 transition-colors border-b-2 ${
              importMode === 'paste'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Colar Texto Diretamente
          </button>
        </div>

        {importMode === 'file' && (
          <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-6 text-center bg-surface-elevated/40">
            <input
              type="file"
              id="file-stock-import"
              accept=".csv, .json, .txt, text/csv, application/json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="file-stock-import"
              className="flex flex-col items-center justify-center cursor-pointer space-y-2"
            >
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                {fileName ? (
                  <span className="text-primary font-bold">{fileName}</span>
                ) : (
                  'Clique para selecionar ou arraste o arquivo aqui'
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Delimitado por vírgula/ponto-e-vírgula (.CSV) ou JSON nativo (.JSON)
              </div>
            </label>
          </div>
        )}

        {importMode === 'paste' && (
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground text-xs">
              Cole o conteúdo CSV ou array JSON abaixo:
            </label>
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value)
                processRawImportText(e.target.value)
              }}
              placeholder={`sku;movement_type;quantity;lot_number;expiration_date;reason_code;cost_center_code;approver_email\nVIN-001;EXPIRATION;8;L2025-07;2025-08-10;VENCIMENTO;VENC-OP;gerente@empresa.com`}
              className="w-full p-3 rounded-xl border border-input bg-background font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {importError && (
          <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {problems.length > 0 && !importResult && (
          <div className="p-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {problems.length} linha(s) serão ignoradas por falta de dados obrigatórios
            </div>
            <div className="mt-1.5 max-h-28 overflow-y-auto font-mono text-[10px] space-y-0.5">
              {problems.slice(0, 20).map((p) => (
                <div key={p.index}>• {p.text}</div>
              ))}
            </div>
          </div>
        )}

        {importResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Importação Concluída com Sucesso!</span>
            </div>
            <div className="text-xs text-foreground">
              <b>{importResult.successCount}</b> movimentação(ões) lançada(s) no estoque.
              {importResult.errorCount > 0 && (
                <span className="text-danger ml-2 font-medium">
                  ({importResult.errorCount} falha(s))
                </span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-2 p-2.5 bg-surface rounded-lg border border-border max-h-32 overflow-y-auto font-mono text-[11px] text-danger space-y-1">
                {importResult.errors.map((e, idx) => (
                  <div key={idx}>• {e}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {resolved.length > 0 && !importResult && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-foreground flex items-center gap-2">
                <span>Pré-visualização dos Dados</span>
                <Badge variant="default">{resolved.length} registros identificados</Badge>
                {problems.length > 0 && (
                  <Badge variant="warning">{validRows.length} válidos</Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Exibindo os primeiros {Math.min(5, resolved.length)} registros
              </span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-surface">
              <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted/60 font-bold uppercase text-[10px] text-muted-foreground">
                <div className="col-span-3">Item (SKU)</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-1 text-right">Qtd</div>
                <div className="col-span-2">Lote / Validade</div>
                <div className="col-span-2">Motivo / Centro</div>
                <div className="col-span-2">Aprovador</div>
              </div>
              {resolved.slice(0, 5).map((row, idx) => {
                const invalid = invalidIndexes.has(idx)
                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-12 gap-2 p-2.5 items-center font-mono text-xs ${
                      invalid ? 'bg-danger/5 opacity-60' : ''
                    }`}
                  >
                    <div
                      className={`col-span-3 font-sans font-semibold truncate ${
                        invalid ? 'text-danger' : 'text-foreground'
                      }`}
                    >
                      {row.productLabel || <span className="text-danger">SKU não encontrado</span>}
                    </div>
                    <div className="col-span-2 text-muted-foreground truncate">
                      {row.movementType}
                    </div>
                    <div className="col-span-1 text-right font-bold text-foreground">
                      {row.quantity}
                    </div>
                    <div className="col-span-2 text-muted-foreground truncate">
                      {row.lotLabel}
                    </div>
                    <div className="col-span-2 text-muted-foreground truncate">
                      {isExit(row) ? (
                        <>
                          {row.reasonCode || <span className="text-danger">sem motivo</span>}
                          {row.costCenterCode && (
                            <span className="text-muted-foreground/70"> · {row.costCenterCode}</span>
                          )}
                        </>
                      ) : (
                        <span className="italic">—</span>
                      )}
                    </div>
                    <div className="col-span-2 text-muted-foreground truncate">
                      {isExit(row) ? (
                        row.approverLabel || <span className="text-danger">sem aprovador</span>
                      ) : (
                        <span className="italic">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-11 sm:h-10"
            onClick={handleOpen}
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto h-11 sm:h-10"
            onClick={onClose}
          >
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button
              type="button"
              className="w-full sm:w-auto h-11 sm:h-10 font-semibold"
              disabled={validRows.length === 0}
              isLoading={importMutation.isPending}
              onClick={handleExecute}
            >
              <Upload className="h-4 w-4 mr-2" /> Importar ({validRows.length})
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
