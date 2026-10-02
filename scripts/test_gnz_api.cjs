const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env dinamicamente
function getEnvConfig() {
  const envPath = path.resolve(__dirname, '..', '.env');
  let url = process.env.VITE_SUPABASE_URL || 'https://mffrafqyjbjitlhjnlai.supabase.co';
  let key = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/^SUPABASE_URL=(.*)$/m) || envContent.match(/^VITE_SUPABASE_URL=(.*)$/m);
    const keyMatch = envContent.match(/^SUPABASE_SECRET_KEY=(.*)$/m) || envContent.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m);
    if (urlMatch && urlMatch[1]) url = urlMatch[1].trim();
    if (keyMatch && keyMatch[1]) key = keyMatch[1].trim();
  }
  return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_KEY } = getEnvConfig();
const GNZ_STORE_ID = 'f8fdfd0e-a13a-44a6-ba98-53e61be300db';

// Definição dos tokens HBAC para teste individual
const HBAC_TOKENS = [
  {
    name: 'Token GNZ - Acesso Completo (Admin & IA Master)',
    scopes: ['*'],
    category: 'Full Admin',
    description: 'Acesso total de leitura e escrita em todos os recursos da loja GNZ'
  },
  {
    name: 'Token GNZ - Produtos & Catálogo',
    scopes: ['products:read', 'products:write', 'products:delete'],
    category: 'Products',
    description: 'Consulta, criação e atualização do catálogo mestre de produtos e categorias'
  },
  {
    name: 'Token GNZ - Estoque & Inventário',
    scopes: ['inventory:read', 'inventory:write', 'inventory:adjust'],
    category: 'Inventory',
    description: 'Saldos em tempo real, lotes de fornecedores, validades e baixas operacionais'
  },
  {
    name: 'Token GNZ - Vendas & PDV',
    scopes: ['orders:read', 'orders:write', 'orders:cancel'],
    category: 'Orders',
    description: 'Histórico de faturamento, pedidos emitidos, itens vendidos e clientes'
  },
  {
    name: 'Token GNZ - Compras & Fornecedores',
    scopes: ['purchases:read', 'purchases:write'],
    category: 'Purchases',
    description: 'Ordens de compra, custos unitários reais de entrada e fornecedores homologados'
  },
  {
    name: 'Token GNZ - Clientes & CRM',
    scopes: ['customers:read', 'customers:write'],
    category: 'Customers',
    description: 'Base de clientes, contatos, dados cadastrais e histórico'
  },
  {
    name: 'Token GNZ - Relatórios & IA Externa',
    scopes: ['reports:read', 'reports:export'],
    category: 'Reports & Analytics',
    description: 'Acesso a todos os relatórios analíticos, Curva ABC, Ruptura e KPIs executivos'
  },
  {
    name: 'Token GNZ - Auditoria & Logs',
    scopes: ['audit:read'],
    category: 'Audit',
    description: 'Rastreabilidade de alterações e movimentações por usuário'
  }
];

function generateTokenHex() {
  const bytes = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
  }
  return 'olv_live_' + bytes.join('');
}

async function fetchRest(endpoint, params = {}, useStoreFilter = true) {
  const url = new URL('/rest/v1' + endpoint, SUPABASE_URL);
  if (useStoreFilter) {
    url.searchParams.set('store_id', 'eq.' + GNZ_STORE_ID);
  }
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, url: url.pathname + url.search, data };
}

