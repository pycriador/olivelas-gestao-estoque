# Olivelas — Plataforma SaaS Multi-Loja de Gestão de Estoque, PDV, Filiais, BI & Vendas

> 📊 **Caderno Executivo de Testes & Evidências:**
> - 📄 **Relatório em Markdown com Prints:** [docs/pt-BR/test-evidence.md](docs/pt-BR/test-evidence.md) *(Todas as 50 capturas de tela Desktop & Mobile)*
> - 🌐 **Dashboard Interativo em HTML:** [docs/pt-BR/test-evidence.html](docs/pt-BR/test-evidence.html)
> - 🚀 **Página ao Vivo na Aplicação:** Acesse a rota `/evidence` diretamente no navegador.
>
> 📚 **Documentação Técnica Completa:** Índice de engenharia em **[docs/pt-BR/README.md](docs/pt-BR/README.md)**. Entrada para agentes: **[docs/pt-BR/ai-context.md](docs/pt-BR/ai-context.md)**. Guia de integração REST para IA: **[docs/pt-BR/api-ai-integration.md](docs/pt-BR/api-ai-integration.md)**.

> **Arquitetura Enterprise:** React 19 + TypeScript + Vite + Tailwind CSS + Supabase (PostgreSQL, Auth, Storage, Realtime, RPCs) + GitHub Pages CI/CD.

---

## 🧪 Caderno Executivo de Testes & Homologação

- **Taxa de Sucesso dos Testes:** 100% Homologado (25 módulos de UI testados, 53 cenários E2E de API REST/HBAC e 33 casos de teste automatizados E2E).
- **Ambiente de Teste:** Loja de referência **GNZ Hortifruti** (`f8fdfd0e-a13a-44a6-ba98-53e61be300db`) e tenant dedicado **Loja QA Automação E2E**.
- **Galeria Visual Completa:** 50 capturas em alta resolução (Desktop 1440×900 e Mobile 390×844) disponíveis no [Relatório Markdown com Prints](docs/pt-BR/test-evidence.md) e no [Relatório HTML Interativo](docs/pt-BR/test-evidence.html).
- **Painel Interativo na Landing Page:** O menu de navegação da página inicial conta com acesso direto à seção `/evidence`.

---

## 🚀 1. Visão Geral & Recursos da Plataforma

A plataforma **Olivelas** é uma solução SaaS multi-loja e multi-tenant concebida com isolamento estrito de dados através de **Row Level Security (RLS)** no PostgreSQL do Supabase. O frontend opera como uma SPA estática de alta performance hospedada no **GitHub Pages**, com suporte completo a:

- **Dashboard Executivo Multi-Loja & BI (`/dashboard`):**
  - 8 KPIs estratégicos em tempo real com comparativo percentual contra o período anterior (Receita Bruta, Lucro Bruto & Margem `%`, Pedidos Concluídos, Ticket Médio, Unidades Vendidas, Patrimônio em Estoque a custo e venda, Alertas de Ruptura e Lotes Críticos).
  - Gráficos interativos de **Vendas Mensais (12 Meses)** e **Evolução no Período**, comparativo **Matriz vs. Filiais** (clicável para filtrar toda a tela), **Ranking Top Produtos Mais Vendidos** (ordenável por faturamento `R$`, quantidade ou lucro), Donut SVG de **Vendas por Categoria**, canais de venda, meios de pagamento e ritmo semanal.
  - Filtros rápidos de período (`Hoje`, `7d`, `30d`, `90d`, `Este Mês`, `Mês Passado`, `Este Ano`, `Datas Personalizadas De/Até`) sincronizados na URL e exportação completa do período em **CSV (Excel)**, **JSON** e **Relatório Executivo PDF/Impressão**.
- **Gestão de Estoque Completa & Aprovação de Baixas (`/inventory`):**
  - Saldos físicos, reservas, origem e lotes, movimentações auditadas, baixas em lote, reimportação inteligente de planilhas exportadas e valorização a custo e venda.
  - Fluxo estrito de **Aprovador de Baixa de Estoque (`STOCK_APPROVER`)** validado no PostgreSQL (`can_user_approve_writeoff`): operadores sem alçada enviam solicitações para a fila pendente (`stock_writeoff_requests`), e somente aprovadores autorizados (respeitando seu limite financeiro `max_writeoff_value`) podem aprovar ou rejeitar a baixa (`review_stock_writeoff_request`).
