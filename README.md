# Olivelas — Plataforma SaaS Multi-Loja de Gestão de Estoque, PDV, Filiais, BI, Contratos & Inteligência Artificial

> 📊 **Caderno Executivo de Testes & Evidências:**
> - 📄 **Relatório em Markdown com Prints:** [docs/pt-BR/test-evidence.md](docs/pt-BR/test-evidence.md) *(Todas as 50 capturas de tela Desktop & Mobile)*
> - 🌐 **Dashboard Interativo em HTML:** [docs/pt-BR/test-evidence.html](docs/pt-BR/test-evidence.html)
> - 🚀 **Página ao Vivo na Aplicação:** Acesse a rota `/evidence` diretamente no navegador.
>
> 📚 **Documentação Técnica Completa:** Índice de engenharia em **[docs/pt-BR/README.md](docs/pt-BR/README.md)**. Entrada para agentes: **[docs/pt-BR/ai-context.md](docs/pt-BR/ai-context.md)**. Guia de integração REST para IA: **[docs/pt-BR/api-ai-integration.md](docs/pt-BR/api-ai-integration.md)**.

> **Arquitetura Enterprise:** React 19 + TypeScript + Vite + Tailwind CSS + Supabase (PostgreSQL, Auth, Storage, Realtime, RPCs, `pgcrypto` AI Vault) + Multi-Provider AI Orchestrator (Google Gemini Principal, OpenAI, Anthropic Claude, Custom OpenAI-Compatible) + GitHub Pages CI/CD.

---

## 🧪 Caderno Executivo de Testes & Homologação

- **Taxa de Sucesso dos Testes:** 100% Homologado (25 módulos de UI testados, 53 cenários E2E de API REST/HBAC e 33 casos de teste automatizados E2E).
- **Ambiente de Teste:** Loja de referência **GNZ Hortifruti** (`f8fdfd0e-a13a-44a6-ba98-53e61be300db`) e tenant dedicado **Loja QA Automação E2E**.
- **Galeria Visual Completa:** 50 capturas em alta resolução (Desktop 1440×900 e Mobile 390×844) disponíveis no [Relatório Markdown com Prints](docs/pt-BR/test-evidence.md) e no [Relatório HTML Interativo](docs/pt-BR/test-evidence.html).
- **Painel Interativo na Landing Page:** O menu de navegação da página inicial conta com acesso direto à seção `/evidence`.

---

## 🚀 1. Visão Geral & Recursos da Plataforma

A plataforma **Olivelas** é uma solução SaaS multi-loja e multi-tenant concebida com isolamento estrito de dados através de **Row Level Security (RLS)** no PostgreSQL do Supabase. O frontend opera como uma SPA estática de alta performance hospedada no **GitHub Pages**, com suporte completo a:

