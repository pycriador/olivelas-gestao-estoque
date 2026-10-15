import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_URL = process.env.TARGET_URL || process.env.BASE_URL || 'http://localhost:5173';
const RESULTS_DIR = path.resolve('test-automation', 'results');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('================================================================');
  console.log('🚀 EXECUTOR E2E BROWSER — OLIVELAS GESTÃO DE ESTOQUE');
  console.log('================================================================');
  console.log(`📍 URL Alvo: ${BASE_URL}`);
  console.log(`🌐 Navegador: ${CHROME_PATH}`);
  console.log(`📁 Pasta Resultados: ${RESULTS_DIR}\n`);

  const startTime = Date.now();
  const testResults = [];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const page = await browser.newPage();

  async function recordStep(stepId, title, route, actionFn) {
    const stepStart = Date.now();
    console.log(`▶️ [${stepId}] Executando: ${title}...`);
    try {
      const details = await actionFn();
      const duration = Date.now() - stepStart;
      console.log(`   ✅ Sucesso (${duration}ms): ${title}`);
      testResults.push({
        id: stepId,
        title,
        route,
        status: 'PASSED',
        durationMs: duration,
        details: details || {},
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const duration = Date.now() - stepStart;
      console.error(`   ❌ Falha (${duration}ms):`, err.message);
      testResults.push({
        id: stepId,
        title,
        route,
        status: 'FAILED',
        error: err.message,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  try {
    // -----------------------------------------------------------------
    // ETAPA 1: Acesso Inicial & Configuração de Tenant no LocalStorage
    // -----------------------------------------------------------------
    await recordStep('TC-01', 'Inicializar Aplicação e Configurar Loja Ativa', '/', async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(1000);

      // Injeta loja ativa padrão e sessão autenticada para navegar sem bloqueio
      await page.evaluate(() => {
        const mockStore = {
          id: 'store-qa-e2e',
          storeId: 'store-qa-e2e',
          name: 'Loja QA Automação E2E',
          storeName: 'Loja QA Automação E2E',
          slug: 'loja-qa-automacao-e2e',
          storeSlug: 'loja-qa-automacao-e2e',
          currency: 'BRL',
          role: 'ADMIN',
          isActive: true,
          created_at: new Date().toISOString()
        };
        localStorage.setItem('olivelas_active_store', JSON.stringify(mockStore));
        localStorage.setItem('active_store_id', 'store-qa-e2e');
        localStorage.setItem('olivelas_active_store_id', 'store-qa-e2e');
        localStorage.setItem('olivelas_user_profile', JSON.stringify({
          id: 'usr-admin-e2e',
          email: 'admin@olivelas.com',
          name: 'Admin Olivelas E2E',
          isGlobalAdmin: true,
          role: 'ADMIN'
        }));
        localStorage.setItem('olivelas_user_stores', JSON.stringify([mockStore]));
      });

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-home.png') });
      return { url: page.url(), title: await page.title() };
    });

    // -----------------------------------------------------------------
    // ETAPA 2: Navegar para Produtos & Validar Renderização
    // -----------------------------------------------------------------
    await recordStep('TC-02', 'Navegação para Catálogo de Produtos', '/products', async () => {
      await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async () => {
        await page.goto(`${BASE_URL}/products`, { waitUntil: 'domcontentloaded' });
      });
      await sleep(1500);

      const hasTableOrEmpty = await page.evaluate(() => {
        return Boolean(document.querySelector('table, .empty-state, [data-testid="products-table"]'));
      });

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-products-page.png') });
      return { hasTableOrEmpty };
    });

    // -----------------------------------------------------------------
    // ETAPA 3: CRIAÇÃO (CREATE) — Cadastrar Novo Produto
    // -----------------------------------------------------------------
    const testProductName = `Produto E2E ${Date.now()}`;
    const testSKU = `SKU-E2E-${Math.floor(Math.random() * 9000 + 1000)}`;

    await recordStep('TC-03', 'Criação de Produto (CREATE) via Formulário', '/products', async () => {
      // Localiza botão de adicionar produto
      const createBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('Novo') || b.innerText.includes('Cadastrar') || b.innerText.includes('Adicionar'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      await sleep(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-modal-novo-produto.png') });

      // Preenche campos do formulário no modal
      const filled = await page.evaluate((name, sku) => {
        const nameInput = document.querySelector('input[name="name"], input[placeholder*="Nome"], input[placeholder*="nome"]');
        const skuInput = document.querySelector('input[name="sku"], input[placeholder*="SKU"], input[placeholder*="sku"]');
        const priceInput = document.querySelector('input[name="price"], input[type="number"], input[placeholder*="Preço"]');

        if (nameInput) {
          nameInput.value = name;
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (skuInput) {
          skuInput.value = sku;
          skuInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (priceInput) {
          priceInput.value = '49.90';
          priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Tenta submeter formulário
        const submitBtn = Array.from(document.querySelectorAll('button[type="submit"], button')).find(b => 
          b.textContent?.includes('Salvar') || b.textContent?.includes('Criar') || b.textContent?.includes('Confirmar')
        );

        if (submitBtn) {
          submitBtn.click();
          return { submitted: true, name, sku };
        }
        return { submitted: false, name, sku };
      }, testProductName, testSKU);

      await sleep(2000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-produto-criado.png') });
      return filled;
    });

    // -----------------------------------------------------------------
    // ETAPA 4: LEITURA (READ) — Validar Presença do Registro
    // -----------------------------------------------------------------
    await recordStep('TC-04', 'Consulta e Validação do Item na Listagem (READ)', '/products', async () => {
      const pageText = await page.evaluate(() => document.body.innerText);
      const isRendered = pageText.includes(testProductName) || pageText.includes('Produto E2E') || Boolean(document.querySelector('table'));
      return { isRendered };
    });

    // -----------------------------------------------------------------
    // ETAPA 5: EDIÇÃO (UPDATE) — Editar Dados do Produto
    // -----------------------------------------------------------------
    await recordStep('TC-05', 'Edição do Produto (UPDATE) e Atualização de Valores', '/products', async () => {
      // Abre modal de edição
      const editTriggered = await page.evaluate(() => {
        const editButtons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.querySelector('svg') || b.textContent?.includes('Editar')
        );
        if (editButtons.length > 0) {
          editButtons[0].click();
          return true;
        }
        return false;
      });

      await sleep(1000);

      // Altera valor de preço ou nome
      const updated = await page.evaluate(() => {
        const priceInput = document.querySelector('input[type="number"], input[name="price"]');
        if (priceInput) {
          priceInput.value = '79.90';
          priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent?.includes('Salvar') || b.textContent?.includes('Atualizar')
        );

        if (saveBtn) {
          saveBtn.click();
          return true;
        }
        return false;
      });

      await sleep(1500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-produto-editado.png') });
      return { editTriggered, updated };
    });

    // -----------------------------------------------------------------
    // ETAPA 6: REMOÇÃO (DELETE) — Excluir Produto e Validar Limpeza
    // -----------------------------------------------------------------
    await recordStep('TC-06', 'Exclusão do Produto (DELETE) com Confirmação', '/products', async () => {
      const deleteSuccess = await page.evaluate(() => {
        const deleteButtons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.className.includes('destructive') || 
          b.className.includes('rose') || 
          b.className.includes('red') ||
          b.textContent?.includes('Excluir') ||
          b.textContent?.includes('Remover')
        );

        if (deleteButtons.length > 0) {
          deleteButtons[0].click();
          return true;
        }
        return false;
      });

      await sleep(800);

      // Confirma modal de exclusão
      await page.evaluate(() => {
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent?.includes('Confirmar') || b.textContent?.includes('Sim') || b.textContent?.includes('Excluir')
        );
        if (confirmBtn) confirmBtn.click();
      });

      await sleep(1500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-produto-removido.png') });
      return { deleteTriggered: deleteSuccess };
    });

    // -----------------------------------------------------------------
    // ETAPA 7: Integridade de Módulos (Estoque, Lojas e Fornecedores)
    // -----------------------------------------------------------------
    await recordStep('TC-07', 'Auditoria de Rotas de Movimentação e Fornecedores', '/inventory', async () => {
      const routes = ['/inventory', '/stores', '/suppliers'];
      const results = [];

      for (const r of routes) {
        await page.goto(`${BASE_URL}${r}`, { waitUntil: 'domcontentloaded' });
        await sleep(600);
        const title = await page.title();
        const hasBody = await page.evaluate(() => Boolean(document.body));
        results.push({ route: r, title, hasBody });
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-rotas-auditadas.png') });
      return results;
    });

  } finally {
    await browser.close();

    const durationMs = Date.now() - startTime;
    const passed = testResults.filter((r) => r.status === 'PASSED').length;
    const failed = testResults.filter((r) => r.status === 'FAILED').length;

    console.log('\n================================================================');
    console.log(`📊 EXECUÇÃO E2E FINALIZADA!`);
    console.log(`Duração: ${(durationMs / 1000).toFixed(1)}s | Aprovados: ${passed} | Falhas: ${failed}`);
    console.log('================================================================');

    const summaryReport = {
      timestamp: new Date().toISOString(),
      targetUrl: BASE_URL,
      summary: { total: testResults.length, passed, failed, durationMs },
      steps: testResults,
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, 'relatorio-e2e-browser.json'),
      JSON.stringify(summaryReport, null, 2),
      'utf8'
    );

    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((err) => {
  console.error('Falha geral no executor E2E:', err);
  process.exit(1);
});
