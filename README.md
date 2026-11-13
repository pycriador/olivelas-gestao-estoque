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
- **PDV Frente de Caixa com Pesagem Fracionada `KG`/`g`, Regra Configurável de Cliente & Gestão de Pedidos (`/sales`, `/orders`):**
  - Checkout rápido com atalhos de teclado, código de barras, modal interativo de pesagem para itens em `KG`/gramas (`WeightInputModal` por peso ou valor em `R$` posicionado no topo do `visualViewport` no mobile para nunca ficar coberto pelo teclado virtual), sugestões de cross-sell por IA e reabertura de pedidos existentes para edição no PDV (`/sales?editOrder=:id`) preservando o número do pedido original.
  - **Cadastro de Cliente Obrigatório vs. Cliente Genérico (`posCustomerConfig.ts`):** todas as lojas têm acesso a 1 único `"Cliente Genérico"`, liberado mediante configuração na área administrativa (`/global-admin/stores/:storeId/edit`, `/global-admin?tab=stores` e `/settings#pos-customer-rules`), permitindo que a loja escolha entre exigir cliente identificado ou permitir o Cliente Genérico no PDV.
  - **Gestão de Pedidos (`/orders`) com Apelidos de Status, Status `"Finalizado"` (`COMPLETED`), Histórico por Usuário & Atualização Forçada do Banco:** menu dropdown para mudança de status (incluindo `COMPLETED` / *"Finalizado"*, além dos status de entrega e `CANCELLED`), personalização de apelidos para os status do sistema por loja (`stores.theme_config.orderStatusAliases`), **Histórico de Atualizações de Status por Usuário** (`audit_logs` + linha do tempo com nome/e-mail do operador e data/hora), envio de status via WhatsApp ao cliente, recarregamento automático ao acessar `/orders` ou carregar pedido no PDV e botão **"Atualizar do Banco"** (Desktop e Mobile) para recarga imediata direto do banco de dados.
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
- **Catálogo Digital Público Personalizável Integrado com `/orders`, Observações no Carrinho, Mensagem WhatsApp com Tags & Acompanhamento em Tempo Real (`/store/:slug`, `/store/:slug/order/:orderId` e `/settings?tab=...`):**
  - Vitrine responsiva por loja com personalização completa organizada por abas na URL em `/settings` (`?tab=store`, `?tab=catalog`, `?tab=whatsapp`, `?tab=pos`, `?tab=theme`): upload/URL de logo e banner de capa, tema padrão da vitrine, cores da interface, botão Claro/Escuro para o visitante, quantidade padrão de itens por página (`6` a `96`) e 3/4 colunas.
  - **Observações no Carrinho & Mensagem WhatsApp 100% Personalizada com Tags (`/settings?tab=whatsapp`):** ao abrir o carrinho em `/store/:slug`, o cliente pode adicionar **Observações do Pedido** antes de enviar pelo WhatsApp, e a loja pode personalizar toda a mensagem enviada no WhatsApp usando tags dinâmicas do carrinho (`{{produtos}}`, `{{precos}}`, `{{produtos_simples}}`, `{{total}}`, `{{subtotal}}`, `{{quantidade_itens}}`, `{{observacoes}}`, `{{nome_cliente}}`, `{{telefone_cliente}}`, `{{endereco_cliente}}`, `{{forma_pagamento}}`, `{{numero_pedido}}`, `{{link_rastreio}}`, `{{nome_loja}}`, `{{data_hora}}`).
  - Suporte a produtos unitários e pesáveis (`KG`/gramas), checkout integrado diretamente com `/orders` (`create_public_catalog_order`) com baixa atômica de estoque e redirecionamento automático para a página exclusiva de acompanhamento em tempo real (`/store/:slug/order/:orderId`) até o pedido ficar como **Finalizado** (`COMPLETED`).
- **Portal Público Portátil (`spa_portal/` — White-Label & Domínio Próprio por Loja):**
  - SPA autônoma e independente do ERP administrativo (`spa_portal/`), projetada para criar versões ainda mais personalizadas de lojas públicas e hospedá-las em qualquer servidor estático ou domínio próprio do cliente.
  - Conectada **exclusivamente aos dados daquela loja (`VITE_PORTAL_STORE_ID`)** através de uma **credencial HBAC única e expirável (`VITE_PORTAL_HBAC_TOKEN` / `X-HBAC-Token`)**: em caso de vazamento de dados ou encerramento contratual, basta desativar ou expirar o token em `/global-admin?tab=api-hbac` para bloquear o acesso instantaneamente (`HTTP 401/403`) e exibir a tela de proteção `CredentialErrorScreen`.
  - Mantém 100% das funcionalidades do catálogo público (busca, categorias, faixa de preço, produtos pesáveis `KG`, carrinho, checkout atômico em `/orders`, mensagem WhatsApp com tags) e página de acompanhamento do pedido em tempo real (`#/order/:orderId` ou `?order=:orderId`) via Supabase Realtime.
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
  - **Stored Procedures (RPC):** Operações atômicas protegidas contra condições de corrida (`create_order_with_stock`, `create_public_catalog_order`, `get_public_order_tracking`, `restore_sale_stock`, `receive_purchase_order_stock`, `apply_stock_movement`, `can_user_approve_writeoff`, `review_stock_writeoff_request`, `execute_stock_transfer_to_branch`, `upsert_store_employee`, `complete_employee_pin_reset`, `assign_user_permission_group`, `record_subscription_payment`, `submit_commercial_proposal`, `upsert_ai_provider_config`, `list_ai_provider_configs_safe`, `resolve_ai_execution_runtime`, `get_ai_report`).
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
│   ├── migrations/                 # 30 migrations versionadas e incrementais SQL (20260925..01 a 20261111..30)
│   └── seed/                       # Roles & Permissões iniciais
├── spa_portal/                     # SPA Portal Público Portátil (Catálogo + Rastreamento em Tempo Real com credencial única HBAC expirável por loja)
│   ├── PLAN.md                     # Plano arquitetural, modelo de segurança HBAC e guia de customização White-Label
│   ├── README.md                   # Passo a passo de configuração (.env), credencial única e deploy
│   ├── presets/                    # Presets JSON de personalização avançada por cliente (ex.: gnz-hortifruti.preset.json)
│   └── src/                        # Cliente Supabase isolado (supabasePortalClient.ts), CatalogView, OrderTrackingView, WeightSelectorModal e CredentialErrorScreen
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

## 📱 5. Catálogo Digital Público Integrado com `/orders` & Status em Tempo Real

