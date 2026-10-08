# Relatório Executivo da Execução de Testes E2E

**Plataforma:** Olivelas Gestão de Estoque  
**Loja de Teste:** `Loja QA Automação E2E` (ID: `809ab043-acca-44a8-9d5b-3d63de7f9d35`, Slug: `loja-qa-automacao-e2e`)  
**Data/Hora de Execução:** `08/10/2026, 08:50:17`  
**Duração Total:** `21.09 segundos`  
**Taxa de Sucesso:** `100.0%`  

---

## 📊 Sumário Consolidado

| Indicador | Quantidade | Percentual |
| :--- | :---: | :---: |
| **Total de Casos de Teste (TCs)** | **33** | 100% |
| **Passaram com Sucesso (Passed)** | **33** | **100.0%** |
| **Falhas Encontradas (Failed)** | **0** | **0.0%** |

---

## 📋 Tabela Detalhada de Execução por Caso de Teste

| ID | Caso de Teste / Módulo | Categoria | Duração | Status |
| :--- | :--- | :--- | :---: | :---: |
| **TC-01** | Inicializar Loja de Teste QA Dedicada | *Tenant / Setup* | `792ms` | **✅ Aprovado** |
| **TC-02** | Cadastrar Fornecedor Homologado para a Loja QA | *Fornecedores* | `889ms` | **✅ Aprovado** |
| **TC-03** | Cadastrar Categorias Estruturais no Catálogo | *Categorias* | `1719ms` | **✅ Aprovado** |
| **TC-04** | Cadastrar Produtos no Catálogo Mestre com Preços e SKUs | *Produtos* | `2826ms` | **✅ Aprovado** |
| **TC-05** | Dar Entrada de Estoque Inicial com Lotes e Validades (100 un/item) | *Estoque / Lotes* | `5055ms` | **✅ Aprovado** |
| **TC-06** | Executar Venda no PDV e Validar Dedução Atômica de Estoque | *PDV / Vendas* | `2281ms` | **✅ Aprovado** |
| **TC-07** | Cancelar Pedido e Validar Estorno Automático de Estoque | *Pedidos / Cancelamento* | `1457ms` | **✅ Aprovado** |
| **TC-08** | Emitir Ordem de Compra e Confirmar Recebimento Físico | *Compras / Reposição* | `1068ms` | **✅ Aprovado** |
| **TC-09** | Acesso & Validação da Tela: Painel Geral & Métricas (Dashboard) (/dashboard) | *Navegação / Telas* | `433ms` | **✅ Aprovado** |
| **TC-10** | Acesso & Validação da Tela: Catálogo de Produtos Mestre (/products) | *Navegação / Telas* | `196ms` | **✅ Aprovado** |
| **TC-11** | Acesso & Validação da Tela: Categorias de Produtos (/categories) | *Navegação / Telas* | `183ms` | **✅ Aprovado** |
| **TC-12** | Acesso & Validação da Tela: Estoque, Saldos & Movimentações (/inventory) | *Navegação / Telas* | `351ms` | **✅ Aprovado** |
| **TC-13** | Acesso & Validação da Tela: Frente de Caixa (PDV) (/sales) | *Navegação / Telas* | `155ms` | **✅ Aprovado** |
| **TC-14** | Acesso & Validação da Tela: Histórico de Pedidos & Vendas (/orders) | *Navegação / Telas* | `172ms` | **✅ Aprovado** |
| **TC-15** | Acesso & Validação da Tela: Gestão de Compras & Fornecedores (/purchasing) | *Navegação / Telas* | `206ms` | **✅ Aprovado** |
| **TC-16** | Acesso & Validação da Tela: Gestão de Clientes (/customers) | *Navegação / Telas* | `201ms` | **✅ Aprovado** |
| **TC-17** | Acesso & Validação da Tela: Gestão de Fornecedores (/suppliers) | *Navegação / Telas* | `168ms` | **✅ Aprovado** |
| **TC-18** | Acesso & Validação da Tela: Lotes, Validades & Justificativas (/expiration) | *Navegação / Telas* | `166ms` | **✅ Aprovado** |
| **TC-19** | Acesso & Validação da Tela: Relatório: Valorização & Rentabilidade do Estoque (/reports?tab=valuation) | *Navegação / Telas* | `183ms` | **✅ Aprovado** |
| **TC-20** | Acesso & Validação da Tela: Relatório: Curva ABC & Mix de Produtos (/reports?tab=abc) | *Navegação / Telas* | `419ms` | **✅ Aprovado** |
| **TC-21** | Acesso & Validação da Tela: Relatório: Compras por Fornecedor (/reports?tab=purchases) | *Navegação / Telas* | `165ms` | **✅ Aprovado** |
| **TC-22** | Acesso & Validação da Tela: Relatório: Vendas por Canal (PDV, Whats, Catálogo) (/reports?tab=channels) | *Navegação / Telas* | `164ms` | **✅ Aprovado** |
| **TC-23** | Acesso & Validação da Tela: Relatório: Demonstrativo Financeiro (DRE Varejo) (/reports?tab=financial) | *Navegação / Telas* | `167ms` | **✅ Aprovado** |
| **TC-24** | Acesso & Validação da Tela: Relatório: Margens de Lucro & Markup (/reports?tab=margins) | *Navegação / Telas* | `167ms` | **✅ Aprovado** |
| **TC-25** | Acesso & Validação da Tela: Relatório: Giro de Estoque & Demanda / Reposição (/reports?tab=demand) | *Navegação / Telas* | `162ms` | **✅ Aprovado** |
| **TC-26** | Acesso & Validação da Tela: Relatório: Ticket Médio & LTV de Clientes (/reports?tab=customers) | *Navegação / Telas* | `163ms` | **✅ Aprovado** |
| **TC-27** | Acesso & Validação da Tela: Relatório: Investimento de Capital de Giro & GMROI (/reports?tab=investment) | *Navegação / Telas* | `169ms` | **✅ Aprovado** |
| **TC-28** | Acesso & Validação da Tela: Equipe da Loja & Gestão de Acessos (/team) | *Navegação / Telas* | `157ms` | **✅ Aprovado** |
| **TC-29** | Acesso & Validação da Tela: Configurações Comerciais & Dados da Loja (/settings) | *Navegação / Telas* | `172ms` | **✅ Aprovado** |
| **TC-30** | Acesso & Validação da Tela: Central de Notificações & Alertas (/notifications) | *Navegação / Telas* | `182ms` | **✅ Aprovado** |
| **TC-31** | Acesso & Validação da Tela: Trilha de Auditoria (Logs) (/audit) | *Navegação / Telas* | `169ms` | **✅ Aprovado** |
| **TC-32** | Acesso & Validação da Tela: Painel de Administração Global Multi-Lojas (/global-admin) | *Navegação / Telas* | `169ms` | **✅ Aprovado** |
| **TC-33** | Acesso & Validação da Tela: Catálogo Público Web da Loja QA (/store/loja-qa-automacao-e2e) | *Navegação / Telas* | `155ms` | **✅ Aprovado** |

