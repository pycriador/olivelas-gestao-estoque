import https from 'node:https';

const BASE_URL = 'https://mffrafqyjbjitlhjnlai.supabase.co/rest/v1';
const STORE_ID = 'f8fdfd0e-a13a-44a6-ba98-53e61be300db';
const SUPABASE_KEY = 'sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ';

const endpoints = [
  { name: 'Catálogo de Produtos', path: `/products?store_id=eq.${STORE_ID}&is_active=eq.true&select=id,name,sku,cost_price,selling_price,min_stock,unit` },
  { name: 'Saldos de Estoque', path: `/stock_balances?store_id=eq.${STORE_ID}&select=id,product_id,quantity,reserved_quantity,available_quantity,updated_at` },
  { name: 'Lotes de Validade', path: `/stock_batches?store_id=eq.${STORE_ID}&select=id,product_id,lot_number,quantity,cost_price,expiration_date,status` },
  { name: 'Movimentações de Estoque', path: `/stock_movements?store_id=eq.${STORE_ID}&select=id,movement_type,quantity,unit_cost,created_at&order=created_at.desc&limit=10` },
  { name: 'Pedidos de Venda', path: `/orders?store_id=eq.${STORE_ID}&select=id,order_number,status,subtotal,discount_amount,total_amount,created_at&limit=10` },
  { name: 'Ordens de Compra', path: `/purchase_orders?store_id=eq.${STORE_ID}&select=id,order_number,status,total_amount,issued_at,received_at&limit=10` },
  { name: 'Clientes', path: `/customers?store_id=eq.${STORE_ID}&select=id,name,document,email,phone,status` },
  { name: 'Fornecedores', path: `/suppliers?store_id=eq.${STORE_ID}&select=id,trade_name,corporate_name,document,phone,status` },
  { name: 'Categorias', path: `/categories?store_id=eq.${STORE_ID}&select=id,name,slug,description` },
  { name: 'Chaves de API (HBAC)', path: `/api_keys?store_id=eq.${STORE_ID}&select=id,name,key_prefix,scopes,is_active,created_at` },
];

function fetchEndpoint(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = `${BASE_URL}${endpoint.path}`;
    const req = https.get(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const data = JSON.parse(body);
          resolve({
            name: endpoint.name,
            status: res.statusCode,
            count: Array.isArray(data) ? data.length : 1,
            duration,
            sample: Array.isArray(data) ? data.slice(0, 2) : data,
            success: res.statusCode >= 200 && res.statusCode < 300,
          });
        } catch (e) {
          resolve({
            name: endpoint.name,
            status: res.statusCode,
            error: e.message,
            duration,
            body: body.substring(0, 100),
            success: false,
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        name: endpoint.name,
        status: 0,
        error: err.message,
        duration: Date.now() - start,
        success: false,
      });
    });
  });
}

async function runTests() {
  console.log('🚀 Iniciando testes de API REST (GNZ Hortifruti)...');
  const results = [];
  for (const ep of endpoints) {
    const res = await fetchEndpoint(ep);
    results.push(res);
    console.log(`[${res.status}] ${res.name}: ${res.count} registros em ${res.duration}ms`);
  }
  console.log('\n📊 Resumo dos testes de API:');
  const allPassed = results.every(r => r.success);
  console.log(`Status: ${allPassed ? '✅ 100% PASSOU' : '❌ FALHAS DETECTADAS'}`);
  return results;
}

runTests();