- **Controle de Lotes, FEFO & Validades (`/batches`):**
  - Rastreamento por lote (`stock_batches`), alertas antecipados (30d/15d/7d/vencidos), tratativas operacionais (`set_batch_disposition`) e sugestão automática de venda priorizando o lote mais próximo do vencimento.
- **Hierarquia Matriz → Filiais & Remessa Sem Venda (`/stores`, `/inventory`, `/global-admin?tab=stores`):**
  - Exibição hierárquica onde as **Filiais (`└─ Filial`)** ficam agrupadas abaixo de sua respectiva **Matriz** (`parent_store_id`).
  - Transferência atômica de produtos da Matriz para a Filial **sem necessidade de registrar uma venda** (`execute_stock_transfer_to_branch`), sincronizando automaticamente categoria, produto mestre e lote com validade na filial destino para venda imediata no PDV da filial.
- **PDV Frente de Caixa com Pesagem Fracionada `KG`/`g` & Edição de Pedidos (`/sales`, `/orders`):**
  - Checkout rápido com atalhos de teclado, código de barras, modal interativo de pesagem para itens em `KG`/gramas (`WeightInputModal` por peso ou valor em `R$`), associação automática de `"Cliente Genérico"` quando nenhum cliente é informado, cadastro rápido de cliente (`CustomerQuickCreateModal`) e reabertura de pedidos existentes para edição no PDV (`/sales?editOrder=:id`) preservando o número do pedido original.
- **CRM de Clientes com Pedidos na URL, Multi-Status, Visões Salvas no Banco & Exportação Detalhada (`/customers`):**
  - Listagem de todos os pedidos realizados por cada cliente com data e hora exatas (`DD/MM/YYYY HH:mm`) e **link clicável direto para o pedido na URL (`/customers?customerId=...&orderId=...`)**, que filtra a tela e abre o detalhamento completo do pedido daquela pessoa.
  - **Seleção múltipla de status** (ex.: acompanhar pedidos `PENDING` + `PROCESSING`, ou `DELIVERED`, ou `CANCELLED`) combinada com filtro de datas.
  - **Visões Personalizadas Salvas no Banco por Loja ou Filial (`public.store_saved_views`):** criação e compartilhamento de visões de filtros individuais para cada unidade (`store_id`).
  - **Botão `Exportar Visíveis`:** exporta em CSV/Excel exclusivamente os registros filtrados e visíveis em tela no momento do clique, com discriminação completa dos pedidos e itens comprados.
- **Central de 9 Relatórios Analíticos de Varejo com Filtros de Período e Data/Hora (`/reports`):**
  - 9 relatórios especializados: **Valorização & Lucratividade**, **Curva ABC & Pareto (80/15/5)**, **Giro & Compra por Consumo (Runout em dias)**, **Ticket Médio & Clientes (LTV)** (com todos os pedidos do cliente, data/hora e deep-link para `/customers`), **Capital de Giro & GMROI por Categoria**, **Ruptura & Reposição**, **Compras & Fornecedores** (com registro de data e hora exatas e resumo de itens), **Perdas & Baixas Operacionais** e **Vendas & Desempenho** (com data e hora exatas e itens detalhados).
  - Filtros de período (`Hoje`, `Esta Semana`, `Este Mês`, `Mês Passado`, `Últimos 90 Dias`, `Este Ano` e `Data Personalizada De/Até`), seletor de loja ou visão consolidada (`storeId === 'all'`) e exportação `Exportar Visíveis`.
- **Gestão de Funcionários, 47 Permissões Granulares & Franquia de 10 Funcionários Grátis (`/team`, `/global-admin`):**
  - Cadastro de funcionários e papéis customizados por loja (`store_custom_roles`) com matriz de **47 permissões granulares** em 12 módulos e telas dedicadas de edição (`/team/stores/:storeId/employees/:employeeId`, `/global-admin/stores/:storeId/employees/:employeeId`).
  - **Regra de Licenciamento (`global_billing_rules`):** funcionários operacionais não pagam plano individual e não poluem a aba de usuários titulares; cada loja possui **10 funcionários ativos grátis** e licenças adicionais são cobradas automaticamente na fatura do `STORE_ADMIN`.