---

## 🔍 Detalhamento das Asserções e Validações por Etapa

### TC-01 — Inicializar Loja de Teste QA Dedicada
- **Status:** ✅ Sucesso
- **Categoria:** Tenant / Setup
- **Tempo de Execução:** 792 ms
- **Asserções Verificadas:**
  - [x] Loja de teste criada ou localizada com sucesso
  - [x] Slug corresponde ao padrão do tenant
  - [x] Loja está com status ativo
- **Dados Produzidos / Verificados:**
```json
{
  "storeId": "809ab043-acca-44a8-9d5b-3d63de7f9d35",
  "name": "Loja QA Automação E2E",
  "slug": "loja-qa-automacao-e2e"
}
```

### TC-02 — Cadastrar Fornecedor Homologado para a Loja QA
- **Status:** ✅ Sucesso
- **Categoria:** Fornecedores
- **Tempo de Execução:** 889 ms
- **Asserções Verificadas:**
  - [x] Fornecedor de teste registrado com ID válido
  - [x] Razão social cadastrada corretamente
- **Dados Produzidos / Verificados:**
```json
{
  "supplierId": "2ac01f88-d1fd-4dae-8ce3-0dd1b779a676",
  "tradeName": "Central QA Distribuição"
}
```

### TC-03 — Cadastrar Categorias Estruturais no Catálogo
- **Status:** ✅ Sucesso
- **Categoria:** Categorias
- **Tempo de Execução:** 1719 ms
- **Asserções Verificadas:**
  - [x] Todas as 4 categorias foram criadas no tenant
