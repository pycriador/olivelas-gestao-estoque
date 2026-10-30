export type ModuleCode =
  | 'MOD_CATALOG_WA'
  | 'MOD_POS_SALES'
  | 'MOD_INVENTORY'
  | 'MOD_EXPIRATION'
  | 'MOD_PURCHASING'
  | 'MOD_SUPPLIERS'
  | 'MOD_CUSTOMERS'
  | 'MOD_REPORTS'
  | 'MOD_TEAM_AUDIT'
  | 'MOD_API_INTEGRATIONS'

export type ModuleCategory =
  | 'VENDAS'
  | 'CATALOGO_ESTOQUE'
  | 'COMPRAS_SUPRIMENTOS'
  | 'GESTAO_BI'
  | 'TECNOLOGIA'

export type BillingCycle = 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'FREE_TRIAL' | 'CUSTOM'

export type SubscriptionPaymentStatus =
  | 'ACTIVE'
  | 'TRIAL'
  | 'PENDING'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXEMPT'

export type InvoicePaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'

export type InvoicePaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'TRANSFER' | 'CASH' | 'OTHER'

export interface PermissionModule {
  code: ModuleCode
  name: string
  description: string
  category: ModuleCategory
  routes: string[]
  permissions: string[]
  monthlyPrice: number
  sortOrder: number
  isActive: boolean
}

export interface PermissionGroup {
  id: string
  code: string
  name: string
  description: string
  badgeColor: string
  enabledModules: ModuleCode[]
  enabledPermissions: string[]
  baseMonthlyPrice: number
  annualPrice: number
  setupFee: number
  isSystemDefault: boolean
  isActive: boolean
  showOnLandingPage?: boolean
  isHighlightedOnLanding?: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface UserPermissionProfile {
  id: string
  userId: string
  storeId: string | null
  permissionGroupId: string | null
  permissionGroup?: PermissionGroup | null
  customPlanName: string | null
  enforceOverStoreAdmin: boolean
  enabledModules: ModuleCode[]
  grantedPermissions: string[]
  revokedPermissions: string[]
  billingCycle: BillingCycle
  calculatedMonthlyValue: number
  discountAmount: number
  agreedMonthlyValue: number
  setupFeeCharged: number
  paymentStatus: SubscriptionPaymentStatus
  blockOnOverdue: boolean
  billingDay: number
  trialEndsAt: string | null
  nextDueDate: string | null
  lastPaymentAt: string | null
  commercialNotes: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface SubscriptionPayment {
  id: string
  userPermissionProfileId: string | null
  userId: string
  storeId: string | null
  referenceMonth: string
  description: string
  snapshotPlanName: string | null
  snapshotModules: ModuleCode[]
  amount: number
  discountAmount: number
  paidAmount: number
  paymentMethod: InvoicePaymentMethod
  status: InvoicePaymentStatus
  dueDate: string
  paidAt: string | null
  externalTransactionId: string | null
  receiptUrl: string | null
  notes: string | null
  recordedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface PermissionBillingAuditLog {
  id: string
  targetUserId: string
  storeId: string | null
  actorUserId: string | null
  eventType:
    | 'GROUP_ASSIGNED'
    | 'MODULES_CHANGED'
    | 'PRICE_UPDATED'
    | 'PAYMENT_CREATED'
    | 'PAYMENT_MARKED_PAID'
    | 'PAYMENT_STATUS_CHANGED'
    | 'GROUP_CATALOG_UPDATED'
    | 'BILLING_RULES_UPDATED'
  summary: string
  previousState: Record<string, any>
  newState: Record<string, any>
  createdAt: string
}

export interface PlatformBillingRules {
  id: string
  defaultFreeEmployeesPerStore: number
  defaultExtraEmployeePrice: number
  countStoreAdminsInQuota: boolean
  gracePeriodDays: number
  autoBlockOverdue: boolean
  pixKey: string | null
  billingSupportWhatsapp: string | null
  notes: string | null
  storeOverrides?: Record<
    string,
    {
      freeEmployeesLimit?: number | null
      extraEmployeePrice?: number | null
    }
  >
  updatedBy?: string | null
  updatedAt: string
}

export interface StoreEmployeeLicenseSummary {
  storeId: string
  storeName: string
  storeSlug: string
  isBranch: boolean
  parentStoreId: string | null
  branchCode: string | null
  storeAdminUsers: Array<{
    userId: string
    fullName: string | null
    email: string
  }>
  totalMembersCount: number
  storeAdminsCount: number
  activeEmployeesCount: number
  inactiveEmployeesCount: number
  freeEmployeesQuota: number
  extraBillableEmployees: number
  extraEmployeeUnitPrice: number
  extraEmployeesMonthlyCost: number
  hasCustomStoreOverride: boolean
}

export type DependencySeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface ScreenDependencyImpact {
  disabledModule: ModuleCode
  disabledModuleName: string
  affectedModule?: ModuleCode
  affectedScreens: string[]
  severity: DependencySeverity
  title: string
  whatStopsWorking: string[]
  whatStillWorks: string[]
  suggestedQuickFix?: {
    label: string
    action: 'ENABLE_MODULE' | 'DISABLE_DEPENDENT'
    targetModule: ModuleCode
  }
}
