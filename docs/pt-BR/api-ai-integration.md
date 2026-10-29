---
id: REF-OLIVELAS-API-AI-INTEGRATION
title: Guia de Integração de API & IA Externa (Loja GNZ)
type: Reference
status: Confirmed
owner: project-maintainers
created: 2026-10-02
updated: 2026-10-28
language: pt-BR
classification: Confirmed
---

# Guia de Integração de API & IA Externa — Olivelas

Este documento descreve os endpoints REST, cabeçalhos de autenticação, tokens HBAC e catálogo de relatórios disponíveis para integração com IAs externas (ChatGPT, Claude, Custom Agents, n8n, LangChain, etc.), utilizando como ambiente de teste e referência a loja **GNZ Hortifruti**.

---

## 1. Contexto da Loja de Teste (GNZ Hortifruti)

- **Nome da Loja:** `GNZ Hortifruti`
- **Slug:** `gnz-hortifruti`
- **ID da Loja (`store_id`):** `f8fdfd0e-a13a-44a6-ba98-53e61be300db`
- **Base URL da API:** `https://mffrafqyjbjitlhjnlai.supabase.co/rest/v1`

---

## 2. Autenticação & Cabeçalhos Obrigatórios

Todas as requisições REST de agentes externos ao PostgREST devem incluir os seguintes cabeçalhos HTTP:

```http
apikey: sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ
Authorization: Bearer sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ
X-HBAC-Token: olv_live_<SEU_TOKEN_HBAC>
X-Store-ID: f8fdfd0e-a13a-44a6-ba98-53e61be300db
Content-Type: application/json
```

> **Como funciona a validação (Migration `20261028000020_hbac_api_integration.sql`):**
> 1. O hook `public.check_hbac_pre_request` (registrado em `pgrst.db_pre_request`) intercepta toda requisição que envia `X-HBAC-Token`, validando se o token existe, está ativo (`is_active = true`), não expirou (`expires_at`), pertence à loja enviada em `X-Store-ID` e possui o escopo exigido pelo endpoint e método HTTP (`GET`, `POST`, `PATCH`, `DELETE`).
> 2. As políticas RLS (`public.has_hbac_scope(store_id, required_scopes)`) garantem isolamento por linha para que cada token acesse exclusivamente os registros da sua filial.
> 3. Em inserções diretas em `/stock_movements` (`POST`), o trigger `trg_api_stock_movement_sync` calcula automaticamente `previous_quantity` e `new_quantity` e sincroniza o saldo físico em `stock_balances`.

---

## 3. Tokens Individuais por Escopo HBAC (Loja GNZ)

Os seguintes tokens foram gerados e testados com sucesso para cada escopo de acesso:

| Categoria | Nome do Token | Token Gerado | Escopos HBAC | Finalidade |
| :--- | :--- | :--- | :--- | :--- |
| **Full Admin** | Token GNZ - Acesso Completo | `olv_live_de149281982227867223b7bd3398f930` | `["*"]` | Acesso total irrestrito a todos os recursos |
| **Produtos** | Token GNZ - Catálogo & SKUs | `olv_live_49a8e80f7f1f1391231fde8e8552972d` | `["products:read", "products:write", "products:delete"]` | Consulta e gestão de produtos e categorias |
| **Estoque** | Token GNZ - Saldos & Lotes | `olv_live_dab4e871f26b8dc93a4b8baf4b0b3749` | `["inventory:read", "inventory:write", "inventory:adjust"]` | Consulta de saldos físicos, lotes e baixas |
| **Vendas** | Token GNZ - Pedidos & PDV | `olv_live_b6a44321797e7157b47b7d229a117de9` | `["orders:read", "orders:write", "orders:cancel"]` | Consulta e emissão de pedidos de venda |
| **Compras** | Token GNZ - Ordens de Compra | `olv_live_44685076d542430c49b3754670c18f62` | `["purchases:read", "purchases:write"]` | Consulta e emissão de compras e fornecedores |
| **Clientes** | Token GNZ - CRM & Contatos | `olv_live_1aa20a150c52f63cfc9b431700b54a2c` | `["customers:read", "customers:write"]` | Gestão de clientes e histórico |
| **Relatórios / IA** | Token GNZ - IA & Relatórios | `olv_live_385c7a49ed39355ba88dda8537d2d7b3` | `["reports:read", "reports:export"]` | Leitura de métricas executivas, Curva ABC e KPIs |
| **Auditoria** | Token GNZ - Logs & Trilha | `olv_live_7129070536bf0acefbdfb37cace609fb` | `["audit:read"]` | Consulta a logs de auditoria e segurança |