- **Suíte de Inteligência Artificial Multi-Provedor, Módulos Comerciais de IA (Add-ons) & Copiloto da Loja (`/global-admin/ai`, `/ai-copilot`):**
  - **Cofre de Chaves API Criptografado (`pgcrypto` no Supabase):** o Super Admin gerencia chaves de API e modelos para **Google Gemini (IA Principal padrão: `gemini-2.5-flash` / `gemini-2.5-pro`)**, **OpenAI (`gpt-4o-mini` / `gpt-4o`)**, **Anthropic Claude (`claude-3-7-sonnet` / `haiku`)** e **IA Personalizada (OpenAI-Compatible: Grok, DeepSeek, Ollama, OpenRouter)** via RPC `upsert_ai_provider_config`, sem nunca expor chaves em texto aberto nas listagens (`list_ai_provider_configs_safe`).
  - **5 Módulos Comerciais de IA (Acréscimo nos Planos das Lojas — Categoria `INTELIGENCIA_ARTIFICIAL`):**
    1. `MOD_AI_COPILOT_CHAT` (**IA Copiloto & Chatbot Executivo da Loja** — `+ R$ 49,90/mês`): Chatbot conversacional em `/ai-copilot` e gaveta flutuante global (`AiStoreCopilotDrawer`) conectado aos indicadores reais da loja, com simulador *"E Se?"* e perguntas rápidas.
    2. `MOD_AI_SALES_CRM` (**IA Comercial: Sugestão de Produtos p/ Clientes & Cross-Sell PDV** — `+ R$ 39,90/mês`): Avalia o perfil de compra dos clientes em `/customers` e `/sales` para recomendar produtos ideais, combos e scripts prontos de WhatsApp.
    3. `MOD_AI_INVENTORY_EXPIRATION` (**IA de Estoque, Alertas de Validade FEFO & Anti-Perdas** — `+ R$ 39,90/mês`): Avisa proativamente o Administrador da loja em `/expiration` e `/inventory` quando produtos estão vencendo e sugere ações promocionais ou remessa entre filiais.
    4. `MOD_AI_PURCHASING_TRENDS` (**IA de Tendências de Compras, Giro & Reposição** — `+ R$ 39,90/mês`): Analisa tendências de consumo, velocidade de giro (runout em dias) e sugere ordens de compra em `/purchases`.
    5. `MOD_AI_BI_INSIGHTS` (**IA Executiva: Resumos Mensais de Vendas & Oportunidades BI** — `+ R$ 44,90/mês`): Resume mensalmente as vendas, avalia os produtos mais vendidos e destaca oportunidades de negócio em `/dashboard` e nas 9 abas de `/reports`.
  - **Context Prompt Injection, Escudo Anti-Injection, Fallback em Cascata & Personas Configuráveis (`aiOrchestratorService.ts`):**
    - Injeção dinâmica de contexto verificado da loja (`StoreAiContextSnapshot`) no System Prompt.
    - Guardrails Anti-Prompt Injection (`STRICT` / `MODERATE` / `AUDIT_ONLY`) que bloqueiam tentativas de *jailbreak* ou extração de credenciais.
    - Cadeia de Fallback automática: `Modelo Principal (Gemini) -> Modelo Fast -> Provedor Secundário -> Motor Analítico Determinístico Local`.
    - 4 Personas globais pré-configuradas (`Diretor Financeiro CFO`, `Gerente Comercial & Vendas`, `Auditor de Estoque & FEFO`, `Copiloto Prático`) + criação de personas customizadas.
- **Dashboard Executivo Multi-Loja & BI (`/dashboard`):**
  - 8 KPIs estratégicos em tempo real com comparativo percentual contra o período anterior (Receita Bruta, Lucro Bruto & Margem `%`, Pedidos Concluídos, Ticket Médio, Unidades Vendidas, Patrimônio em Estoque a custo e venda, Alertas de Ruptura e Lotes Críticos).
  - Gráficos interativos de **Vendas Mensais (12 Meses)** e **Evolução no Período**, comparativo **Matriz vs. Filiais** (clicável para filtrar toda a tela), **Ranking Top Produtos Mais Vendidos** (ordenável por faturamento `R$`, quantidade ou lucro), Donut SVG de **Vendas por Categoria**, canais de venda, meios de pagamento e ritmo semanal.
  - Filtros rápidos de período (`Hoje`, `7d`, `30d`, `90d`, `Este Mês`, `Mês Passado`, `Este Ano`, `Datas Personalizadas De/Até`) sincronizados na URL e exportação completa do período em **CSV (Excel)**, **JSON** e **Relatório Executivo PDF/Impressão**.
- **Gestão de Estoque Completa & Aprovação de Baixas (`/inventory`):**
  - Saldos físicos, reservas, origem e lotes, movimentações auditadas, baixas em lote, reimportação inteligente de planilhas exportadas e valorização a custo e venda.
  - Fluxo estrito de **Aprovador de Baixa de Estoque (`STOCK_APPROVER`)** validado no PostgreSQL (`can_user_approve_writeoff`): operadores sem alçada enviam solicitações para a fila pendente (`stock_writeoff_requests`), e somente aprovadores autorizados (respeitando seu limite financeiro `max_writeoff_value`) podem aprovar ou rejeitar a baixa (`review_stock_writeoff_request`).
- **Controle de Lotes, FEFO & Validades (`/expiration`, `/batches`):**
  - Rastreamento por lote (`stock_batches`), alertas antecipados (30d/15d/7d/vencidos), avisos inteligentes da IA ao Administrador da loja, tratativas operacionais (`set_batch_disposition`) e sugestão automática de venda priorizando o lote mais próximo do vencimento.
