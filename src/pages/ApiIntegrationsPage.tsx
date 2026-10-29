import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenant } from '@/hooks/useTenant'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  apiIntegrationService,
  SERVICE_SCHEMAS,
  INTEGRATION_PRESETS,
  parseCurlCommand,
  generateCurlCommand,
  detectJsonArrays,
  extractItemsFromResponse,
  extractSampleKeys,
  autoMapFields,
} from '@/services/apiIntegrationService'
import type {
  ApiIntegrationConnector,
  IntegrationAuthType,
  IntegrationAuthConfig,
  IntegrationBodyType,
  HttpMethod,
  KeyValueParam,
  IntegrationTargetService,
  FieldMappingsMap,
  FieldTransformType,
  HttpExecutionResult,
  DryRunPreviewRow,
} from '@/types/apiIntegration.types'
import {
  Webhook,
  Play,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  FileJson,
  Table as TableIcon,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Layers,
  Users,
  Tags,
  Package,
  Truck,
  ShieldCheck,
  Code2,
  BookOpen,
} from 'lucide-react'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  POST: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  PUT: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  PATCH: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  DELETE: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
}

const SERVICE_ICONS: Record<IntegrationTargetService, React.ElementType> = {
  customers: Users,
  categories: Tags,
  products: Package,
  suppliers: Truck,
  inventory: Layers,
}

const TRANSFORMER_LABELS: Record<FieldTransformType, string> = {
  NONE: 'Sem transformação (Original)',
  TRIM: 'Limpar espaços (Trim)',
  UPPERCASE: 'MAIÚSCULAS',
  LOWERCASE: 'minúsculas',
  DIGITS_ONLY: 'Apenas dígitos (CPF/CNPJ/Tel)',
  CURRENCY_NUMBER: 'Moeda / Decimal (R$ -> 0.00)',
  BOOLEAN: 'Booleano (true/false/1/0/sim)',
  AUTO_SKU: 'Gerar SKU se vazio',
}

function createEmptyKeyValue(): KeyValueParam {
  return {
    id: crypto.randomUUID(),
    key: '',
    value: '',
    enabled: true,
  }
}

function buildDefaultMappings(service: IntegrationTargetService): FieldMappingsMap {
  const schema = SERVICE_SCHEMAS[service]
  const map: FieldMappingsMap = {}
  for (const f of schema.fields) {
    map[f.field] = {
      sourcePath: '',
      transform: f.defaultTransform,
      defaultValue: f.field === 'unit' ? 'UN' : '',
    }
  }
  return map
}