- **Planos Comerciais SaaS, Grafo de Dependências de Telas & Hub Financeiro (`/global-admin?tab=finance`):**
  - Criação de grupos de permissão em tela com precificação comercial (`saas_permission_groups`), **motor de grafo de dependências (`featureDependencies.ts`)** que alerta o administrador sobre impactos cruzados ao desmarcar telas (mesmo para `STORE_ADMIN`), e rotas dedicadas para Regras (`/global-admin/finance/rules`), Planos (`/global-admin/finance/plans`) e Pagamentos (`/global-admin/finance/payments`).
- **Integrador de APIs Estilo Postman (`/integrations`) & Tokens HBAC (`/global-admin?tab=apikeys`):**
  - Request Builder completo com vinculação visual de dados (*Service Binding*) para sincronizar Clientes, Categorias, Produtos, Fornecedores e Estoque.
  - Tokens HBAC (`olv_live_...`) com 23 escopos granulares e RPC `get_ai_report` para agentes de IA externos.
- **Catálogo Digital Público com WhatsApp (`/store/:slug`):**
  - Vitrine responsiva por loja com suporte a produtos unitários e pesáveis (`KG`/gramas), carrinho interativo e envio formatado do pedido para o WhatsApp oficial da loja.
- **Central de Backups Multi-Loja & DB Explorer (`/global-admin`):**
  - Dumps SQL relacionais com `INSERT INTO`, pacotes `.ZIP` de imagens com `manifest.json`, datasets `.JSON` e explorador CRUD dinâmico de banco de dados.

---

## 🛠️ 2. Stack Tecnológica

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, class-variance-authority, clsx, tailwind-merge.
- **Gerenciamento de Estado & Dados:** TanStack Query v5, Zustand.
- **Roteamento & SPA Fallback:** React Router v7 com script `404.html` de redirecionamento dinâmico e sincronização de filtros na URL (`useTablePagination`).
- **Internacionalização:** Sistema tipado com suporte a **PT-BR** (padrão), **EN-US** e **ES-ES** com persistência.
- **Temas:** Light, Dark e System com tokens de superfície, glassmorphism e temas dinâmicos por loja (`storeThemes.ts`).
- **Backend Gerenciado (Supabase):**
  - **PostgreSQL Multi-Tenant:** RLS ativado em todas as tabelas via relacionamento `store_users` e escopos HBAC (`has_hbac_scope`).
  - **Supabase Auth:** Email/senha e Google OAuth, controle de sessão resiliente (`credentials: 'omit'` no fetch para evitar rejeição de cookies Cloudflare `__cf_bm` em domínios cruzados).
  - **Supabase Storage:** Buckets organizados e protegidos por loja (`products/{store_id}/...`, `stores`, `avatars`).
  - **Supabase Realtime:** Atualização automática de saldos de estoque, pedidos e alertas.
  - **Stored Procedures (RPC):** Operações atômicas protegidas contra condições de corrida (`create_order_with_stock`, `restore_sale_stock`, `receive_purchase_order_stock`, `apply_stock_movement`, `can_user_approve_writeoff`, `review_stock_writeoff_request`, `execute_stock_transfer_to_branch`, `upsert_store_employee`, `assign_user_permission_group`, `record_subscription_payment`, `get_ai_report`).
- **CI/CD:** GitHub Actions com lint, typecheck e deploy automatizado para o GitHub Pages.

---

## 🏢 3. Estrutura do Projeto

