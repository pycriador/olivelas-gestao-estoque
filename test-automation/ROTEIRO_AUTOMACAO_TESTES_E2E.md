# Roteiro de Automação de Testes End-to-End (E2E) — Plataforma Olivelas

> **Versão do Roteiro:** 1.0.0  
> **Objetivo:** Guia e especificação técnica para automação em ferramentas externas (Playwright, Cypress, Selenium, Postman, Robot Framework, etc.) com cobertura de 100% dos fluxos e telas da plataforma.  
> **Ambiente de Teste:** Loja QA Dedicada (`loja-qa-automacao-e2e`)

---

## 1. Visão Geral da Arquitetura de Testes

O sistema Olivelas opera como uma aplicação web moderna (React + Vite) conectada ao banco PostgreSQL / Supabase com isolamento multi-inquilino (*multi-tenant*).

```text
[ Test Automation Suite (Cypress / Playwright / Script) ]
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Plataforma Olivelas (Frontend SPA + APIs Supabase)      │
│  ├── Tenant: Loja QA Automação E2E (loja-qa-automacao-e2e)│
│  ├── Catálogo Mestre de Produtos & Categorias             │
│  ├── Estoque com Valorização, Lotes e Validades          │
│  ├── Frente de Caixa (PDV) com Dedução Atômica           │
│  ├── Pedidos, Cancelamentos e Estorno de Estoque         │
│  ├── Ordens de Compra e Entrada de Mercadorias           │
│  ├── 9 Relatórios Estratégicos de Gestão de Varejo       │
│  └── Painel Global Admin, API HBAC e Auditoria           │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Pré-requisitos & Configuração de Ambiente

Para executar os testes em qualquer plataforma de automação, configure as seguintes variáveis:

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `BASE_URL` | URL base do frontend da aplicação | `http://localhost:5173` ou `https://seu-dominio.com` |
| `SUPABASE_URL` | Endpoint da API Supabase | `https://mffrafqyjbjitlhjnlai.supabase.co` |
| `SUPABASE_KEY` | Chave de Acesso (Service / Anon) | `sb_publishable_...` ou `sb_secret_...` |
| `STORE_SLUG` | Slug do tenant de teste | `loja-qa-automacao-e2e` |

---

## 3. Roteiro Passo a Passo de Execução

### Fase 1: Inicialização do Tenant de Testes (Store Setup)
- **Caso de Teste TC-01:** Criação ou Seleção da Loja de Teste
  - **Rota:** `/stores` ou `/global-admin`
  - **Ação:** Criar loja com nome `"Loja QA Automação E2E"` e slug `"loja-qa-automacao-e2e"`.
  - **Critério de Sucesso:** Loja criada com status `is_active = true`.

---

### Fase 2: Fornecedores & Categorias
- **Caso de Teste TC-02:** Cadastro de Fornecedor Homologado
  - **Rota:** `/suppliers`
  - **Payload / Entrada:**
    - Razão Social: `Distribuidora Central QA Testes LTDA`
    - Nome Fantasia: `Central QA Distribuição`
    - CNPJ: `44.555.666/0001-77`
    - Contato: `Roberto Alencar (QA)`
  - **Critério de Sucesso:** Fornecedor visível na listagem de fornecedores.

- **Caso de Teste TC-03:** Cadastro das Categorias de Produtos
  - **Rota:** `/categories`
  - **Entradas:**
    1. `Azeites & Temperos QA` (slug: `azeites-temperos-qa`)
    2. `Laticínios & Frios QA` (slug: `laticinios-frios-qa`)
    3. `Bebidas & Vinhos QA` (slug: `bebidas-vinhos-qa`)
    4. `Doces & Geleias QA` (slug: `doces-geleias-qa`)
  - **Critério de Sucesso:** 4 categorias listadas e disponíveis para vincular produtos.

---