- **Dados Produzidos / Verificados:**
```json
{
  "azeites-temperos-qa": "97174a78-bdea-42b0-9d15-221a1c1b0e17",
  "laticinios-frios-qa": "4031fce1-66ab-4093-bd11-1578efcc6c10",
  "bebidas-vinhos-qa": "0f2c88e9-14c5-4fdb-8f76-593f0a79075c",
  "doces-geleias-qa": "deb23bc5-c826-426f-814f-65f5857ee9e8"
}
```

### TC-04 — Cadastrar Produtos no Catálogo Mestre com Preços e SKUs
- **Status:** ✅ Sucesso
- **Categoria:** Produtos
- **Tempo de Execução:** 2826 ms
- **Asserções Verificadas:**
  - [x] 4 produtos cadastrados e mapeados no banco
  - [x] Produto QA-AZE-001 cadastrado com preço correto
  - [x] Produto QA-VIN-003 ativo e publicado
- **Dados Produzidos / Verificados:**
```json
[
  {
    "id": "bc0d0805-a691-47ea-9fb1-861d18ca99c7",
    "sku": "QA-AZE-001",
    "name": "Azeite Extra Virgem QA Especial 500ml",
    "price": 42.9
  },
  {
    "id": "921989f8-1add-415f-8dfc-7c69cd79cbd5",
    "sku": "QA-QUE-002",
    "name": "Queijo Canastra Artesanal QA 500g",
    "price": 38.5
  },
  {
    "id": "3cf7d8b6-0787-4aec-8204-7e992d03c32e",
    "sku": "QA-VIN-003",
    "name": "Vinho Tinto Reserva QA Seleção 750ml",
    "price": 79.9
  },
  {
    "id": "0276b311-9ca4-4423-872c-3cbc62dd1c99",
    "sku": "QA-GEL-004",
    "name": "Geleia de Frutas Vermelhas QA 250g",
    "price": 19.5
  }
]
```

### TC-05 — Dar Entrada de Estoque Inicial com Lotes e Validades (100 un/item)
- **Status:** ✅ Sucesso
- **Categoria:** Estoque / Lotes
- **Tempo de Execução:** 5055 ms
- **Asserções Verificadas:**
  - [x] Total de saldo físico registrado é exatamente 400 unidades
- **Dados Produzidos / Verificados:**
```json
{
  "totalItemsWithStock": 4,
  "totalStockUnits": 400,
  "lotNumber": "LT-QA-202610",
  "expirationDate": "2026-10-31"
}
```

### TC-06 — Executar Venda no PDV e Validar Dedução Atômica de Estoque
- **Status:** ✅ Sucesso
- **Categoria:** PDV / Vendas
- **Tempo de Execução:** 2281 ms
- **Asserções Verificadas:**
  - [x] Pedido criado com ID e número gerado
  - [x] Produto A deduzido de 100 para 98 unidades
  - [x] Produto B deduzido de 100 para 97 unidades
  - [x] Valor total do pedido bate com subtotal menos desconto
- **Dados Produzidos / Verificados:**
```json
{
  "orderNumber": "VND-QA-228888",
  "total": 196.3,
  "itemsCount": 2,
  "remainingStockA": 98,
  "remainingStockB": 97
}
```

### TC-07 — Cancelar Pedido e Validar Estorno Automático de Estoque
- **Status:** ✅ Sucesso
- **Categoria:** Pedidos / Cancelamento
- **Tempo de Execução:** 1457 ms
- **Asserções Verificadas:**
  - [x] Pedido atualizado para o status CANCELLED
  - [x] Saldo do produto voltou ao valor original de 100 unidades
