export interface RetailSummaryKPIs {
  totalProducts: number
  totalPhysicalUnits: number
  totalCostValue: number
  totalSellingValue: number
  potentialProfit: number
  marginPercent: number
  salesTodayTotal: number
  salesMonthTotal: number
  ordersMonthCount: number
  totalLossValueMonth: number
  stockoutCount: number
  lowStockCount: number
  expiredCount: number
  expiring30dCount: number
}

export interface ValuationReportItem {
  id: string
  productId: string
  productName: string
  productSku: string
  categoryName: string
  unit: string
  quantity: number
  minStock: number
  costPrice: number
  sellingPrice: number
  totalCostValue: number
  totalSellingValue: number
  potentialProfit: number
  marginPercent: number
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL' | 'OVERSTOCK'
}

export interface AbcCurveItem {
  productId: string
  productName: string
  productSku: string
  categoryName: string
  unit: string
  quantity: number
  unitCost: number
  unitSelling: number
  totalValue: number
  percentOfTotal: number
  cumulativePercent: number
  classification: 'A' | 'B' | 'C'
  strategy: string
}

export interface ReportDateRangeParams {
  dateFrom?: string | null // YYYY-MM-DD
  dateTo?: string | null // YYYY-MM-DD
}

export interface PurchasingReportLineItem {
  id?: string
  productId?: string | null
  productName: string
  productSku: string
  unit: string
  quantityOrdered: number
  quantityReceived?: number
  unitCost: number
  totalCost: number
  sellingPrice?: number
}

export interface PurchasingReportItem {
  id: string
  orderNumber: string
  supplierName: string
  itemsCount: number
  totalUnitsOrdered?: number
  totalCost: number
  totalSellingValue: number
  potentialProfit: number
  marginPercent: number
  status: string
  createdAt?: string
  issuedAt: string | null
  receivedAt: string | null
  itemsSummary?: string
  itemsList?: PurchasingReportLineItem[]
}

export interface LossesReportItem {
  id: string
  movementType: string
  createdAt: string
  productName: string
  productSku: string
  quantity: number
  unitCost: number
  totalLossValue: number
  reasonCode: string | null
  reasonLabel: string
  costCenterCode: string | null
  operatorName: string
  notes: string | null
}

export interface StockoutReportItem {
  productId: string
  productName: string
  productSku: string
  categoryName: string
  unit: string
  quantity: number
  minStock: number
  deficit: number
  costPrice: number
  sellingPrice: number
  replenishmentCost: number
  urgency: 'CRITICAL' | 'WARNING'
}

export interface SalesReportLineItem {
  id?: string
  productId: string | null
  productName: string
  productSku: string
  unit: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
}

export interface SalesReportItem {
  id: string
  orderNumber: string
  customerId?: string | null
  customerName: string
  customerDocument?: string | null
  customerPhone?: string | null
  channel: string
  paymentMethods?: string
  itemsCount: number
  itemsSummary?: string
  itemsList?: SalesReportLineItem[]
  subtotal: number
  discountAmount: number
  totalAmount: number
  status: string
  createdAt: string
}

export interface ConsumptionDemandReportItem {
  productId: string
  productName: string
  productSku: string
  categoryName: string
  unit: string
  currentStock: number
  minStock: number
  dailyConsumption: number
  monthlySalesQty: number
  stockCoverageDays: number
  suggestedPurchaseQty: number
  unitCost: number
  suggestedInvestment: number
  urgency: 'URGENT' | 'ATTENTION' | 'NORMAL' | 'OVERSTOCK'
}

export interface CustomerReportOrderEntry {
  orderId: string
  orderNumber: string
  createdAt: string
  status: string
  channel: string
  paymentMethods: string
  itemsCount: number
  itemsSummary: string
  subtotal?: number
  discountAmount?: number
  totalAmount: number
}

export interface CustomerTicketReportItem {
  customerId: string
  customerName: string
  document: string | null
  phone: string | null
  email: string | null
  status: string
  totalOrders: number
  openOrdersCount?: number
  closedOrdersCount?: number
  cancelledOrdersCount?: number
  totalSpent: number
  averageTicket: number
  lastOrderDate: string | null
  daysSinceLastOrder: number
  topChannel: string
  customerSegment: 'VIP' | 'FREQUENT' | 'OCCASIONAL' | 'INACTIVE'
  orders?: CustomerReportOrderEntry[]
}

export interface CapitalInvestmentReportItem {
  categoryId: string
  categoryName: string
  productsCount: number
  totalPhysicalUnits: number
  totalInvestedCost: number
  totalSellingPotential: number
  potentialProfit: number
  marginPercent: number
  shareOfTotalInvestment: number
  gmroi: number
}

