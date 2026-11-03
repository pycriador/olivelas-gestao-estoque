import type { ModuleCode } from './permissionGroup.types'

export type AiProviderCode = 'GEMINI' | 'OPENAI' | 'CLAUDE' | 'CUSTOM'

export type AiProtectionLevel = 'STRICT' | 'MODERATE' | 'AUDIT_ONLY'

export type AiPersonaTone =
  | 'EXECUTIVO'
  | 'COMERCIAL'
  | 'AUDITOR'
  | 'PRATICO'
  | 'CONSULTIVO'
  | 'PERSONALIZADO'

export type AiTaskType =
  | 'CHAT_COPILOT'
  | 'MONTHLY_SALES_SUMMARY'
  | 'DASHBOARD_EXECUTIVE_SUMMARY'
  | 'TOP_PRODUCTS_EVALUATION'
  | 'EXPIRATION_WARNING'
  | 'EXPIRATION_RISK_ANALYSIS'
  | 'PURCHASING_TRENDS'
  | 'PURCHASING_TRENDS_FORECAST'
  | 'CUSTOMER_PRODUCT_SUGGESTION'
  | 'CUSTOMER_PRODUCT_RECOMMENDATION'
  | 'POS_CROSS_SELL'
  | 'POS_CROSS_SELL_SUGGESTION'
  | 'INVENTORY_OPTIMIZATION'
  | 'REPORT_EXPLANATION'
  | 'REPORT_DEEP_DIVE'
  | 'WHAT_IF_SIMULATION'

export type AiSiteSectionKey =
  | 'CHAT_COPILOT'
  | 'DASHBOARD_SUMMARY'
  | 'POS_CROSS_SELL'
  | 'CRM_CUSTOMERS'
  | 'EXPIRATION_FEFO'
  | 'INVENTORY_STOCK'
  | 'PURCHASING_TRENDS'
  | 'REPORTS_BI'

export interface AiDiscoveredModel {
  id: string
  displayName: string
  description?: string
  inputTokenLimit?: number
  outputTokenLimit?: number
  recommendedTier: 'default' | 'fast' | 'reasoning'
}

export interface AiProviderConfig {
  id: string
  providerCode: AiProviderCode
  displayName: string
  isEnabled: boolean
  isPrimary: boolean
  fallbackPriority: number
  hasApiKey: boolean
  maskedApiKey: string | null
  defaultModel: string
  fastModel: string
  reasoningModel: string
  availableModels: string[]
  sectionModels?: Record<AiSiteSectionKey, string>
  baseUrl: string | null
  customHeaders: Record<string, string>
  temperature: number
  maxOutputTokens: number
  timeoutMs: number
  monthlyTokenLimit: number
  systemGlobalInstructions: string | null
  promptInjectionProtectionLevel: AiProtectionLevel
  enableLocalAnalyticalFallback: boolean
  lastTestedAt: string | null
  lastTestStatus: 'OK' | 'ERROR' | 'UNTESTED' | null
  lastTestLatencyMs: number | null
  lastTestMessage: string | null
  updatedAt?: string
}

export interface AiPersona {
  id: string
  code: string
  storeId: string | null
  name: string
  roleTitle: string
  description: string
  tone: AiPersonaTone
  avatarIcon: string
  systemPrompt: string
  contextInjectionTemplate: string
  guardrailsRules: string[]
  suggestedQuestions: string[]
  isDefault: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AiStoreConfig {
  storeId: string
  activePersonaId: string | null
  businessNiche: string
  targetMarginPercent: number
  expirationWarningDays: number
  customStoreInstructions: string | null
  promptInjectionCustomContext: string | null
  enableAntiPromptInjection: boolean
  enableProactiveExpirationAlerts: boolean
  enablePosProductSuggestions: boolean
  monthlyRequestsQuota: number
  updatedAt?: string
}

export interface AiActionSuggestion {
  id: string
  label: string
  description?: string
  actionType: 'NAVIGATE' | 'COPY_TEXT' | 'FOLLOWUP_PROMPT'
  targetRoute?: string
  route?: string
  copyText?: string
  whatsappText?: string
  followUpPrompt?: string
  badge?: string
}

export interface AiInsightHighlight {
  label: string
  value: string
  title?: string
  metric?: string
  description?: string
  severity?: 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO'
  trend?: 'up' | 'down' | 'warning' | 'neutral'
  helperText?: string
}

export interface AiExecutionResult {
  content: string
  answer: string
  providerUsed: AiProviderCode | 'LOCAL_ANALYTICAL_ENGINE'
  modelUsed: string
  personaCode: string
  personaName: string
  personaUsed: {
    code: string
    name: string
  }
  fallbackTriggered: boolean
  fallbackReason?: string
  promptInjectionFlagged: boolean
  promptInjectionBlocked: boolean
  promptInjectionReason?: string
  latencyMs: number
  estimatedTokens: number
  highlights: AiInsightHighlight[]
  actionSuggestions: AiActionSuggestion[]
  createdAt: string
}

export interface AiChatSession {
  id: string
  storeId: string | null
  userId: string
  personaCode: string
  title: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface AiChatMessage {
  id: string
  sessionId: string
  storeId: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  providerUsed?: string
  modelUsed?: string
  personaCode?: string
  fallbackTriggered?: boolean
  promptInjectionFlagged?: boolean
  actionSuggestions?: AiActionSuggestion[]
  highlights?: AiInsightHighlight[]
  latencyMs?: number
  createdAt: string
}

export interface AiUsageLog {
  id: string
  storeId: string | null
  storeName?: string
  userId: string | null
  moduleCode: ModuleCode | string
  featureKey: string
  providerCode: string
  modelUsed: string
  personaCode: string | null
  fallbackUsed: boolean
  promptInjectionBlocked: boolean
  estimatedTokens: number
  latencyMs: number
  status: 'SUCCESS' | 'FALLBACK_LOCAL' | 'BLOCKED_INJECTION' | 'ERROR'
  errorMessage?: string | null
  createdAt: string
}

export interface StoreAiContextSnapshot {
  storeId: string
  storeName: string
  generatedAt: string
  monthlyRevenue: number
  monthlyOrdersCount: number
  estimatedGrossMarginPercent: number
  expiringWithin30DaysCount: number
  expiredBatchesCount: number
  atRiskExpirationValue: number
  lowStockCount: number
  outOfStockCount: number
  totalCustomersCount: number
  inactiveCustomersCount: number
  summaryKpis: {
    totalActiveProducts: number
    totalPhysicalUnits: number
    totalCostValuation: number
    totalSellingValuation: number
    potentialProfit: number
    marginPercent: number
    stockoutsCount: number
    lowStockCount: number
    monthSalesTotal: number
    lossesTotalValue: number
  }
  topSellingProducts: Array<{
    name: string
    sku: string
    category: string
    monthlySalesQty: number
    currentStock: number
    sellingPrice: number
    marginPercent: number
    classification: string
  }>
  expiringBatches: Array<{
    productName: string
    lotNumber: string
    quantity: number
    expirationDate: string
    daysUntilExpiration: number
    atRiskValue: number
  }>
  replenishmentAlerts: Array<{
    productName: string
    sku: string
    currentStock: number
    minStock: number
    suggestedPurchaseQty: number
    dailyConsumption: number
    stockCoverageDays: number
    suggestedInvestment: number
    urgency: string
  }>
  topCustomers: Array<{
    name: string
    phone?: string
    segment: string
    totalOrders: number
    totalSpent: number
    averageTicket: number
    daysSinceLastOrder: number
    favoriteProducts: string[]
  }>
}