### Fase 3: Catálogo Mestre de Produtos
- **Caso de Teste TC-04:** Cadastro de Produtos com Preço e Estoques Mín/Máx
  - **Rota:** `/products`
  - **Itens a Cadastrar:**
    1. `Azeite Extra Virgem QA Especial 500ml` | SKU: `QA-AZE-001` | Preço Venda: `R$ 42,90` | Custo: `R$ 26,50` | Unidade: `unidade`
    2. `Queijo Canastra Artesanal QA 500g` | SKU: `QA-QUE-002` | Preço Venda: `R$ 38,50` | Custo: `R$ 22,00` | Unidade: `unidade`
    3. `Vinho Tinto Reserva QA Seleção 750ml` | SKU: `QA-VIN-003` | Preço Venda: `R$ 79,90` | Custo: `R$ 48,00` | Unidade: `garrafa`
    4. `Geleia de Frutas Vermelhas QA 250g` | SKU: `QA-GEL-004` | Preço Venda: `R$ 19,50` | Custo: `R$ 10,20` | Unidade: `pote`
  - **Critério de Sucesso:** Produtos cadastrados com status ativo e publicados no catálogo.

---

### Fase 4: Gestão de Estoque, Lotes e Validades
- **Caso de Teste TC-05:** Carga Inicial de Estoque com Rastreabilidade
  - **Rota:** `/inventory` e `/expiration`
  - **Entrada:**
    - Quantidade Inicial: `100 unidades` para cada produto (Total: `400 unidades`).
    - Lote: `LT-QA-202610`.
    - Data de Fabricação: `01/10/2026`.
    - Data de Validade: `31/10/2026`.
  - **Critério de Sucesso:** `stock_balances.quantity = 100`, `stock_batches` ativo e movimento de entrada `ENTRY` registrado.

---

### Fase 5: Operação de Venda no PDV (Frente de Caixa)
- **Caso de Teste TC-06:** Venda com Múltiplos Itens e Dedução Atômica
  - **Rota:** `/sales`
  - **Ação:**
    - Adicionar ao carrinho:
      - 2x `Azeite Extra Virgem QA` (2 × R$ 42,90 = R$ 85,80)
      - 3x `Queijo Canastra QA` (3 × R$ 38,50 = R$ 115,50)
    - Subtotal: `R$ 201,30`
    - Desconto aplicado: `R$ 5,00`
    - Total a Pagar: `R$ 196,30`
    - Forma de Pagamento: `PIX`
    - Concluir venda.
  - **Critério de Sucesso:**
    - Pedido criado com status `DELIVERED`.
    - Estoque do Azeite deduzido automaticamente de 100 para **98 unidades**.
    - Estoque do Queijo deduzido automaticamente de 100 para **97 unidades**.

---

### Fase 6: Cancelamento de Pedido & Estorno Automático
- **Caso de Teste TC-07:** Cancelar Pedido e Validar Reversão de Saldo
  - **Rota:** `/orders`
  - **Ação:** Criar pedido com 2 unidades do `Vinho Tinto QA` (saldo vai para 98), e em seguida acionar o cancelamento com justificativa.
  - **Critério de Sucesso:**
    - Status do pedido alterado para `CANCELLED`.
    - Saldo do produto estornado de volta para **100 unidades**.
    - Movimento de estoque `RETURN` gravado na trilha de auditoria.

---

### Fase 7: Emissão e Recebimento de Ordem de Compra
- **Caso de Teste TC-08:** Emitir Ordem de Compra e Dar Entrada Físico-Financeira
  - **Rota:** `/purchasing`
  - **Ação:**
    - Emitir ordem de compra para o fornecedor `Central QA Distribuição` com 50 unidades da `Geleia de Frutas Vermelhas QA` a custo unitário de `R$ 9,50`.
    - Confirmar o recebimento da mercadoria.
  - **Critério de Sucesso:**
    - Ordem de compra passa para status `RECEIVED`.
    - Saldo em estoque da Geleia sobe de 100 para **150 unidades**.

---

### Fase 8: Varredura Completa de Todas as Telas da Aplicação