- **Hierarquia Matriz → Filiais, Seletor em Árvore & Criação de Lojas em Lote com IA (`/stores`, `/inventory`, `/global-admin?tab=stores`, `/ai-copilot`):**
  - Exibição hierárquica em árvore onde as **Filiais (`└─ Filial`)** ficam agrupadas abaixo de sua respectiva **Matriz** (`parent_store_id`), tanto nas tabelas de gestão quanto no seletor de unidade no topo da barra lateral (`AppLayout`), com busca instantânea e nomenclatura composta padronizada (`{Matriz} - Filial {Código}`, ex.: `Primor - Filial P1`).
  - **Criação de Rede de Lojas em Lote (CLI + Skill do Agente + Modal Web com IA da Loja):** provisionamento automatizado e idempotente de Loja Matriz, Filiais subordinadas, Administradores (`STORE_ADMIN`), Fornecedores, Categorias, Produtos, Fotos sem direitos autorais (Unsplash CC0 salvas no Supabase Storage) e Saldos/Lotes com validade FEFO via script CLI (`npm run store:bulk` / `npm run store:primor`), Skill `.agents/skills/bulk-store-creator/SKILL.md` ou botão **"Criação em Lote (IA)"** na interface web (`BulkStoreAiBuilderModal`).
  - Transferência atômica de produtos da Matriz para a Filial **sem necessidade de registrar uma venda** (`execute_stock_transfer_to_branch`), sincronizando automaticamente categoria, produto mestre e lote com validade na filial destino para venda imediata no PDV da filial.
- **PDV Frente de Caixa com Pesagem Fracionada `KG`/`g` & Edição de Pedidos (`/sales`, `/orders`):**
  - Checkout rápido com atalhos de teclado, código de barras, modal interativo de pesagem para itens em `KG`/gramas (`WeightInputModal` por peso ou valor em `R$`), associação automática de `"Cliente Genérico"` quando nenhum cliente é informado, cadastro rápido de cliente (`CustomerQuickCreateModal`), sugestões de cross-sell por IA e reabertura de pedidos existentes para edição no PDV (`/sales?editOrder=:id`) preservando o número do pedido original.
- **CRM de Clientes com Pedidos na URL, Multi-Status, Recomendações IA, Visões Salvas no Banco & Exportação Detalhada (`/customers`):**
  - Listagem de todos os pedidos realizados por cada cliente com data e hora exatas (`DD/MM/YYYY HH:mm`) e **link clicável direto para o pedido na URL (`/customers?customerId=...&orderId=...`)**, que filtra a tela e abre o detalhamento completo do pedido daquela pessoa.
  - **Seleção múltipla de status** (ex.: acompanhar pedidos `PENDING` + `PROCESSING`, ou `DELIVERED`, ou `CANCELLED`) combinada com filtro de datas.
  - **Visões Personalizadas Salvas no Banco por Loja ou Filial (`public.store_saved_views`):** criação e compartilhamento de visões de filtros individuais para cada unidade (`store_id`).
  - **Botão `Exportar Visíveis`:** exporta em CSV/Excel exclusivamente os registros filtrados e visíveis em tela no momento do clique, com discriminação completa dos pedidos e itens comprados.
- **Central de 9 Relatórios Analíticos de Varejo com Filtros de Período, Data/Hora & Diagnóstico IA (`/reports`):**
  - 9 relatórios especializados: **Valorização & Lucratividade**, **Curva ABC & Pareto (80/15/5)**, **Giro & Compra por Consumo (Runout em dias)**, **Ticket Médio & Clientes (LTV)** (com todos os pedidos do cliente, data/hora e deep-link para `/customers`), **Capital de Giro & GMROI por Categoria**, **Ruptura & Reposição**, **Compras & Fornecedores** (com registro de data e hora exatas e resumo de itens), **Perdas & Baixas Operacionais** e **Vendas & Desempenho** (com data e hora exatas e itens detalhados).
  - Filtros de período (`Hoje`, `Esta Semana`, `Este Mês`, `Mês Passado`, `Últimos 90 Dias`, `Este Ano` e `Data Personalizada De/Até`), seletor de loja ou visão consolidada (`storeId === 'all'`) e exportação `Exportar Visíveis`.
- **Gestão de Funcionários, 47 Permissões Granulares, Política de PIN & Franquia de 10 Funcionários Grátis (`/team`, `/global-admin`):**
  - Cadastro de funcionários e papéis customizados por loja (`store_custom_roles`) com matriz de **47 permissões granulares** em 12 módulos e telas dedicadas de edição (`/team/:employeeId`, `/team/stores/:storeId/employees/:employeeId`, `/global-admin/stores/:storeId/employees/:employeeId`).
  - **Reset Obrigatório de PIN no Próximo Login & Pré-requisitos de Complexidade (`require_pin_reset`, `pin_requirements`, `complete_employee_pin_reset`):** configuração individual para forçar troca de PIN no próximo login e definição de regras de complexidade (mínimo de caracteres, números, letras maiúsculas, letras minúsculas, símbolos especiais e bloqueio de sequências repetidas como `1111` ou `1234`) com checklist visual em tempo real.
  - **Regra de Licenciamento (`global_billing_rules`):** funcionários operacionais não pagam plano individual e não poluem a aba de usuários titulares; cada loja possui **10 funcionários ativos grátis** e licenças adicionais são cobradas automaticamente na fatura do `STORE_ADMIN`.