```text
olivelas-gestao-estoque/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Pipeline CI/CD GitHub Actions -> GitHub Pages
├── docs/
│   └── pt-BR/                      # Documentação viva de engenharia, arquitetura, contratos, segurança e QA
├── public/
│   └── 404.html                    # Script de resolução de subpaths SPA para GitHub Pages
├── src/
│   ├── components/
│   │   ├── admin/                  # GlobalBackupPanel, GlobalDbExplorerPanel, GlobalApiKeyHbacPanel, GlobalSaasBillingPanel, SubscriptionGuardModal
│   │   ├── common/                 # ThemeToggle, LanguageSelector, CommandK, EmptyState, ResponsiveTable, PageHeader
│   │   ├── inventory/              # StockWriteoffModal, BulkStockWriteoffModal, StockBranchTransferModal, StockImportModal, ProductStockDetailsModal
│   │   ├── products/               # ProductGalleryModal, BulkStockEntryModal
│   │   ├── sales/                  # WeightInputModal, CustomerCombobox, CustomerQuickCreateModal
│   │   ├── team/                   # EmployeeRolePermissionsModal, StoreCustomRolesModal
│   │   └── ui/                     # Button, Input, Card, Badge, Modal, DropdownMenu (Portal), Pagination
│   ├── constants/                  # featureDependencies, granularPermissions (47 permissões em 12 módulos)
│   ├── hooks/                      # useAuth, useTenant, usePermissions, useRealtime, useTablePagination
│   ├── i18n/                       # pt-BR, en-US, es-ES
│   ├── layouts/                    # AppLayout, AuthLayout, PublicLayout
│   ├── lib/supabase/               # Client singleton com tipagem do banco
│   ├── pages/                      # Dashboard, Lojas, Produtos, Estoque, Validades, PDV, Pedidos, Clientes, Compras, Relatórios, Global Admin e Páginas Dedicadas de Edição
│   ├── routes/                     # AppRoutes, ProtectedRoute, PermissionGate
│   ├── services/                   # Camada de serviços (auth, store, product, inventory, order, customer, savedView, report, saasBilling, apiKey, apiIntegrator, backup, etc.)
│   ├── stores/                     # authStore, cartStore, themeStore
│   ├── types/                      # database.types.ts, auth, store, product, inventory, customer, report, saasBilling, apiKey, backup
│   └── utils/                      # formatters, currency, barcode, dates, export, importParser, productUtils, errorHandler
├── supabase/
│   ├── migrations/                 # 25 migrations versionadas e incrementais SQL (20260925..01 a 20261030..25)
│   └── seed/                       # Roles & Permissões iniciais
├── test-automation/                # Roteiro E2E, casos de teste JSON e runner automatizado
├── .env.example
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 🔒 4. Segurança, Permissões & Isolamento Multi-Tenant (RLS)

1. **Nunca confiar no frontend:** O `store_id` não pode ser forjado pelo cliente para acessar dados alheios.
2. **Políticas PostgreSQL RLS:** Cada tabela verifica se o `auth.uid()` pertence à loja através da tabela `store_users` (`has_store_access`, `has_store_role`) ou se o token HBAC possui o escopo autorizado (`has_hbac_scope`).
3. **Permissões em Dupla Camada (Tela + Banco):** `PermissionGate` e `usePermissions` controlam o acesso às rotas e botões combinando os módulos do plano SaaS (`user_subscriptions` / `saas_permission_groups`) com as 47 permissões granulares do funcionário (`store_users` + `store_custom_roles`), enquanto as RPCs e políticas RLS impõem a segurança no PostgreSQL.
4. **Alçada Estrita de Baixa de Estoque:** Nenhuma baixa manual (`LOSS` ou `ADJUSTMENT` negativo) é efetivada sem validação de `can_user_approve_writeoff` no banco de dados.
5. **Soft Delete & Trilha de Auditoria:** Produtos, clientes, fornecedores e lojas possuem colunas `deleted_at` e `deleted_by`, preservando o histórico contábil e fiscal em `audit_logs`.
6. **Transações Atômicas:** As vendas no PDV e remessas entre filiais realizam bloqueio de linha (`FOR UPDATE`) no PostgreSQL, impedindo condições de corrida (*race conditions*).

---

## 📱 5. Catálogo Digital Público com WhatsApp

Cada loja ou filial cadastrada possui uma URL exclusiva (`/store/{slug}`) acessível publicamente:
- Vitrine de produtos publicados com fotos, preços e categorias.
- Suporte completo a produtos vendidos por unidade (`UN`) ou pesáveis/fracionados (`KG` / gramas) com calculadora interativa de peso e valor.
- Carrinho de compras interativo e envio formatado do pedido para o WhatsApp oficial da loja com resumo de itens, pesos, total e dados de entrega.

---

## 📦 6. Como Executar Localmente

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/pycriador/olivelas-gestao-estoque.git
   cd olivelas-gestao-estoque
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente:**
   Copie `.env.example` para `.env.local` e preencha suas credenciais públicas do Supabase:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_anon
   ```

4. **Executar em modo desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Verificação de TypeScript e Build:**
   ```bash
   npm run build
   ```

---

## 📄 7. Licença

Desenvolvido para uso comercial enterprise. Todos os direitos reservados.