| ID | Tela / Módulo | Rota | Validação Esperada |
| :--- | :--- | :--- | :--- |
| **TC-09** | **Dashboard** | `/dashboard` | KPIs de Faturamento, Lucro, Estoque e Gráficos carregados. |
| **TC-10** | **Produtos** | `/products` | Tabela responsiva com cards mobile, busca e botões de ação visíveis. |
| **TC-11** | **Categorias** | `/categories` | Categorias cadastradas listadas com botões Editar e Excluir. |
| **TC-12** | **Estoque & Saldos** | `/inventory` | Saldos atualizados, botões de Baixa e histórico de movimentos. |
| **TC-13** | **PDV (Frente de Caixa)** | `/sales` | Catálogo de produtos interativo com carrinho e checkout ágil. |
| **TC-14** | **Pedidos** | `/orders` | Lista de vendas com detalhes, filtro de canais e cancelamento. |
| **TC-15** | **Compras** | `/purchasing` | Ordens de compra emitidas e botão de recebimento de lote. |
| **TC-16** | **Clientes** | `/customers` | Gestão de clientes com contatos e histórico. |
| **TC-17** | **Fornecedores** | `/suppliers` | Fornecedores com contatos comerciais e CNPJ. |
| **TC-18** | **Lotes & Validades** | `/expiration` | Lotes com alerta de validade em 31/10/2026 e justificativa. |
| **TC-19** | **Relatório 1: Valorização** | `/reports?tab=valuation` | Custo Total, Venda Total e Lucro Bruto do Estoque. |
| **TC-20** | **Relatório 2: Curva ABC** | `/reports?tab=abc` | Classificação automática dos produtos em A / B / C por valor. |
| **TC-21** | **Relatório 3: Fornecedores** | `/reports?tab=purchases` | Volume financeiro e margens praticadas por fornecedor. |
| **TC-22** | **Relatório 4: Canais de Venda** | `/reports?tab=channels` | Faturamento segmentado (PDV, WhatsApp, Catálogo). |
| **TC-23** | **Relatório 5: DRE Varejo** | `/reports?tab=financial` | Demonstrativo financeiro de vendas e resultado bruto. |
| **TC-24** | **Relatório 6: Rentabilidade** | `/reports?tab=margins` | Markup e margem percentual por produto. |
| **TC-25** | **Relatório 7: Giro & Demanda** | `/reports?tab=demand` | Previsão de esgotamento e sugestão de compra por consumo. |
| **TC-26** | **Relatório 8: Ticket & LTV** | `/reports?tab=customers` | Ticket médio por transação e segmentação de clientes. |
| **TC-27** | **Relatório 9: GMROI / Capital** | `/reports?tab=investment` | Retorno sobre o investimento em estoque por categoria. |
| **TC-28** | **Equipe** | `/team` | Funcionários da loja e permissões de acesso. |
| **TC-29** | **Configurações** | `/settings` | Parâmetros comerciais e dados da filial. |
| **TC-30** | **Notificações** | `/notifications` | Alertas automáticos de estoque e validades. |
| **TC-31** | **Auditoria** | `/audit` | Trilha de auditoria com payloads antes/depois. |
| **TC-32** | **Global Admin** | `/global-admin` | Visão multi-lojas, central de backup, banco de dados e API HBAC. |
| **TC-33** | **Catálogo Público Web** | `/store/:slug` | Vitrine online responsiva com produtos publicados. |

---

## 4. Exemplo de Implementação em Playwright (Node.js)

```javascript
import { test, expect } from '@playwright/test';

test.describe('E2E Olivelas - Fluxo Completo de Gestão de Estoque e PDV', () => {
  test('Executar Venda e Validar Dedução de Estoque', async ({ page }) => {
    // 1. Acessar o PDV
    await page.goto('/sales');
    
    // 2. Selecionar Produto
    await page.click('text="Azeite Extra Virgem QA Especial 500ml"');
    
    // 3. Selecionar Forma de Pagamento e Finalizar
    await page.click('button:has-text("PIX")');
    await page.click('button:has-text("Finalizar Venda")');
    
    // 4. Validar Mensagem de Sucesso
    await expect(page.locator('text=Venda #')).toBeVisible();
    
    // 5. Conferir Dedução no Estoque
    await page.goto('/inventory');
    await expect(page.locator('text=98 un')).toBeVisible();
  });
});
```