---

## 4. Endpoints REST de Dados Mestre

Todos os endpoints utilizam a convenção PostgREST. Para filtrar por loja, inclua `store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db`.

### 4.1. Catálogo de Produtos
`GET /products?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,name,sku,barcode,unit,min_stock,max_stock,cost_price,selling_price,category_id,is_active`

### 4.2. Saldos de Estoque
`GET /stock_balances?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,product_id,quantity,reserved_quantity,available_quantity,updated_at`

### 4.3. Lotes & Validades
`GET /stock_batches?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,product_id,lot_number,quantity,cost_price,expiration_date,status`

### 4.4. Movimentações de Estoque
`GET /stock_movements?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,movement_type,quantity,previous_quantity,new_quantity,unit_cost,created_at&order=created_at.desc`

### 4.5. Pedidos de Venda
`GET /orders?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,order_number,status,subtotal,discount_amount,total_amount,created_at`

### 4.6. Ordens de Compra
`GET /purchase_orders?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,order_number,status,total_amount,issued_at,received_at,supplier_id`

### 4.7. Clientes
`GET /customers?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,name,document,email,phone,status`

### 4.8. Fornecedores
`GET /suppliers?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,trade_name,corporate_name,document,phone,email,status`

### 4.9. Categorias, Centros de Custo & Motivos de Perda
- `GET /categories?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,name`
- `GET /cost_centers?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,code,name,is_active`
- `GET /loss_reasons?select=code,label,default_cost_center_code,requires_approval`

### 4.10. Logs de Auditoria & Notificações (`audit:read`)
- `GET /audit_logs?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,action,entity,entity_id,created_at&order=created_at.desc&limit=50`
- `GET /notifications?store_id=eq.f8fdfd0e-a13a-44a6-ba98-53e61be300db&select=id,title,type,is_read,created_at&order=created_at.desc&limit=50`

---

## 4B. Endpoints REST de Escrita e Operações (POST / PATCH)

Para retornar o registro criado ou atualizado na resposta, inclua o cabeçalho `Prefer: return=representation`.

| Escopo HBAC | Método & Endpoint | Payload / Parâmetros | Comportamento no Banco |
| :--- | :--- | :--- | :--- |
| `products:write` | `POST /products` | `{"store_id": "<uuid>", "name": "...", "sku": "...", "unit": "UN", "min_stock": 5, "max_stock": 1000, "cost_price": 10.0, "selling_price": 18.5, "is_active": true}` | Cadastra novo item no catálogo da filial |
| `products:write` | `PATCH /products?id=eq.<id>&store_id=eq.<uuid>` | `{"selling_price": 19.9, "min_stock": 10}` | Atualiza dados mestres do produto |
| `products:delete` | `PATCH /products?id=eq.<id>&store_id=eq.<uuid>` | `{"is_active": false}` | Desativa o produto no catálogo (soft-delete) |
| `inventory:write` | `POST /stock_movements` | `{"store_id": "<uuid>", "product_id": "<uuid>", "movement_type": "ENTRY", "quantity": 10, "unit_cost": 15.0, "notes": "Entrada via API"}` | Trigger `trg_api_stock_movement_sync` preenche `previous_quantity`/`new_quantity` e soma no saldo de `stock_balances` |
| `inventory:adjust` | `POST /stock_movements` | `{"store_id": "<uuid>", "product_id": "<uuid>", "movement_type": "LOSS", "quantity": 2, "reason_code": "AVARIA", "notes": "Baixa via API"}` | Trigger deduz automaticamente do saldo físico em `stock_balances` (impedindo saldo negativo) |
| `customers:write` | `POST /customers` | `{"store_id": "<uuid>", "name": "...", "document": "...", "phone": "...", "email": "...", "status": "ACTIVE"}` | Cadastra novo cliente no CRM da filial |
| `customers:write` | `PATCH /customers?id=eq.<id>&store_id=eq.<uuid>` | `{"phone": "...", "status": "ACTIVE"}` | Atualiza dados cadastrais do cliente |
| `orders:write` | `POST /orders` | `{"store_id": "<uuid>", "customer_id": "<uuid>", "order_number": "PED-1001", "channel": "API", "status": "PENDING", "subtotal": 50.0, "discount_amount": 0, "total_amount": 50.0}` | Emite novo pedido de venda (`channel` aceita `API`, `IN_STORE`, `WHATSAPP`, `CATALOG`, `ECOMMERCE`) |
| `orders:write` | `POST /order_items` | `{"store_id": "<uuid>", "order_id": "<uuid>", "product_id": "<uuid>", "quantity": 2, "unit_price": 25.0, "discount": 0, "total_price": 50.0}` | Vincula itens ao pedido emitido |
| `orders:cancel` | `PATCH /orders?id=eq.<id>&store_id=eq.<uuid>` | `{"status": "CANCELLED", "cancellation_reason": "Cancelamento via API"}` | Cancela o pedido de venda |
| `purchases:write` | `POST /suppliers` | `{"store_id": "<uuid>", "corporate_name": "...", "trade_name": "...", "document": "...", "status": "ACTIVE"}` | Cadastra fornecedor na filial |
| `purchases:write` | `POST /purchase_orders` | `{"store_id": "<uuid>", "supplier_id": "<uuid>", "order_number": "OC-1001", "status": "DRAFT", "subtotal": 350.0, "total_amount": 350.0}` | Cria ordem de compra |
| `purchases:write` | `PATCH /purchase_orders?id=eq.<id>&store_id=eq.<uuid>` | `{"status": "ISSUED", "notes": "..."}` | Atualiza ordem de compra |