- **Dados Produzidos / Verificados:**
```json
{
  "cancelledOrder": "VND-CANC-231169",
  "restoredStock": 100
}
```

### TC-08 — Emitir Ordem de Compra e Confirmar Recebimento Físico
- **Status:** ✅ Sucesso
- **Categoria:** Compras / Reposição
- **Tempo de Execução:** 1068 ms
- **Asserções Verificadas:**
  - [x] Ordem de compra emitida e recebida com sucesso
  - [x] Estoque do produto D aumentado de 100 para 150
- **Dados Produzidos / Verificados:**
```json
{
  "poNumber": "PO-QA-232625",
  "supplierId": "2ac01f88-d1fd-4dae-8ce3-0dd1b779a676",
  "itemsReceived": 50,
  "updatedTotalStock": 150
}
```

### TC-09 — Acesso & Validação da Tela: Painel Geral & Métricas (Dashboard) (/dashboard)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 433 ms
- **Asserções Verificadas:**
  - [x] Tela Painel Geral & Métricas (Dashboard) acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/dashboard",
  "totalOrders": 8,
  "totalRevenue": 1424.3999999999999
}
```

### TC-10 — Acesso & Validação da Tela: Catálogo de Produtos Mestre (/products)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 196 ms
- **Asserções Verificadas:**
  - [x] Tela Catálogo de Produtos Mestre acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/products",
  "totalProducts": 4
}
```

### TC-11 — Acesso & Validação da Tela: Categorias de Produtos (/categories)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 183 ms
- **Asserções Verificadas:**
  - [x] Tela Categorias de Produtos acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/categories",
  "totalCategories": 4
}
```

### TC-12 — Acesso & Validação da Tela: Estoque, Saldos & Movimentações (/inventory)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 351 ms
- **Asserções Verificadas:**
  - [x] Tela Estoque, Saldos & Movimentações acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/inventory",
  "totalBalances": 4,
  "totalMovements": 12
}
```

### TC-13 — Acesso & Validação da Tela: Frente de Caixa (PDV) (/sales)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 155 ms
- **Asserções Verificadas:**
  - [x] Tela Frente de Caixa (PDV) acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/sales",
  "availableForSale": 4
}
```

### TC-14 — Acesso & Validação da Tela: Histórico de Pedidos & Vendas (/orders)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 172 ms
- **Asserções Verificadas:**
  - [x] Tela Histórico de Pedidos & Vendas acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/orders",
  "totalOrdersCount": 8
}
```

### TC-15 — Acesso & Validação da Tela: Gestão de Compras & Fornecedores (/purchasing)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 206 ms
- **Asserções Verificadas:**
  - [x] Tela Gestão de Compras & Fornecedores acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/purchasing",
  "totalPurchaseOrders": 5
}
```

### TC-16 — Acesso & Validação da Tela: Gestão de Clientes (/customers)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 201 ms
- **Asserções Verificadas:**
  - [x] Tela Gestão de Clientes acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/customers",
  "totalCustomers": 0
}
```

### TC-17 — Acesso & Validação da Tela: Gestão de Fornecedores (/suppliers)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 168 ms
- **Asserções Verificadas:**
  - [x] Tela Gestão de Fornecedores acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/suppliers",
  "totalSuppliers": 1
}
```

### TC-18 — Acesso & Validação da Tela: Lotes, Validades & Justificativas (/expiration)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 166 ms
- **Asserções Verificadas:**
  - [x] Tela Lotes, Validades & Justificativas acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/expiration",
  "totalActiveBatches": 4
}
```

### TC-19 — Acesso & Validação da Tela: Relatório: Valorização & Rentabilidade do Estoque (/reports?tab=valuation)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 183 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Valorização & Rentabilidade do Estoque acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=valuation",
  "totalCostValue": 11061,
  "totalSellingValue": 18853.7,
  "potentialProfit": 7792.700000000001
}
```

### TC-20 — Acesso & Validação da Tela: Relatório: Curva ABC & Mix de Produtos (/reports?tab=abc)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 419 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Curva ABC & Mix de Produtos acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=abc",
  "itemsEvaluated": 4
}
```

