---
id: REF-OLIVELAS-API-AI-INTEGRATION
title: Guia de Integração de API & IA Externa (Loja GNZ)
type: Reference
status: Confirmed
owner: project-maintainers
created: 2026-10-02
updated: 2026-10-02
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

Todas as requisições REST devem incluir os seguintes cabeçalhos HTTP:

```http
apikey: sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ
Authorization: Bearer <TOKEN_HBAC_OU_CHAVE_API>
Content-Type: application/json
```

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

---

## 5. Catálogo de Relatórios Disponíveis via API para IA Externa

Abaixo estão os relatórios processados e consolidados pelo sistema, prontos para consumo por modelos de IA:

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

if __name__ == "__main__":
    products = get_store_products()
    balances = get_stock_balances()
    print(f"Total de produtos resgatados: {len(products)}")
    print(f"Total de saldos resgatados: {len(balances)}")
```