---

## 5. Catálogo de Relatórios Disponíveis via API para IA Externa (`/rpc/get_ai_report`)

A API expõe a RPC consolidada `public.get_ai_report(p_report, p_store_id)`, que pode ser chamada via `GET` ou `POST`:

- **Via `GET`:** `GET /rest/v1/rpc/get_ai_report?p_report=<alias_ou_id>&p_store_id=f8fdfd0e-a13a-44a6-ba98-53e61be300db`
- **Via `POST`:** `POST /rest/v1/rpc/get_ai_report` com body `{"p_report": "<alias_ou_id>", "p_store_id": "f8fdfd0e-a13a-44a6-ba98-53e61be300db"}`
- **Catálogo de relatórios disponíveis:** `GET /rest/v1/rpc/get_ai_report?p_report=list&p_store_id=f8fdfd0e-a13a-44a6-ba98-53e61be300db`

Abaixo estão os relatórios processados e consolidados pelo banco, prontos para consumo por modelos de IA:

### 1. `retail_summary_kpis` (Métricas Executivas Consolidadas)
- **Descrição:** Indicadores macro de saúde financeira do estoque e vendas.
- **Campos:** `totalActiveProducts`, `totalPhysicalUnits`, `totalCostValuation`, `totalSellingValuation`, `potentialProfit`, `marginPercent`, `stockoutsCount`, `lowStockCount`, `monthSalesTotal`, `lossesTotalValue`.

### 2. `stock_valuation` (Valorização & Lucratividade do Estoque)
- **Descrição:** Tabela consolidada com cálculo de Custo Total, Venda Total, Lucro Estimado e Margem % por produto.
- **Campos por Item:** `productId`, `productName`, `productSku`, `categoryName`, `quantity`, `unit`, `costPrice`, `sellingPrice`, `totalCostValue`, `totalSellingValue`, `potentialProfit`, `marginPercent`, `status`.

### 3. `abc_curve_pareto` (Curva ABC & Mix de Faturamento)
- **Descrição:** Classificação de Pareto 80/15/5 baseada no potencial de faturamento e giro do mix.
- **Campos por Item:** `productId`, `productName`, `productSku`, `categoryName`, `quantity`, `unit`, `unitCost`, `unitSelling`, `totalValue`, `percentOfTotal`, `cumulativePercent`, `classification` (`A`, `B`, `C`), `strategy`.

### 4. `demand_purchasing` (Compra Baseada no Consumo & Giro de Estoque)
- **Descrição:** Cálculo do consumo médio diário (base 30 dias), dias de cobertura (runout), sugestão de compra para meta de cobertura e investimento projetado.
- **Campos por Item:** `productId`, `productName`, `productSku`, `categoryName`, `unit`, `currentStock`, `minStock`, `dailyConsumption`, `monthlySalesQty`, `stockCoverageDays`, `suggestedPurchaseQty`, `unitCost`, `suggestedInvestment`, `urgency` (`URGENT`, `ATTENTION`, `NORMAL`, `OVERSTOCK`).