### TC-21 — Acesso & Validação da Tela: Relatório: Compras por Fornecedor (/reports?tab=purchases)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 165 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Compras por Fornecedor acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=purchases",
  "totalPurchaseVolume": 2375
}
```

### TC-22 — Acesso & Validação da Tela: Relatório: Vendas por Canal (PDV, Whats, Catálogo) (/reports?tab=channels)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 164 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Vendas por Canal (PDV, Whats, Catálogo) acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=channels",
  "channelBreakdown": 8
}
```

### TC-23 — Acesso & Validação da Tela: Relatório: Demonstrativo Financeiro (DRE Varejo) (/reports?tab=financial)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 167 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Demonstrativo Financeiro (DRE Varejo) acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=financial",
  "grossSales": 1424.3999999999999
}
```

### TC-24 — Acesso & Validação da Tela: Relatório: Margens de Lucro & Markup (/reports?tab=margins)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 167 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Margens de Lucro & Markup acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=margins",
  "productsAnalyzed": 4
}
```

### TC-25 — Acesso & Validação da Tela: Relatório: Giro de Estoque & Demanda / Reposição (/reports?tab=demand)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 162 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Giro de Estoque & Demanda / Reposição acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=demand",
  "replenishmentItems": 4
}
```

### TC-26 — Acesso & Validação da Tela: Relatório: Ticket Médio & LTV de Clientes (/reports?tab=customers)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 163 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Ticket Médio & LTV de Clientes acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=customers",
  "ordersAnalyzed": 8
}
```

### TC-27 — Acesso & Validação da Tela: Relatório: Investimento de Capital de Giro & GMROI (/reports?tab=investment)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 169 ms
- **Asserções Verificadas:**
  - [x] Tela Relatório: Investimento de Capital de Giro & GMROI acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/reports?tab=investment",
  "categoriesEvaluated": 4
}
```

### TC-28 — Acesso & Validação da Tela: Equipe da Loja & Gestão de Acessos (/team)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 157 ms
- **Asserções Verificadas:**
  - [x] Tela Equipe da Loja & Gestão de Acessos acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/team",
  "teamMembers": 0
}
```

### TC-29 — Acesso & Validação da Tela: Configurações Comerciais & Dados da Loja (/settings)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 172 ms
- **Asserções Verificadas:**
  - [x] Tela Configurações Comerciais & Dados da Loja acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/settings",
  "storeName": "Loja QA Automação E2E",
  "slug": "loja-qa-automacao-e2e"
}
```

### TC-30 — Acesso & Validação da Tela: Central de Notificações & Alertas (/notifications)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 182 ms
- **Asserções Verificadas:**
  - [x] Tela Central de Notificações & Alertas acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/notifications",
  "notificationsCount": 0
}
```

### TC-31 — Acesso & Validação da Tela: Trilha de Auditoria (Logs) (/audit)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 169 ms
- **Asserções Verificadas:**
  - [x] Tela Trilha de Auditoria (Logs) acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/audit",
  "auditLogsCount": 0
}
```

### TC-32 — Acesso & Validação da Tela: Painel de Administração Global Multi-Lojas (/global-admin)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 169 ms
- **Asserções Verificadas:**
  - [x] Tela Painel de Administração Global Multi-Lojas acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/global-admin",
  "platformTotalStores": 3
}
```

### TC-33 — Acesso & Validação da Tela: Catálogo Público Web da Loja QA (/store/loja-qa-automacao-e2e)
- **Status:** ✅ Sucesso
- **Categoria:** Navegação / Telas
- **Tempo de Execução:** 155 ms
- **Asserções Verificadas:**
  - [x] Tela Catálogo Público Web da Loja QA acessada e dados validados com sucesso
- **Dados Produzidos / Verificados:**
```json
{
  "route": "/store/loja-qa-automacao-e2e",
  "publicItemsAvailable": 4
}
```