async function run() {
  console.log('======================================================================');
  console.log('  TESTE COMPLETO DE ROTAS E TOKENS DE API — LOJA GNZ HORTIFRUTI       ');
  console.log('======================================================================\n');

  console.log('----------------------------------------------------------------------');
  console.log('1. TOKENS INDIVIDUAIS GERADOS POR ESCOPO HBAC (PARA GNZ HORTIFRUTI):');
  console.log('----------------------------------------------------------------------');
  const generatedTokens = [];
  for (const t of HBAC_TOKENS) {
    const rawToken = generateTokenHex();
    const tokenObj = {
      id: 'tok_' + Math.random().toString(36).substring(2, 10),
      name: t.name,
      token: rawToken,
      keyPrefix: rawToken.slice(0, 12) + '...',
      storeId: GNZ_STORE_ID,
      storeName: 'GNZ Hortifruti',
      category: t.category,
      scopes: t.scopes,
      description: t.description,
      expiresAt: null,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    generatedTokens.push(tokenObj);
    console.log(`[${t.category}] ${t.name}`);
    console.log(`  Token:    ${rawToken}`);
    console.log(`  Escopos:  [${t.scopes.join(', ')}]`);
    console.log(`  Finalidade: ${t.description}\n`);
  }

  console.log('----------------------------------------------------------------------');
  console.log('2. TESTANDO TODAS AS ROTAS DE DADOS (REST API POSTGREST) PARA GNZ:');
  console.log('----------------------------------------------------------------------');

  const routesToTest = [
    { name: '1. Produtos (Catálogo Mestre)', path: '/products', params: { select: 'id,name,sku,barcode,unit,min_stock,max_stock,cost_price,selling_price,category_id,is_active', is_active: 'eq.true' } },
    { name: '2. Categorias de Produtos', path: '/categories', params: { select: 'id,name,slug' } },
    { name: '3. Saldos de Estoque Físico', path: '/stock_balances', params: { select: 'id,product_id,quantity,reserved_quantity,available_quantity,updated_at' } },
    { name: '4. Lotes e Validades de Estoque', path: '/stock_batches', params: { select: 'id,product_id,lot_number,quantity,cost_price,expiration_date,status' } },
    { name: '5. Movimentações de Estoque', path: '/stock_movements', params: { select: 'id,movement_type,quantity,previous_quantity,new_quantity,unit_cost,created_at', limit: '10' } },
    { name: '6. Pedidos de Venda', path: '/orders', params: { select: 'id,order_number,status,subtotal,discount_amount,total_amount,created_at' } },
    { name: '7. Itens de Pedidos de Venda', path: '/order_items', params: { select: 'id,order_id,product_id,quantity,unit_price,unit_cost,total_price', limit: '10' } },
    { name: '8. Ordens de Compra', path: '/purchase_orders', params: { select: 'id,order_number,status,total_amount,issued_at,received_at,supplier_id' } },
    { name: '9. Itens de Ordens de Compra', path: '/purchase_order_items', params: { select: 'id,purchase_order_id,product_id,quantity_ordered,quantity_received,unit_cost,total_cost', limit: '10' } },
    { name: '10. Clientes (CRM)', path: '/customers', params: { select: 'id,name,document,email,phone,status' } },
    { name: '11. Fornecedores', path: '/suppliers', params: { select: 'id,trade_name,corporate_name,document,phone,email,status' } },
    { name: '12. Centros de Custo', path: '/cost_centers', params: { select: 'id,name,code,category,is_active' }, useStoreFilter: false },
    { name: '13. Motivos de Baixa / Perda', path: '/loss_reasons', params: { select: 'code,label,default_cost_center_code,requires_approval' }, useStoreFilter: false },
  ];

  for (const r of routesToTest) {
    const res = await fetchRest(r.path, r.params, r.useStoreFilter !== false);
    const count = Array.isArray(res.data) ? res.data.length : 1;
    const statusText = res.ok ? '✓ SUCESSO 200' : '✗ ERRO ' + res.status;
    console.log(`${statusText} | ${r.name.padEnd(38)} -> ${count} registro(s) obtido(s)`);
  }

  console.log('\n----------------------------------------------------------------------');
  console.log('3. PROCESSANDO TODOS OS 7 RELATÓRIOS ANALÍTICOS VIA API PARA GNZ:');
  console.log('----------------------------------------------------------------------');

  const productsList = (await fetchRest('/products', { select: 'id,name,sku,barcode,unit,min_stock,max_stock,cost_price,selling_price,category_id', is_active: 'eq.true' })).data || [];
  const categoriesList = (await fetchRest('/categories', { select: 'id,name,slug' })).data || [];
  const balancesList = (await fetchRest('/stock_balances', { select: 'id,product_id,quantity,reserved_quantity,available_quantity' })).data || [];
  const movementsList = (await fetchRest('/stock_movements', { select: 'id,product_id,movement_type,quantity,unit_cost,created_at,reason_code' })).data || [];
  const ordersList = (await fetchRest('/orders', { select: 'id,order_number,status,subtotal,discount_amount,total_amount,created_at' })).data || [];
  const purchasesList = (await fetchRest('/purchase_orders', { select: 'id,order_number,status,total_amount,issued_at,received_at,supplier_id' })).data || [];
  const purchaseItemsList = (await fetchRest('/purchase_order_items', { select: 'id,purchase_order_id,product_id,quantity_ordered,quantity_received,unit_cost,total_cost' })).data || [];
  const suppliersList = (await fetchRest('/suppliers', { select: 'id,trade_name,corporate_name' })).data || [];

  // Mappings
  const categoryMap = new Map(categoriesList.map(c => [c.id, c.name]));
  const balanceMap = new Map(balancesList.map(b => [b.product_id, b]));
  const supplierMap = new Map(suppliersList.map(s => [s.id, s.trade_name || s.corporate_name]));

  // 1. Relatório de Valorização e Lucratividade
  const valuationReport = productsList.map(p => {
    const bal = balanceMap.get(p.id) || { quantity: 0, reserved_quantity: 0, available_quantity: 0 };
    const qty = Number(bal.quantity || 0);
    const cost = Number(p.cost_price || 0);
    const sale = Number(p.selling_price || 0);
    const totalCost = qty * cost;
    const totalSale = qty * sale;
    const profit = totalSale - totalCost;
    const margin = totalSale > 0 ? (profit / totalSale) * 100 : 0;
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: categoryMap.get(p.category_id) || 'Sem categoria',
      quantity: qty,
      unit: p.unit,
      costPrice: cost,
      sellingPrice: sale,
      totalCostValue: Number(totalCost.toFixed(2)),
      totalSellingValue: Number(totalSale.toFixed(2)),
      estimatedProfit: Number(profit.toFixed(2)),
      marginPercent: Number(margin.toFixed(2))
    };
  });

  const totalCostValuation = valuationReport.reduce((acc, i) => acc + i.totalCostValue, 0);
  const totalSellingValuation = valuationReport.reduce((acc, i) => acc + i.totalSellingValue, 0);
  const totalEstimatedProfit = totalSellingValuation - totalCostValuation;
  const overallMargin = totalSellingValuation > 0 ? (totalEstimatedProfit / totalSellingValuation) * 100 : 0;

  // 2. Relatório de Curva ABC (Classificação de Pareto 80/15/5)
  const sortedAbc = [...valuationReport].sort((a, b) => b.totalSellingValue - a.totalSellingValue);
  let cumSum = 0;
  const abcReport = sortedAbc.map(item => {
    cumSum += item.totalSellingValue;
    const sharePct = totalSellingValuation > 0 ? (item.totalSellingValue / totalSellingValuation) * 100 : 0;
    const cumPct = totalSellingValuation > 0 ? (cumSum / totalSellingValuation) * 100 : 0;
    let abcClass = 'C';
    if (cumPct <= 80 || sharePct >= 20) abcClass = 'A';
    else if (cumPct <= 95) abcClass = 'B';
    return {
      name: item.name,
      sku: item.sku,
      category: item.category,
      totalSellingValue: item.totalSellingValue,
      sharePercent: Number(sharePct.toFixed(2)),
      cumulativePercent: Number(cumPct.toFixed(2)),
      abcClass
    };
  });

  // 3. Relatório de Ruptura e Reposição
  const stockoutReport = productsList
    .map(p => {
      const bal = balanceMap.get(p.id) || { quantity: 0 };
      const qty = Number(bal.quantity || 0);
      const minStock = Number(p.min_stock || 0);
      const isOut = qty <= 0;
      const isLow = qty > 0 && qty <= minStock;
      const shortage = Math.max(0, minStock - qty);
      const replenishmentCost = shortage * Number(p.cost_price || 0);
      return {
        name: p.name,
        sku: p.sku,
        quantity: qty,
        minStock,
        status: isOut ? 'RUPTURA_TOTAL' : isLow ? 'ESTOQUE_BAIXO' : 'REGULAR',
        shortageUnits: shortage,
        replenishmentCost: Number(replenishmentCost.toFixed(2))
      };
    })
    .filter(i => i.status !== 'REGULAR');

  // 4. Relatório de Compras e Fornecedores
  const purchasingReport = purchasesList.map(po => {
    const items = purchaseItemsList.filter(pi => pi.purchase_order_id === po.id);
    return {
      orderNumber: po.order_number,
      supplier: supplierMap.get(po.supplier_id) || 'Fornecedor',
      status: po.status,
      totalAmount: Number(po.total_amount || 0),
      itemsCount: items.length,
      issuedAt: po.issued_at,
      receivedAt: po.received_at
    };
  });

  // 5. Relatório de Perdas Operacionais
  const lossReport = movementsList
    .filter(m => ['LOSS', 'DAMAGE', 'EXPIRATION', 'ADJUSTMENT'].includes(m.movement_type))
    .map(m => {
      const prod = productsList.find(p => p.id === m.product_id);
      const unitCost = Number(m.unit_cost || prod?.cost_price || 0);
      const totalLoss = Number(m.quantity || 0) * unitCost;
      return {
        id: m.id,
        productName: prod?.name || 'Item',
        sku: prod?.sku || '-',
        movementType: m.movement_type,
        quantity: m.quantity,
        unitCost,
        totalLoss: Number(totalLoss.toFixed(2)),
        createdAt: m.created_at
      };
    });

  // 6. Relatório de Desempenho de Vendas
  const validOrders = ordersList.filter(o => o.status !== 'CANCELLED');
  const totalSalesRevenue = validOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  const salesReport = {
    totalOrdersCount: validOrders.length,
    totalRevenue: Number(totalSalesRevenue.toFixed(2)),
    averageTicket: validOrders.length > 0 ? Number((totalSalesRevenue / validOrders.length).toFixed(2)) : 0,
    orders: validOrders
  };

  // 7. KPIs Consolidados do Varejo
  const retailSummaryKPIs = {
    storeId: GNZ_STORE_ID,
    storeName: 'GNZ Hortifruti',
    totalActiveProducts: productsList.length,
    totalPhysicalUnits: valuationReport.reduce((acc, i) => acc + i.quantity, 0),
    totalCostValuation: Number(totalCostValuation.toFixed(2)),
    totalSellingValuation: Number(totalSellingValuation.toFixed(2)),
    potentialProfit: Number(totalEstimatedProfit.toFixed(2)),
    marginPercent: Number(overallMargin.toFixed(2)),
    stockoutsCount: stockoutReport.filter(s => s.status === 'RUPTURA_TOTAL').length,
    lowStockCount: stockoutReport.filter(s => s.status === 'ESTOQUE_BAIXO').length,
    monthSalesTotal: Number(totalSalesRevenue.toFixed(2)),
    lossesTotalValue: Number(lossReport.reduce((acc, l) => acc + l.totalLoss, 0).toFixed(2))
  };

  console.log('\n======================================================================');
  console.log('4. RESUMO DOS RELATÓRIOS EM TEMPO REAL (GNZ HORTIFRUTI):');
  console.log('======================================================================');
  console.log(JSON.stringify(retailSummaryKPIs, null, 2));

  // Build Full External AI Integration Payload
  const externalAiPackage = {
    metadata: {
      generatedAt: new Date().toISOString(),
      apiBaseUrl: SUPABASE_URL + '/rest/v1',
      authType: 'Bearer <TOKEN> + apikey header',
      store: {
        id: GNZ_STORE_ID,
        name: 'GNZ Hortifruti',
        slug: 'gnz-hortifruti'
      }
    },
    hbacTokens: generatedTokens,
    reportsIndex: [
      {
        id: 'retail_summary_kpis',
        title: 'Métricas Executivas Consolidadas (KPIs)',
        endpoint: 'GET /rest/v1/stock_balances & /rest/v1/orders',
        description: 'Visão executiva com totalização de estoque em custo vs venda, margem bruta média, faturamento e contagem de rupturas.',
        data: retailSummaryKPIs
      },
      {
        id: 'stock_valuation',
        title: 'Relatório de Valorização & Lucratividade',
        endpoint: 'GET /rest/v1/products?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,name,sku,unit,cost_price,selling_price,min_stock',
        description: 'Valoração física a custo e venda com margem % e lucro estimado por produto.',
        totalProducts: valuationReport.length,
        items: valuationReport
      },
      {
        id: 'abc_curve_pareto',
        title: 'Curva ABC & Mix de Produtos (Pareto 80/15/5)',
        endpoint: 'Calculado sobre /products e /stock_balances',
        description: 'Classificação de relevância em Classes A (80% da receita potencial), B (15%) e C (5%).',
        items: abcReport
      },
      {
        id: 'stockout_replenishment',
        title: 'Ruptura & Necessidade de Reposição',
        endpoint: 'Filtro por saldo <= 0 e saldo <= min_stock',
        description: 'Monitoramento de SKUs zerados ou críticos, indicando déficit de compra e custo de reposição.',
        criticalCount: stockoutReport.length,
        items: stockoutReport
      },
      {
        id: 'purchasing_history',
        title: 'Histórico de Compras & Fornecedores',
        endpoint: 'GET /rest/v1/purchase_orders?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db',
        description: 'Ordens de compra emitidas, fornecedores e valores negociados.',
        ordersCount: purchasingReport.length,
        orders: purchasingReport
      },
      {
        id: 'operational_losses',
        title: 'Perdas & Baixas Operacionais',
        endpoint: 'GET /rest/v1/stock_movements?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&movement_type=in.(LOSS,DAMAGE,EXPIRATION)',
        description: 'Registro de quebras operacionais, avarias e vencimentos com impacto financeiro.',
        lossesCount: lossReport.length,
        losses: lossReport
      },
      {
        id: 'sales_performance',
        title: 'Desempenho de Vendas & Faturamento',
        endpoint: 'GET /rest/v1/orders?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db',
        description: 'Consolidação de pedidos de venda, faturamento bruto e ticket médio.',
        summary: salesReport
      }
    ]
  };

  fs.writeFileSync(path.resolve(__dirname, 'gnz_external_ai_package.json'), JSON.stringify(externalAiPackage, null, 2));
  console.log('\n✅ Pacote completo de integração salvo com sucesso em: scripts/gnz_external_ai_package.json');
}

run().catch(console.error);