- **Planos Comerciais SaaS, Módulos de IA Add-on, Vinculação na Landing Page, Grafo de Dependências & Hub Financeiro (`/global-admin?tab=finance`, `/global-admin/finance/plans`):**
  - Criação de grupos de permissão em tela com precificação comercial (`permission_groups`), flags de **Vinculação na Landing Page (`show_on_landing_page`)** e **Destaque "Mais Popular" (`is_highlighted_on_landing`)**, **motor de grafo de dependências (`screenDependencies.ts`)** que alerta o administrador sobre impactos cruzados ao desmarcar telas (mesmo para `STORE_ADMIN`), acréscimo automático de módulos de IA nas lojas e rotas dedicadas para Regras (`/global-admin/finance/rules`), Planos (`/global-admin/finance/plans`) e Pagamentos (`/global-admin/finance/payments`).
- **Configurador Interativo de Planos + Adicionais Avulsos na Landing Page & Seção "Novos Contratos" (`/`, `/pricing`, `/global-admin/contracts`):**
  - **Monte seu Plano Personalizado (`InteractivePlanBuilderSection`):** sessão interativa na Landing Page e na página de Preços onde o visitante escolhe o ciclo (`Mensal`/`Anual`), seleciona um plano base vinculado pelo Global Admin, marca **módulos adicionais avulsos (incluindo os 5 módulos de IA)** e ajusta estimativas de lojas e funcionários com cálculo em tempo real.
  - **Pré-Cadastro Comercial (`submit_commercial_proposal`):** preenchimento de Nome, E-mail, Celular/WhatsApp, Empresa e observações para registrar a proposta em `public.commercial_plan_proposals`, ficando imediatamente visível para o Global Admin entrar em contato na seção **"Novos Contratos" (`/global-admin/contracts`)**.
  - **Gerenciador de Contratos Completo (`GlobalAdminContractsPage`, `contractService`):** editor de minutas contratuais com interpolação dinâmica de variáveis, conversão direta de propostas em contrato, exportação pronta para assinatura em **HTML**, **DOCX (Microsoft Word OpenXML)** e **PDF**, armazenamento em nuvem no **Supabase (`platform_contracts` + Storage)** e opção de **vincular e enviar diretamente para o Google Drive do Global Admin**.
- **Integrador de APIs Estilo Postman (`/integrations`) & Tokens HBAC (`/global-admin?tab=api-hbac`):**
  - Request Builder completo com vinculação visual de dados (*Service Binding*) para sincronizar Clientes, Categorias, Produtos, Fornecedores e Estoque.
  - Tokens HBAC (`olv_live_...`) com 23 escopos granulares e RPC `get_ai_report` para agentes de IA externos.
- **Catálogo Digital Público com WhatsApp (`/store/:slug`):**
  - Vitrine responsiva por loja com suporte a produtos unitários e pesáveis (`KG`/gramas), carrinho interativo e envio formatado do pedido para o WhatsApp oficial da loja.
- **Central de Backups Multi-Loja & DB Explorer (`/global-admin`):**
  - Dumps SQL relacionais com `INSERT INTO`, pacotes `.ZIP` de imagens com `manifest.json`, datasets `.JSON` e explorador CRUD dinâmico de banco de dados.

---