### 5. `customer_ticket_ltv` (Ticket Médio & Comportamento de Clientes / LTV)
- **Descrição:** Análise de valor da vida útil (LTV), total de pedidos, ticket médio por compra, recência em dias, canal de compra preferido e segmentação de clientes.
- **Campos por Item:** `customerId`, `customerName`, `document`, `phone`, `email`, `status`, `totalOrders`, `totalSpent`, `averageTicket`, `lastOrderDate`, `daysSinceLastOrder`, `topChannel`, `customerSegment` (`VIP`, `FREQUENT`, `OCCASIONAL`, `INACTIVE`).

### 6. `capital_investment` (Levantamento & Investimento de Capital de Giro por Categoria)
- **Descrição:** Consolidação do capital investido (a custo) por categoria de mercadoria, potencial na gôndola, lucro projetado, percentual de alocação no estoque e GMROI.
- **Campos por Item:** `categoryId`, `categoryName`, `productsCount`, `totalPhysicalUnits`, `totalInvestedCost`, `totalSellingPotential`, `potentialProfit`, `marginPercent`, `shareOfTotalInvestment`, `gmroi`.

### 7. `stockout_replenishment` (Ruptura & Necessidade de Compra)
- **Descrição:** SKUs zerados (`CRITICAL`) ou operando abaixo do estoque mínimo (`WARNING`), com déficit e custo de reposição.
- **Campos por Item:** `productId`, `productName`, `productSku`, `categoryName`, `unit`, `quantity`, `minStock`, `deficit`, `costPrice`, `sellingPrice`, `replenishmentCost`, `urgency`.

### 8. `purchasing_history` (Histórico de Compras & Fornecedores)
- **Descrição:** Volume financeiro de compras, pedidos recebidos e margem prevista por lote de entrada.
- **Campos por Item:** `id`, `orderNumber`, `supplierName`, `itemsCount`, `totalCost`, `totalSellingValue`, `potentialProfit`, `marginPercent`, `status`, `issuedAt`, `receivedAt`.

### 9. `operational_losses` (Perdas, Avarias & Baixas Operacionais)
- **Descrição:** Quebras, avarias, vencimentos e desvios com totalização financeira e centro de custo.
- **Campos por Item:** `id`, `movementType`, `createdAt`, `productName`, `productSku`, `quantity`, `unitCost`, `totalLossValue`, `reasonCode`, `reasonLabel`, `costCenterCode`, `operatorName`, `notes`.

### 10. `sales_performance` (Desempenho de Vendas & PDV)
- **Descrição:** Faturamento consolidado, canais de venda, descontos concedidos e itens por transação.
- **Campos por Item:** `id`, `orderNumber`, `customerName`, `channel`, `itemsCount`, `subtotal`, `discountAmount`, `totalAmount`, `status`, `createdAt`.

---

## 6. Exemplo de Código para IA Externa (Python)

```python
import requests

BASE_URL = "https://mffrafqyjbjitlhjnlai.supabase.co/rest/v1"
STORE_ID = "f8fdfd0e-a13a-44a6-ba98-53e61be300db"
API_TOKEN = "olv_live_385c7a49ed39355ba88dda8537d2d7b3" # Token de Relatórios & IA
SUPABASE_KEY = "sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "X-HBAC-Token": API_TOKEN,
    "X-Store-ID": STORE_ID,
    "Content-Type": "application/json"
}

def get_store_products():
    url = f"{BASE_URL}/products?store_id=eq.{STORE_ID}&is_active=eq.true&select=id,name,sku,cost_price,selling_price,min_stock"
    response = requests.get(url, headers=headers)
    return response.json()

def get_stock_balances():
    url = f"{BASE_URL}/stock_balances?store_id=eq.{STORE_ID}&select=id,product_id,quantity,reserved_quantity"
    response = requests.get(url, headers=headers)
    return response.json()

def get_executive_kpis():
    url = f"{BASE_URL}/rpc/get_ai_report?p_report=kpis&p_store_id={STORE_ID}"
    response = requests.get(url, headers=headers)
    return response.json()

if __name__ == "__main__":
    products = get_store_products()
    balances = get_stock_balances()
    kpis = get_executive_kpis()
    print(f"Total de produtos resgatados: {len(products)}")
    print(f"Total de saldos resgatados: {len(balances)}")
    print(f"KPIs executivos: {kpis}")
```