export function ApiIntegrationsPage() {
  const { storeId, storeName, hasActiveStore } = useTenant()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const rawServiceParam = searchParams.get('service')
  const validInitialService: IntegrationTargetService =
    rawServiceParam &&
    (rawServiceParam === 'customers' ||
      rawServiceParam === 'categories' ||
      rawServiceParam === 'products' ||
      rawServiceParam === 'suppliers' ||
      rawServiceParam === 'inventory')
      ? rawServiceParam
      : 'products'

  // Selected or active integration state
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [name, setName] = React.useState('Nova Conexão API')
  const [description, setDescription] = React.useState('')
  const [targetService, setTargetService] = React.useState<IntegrationTargetService>(validInitialService)
  const [method, setMethod] = React.useState<HttpMethod>('GET')
  const [url, setUrl] = React.useState('https://dummyjson.com/products?limit=15')
  const [authType, setAuthType] = React.useState<IntegrationAuthType>('NONE')
  const [authConfig, setAuthConfig] = React.useState<IntegrationAuthConfig>({})
  const [showSecrets, setShowSecrets] = React.useState(false)

  const [queryParams, setQueryParams] = React.useState<KeyValueParam[]>([createEmptyKeyValue()])
  const [headers, setHeaders] = React.useState<KeyValueParam[]>([
    { id: crypto.randomUUID(), key: 'Accept', value: 'application/json', enabled: true },
  ])
  const [bodyType, setBodyType] = React.useState<IntegrationBodyType>('none')
  const [bodyContent, setBodyContent] = React.useState('{\n  "page": 1,\n  "limit": 50\n}')

  const [responseRootPath, setResponseRootPath] = React.useState('products')
  const [upsertKey, setUpsertKey] = React.useState('sku')
  const [fieldMappings, setFieldMappings] = React.useState<FieldMappingsMap>(() =>
    buildDefaultMappings(validInitialService),
  )

  // UI Tabs
  const [builderTab, setBuilderTab] = React.useState<'params' | 'auth' | 'headers' | 'body' | 'mapping' | 'logs'>('mapping')
  const [inspectorTab, setInspectorTab] = React.useState<'dryrun' | 'json' | 'table' | 'headers' | 'curl'>('dryrun')

  // Execution & Modals State
  const [httpResponse, setHttpResponse] = React.useState<HttpExecutionResult | null>(null)
  const [isTestingHttp, setIsTestingHttp] = React.useState(false)
  const [dryRunRows, setDryRunRows] = React.useState<DryRunPreviewRow[]>([])
  const [isSimulating, setIsSimulating] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [syncFeedback, setSyncFeedback] = React.useState<{
    type: 'success' | 'warning' | 'error'
    message: string
    details?: string[]
  } | null>(null)

  const [isCurlModalOpen, setIsCurlModalOpen] = React.useState(false)
  const [curlInput, setCurlInput] = React.useState('')
  const [isPresetModalOpen, setIsPresetModalOpen] = React.useState(false)
  const [deletingIntegration, setDeletingIntegration] = React.useState<ApiIntegrationConnector | null>(null)
  const [copiedCurl, setCopiedCurl] = React.useState(false)

  const initializeMappingsForService = React.useCallback(
    (service: IntegrationTargetService, existingMappings?: FieldMappingsMap) => {
      const schema = SERVICE_SCHEMAS[service]
      setUpsertKey(schema.defaultUpsertKey)
      if (existingMappings && Object.keys(existingMappings).length > 0) {
        setFieldMappings(existingMappings)
        return
      }
      setFieldMappings(buildDefaultMappings(service))
    },
    [],
  )

  React.useEffect(() => {
    initializeMappingsForService(validInitialService)
  }, [validInitialService, initializeMappingsForService])

  // Queries
  const { data: savedIntegrations = [], isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ['api-integrations', storeId],
    queryFn: () => apiIntegrationService.listIntegrations(storeId),
    enabled: Boolean(hasActiveStore && storeId),
  })

  const { data: integrationLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['api-integration-logs', storeId],
    queryFn: () => apiIntegrationService.listLogs(storeId, 30),
    enabled: Boolean(hasActiveStore && storeId),
  })

  // Detected arrays & sample keys from latest HTTP response
  const detectedArrays = React.useMemo(() => {
    if (!httpResponse?.parsedJson) return []
    return detectJsonArrays(httpResponse.parsedJson)
  }, [httpResponse?.parsedJson])

  const activeExtractedArray = React.useMemo(() => {
    if (!httpResponse?.parsedJson) return []
    return extractItemsFromResponse(httpResponse.parsedJson, responseRootPath)
  }, [httpResponse?.parsedJson, responseRootPath])

  const availableSampleKeys = React.useMemo(() => {
    return extractSampleKeys(activeExtractedArray)
  }, [activeExtractedArray])

  const currentRequestConfig = React.useMemo(
    () => ({
      method,
      url: url.trim(),
      auth_type: authType,
      auth_config: authConfig,
      query_params: queryParams.filter((q) => q.key.trim()),
      headers: headers.filter((h) => h.key.trim()),
      body_type: bodyType,
      body_content: bodyContent,
      response_root_path: responseRootPath,
    }),
    [method, url, authType, authConfig, queryParams, headers, bodyType, bodyContent, responseRootPath],
  )

  // Load saved integration into form
  const handleSelectIntegration = (item: ApiIntegrationConnector) => {
    setSelectedId(item.id)
    setName(item.name)
    setDescription(item.description || '')
    setTargetService(item.target_service)
    setMethod(item.method)
    setUrl(item.url)
    setAuthType(item.auth_type)
    setAuthConfig(item.auth_config || {})
    setQueryParams(item.query_params?.length > 0 ? item.query_params : [createEmptyKeyValue()])
    setHeaders(item.headers?.length > 0 ? item.headers : [createEmptyKeyValue()])
    setBodyType(item.body_type || 'none')
    setBodyContent(item.body_content || '')
    setResponseRootPath(item.response_root_path || '$')
    setUpsertKey(item.upsert_key || SERVICE_SCHEMAS[item.target_service].defaultUpsertKey)
    initializeMappingsForService(item.target_service, item.field_mappings)
    setSyncFeedback(null)
  }

  // Create new blank integration
  const handleNewIntegration = (service: IntegrationTargetService = targetService) => {
    setSelectedId(null)
    setName(`Conector de ${SERVICE_SCHEMAS[service].shortLabel}`)
    setDescription('')
    setTargetService(service)
    setMethod('GET')
    setUrl(
      service === 'customers' || service === 'suppliers'
        ? 'https://jsonplaceholder.typicode.com/users'
        : 'https://dummyjson.com/products?limit=15',
    )
    setAuthType('NONE')
    setAuthConfig({})
    setQueryParams([createEmptyKeyValue()])
    setHeaders([{ id: crypto.randomUUID(), key: 'Accept', value: 'application/json', enabled: true }])
    setBodyType('none')
    setResponseRootPath(service === 'customers' || service === 'suppliers' ? '$' : 'products')
    initializeMappingsForService(service)
    setHttpResponse(null)
    setDryRunRows([])
    setSyncFeedback(null)
  }

  // Apply Preset
  const handleApplyPreset = (presetIndex: number) => {
    const preset = INTEGRATION_PRESETS[presetIndex]
    if (!preset) return
    setSelectedId(null)
    setName(preset.name)
    setDescription(preset.description)
    setTargetService(preset.target_service)
    setMethod(preset.method)
    setUrl(preset.url)
    setAuthType(preset.auth_type)
    setAuthConfig(preset.auth_config)
    setQueryParams(preset.query_params.length > 0 ? preset.query_params : [createEmptyKeyValue()])
    setHeaders(preset.headers.length > 0 ? preset.headers : [createEmptyKeyValue()])
    setBodyType(preset.body_type)
    setBodyContent(preset.body_content)
    setResponseRootPath(preset.response_root_path)
    setUpsertKey(preset.upsert_key)
    setFieldMappings(preset.field_mappings)
    setIsPresetModalOpen(false)
    setSyncFeedback({
      type: 'success',
      message: `Template "${preset.name}" carregado! Clique em "Disparar Requisição" para testar ao vivo.`,
    })
  }

  // Import cURL
  const handleImportCurl = () => {
    if (!curlInput.trim()) return
    const parsed = parseCurlCommand(curlInput)
    setMethod(parsed.method)
    if (parsed.url) setUrl(parsed.url)
    if (parsed.headers.length > 0) setHeaders(parsed.headers)
    if (parsed.query_params.length > 0) setQueryParams(parsed.query_params)
    setAuthType(parsed.auth_type)
    setAuthConfig(parsed.auth_config)
    setBodyType(parsed.body_type)
    setBodyContent(parsed.body_content)
    setIsCurlModalOpen(false)
    setCurlInput('')
    setSyncFeedback({
      type: 'success',
      message: 'Comando cURL importado com sucesso! URL, Headers, Autenticação e Body preenchidos.',
    })
  }

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      apiIntegrationService.saveIntegration(storeId, {
        id: selectedId || undefined,
        name: name.trim() || 'Conexão sem nome',
        description: description.trim() || null,
        target_service: targetService,
        method,
        url: url.trim(),
        auth_type: authType,
        auth_config: authConfig,
        query_params: queryParams.filter((q) => q.key.trim()),
        headers: headers.filter((h) => h.key.trim()),
        body_type: bodyType,
        body_content: bodyContent,
        response_root_path: responseRootPath,
        upsert_key: upsertKey,
        field_mappings: fieldMappings,
        is_active: true,
      }),
    onSuccess: (saved) => {
      setSelectedId(saved.id)
      queryClient.invalidateQueries({ queryKey: ['api-integrations', storeId] })
      setSyncFeedback({
        type: 'success',
        message: `Conector "${saved.name}" salvo com segurança na loja ${storeName}!`,
      })
    },
    onError: (err: Error) => {
      setSyncFeedback({
        type: 'error',
        message: `Erro ao salvar conector: ${err.message}`,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiIntegrationService.deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-integrations', storeId] })
      setDeletingIntegration(null)
      handleNewIntegration(targetService)
    },
  })

  // Execute HTTP Request + Auto-Map + Dry-Run
  const handleSendRequest = async () => {
    if (!url.trim()) return
    setIsTestingHttp(true)
    setSyncFeedback(null)

    try {
      const response = await apiIntegrationService.executeHttpRequest(currentRequestConfig, storeId)
      setHttpResponse(response)

      if (response.ok && response.parsedJson) {
        let activePath = responseRootPath
        let finalArray = extractItemsFromResponse(response.parsedJson, activePath)

        if (finalArray.length === 0 && response.detectedArrays.length > 0) {
          activePath = response.detectedArrays[0].path
          setResponseRootPath(activePath)
          finalArray = extractItemsFromResponse(response.parsedJson, activePath)
        }

        if (finalArray.length > 0) {
          const sampleKeys = extractSampleKeys(finalArray)
          const hasAnyMapped = Object.values(fieldMappings).some((m) => m.sourcePath.trim() !== '')
          let activeMappings = fieldMappings
          if (!hasAnyMapped) {
            activeMappings = autoMapFields(targetService, sampleKeys)
            setFieldMappings(activeMappings)
          }

          if (storeId && storeId !== 'all') {
            setIsSimulating(true)
            const simulated = await apiIntegrationService.simulateSync(
              storeId,
              targetService,
              finalArray,
              activeMappings,
              upsertKey,
            )
            setDryRunRows(simulated)
            setIsSimulating(false)
          }
          setInspectorTab('dryrun')
        } else {
          setInspectorTab('json')
        }
      } else {
        setInspectorTab('json')
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao disparar requisição HTTP.',
      })
    } finally {
      setIsTestingHttp(false)
    }
  }

  // Re-run simulation whenever mappings, root path, or service change
  const handleRunSimulation = React.useCallback(async () => {
    if (activeExtractedArray.length === 0 || !storeId || storeId === 'all') {
      setDryRunRows([])
      return
    }
    setIsSimulating(true)
    try {
      const simulated = await apiIntegrationService.simulateSync(
        storeId,
        targetService,
        activeExtractedArray,
        fieldMappings,
        upsertKey,
      )
      setDryRunRows(simulated)
    } finally {
      setIsSimulating(false)
    }
  }, [activeExtractedArray, storeId, targetService, fieldMappings, upsertKey])

  React.useEffect(() => {
    if (activeExtractedArray.length > 0) {
      handleRunSimulation()
    }
  }, [targetService, responseRootPath, upsertKey, handleRunSimulation, activeExtractedArray.length])

  // Auto-Map button click
  const handleAutoMap = () => {
    if (availableSampleKeys.length === 0) {
      setSyncFeedback({
        type: 'warning',
        message: 'Dispare a requisição HTTP primeiro para que o Auto-Map analise as chaves do JSON retornado.',
      })
      return
    }
    const mapped = autoMapFields(targetService, availableSampleKeys)
    setFieldMappings(mapped)
    setSyncFeedback({
      type: 'success',
      message: `Mapeamento inteligente aplicado para ${SERVICE_SCHEMAS[targetService].label}! Verifique as colunas De → Para abaixo.`,
    })
  }

  // Execute Real Batch Sync into Supabase
  const handleExecuteSync = async () => {
    if (activeExtractedArray.length === 0) return
    setIsSyncing(true)
    setSyncFeedback(null)

    try {
      const result = await apiIntegrationService.executeSync({
        storeId,
        integrationId: selectedId,
        integrationName: name.trim() || 'Conexão API',
        service: targetService,
        items: activeExtractedArray,
        mappings: fieldMappings,
        upsertKey,
        httpStatus: httpResponse?.status || 200,
      })

      // Invalidate target service cache so Pages update immediately
      queryClient.invalidateQueries({ queryKey: [targetService, storeId] })
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['categories', storeId] })
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['inventory', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', storeId] })
      queryClient.invalidateQueries({ queryKey: ['api-integrations', storeId] })
      refetchLogs()

      await handleRunSimulation()

      const hasErrors = result.recordsFailed > 0
      setSyncFeedback({
        type: !hasErrors ? 'success' : result.recordsCreated + result.recordsUpdated > 0 ? 'warning' : 'error',
        message: `Sincronização concluída em ${SERVICE_SCHEMAS[targetService].label}: ${result.recordsCreated} criados, ${result.recordsUpdated} atualizados, ${result.recordsFailed} ignorados/erros.`,
        details: result.errors.slice(0, 5),
      })
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha crítica ao sincronizar registros.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const dryRunStats = React.useMemo(() => {
    const createCount = dryRunRows.filter((r) => r.action === 'CREATE').length
    const updateCount = dryRunRows.filter((r) => r.action === 'UPDATE').length
    const invalidCount = dryRunRows.filter((r) => r.action === 'INVALID').length
    return { createCount, updateCount, invalidCount, validTotal: createCount + updateCount }
  }, [dryRunRows])

  const activeSchema = SERVICE_SCHEMAS[targetService]

  return (
    <div className="flex flex-col gap-3 pb-6">
      <PageHeader
        title="API Studio & Conector de Serviços"
        badge={
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            POSTMAN-STYLE CONNECTOR
          </Badge>
        }
      />

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Webhook className="h-4 w-4 text-primary shrink-0" />
          <span>
            Configure requisições REST/JSON, vincule campos <strong>De → Para</strong> e sincronize com os módulos da loja.
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPresetModalOpen(true)}
            className="h-8 text-xs"
          >
            <BookOpen className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Templates Prontos
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCurlModalOpen(true)}
            className="h-8 text-xs"
          >
            <Terminal className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Importar cURL
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleNewIntegration(targetService)}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova Conexão
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
            className="h-8 text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Salvar Conector
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {syncFeedback && (
        <div
          className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-start justify-between gap-3 shrink-0 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : syncFeedback.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          <div className="space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : syncFeedback.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              {syncFeedback.message}
            </div>
            {syncFeedback.details && syncFeedback.details.length > 0 && (
              <ul className="list-disc list-inside text-[11px] opacity-90">
                {syncFeedback.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-[11px] font-semibold underline opacity-75 hover:opacity-100 shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main 12-Col Postman Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* LEFT SIDEBAR: Saved Connectors & Target Service Selector (3 cols) */}
        <Card className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden border-border/70">
          <div className="p-3 border-b border-border bg-muted/30 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                1. Serviço de Destino
              </span>
              <Badge variant="outline" className="text-[10px]">
                {storeName}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-1">
              {(Object.keys(SERVICE_SCHEMAS) as IntegrationTargetService[]).map((srvKey) => {
                const srv = SERVICE_SCHEMAS[srvKey]
                const Icon = SERVICE_ICONS[srvKey]
                const isSelected = targetService === srvKey
                return (
                  <button
                    key={srvKey}
                    type="button"
                    onClick={() => {
                      setTargetService(srvKey)
                      initializeMappingsForService(srvKey)
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left border cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-surface hover:bg-muted/70 text-foreground border-border/50'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{srv.label}</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-75">
                      {srv.fields.length} campos
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Saved Connections List */}
          <div className="p-2.5 border-b border-border flex items-center justify-between bg-surface shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Conexões Salvas ({savedIntegrations.length})
            </span>
            <button
              type="button"
              onClick={() => setIsPresetModalOpen(true)}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              + Exemplos
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {isLoadingIntegrations ? (
              <div className="text-xs text-muted-foreground p-3 text-center">Carregando conexões...</div>
            ) : savedIntegrations.length === 0 ? (
              <div className="text-center p-4 space-y-2">
                <Database className="h-7 w-7 text-muted-foreground/50 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma API salva nesta loja ainda. Use um <strong>Template Pronto</strong> ou configure ao lado e clique em Salvar.
                </p>
              </div>
            ) : (
              savedIntegrations.map((item) => {
                const isSelected = selectedId === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectIntegration(item)}
                    className={`group p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/50 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          METHOD_COLORS[item.method]
                        }`}
                      >
                        {item.method}
                      </span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                        {SERVICE_SCHEMAS[item.target_service]?.shortLabel}
                      </Badge>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingIntegration(item)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-danger transition-opacity ml-auto"
                        title="Excluir conexão"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate">{item.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                      {item.url}
                    </div>
                    {item.last_run_at && (
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span>
                          Último sync: {new Date(item.last_run_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span
                          className={
                            item.last_run_status === 'SUCCESS'
                              ? 'text-emerald-600 font-semibold'
                              : 'text-amber-600 font-semibold'
                          }
                        >
                          {item.last_run_status}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* CENTER + RIGHT WORKSPACE (9 cols) */}
        <div className="lg:col-span-9 flex flex-col gap-3">
          {/* TOP BAR: Connection Name + Postman URL Bar */}
          <Card className="shrink-0 border-border/70">
            <CardContent className="p-3 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-5">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome da Conexão (ex: ERP Bling - Produtos)"
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="md:col-span-7">
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição opcional (ex: Sincroniza catálogo e preços via REST JSON)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* HTTP Method + URL + Send Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  aria-label="Método HTTP"
                  className="h-9 px-3 rounded-lg border border-border bg-surface font-mono text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.plataformaexterna.com.br/v1/produtos?limit=100"
                    className="h-9 font-mono text-xs pr-24"
                  />
                  <span className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    REST / JSON
                  </span>
                </div>

                <Button
                  onClick={handleSendRequest}
                  isLoading={isTestingHttp}
                  className="h-9 px-4 text-xs font-bold shrink-0 shadow-sm shadow-primary/20"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  Disparar Requisição
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SPLIT PANELS: Request Builder & Service Mapper (Left 7 cols) + Response & Dry-Run Inspector (Right 5 cols) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* LEFT PANEL: Request Config & Visual Field Mapper */}
            <Card className="xl:col-span-7 flex flex-col min-h-0 overflow-hidden border-border/70">
              {/* Tabs Header */}
              <div className="flex items-center gap-1 px-2.5 pt-2 border-b border-border bg-muted/20 overflow-x-auto shrink-0">
                {[
                  {
                    id: 'mapping',
                    label: `Vinculação (${activeSchema.shortLabel})`,
                    badge: Object.values(fieldMappings).filter((m) => m.sourcePath).length,
                  },
                  {
                    id: 'auth',
                    label: 'Autenticação',
                    badge: authType !== 'NONE' ? authType : undefined,
                  },
                  {
                    id: 'params',
                    label: 'Params',
                    badge: queryParams.filter((q) => q.enabled && q.key).length || undefined,
                  },
                  {
                    id: 'headers',
                    label: 'Headers',
                    badge: headers.filter((h) => h.enabled && h.key).length || undefined,
                  },
                  {
                    id: 'body',
                    label: 'Body JSON',
                    badge: bodyType !== 'none' ? bodyType.toUpperCase() : undefined,
                  },
                  {
                    id: 'logs',
                    label: 'Histórico',
                    badge: integrationLogs.length || undefined,
                  },
                ].map((tab) => {
                  const active = builderTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBuilderTab(tab.id as typeof builderTab)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'border-primary text-primary bg-surface rounded-t-lg'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0 rounded-full bg-primary/10 text-primary">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {/* TAB 1: VISUAL SERVICE MAPPER (DE -> PARA) */}
                {builderTab === 'mapping' && (
                  <div className="space-y-3">
                    {/* Root Path & Unique Key Bar */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Caminho da Lista no JSON (Root Path)
                        </label>
                        <div className="flex gap-1.5">
                          <Input
                            value={responseRootPath}
                            onChange={(e) => setResponseRootPath(e.target.value)}
                            placeholder="$ p/ Array na raiz, ou ex: data.items"
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        {detectedArrays.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            <span className="text-[10px] text-muted-foreground">Detectados:</span>
                            {detectedArrays.map((arr) => (
                              <button
                                key={arr.path}
                                type="button"
                                onClick={() => setResponseRootPath(arr.path)}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border cursor-pointer ${
                                  responseRootPath === arr.path
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {arr.path} ({arr.count})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Chave Única de Conciliação (Upsert)
                        </label>
                        <select
                          value={upsertKey}
                          onChange={(e) => setUpsertKey(e.target.value)}
                          aria-label="Chave Única de Conciliação"
                          className="w-full h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-medium"
                        >
                          {activeSchema.upsertOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAutoMap}
                          className="w-full h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          Auto-Mapear
                        </Button>
                      </div>
                    </div>

                    {/* De -> Para Table */}
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                            <th className="py-2 px-2.5">Campo Olivelas ({activeSchema.shortLabel})</th>
                            <th className="py-2 px-2.5">Campo na API Externa (JSON Path)</th>
                            <th className="py-2 px-2.5">Transformador</th>
                            <th className="py-2 px-2.5">Valor Padrão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs">
                          {activeSchema.fields.map((schemaField) => {
                            const rule = fieldMappings[schemaField.field] || {
                              sourcePath: '',
                              transform: schemaField.defaultTransform,
                              defaultValue: '',
                            }

                            const updateRule = (patch: Partial<typeof rule>) => {
                              setFieldMappings((prev) => ({
                                ...prev,
                                [schemaField.field]: {
                                  ...rule,
                                  ...patch,
                                },
                              }))
                            }

                            return (
                              <tr key={schemaField.field} className="hover:bg-muted/20">
                                <td className="py-2 px-2.5 align-middle">
                                  <div className="font-semibold text-foreground flex items-center gap-1">
                                    <span>{schemaField.label}</span>
                                    {schemaField.required && (
                                      <span className="text-danger font-bold" title="Obrigatório">
                                        *
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-muted-foreground">
                                    {schemaField.field} ({schemaField.type})
                                  </div>
                                </td>

                                <td className="py-2 px-2.5 align-middle">
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      value={rule.sourcePath}
                                      onChange={(e) => updateRule({ sourcePath: e.target.value })}
                                      placeholder={schemaField.placeholder || `Ex: ${schemaField.field}`}
                                      list={`json-keys-${schemaField.field}`}
                                      className="h-7 text-xs font-mono"
                                    />
                                    {availableSampleKeys.length > 0 && (
                                      <datalist id={`json-keys-${schemaField.field}`}>
                                        {availableSampleKeys.map((k) => (
                                          <option key={k.path} value={k.path}>
                                            {k.sampleValue}
                                          </option>
                                        ))}
                                      </datalist>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2 px-2.5 align-middle">
                                  <select
                                    value={rule.transform}
                                    onChange={(e) =>
                                      updateRule({
                                        transform: e.target.value as FieldTransformType,
                                      })
                                    }
                                    aria-label={`Transformador para ${schemaField.label}`}
                                    className="w-full h-7 px-2 rounded border border-border bg-surface text-[11px]"
                                  >
                                    {(Object.keys(TRANSFORMER_LABELS) as FieldTransformType[]).map(
                                      (tKey) => (
                                        <option key={tKey} value={tKey}>
                                          {TRANSFORMER_LABELS[tKey]}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </td>

                                <td className="py-2 px-2.5 align-middle">
                                  <Input
                                    value={rule.defaultValue || ''}
                                    onChange={(e) => updateRule({ defaultValue: e.target.value })}
                                    placeholder="Opcional"
                                    className="h-7 text-xs"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: AUTHENTICATION */}
                {builderTab === 'auth' && (
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <label className="text-xs font-semibold block mb-1.5">
                        Tipo de Autenticação da API Externa
                      </label>
                      <select
                        value={authType}
                        onChange={(e) => setAuthType(e.target.value as IntegrationAuthType)}
                        aria-label="Tipo de Autenticação"
                        className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs font-semibold"
                      >
                        <option value="NONE">Sem Autenticação (Pública)</option>
                        <option value="BEARER">Bearer Token (JWT / OAuth2 / Supabase)</option>
                        <option value="API_KEY">API Key (Header ou Query String)</option>
                        <option value="BASIC">Basic Auth (Usuário e Senha)</option>
                        <option value="CUSTOM_HEADER">Header Customizado</option>
                      </select>
                    </div>

                    {authType !== 'NONE' && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                          Credenciais protegidas por RLS multi-tenant (visíveis apenas para administradores da loja).
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSecrets(!showSecrets)}
                          className="flex items-center gap-1 text-primary font-semibold ml-2 shrink-0"
                        >
                          {showSecrets ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" /> Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" /> Revelar
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {authType === 'BEARER' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">Bearer Token</label>
                        <Input
                          type={showSecrets ? 'text' : 'password'}
                          value={authConfig.bearerToken || ''}
                          onChange={(e) =>
                            setAuthConfig({ ...authConfig, bearerToken: e.target.value })
                          }
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="font-mono text-xs"
                        />
                      </div>
                    )}

                    {authType === 'API_KEY' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1">Nome da Chave</label>
                          <Input
                            value={authConfig.apiKeyName || 'x-api-key'}
                            onChange={(e) =>
                              setAuthConfig({ ...authConfig, apiKeyName: e.target.value })
                            }
                            placeholder="x-api-key ou access_token"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Valor da API Key</label>
                          <Input
                            type={showSecrets ? 'text' : 'password'}
                            value={authConfig.apiKeyValue || ''}
                            onChange={(e) =>
                              setAuthConfig({ ...authConfig, apiKeyValue: e.target.value })
                            }
                            placeholder="sk_live_..."
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Enviar em</label>
                          <select
                            value={authConfig.apiKeyIn || 'header'}
                            onChange={(e) =>
                              setAuthConfig({
                                ...authConfig,
                                apiKeyIn: e.target.value as 'header' | 'query',
                              })
                            }
                            aria-label="Enviar API Key em"
                            className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-xs"
                          >
                            <option value="header">Cabeçalho HTTP (Header)</option>
                            <option value="query">Parâmetro de URL (Query)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {authType === 'BASIC' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1">Usuário / Client ID</label>
                          <Input
                            value={authConfig.basicUsername || ''}
                            onChange={(e) =>
                              setAuthConfig({ ...authConfig, basicUsername: e.target.value })
                            }
                            placeholder="usuario_api"
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Senha / Client Secret</label>
                          <Input
                            type={showSecrets ? 'text' : 'password'}
                            value={authConfig.basicPassword || ''}
                            onChange={(e) =>
                              setAuthConfig({ ...authConfig, basicPassword: e.target.value })
                            }
                            placeholder="••••••••••••"
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {authType === 'CUSTOM_HEADER' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1">Nome do Header</label>
                          <Input
                            value={authConfig.customHeaders?.[0]?.key || ''}
                            onChange={(e) =>
                              setAuthConfig({
                                ...authConfig,
                                customHeaders: [
                                  {
                                    key: e.target.value,
                                    value: authConfig.customHeaders?.[0]?.value || '',
                                  },
                                ],
                              })
                            }
                            placeholder="X-Shopify-Access-Token"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Valor do Header</label>
                          <Input
                            type={showSecrets ? 'text' : 'password'}
                            value={authConfig.customHeaders?.[0]?.value || ''}
                            onChange={(e) =>
                              setAuthConfig({
                                ...authConfig,
                                customHeaders: [
                                  {
                                    key: authConfig.customHeaders?.[0]?.key || 'X-Custom-Token',
                                    value: e.target.value,
                                  },
                                ],
                              })
                            }
                            placeholder="shpat_..."
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: QUERY PARAMS */}
                {builderTab === 'params' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Parâmetros de consulta anexados à URL (suporta variáveis como{' '}
                        <code className="font-mono text-primary">{'{{store_id}}'}</code>)
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQueryParams([...queryParams, createEmptyKeyValue()])}
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Parâmetro
                      </Button>
                    </div>
                    {queryParams.map((param, idx) => (
                      <div key={param.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          onChange={(e) => {
                            const next = [...queryParams]
                            next[idx] = { ...param, enabled: e.target.checked }
                            setQueryParams(next)
                          }}
                          className="rounded border-border"
                        />
                        <Input
                          value={param.key}
                          onChange={(e) => {
                            const next = [...queryParams]
                            next[idx] = { ...param, key: e.target.value }
                            setQueryParams(next)
                          }}
                          placeholder="Chave (ex: limit, page, status)"
                          className="h-8 text-xs font-mono"
                        />
                        <Input
                          value={param.value}
                          onChange={(e) => {
                            const next = [...queryParams]
                            next[idx] = { ...param, value: e.target.value }
                            setQueryParams(next)
                          }}
                          placeholder="Valor (ex: 100, {{store_id}})"
                          className="h-8 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setQueryParams(queryParams.filter((_, i) => i !== idx))
                          }
                          className="p-1.5 text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 4: HEADERS */}
                {builderTab === 'headers' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Cabeçalhos HTTP enviados na requisição
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHeaders([...headers, createEmptyKeyValue()])}
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Header
                      </Button>
                    </div>
                    {headers.map((hdr, idx) => (
                      <div key={hdr.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hdr.enabled}
                          onChange={(e) => {
                            const next = [...headers]
                            next[idx] = { ...hdr, enabled: e.target.checked }
                            setHeaders(next)
                          }}
                          className="rounded border-border"
                        />
                        <Input
                          value={hdr.key}
                          onChange={(e) => {
                            const next = [...headers]
                            next[idx] = { ...hdr, key: e.target.value }
                            setHeaders(next)
                          }}
                          placeholder="Header (ex: Accept, X-Tenant-ID)"
                          className="h-8 text-xs font-mono"
                        />
                        <Input
                          value={hdr.value}
                          onChange={(e) => {
                            const next = [...headers]
                            next[idx] = { ...hdr, value: e.target.value }
                            setHeaders(next)
                          }}
                          placeholder="Valor (ex: application/json)"
                          className="h-8 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                          className="p-1.5 text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 5: BODY JSON */}
                {builderTab === 'body' && (
                  <div className="space-y-2.5 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(['none', 'json', 'raw'] as const).map((bType) => (
                          <button
                            key={bType}
                            type="button"
                            onClick={() => setBodyType(bType)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border cursor-pointer uppercase ${
                              bodyType === bType
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-surface border-border text-muted-foreground'
                            }`}
                          >
                            {bType}
                          </button>
                        ))}
                      </div>
                      {bodyType === 'json' && (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              setBodyContent(JSON.stringify(JSON.parse(bodyContent), null, 2))
                            } catch {
                              // ignore invalid JSON
                            }
                          }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Formatar JSON
                        </button>
                      )}
                    </div>

                    {bodyType === 'none' ? (
                      <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                        Esta requisição não possui corpo (Body). Selecione <strong>JSON</strong> para enviar payload em chamadas POST/PUT/PATCH.
                      </div>
                    ) : (
                      <textarea
                        value={bodyContent}
                        onChange={(e) => setBodyContent(e.target.value)}
                        rows={8}
                        className="w-full flex-1 p-3 rounded-xl border border-border bg-surface font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder='{"query": "...", "page": 1}'
                      />
                    )}
                  </div>
                )}

                {/* TAB 6: EXECUTION LOGS */}
                {builderTab === 'logs' && (
                  <div className="space-y-2">
                    {integrationLogs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        Nenhuma sincronização executada ainda.
                      </div>
                    ) : (
                      integrationLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-xl border border-border/70 bg-surface flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold flex items-center gap-2">
                              <Badge
                                variant={
                                  log.status === 'SUCCESS'
                                    ? 'success'
                                    : log.status === 'PARTIAL'
                                      ? 'warning'
                                      : 'danger'
                                }
                              >
                                {log.status}
                              </Badge>
                              <span>{SERVICE_SCHEMAS[log.target_service]?.label}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                HTTP {log.http_status || 200} • {log.duration_ms}ms
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Lidos: <strong>{log.records_fetched}</strong> • Criados:{' '}
                              <strong className="text-emerald-600">{log.records_created}</strong> • Atualizados:{' '}
                              <strong className="text-blue-600">{log.records_updated}</strong> • Erros:{' '}
                              <strong>{log.records_failed}</strong>
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* RIGHT PANEL: Response Inspector & Dry-Run Simulator (5 cols) */}
            <Card className="xl:col-span-5 flex flex-col min-h-0 overflow-hidden border-border/70">
              {/* Inspector Header with Status Badge & Sync Button */}
              <div className="p-2.5 border-b border-border bg-muted/30 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    2. Inspetor & Simulação
                  </span>
                  {httpResponse && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          httpResponse.ok
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {httpResponse.status || 'ERR'} {httpResponse.statusText}
                      </span>
                      <span className="text-muted-foreground">{httpResponse.durationMs}ms</span>
                      <span className="text-muted-foreground">
                        {(httpResponse.sizeBytes / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  )}
                </div>

                {dryRunStats.validTotal > 0 && (
                  <Button
                    size="sm"
                    onClick={handleExecuteSync}
                    isLoading={isSyncing}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Sincronizar {dryRunStats.validTotal} Itens
                  </Button>
                )}
              </div>

              {/* Inspector Sub-Tabs */}
              <div className="flex items-center gap-1 px-2 pt-1.5 border-b border-border bg-surface shrink-0 overflow-x-auto">
                {[
                  {
                    id: 'dryrun',
                    label: `Simulação (${dryRunRows.length})`,
                    icon: ArrowRight,
                  },
                  { id: 'json', label: 'JSON Bruto', icon: FileJson },
                  {
                    id: 'table',
                    label: `Tabela (${activeExtractedArray.length})`,
                    icon: TableIcon,
                  },
                  { id: 'headers', label: 'Headers', icon: History },
                  { id: 'curl', label: 'cURL', icon: Code2 },
                ].map((tItem) => {
                  const Icon = tItem.icon
                  const active = inspectorTab === tItem.id
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => setInspectorTab(tItem.id as typeof inspectorTab)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {tItem.label}
                    </button>
                  )
                })}
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {!httpResponse && inspectorTab !== 'curl' ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2.5">
                    <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Play className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      Pronto para testar a integração
                    </div>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      Clique em <strong>Disparar Requisição</strong> acima para buscar os dados ao vivo da API externa, auto-mapear os campos e simular o Upsert em{' '}
                      <strong>{activeSchema.label}</strong>.
                    </p>
                  </div>
                ) : inspectorTab === 'dryrun' ? (
                  <div className="space-y-3">
                    {/* Summary Counters */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <div className="text-sm font-bold text-emerald-600">
                          +{dryRunStats.createCount}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Novos (Criar)
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                        <div className="text-sm font-bold text-blue-600">
                          ~{dryRunStats.updateCount}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Existentes (Atualizar)
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                        <div className="text-sm font-bold text-rose-600">
                          {dryRunStats.invalidCount}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                          Inválidos
                        </div>
                      </div>
                    </div>

                    {isSimulating ? (
                      <div className="text-xs text-center py-6 text-muted-foreground">
                        Comparando payload com o banco de dados da loja...
                      </div>
                    ) : dryRunRows.length === 0 ? (
                      <div className="text-xs text-center py-6 text-muted-foreground">
                        Nenhum item extraído no caminho{' '}
                        <code className="font-mono">{responseRootPath || '$'}</code>. Verifique a aba JSON Bruto.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dryRunRows.slice(0, 25).map((row) => (
                          <div
                            key={row.index}
                            className="p-2.5 rounded-xl border border-border/70 bg-surface space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                Item #{row.index + 1} • Chave:{' '}
                                <strong className="text-foreground">
                                  {row.upsertMatchValue || '(vazio)'}
                                </strong>
                              </span>
                              <Badge
                                variant={
                                  row.action === 'CREATE'
                                    ? 'success'
                                    : row.action === 'UPDATE'
                                      ? 'default'
                                      : 'danger'
                                }
                              >
                                {row.action === 'CREATE'
                                  ? 'CRIAR NOVO'
                                  : row.action === 'UPDATE'
                                    ? 'ATUALIZAR'
                                    : 'INVÁLIDO'}
                              </Badge>
                            </div>

                            {row.validationError && (
                              <div className="text-[11px] text-danger font-medium">
                                {row.validationError}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-border/40 text-[11px]">
                              {Object.entries(row.mappedData)
                                .filter(([, val]) => val !== '' && val !== null && val !== undefined)
                                .slice(0, 6)
                                .map(([k, val]) => (
                                  <div key={k} className="truncate">
                                    <span className="text-muted-foreground font-mono">{k}: </span>
                                    <span className="font-semibold text-foreground">
                                      {String(val)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : inspectorTab === 'json' ? (
                  <div className="space-y-2">
                    {httpResponse?.errorMessage && (
                      <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
                        {httpResponse.errorMessage}
                      </div>
                    )}
                    <pre className="p-3 rounded-xl bg-muted/50 border border-border font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                      {httpResponse?.rawBody || 'Sem resposta'}
                    </pre>
                  </div>
                ) : inspectorTab === 'table' ? (
                  <div className="overflow-x-auto border border-border rounded-xl">
                    {activeExtractedArray.length === 0 ? (
                      <div className="p-4 text-xs text-muted-foreground text-center">
                        Nenhum array encontrado no caminho selecionado.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-muted/60 border-b border-border font-mono">
                            {Object.keys(activeExtractedArray[0] || {})
                              .slice(0, 6)
                              .map((col) => (
                                <th key={col} className="py-1.5 px-2">
                                  {col}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activeExtractedArray.slice(0, 20).map((rec, idx) => (
                            <tr key={idx}>
                              {Object.keys(activeExtractedArray[0] || {})
                                .slice(0, 6)
                                .map((col) => (
                                  <td key={col} className="py-1.5 px-2 truncate max-w-[140px]">
                                    {typeof rec[col] === 'object'
                                      ? JSON.stringify(rec[col])
                                      : String(rec[col] ?? '')}
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : inspectorTab === 'headers' ? (
                  <div className="space-y-1">
                    {Object.entries(httpResponse?.headers || {}).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-start justify-between gap-2 py-1.5 border-b border-border/50 text-xs font-mono"
                      >
                        <span className="font-semibold text-foreground">{k}</span>
                        <span className="text-muted-foreground break-all text-right">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Comando cURL Equivalente
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            generateCurlCommand(currentRequestConfig, !showSecrets),
                          )
                          setCopiedCurl(true)
                          setTimeout(() => setCopiedCurl(false), 2000)
                        }}
                        className="h-7 text-xs"
                      >
                        {copiedCurl ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-emerald-500" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" /> Copiar cURL
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="p-3 rounded-xl bg-muted/50 border border-border font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                      {generateCurlCommand(currentRequestConfig, !showSecrets)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* MODAL: Import cURL */}
      <Modal
        isOpen={isCurlModalOpen}
        onClose={() => setIsCurlModalOpen(false)}
        title="Importar Comando cURL"
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Cole abaixo qualquer comando <code className="font-mono">curl</code> copiado do Postman, Insomnia ou documentação de API externa. O Olivelas extrairá automaticamente o método, URL, headers, token Bearer/API Key e payload JSON.
          </p>
          <textarea
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            rows={6}
            placeholder={`curl --request GET \\\n  --url 'https://dummyjson.com/products?limit=10' \\\n  --header 'Authorization: Bearer seu_token_aqui'`}
            className="w-full p-3 rounded-xl border border-border bg-surface font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCurlModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleImportCurl}>
              Importar e Preencher
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Presets / Templates */}
      <Modal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        title="Templates Prontos de Integração API"
      >
        <div className="space-y-2.5">
          <p className="text-xs text-muted-foreground">
            Selecione um conector pré-configurado para testar imediatamente a busca de dados e o mapeamento De → Para com os serviços do Olivelas:
          </p>
          {INTEGRATION_PRESETS.map((preset, index) => {
            const Icon = SERVICE_ICONS[preset.target_service]
            return (
              <div
                key={preset.id}
                className="p-3 rounded-xl border border-border hover:border-primary/60 bg-surface flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">{preset.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {SERVICE_SCHEMAS[preset.target_service].label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{preset.description}</p>
                  <code className="text-[10px] font-mono text-primary block">{preset.url}</code>
                </div>
                <Button size="sm" onClick={() => handleApplyPreset(index)} className="shrink-0">
                  Usar Template
                </Button>
              </div>
            )
          })}
        </div>
      </Modal>

      {/* MODAL: Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingIntegration)}
        onClose={() => setDeletingIntegration(null)}
        onConfirm={() => {
          if (deletingIntegration) deleteMutation.mutate(deletingIntegration.id)
        }}
        title="Excluir Conexão API"
        description={`Tem certeza que deseja remover o conector "${deletingIntegration?.name}"? Os dados já sincronizados em ${
          deletingIntegration ? SERVICE_SCHEMAS[deletingIntegration.target_service]?.label : ''
        } serão preservados.`}
        confirmText="Excluir Conector"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
