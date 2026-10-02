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

export interface PurchasingReportItem {
  id: string
  orderNumber: string
  supplierName: string
  itemsCount: number
  totalCost: number
  totalSellingValue: number
  potentialProfit: number
  marginPercent: number
  status: string
  issuedAt: string | null
  receivedAt: string | null
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

export interface SalesReportItem {
  id: string
  orderNumber: string
  customerName: string
  channel: string
  itemsCount: number
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

export interface CustomerTicketReportItem {
  customerId: string
  customerName: string
  document: string | null
  phone: string | null
  email: string | null
  status: string
  totalOrders: number
  totalSpent: number
  averageTicket: number
  lastOrderDate: string | null
  daysSinceLastOrder: number
  topChannel: string
  customerSegment: 'VIP' | 'FREQUENT' | 'OCCASIONAL' | 'INACTIVE'
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