Cada loja ou filial cadastrada possui uma URL exclusiva (`/store/{slug}`) acessível publicamente:
- **Personalização Completa da Vitrine (`/settings`):** logo (`logo_url`), banner de capa (`banner_url`), tema padrão (`catalogTheme`), cores da interface (`primaryColor`, `accentColor`, `headerBgColor`), alternância Claro/Escuro para o visitante, quantidade padrão de itens por página (`6` a `96`) e grade de `3` ou `4` colunas.
- **Suporte a Produtos por Unidade e por Peso (`KG`/gramas):** calculadora interativa de peso e valor com modais otimizados para o topo da tela no mobile (acima do teclado virtual).
- **Pedido Online Integrado com `/orders` + Acompanhamento em Tempo Real (`/store/{slug}/order/{orderId}`):** ao finalizar o pedido, o estoque é baixado atomicamente, o pedido cai em `/orders` na plataforma interna e o cliente é redirecionado para sua URL exclusiva em tempo real (via Supabase Realtime) até o pedido ficar como **Finalizado** (`COMPLETED`).

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

## 🗺️ 7. Mapa Completo de Rotas, Telas & Módulos da Plataforma

A aplicação possui roteamento completo (`src/routes/AppRoutes.tsx`) dividido entre páginas públicas institucionais, vitrine pública com rastreio em tempo real, autenticação, operação multi-loja e administração global SaaS:

### 7.1. Páginas Públicas, Institucionais & Evidências (`PublicLayout`)
| Rota | Componente | Funcionalidades Detalhadas |
| :--- | :--- | :--- |
| `/` | `LandingPage` | Apresentação executiva da plataforma, vitrine de recursos, planos comerciais dinâmicos vinculados pelo Global Admin (`show_on_landing_page`), **Configurador Interativo de Planos + Adicionais Avulsos (`InteractivePlanBuilderSection`)** com pré-cadastro comercial e acesso rápido às evidências. |
| `/features` | `FeaturesPage` | Detalhamento técnico e operacional de todos os módulos (Estoque, FEFO, PDV, Filiais, IA, BI, API Studio e Segurança RLS). |
| `/pricing` | `PricingPage` | Comparativo de planos mensais/anuais, tabela de módulos inclusos, simulador interativo de assinatura e envio de proposta comercial (`submit_commercial_proposal`). |
| `/contact` | `ContactPage` | Canais de atendimento comercial, suporte técnico e formulário de contato direto. |
| `/evidence` | `TestEvidencePage` | Galeria executiva interativa de homologação com 50 capturas de tela (Desktop 1440×900 e Mobile 390×844), filtros por módulo e resultados E2E. |

### 7.2. Catálogo Digital Público & Rastreio de Pedidos em Tempo Real
| Rota | Componente | Funcionalidades Detalhadas |
| :--- | :--- | :--- |
| `/store/:slug` | `CatalogPublicPage` | Vitrine pública da loja ou filial com busca instantânea, filtro por categoria e faixa de preço, suporte a itens unitários (`UN`) e pesáveis (`KG`/gramas), carrinho com campo de **Observações do Pedido**, checkout online integrado com `/orders` (`create_public_catalog_order`) e disparo de mensagem formatada para o WhatsApp da loja com tags dinâmicas. |
| `/store/:slug/order/:orderId` | `OrderTrackingPublicPage` | Página exclusiva de acompanhamento do pedido em tempo real via **Supabase Realtime**, exibindo linha do tempo visual (`PENDING` → `CONFIRMED` → `PROCESSING` → `READY` → `SHIPPED` → `DELIVERED` / `COMPLETED`), apelidos personalizados de status da loja, itens do pedido e botão direto para o WhatsApp. |
| `/order-status/:orderId` | `OrderTrackingPublicPage` | Rota curta alternativa para rastreamento direto do pedido em tempo real pelo ID. |

### 7.3. Autenticação & Recuperação de Acesso (`AuthLayout`)
| Rota | Componente | Funcionalidades Detalhadas |
| :--- | :--- | :--- |
| `/login` | `LoginPage` | Login por e-mail/senha, autenticação social via **Google OAuth**, validação de sessão e detecção automática de **Reset Obrigatório de PIN (`EmployeePinResetModal`)** para funcionários. |
| `/register` | `RegisterPage` | Criação de nova conta de usuário com provisionamento automático de perfil (`handle_new_user`). |
| `/forgot-password` | `ForgotPasswordPage` | Solicitação de link seguro de recuperação de senha via Supabase Auth. |
| `/reset-password` | `ResetPasswordPage` | Redefinição de senha autenticada por token de recuperação. |