export type DashboardPeriodPreset =
  | 'TODAY'
  | '7D'
  | '30D'
  | '90D'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'ALL_TIME'
  | 'CUSTOM'

export type DashboardGranularity = 'DAY' | 'WEEK' | 'MONTH'

export interface DashboardStoreOption {
  id: string
  name: string
  slug: string
  isBranch?: boolean
  branchCode?: string | null
  parentStoreId?: string | null
}

export interface DashboardAnalyticsParams {
  selectedStoreId: string // 'ALL' or specific store UUID
  accessibleStores: DashboardStoreOption[]
  dateFrom: string // YYYY-MM-DD
  dateTo: string // YYYY-MM-DD
  channel?: string // 'ALL' | 'IN_STORE' | 'WHATSAPP' | 'ECOMMERCE'
  granularity?: DashboardGranularity
}

export interface DashboardMonthlyPoint {
  monthKey: string
  monthLabel: string
  revenue: number
  profit: number
  ordersCount: number
  unitsSold: number
  averageTicket: number
}

export interface DashboardTimelinePoint {
  bucketKey: string
  label: string
  revenue: number
  profit: number
  ordersCount: number
  unitsSold: number
  averageTicket: number
}

export interface DashboardStorePerformanceItem {
  storeId: string
  storeName: string
  storeSlug: string
  isBranch: boolean
  branchCode: string | null
  parentStoreId: string | null
  revenue: number
  profit: number
  marginPercent: number
  ordersCount: number
  unitsSold: number
  averageTicket: number
  sharePercent: number
  stockCostValue: number
  stockSellingValue: number
  lowStockCount: number
  outOfStockCount: number
}

export interface DashboardTopProductItem {
  productId: string
  productName: string
  productSku: string
  categoryName: string
  unit: string
  imageUrl: string | null
  storeId: string
  storeName: string
  quantitySold: number
  revenue: number
  costTotal: number
  profit: number
  marginPercent: number
  ordersCount: number
  shareOfRevenuePercent: number
  currentStock: number
  minStock: number
}

export interface DashboardCategoryBreakdownItem {
  categoryName: string
  revenue: number
  profit: number
  quantitySold: number
  ordersCount: number
  sharePercent: number
}

export interface DashboardChannelBreakdownItem {
  channel: string
  channelLabel: string
  revenue: number
  ordersCount: number
  averageTicket: number
  sharePercent: number
}

export interface DashboardPaymentBreakdownItem {
  method: string
  methodLabel: string
  amount: number
  transactionsCount: number
  sharePercent: number
}

export interface DashboardWeekdayItem {
  dayIndex: number
  dayLabel: string
  revenue: number
  ordersCount: number
  averageTicket: number
}

export interface DashboardPeriodOrderItem {
  id: string
  orderNumber: string
  storeId: string
  storeName: string
  customerName: string
  channel: string
  paymentMethod: string
  status: string
  itemsCount: number
  subtotal: number
  discountAmount: number
  totalAmount: number
  estimatedProfit: number
  createdAt: string
}

export interface DashboardAnalyticsData {
  kpis: {
    periodRevenue: number
    previousPeriodRevenue: number
    revenueGrowthPercent: number
    periodProfit: number
    periodMarginPercent: number
    periodOrdersCount: number
    previousPeriodOrdersCount: number
    ordersGrowthPercent: number
    averageTicket: number
    previousAverageTicket: number
    ticketGrowthPercent: number
    periodUnitsSold: number
    salesTodayTotal: number
    salesMonthTotal: number
    pendingOrdersCount: number
    cancelledOrdersCount: number
    cancelledAmount: number
    stockCostValuation: number
    stockSellingValuation: number
    lowStockCount: number
    outOfStockCount: number
    expiring30dCount: number
    expiredCount: number
    activeCustomersCount: number
    totalProductsCount: number
  }
  monthlySalesSeries: DashboardMonthlyPoint[]
  timelineSeries: DashboardTimelinePoint[]
  storeComparison: DashboardStorePerformanceItem[]
  topProducts: DashboardTopProductItem[]
  categoryBreakdown: DashboardCategoryBreakdownItem[]
  channelBreakdown: DashboardChannelBreakdownItem[]
  paymentBreakdown: DashboardPaymentBreakdownItem[]
  weekdayBreakdown: DashboardWeekdayItem[]
  periodOrders: DashboardPeriodOrderItem[]
}
