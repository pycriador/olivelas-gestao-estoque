import { supabase } from '@/lib/supabase/client'
import type {
  RetailSummaryKPIs,
  ValuationReportItem,
  AbcCurveItem,
  PurchasingReportItem,
  LossesReportItem,
  StockoutReportItem,
  SalesReportItem,
  ConsumptionDemandReportItem,
  CustomerTicketReportItem,
  CapitalInvestmentReportItem,
  DashboardAnalyticsParams,
  DashboardAnalyticsData,
  DashboardMonthlyPoint,
  DashboardTimelinePoint,
  DashboardStorePerformanceItem,
  DashboardTopProductItem,
  DashboardCategoryBreakdownItem,
  DashboardChannelBreakdownItem,
  DashboardPaymentBreakdownItem,
  DashboardWeekdayItem,
  DashboardPeriodOrderItem,
} from '@/types/report.types'

export const reportService = {
  /**
   * Resumo de Métricas para o Dashboard principal
   */
  async getDashboardMetrics(storeId: string) {
    const today = new Date().toISOString().slice(0, 10)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    // 1. Sales today
    const { data: salesToday } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('store_id', storeId)
      .gte('created_at', today)
      .neq('status', 'CANCELLED')

    const salesTodayTotal = (salesToday || []).reduce((acc: number, o: any) => acc + Number(o.total_amount || 0), 0)

    // 2. Sales this month
    const { data: salesMonth } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('store_id', storeId)
      .gte('created_at', firstDayOfMonth)
      .neq('status', 'CANCELLED')

    const salesMonthTotal = (salesMonth || []).reduce((acc: number, o: any) => acc + Number(o.total_amount || 0), 0)

    // 3. Pending orders
    const { count: pendingOrdersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'PENDING')

    // 4. Low stock alerts (quantity <= min_stock)
    const { data: stockItems } = await supabase
      .from('stock_balances')
      .select(`
        quantity,
        products ( min_stock )
      `)
      .eq('store_id', storeId)

    const lowStockCount = (stockItems || []).filter(
      (s: any) => Number(s.quantity) <= Number(s.products?.min_stock || 0)
    ).length

    // 5. Expiring in 30 days & Expired
    const { data: batches } = await supabase
      .from('stock_batches')
      .select('expiration_date, status, quantity')
      .eq('store_id', storeId)
      .gt('quantity', 0)

    const now = new Date()
    const in30d = new Date()
    in30d.setDate(in30d.getDate() + 30)

    let expiredCount = 0
    let expiring30dCount = 0

    const batchList = (batches || []) as any[]
    for (const b of batchList) {
      if (!b.expiration_date) continue
      const exp = new Date(b.expiration_date)
      if (exp < now) {
        expiredCount++
      } else if (exp <= in30d) {
        expiring30dCount++
      }
    }

    // 6. Active customers count
    const { count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'ACTIVE')

    // 7. Total products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .is('deleted_at', null)

    return {
      salesTodayTotal,
      salesMonthTotal,
      pendingOrdersCount: pendingOrdersCount || 0,
      lowStockCount,
      expiredCount,
      expiring30dCount,
      customersCount: customersCount || 0,
      productsCount: productsCount || 0,
    }
  },

  /**
   * Resumo de KPIs Financeiros e Operacionais do Varejo
   */
  async getRetailSummaryKPIs(storeId: string): Promise<RetailSummaryKPIs> {
    const todayStr = new Date().toISOString().slice(0, 10)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    // 1. Saldos de Estoque e Valores
    const { data: stockRows, error: stockErr } = await supabase
      .from('stock_balances')
      .select(`
        quantity,
        products!inner (
          id,
          min_stock,
          cost_price,
          selling_price,
          deleted_at
        )
      `)
      .eq('store_id', storeId)
      .is('products.deleted_at', null)

    if (stockErr) throw stockErr

    let totalPhysicalUnits = 0
    let totalCostValue = 0
    let totalSellingValue = 0
    let stockoutCount = 0
    let lowStockCount = 0

    const totalProducts = stockRows?.length || 0

    for (const row of (stockRows || []) as any[]) {
      const prod = Array.isArray(row.products) ? row.products[0] : row.products
      const qty = Number(row.quantity) || 0
      const min = Number(prod?.min_stock) || 0
      const cost = Number(prod?.cost_price) || 0
      const selling = Number(prod?.selling_price) || 0

      if (qty > 0) {
        totalPhysicalUnits += qty
        totalCostValue += qty * cost
        totalSellingValue += qty * selling
      }

      if (qty <= 0) {
        stockoutCount++
      } else if (qty <= min) {
        lowStockCount++
      }
    }

    const potentialProfit = Math.max(0, totalSellingValue - totalCostValue)
    const marginPercent = totalSellingValue > 0 ? (potentialProfit / totalSellingValue) * 100 : 0

    // 2. Vendas Hoje e no Mês
    const { data: ordersToday } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('store_id', storeId)
      .gte('created_at', todayStr)
      .neq('status', 'CANCELLED')

    const salesTodayTotal = (ordersToday || []).reduce(
      (acc: number, o: any) => acc + (Number(o.total_amount) || 0),
      0
    )

    const { data: ordersMonth } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('store_id', storeId)
      .gte('created_at', firstDayOfMonth)
      .neq('status', 'CANCELLED')

    const salesMonthTotal = (ordersMonth || []).reduce(
      (acc: number, o: any) => acc + (Number(o.total_amount) || 0),
      0
    )
    const ordersMonthCount = ordersMonth?.length || 0

    // 3. Perdas e Baixas do Mês
    const { data: lossMovements } = await supabase
      .from('stock_movements')
      .select('quantity, unit_cost, movement_type, reason_code')
      .eq('store_id', storeId)
      .gte('created_at', firstDayOfMonth)
      .or('movement_type.eq.OUT,movement_type.eq.LOSS,reason_code.not.is.null')

    const totalLossValueMonth = (lossMovements || []).reduce((acc: number, m: any) => {
      const q = Math.abs(Number(m.quantity) || 0)
      const uCost = Number(m.unit_cost) || 0
      return acc + q * uCost
    }, 0)

    // 4. Lotes e Validades
    const { data: batches } = await supabase
      .from('stock_batches')
      .select('expiration_date, quantity')
      .eq('store_id', storeId)
      .gt('quantity', 0)

    const now = new Date()
    const in30d = new Date()
    in30d.setDate(in30d.getDate() + 30)

    let expiredCount = 0
    let expiring30dCount = 0

    for (const b of (batches || []) as any[]) {
      if (!b.expiration_date) continue
      const exp = new Date(b.expiration_date)
      if (exp < now) {
        expiredCount++
      } else if (exp <= in30d) {
        expiring30dCount++
      }
    }

    return {
      totalProducts,
      totalPhysicalUnits,
      totalCostValue,
      totalSellingValue,
      potentialProfit,
      marginPercent,
      salesTodayTotal,
      salesMonthTotal,
      ordersMonthCount,
      totalLossValueMonth,
      stockoutCount,
      lowStockCount,
      expiredCount,
      expiring30dCount,
    }
  },

  /**
   * 1. Relatório de Avaliação Financeira e Rentabilidade por Produto
   */
  async getValuationReport(storeId: string): Promise<ValuationReportItem[]> {
    const { data, error } = await supabase
      .from('stock_balances')
      .select(`
        id,
        quantity,
        product_id,
        products!inner (
          id,
          name,
          sku,
          unit,
          min_stock,
          cost_price,
          selling_price,
          deleted_at,
          categories ( name )
        )
      `)
      .eq('store_id', storeId)
      .is('products.deleted_at', null)

    if (error) throw error

    return (data || []).map((row: any) => {
      const prod = Array.isArray(row.products) ? row.products[0] : row.products
      const cat = Array.isArray(prod?.categories) ? prod?.categories[0] : prod?.categories
      const qty = Number(row.quantity) || 0
      const minStock = Number(prod?.min_stock) || 0
      const costPrice = Number(prod?.cost_price) || 0
      const sellingPrice = Number(prod?.selling_price) || 0

      const totalCostValue = qty * costPrice
      const totalSellingValue = qty * sellingPrice
      const potentialProfit = totalSellingValue - totalCostValue
      const marginPercent = totalSellingValue > 0 ? (potentialProfit / totalSellingValue) * 100 : 0

      let status: ValuationReportItem['status'] = 'NORMAL'
      if (qty <= 0) {
        status = 'OUT_OF_STOCK'
      } else if (qty <= minStock) {
        status = 'LOW_STOCK'
      }

      return {
        id: row.id,
        productId: prod?.id || row.product_id,
        productName: prod?.name || 'Produto',
        productSku: prod?.sku || '',
        categoryName: cat?.name || 'Sem categoria',
        unit: prod?.unit || 'UN',
        quantity: qty,
        minStock,
        costPrice,
        sellingPrice,
        totalCostValue,
        totalSellingValue,
        potentialProfit,
        marginPercent,
        status,
      }
    })
  },

  /**
   * 2. Relatório Curva ABC de Produtos & Giro Financeiro
   */
  async getAbcCurveReport(storeId: string): Promise<AbcCurveItem[]> {
    const valuation = await this.getValuationReport(storeId)

    // Consider all products with either stock or positive valuation
    const validItems = valuation
      .map((item) => ({
        ...item,
        totalValue: item.totalSellingValue > 0 ? item.totalSellingValue : item.totalCostValue,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)

    const grandTotal = validItems.reduce((acc, it) => acc + it.totalValue, 0)

    let runningSum = 0
    return validItems.map((item) => {
      runningSum += item.totalValue
      const percentOfTotal = grandTotal > 0 ? (item.totalValue / grandTotal) * 100 : 0
      const cumulativePercent = grandTotal > 0 ? (runningSum / grandTotal) * 100 : 0

      let classification: 'A' | 'B' | 'C' = 'C'
      let strategy = 'Cauda longa: comprar pontualmente para não imobilizar capital'

      if (cumulativePercent <= 80 || (cumulativePercent - percentOfTotal <= 0)) {
        classification = 'A'
        strategy = 'Item prioritário: monitoramento diário e reposição contínua'
      } else if (cumulativePercent <= 95) {
        classification = 'B'
        strategy = 'Item intermediário: reposição periódica e controle semanal'
      }

      return {
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        categoryName: item.categoryName,
        unit: item.unit,
        quantity: item.quantity,
        unitCost: item.costPrice,
        unitSelling: item.sellingPrice,
        totalValue: item.totalValue,
        percentOfTotal,
        cumulativePercent,
        classification,
        strategy,
      }
    })
  },

  /**
   * 3. Relatório de Compras & Entrada de Mercadorias
   */
  async getPurchasingReport(storeId: string): Promise<PurchasingReportItem[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        status,
        subtotal,
        shipping_cost,
        total_amount,
        issued_at,
        received_at,
        suppliers ( trade_name, corporate_name ),
        purchase_order_items (
          id,
          unit_cost,
          total_cost,
          quantity_ordered,
          products ( cost_price, selling_price )
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((po: any) => {
      const supp = Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers
      const items = (po.purchase_order_items || []) as any[]
      const totalCost = Number(po.total_amount) || 0

      let totalSellingValue = 0
      for (const it of items) {
        const prod = Array.isArray(it.products) ? it.products[0] : it.products
        const qty = Number(it.quantity_ordered) || 0
        const sell = Number(prod?.selling_price) || 0
        totalSellingValue += qty * sell
      }

      const potentialProfit = Math.max(0, totalSellingValue - totalCost)
      const marginPercent = totalSellingValue > 0 ? (potentialProfit / totalSellingValue) * 100 : 0

      return {
        id: po.id,
        orderNumber: po.order_number,
        supplierName: supp?.trade_name || supp?.corporate_name || 'Fornecedor Diversos',
        itemsCount: items.length,
        totalCost,
        totalSellingValue,
        potentialProfit,
        marginPercent,
        status: po.status,
        issuedAt: po.issued_at,
        receivedAt: po.received_at,
      }
    })
  },

  /**
   * 4. Relatório de Perdas, Avarias & Baixas Operacionais
   */
  async getLossesReport(storeId: string): Promise<LossesReportItem[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        movement_type,
        quantity,
        unit_cost,
        reason_code,
        reason_detail,
        cost_center_code,
        notes,
        created_at,
        products ( name, sku, cost_price ),
        profiles:operator_id ( full_name )
      `)
      .eq('store_id', storeId)
      .or('movement_type.eq.OUT,movement_type.eq.LOSS,reason_code.not.is.null')
      .order('created_at', { ascending: false })

    if (error) throw error

    const REASON_LABELS: Record<string, string> = {
      AVARIA_TRANSPORTE: 'Avaria em Transporte',
      AVARIA_INTERNA: 'Avaria Interna / Queda',
      VALIDADE_VENCIDA: 'Validade Vencida',
      AVARIA_CLIENTE: 'Devolução Avariada de Cliente',
      FURTO_EXTRAVIO: 'Furto / Extravio',
      USO_CONSUMO: 'Consumo Interno / Amostra',
      DESCARTE_DEFEITO: 'Defeito de Fabricação',
      AJUSTE_INVENTARIO: 'Ajuste de Inventário',
    }

    return (data || []).map((m: any) => {
      const prod = Array.isArray(m.products) ? m.products[0] : m.products
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      const qty = Math.abs(Number(m.quantity) || 0)
      const unitCost = Number(m.unit_cost) || Number(prod?.cost_price) || 0
      const totalLossValue = qty * unitCost
      const reasonLabel = m.reason_code ? REASON_LABELS[m.reason_code] || m.reason_code : 'Baixa Operacional'

      return {
        id: m.id,
        movementType: m.movement_type,
        createdAt: m.created_at,
        productName: prod?.name || 'Produto',
        productSku: prod?.sku || '',
        quantity: qty,
        unitCost,
        totalLossValue,
        reasonCode: m.reason_code,
        reasonLabel,
        costCenterCode: m.cost_center_code,
        operatorName: prof?.full_name || 'Sistema',
        notes: m.notes || m.reason_detail || null,
      }
    })
  },

  /**
   * 5. Relatório de Ruptura de Estoque & Alerta de Reposição
   */
  async getStockoutsReport(storeId: string): Promise<StockoutReportItem[]> {
    const valuation = await this.getValuationReport(storeId)

    return valuation
      .filter((item) => item.quantity <= item.minStock)
      .map((item) => {
        const deficit = Math.max(0, item.minStock - item.quantity)
        const replenishmentCost = deficit * item.costPrice
        const urgency: StockoutReportItem['urgency'] = item.quantity <= 0 ? 'CRITICAL' : 'WARNING'

        return {
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          categoryName: item.categoryName,
          unit: item.unit,
          quantity: item.quantity,
          minStock: item.minStock,
          deficit,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          replenishmentCost,
          urgency,
        }
      })
      .sort((a, b) => (a.urgency === 'CRITICAL' ? -1 : 1) || b.replenishmentCost - a.replenishmentCost)
  },

  /**
   * 6. Relatório de Desempenho de Vendas & Faturamento
   */
  async getSalesPerformanceReport(storeId: string): Promise<SalesReportItem[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        channel,
        subtotal,
        discount_amount,
        total_amount,
        status,
        created_at,
        customers ( name ),
        order_items ( quantity )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((o: any) => {
      const cust = Array.isArray(o.customers) ? o.customers[0] : o.customers
      const items = (o.order_items || []) as any[]
      const itemsCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)

      return {
        id: o.id,
        orderNumber: o.order_number,
        customerName: cust?.name || 'Consumidor Final',
        channel: o.channel,
        itemsCount,
        subtotal: Number(o.subtotal) || 0,
        discountAmount: Number(o.discount_amount) || 0,
        totalAmount: Number(o.total_amount) || 0,
        status: o.status,
        createdAt: o.created_at,
      }
    })
  },

  /**
   * 7. Relatório de Compra Baseada no Consumo & Giro de Estoque
   */
  async getConsumptionDemandReport(storeId: string): Promise<ConsumptionDemandReportItem[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

    // 1. Produtos e saldos atuais
    const valuation = await this.getValuationReport(storeId)

    // 2. Vendas dos últimos 30 dias para calcular o consumo médio
    const { data: salesMovements } = await supabase
      .from('stock_movements')
      .select('product_id, quantity')
      .eq('store_id', storeId)
      .gte('created_at', thirtyDaysAgo)
      .in('movement_type', ['SALE', 'EXIT', 'OUT'])

    const consumptionMap = new Map<string, number>()
    for (const mov of (salesMovements || []) as any[]) {
      const q = Math.abs(Number(mov.quantity) || 0)
      consumptionMap.set(mov.product_id, (consumptionMap.get(mov.product_id) || 0) + q)
    }

    return valuation.map((item) => {
      const monthlySalesQty = consumptionMap.get(item.productId) || 0
      // Consumo diário (base 30 dias)
      const dailyConsumption = Number((monthlySalesQty / 30).toFixed(2))

      // Dias de cobertura restante
      let stockCoverageDays = 999
      if (dailyConsumption > 0) {
        stockCoverageDays = Math.floor(item.quantity / dailyConsumption)
      } else if (item.quantity <= 0) {
        stockCoverageDays = 0
      }

      // Sugestão de reposição para cobertura de 30 dias
      const targetStock30d = Math.max(item.minStock, Math.ceil(dailyConsumption * 30))
      const suggestedPurchaseQty = Math.max(0, targetStock30d - item.quantity)
      const suggestedInvestment = Number((suggestedPurchaseQty * item.costPrice).toFixed(2))

      let urgency: ConsumptionDemandReportItem['urgency'] = 'NORMAL'
      if (item.quantity <= 0 || stockCoverageDays <= 7) {
        urgency = 'URGENT'
      } else if (stockCoverageDays <= 15 || item.quantity <= item.minStock) {
        urgency = 'ATTENTION'
      } else if (stockCoverageDays > 60 && item.quantity > targetStock30d * 2) {
        urgency = 'OVERSTOCK'
      }

      return {
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        categoryName: item.categoryName,
        unit: item.unit,
        currentStock: item.quantity,
        minStock: item.minStock,
        dailyConsumption,
        monthlySalesQty,
        stockCoverageDays,
        suggestedPurchaseQty,
        unitCost: item.costPrice,
        suggestedInvestment,
        urgency,
      }
    }).sort((a, b) => {
      if (a.urgency === 'URGENT' && b.urgency !== 'URGENT') return -1
      if (b.urgency === 'URGENT' && a.urgency !== 'URGENT') return 1
      return b.suggestedInvestment - a.suggestedInvestment
    })
  },

  /**
   * 8. Relatório de Ticket Médio por Cliente & Comportamento (LTV)
   */
  async getCustomerTicketReport(storeId: string): Promise<CustomerTicketReportItem[]> {
    // 1. Clientes
    const { data: customers, error: custErr } = await supabase
      .from('customers')
      .select('id, name, document, phone, email, status')
      .eq('store_id', storeId)

    if (custErr) throw custErr

    // 2. Pedidos válidos
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('id, customer_id, total_amount, channel, created_at, status')
      .eq('store_id', storeId)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false })

    if (ordErr) throw ordErr

    const ordersByCustomer = new Map<string, any[]>()
    for (const o of (orders || []) as any[]) {
      if (!o.customer_id) continue
      const list = ordersByCustomer.get(o.customer_id) || []
      list.push(o)
      ordersByCustomer.set(o.customer_id, list)
    }

    const now = Date.now()

    return (customers || []).map((c: any) => {
      const custOrders = ordersByCustomer.get(c.id) || []
      const totalOrders = custOrders.length
      const totalSpent = custOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0)
      const averageTicket = totalOrders > 0 ? Number((totalSpent / totalOrders).toFixed(2)) : 0

      const lastOrder = custOrders[0]
      const lastOrderDate = lastOrder ? lastOrder.created_at : null
      const daysSinceLastOrder = lastOrderDate
        ? Math.floor((now - new Date(lastOrderDate).getTime()) / 86400000)
        : 999

      // Canal favorito
      const channelCounts: Record<string, number> = {}
      custOrders.forEach((o) => {
        const ch = o.channel || 'IN_STORE'
        channelCounts[ch] = (channelCounts[ch] || 0) + 1
      })
      let topChannel = 'Sem compras'
      let maxChCount = 0
      Object.entries(channelCounts).forEach(([ch, count]) => {
        if (count > maxChCount) {
          maxChCount = count
          topChannel = ch
        }
      })

      // Segmentação
      let customerSegment: CustomerTicketReportItem['customerSegment'] = 'OCCASIONAL'
      if (totalOrders >= 5 || totalSpent >= 500) {
        customerSegment = 'VIP'
      } else if (totalOrders >= 2 && daysSinceLastOrder <= 45) {
        customerSegment = 'FREQUENT'
      } else if (totalOrders === 0 || daysSinceLastOrder > 60) {
        customerSegment = 'INACTIVE'
      }

      return {
        customerId: c.id,
        customerName: c.name,
        document: c.document,
        phone: c.phone,
        email: c.email,
        status: c.status,
        totalOrders,
        totalSpent: Number(totalSpent.toFixed(2)),
        averageTicket,
        lastOrderDate,
        daysSinceLastOrder,
        topChannel,
        customerSegment,
      }
    }).sort((a, b) => b.totalSpent - a.totalSpent || b.totalOrders - a.totalOrders)
  },

  /**
   * 9. Relatório de Levantamento & Investimento de Estoque por Categoria (Capital de Giro)
   */
  async getCapitalInvestmentReport(storeId: string): Promise<CapitalInvestmentReportItem[]> {
    const valuation = await this.getValuationReport(storeId)

    const totalStoreInvestment = valuation.reduce((acc, i) => acc + i.totalCostValue, 0)

    const categoryMap = new Map<string, {
      categoryName: string
      productsCount: number
      totalPhysicalUnits: number
      totalInvestedCost: number
      totalSellingPotential: number
      potentialProfit: number
    }>()

    for (const item of valuation) {
      const cat = item.categoryName || 'Outros / Sem Categoria'
      const curr = categoryMap.get(cat) || {
        categoryName: cat,
        productsCount: 0,
        totalPhysicalUnits: 0,
        totalInvestedCost: 0,
        totalSellingPotential: 0,
        potentialProfit: 0,
      }

      curr.productsCount += 1
      curr.totalPhysicalUnits += item.quantity
      curr.totalInvestedCost += item.totalCostValue
      curr.totalSellingPotential += item.totalSellingValue
      curr.potentialProfit += item.potentialProfit

      categoryMap.set(cat, curr)
    }

    return Array.from(categoryMap.entries()).map(([catId, data]) => {
      const share = totalStoreInvestment > 0 ? (data.totalInvestedCost / totalStoreInvestment) * 100 : 0
      const margin = data.totalSellingPotential > 0 ? (data.potentialProfit / data.totalSellingPotential) * 100 : 0
      const gmroi = data.totalInvestedCost > 0 ? Number((data.potentialProfit / data.totalInvestedCost).toFixed(2)) : 0

      return {
        categoryId: catId,
        categoryName: data.categoryName,
        productsCount: data.productsCount,
        totalPhysicalUnits: data.totalPhysicalUnits,
        totalInvestedCost: Number(data.totalInvestedCost.toFixed(2)),
        totalSellingPotential: Number(data.totalSellingPotential.toFixed(2)),
        potentialProfit: Number(data.potentialProfit.toFixed(2)),
        marginPercent: Number(margin.toFixed(2)),
        shareOfTotalInvestment: Number(share.toFixed(2)),
        gmroi,
      }
    }).sort((a, b) => b.totalInvestedCost - a.totalInvestedCost)
  },

  /**
   * Métricas do Painel Global de Administração
   */
  async getGlobalAdminMetrics() {
    const { count: totalStores } = await supabase.from('stores').select('*', { count: 'exact', head: true })
    const { count: activeStores } = await supabase.from('stores').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true })

    return {
      totalStores: totalStores || 0,
      activeStores: activeStores || 0,
      totalUsers: totalUsers || 0,
      totalOrders: totalOrders || 0,
    }
  },

  /**
   * Analytics Executivo Completo do Dashboard (Gráficos por Loja, Produtos Mais Vendidos,
   * Vendas Mensais, Série Temporal do Período, Categorias, Canais, Meios de Pagamento e Exportação)
   */
  async getDashboardAnalytics(params: DashboardAnalyticsParams): Promise<DashboardAnalyticsData> {
    const {
      selectedStoreId,
      accessibleStores,
      dateFrom,
      dateTo,
      channel = 'ALL',
      granularity = 'DAY',
    } = params

    const allStoreIds = accessibleStores.map((s) => s.id).filter(Boolean)
    const targetStoreIds =
      selectedStoreId === 'ALL' || !selectedStoreId
        ? allStoreIds
        : [selectedStoreId]

    const storeNameMap = new Map<string, string>()
    const storeMetaMap = new Map<
      string,
      { name: string; slug: string; isBranch: boolean; branchCode: string | null; parentStoreId: string | null }
    >()

    for (const s of accessibleStores) {
      storeNameMap.set(s.id, s.name)
      storeMetaMap.set(s.id, {
        name: s.name,
        slug: s.slug,
        isBranch: Boolean(s.isBranch),
        branchCode: s.branchCode || null,
        parentStoreId: s.parentStoreId || null,
      })
    }

    // Parse period boundaries
    const startIso = dateFrom ? `${dateFrom}T00:00:00.000Z` : '2020-01-01T00:00:00.000Z'
    const endIso = dateTo ? `${dateTo}T23:59:59.999Z` : new Date().toISOString()

    const startMs = new Date(startIso).getTime()
    const endMs = new Date(endIso).getTime()
    const periodSpanMs = Math.max(86400000, endMs - startMs)
    const prevStartIso = new Date(startMs - periodSpanMs).toISOString()
    const prevEndIso = new Date(startMs - 1).toISOString()

    // 12 months window for the Monthly Sales Chart
    const now = new Date()
    const twelveMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const earliestFetchIso =
      new Date(prevStartIso) < twelveMonthsAgoDate
        ? prevStartIso
        : twelveMonthsAgoDate.toISOString()

    if (allStoreIds.length === 0) {
      return {
        kpis: {
          periodRevenue: 0,
          previousPeriodRevenue: 0,
          revenueGrowthPercent: 0,
          periodProfit: 0,
          periodMarginPercent: 0,
          periodOrdersCount: 0,
          previousPeriodOrdersCount: 0,
          ordersGrowthPercent: 0,
          averageTicket: 0,
          previousAverageTicket: 0,
          ticketGrowthPercent: 0,
          periodUnitsSold: 0,
          salesTodayTotal: 0,
          salesMonthTotal: 0,
          pendingOrdersCount: 0,
          cancelledOrdersCount: 0,
          cancelledAmount: 0,
          stockCostValuation: 0,
          stockSellingValuation: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          expiring30dCount: 0,
          expiredCount: 0,
          activeCustomersCount: 0,
          totalProductsCount: 0,
        },
        monthlySalesSeries: [],
        timelineSeries: [],
        storeComparison: [],
        topProducts: [],
        categoryBreakdown: [],
        channelBreakdown: [],
        paymentBreakdown: [],
        weekdayBreakdown: [],
        periodOrders: [],
      }
    }

    // Fetch Orders with Items, Products, Categories, Customers, and Payments across all accessible stores
    // so we can render both the Store Comparison Chart and the scoped Dashboard Analytics in a single pass
    const [
      ordersRes,
      stockBalancesRes,
      batchesRes,
      customersRes,
    ] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id,
          store_id,
          order_number,
          channel,
          status,
          subtotal,
          discount_amount,
          shipping_amount,
          total_amount,
          created_at,
          customers ( name ),
          payments ( method, amount, status ),
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            unit_cost,
            discount,
            total_price,
            products (
              id,
              name,
              sku,
              unit,
              cost_price,
              selling_price,
              min_stock,
              categories ( name ),
              product_images ( public_url, is_primary )
            )
          )
        `)
        .in('store_id', allStoreIds)
        .gte('created_at', earliestFetchIso)
        .order('created_at', { ascending: false }),

      supabase
        .from('stock_balances')
        .select(`
          store_id,
          product_id,
          quantity,
          products!inner (
            id,
            name,
            sku,
            min_stock,
            cost_price,
            selling_price,
            deleted_at
          )
        `)
        .in('store_id', allStoreIds)
        .is('products.deleted_at', null),

      supabase
        .from('stock_batches')
        .select('store_id, expiration_date, quantity')
        .in('store_id', targetStoreIds)
        .gt('quantity', 0),

      supabase
        .from('customers')
        .select('id, store_id, status')
        .in('store_id', targetStoreIds)
        .eq('status', 'ACTIVE')
        .is('deleted_at', null),
    ])

    const rawOrders = ((ordersRes.data || []) as any[]).filter(
      (o) => !String(o.order_number || '').includes('-SUB-')
    )
    const rawStockBalances = (stockBalancesRes.data || []) as any[]
    const rawBatches = (batchesRes.data || []) as any[]
    const activeCustomersCount = (customersRes.data || []).length

    // Index current stock by storeId:productId and productId
    const stockByStoreProduct = new Map<string, number>()
    const stockByProductAgg = new Map<string, { qty: number; minStock: number }>()

    const storeStockSummaryMap = new Map<
      string,
      { costVal: number; sellVal: number; lowStock: number; outOfStock: number; productsCount: number }
    >()

    for (const sId of allStoreIds) {
      storeStockSummaryMap.set(sId, {
        costVal: 0,
        sellVal: 0,
        lowStock: 0,
        outOfStock: 0,
        productsCount: 0,
      })
    }

    for (const row of rawStockBalances) {
      const sId = row.store_id
      const prod = Array.isArray(row.products) ? row.products[0] : row.products
      if (!prod) continue
      const pId = prod.id || row.product_id
      const qty = Number(row.quantity) || 0
      const min = Number(prod.min_stock) || 0
      const cost = Number(prod.cost_price) || 0
      const sell = Number(prod.selling_price) || 0

      stockByStoreProduct.set(`${sId}:${pId}`, qty)

      // Update per-store stock summary
      const stSum = storeStockSummaryMap.get(sId)
      if (stSum) {
        stSum.productsCount += 1
        if (qty > 0) {
          stSum.costVal += qty * cost
          stSum.sellVal += qty * sell
        }
        if (qty <= 0) {
          stSum.outOfStock += 1
        } else if (qty <= min) {
          stSum.lowStock += 1
        }
      }

      // If in targetStoreIds, aggregate for top products & KPIs
      if (targetStoreIds.includes(sId)) {
        const prev = stockByProductAgg.get(pId) || { qty: 0, minStock: min }
        prev.qty += qty
        stockByProductAgg.set(pId, prev)
      }
    }

    let stockCostValuation = 0
    let stockSellingValuation = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalProductsCount = 0

    for (const sId of targetStoreIds) {
      const stSum = storeStockSummaryMap.get(sId)
      if (stSum) {
        stockCostValuation += stSum.costVal
        stockSellingValuation += stSum.sellVal
        lowStockCount += stSum.lowStock
        outOfStockCount += stSum.outOfStock
        totalProductsCount += stSum.productsCount
      }
    }

    // Batches expiration counts for targetStoreIds
    const in30d = new Date()
    in30d.setDate(in30d.getDate() + 30)
    let expiredCount = 0
    let expiring30dCount = 0

    for (const b of rawBatches) {
      if (!b.expiration_date) continue
      const exp = new Date(b.expiration_date)
      if (exp < now) {
        expiredCount++
      } else if (exp <= in30d) {
        expiring30dCount++
      }
    }

    // Helper to calculate order estimated cost & profit & units
    const computeOrderMetrics = (order: any) => {
      const items = (order.order_items || []) as any[]
      let units = 0
      let totalCost = 0
      for (const it of items) {
        const prod = Array.isArray(it.products) ? it.products[0] : it.products
        const q = Number(it.quantity) || 0
        const uCost =
          it.unit_cost !== null && it.unit_cost !== undefined && Number(it.unit_cost) > 0
            ? Number(it.unit_cost)
            : Number(prod?.cost_price) || 0
        units += q
        totalCost += q * uCost
      }
      const rev = Number(order.total_amount) || 0
      const profit = rev - totalCost
      return { units, totalCost, profit, rev }
    }

    // Filter by channel if requested
    const matchesChannel = (order: any) => {
      if (!channel || channel === 'ALL') return true
      return order.channel === channel
    }

    // 1. Build Store Comparison across ALL accessible stores for the selected date range & channel
    const storePerfAcc = new Map<
      string,
      { revenue: number; profit: number; ordersCount: number; unitsSold: number }
    >()
    for (const sId of allStoreIds) {
      storePerfAcc.set(sId, { revenue: 0, profit: 0, ordersCount: 0, unitsSold: 0 })
    }

    for (const o of rawOrders) {
      if (!matchesChannel(o)) continue
      if (o.status === 'CANCELLED') continue
      const createdMs = new Date(o.created_at).getTime()
      if (createdMs < startMs || createdMs > endMs) continue

      const acc = storePerfAcc.get(o.store_id)
      if (acc) {
        const { rev, profit, units } = computeOrderMetrics(o)
        acc.revenue += rev
        acc.profit += profit
        acc.ordersCount += 1
        acc.unitsSold += units
      }
    }

    const totalAllStoresRevenue = Array.from(storePerfAcc.values()).reduce(
      (sum, item) => sum + item.revenue,
      0
    )

    const storeComparison: DashboardStorePerformanceItem[] = accessibleStores
      .map((st) => {
        const perf = storePerfAcc.get(st.id) || {
          revenue: 0,
          profit: 0,
          ordersCount: 0,
          unitsSold: 0,
        }
        const stStock = storeStockSummaryMap.get(st.id) || {
          costVal: 0,
          sellVal: 0,
          lowStock: 0,
          outOfStock: 0,
          productsCount: 0,
        }
        const avgTicket = perf.ordersCount > 0 ? perf.revenue / perf.ordersCount : 0
        const marginPct = perf.revenue > 0 ? (perf.profit / perf.revenue) * 100 : 0
        const sharePct =
          totalAllStoresRevenue > 0 ? (perf.revenue / totalAllStoresRevenue) * 100 : 0

        return {
          storeId: st.id,
          storeName: st.name,
          storeSlug: st.slug,
          isBranch: Boolean(st.isBranch),
          branchCode: st.branchCode || null,
          parentStoreId: st.parentStoreId || null,
          revenue: Number(perf.revenue.toFixed(2)),
          profit: Number(perf.profit.toFixed(2)),
          marginPercent: Number(marginPct.toFixed(1)),
          ordersCount: perf.ordersCount,
          unitsSold: Number(perf.unitsSold.toFixed(2)),
          averageTicket: Number(avgTicket.toFixed(2)),
          sharePercent: Number(sharePct.toFixed(1)),
          stockCostValue: Number(stStock.costVal.toFixed(2)),
          stockSellingValue: Number(stStock.sellVal.toFixed(2)),
          lowStockCount: stStock.lowStock,
          outOfStockCount: stStock.outOfStock,
        }
      })
      .sort((a, b) => b.revenue - a.revenue || b.stockSellingValue - a.stockSellingValue)

    // 2. Scoped orders (only targetStoreIds and matching channel)
    const scopedOrders = rawOrders.filter(
      (o) => targetStoreIds.includes(o.store_id) && matchesChannel(o)
    )

    const todayPrefix = now.toISOString().slice(0, 10)
    const currentMonthPrefix = now.toISOString().slice(0, 7)

    let salesTodayTotal = 0
    let salesMonthTotal = 0
    let pendingOrdersCount = 0

    let periodRevenue = 0
    let periodProfit = 0
    let periodOrdersCount = 0
    let periodUnitsSold = 0
    let cancelledOrdersCount = 0
    let cancelledAmount = 0

    let previousPeriodRevenue = 0
    let previousPeriodOrdersCount = 0

    const prevStartMs = new Date(prevStartIso).getTime()
    const prevEndMs = new Date(prevEndIso).getTime()

    // Monthly Sales Map (Last 12 Months)
    const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const monthlyMap = new Map<
      string,
      { monthKey: string; monthLabel: string; revenue: number; profit: number; ordersCount: number; unitsSold: number }
    >()

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const key = `${y}-${m}`
      const label = `${MONTH_NAMES[d.getMonth()]}/${String(y).slice(-2)}`
      monthlyMap.set(key, {
        monthKey: key,
        monthLabel: label,
        revenue: 0,
        profit: 0,
        ordersCount: 0,
        unitsSold: 0,
      })
    }

    // Timeline Buckets Map for Selected Period
    const timelineMap = new Map<
      string,
      { bucketKey: string; label: string; revenue: number; profit: number; ordersCount: number; unitsSold: number }
    >()

    const getTimelineBucket = (isoDate: string): { key: string; label: string } => {
      const d = new Date(isoDate)
      if (granularity === 'MONTH') {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        return {
          key: `${y}-${m}`,
          label: `${MONTH_NAMES[d.getMonth()]}/${String(y).slice(-2)}`,
        }
      }
      if (granularity === 'WEEK') {
        // Monday of the week
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const weekStart = new Date(d)
        weekStart.setDate(diff)
        const key = weekStart.toISOString().slice(0, 10)
        const dd = String(weekStart.getDate()).padStart(2, '0')
        const mm = String(weekStart.getMonth() + 1).padStart(2, '0')
        return {
          key,
          label: `Sem ${dd}/${mm}`,
        }
      }
      // Default DAY
      const key = isoDate.slice(0, 10)
      const [, mm, dd] = key.split('-')
      return {
        key,
        label: `${dd}/${mm}`,
      }
    }

    // Pre-populate daily buckets if span <= 45 days and granularity === 'DAY'
    const daysSpan = Math.ceil((endMs - startMs) / 86400000)
    if (granularity === 'DAY' && daysSpan >= 1 && daysSpan <= 45) {
      for (let i = 0; i <= daysSpan; i++) {
        const cur = new Date(startMs + i * 86400000)
        if (cur.getTime() > endMs) break
        const iso = cur.toISOString()
        const b = getTimelineBucket(iso)
        if (!timelineMap.has(b.key)) {
          timelineMap.set(b.key, {
            bucketKey: b.key,
            label: b.label,
            revenue: 0,
            profit: 0,
            ordersCount: 0,
            unitsSold: 0,
          })
        }
      }
    }

    // Aggregation maps for the selected period
    const productSalesMap = new Map<
      string,
      {
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
        orderIds: Set<string>
        minStock: number
      }
    >()

    const categorySalesMap = new Map<
      string,
      { categoryName: string; revenue: number; profit: number; quantitySold: number; orderIds: Set<string> }
    >()

    const channelSalesMap = new Map<
      string,
      { channel: string; revenue: number; ordersCount: number }
    >()

    const paymentSalesMap = new Map<
      string,
      { method: string; amount: number; transactionsCount: number }
    >()

    const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const weekdaySalesMap = new Map<
      number,
      { dayIndex: number; dayLabel: string; revenue: number; ordersCount: number }
    >()
    for (let d = 0; d < 7; d++) {
      weekdaySalesMap.set(d, {
        dayIndex: d,
        dayLabel: WEEKDAY_LABELS[d],
        revenue: 0,
        ordersCount: 0,
      })
    }

    const periodOrders: DashboardPeriodOrderItem[] = []

    const CHANNEL_LABELS: Record<string, string> = {
      IN_STORE: 'PDV / Balcão',
      WHATSAPP: 'WhatsApp',
      ECOMMERCE: 'Catálogo Online',
    }

    const PAYMENT_LABELS: Record<string, string> = {
      PIX: 'PIX Instantâneo',
      CREDIT_CARD: 'Cartão de Crédito',
      DEBIT_CARD: 'Cartão de Débito',
      CASH: 'Dinheiro / Espécie',
      BANK_TRANSFER: 'Transferência / Boleto',
    }

    for (const order of scopedOrders) {
      const createdIso = String(order.created_at || '')
      const createdMs = new Date(createdIso).getTime()
      const isCancelled = order.status === 'CANCELLED'
      const { rev, profit, units } = computeOrderMetrics(order)

      // Today & Current Month KPIs
      if (!isCancelled) {
        if (createdIso.startsWith(todayPrefix)) {
          salesTodayTotal += rev
        }
        if (createdIso.startsWith(currentMonthPrefix)) {
          salesMonthTotal += rev
        }
      }
      if (order.status === 'PENDING') {
        pendingOrdersCount += 1
      }

      // Monthly 12M series
      const mKey = createdIso.slice(0, 7)
      if (!isCancelled && monthlyMap.has(mKey)) {
        const mPoint = monthlyMap.get(mKey)!
        mPoint.revenue += rev
        mPoint.profit += profit
        mPoint.ordersCount += 1
        mPoint.unitsSold += units
      }

      // Previous period comparison
      if (!isCancelled && createdMs >= prevStartMs && createdMs <= prevEndMs) {
        previousPeriodRevenue += rev
        previousPeriodOrdersCount += 1
      }

      // Selected Period Analytics
      if (createdMs >= startMs && createdMs <= endMs) {
        const cust = Array.isArray(order.customers) ? order.customers[0] : order.customers
        const paymentsList = (order.payments || []) as any[]
        const primaryPayment = paymentsList[0]?.method || 'PIX'

        periodOrders.push({
          id: order.id,
          orderNumber: order.order_number,
          storeId: order.store_id,
          storeName: storeNameMap.get(order.store_id) || 'Loja',
          customerName: cust?.name || 'Cliente Genérico',
          channel: order.channel || 'IN_STORE',
          paymentMethod: primaryPayment,
          status: order.status,
          itemsCount: Number(units.toFixed(2)),
          subtotal: Number(order.subtotal) || 0,
          discountAmount: Number(order.discount_amount) || 0,
          totalAmount: rev,
          estimatedProfit: Number(profit.toFixed(2)),
          createdAt: createdIso,
        })

        if (isCancelled) {
          cancelledOrdersCount += 1
          cancelledAmount += rev
          continue
        }

        periodRevenue += rev
        periodProfit += profit
        periodOrdersCount += 1
        periodUnitsSold += units

        // Timeline bucket
        const bucket = getTimelineBucket(createdIso)
        const tPoint = timelineMap.get(bucket.key) || {
          bucketKey: bucket.key,
          label: bucket.label,
          revenue: 0,
          profit: 0,
          ordersCount: 0,
          unitsSold: 0,
        }
        tPoint.revenue += rev
        tPoint.profit += profit
        tPoint.ordersCount += 1
        tPoint.unitsSold += units
        timelineMap.set(bucket.key, tPoint)

        // Channel breakdown
        const chCode = order.channel || 'IN_STORE'
        const chEntry = channelSalesMap.get(chCode) || {
          channel: chCode,
          revenue: 0,
          ordersCount: 0,
        }
        chEntry.revenue += rev
        chEntry.ordersCount += 1
        channelSalesMap.set(chCode, chEntry)

        // Payment breakdown
        if (paymentsList.length > 0) {
          for (const p of paymentsList) {
            const pMethod = p.method || 'PIX'
            const pAmt = Number(p.amount) || rev
            const pEntry = paymentSalesMap.get(pMethod) || {
              method: pMethod,
              amount: 0,
              transactionsCount: 0,
            }
            pEntry.amount += pAmt
            pEntry.transactionsCount += 1
            paymentSalesMap.set(pMethod, pEntry)
          }
        } else {
          const pEntry = paymentSalesMap.get('PIX') || {
            method: 'PIX',
            amount: 0,
            transactionsCount: 0,
          }
          pEntry.amount += rev
          pEntry.transactionsCount += 1
          paymentSalesMap.set('PIX', pEntry)
        }

        // Weekday breakdown
        const dayIdx = new Date(createdIso).getDay()
        const wdEntry = weekdaySalesMap.get(dayIdx)
        if (wdEntry) {
          wdEntry.revenue += rev
          wdEntry.ordersCount += 1
        }

        // Order items -> Top Products & Category Breakdown
        const items = (order.order_items || []) as any[]
        for (const it of items) {
          const prod = Array.isArray(it.products) ? it.products[0] : it.products
          const catObj = Array.isArray(prod?.categories) ? prod?.categories[0] : prod?.categories
          const images = (prod?.product_images || []) as any[]
          const primaryImg =
            images.find((img) => img.is_primary)?.public_url || images[0]?.public_url || null

          const pId = prod?.id || it.product_id
          const pName = prod?.name || 'Produto'
          const pSku = prod?.sku || ''
          const catName = catObj?.name || 'Sem Categoria'
          const unit = prod?.unit || 'UN'
          const minStock = Number(prod?.min_stock) || 0

          const qty = Number(it.quantity) || 0
          const itemRev = Number(it.total_price) || qty * (Number(it.unit_price) || 0)
          const uCost =
            it.unit_cost !== null && it.unit_cost !== undefined && Number(it.unit_cost) > 0
              ? Number(it.unit_cost)
              : Number(prod?.cost_price) || 0
          const itemCost = qty * uCost
          const itemProfit = itemRev - itemCost

          // Aggregate Product (group by SKU or Name when 'ALL' stores is selected so identical products across branches merge cleanly, or by productId)
          const groupKey = selectedStoreId === 'ALL' ? (pSku || pName || pId) : pId
          const existingProd = productSalesMap.get(groupKey)
          if (existingProd) {
            existingProd.quantitySold += qty
            existingProd.revenue += itemRev
            existingProd.costTotal += itemCost
            existingProd.profit += itemProfit
            existingProd.orderIds.add(order.id)
            if (!existingProd.imageUrl && primaryImg) {
              existingProd.imageUrl = primaryImg
            }
          } else {
            productSalesMap.set(groupKey, {
              productId: pId,
              productName: pName,
              productSku: pSku,
              categoryName: catName,
              unit,
              imageUrl: primaryImg,
              storeId: order.store_id,
              storeName: storeNameMap.get(order.store_id) || 'Loja',
              quantitySold: qty,
              revenue: itemRev,
              costTotal: itemCost,
              profit: itemProfit,
              orderIds: new Set([order.id]),
              minStock,
            })
          }

          // Aggregate Category
          const existingCat = categorySalesMap.get(catName) || {
            categoryName: catName,
            revenue: 0,
            profit: 0,
            quantitySold: 0,
            orderIds: new Set<string>(),
          }
          existingCat.revenue += itemRev
          existingCat.profit += itemProfit
          existingCat.quantitySold += qty
          existingCat.orderIds.add(order.id)
          categorySalesMap.set(catName, existingCat)
        }
      }
    }

    const averageTicket = periodOrdersCount > 0 ? periodRevenue / periodOrdersCount : 0
    const previousAverageTicket =
      previousPeriodOrdersCount > 0 ? previousPeriodRevenue / previousPeriodOrdersCount : 0
    const periodMarginPercent = periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0

    const calcGrowth = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? 100 : 0
      return Number((((curr - prev) / prev) * 100).toFixed(1))
    }

    const monthlySalesSeries: DashboardMonthlyPoint[] = Array.from(monthlyMap.values()).map(
      (m) => ({
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        revenue: Number(m.revenue.toFixed(2)),
        profit: Number(m.profit.toFixed(2)),
        ordersCount: m.ordersCount,
        unitsSold: Number(m.unitsSold.toFixed(2)),
        averageTicket: m.ordersCount > 0 ? Number((m.revenue / m.ordersCount).toFixed(2)) : 0,
      })
    )

    const timelineSeries: DashboardTimelinePoint[] = Array.from(timelineMap.values())
      .sort((a, b) => a.bucketKey.localeCompare(b.bucketKey))
      .map((t) => ({
        bucketKey: t.bucketKey,
        label: t.label,
        revenue: Number(t.revenue.toFixed(2)),
        profit: Number(t.profit.toFixed(2)),
        ordersCount: t.ordersCount,
        unitsSold: Number(t.unitsSold.toFixed(2)),
        averageTicket: t.ordersCount > 0 ? Number((t.revenue / t.ordersCount).toFixed(2)) : 0,
      }))

    const topProducts: DashboardTopProductItem[] = Array.from(productSalesMap.values())
      .map((p) => {
        const stockInfo = stockByProductAgg.get(p.productId)
        const currentStock = stockInfo
          ? stockInfo.qty
          : stockByStoreProduct.get(`${p.storeId}:${p.productId}`) || 0
        const marginPct = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0
        const sharePct = periodRevenue > 0 ? (p.revenue / periodRevenue) * 100 : 0

        return {
          productId: p.productId,
          productName: p.productName,
          productSku: p.productSku,
          categoryName: p.categoryName,
          unit: p.unit,
          imageUrl: p.imageUrl,
          storeId: p.storeId,
          storeName: p.storeName,
          quantitySold: Number(p.quantitySold.toFixed(2)),
          revenue: Number(p.revenue.toFixed(2)),
          costTotal: Number(p.costTotal.toFixed(2)),
          profit: Number(p.profit.toFixed(2)),
          marginPercent: Number(marginPct.toFixed(1)),
          ordersCount: p.orderIds.size,
          shareOfRevenuePercent: Number(sharePct.toFixed(1)),
          currentStock: Number(currentStock.toFixed(2)),
          minStock: p.minStock,
        }
      })
      .sort((a, b) => b.revenue - a.revenue || b.quantitySold - a.quantitySold)

    const categoryBreakdown: DashboardCategoryBreakdownItem[] = Array.from(
      categorySalesMap.values()
    )
      .map((c) => ({
        categoryName: c.categoryName,
        revenue: Number(c.revenue.toFixed(2)),
        profit: Number(c.profit.toFixed(2)),
        quantitySold: Number(c.quantitySold.toFixed(2)),
        ordersCount: c.orderIds.size,
        sharePercent:
          periodRevenue > 0 ? Number(((c.revenue / periodRevenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const channelBreakdown: DashboardChannelBreakdownItem[] = Array.from(
      channelSalesMap.values()
    )
      .map((ch) => ({
        channel: ch.channel,
        channelLabel: CHANNEL_LABELS[ch.channel] || ch.channel,
        revenue: Number(ch.revenue.toFixed(2)),
        ordersCount: ch.ordersCount,
        averageTicket:
          ch.ordersCount > 0 ? Number((ch.revenue / ch.ordersCount).toFixed(2)) : 0,
        sharePercent:
          periodRevenue > 0 ? Number(((ch.revenue / periodRevenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const totalPaymentsAmt = Array.from(paymentSalesMap.values()).reduce(
      (acc, p) => acc + p.amount,
      0
    )
    const paymentBreakdown: DashboardPaymentBreakdownItem[] = Array.from(
      paymentSalesMap.values()
    )
      .map((p) => ({
        method: p.method,
        methodLabel: PAYMENT_LABELS[p.method] || p.method,
        amount: Number(p.amount.toFixed(2)),
        transactionsCount: p.transactionsCount,
        sharePercent:
          totalPaymentsAmt > 0
            ? Number(((p.amount / totalPaymentsAmt) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    const weekdayBreakdown: DashboardWeekdayItem[] = Array.from(weekdaySalesMap.values()).map(
      (w) => ({
        dayIndex: w.dayIndex,
        dayLabel: w.dayLabel,
        revenue: Number(w.revenue.toFixed(2)),
        ordersCount: w.ordersCount,
        averageTicket:
          w.ordersCount > 0 ? Number((w.revenue / w.ordersCount).toFixed(2)) : 0,
      })
    )

    return {
      kpis: {
        periodRevenue: Number(periodRevenue.toFixed(2)),
        previousPeriodRevenue: Number(previousPeriodRevenue.toFixed(2)),
        revenueGrowthPercent: calcGrowth(periodRevenue, previousPeriodRevenue),
        periodProfit: Number(periodProfit.toFixed(2)),
        periodMarginPercent: Number(periodMarginPercent.toFixed(1)),
        periodOrdersCount,
        previousPeriodOrdersCount,
        ordersGrowthPercent: calcGrowth(periodOrdersCount, previousPeriodOrdersCount),
        averageTicket: Number(averageTicket.toFixed(2)),
        previousAverageTicket: Number(previousAverageTicket.toFixed(2)),
        ticketGrowthPercent: calcGrowth(averageTicket, previousAverageTicket),
        periodUnitsSold: Number(periodUnitsSold.toFixed(2)),
        salesTodayTotal: Number(salesTodayTotal.toFixed(2)),
        salesMonthTotal: Number(salesMonthTotal.toFixed(2)),
        pendingOrdersCount,
        cancelledOrdersCount,
        cancelledAmount: Number(cancelledAmount.toFixed(2)),
        stockCostValuation: Number(stockCostValuation.toFixed(2)),
        stockSellingValuation: Number(stockSellingValuation.toFixed(2)),
        lowStockCount,
        outOfStockCount,
        expiring30dCount,
        expiredCount,
        activeCustomersCount,
        totalProductsCount,
      },
      monthlySalesSeries,
      timelineSeries,
      storeComparison,
      topProducts,
      categoryBreakdown,
      channelBreakdown,
      paymentBreakdown,
      weekdayBreakdown,
      periodOrders,
    }
  },
}

