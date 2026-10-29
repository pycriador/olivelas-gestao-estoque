export type IntegrationTargetService =
  | 'customers'
  | 'categories'
  | 'products'
  | 'suppliers'
  | 'inventory'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type IntegrationAuthType = 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC' | 'CUSTOM_HEADER'

export type IntegrationBodyType = 'none' | 'json' | 'form-urlencoded' | 'raw'

export type FieldTransformType =
  | 'NONE'
  | 'TRIM'
  | 'DIGITS_ONLY'
  | 'CURRENCY_NUMBER'
  | 'UPPERCASE'
  | 'LOWERCASE'
  | 'BOOLEAN'
  | 'AUTO_SKU'

export interface KeyValueParam {
  id: string
  key: string
  value: string
  description?: string
  enabled: boolean
}

export interface IntegrationAuthConfig {
  bearerToken?: string
  apiKeyName?: string
  apiKeyValue?: string
  apiKeyIn?: 'header' | 'query'
  basicUsername?: string
  basicPassword?: string
  customHeaders?: Array<{ key: string; value: string }>
}

export interface FieldMappingRule {
  sourcePath: string
  transform: FieldTransformType
  defaultValue?: string
}

export type FieldMappingsMap = Record<string, FieldMappingRule>

export interface ApiIntegrationConnector {
  id: string
  store_id: string | null
  name: string
  description: string | null
  target_service: IntegrationTargetService
  method: HttpMethod
  url: string
  auth_type: IntegrationAuthType
  auth_config: IntegrationAuthConfig
  query_params: KeyValueParam[]
  headers: KeyValueParam[]
  body_type: IntegrationBodyType
  body_content: string
  response_root_path: string
  upsert_key: string
  field_mappings: FieldMappingsMap
  is_active: boolean
  last_run_at: string | null
  last_run_status: 'SUCCESS' | 'PARTIAL' | 'ERROR' | null
  last_run_summary: SyncExecutionSummary | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface DetectedJsonArrayPath {
  path: string
  label: string
  count: number
  sampleItem: Record<string, any> | null
}

export interface HttpExecutionResult {
  ok: boolean
  status: number
  statusText: string
  durationMs: number
  sizeBytes: number
  headers: Record<string, string>
  rawBody: string
  parsedJson: any | null
  detectedArrays: DetectedJsonArrayPath[]
  extractedItems: Record<string, any>[]
  sampleKeys: Array<{ path: string; sampleValue: string; type: string }>
  finalUrl: string
  errorMessage?: string
}

export interface ServiceFieldSpec {
  field: string
  label: string
  required?: boolean
  type: 'string' | 'number' | 'boolean'
  defaultTransform: FieldTransformType
  description: string
  placeholder?: string
  aliases: string[]
}

export interface ServiceSchemaDefinition {
  service: IntegrationTargetService
  label: string
  shortLabel: string
  description: string
  upsertOptions: Array<{ key: string; label: string }>
  defaultUpsertKey: string
  fields: ServiceFieldSpec[]
}

export interface DryRunPreviewRow {
  index: number
  action: 'CREATE' | 'UPDATE' | 'INVALID'
  existingId?: string
  upsertMatchValue?: string
  mappedData: Record<string, any>
  rawSource: Record<string, any>
  validationError?: string
}

export interface SyncExecutionSummary {
  recordsFetched: number
  recordsCreated: number
  recordsUpdated: number
  recordsFailed: number
  durationMs: number
  httpStatus?: number
  errors: string[]
  executedAt: string
}

export interface ApiIntegrationLog {
  id: string
  integration_id: string | null
  store_id: string | null
  integration_name: string
  target_service: IntegrationTargetService
  status: 'SUCCESS' | 'PARTIAL' | 'ERROR'
  http_status: number | null
  duration_ms: number
  records_fetched: number
  records_created: number
  records_updated: number
  records_failed: number
  error_message: string | null
  details: Record<string, any>
  executed_by: string | null
  created_at: string
}

export interface IntegrationPresetTemplate {
  id: string
  name: string
  category: string
  description: string
  target_service: IntegrationTargetService
  method: HttpMethod
  url: string
  auth_type: IntegrationAuthType
  auth_config: IntegrationAuthConfig
  query_params: KeyValueParam[]
  headers: KeyValueParam[]
  body_type: IntegrationBodyType
  body_content: string
  response_root_path: string
  upsert_key: string
  field_mappings: FieldMappingsMap
}