### 7.4. Operação da Loja, BI, IA & Gestão Multi-Filial (`AppLayout` + `ProtectedRoute` + `PermissionGate`)
| Rota | Módulo SaaS | Componente | Funcionalidades Detalhadas |
| :--- | :--- | :--- | :--- |
| `/dashboard` | *Core* | `DashboardPage` | Painel executivo multi-loja (`Matriz`, `Filial` ou `Todas as Lojas Consolidado`), 8 KPIs com variação `%` vs. período anterior, gráficos de **Vendas Mensais (12 Meses)** e **Evolução no Período**, comparativo **Matriz vs. Filiais** com filtro em 1 clique, **Ranking Top Produtos Mais Vendidos**, Donut SVG de categorias, canais, meios de pagamento, card de insight de IA e exportação CSV/JSON/PDF. |
| `/ai-copilot` | `MOD_AI_COPILOT_CHAT` | `AiCopilotPage` | Central Copiloto de IA & Chatbot Executivo da Loja com radar operacional em tempo real, seletor de Persona (`CFO`, `Comercial`, `Auditor FEFO`, `Copiloto Prático`), simulador *"E Se?"*, análises em 1 clique e histórico persistente de sessões (`ai_chat_sessions`). |
| `/products` | `MOD_CATALOG_WA` | `ProductsPage` | Catálogo mestre de produtos com código SKU, código de barras (EAN), unidade (`UN`, `KG`, `L`, `CX`, `PCT`), preço de custo, preço de venda, margem/markup automático, estoque mínimo/máximo, galeria multi-fotos (`ProductGalleryModal`), entrada de estoque em lote (`BulkStockEntryModal`) e publicação no catálogo online. |
| `/categories` | `MOD_CATALOG_WA` | `CategoriesPage` | Gestão de categorias mercadológicas da loja com ordenação, busca e contagem de SKUs vinculados. |
| `/inventory` | `MOD_INVENTORY` | `InventoryPage` | Controle completo de estoque: KPIs de valorização financeira (a custo e a venda), abas de **Saldos Físicos**, **Movimentações (Kardex)**, **Fila de Aprovação de Baixas (`stock_writeoff_requests`)** e **Remessas para Filiais Sem Venda (`stock_transfers`)**, além de modais de ajuste, baixa unitária/em lote, importação de planilha CSV e limpeza de saldos zerados. |
| `/expiration` | `MOD_EXPIRATION` | `ExpirationPage` | Semáforo FEFO (*First-Expire, First-Out*) com KPIs de lotes Vencidos, Críticos (`<= 7 dias`), Atenção (`<= 30 dias`) e No Prazo, registro de tratativas auditáveis (`PURCHASED`, `RETURNED`, `WRITTEN_OFF`, `DISCARDED`, `KEPT`, `ON_HOLD`) e plano de ação anti-perdas com IA. |
| `/sales` | `MOD_POS_SALES` | `SalesPage` | PDV Frente de Caixa com busca rápida por código de barras/SKU/nome, suporte a itens pesáveis (`WeightInputModal` por peso em `KG`/`g` ou valor em `R$`), regra configurável de **Cliente Obrigatório vs. Cliente Genérico**, descontos, múltiplos pagamentos, edição de pedidos existentes (`/sales?editOrder=:id`), botão **"Atualizar do Banco"** e envio do link de rastreio por WhatsApp. |
| `/orders` | `MOD_CATALOG_WA` | `OrdersPage` | Central de pedidos (PDV, WhatsApp, Catálogo Público e API) com mudança rápida de status (incluindo `COMPLETED` / *"Finalizado"* e `CANCELLED` com estorno atômico de estoque), **Histórico de Atualizações de Status por Usuário**, apelidos customizáveis de status por loja, botão **"Atualizar do Banco"**, disparo de WhatsApp com link de acompanhamento ao vivo e reabertura no PDV. |
| `/customers` | `MOD_CUSTOMERS` | `CustomersPage` | CRM de clientes com histórico completo de pedidos e itens, **deep-link clicável na URL (`/customers?customerId=...&orderId=...`)**, seletor **Multi-Status** (status do pedido e status do cliente), filtro de datas, **Visões Salvas no Banco por Loja/Filial (`store_saved_views`)**, recomendações comerciais por IA e botão **Exportar Visíveis**. |
| `/suppliers` | `MOD_SUPPLIERS` | `SuppliersPage` | Gestão de fornecedores (Razão Social, Nome Fantasia, CNPJ/CPF, contatos comerciais, e-mail, telefone e status). |
| `/purchases` | `MOD_PURCHASING` | `PurchasingPage` | Emissão e gestão de Ordens de Compra (`DRAFT`, `ISSUED`, `RECEIVED`, `CANCELLED`), cálculo dinâmico de custo unitário, markup e margem, recebimento atômico de mercadorias (`receive_purchase_order_stock`) que alimenta lotes/saldos e atualiza custos, além de análise de tendências de compra com IA. |
| `/reports` | `MOD_REPORTS` | `ReportsPage` | Central de **9 Relatórios Analíticos de Varejo**, seletor de loja ou visão consolidada (`storeId === 'all'`), filtros de período sincronizados na URL, registros com data e hora exatas (`DD/MM/YYYY HH:mm`), deep-link para pedidos de clientes, diagnóstico executivo por IA e exportação CSV dos registros visíveis (`Exportar Visíveis`). |
| `/stores` | `MOD_TEAM_AUDIT` | `StoresPage` | Gestão hierárquica de **Lojas & Filiais (`Matriz -> └─ Filial`)**, filtros por tipo de unidade, criação de filiais vinculadas à Matriz, **Criação de Lojas em Lote com IA (`BulkStoreAiBuilderModal`)** e transferência de estoque para filiais sem venda. |
| `/team` | `MOD_TEAM_AUDIT` | `TeamPage` | Gestão de funcionários da loja, aprovadores de baixa de estoque (`STOCK_APPROVER`), papéis customizados (`StoreCustomRolesModal`), acompanhamento da franquia de **10 funcionários ativos grátis por loja** e acesso rápido às fichas de permissões. |
| `/team/new` e `/team/:employeeId` | `MOD_TEAM_AUDIT` | `StoreEmployeeEditPage` | Página dedicada em tela cheia para cadastro e edição de funcionário, matrícula, cargo, alçada financeira máxima de baixa (`max_writeoff_value`), **Reset Obrigatório de PIN no Próximo Login (`require_pin_reset`)**, **Política de Complexidade de PIN (`pin_requirements`)** e matriz de **47 permissões granulares** (também acessível via `/team/stores/:storeId/employees/:employeeId`). |
| `/integrations` | `MOD_API_INTEGRATIONS` | `ApiIntegrationsPage` | **API Studio & Conector de Serviços Estilo Postman**: Request Builder HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), autenticação Bearer/API Key/Basic, importador e gerador de comandos `cURL`, detecção automática de arrays JSON, mapeamento visual **De → Para** com Auto-Map, simulação *Dry-Run* e sincronização *Upsert* em lote para Clientes, Categorias, Produtos, Fornecedores e Estoque. |
| `/notifications` | *Core* | `NotificationsPage` | Central de alertas operacionais da loja (ruptura de estoque, estoque baixo, lotes próximos ao vencimento, novos pedidos online) com geração sob demanda (`generate_stock_alerts`) e marcação de leitura. |
| `/audit` | `MOD_TEAM_AUDIT` | `AuditLogsPage` | Trilha de auditoria completa da loja com filtros por ação, entidade, operador e data/hora, permitindo inspecionar payloads de criação, alteração, exclusão e mudanças de status. |
| `/settings` | `MOD_TEAM_AUDIT` | `SettingsPage` | Configurações da loja organizadas em **5 abas sincronizadas na URL**: `?tab=store` (Dados Cadastrais, CNPJ, WhatsApp e Endereço), `?tab=catalog` (Personalização da Vitrine Pública `/store/:slug`, logo, capa, cores, colunas, paginação e apelidos de status de pedidos), `?tab=whatsapp` (Gerenciador de Templates de Mensagem WhatsApp com tags dinâmicas do carrinho), `?tab=pos` (Regra de Cadastro de Cliente Obrigatório vs. Cliente Genérico no PDV) e `?tab=theme` (Temas visuais do painel interno). |