## 🛠️ 2. Stack Tecnológica

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, class-variance-authority, clsx, tailwind-merge.
- **Inteligência Artificial & Orquestração:** `aiOrchestratorService.ts` com suporte nativo a **Google Gemini (`v1beta/models/*:generateContent`)**, **OpenAI (`v1/chat/completions`)**, **Anthropic Claude (`v1/messages`)** e **Provedores Personalizados OpenAI-Compatible** + Motor Analítico Determinístico Local para fallback offline/zero-downtime.
- **Gerenciamento de Estado & Dados:** TanStack Query v5, Zustand.
- **Roteamento & SPA Fallback:** React Router v7 com script `404.html` de redirecionamento dinâmico e sincronização de filtros na URL (`useTablePagination`).
- **Internacionalização:** Sistema tipado com suporte a **PT-BR** (padrão), **EN-US** e **ES-ES** com persistência.
- **Temas:** Light, Dark e System com tokens de superfície, glassmorphism e temas dinâmicos por loja (`storeThemes.ts`).
- **Backend Gerenciado (Supabase):**
  - **PostgreSQL Multi-Tenant:** RLS ativado em todas as tabelas via relacionamento `store_users` e escopos HBAC (`has_hbac_scope`).
  - **Cofre Criptografado de Chaves de IA (`pgcrypto`):** Criptografia simétrica `pgp_sym_encrypt` / `pgp_sym_decrypt` em `public.ai_provider_configs` via RPCs `SECURITY DEFINER`.
  - **Supabase Auth:** Email/senha e Google OAuth, controle de sessão resiliente (`credentials: 'omit'` no fetch para evitar rejeição de cookies Cloudflare `__cf_bm` em domínios cruzados).
  - **Supabase Storage:** Buckets organizados e protegidos por loja (`products/{store_id}/...`, `stores`, `avatars`).
  - **Supabase Realtime:** Atualização automática de saldos de estoque, pedidos e alertas.
  - **Stored Procedures (RPC):** Operações atômicas protegidas contra condições de corrida (`create_order_with_stock`, `restore_sale_stock`, `receive_purchase_order_stock`, `apply_stock_movement`, `can_user_approve_writeoff`, `review_stock_writeoff_request`, `execute_stock_transfer_to_branch`, `upsert_store_employee`, `complete_employee_pin_reset`, `assign_user_permission_group`, `record_subscription_payment`, `submit_commercial_proposal`, `upsert_ai_provider_config`, `list_ai_provider_configs_safe`, `resolve_ai_execution_runtime`, `get_ai_report`).
- **CI/CD:** GitHub Actions com lint, typecheck e deploy automatizado para o GitHub Pages.

---

## 🏢 3. Estrutura do Projeto