---

## 7. Arquitetura de Segurança & Homologação de Produção

### 7.1. Defesa em Profundidade (3 Camadas no PostgreSQL / PostgREST)
1. **Camada 1 — Interceptação Pré-Request (`pgrst.db_pre_request` → `public.check_hbac_pre_request`):**
   - Executada pelo PostgREST antes de qualquer query ou mutação quando `X-HBAC-Token` está presente.
   - Rejeita com código SQL `28000` (`HTTP 403`) tokens inexistentes ou expirados (`expires_at <= NOW()`).
   - Rejeita com código SQL `42501` (`HTTP 401`) tokens desativados (`is_active = false`), tentativas de acesso cruzado entre lojas (`X-Store-ID` diferente do `store_id` do token) e falta do escopo HBAC exigido para o par `(endpoint, método HTTP)`.
2. **Camada 2 — Row-Level Security por Linha (`public.has_hbac_scope(store_id, required_scopes)`):**
   - Mesmo que um agente tente omitir filtros ou injetar outro `store_id` no corpo/query, todas as políticas `SELECT`, `INSERT`, `UPDATE` e `DELETE` exigem que `store_id` coincida com a filial autorizada no token.
3. **Camada 3 — Proteção de Credenciais e Grants (`public.api_tokens`):**
   - A política `anon_read_own_hbac_token_only` garante que requisições anônimas sem `X-HBAC-Token` recebam `0` linhas (`[]`) em `/rest/v1/api_tokens`, e um token válido só enxerga a sua própria linha.
   - O role `anon` possui `REVOKE INSERT, UPDATE, DELETE` em `public.api_tokens`, impedindo criação ou escalonamento de privilégios via API externa.

### 7.2. Matriz de Status de Validação E2E em Produção (53/53 Testes Aprovados)
Todos os **53 cenários de integração e segurança** foram executados e aprovados contra a instância de produção (`https://mffrafqyjbjitlhjnlai.supabase.co/rest/v1`):
- **Inspeção de Token (`1/1`):** Leitura isolada do próprio token e validação dos 23 escopos ativos.
- **Produtos & Catálogo (`7/7`):** `GET /stores`, `GET /categories`, `GET /products`, `POST /products`, `PATCH /products` (edição de preço, desativação `products:delete` e reativação).
- **Estoque, Lotes & Movimentações (`9/9`):** `GET /stock_balances`, `GET /stock_batches`, `GET /stock_movements`, `GET /cost_centers`, `GET /loss_reasons`, `POST /stock_movements` (`ENTRY +10` e `LOSS -2` com cálculo automático de `previous_quantity`/`new_quantity` e atualização em tempo real de `stock_balances`).
- **Clientes & CRM (`4/4`):** `GET /customers`, `GET /customer_addresses`, `POST /customers`, `PATCH /customers`.
- **Pedidos & PDV (`6/6`):** `GET /orders`, `GET /order_items`, `GET /payments`, `POST /orders`, `POST /order_items`, `PATCH /orders` (`orders:cancel`).
- **Compras & Fornecedores (`6/6`):** `GET /suppliers`, `GET /purchase_orders`, `GET /purchase_order_items`, `POST /suppliers`, `POST /purchase_orders`, `PATCH /purchase_orders`.
- **Relatórios Analíticos & IA (`12/12`):** `GET` e `POST` em `/rpc/get_ai_report` para `list`, `kpis`, `valuation`, `abc`, `stockouts`, `demand`, `customers`, `capital`, `purchases`, `losses` e `sales`.
- **Auditoria & Notificações (`2/2`):** `GET /audit_logs` e `GET /notifications`.
- **Segurança & Bloqueio de Ataques (`6/6`):** Bloqueio de leitura anônima de `/api_tokens` e `/orders`, bloqueio de `POST /products` sem token (`42501`), bloqueio de token forjado (`28000`), bloqueio de tentativa Cross-Tenant em outra loja (`42501`) e bloqueio de tentativa de inserção em `/api_tokens` (`42501`).