### 7.5. Administração Global SaaS (`/global-admin*` — Exclusivo `GLOBAL_ADMIN`)
| Rota | Componente | Funcionalidades Detalhadas |
| :--- | :--- | :--- |
| `/global-admin?tab=stores` | `GlobalAdminDashboardPage` | Visão global de todas as redes de lojas em árvore (`Matriz -> └─ Filial`), métricas globais da plataforma, criação em lote com IA e menu de ações rápidas por unidade. |
| `/global-admin/stores/new` e `/global-admin/stores/:storeId/edit` | `GlobalAdminStoreEditPage` | Criação e edição avançada de Loja Matriz ou Filial (`parent_store_id`, `branch_code`), vínculo de administradores `STORE_ADMIN`, gestão de equipe da unidade, regras de cliente no PDV e **Exclusão Definitiva Segura (`global_admin_hard_delete_store`)**. |
| `/global-admin/stores/:storeId/employees/new` e `:employeeId` | `StoreEmployeeEditPage` | Gestão global de funcionários de qualquer loja ou filial com controle completo de PIN, alçada de baixa e 47 permissões granulares. |
| `/global-admin?tab=users` | `GlobalAdminDashboardPage` | Gestão de titulares e administradores de loja (`STORE_ADMIN` / `GLOBAL_ADMIN`), dropdown de lojas administradas com cotas de equipe, status de assinatura SaaS e atalhos para permissões e faturamento. |
| `/global-admin/users/:userId/edit` | `GlobalAdminUserEditPage` | Edição de dados cadastrais, credenciais, status global e vínculo de lojas administradas pelo usuário titular. |
| `/global-admin/users/:userId/permissions` | `GlobalAdminUserPermissionsPage` | Configuração em tela cheia do plano comercial SaaS do usuário, ativação/desativação individual dos 15 módulos (incluindo add-ons de IA), flag `enforce_over_store_admin`, cálculo automático de mensalidade e **análise ao vivo do Grafo de Dependências entre Telas**. |
| `/global-admin/users/:userId/billing` | `GlobalAdminUserBillingPage` | Controle financeiro individual do assinante: mensalidade acordada, cálculo automático de licenças extras de funcionários (acima dos 10 grátis por loja), geração de faturas, baixa de pagamentos (`record_subscription_payment`) e histórico auditado. |
| `/global-admin?tab=finance` | `GlobalAdminDashboardPage` | Hub financeiro executivo do SaaS com indicadores de MRR, adimplência, faturas em aberto e acesso rápido às sub-rotas financeiras. |
| `/global-admin/finance/rules` | `GlobalAdminFinanceRulesPage` | Configuração das regras globais de licenciamento (`global_billing_rules`): franquia padrão de **10 funcionários grátis por loja**, preço por licença excedente, dias de tolerância e exceções individuais por loja. |
| `/global-admin/finance/plans` | `GlobalAdminFinancePlansPage` | Gestão do catálogo de Planos Comerciais (`permission_groups`) e preços individuais dos 15 módulos (`permission_modules`), com flags para publicar planos na Landing Page (`show_on_landing_page`) e destacar o plano principal (`is_highlighted_on_landing`). |
| `/global-admin/finance/payments` | `GlobalAdminFinancePaymentsPage` | Livro-razão consolidado de todas as faturas e pagamentos de assinaturas da plataforma (`subscription_payments`). |
| `/global-admin/contracts` | `GlobalAdminContractsPage` | **Fila Comercial "Novos Contratos"** (propostas enviadas pela Landing Page com protocolo `PROP-...` e contato em 1 clique via WhatsApp) + **Gerenciador de Contratos (`platform_contracts`)** com editor de minutas, variáveis dinâmicas, exportação em **HTML**, **DOCX** e **PDF**, upload no **Supabase Storage** e sincronização com o **Google Drive** do Global Admin. |
| `/global-admin/ai/:tab` | `GlobalAdminAiSettingsPage` | Central de Governança de IA do Super Admin dividida em 5 rotas de abas dedicadas: `/providers` (Cofre de Chaves API `pgcrypto`, descoberta dinâmica de modelos da chave e fixação de modelo por seção do site), `/personas` (Personas globais e Context Prompt Injection), `/security-fallback` (Escudo Anti-Prompt Injection, cadeia de fallback e simulador de ataque/contingência), `/commercial-modules` (Precificação dos 5 add-ons comerciais de IA) e `/telemetry` (Logs de consumo, tokens, latência, filtros multi-dimensionais e exportação CSV). |
| `/global-admin?tab=backups` | `GlobalBackupPanel` | Central de Backups Multi-Loja: geração de **Dump SQL Relacional (`.sql`)**, **Pacote de Imagens de Produtos (`.zip` com `manifest.json`)** e **Backup Estruturado (`.json`)** por loja ou de toda a plataforma. |
| `/global-admin?tab=db-explorer` | `GlobalDbExplorerPanel` | Explorador CRUD direto no navegador para inspeção, criação, edição e exclusão de registros em 12 tabelas do banco de dados. |
| `/global-admin?tab=api-hbac` | `GlobalApiKeyHbacPanel` | Gerenciador de Tokens de API (`olv_live_...`), atribuição dos **23 escopos HBAC**, validade/expiração, revogação instantânea e playground interativo de relatórios para IA externa (`/rpc/get_ai_report`). |
| `/global-admin?tab=delete` | `GlobalDeletePanel` | Painel de exclusão definitiva segura (`global_admin_delete` e `global_admin_hard_delete_store`) com validação de integridade referencial e auditoria. |

---

## 🧠 8. Detalhamento Completo da Plataforma de Inteligência Artificial Multi-Provedor

A arquitetura de Inteligência Artificial (`src/services/aiOrchestratorService.ts` e migration `20261103000028_ai_platform_and_modules.sql`) opera de forma nativa, segura e resiliente em toda a plataforma:

