import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('docs/evidence/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const PORT = 5180;
const BASE_URL = `http://localhost:${PORT}`;

// Pages to capture
const routes = [
  // Marketing & Public
  { name: '01_landing_page', path: '/', title: 'Página Inicial (Landing Page)', category: 'Marketing' },
  { name: '02_public_catalog', path: '/store/gnz-hortifruti', title: 'Catálogo Público WhatsApp (GNZ Hortifruti)', category: 'Catálogo' },
  { name: '03_login_page', path: '/login', title: 'Tela de Autenticação (Login)', category: 'Auth' },

  // Core Management
  { name: '04_dashboard', path: '/dashboard', title: 'Dashboard Executivo', category: 'Gestão' },
  { name: '05_products_catalog', path: '/products', title: 'Catálogo Mestre de Produtos', category: 'Produtos' },
  { name: '06_inventory_balances', path: '/inventory', title: 'Estoque & Valorização Financeira', category: 'Estoque' },
  { name: '07_purchasing_orders', path: '/purchases', title: 'Ordens de Compra & Fornecedores', category: 'Compras' },
  { name: '08_sales_pos', path: '/sales', title: 'Frente de Caixa (PDV)', category: 'Vendas' },
  { name: '09_orders_list', path: '/orders', title: 'Histórico de Pedidos de Venda', category: 'Vendas' },
  { name: '10_customers_crm', path: '/customers', title: 'Cadastro de Clientes & CRM', category: 'Cadastros' },
  { name: '11_suppliers', path: '/suppliers', title: 'Cadastro de Fornecedores', category: 'Cadastros' },
  { name: '12_expiration_lots', path: '/expiration', title: 'Controle de Validades & Lotes', category: 'Estoque' },

  // 9 Retail Reports
  { name: '13_report_valuation', path: '/reports?tab=valuation', title: 'Relatório: Valorização & Margem do Estoque', category: 'Relatórios' },
  { name: '14_report_abc_curve', path: '/reports?tab=abc', title: 'Relatório: Curva ABC & Mix de Pareto (80/15/5)', category: 'Relatórios' },
  { name: '15_report_demand_consumption', path: '/reports?tab=demand', title: 'Relatório: Giro & Compra por Consumo (Runout)', category: 'Relatórios' },
  { name: '16_report_customer_ltv', path: '/reports?tab=customers', title: 'Relatório: Ticket Médio por Cliente & LTV', category: 'Relatórios' },
  { name: '17_report_capital_investment', path: '/reports?tab=investment', title: 'Relatório: Investimento de Capital & GMROI', category: 'Relatórios' },
  { name: '18_report_purchasing_history', path: '/reports?tab=purchasing', title: 'Relatório: Compras & Desempenho de Fornecedor', category: 'Relatórios' },
  { name: '19_report_operational_losses', path: '/reports?tab=losses', title: 'Relatório: Perdas & Baixas Operacionais', category: 'Relatórios' },
  { name: '20_report_stockout_alerts', path: '/reports?tab=stockouts', title: 'Relatório: Ruptura & Necessidade de Compra', category: 'Relatórios' },
  { name: '21_report_sales_performance', path: '/reports?tab=sales', title: 'Relatório: Desempenho de Vendas & PDV', category: 'Relatórios' },

  // Global Admin
  { name: '22_admin_stores', path: '/global-admin', title: 'Painel Global: Gestão Multi-loja', category: 'Admin' },
  { name: '23_admin_db_explorer', path: '/global-admin', hash: 'db-explorer', title: 'Painel Global: Explorador de Banco de Dados (CRUD)', category: 'Admin' },
  { name: '24_admin_backup_center', path: '/global-admin', hash: 'backup', title: 'Painel Global: Central de Backup & Exportação Multi-loja', category: 'Admin' },
  { name: '25_admin_hbac_api_keys', path: '/global-admin', hash: 'api-keys', title: 'Painel Global: Gestor de Chaves de API & HBAC (IA)', category: 'Admin' },
];

async function startServer() {
  console.log(`📡 Iniciando servidor Vite na porta ${PORT}...`);
  const server = await createServer({
    server: { port: PORT, strictPort: true },
  });
  await server.listen();
  console.log(`✅ Servidor Vite pronto em: ${BASE_URL}`);
  return server;
}

async function captureScreenshots() {
  let server;
  try {
    server = await startServer();

    console.log(`🌐 Inicializando navegador Chrome em: ${CHROME_PATH}`);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Enable request interception for authenticating seamless preview
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/auth/v1/user') || url.includes('/auth/v1/session')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '00000000-0000-0000-0000-000000000001',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'admin@gnz.com.br',
            user_metadata: { full_name: 'Administrador GNZ' },
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        req.continue();
      }
    });

    // Seed session in localStorage before loading any page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('olivelas_theme_preference', 'light');
      localStorage.setItem('olivelas_preferred_locale', 'pt-BR');
      localStorage.setItem(
        'olivelas_user_profile',
        JSON.stringify({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@gnz.com.br',
          fullName: 'Administrador GNZ',
          avatarUrl: null,
          phone: '(11) 99999-8888',
          isGlobalAdmin: true,
          createdAt: new Date().toISOString(),
        })
      );
      localStorage.setItem(
        'olivelas_user_stores',
        JSON.stringify([
          {
            id: 'store-user-gnz',
            storeId: 'f8fdfd0e-a13a-44a6-ba98-53e61be300db',
            storeName: 'GNZ Hortifruti',
            storeSlug: 'gnz-hortifruti',
            role: 'GLOBAL_ADMIN',
            isActive: true,
          },
          {
            id: 'store-user-olivelas',
            storeId: '1bc0bc1b-b242-4af6-a3c3-640c7ba9444c',
            storeName: 'Olivelas',
            storeSlug: 'olivelas',
            role: 'GLOBAL_ADMIN',
            isActive: true,
          },
        ])
      );
      localStorage.setItem('olivelas_active_store_id', 'f8fdfd0e-a13a-44a6-ba98-53e61be300db');
    });

    console.log('\n📸 Iniciando captura de telas em alta resolução (Desktop 1440x900 & Mobile 390x844)...');
    const captured = [];

    for (const route of routes) {
      const fullUrl = `${BASE_URL}${route.path}`;
      process.stdout.write(`Capturando [${route.category}] ${route.title}... `);

      // 1. Desktop Capture
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // If route has a specific tab/hash to click in Global Admin
      if (route.hash) {
        await page.evaluate((tabId) => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) =>
            b.textContent?.toLowerCase().includes(tabId === 'db-explorer' ? 'banco' : tabId === 'backup' ? 'backup' : 'api')
          );
          if (btn) btn.click();
        }, route.hash);
        await new Promise((r) => setTimeout(r, 600));
      }

      await new Promise((r) => setTimeout(r, 800)); // wait for transitions

      const desktopFileName = `${route.name}_desktop.png`;
      const desktopFilePath = path.join(SCREENSHOT_DIR, desktopFileName);
      await page.screenshot({ path: desktopFilePath, fullPage: false });

      // 2. Mobile Capture
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await new Promise((r) => setTimeout(r, 400));
      const mobileFileName = `${route.name}_mobile.png`;
      const mobileFilePath = path.join(SCREENSHOT_DIR, mobileFileName);
      await page.screenshot({ path: mobileFilePath, fullPage: false });

      captured.push({
        ...route,
        desktopFile: desktopFileName,
        mobileFile: mobileFileName,
      });

      console.log('✅ OK');
    }

    await browser.close();
    console.log(`\n🎉 Total de ${captured.length * 2} screenshots capturados com sucesso em: ${SCREENSHOT_DIR}`);
    return captured;
  } finally {
    if (server) {
      await server.close();
    }
  }
}

captureScreenshots().catch((err) => {
  console.error('Erro na captura:', err);
  process.exit(1);
});
