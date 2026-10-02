import * as React from 'react'
import { toast } from 'sonner'
import { backupService, type BackupProgress } from '@/services/backupService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Database,
  Download,
  FileCode,
  HardDrive,
  ShieldCheck,
  FolderArchive,
  RefreshCw,
} from 'lucide-react'
import type { Store } from '@/types/store.types'

interface GlobalBackupPanelProps {
  stores: Store[]
}

export function GlobalBackupPanel({ stores }: GlobalBackupPanelProps) {
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>('all')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progress, setProgress] = React.useState<BackupProgress>({
    status: 'idle',
    percent: 0,
    message: '',
  })

  const selectedStore = stores.find((s) => s.id === selectedStoreId)
  const storeName = selectedStore ? selectedStore.name : 'Todas as Lojas'

  const handleDownloadSQL = async () => {
    setIsProcessing(true)
    setProgress({ status: 'fetching_data', percent: 5, message: 'Iniciando backup SQL...' })
    try {
      await backupService.generateStoreSQLDump(
        selectedStoreId === 'all' ? undefined : selectedStoreId,
        storeName,
        (p) => setProgress(p)
      )
      toast.success(`Backup SQL da base (${storeName}) gerado com sucesso!`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar backup SQL.')
      setProgress({ status: 'error', percent: 0, message: err.message || 'Erro na exportação.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadImagesZip = async () => {
    setIsProcessing(true)
    setProgress({ status: 'fetching_data', percent: 5, message: 'Iniciando download das imagens...' })
    try {
      await backupService.generateStoreImagesZip(
        selectedStoreId === 'all' ? undefined : selectedStoreId,
        storeName,
        (p) => setProgress(p)
      )
      toast.success(`Arquivo .ZIP de imagens (${storeName}) gerado com sucesso!`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar ZIP de imagens.')
      setProgress({ status: 'error', percent: 0, message: err.message || 'Erro no empacotamento.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadJSON = async () => {
    setIsProcessing(true)
    setProgress({ status: 'fetching_data', percent: 20, message: 'Gerando pacote de dados JSON...' })
    try {
      await backupService.generateStoreJSONPackage(
        selectedStoreId === 'all' ? undefined : selectedStoreId,
        storeName
      )
      toast.success(`Pacote JSON de dados (${storeName}) exportado com sucesso!`)
      setProgress({ status: 'done', percent: 100, message: 'Download concluído!' })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar pacote JSON.')
      setProgress({ status: 'error', percent: 0, message: err.message })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Store Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Central de Backup & Exportação de Dados
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Exporte dumps SQL completos, arquivos ZIP de imagens vinculadas e pacotes de dados relacionais.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Escopo:</span>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            disabled={isProcessing}
            aria-label="Selecionar loja para backup"
            className="h-8 px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer w-full sm:w-64"
          >
            <option value="all">Todas as Lojas (Backup Geral)</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                Loja: {s.name} ({s.slug})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Bar Display */}
      {isProcessing && (
        <Card className="p-4 bg-primary/5 border-primary/20 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-primary flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              {progress.message || 'Processando backup...'}
            </span>
            <span className="font-mono text-primary">{progress.percent}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </Card>
      )}

      {/* Backup Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. SQL Dump */}
        <Card className="hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardContent className="p-5 space-y-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 w-fit">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-bold text-sm text-foreground">Dump SQL da Base</h3>
                <Badge variant="outline" className="text-[10px] font-mono">.SQL</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Script SQL com comandos <code className="text-[10px] bg-muted px-1 py-0.5 rounded">INSERT INTO</code> de todas as tabelas, preservando integridade relacional, SKUs, saldos, lotes e vendas.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleDownloadSQL}
                disabled={isProcessing}
                className="w-full text-xs font-semibold h-9"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar Script SQL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Product Images ZIP */}
        <Card className="hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardContent className="p-5 space-y-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 w-fit">
              <FolderArchive className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-bold text-sm text-foreground">ZIP de Imagens dos Produtos</h3>
                <Badge variant="outline" className="text-[10px] font-mono">.ZIP</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Empacota todas as fotos do catálogo vinculadas aos produtos com metadados (<code className="text-[10px] bg-muted px-1 py-0.5 rounded">manifest.json</code>) indexando SKU e IDs.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleDownloadImagesZip}
                disabled={isProcessing}
                variant="outline"
                className="w-full text-xs font-semibold h-9"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar Imagens (.ZIP)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. Full Relational JSON Package */}
        <Card className="hover:border-primary/40 transition-all flex flex-col justify-between">
          <CardContent className="p-5 space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 w-fit">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-bold text-sm text-foreground">Pacote de Dados JSON</h3>
                <Badge variant="outline" className="text-[10px] font-mono">.JSON</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Exportação de dados estruturados em JSON para auditoria, relatórios externos, BI ou restauração em ambientes de homologação.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleDownloadJSON}
                disabled={isProcessing}
                variant="outline"
                className="w-full text-xs font-semibold h-9"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar Dados (.JSON)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Integrity Banner */}
      <div className="p-3.5 bg-muted/40 rounded-xl border border-border flex items-center gap-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
          <span className="font-semibold text-foreground">Garantia de Isolamento Multi-loja:</span> Ao selecionar uma loja específica, apenas os registros com chave estrangeira correspondente à loja são incluídos no pacote de backup.
        </div>
      </div>
    </div>
  )
}