1. **Multi-Provedor com Descoberta Dinâmica de Modelos & Fixação por Seção (`AI_SITE_SECTIONS`):**
   - Suporte nativo a **Google Gemini** (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`), **OpenAI** (`gpt-4o-mini`, `gpt-4o`, `o3-mini`), **Anthropic Claude** (`claude-3-7-sonnet`, `claude-3-5-haiku`) e **Endpoints Customizados OpenAI-Compatible** (Grok/xAI, DeepSeek, OpenRouter, Groq, Ollama).
   - Ao inserir uma chave de API em `/global-admin/ai/providers`, o administrador pode consultar em tempo real os modelos disponíveis naquela conta (`fetchModelsFromProviderKey`) e fixar qual modelo atende cada parte específica do sistema (`COPILOT_CHAT`, `DASHBOARD_BI`, `REPORTS_9_TABS`, `INVENTORY_EXPIRATION`, `SALES_CRM_POS`, `PURCHASING_TRENDS`, `BULK_STORE_BUILDER`).
2. **Cofre Criptografado no Banco (`pgcrypto`):**
   - As chaves são criptografadas no PostgreSQL com `pgp_sym_encrypt` na coluna `encrypted_api_key` (`BYTEA`). O frontend nunca recebe a chave em listagens (`list_ai_provider_configs_safe` retorna apenas `masked_api_key`).
   - Apenas a RPC `SECURITY DEFINER` `resolve_ai_execution_runtime` descriptografa a credencial em memória após confirmar que o usuário pertence à loja e que o módulo comercial `MOD_AI_*` correspondente está ativo.
3. **Context Prompt Injection Verificado (`StoreAiContextSnapshot`):**
   - Antes de cada chamada ao modelo, o orquestrador coleta indicadores reais e atualizados da loja ativa (faturamento, margem, produtos Curva A, itens em ruptura, lotes vencendo no FEFO, top clientes e ordens de compra) e os injeta de forma estruturada no System Prompt, evitando alucinações e respostas genéricas.
4. **Escudo Anti-Prompt Injection (`inspectPromptSecurity`):**
   - Inspeciona todas as entradas do usuário contra padrões de *jailbreak*, tentativas de ignorar instruções do sistema, extração de chaves de API, injeção de SQL ou acesso cruzado a outro `store_id`. Tentativas maliciosas são bloqueadas antes de chamar a API externa e auditadas em `public.ai_usage_logs` com `status = 'BLOCKED_INJECTION'`.
5. **Cadeia de Fallback em 4 Níveis (Zero-Downtime):**
   - Caso o modelo principal sofra timeout, limite de cota (`HTTP 429`) ou indisponibilidade, o orquestrador executa automaticamente:
     `1º Modelo Principal do Provedor Primário (ex.: Gemini)` → `2º Modelo Rápido (Fast Model)` → `3º Provedor Secundário de Backup (ex.: OpenAI/Claude)` → `4º Motor Analítico Determinístico Local (generateAnalyticalFallbackResponse)`, que calcula diagnósticos reais diretamente sobre os dados da loja mesmo sem internet ou sem créditos de API.

---

## 📦 9. Catálogo de Módulos Comerciais SaaS, Planos & Grafo de Dependências

O controle comercial SaaS (`src/constants/screenDependencies.ts`) permite comercializar a plataforma em planos modulares ou pacotes personalizados:

### 9.1. Os 15 Módulos Comerciais (`PermissionModule`)
| Código do Módulo | Nome Comercial | Categoria | Rotas Controladas | Preço Base Mensal |
| :--- | :--- | :--- | :--- | :--- |
| `MOD_CATALOG_WA` | Catálogo de Produtos & Vendas WhatsApp | `VENDAS` | `/products`, `/categories`, `/orders`, `/store/:slug` | R$ 49,90 |
| `MOD_POS_SALES` | Vendas PDV (Frente de Caixa Presencial) | `VENDAS` | `/sales` | R$ 59,90 |
| `MOD_CUSTOMERS` | Cadastro de Clientes & CRM | `VENDAS` | `/customers` | R$ 24,90 |
| `MOD_INVENTORY` | Controle de Estoque (Saldos, Kardex e Baixas) | `CATALOGO_ESTOQUE` | `/inventory` | R$ 49,90 |
| `MOD_EXPIRATION` | Controle de Lotes & Validades (FEFO) | `CATALOGO_ESTOQUE` | `/expiration` | R$ 29,90 |
| `MOD_PURCHASING` | Gestão de Compras (Ordens de Compra) | `COMPRAS_SUPRIMENTOS` | `/purchases` | R$ 39,90 |
| `MOD_SUPPLIERS` | Cadastro & Gestão de Fornecedores | `COMPRAS_SUPRIMENTOS` | `/suppliers` | R$ 19,90 |
| `MOD_REPORTS` | Gestão de Relatórios & BI (9 Relatórios + CSV) | `GESTAO_BI` | `/reports` | R$ 49,90 |
| `MOD_TEAM_AUDIT` | Gestão de Equipe, Configurações & Auditoria | `GESTAO_BI` | `/team`, `/audit`, `/settings`, `/stores` | R$ 29,90 |
| `MOD_API_INTEGRATIONS` | Integrações Externas API (Conector REST & HBAC) | `TECNOLOGIA` | `/integrations` | R$ 79,90 |
| `MOD_AI_COPILOT_CHAT` | IA Copiloto & Chatbot Executivo da Loja | `INTELIGENCIA_ARTIFICIAL` | `/ai-copilot` + Gaveta Global | + R$ 49,90 |
| `MOD_AI_SALES_CRM` | IA Comercial: Sugestão de Produtos & Cross-Sell PDV | `INTELIGENCIA_ARTIFICIAL` | Cards IA em `/customers` e `/sales` | + R$ 39,90 |
| `MOD_AI_INVENTORY_EXPIRATION` | IA de Estoque, Alertas de Validade FEFO & Anti-Perdas | `INTELIGENCIA_ARTIFICIAL` | Cards IA em `/expiration` e `/inventory` | + R$ 39,90 |
| `MOD_AI_PURCHASING_TRENDS` | IA de Tendências de Compras, Giro & Reposição | `INTELIGENCIA_ARTIFICIAL` | Cards IA em `/purchases` | + R$ 39,90 |
| `MOD_AI_BI_INSIGHTS` | IA Executiva: Resumos Mensais de Vendas & BI | `INTELIGENCIA_ARTIFICIAL` | Cards IA em `/dashboard` e `/reports` | + R$ 44,90 |

### 9.2. Planos Comerciais Padrão (`PermissionGroup`)
1. **`PLAN_WHATSAPP_ONLY` (Catálogo de Venda Somente por WhatsApp — R$ 59,90/mês):** inclui `MOD_CATALOG_WA` + `MOD_CUSTOMERS`.
2. **`PLAN_INVENTORY_CONTROL` (Controle de Estoque, Validades & Compras — R$ 119,90/mês):** inclui `MOD_CATALOG_WA`, `MOD_INVENTORY`, `MOD_EXPIRATION`, `MOD_PURCHASING` e `MOD_SUPPLIERS`.
3. **`PLAN_POS_AND_STOCK` (Comercial PDV + Estoque + Catálogo WhatsApp — R$ 149,90/mês):** inclui `MOD_CATALOG_WA`, `MOD_POS_SALES`, `MOD_INVENTORY`, `MOD_EXPIRATION` e `MOD_CUSTOMERS`.
4. **`PLAN_PRO_MANAGEMENT` (Gestão Completa Pro — R$ 199,90/mês — *Mais Popular*):** inclui todos os 9 módulos operacionais e gerenciais (`MOD_CATALOG_WA` até `MOD_TEAM_AUDIT`).
5. **`PLAN_ENTERPRISE_FULL` (Enterprise Full + Integrações API + Suíte IA — R$ 269,90/mês):** acesso irrestrito a todos os 15 módulos da plataforma.

### 9.3. Motor de Grafo de Dependências entre Telas (`analyzeScreenDependencies`)
Sempre que o Global Admin personaliza os módulos de um plano ou usuário (`/global-admin/users/:userId/permissions` ou `/global-admin/finance/plans`), o motor analisa impactos cruzados em tempo real e exibe alertas classificados como `CRITICAL`, `WARNING` ou `INFO` com botão **Quick-Fix** de 1 clique:
- **Compras ativo sem Fornecedores (`CRITICAL`):** avisa que `supplier_id` é obrigatório para emitir Ordens de Compra em `/purchases` e oferece botão para reativar `MOD_SUPPLIERS`.
- **Validades FEFO ativo sem Controle de Estoque (`CRITICAL`):** alerta que os lotes serão visíveis em `/expiration`, mas sem ajuste de saldo no Kardex em `/inventory`.
- **Catálogo de Produtos desmarcado com outros módulos ativos (`CRITICAL`):** alerta que PDV, Estoque e Compras dependem da base mestre de produtos (`/products`).
- **PDV ou Catálogo ativo sem Clientes (`WARNING`):** explica que as vendas operarão exclusivamente com o `"Cliente Genérico"`, sem histórico nominal em `/customers`.

---

## 🛡️ 10. Papéis de Usuário (`UserRole`), Alçadas & Matriz das 47 Permissões Granulares

O sistema combina **7 papéis nativos** (`user_role_enum`), **papéis customizados por loja** (`store_custom_roles`) e **47 permissões granulares** (`src/constants/granularPermissions.ts`) com concessão (`granted_permissions`) e revogação (`revoked_permissions`) individual por funcionário:

### 10.1. Os 7 Papéis do Sistema (`UserRole`)
| Papel (`UserRole`) | Nome Exibido | Alçada de Baixa Padrão | Escopo Principal |
| :--- | :--- | :--- | :--- |
| `GLOBAL_ADMIN` | Global Admin | Sim (Irrestrita) | Governança total do SaaS, todas as lojas, filiais, cofre de IA, planos, contratos, backups e banco de dados. |
| `STORE_ADMIN` | Admin Loja | Sim | Gestão completa da loja e suas filiais, equipe, aprovadores, estoque, compras, vendas e relatórios (respeitando módulos do plano SaaS quando `enforce_over_store_admin = true`). |
| `STOCK_APPROVER` | Aprovador de Baixa de Estoque | Sim (Até `max_writeoff_value`) | Supervisor habilitado para autorizar baixas de estoque presenciais ou na fila pendente (`stock_writeoff_requests`), validades e remessas entre filiais. |
| `FINANCE` | Gerente / Financeiro | Não | Acesso a custos, margens, reajuste de preços, ordens de compra, fornecedores, auditoria e todos os 9 relatórios financeiros/BI. |
| `SELLER` | Vendedor / Operador de Caixa | Não | Operação do PDV (`/sales`), atendimento e despacho de pedidos (`/orders`), catálogo WhatsApp e cadastro/edição de clientes (`/customers`). |
| `INVENTORY` | Estoquista Operacional | Não (Solicita aprovação) | Lançamento de entradas, contagens, lotes/validades, recebimento de compras/transferências e abertura de solicitações de baixa (`inventory.writeoff_request`). |
| `VIEWER` | Visualizador / Auditoria Leitura | Não | Acesso estritamente de leitura ao catálogo, saldos de estoque, filiais, vendas, pedidos, clientes e relatórios básicos. |

### 10.2. Matriz Completa das 47 Permissões Granulares (por Grupo de Recurso)
1. **Estoque, Lotes & Aprovação de Baixas (`inventory` — 8 permissões):**
   `inventory.read`, `inventory.receive`, `inventory.adjust`, `inventory.writeoff_request`, `inventory.approve_writeoff` *(Autorizador Exclusivo)*, `inventory.batches`, `inventory.cost_centers`, `inventory.import`.
2. **Filiais & Remessas Sem Venda (`branches` — 4 permissões):**
   `branches.read`, `branches.manage`, `branches.transfer_send` *(Enviar produtos p/ filial sem venda)*, `branches.transfer_receive`.
3. **Produtos, Preços & Catálogo (`products` — 8 permissões):**
   `products.read`, `products.view_cost` *(Ver preço de custo e margem)*, `products.create`, `products.update`, `products.change_price`, `products.delete`, `categories.manage`, `catalog.whatsapp`.
4. **Vendas PDV & Pedidos (`sales` — 7 permissões):**
   `sales.pos`, `sales.read`, `sales.apply_discount`, `sales.cancel` *(Cancelar venda e estornar estoque)*, `orders.read`, `orders.manage`, `orders.delete`.
5. **Compras & Fornecedores (`purchasing` — 8 permissões):**
   `purchase_orders.read`, `purchase_orders.create`, `purchase_orders.approve`, `purchase_orders.receive`, `purchase_orders.cancel`, `suppliers.read`, `suppliers.create`, `suppliers.delete`.
6. **Clientes & CRM (`customers` — 5 permissões):**
   `customers.read`, `customers.create`, `customers.update`, `customers.delete`, `customers.export`.
7. **Relatórios & Inteligência (`reports` — 6 permissões):**
   `reports.sales`, `reports.inventory`, `reports.financial`, `reports.customers`, `reports.suppliers`, `reports.export`.
8. **Administração da Loja, Equipe & Auditoria (`stores` — 5 permissões):**
   `users.manage`, `roles.manage`, `stores.manage`, `audit.view`, `integrations.manage`.

---

## 📊 11. Os 9 Relatórios Analíticos de Varejo, BI & RPC para IA Externa (`/reports` & `/rpc/get_ai_report`)

A Central de Relatórios (`/reports`, `src/services/reportService.ts`) e a RPC `public.get_ai_report(p_report, p_store_id)` processam indicadores avançados de varejo em tempo real:

| # | Aba em `/reports` | Alias na RPC `get_ai_report` | Indicadores e Cálculos Entregues |
| :--- | :--- | :--- | :--- |
| **KPIs** | Barra Executiva Topo | `retail_summary_kpis` / `kpis` | Produtos ativos, unidades físicas totais, valorização a custo, valorização a venda, lucro potencial, margem média `%`, itens em ruptura, estoque baixo, vendas no mês e perdas totais. |
| **1** | **Valorização & Lucro (`valuation`)** | `stock_valuation` / `valuation` | Custo unitário e total, preço de venda e total, lucro potencial em `R$`, margem bruta `%`, markup e status de cobertura por SKU. |
| **2** | **Curva ABC & Pareto (`abc`)** | `abc_curve_pareto` / `abc` | Classificação de Pareto **80/15/5** (`Classe A` até 80% do valor, `Classe B` próximos 15%, `Classe C` últimos 5%), percentual individual/acumulado e diretriz estratégica automática por item. |
| **3** | **Giro & Compra por Consumo (`demand`)** | `demand_purchasing` / `demand` | Consumo médio diário, vendas no período, **cobertura de estoque em dias (*runout*)**, quantidade sugerida de compra para meta de 30 dias, investimento necessário e nível de urgência (`URGENT`, `ATTENTION`, `NORMAL`, `OVERSTOCK`). |
| **4** | **Ticket Médio & Clientes (`customers`)** | `customer_ticket_ltv` / `customers` | **Lifetime Value (LTV)**, total gasto, quantidade de pedidos, ticket médio, recência em dias, canal preferido, segmentação (`VIP`, `FREQUENT`, `OCCASIONAL`, `INACTIVE`) e lista expansível de **todos os pedidos com data/hora e deep-link para `/customers?customerId=...&orderId=...`**. |
| **5** | **Capital de Giro & GMROI (`investment`)** | `capital_investment` / `capital` | Capital imobilizado a custo por categoria mercadológica, potencial de venda na gôndola, lucro projetado, participação `%` no estoque total e índice **GMROI** (*Gross Margin Return on Inventory Investment*). |
| **6** | **Ruptura & Reposição (`stockouts`)** | `stockout_replenishment` / `stockouts` | SKUs com saldo zerado (`CRITICAL`) ou abaixo do estoque mínimo (`WARNING`), déficit em unidades e orçamento exato de reposição a preço de custo. |
| **7** | **Compras & Fornecedores (`purchasing`)** | `purchasing_history` / `purchases` | Histórico de ordens de compra com **data e hora exatas (`DD/MM/YYYY HH:mm`)**, fornecedor, resumo detalhado dos itens comprados, custo total, valor de venda projetado e margem de entrada. |
| **8** | **Perdas & Baixas (`losses`)** | `operational_losses` / `losses` | Auditoria financeira de quebras, avarias, vencimentos e ajustes negativos com motivo de perda (`loss_reasons`), centro de custo (`cost_centers`), operador responsável e valor total perdido. |
| **9** | **Vendas & Desempenho (`sales`)** | `sales_performance` / `sales` | Registro transacional de vendas com **data e hora exatas (`DD/MM/YYYY HH:mm`)**, cliente (com link direto), canal (`IN_STORE`, `WHATSAPP`, `CATALOG`, `API`), meio de pagamento, subtotal, descontos, total líquido e detalhamento dos itens vendidos. |

---

## 🔌 12. API Studio (Estilo Postman), Tokens HBAC & Integração com Agentes Externos

### 12.1. API Studio Interno (`/integrations`)
- **Request Builder Completo:** suporta métodos `GET`, `POST`, `PUT`, `PATCH` e `DELETE`, cabeçalhos customizados, query params, corpo JSON e autenticação (`NONE`, `BEARER`, `API_KEY`, `BASIC`).
- **Importação e Exportação `cURL`:** converte qualquer comando `cURL` colado pelo usuário em configuração estruturada e vice-versa (`parseCurlCommand` / `generateCurlCommand`).
- **Service Binding Visual (De → Para):** detecta automaticamente arrays de objetos na resposta JSON (`detectJsonArrays`), mapeia campos externos para as colunas do Olivelas com **Auto-Map Inteligente** (`autoMapFields`), executa **Simulação Dry-Run** sem gravar no banco e realiza sincronização **Upsert em Lote** para `CUSTOMERS`, `CATEGORIES`, `PRODUCTS`, `SUPPLIERS` e `INVENTORY`, registrando logs auditáveis em `public.api_integration_logs`.

### 12.2. Tokens HBAC (`olv_live_...`) & 23 Escopos de Acesso (`/global-admin?tab=api-hbac`)
Agentes de IA externos (LangChain, n8n, ChatGPT Actions, Claude MCP, scripts Python/Node) e o `spa_portal` autenticam-se diretamente no PostgREST enviando os cabeçalhos `X-HBAC-Token: olv_live_<32_hex>` e `X-Store-ID: <uuid>`.
- **Defesa em 3 Camadas no PostgreSQL:**
  1. **Interceptação Pré-Request (`public.check_hbac_pre_request`):** valida existência, status ativo (`is_active`), data de expiração (`expires_at`), vínculo exato com a loja (`X-Store-ID`) e escopo exigido para a tabela/método antes de qualquer query rodar.
  2. **RLS por Linha (`public.has_hbac_scope`):** garante isolamento estrito por `store_id` em cada registro lido ou modificado.
  3. **Trigger de Sincronização de Estoque via API (`trg_api_stock_movement_sync`):** ao inserir um movimento em `POST /rest/v1/stock_movements`, calcula automaticamente `previous_quantity` e `new_quantity` e atualiza `public.stock_balances` em tempo real.
- **23 Escopos HBAC Suportados:** `*` (Full Admin), `products:read`, `products:write`, `products:delete`, `inventory:read`, `inventory:write`, `inventory:adjust`, `orders:read`, `orders:write`, `orders:cancel`, `purchases:read`, `purchases:write`, `customers:read`, `customers:write`, `reports:read`, `reports:export`, `reports:list`, `reports:kpis`, `reports:valuation`, `reports:abc`, `reports:stockouts`, `reports:purchases`, `reports:losses`, `reports:sales` e `audit:read`.

---

## 🗄️ 13. Arquitetura Completa do Banco de Dados (30 Migrations SQL, Tabelas & RPCs)

O banco de dados PostgreSQL no Supabase é gerenciado por **30 migrations incrementais** (`supabase/migrations/20260925000001_initial_schema.sql` até `20261111000030_public_catalog_orders_and_realtime_tracking.sql`):

### 13.1. Inventário Completo de Tabelas (`public.*`)
| Domínio | Tabelas no PostgreSQL | Finalidade Principal |
| :--- | :--- | :--- |
| **Identidade, Lojas & Equipe** | `profiles`, `stores`, `store_users`, `store_custom_roles`, `roles`, `permissions`, `role_permissions` | Perfis de usuários (`is_global_admin`), lojas e filiais (`parent_store_id`, `is_branch`, `branch_code`, `theme_config`), vínculo de funcionários com PIN/alçadas/permissões granulares e papéis customizados por loja. |
| **Comercial SaaS, Planos & Contratos** | `permission_modules`, `permission_groups`, `user_permission_profiles`, `subscription_payments`, `global_billing_rules`, `permission_billing_audit_logs`, `commercial_plan_proposals`, `platform_contracts` | Catálogo de 15 módulos e planos SaaS, assinaturas por titular, livro-razão de pagamentos, regra dos 10 funcionários grátis, propostas da Landing Page (`PROP-...`) e contratos gerados (HTML/DOCX/PDF + Storage + Google Drive). |
| **Inteligência Artificial & Copiloto** | `ai_provider_configs`, `ai_personas`, `ai_store_configs`, `ai_chat_sessions`, `ai_chat_messages`, `ai_usage_logs` | Cofre criptografado de chaves de API (`pgcrypto`), personas de IA, configuração e contexto por loja, sessões/mensagens do Copiloto e telemetria/auditoria de uso e bloqueios de Prompt Injection. |
| **Cadastros & Mídia** | `categories`, `brands`, `manufacturers`, `suppliers`, `supplier_contacts`, `customers`, `customer_addresses`, `products`, `product_images`, `media_library` | Dados mestres de produtos, galeria de fotos isolada por loja, fornecedores, clientes e endereços. |
| **Estoque, Lotes FEFO & Filiais** | `stock_balances`, `stock_batches`, `stock_movements`, `stock_writeoff_requests`, `stock_transfers`, `stock_transfer_items`, `inventory_counts`, `inventory_count_items`, `cost_centers`, `loss_reasons`, `batch_dispositions` | Saldos físicos (`available_quantity` gerada), lotes com validade, Kardex de movimentações, fila de aprovação de baixas, remessas entre Matriz e Filiais sem venda, centros de custo, motivos de perda e tratativas de vencimento. |
| **Vendas, PDV, Catálogo & Compras** | `orders`, `order_items`, `payments`, `shipments`, `catalogs`, `purchase_orders`, `purchase_order_items` | Pedidos de venda presenciais e online, itens pesáveis/unitários, pagamentos, entregas e ordens de compra. |
| **Operação, Visões, Auditoria & API** | `store_saved_views`, `notifications`, `audit_logs`, `security_logs`, `api_tokens`, `api_integrations`, `api_integration_logs` | Visões de filtros salvas por loja/filial, alertas em tempo real, trilha de auditoria imutável, tokens HBAC e conectores do API Studio. |

### 13.2. Inventário Completo de Stored Procedures (RPCs no PostgreSQL)
| Função RPC (`public.*`) | Descrição Técnica & Segurança |
| :--- | :--- |
| `create_order_with_stock` | Cria venda no PDV com itens e pagamento, trava linhas (`FOR UPDATE`), deduz saldo e lotes FEFO atomicamente e associa `"Cliente Genérico"` quando aplicável. |
| `create_public_catalog_order` | Registra pedido online feito no catálogo público (`/store/:slug` ou `spa_portal`), valida preços no servidor, baixa estoque atomicamente, vincula/cria cliente pelo WhatsApp e dispara alerta para `/orders`. |
| `get_public_order_tracking` | Retorna dados seguros de acompanhamento em tempo real do pedido, itens e `theme_config` da loja para `/store/:slug/order/:orderId` e `spa_portal`. |
| `restore_sale_stock` | Estorna atomicamente os saldos de estoque e lotes ao cancelar um pedido de venda (`status = 'CANCELLED'`). |
| `receive_purchase_order_stock` | Efetiva o recebimento de uma Ordem de Compra, criando/atualizando lotes (`stock_batches`), somando saldos (`stock_balances`) e atualizando preços de custo/venda no catálogo. |
| `apply_stock_movement` | Registra movimentações manuais de estoque com validação estrita de `can_user_approve_writeoff` e limite financeiro `max_writeoff_value` para baixas (`LOSS` / `ADJUSTMENT` negativo). |
| `can_user_approve_writeoff` | Verifica no banco se o usuário possui papel `STOCK_APPROVER`, flag `can_approve_writeoff` ou permissão `inventory.approve_writeoff` e alçada financeira suficiente. |
| `review_stock_writeoff_request` | Aprova ou rejeita solicitações pendentes na fila `stock_writeoff_requests`, aplicando a baixa atomicamente quando aprovada. |
| `execute_stock_transfer_to_branch` | Transfere produtos e lotes da Matriz para uma Filial sem registrar venda, sincronizando categoria, produto mestre, fotos e saldos na filial destino. |
| `upsert_store_employee` | Cria ou atualiza funcionário na loja (`auth.users` + `profiles` + `store_users`) com cargo, matrícula, PIN, política de complexidade de PIN e permissões granulares sem encerrar a sessão do administrador logado. |
| `complete_employee_pin_reset` | Valida e grava o novo PIN do funcionário no login quando `require_pin_reset = true`, verificando conformidade com `pin_requirements`. |
| `assign_user_permission_group` | Atribui grupo de permissões SaaS, módulos customizados e mensalidade acordada ao usuário titular, registrando trilha em `permission_billing_audit_logs`. |
| `record_subscription_payment` | Lança e baixa pagamentos de faturas SaaS (`subscription_payments`) e atualiza o status de adimplência do assinante. |
| `submit_commercial_proposal` | Recebe propostas do configurador interativo da Landing Page (`/` e `/pricing`) e gera protocolo único `PROP-YYYYMMDD-XXXXXX` em `commercial_plan_proposals`. |
| `upsert_ai_provider_config` | Criptografa chaves de API de IA com `pgp_sym_encrypt` (`pgcrypto`) e salva modelos padrões, modelos por seção do site e prioridades de fallback (exclusivo `is_global_admin()`). |
| `list_ai_provider_configs_safe` | Lista provedores de IA configurados retornando apenas chaves mascaradas (`masked_api_key`). |
| `resolve_ai_execution_runtime` | Valida acesso ao tenant e módulo comercial `MOD_AI_*` antes de descriptografar a credencial de IA em memória para execução. |
| `get_ai_report` | Gera os 10 relatórios analíticos consolidados via API REST (`GET`/`POST /rest/v1/rpc/get_ai_report`) para consumo por agentes de IA externos. |
| `set_batch_disposition` / `clear_batch_disposition` | Registra ou limpa tratativas auditáveis de lotes próximos do vencimento ou vencidos em `/expiration`. |
| `generate_stock_alerts` | Varre saldos e lotes da loja para gerar notificações automáticas de ruptura, estoque mínimo e vencimento próximo. |
| `global_admin_delete` | Exclusão administrativa segura de registros com verificação de histórico comercial e restauração de saldo (`restore_stock_after_delete`). |
| `global_admin_hard_delete_store` | Exclusão definitiva e cascata segura de Loja Matriz ou Filial pelo Global Admin, limpando vínculos restritivos e gravando auditoria `GLOBAL_HARD_DELETE_STORE`. |
| `global_admin_delete_platform_user` | Remove usuário da plataforma (`public.profiles` e `auth.users`) com verificação de segurança pelo Global Admin. |

---

## 🖥️ 14. Experiência de Usuário (UX/UI) Desktop & Mobile, Atalhos e Acessibilidade

- **Layout Viewport-Fitted & Tabelas Responsivas (`ResponsiveTable`):**
  - No **Desktop (`≥ 768px`)**, as páginas utilizam densidade executiva com KPIs compactos em pílulas de 1 linha, tabelas com cabeçalho fixo (`sticky top-0`), rolagem interna suave e barra de paginação sempre fixa no rodapé do card.
  - No **Mobile (`< 768px`)**, as tabelas convertem-se automaticamente em cards estruturados de 2 colunas com rótulos dinâmicos (`data-mobile-label`) e barra de ordenação mobile dedicada.
- **Modais Inteligentes Sincronizados com o Teclado Virtual (`modal.tsx` e `WeightInputModal.tsx`):**
  - Em dispositivos móveis, todos os modais monitoram `window.visualViewport` (`height` e `offsetTop`), posicionando-se no topo da área visível (`items-start pt-2`) com `scrollIntoView` automático para que o teclado virtual nunca cubra campos de digitação ou botões de confirmação.
- **Menus Dropdown via Portal (`DropdownMenu`):**
  - Renderizados via `createPortal(..., document.body)` com cálculo geométrico em tempo real (`getBoundingClientRect` + `ResizeObserver`), garantindo que menus de **Ações Rápidas** nunca sejam cortados por containers com `overflow-hidden` nem ultrapassem as bordas da tela.
- **Paleta de Comandos Global (`Ctrl+K` / `Cmd+K` — `GlobalCommandK`):**
  - Navegação instantânea por teclado para qualquer tela, busca rápida de funcionalidades e atalhos operacionais (Nova Venda PDV, Novo Produto, Relatórios, Copiloto IA).
- **Internacionalização (i18n) & Temas Multi-Loja:**
  - Suporte completo a **Português (`pt-BR`)**, **Inglês (`en-US`)** e **Espanhol (`es-ES`)**, além de modo Claro, Escuro e Sistema combinados com paletas de cores exclusivas por loja (`storeThemes.ts`).

---

## 📄 15. Licença

Desenvolvido para uso comercial enterprise. Todos os direitos reservados.
