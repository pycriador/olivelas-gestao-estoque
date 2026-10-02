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
}