```text
olivelas-gestao-estoque/
├── .agents/
│   └── skills/
│       └── bulk-store-creator/     # Skill de Criação de Rede de Lojas em Lote (Matriz, Filiais, Produtos, Fotos e Estoque)
├── .github/
│   └── workflows/
│       └── deploy.yml              # Pipeline CI/CD GitHub Actions -> GitHub Pages
├── docs/
│   └── pt-BR/                      # Documentação viva de engenharia, arquitetura, contratos, segurança e QA
├── public/
│   └── 404.html                    # Script de resolução de subpaths SPA para GitHub Pages
├── scripts/
│   ├── bulk-store-builder.mjs      # CLI & Orquestrador IA para criação em massa de Matriz, Filiais, Produtos e Estoque
│   └── specs/
│       └── primor.json             # Especificação completa da rede Matriz Primor + Filiais P1 a P5
├── src/
│   ├── components/
│   │   ├── admin/                  # GlobalBackupPanel, GlobalDbExplorerPanel, GlobalApiKeyHbacPanel, GlobalSaasBillingPanel, BulkStoreAiBuilderModal, UserPermissionsAndPricingModal
│   │   ├── ai/                     # AiModuleInsightCard (IA embarcada nas telas), AiStoreCopilotDrawer (Chatbot no header), AiMarkdownContent
│   │   ├── commercial/             # InteractivePlanBuilderSection (Configurador Interativo de Planos + Adicionais Avulsos + Módulos de IA + Pré-Cadastro)
│   │   ├── common/                 # ThemeToggle, LanguageSelector, CommandK, EmptyState, ResponsiveTable, PageHeader
│   │   ├── inventory/              # StockWriteoffModal, BulkStockWriteoffModal, StockBranchTransferModal, StockImportModal, ProductStockDetailsModal
│   │   ├── products/               # ProductGalleryModal, BulkStockEntryModal
│   │   ├── sales/                  # WeightInputModal, CustomerCombobox, CustomerQuickCreateModal
│   │   ├── team/                   # EmployeeRolePermissionsModal, StoreCustomRolesModal, EmployeePinResetModal
│   │   └── ui/                     # Button, Input, Card, Badge, Modal, DropdownMenu (Portal), Pagination
│   ├── constants/                  # screenDependencies (Grafo de Dependências + Módulos de IA), granularPermissions (47 permissões)
│   ├── hooks/                      # useAuth, useTenant, usePermissions, useRealtime, useTablePagination
│   ├── i18n/                       # pt-BR, en-US, es-ES
│   ├── layouts/                    # AppLayout, AuthLayout, PublicLayout
│   ├── lib/supabase/               # Client singleton com tipagem do banco
│   ├── pages/                      # Dashboard, Copiloto IA (/ai-copilot), Lojas, Produtos, Estoque, Validades, PDV, Pedidos, Clientes, Compras, Relatórios, Global Admin, Central de IA (/global-admin/ai), Novos Contratos e Páginas Dedicadas
│   ├── routes/                     # AppRoutes, ProtectedRoute, PermissionGate
│   ├── services/                   # Camada de serviços (aiOrchestrator, bulkStoreBuilder, auth, store, product, inventory, order, customer, savedView, report, permissionGroup, contract, apiKey, apiIntegrator, backup, etc.)
│   ├── stores/                     # authStore, cartStore, themeStore
│   ├── types/                      # database.types.ts, ai.types.ts, permissionGroup.types.ts, auth, store, product, inventory, customer, report, contract, apiKey, backup
│   └── utils/                      # formatters, currency, barcode, dates, export, importParser, productUtils, errorHandler
├── supabase/
│   ├── migrations/                 # 29 migrations versionadas e incrementais SQL (20260925..01 a 20261103..29)
│   └── seed/                       # Roles & Permissões iniciais
├── test-automation/                # Roteiro E2E, casos de teste JSON e runner automatizado
├── .env.example
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 🔒 4. Segurança, Cofre de IA, Permissões & Isolamento Multi-Tenant (RLS)

1. **Nunca confiar no frontend:** O `store_id` não pode ser forjado pelo cliente para acessar dados alheios.
2. **Cofre de Chaves de IA Criptografado (`pgcrypto`):** As chaves de API (Gemini, OpenAI, Claude, Custom) são armazenadas criptografadas (`BYTEA`) em `public.ai_provider_configs`, protegidas por RLS exclusivo para `public.is_global_admin()`. A desencriptação ocorre apenas em tempo de execução via RPC `SECURITY DEFINER` (`resolve_ai_execution_runtime`) após validar o tenant e o módulo comercial ativo.
3. **Escudo Anti-Prompt Injection:** O orquestrador de IA inspeciona cada prompt contra tentativas de *jailbreak*, extração de segredos ou comandos destrutivos antes de invocar o LLM.
4. **Políticas PostgreSQL RLS:** Cada tabela verifica se o `auth.uid()` pertence à loja através da tabela `store_users` (`has_store_access`, `has_store_role`) ou se o token HBAC possui o escopo autorizado (`has_hbac_scope`).
5. **Permissões em Dupla Camada (Tela + Banco):** `PermissionGate` e `usePermissions` controlam o acesso às rotas e botões combinando os módulos do plano SaaS (`user_permission_profiles` / `permission_groups`, incluindo os 5 módulos de IA) com as 47 permissões granulares do funcionário (`store_users` + `store_custom_roles`).
6. **Alçada Estrita de Baixa de Estoque:** Nenhuma baixa manual (`LOSS` ou `ADJUSTMENT` negativo) é efetivada sem validação de `can_user_approve_writeoff` no banco de dados.
7. **Soft Delete & Trilha de Auditoria:** Produtos, clientes, fornecedores e lojas possuem colunas `deleted_at` e `deleted_by`, preservando o histórico contábil e fiscal em `audit_logs` e `ai_usage_logs`.
8. **Transações Atômicas:** As vendas no PDV e remessas entre filiais realizam bloqueio de linha (`FOR UPDATE`) no PostgreSQL, impedindo condições de corrida (*race conditions*).

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

6. **Criação de Rede de Lojas em Lote (Matriz + Filiais + Produtos + Estoque via CLI ou IA):**
   ```bash
   # Executar a partir de um arquivo de especificação JSON (ex.: Rede Primor + Filiais P1 a P5)
   npm run store:primor

   # Ou informar qualquer especificação JSON ou prompt em linguagem natural
   npm run store:bulk -- --spec scripts/specs/primor.json
   npm run store:bulk -- --prompt "Criar matriz Primor com filiais P1 a P5, fornecedores Cozinha A e Cozinha B..."
   ```

---

## 📄 7. Licença

Desenvolvido para uso comercial enterprise. Todos os direitos reservados.
