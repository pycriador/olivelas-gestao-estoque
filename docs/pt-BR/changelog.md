---
id: REF-OLIVELAS-DOCS-CHANGELOG
title: Changelog da documentação
type: Reference
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
language: pt-BR
classification: Confirmed
---

# Changelog da documentação

## 2026-10-29

- **Ajuste do Botão `"Personalizar & Solicitar"` e Pré-Seleção no Carrinho de Personalização em `/pricing#personalizar-plano`** (`src/pages/PricingPage.tsx`, `src/components/commercial/InteractivePlanBuilderSection.tsx`, `docs/pt-BR/changelog.md`):
  - **Rótulo Conciso nos Cards de Planos (`PricingPage.tsx`)**: alterado o texto do botão de `"Personalizar & Solicitar {plan.name}"` para `"Personalizar & Solicitar"`, evitando quebra ou excesso de texto dentro do card.
  - **Pré-Seleção Automática no Carrinho (`InteractivePlanBuilderSection.tsx`)**: ao clicar em `"Personalizar & Solicitar"`, o plano escolhido (`preselectedPlanId`) é imediatamente pré-selecionado no configurador e adicionado ao painel lateral **Carrinho & Pré-Cadastro** (listando o plano, seus módulos inclusos e eventuais adicionais avulsos), com rolagem suave até `#personalizar-plano` e destaque visual no carrinho.

- **Padronização do Nome de Exibição do Papel `STORE_ADMIN` para `"Admin Loja"` em Todo o Código** (`src/constants/granularPermissions.ts`, `src/layouts/AppLayout.tsx`, `src/pages/StoresPage.tsx`, `src/pages/TeamPage.tsx`, `src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/admin/GlobalAdminStoreEditPage.tsx`, `src/pages/admin/GlobalAdminUserEditPage.tsx`, `src/pages/admin/GlobalAdminUserPermissionsPage.tsx`, `src/pages/admin/GlobalAdminUserBillingPage.tsx`, `src/pages/admin/GlobalAdminFinancePaymentsPage.tsx`, `src/pages/admin/GlobalAdminFinanceRulesPage.tsx`, `src/components/admin/UserPermissionsAndPricingModal.tsx`, `src/pages/LandingPage.tsx`, `src/pages/PricingPage.tsx`, `src/pages/FeaturesPage.tsx`, `src/services/permissionGroupService.ts`, `src/i18n/locales/pt-BR.ts`, `src/i18n/locales/en-US.ts`, `src/i18n/locales/es-ES.ts`, `docs/pt-BR/changelog.md`):
  - **Rótulo Oficial `"Admin Loja"` (`ROLE_METADATA.STORE_ADMIN` e `formatRoleLabel`)**: atualizado `ROLE_METADATA.STORE_ADMIN.label` e `shortLabel` para `'Admin Loja'` e criado o helper `formatRoleLabel(role)` em `src/constants/granularPermissions.ts`.
  - **Substituição em Todas as Telas, Menus, Tabelas, Badges, Filtros e Modais**: todas as ocorrências visíveis de `"STORE_ADMIN"`, `"Store Admin"`, `"Administrador da Loja"` e interpolações diretas de `{role}` no seletor de lojas da barra lateral (`AppLayout.tsx`), páginas do Admin Global (`/global-admin`, `/global-admin/stores/:storeId/edit`, `/global-admin/users/:userId/*`, `/global-admin/finance/*`), páginas operacionais (`/stores`, `/team`), Landing Page (`/`, `/pricing`, `/features`) e dicionários i18n (`pt-BR`, `en-US`, `es-ES`) foram padronizadas para **"Admin Loja"**, preservando o identificador técnico `'STORE_ADMIN'` no banco de dados (`user_role_enum`) e nas consultas/RPCs.

- **Flag de Vinculação na Landing Page (`/global-admin/finance/plans`), Configurador Interativo de Planos + Adicionais Avulsos + Pré-Cadastro na Landing Page (`/` e `/pricing`), Seção "Novos Contratos" e Gerenciador de Contratos Completo (`/global-admin/contracts` com Exportação HTML, DOCX e PDF + Armazenamento no Supabase e Google Drive)** (`supabase/migrations/20261030000027_landing_leads_and_contracts.sql`, `src/types/permissionGroup.types.ts`, `src/constants/screenDependencies.ts`, `src/services/permissionGroupService.ts`, `src/pages/admin/GlobalAdminFinancePlansPage.tsx`, `src/types/contract.types.ts`, `src/services/contractService.ts`, `src/components/commercial/InteractivePlanBuilderSection.tsx`, `src/pages/LandingPage.tsx`, `src/pages/PricingPage.tsx`, `src/pages/admin/GlobalAdminContractsPage.tsx`, `src/layouts/AppLayout.tsx`, `src/routes/AppRoutes.tsx`, `src/i18n/locales/pt-BR.ts`, `src/i18n/locales/en-US.ts`, `src/i18n/locales/es-ES.ts`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/contracts.md`, `docs/pt-BR/changelog.md`):
  - **Flag de Vinculação na Landing Page em Planos Comerciais (`/global-admin/finance/plans`)**:
    - Adicionadas as flags `showOnLandingPage` (`show_on_landing_page`) e `isHighlightedOnLanding` (`is_highlighted_on_landing`) aos grupos de permissões (`permission_groups`), com switches rápidos nos cards e no modal de criação/edição de planos em `GlobalAdminFinancePlansPage.tsx`.
    - Criadas políticas públicas de leitura (`permission_groups_public_landing_select` e `permission_modules_public_landing_select`) para sincronizar automaticamente na Landing Page os planos ativos vinculados e o catálogo de módulos adicionais.
  - **Configurador Interativo de Planos + Adicionais Avulsos + Pré-Cadastro na Landing Page (`/` e `/pricing`, `InteractivePlanBuilderSection.tsx`)**:
    - Seção interativa onde o visitante escolhe um plano base vinculado pelo Global Admin (ou monta um plano 100% personalizado), ativa/desativa módulos adicionais avulsos com cálculo financeiro em tempo real (ciclo Mensal ou Anual + simulador da franquia de 10 funcionários grátis por loja), preenche **Nome**, **E-mail** e **Celular / WhatsApp** e registra a proposta na plataforma (`submit_commercial_proposal` / `commercial_plan_proposals`).
  - **Seção "Novos Contratos" para o Global Admin (`/global-admin/contracts`, `GlobalAdminContractsPage.tsx`)**:
    - Listagem dedicada no padrão visual de `/expiration` exibindo todas as solicitações e pré-cadastros registrados na Landing Page, com filtro por status (`NEW`, `CONTACTED`, `CONTRACT_GENERATED`, `SIGNED`, `ARCHIVED`), botões de contato em 1 clique via **WhatsApp** (com mensagem pré-formatada contendo o plano e adicionais escolhidos) e **E-mail**, e botão **"Gerar Contrato"** que pré-preenche automaticamente o Gerenciador de Contratos.
  - **Gerenciador de Contratos Completo com Exportação HTML, DOCX e PDF + Supabase + Google Drive (`GlobalAdminContractsPage.tsx`, `contractService.ts`)**:
    - Editor completo de contratos com preenchimento de **Meu Nome / Contratada** (`providerName`, documento, e-mail e representante), **Nome do Cliente / Contratante** (`customerName`, documento, e-mail, celular e endereço), **Produto / Plano Comprado** (`purchasedProduct`), **Módulos Adicionais** (`additionalModules`), valores, condições de pagamento e **Termos Personalizados** (`customTerms`) com variáveis dinâmicas (`{{MEU_NOME}}`, `{{NOME_CLIENTE}}`, `{{PRODUTO_COMPRADO}}`, `{{MODULOS_ADICIONAIS}}`, `{{VALOR_TOTAL}}`, etc.) e pré-visualização da folha A4 em tempo real.
    - Exportação pronta para assinatura em **HTML**, **DOCX** (pacote OpenXML `.docx` real gerado via `JSZip`) e **PDF** (folha A4 paginada para impressão/PDF).
    - Armazenamento primário no **Supabase** (tabela `public.platform_contracts` + upload do documento no bucket `products` em `contracts/`) e integração com o **Google Drive do Global Admin** (upload direto via Google Drive API v3 Multipart quando informado OAuth2 Access Token ou vinculação direta com a pasta do Drive do Global Admin).

- **Configuração de Reset de PIN no Próximo Login e Pré-requisitos de Segurança do PIN na Tela do Funcionário (`/team/:employeeId`)** (`supabase/migrations/20261030000026_employee_pin_reset_and_policy.sql`, `src/utils/pinValidator.ts`, `src/pages/admin/StoreEmployeeEditPage.tsx`, `src/components/auth/EmployeePinResetModal.tsx`, `src/layouts/AppLayout.tsx`, `src/pages/TeamPage.tsx`, `src/services/userService.ts`, `src/types/user.types.ts`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/contracts.md`, `docs/pt-BR/changelog.md`):
  - **Resolução Automática da Loja na Rota `/team/:employeeId` (`userService.findStoreMemberByIdOrUserId`, `StoreEmployeeEditPage.tsx`)**: ao acessar diretamente URLs como `/team/8b588277-ea58-4f53-891c-a86f172d890a` (mesmo quando a visão ativa no seletor é `Visão Global` ou outra loja), a página localiza automaticamente o vínculo e a loja correspondente do funcionário.
  - **Configuração de Reset de PIN no Próximo Login (`requirePinReset`)**: adicionado controle de exigência de reset de PIN no próximo login na tela do funcionário (`StoreEmployeeEditPage.tsx`), botão rápido **"Gerar PIN Temporário + Exigir Reset no Login"**, atalho no menu `Ações Rápidas` de `/team` (`TeamPage.tsx`) e modal obrigatório `EmployeePinResetModal.tsx` em `AppLayout.tsx` que intercepta o próximo login do funcionário para cadastrar o novo PIN.
  - **Pré-requisitos Configuráveis e Validador em Tempo Real para o PIN (`pinRequirements`, `pinValidator.ts`)**: painel completo para configurar comprimento mínimo/máximo, exigência de **números (`0-9`)**, **letras maiúsculas (`A-Z`)**, **letras minúsculas (`a-z`)**, **símbolos especiais (`@#$%&*!?`)** e **bloqueio de sequências ou repetições (`1234`, `0000`, `AAAA`)**, com presets em 1 clique (*Forte*, *Máxima Segurança*, *Numérico Rápido*) e checklist interativo em tempo real.

- **Lista de Lojas Administradas em Menu Dropdown em `/global-admin?tab=users`** (`src/pages/GlobalAdminDashboardPage.tsx`, `src/components/ui/dropdown-menu.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/changelog.md`):
  - **Coluna `Lojas Administradas` como `DropdownMenu` (`GlobalAdminDashboardPage.tsx`)**: substituída a lista inline de badges por um menu dropdown compacto (`showChevron` e `triggerIcon` de loja), mantendo a altura das linhas uniforme mesmo quando o titular administra múltiplas unidades e permitindo abrir diretamente a edição de cada loja (`Matriz` ou `Filial`, com indicador de cota de funcionários) ou gerenciar os vínculos do usuário (`/global-admin/users/:userId/edit`).

- **Padronização de Todas as Telas com Tabelas no Padrão Visual e Viewport-Fitted de `/expiration` (`ExpirationPage.tsx`)** (`src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/admin/GlobalAdminFinancePaymentsPage.tsx`, `src/pages/InventoryPage.tsx`, `src/pages/TeamPage.tsx`, `src/pages/CustomersPage.tsx`, `src/pages/ReportsPage.tsx`, `src/pages/ProductsPage.tsx`, `src/pages/CategoriesPage.tsx`, `src/pages/SuppliersPage.tsx`, `src/pages/PurchasingPage.tsx`, `src/pages/OrdersPage.tsx`, `src/pages/StoresPage.tsx`, `src/pages/AuditLogsPage.tsx`, `src/pages/NotificationsPage.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/changelog.md`):
  - **Correção de Altura da Tabela (`h-full flex-1 min-h-0 flex flex-col`)**: todas as páginas com tabelas passaram a usar `h-full flex-1 min-h-0 flex flex-col` no container raiz e `flex-1 min-h-0 flex flex-col overflow-hidden` no `<Card>` e `<CardContent>`, garantindo que a tabela ocupe toda a área útil da tela (inclusive em `/global-admin?tab=users`, `/global-admin?tab=stores`, `/global-admin?tab=finance` e `/global-admin/finance/payments`, onde antes a tabela terminava na metade da tela quando havia poucos registros).
  - **Barra de Paginação (`<Pagination>`) Sempre Visível no Rodapé do Card (`flex-shrink-0`)**: a rolagem dos registros ocorre dentro do wrapper interno da tabela (`flex-1 min-h-0 overflow-auto custom-scrollbar`) com `thead sticky top-0`, mantendo a barra de paginação sempre ancorada na parte inferior visível do card sem ficar escondida abaixo do scroll da página.
  - **Pílulas de KPI Compactas de 1 Linha (Estilo `/expiration`)**: convertidos os cards altos de resumo em pílulas horizontais compactas (`px-3 py-1.5 rounded-lg border bg-card flex items-center justify-between`) em `/global-admin` (`stores`, `users`, `finance`), `/global-admin/finance/payments`, `/inventory`, `/team`, `/customers` e `/reports`, maximizando a área vertical dedicada às tabelas.

- **Ajuste de Posicionamento e Largura dos Menus de Ações Rápidas (`DropdownMenu`) em Todas as Páginas** (`src/components/ui/dropdown-menu.tsx`, `src/pages/CustomersPage.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/changelog.md`):
  - **Medição Real do DOM no Portal (`dropdown-menu.tsx`)**: substituída a largura fixa estimada (`200px`) pela medição real de largura e altura do menu renderizado (`menuRef.current.getBoundingClientRect()`) sincronizada via `React.useLayoutEffect` e `ResizeObserver`, utilizando `document.documentElement.clientWidth` / `clientHeight` e margem segura de `12px` para manter o menu estritamente dentro da tela na horizontal e vertical (com flip automático para cima quando próximo ao rodapé e reposicionamento contínuo em scroll/resize).
  - **Exibição Completa dos Nomes das Opções sem Corte (`dropdown-menu.tsx`)**: removido `truncate` dos itens de menu e aplicado `width: 'max-content'`, `maxWidth: 'calc(100vw - 24px)'` e `whitespace-normal sm:whitespace-nowrap break-words leading-snug`, evitando que opções longas saiam pela lateral da tela ou tenham seus nomes cortados em qualquer página (`/global-admin`, `/global-admin/stores/:storeId/edit`, `/global-admin/finance/payments`, `/global-admin/finance/rules`, `/global-admin/users/:userId/billing`, `/stores`, `/team`, `/expiration`, `/dashboard` e painéis administrativos).
  - **Popover de Múltipla Seleção de Status em `/customers` (`CustomersPage.tsx`)**: ajustado o alinhamento responsivo (`left-0 sm:left-auto sm:right-0 max-w-[calc(100vw-2rem)]`) para impedir corte lateral em telas menores.

- **Remoção do Item Duplicado "Painel Admin Global", Remoção do Menu de Abas em `/global-admin` e Correção de Scroll Vertical em Todas as Páginas** (`src/layouts/AppLayout.tsx`, `src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/ReportsPage.tsx`, `src/pages/ApiIntegrationsPage.tsx`, `src/pages/SalesPage.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/changelog.md`):
  - **Remoção de "Painel Admin Global" no Menu Lateral (`AppLayout.tsx`)**: como `/global-admin` e `/global-admin?tab=stores` abrem a mesma visão (`defaultFilters: { tab: 'stores' }`), o link duplicado `Painel Admin Global` foi removido da seção `Admin Global`, mantendo `Lojas & Filiais (Matriz)` (`/global-admin?tab=stores`), que permanece destacado tanto em `/global-admin` quanto em `/global-admin?tab=stores` e `/global-admin/stores/:storeId/edit`.
  - **Remoção do Menu Horizontal de Abas em `/global-admin` (`GlobalAdminDashboardPage.tsx`)**: a barra horizontal de abas dentro da página `/global-admin` foi removida (já que todas as seções do Admin Global constam diretamente no menu lateral), substituída por um cabeçalho contextual da seção ativa mantendo os filtros e o menu `Ações Rápidas`.
  - **Correção de Scroll Vertical em Todas as Páginas (`AppLayout.tsx` e páginas)**: removidas as classes `lg:overflow-hidden` e `flex flex-col` do `<main>` em `AppLayout.tsx` (agora `flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar`), bem como travas de `overflow-hidden` / `h-full` nos containers de páginas (`GlobalAdminDashboardPage`, `DashboardPage`, `ReportsPage`, `ApiIntegrationsPage`, `SalesPage`), permitindo rolagem vertical fluida em todas as telas no desktop e mobile.

- **Atualização do Menu Lateral (`AppLayout.tsx`) com Agrupamento da Seção "Admin Global" e Inclusão das Novas Páginas** (`src/layouts/AppLayout.tsx`, `src/hooks/usePermissions.ts`, `src/constants/screenDependencies.ts`, `src/i18n/locales/pt-BR.ts`, `src/i18n/locales/en-US.ts`, `src/i18n/locales/es-ES.ts`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/changelog.md`):
  - **Seção `Admin Global` (`id: 'global-admin'`)**: agrupamento dedicado no menu lateral para `GLOBAL_ADMIN` reunindo o Painel Admin Global (`/global-admin`), Lojas & Filiais Matriz (`/global-admin?tab=stores`), Nova Loja / Filial (`/global-admin/stores/new`), Usuários Store Admin (`/global-admin?tab=users`), Novo Admin de Loja (`/global-admin/users/new`), Financeiro Visão Geral (`/global-admin?tab=finance`), Regras & Licenças — 10 Grátis (`/global-admin/finance/rules`), Planos & Telas SaaS (`/global-admin/finance/plans`), Pagamentos & Faturas (`/global-admin/finance/payments`), Backups Multi-Loja (`/global-admin?tab=backups`), DB Explorer (`/global-admin?tab=db-explorer`), Chaves API & HBAC (`/global-admin?tab=api-hbac`) e Exclusão Definitiva (`/global-admin?tab=delete`).
  - **Seção `Gestão` (`id: 'management'`)**: adicionados os links diretos para **Lojas & Filiais** (`/stores`) e **Novo Funcionário** (`/team/new`) junto a Pedidos (`/orders`), Relatórios (`/reports`) e Equipe & Papéis (`/team`).
  - **Destaque de Rota Ativa (`isNavItemActive`) e Controle de Acesso (`hasRouteAccess`)**: suporte a query strings (`?tab=...`) e sub-rotas dedicadas de edição (`/global-admin/stores/:storeId/edit`, `/global-admin/users/:userId/*`, `/team/:employeeId`).

- **Atualização da Landing Page (`/`, `/features`, `/pricing`), `README.md` e Sincronização Completa da Documentação Técnica (`docs/pt-BR/*`)** (`src/pages/LandingPage.tsx`, `src/pages/FeaturesPage.tsx`, `src/pages/PricingPage.tsx`, `README.md`, `docs/pt-BR/README.md`, `docs/pt-BR/ai-context.md`, `docs/pt-BR/overview.md`, `docs/pt-BR/architecture.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/contracts.md`, `docs/pt-BR/security.md`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/knowledge-gaps.md`, `docs/pt-BR/changelog.md`):
  - **Landing Page (`/`) e Páginas Institucionais (`/features`, `/pricing`)**:
    - Vitrine completa dos **12 módulos da plataforma**: Dashboard Executivo Multi-Loja & BI, Controle de Estoque & Aprovador de Baixa (`STOCK_APPROVER`), Lotes & Validades FEFO, Hierarquia Matriz → Filiais & Remessa Sem Venda (`execute_stock_transfer_to_branch`), PDV Frente de Caixa com Pesagem `KG`/`g` & Edição de Pedidos, CRM de Clientes com Deep-Link na URL (`/customers?customerId=...&orderId=...`) + Multi-Status + Visões Salvas no Banco por Loja/Filial (`store_saved_views`), 9 Relatórios Analíticos com Filtros de Datas/Períodos e Data/Hora exatas + `Exportar Visíveis`, Compras & Markup, Catálogo Digital WhatsApp, Gestão de Equipe com Franquia de **10 Funcionários Grátis por Loja** & 47 Permissões Granulares, Planos Comerciais SaaS com Grafo de Dependências de Telas & Hub Financeiro, e Integrador de APIs Estilo Postman (`/integrations`) + Tokens HBAC.
    - Alinhamento da página `/pricing` com os pacotes comerciais SaaS e a regra de licenciamento de 10 funcionários grátis por loja.
  - **Documentação & `README.md`**:
    - Atualização do `README.md` raiz e de toda a árvore `docs/pt-BR/` refletindo as 25 migrations SQL, 15 RPCs invocadas pelo frontend, 34 páginas e controles de segurança em produção.

- **Relatórios com Filtro de Datas/Períodos, Registro de Compras/Vendas com Data e Hora, Pedidos por Cliente com Deep-Link na URL (`/customers?customerId=...&orderId=...`), Seleção Múltipla de Status, Visões Salvas no Banco por Loja/Filial e Exportação Detalhada Somente dos Visíveis** (`supabase/migrations/20261030000025_store_saved_views.sql`, `src/services/savedViewService.ts`, `src/pages/CustomersPage.tsx`, `src/services/customerService.ts`, `src/types/customer.types.ts`, `src/pages/ReportsPage.tsx`, `src/services/reportService.ts`, `src/types/report.types.ts`):
  - **Filtros de Período e Datas Personalizadas em `/reports` (`ReportsPage.tsx`, `reportService.ts`)**:
    - Adicionados filtros rápidos de período (`Todo o Histórico`, `Hoje`, `Esta Semana`, `Este Mês`, `Mês Passado`, `Últimos 90 Dias`, `Este Ano` e `Data Personalizada De / Até`) sincronizados com a URL (`?period=...&from=...&to=...`).
    - Na aba **Ticket Médio & Clientes (`customers`)**, lista todos os pedidos realizados por cada cliente com data e hora exatas (`DD/MM/YYYY HH:mm`), contadores de pedidos abertos/fechados/cancelados, sub-tabela expansível com o histórico individual de pedidos do cliente e links clicáveis diretos para `/customers?customerId=:id&orderId=:orderId`.
    - Na aba **Compras & Fornecedores (`purchasing`)**, exibe o registro de compras com **data e hora exatas** de emissão e recebimento (`formatDateTime`) e o detalhamento dos itens comprados (`itemsSummary`).
    - Na aba **Vendas & Desempenho (`sales`)**, exibe o registro de vendas com **data e hora exatas**, itens detalhados do pedido, meio de pagamento e link direto para o pedido na tela do cliente (`/customers?customerId=:id&orderId=:orderId`).
  - **Histórico de Pedidos por Cliente e Filtro por URL em `/customers` (`CustomersPage.tsx`, `customerService.ts`)**:
    - Cada cliente exibe todos os seus pedidos na coluna **Pedidos Realizados** (chips clicáveis com número do pedido, valor, data/hora e status) e em uma sub-tabela expansível com detalhamento de data e hora, canal, itens comprados, pagamento e status.
    - Suporte completo a filtro via URL (`/customers?customerId=...&orderId=...`): ao acessar ou clicar no link de um pedido, a tela filtra os registros na URL e abre/destaca automaticamente o modal de detalhes completos do pedido daquela pessoa, com botão para copiar o link direto.
  - **Seleção Múltipla de Status e Visões Salvas no Banco por Loja/Filial (`store_saved_views`, `savedViewService.ts`, `CustomersPage.tsx`)**:
    - O seletor de status em `/customers` suporta **múltipla seleção** simultânea tanto de status dos pedidos (`PENDING`, `CONFIRMED`, `PROCESSING`, `READY`, `SHIPPED`, `DELIVERED`, `CANCELLED`, com atalhos rápidos para *Pedidos Abertos*, *Pedidos Fechados* e *Cancelados*) quanto de status do cliente (`ACTIVE`, `INACTIVE`), além de filtro de período/datas.
    - Criada a tabela `public.store_saved_views` (com RLS por `has_store_access(store_id)` e fallback em `stores.theme_config.saved_views`) para salvar visões de filtros **individualmente por loja ou filial (`store_id`)**, incluindo visões padrão (*Pedidos em Aberto*, *Pedidos Fechados (Entregues)*, *Pedidos Cancelados*, *Todos os Clientes Ativos*) e criação/atualização/exclusão de visões personalizadas pela equipe da unidade.
  - **Exportação Somente do que Está Visível com Detalhamento Completo dos Pedidos (`CustomersPage.tsx`, `ReportsPage.tsx`)**:
    - O botão `Exportar Visíveis` em `/customers` e `/reports` exporta **exclusivamente os registros visíveis na tela no momento da exportação** (respeitando busca, filtros de status/período, visão ativa e página visível), incluindo todas as colunas detalhadas dos pedidos (número, data e hora exatas, status, canal, forma de pagamento, subtotal, desconto, frete, total e discriminação dos itens com SKU, quantidade e preços).

- **Correção da Abertura e Renderização das Abas de Relatórios em `/reports`** (`src/pages/ReportsPage.tsx`, `src/services/reportService.ts`, `src/hooks/useTablePagination.ts`):
  - **Causa Raiz 1 — Enum Inválido `'OUT'` em `stock_movement_type_enum` (`reportService.ts`)**:
    - As consultas `getRetailSummaryKPIs`, `getLossesReport` (aba *Perdas & Baixas*) e `getConsumptionDemandReport` (aba *Giro & Compra por Consumo*) filtravam `stock_movements` com `movement_type = 'OUT'`, valor inexistente no enum PostgreSQL `stock_movement_type_enum` (`'ENTRY'`, `'EXIT'`, `'SALE'`, `'RETURN'`, `'ADJUSTMENT'`, `'LOSS'`, `'DAMAGE'`, `'EXPIRATION'`, `'TRANSFER'`, `'INVENTORY_COUNT'`), gerando erro HTTP 400 do PostgREST e impedindo a abertura do relatório. Substituído pelos valores válidos do enum (`LOSS`, `DAMAGE`, `EXPIRATION`, `EXIT`, `SALE`) com fallback para `order_items` nos últimos 30 dias.
  - **Causa Raiz 2 — Suporte à Visão Consolidada (`storeId === 'all'`) e Seletor de Loja (`ReportsPage.tsx`, `reportService.ts`)**:
    - Quando o `GLOBAL_ADMIN` operava em `Visão Global (Todas as Lojas)` (`storeId === 'all'`), `hasActiveStore` avaliava `false` e bloqueava a execução de todas as 9 queries (`enabled: false`). Agora todos os 9 métodos de relatório suportam consulta consolidada multi-loja (`storeId === 'all'`) ou filtrada por loja específica, com seletor de unidade diretamente no cabeçalho de `/reports`.
  - **Causa Raiz 3 — Troca Atômica de Abas e Prevenção de Colapso de Altura (`useTablePagination.ts`, `ReportsPage.tsx`)**:
    - Adicionado `setFilters` em lote em `useTablePagination.ts` e estado local sincronizado `activeTab` em `ReportsPage.tsx`, garantindo troca instantânea de aba em uma única atualização de URL (`?tab=...`) e `min-h-[480px]` no card principal para que a tabela do relatório nunca colapse em telas menores.

- **Dashboard Executivo Completo (`/dashboard`) com Gráficos por Loja, Top Produtos Mais Vendidos, Vendas Mensais (12 Meses), Filtros de Período/Tempo e Exportação de Dados (CSV, JSON e PDF)** (`src/pages/DashboardPage.tsx`, `src/services/reportService.ts`, `src/types/report.types.ts`):
  - **Barra de Filtros Dinâmica com Sincronização na URL (`?period=30d&from=...&to=...&store=ALL&channel=ALL&granularity=day`)**:
    - Presets rápidos de período (`Hoje`, `7 Dias`, `30 Dias`, `90 Dias`, `Este Mês`, `Mês Passado`, `Este Ano`, `Tudo`), seletores customizados `De / Até`, seletor de unidade (`Todas as Lojas Consolidado` ou `Matriz` / `Filial` específica), filtro por canal (`PDV`, `WhatsApp`, `Online`) e granularidade do gráfico (`Diário`, `Semanal`, `Mensal`).
  - **8 KPIs Executivos com Comparativo vs. Período Anterior (`%`)**:
    - Receita Bruta, Lucro Bruto & Margem Média (`%`), Pedidos Concluídos, Ticket Médio, Unidades Vendidas, Patrimônio em Estoque (custo e venda estimada), Alertas de Ruptura e Lotes Críticos (`<= 30d`).
  - **Gráficos de Vendas Mensais e Evolução Temporal Interativos**:
    - Alternância em 1 clique entre **Vendas Mensais (Últimos 12 Meses)** e **Evolução no Período Selecionado**, exibindo barras duplas de Receita e Lucro Estimado, linha de tendência, tooltips detalhados e indicadores de Pico e Média.
  - **Gráfico Comparativo por Loja (`Matriz vs. Filiais`)**:
    - Comparativo visual de faturamento, lucro bruto, margem, pedidos, itens vendidos, valor em estoque e participação (`% Share`) de cada unidade, permitindo clicar em qualquer loja para filtrar todo o Dashboard instantaneamente.
  - **Ranking de Produtos Mais Vendidos (`Top Produtos`)**:
    - Lista visual com miniatura do produto, SKU, categoria, unidades vendidas, faturamento, lucro bruto, margem (`%`), participação nas vendas e alerta de estoque atual, ordenável por **Faturamento (`R$`)**, **Quantidade (`un.`)** ou **Lucro Bruto (`R$`)**.
  - **Gráficos de Acompanhamento Operacional**:
    - Gráfico Donut SVG de **Vendas por Categoria**, distribuição por **Canal de Venda** (`PDV`, `WhatsApp`, `Catálogo Online`), **Meios de Pagamento** (`PIX`, `Cartão`, `Dinheiro`) e **Ritmo por Dia da Semana** (`Dom` a `Sáb`).
  - **Exportação Completa do Período Selecionado (`DropdownMenu`)**:
    - Download imediato em **CSV (Excel)** de Pedidos do Período, Produtos Mais Vendidos, Desempenho por Loja e Vendas Mensais (12m), além de **JSON Completo** e **Relatório Executivo para Impressão / PDF**.

- **Hierarquia Matriz → Filiais, Dropdown Único de Ações Rápidas, Licenciamento de 10 Funcionários Grátis por Loja, Área Financeiro no Global Admin e Separação de Modais em Páginas Dedicadas com URLs Próprias** (`supabase/migrations/20261030000024_global_finance_licensing_rules.sql`, `AppRoutes.tsx`, `GlobalAdminDashboardPage.tsx`, `StoresPage.tsx`, `TeamPage.tsx`, `dropdown-menu.tsx`, `GlobalAdminStoreEditPage.tsx`, `StoreEmployeeEditPage.tsx`, `GlobalAdminUserEditPage.tsx`, `GlobalAdminUserPermissionsPage.tsx`, `GlobalAdminUserBillingPage.tsx`, `GlobalAdminFinanceRulesPage.tsx`, `GlobalAdminFinancePlansPage.tsx`, `GlobalAdminFinancePaymentsPage.tsx`):
  - **Exibição Hierárquica Matriz → Filiais (`/global-admin?tab=stores` e `/stores`)**:
    - As lojas filiais (`is_branch = true` ou `parent_store_id != null`) são agrupadas e renderizadas imediatamente abaixo de sua respectiva Matriz como linhas filhas indentadas (`└─ Filial`), exibindo o código da filial, vínculo com a matriz, administradores (`STORE_ADMIN`) e consumo de licenças de equipe.
    - O Global Admin pode editar a filiação de qualquer loja (converter entre Matriz Independente e Filial vinculada a outra Matriz) e gerenciar os usuários `STORE_ADMIN` na página dedicada `/global-admin/stores/:storeId/edit`.
  - **Consolidação de Todas as Ações Rápidas em Botão Dropdown Único (`dropdown-menu.tsx`)**:
    - Todas as abas de `/global-admin` (`Lojas & Filiais`, `Usuários Admin`, `Financeiro`, `Backups`, `DB Explorer`, `API & HBAC`, `Exclusão Definitiva`), além de `/stores` e `/team`, utilizam um único botão `Ações Rápidas` com menu dropdown flutuante renderizado via Portal.
  - **Exclusão de Funcionários Operacionais de `/global-admin?tab=users`**:
    - Funcionários operacionais da loja (`SELLER`, `INVENTORY`, `STOCK_APPROVER`, `FINANCE`, `VIEWER`) não pagam plano individual e são gerenciados dentro da loja (`/team` ou `/global-admin/stores/:storeId/edit`); a aba `/global-admin?tab=users` lista exclusivamente titulares `STORE_ADMIN` e `GLOBAL_ADMIN`.
  - **Regras de Licenciamento de Equipe (10 Funcionários Grátis + Cobrança por Licença Adicional) na Aba "Financeiro" (`/global-admin?tab=finance` e `/global-admin/finance/rules`)**:
    - Criada a tabela `public.global_billing_rules` e colunas de override por loja (`free_employees_limit`, `extra_employee_price` em `public.stores`).
    - Cada loja possui por padrão **10 funcionários ativos grátis**; acima da franquia, cada licença adicional soma automaticamente o valor unitário configurável à mensalidade do `STORE_ADMIN`, com simulador e exceções por loja editáveis em `/global-admin/finance/rules`.
  - **Separação de Modais em Páginas Completas com URLs Próprias**:
    - Substituídos os modais sobrecarregados por 8 páginas completas com rotas próprias identificando loja, funcionário e usuário na URL: `/global-admin/stores/:storeId/edit`, `/global-admin/stores/:storeId/employees/:employeeId`, `/team/stores/:storeId/employees/:employeeId`, `/global-admin/users/:userId/edit`, `/global-admin/users/:userId/permissions`, `/global-admin/users/:userId/billing`, `/global-admin/finance/rules`, `/global-admin/finance/plans` e `/global-admin/finance/payments`.

- **Correção da Troca de Abas e Contadores em Tempo Real em `/inventory` (`Saldos`, `Movimentos`, `Aprovações de Baixa`, `Remessas p/ Filiais`)** (`useTablePagination.ts`, `InventoryPage.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`):
  - **Causa Raiz (`useTablePagination.ts` + React Router v7)**:
    - Em `react-router-dom` v7, múltiplas chamadas a `setSearchParams` no mesmo ciclo de evento leem `location.search` da closure da renderização atual (não enfileirando mutações de forma síncrona). Em `InventoryPage.tsx`, os botões das abas (`Saldos`, `Movimentos`, `Aprovações de Baixa`, `Remessas p/ Filiais`) invocavam `setFilter('tab', '...')` seguido de `setPage(1)` no mesmo `onClick`; a segunda chamada (`setPage(1)`) lia `searchParams` obsoleto (sem `tab`) e sobrescrevia a URL de volta para `?`, cancelando a navegação de aba.
    - Adicionado `latestParamsRef` síncrono em `useTablePagination.ts` para compor múltiplas atualizações de query string no mesmo evento sem perda de parâmetros, além de remover chamadas redundantes a `setPage(1)` (pois `setFilter` já reseta `page`).
  - **Contadores e Invalidação de Queries (`InventoryPage.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`)**:
    - As queries de `balancesData`, `movementsData` e `lossReasons` passaram a carregar sempre que há loja ativa (`enabled: Boolean(hasActiveStore)`), exibindo os contadores reais nas abas desde o primeiro carregamento e invalidando `stock-writeoff-requests` imediatamente após solicitações ou baixas de estoque.

- **Cadastro de Funcionários, Papéis Granulares, Aprovador de Baixa de Estoque (`STOCK_APPROVER`) e Remessa de Estoque para Filiais Sem Venda** (`supabase/migrations/20261030000023_staff_roles_approvers_and_branches.sql`, `TeamPage.tsx`, `GlobalAdminDashboardPage.tsx`, `StoresPage.tsx`, `InventoryPage.tsx`, `EmployeeRolePermissionsModal.tsx`, `StoreCustomRolesModal.tsx`, `StockBranchTransferModal.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`):
  - **Gestão Completa de Funcionários e Papéis Customizados (`/team` e `/global-admin?tab=users`)**:
    - `STORE_ADMIN` e `GLOBAL_ADMIN` podem cadastrar/editar funcionários via RPC `public.upsert_store_employee`, definindo matrícula (`employee_code`), cargo (`job_title`), papel base (`STORE_ADMIN`, `STOCK_APPROVER`, `MANAGER`, `SELLER`, `CASHIER`, `INVENTORY`, `FINANCE`, `VIEWER`), papel customizado da loja (`public.store_custom_roles`) e matriz de permissões granulares individuais (`granted_permissions` e `revoked_permissions`) para todos os recursos do sistema.
  - **Fluxo Exclusivo de Aprovador de Baixa de Estoque (`STOCK_APPROVER` / `inventory.approve_writeoff`)**:
    - Função `public.can_user_approve_writeoff(p_store_id, p_user_id, p_estimated_value)` valida se o usuário possui alçada explícita de aprovação de baixa e se o valor financeiro está dentro do limite `max_writeoff_value`.
    - `public.apply_stock_movement` endurecida para bloquear qualquer baixa direta (`LOSS` / `ADJUSTMENT`) cujo operador ou aprovador (`approved_by`) não possua alçada válida.
    - Fila de solicitações de baixa (`public.stock_writeoff_requests`) e RPC `public.review_stock_writeoff_request`: operadores sem alçada enviam solicitações pendentes (`PENDING`), e somente aprovadores autorizados podem aprovar (efetuando a baixa atômica do lote) ou rejeitar com justificativa auditada.
  - **Cadastro de Filiais e Transferência de Estoque Sem Venda (`/stores` e `/inventory`)**:
    - Suporte a vínculo de unidades como Filial (`is_branch = true`, `parent_store_id`, `branch_code`, `manager_name`) em `public.stores`.
    - Tabelas `public.stock_transfers` e `public.stock_transfer_items` + RPC atômica `public.execute_stock_transfer_to_branch`: transfere lotes da Matriz para a Filial (`TRANSFER_OUT` -> `TRANSFER_IN`) sem necessidade de venda, sincronizando categoria, produto mestre e lote com validade na filial para venda imediata no PDV da filial.

- **Planos Comerciais SaaS, Grupos de Permissões em Tela com Grafo de Dependências e Controle Financeiro de Assinaturas** (`supabase/migrations/20261029000022_saas_permission_groups_and_billing.sql`, `GlobalSaasBillingPanel.tsx`, `SubscriptionGuardModal.tsx`, `featureDependencies.ts`, `saasBillingService.ts`, `usePermissions.ts`, `ProtectedRoute.tsx`, `AppLayout.tsx`):
  - **Motor de Dependências entre Telas (`featureDependencies.ts`)**:
    - Ao desmarcar um módulo para um usuário ou plano (mesmo que seja `STORE_ADMIN`), o sistema exibe alertas em tempo real sobre impactos funcionais em outros módulos (ex.: desativar `sales_pos` impacta `orders_management`; desativar `inventory_control` impacta `batches_expiration` e `purchases_suppliers`).
  - **Grupos de Perfil com Precificação Comercial e Cobrança (`saas_permission_groups`, `user_subscriptions`, `subscription_payments`)**:
    - Criação e edição de pacotes comerciais com valores mensais/anuais (ex.: *Catálogo WhatsApp*, *Controle de Estoque + Validades*, *PDV & Frente de Caixa*, *ERP Enterprise Completo*), atribuição direta a usuários com módulos customizados, bloqueio por inadimplência e histórico auditado de pagamentos.

- **Integrador de APIs Estilo Postman & Vinculação com Serviços Internos (`/integrations`)** (`supabase/migrations/20261028000021_api_integrator_studio.sql`, `ApiIntegratorPage.tsx`, `apiIntegratorService.ts`, `CustomersPage.tsx`, `CategoriesPage.tsx`, `ProductsPage.tsx`, `SuppliersPage.tsx`):
  - **Request Builder Completo**: Configuração de método HTTP, URL, autenticação (`Bearer`, `Basic`, `API Key`, `Custom Header`), query params, headers, body JSON/Form, variáveis de ambiente encriptadas e JSONPath Data Explorer.
  - **Service Binding Engine**: Mapeamento visual ` Drag/Select` de campos JSON externos para os serviços internos de **Clientes**, **Grupos/Categorias**, **Produtos**, **Fornecedores** e **Estoque**, com botão de sincronização direta nas telas operacionais e logs de execução (`api_sync_logs`).

## 2026-10-19

- **Associação Obrigatória de Cliente com Fallback Automático para "Cliente Genérico" no PDV (`/sales`)** (`customerService.ts`, `orderService.ts`, `CustomerCombobox.tsx`, `SalesPage.tsx`):
  - **Resolução e Criação Automática (`customerService.getOrCreateGenericCustomer`)**:
    - Todo pedido criado no PDV exige vínculo com um registro válido de cliente (`customer_id`).
    - Caso o operador não informe nenhum cliente no seletor do PDV, `orderService.createOrder` localiza automaticamente o cadastro `"Cliente Genérico"` (ou `"Consumidor Final"`) da loja ativa — reativando-o caso esteja inativo — ou cria o registro `"Cliente Genérico"` automaticamente antes de invocar a RPC `create_order_with_stock`.
  - **Atualização Visual no Checkout e Combobox (`CustomerCombobox.tsx`, `SalesPage.tsx`)**:
    - Indicadores visuais no seletor e rodapé de checkout informando que o cliente é obrigatório e que `"Cliente Genérico"` é associado por padrão quando nenhum cliente específico é selecionado.

- **Correção do Salvamento na Edição de Vendas (`/orders` → `/sales?editOrder=:id`)** (`orderService.ts`, `SalesPage.tsx`, migration `20261019000019_allow_delete_cancelled_orders_on_edit.sql`):
  - **Causa Raiz 1 — Bloqueio Silencioso de RLS `DELETE` e Violação de Constraint `uq_order_store_number` (`23505`)**:
    - A tabela `public.orders` não possuía política RLS para `DELETE`, fazendo com que `supabase.from('orders').delete().eq('id', replaceOrderId)` afetasse `0` linhas silenciosamente e a chamada subsequente a `create_order_with_stock` falhasse com erro de chave duplicada (`uq_order_store_number`) ao reutilizar o mesmo `order_number`.
    - Criada a migration `20261019000019_allow_delete_cancelled_orders_on_edit.sql` adicionando a política `"Orders delete cancelled: tenant staff"` para permitir exclusão de pedidos já cancelados (`status = 'CANCELLED'`) pela equipe da loja (`STORE_ADMIN`, `SELLER`, `FINANCE`) ou `is_global_admin()`.
    - Adicionada proteção multicamada em `orderService.createOrder`: localiza todos os registros conflitantes da loja por `id = replaceOrderId` ou `order_number`, garante o cancelamento prévio e restauração de estoque (ignorando caso já esteja cancelado), tenta exclusão direta e, se o registro permanecer no banco, renomeia seu `order_number` com sufixo `-SUB-` (ocultado em `orderService.listOrders` e `globalAdminService.listEntities`).
    - Adicionada validação preventiva (*pre-flight check*) de unicidade de `(store_id, order_number)` antes de chamar `create_order_with_stock` e ampliação do *retry* automático contra `23505` / `uq_order_store_number`, eliminando em definitivo a mensagem `"Registro duplicado. Já existe um item com este identificador único nesta loja."` ao salvar uma venda editada.
  - **Causa Raiz 2 — Falso Positivo de `"Estoque insuficiente"` ao Carregar Pedido para Edição (`SalesPage.tsx`)**:
    - Os itens vindos do relacionamento `orders -> order_items -> products(*)` não contêm a coluna calculada `stock_quantity` (que vem de `stock_balances`), fazendo com que `stockByProduct` avaliasse `0` se `storeId` ainda não estivesse disponível no primeiro ciclo ou se o cache de `products-pos` estivesse obsoleto (`keepPreviousData`).
    - O carregamento de `editOrder` agora aguarda `storeId` estar definido, inicializa `stock_quantity` de cada item do carrinho de edição com `Math.max(Number(prod?.stock_quantity ?? 0), itemQty)` e consolida `stockByProduct` preservando o maior saldo entre a listagem e o carrinho reaberto.

## 2026-10-15

- **Revisão e Correção Abrangente de Filtros e Buscas na Plataforma** (`useTablePagination.ts`, `globalAdminService.ts`, `productService.ts`, `customerService.ts`, `supplierService.ts`, `purchasingService.ts`, `auditService.ts`, `CategoriesPage.tsx`, `TeamPage.tsx`, `StoresPage.tsx`, `GlobalAdminDashboardPage.tsx`, `GlobalDeletePanel.tsx`):
  - **Correção de Digitação e Reset de Filtro em `useTablePagination.ts`**:
    - Removido `.trim()` em tempo real no `setSearch`, permitindo digitar espaços entre palavras sem que sejam apagados a cada renderização.
    - Normalizada a limpeza de chaves de filtro em `setFilter`: valores `'ALL'`, `'all'`, `'TODOS'`, `'todos'` ou strings vazias removem o parâmetro da URL de forma uniforme, sem deixar parâmetros obsoletos residuais.
  - **Correção da Tabela `suppliers` no Painel de Exclusão Global (`/global-admin?tab=delete`)**:
    - Corrigida referência indevida a `name` na tabela `suppliers` (que possui `corporate_name` e `trade_name`), evitando o erro SQL `42703 (column suppliers.name does not exist)` que quebrava o carregamento da entidade de fornecedores.
    - Adicionado suporte a busca tolerante a acentos via `buildAccentRegex` e `.imatch` em todas as entidades do painel de exclusão global.
    - Limpeza automática da busca ao alternar entre entidades e retorno suave de página caso o usuário exclua registros restantes da página atual.
    - Isolamento de filtros por aba no `GlobalAdminDashboardPage.tsx`: alternar entre abas limpa os parâmetros de filtro que pertenciam apenas à aba anterior (ex: `status=ACTIVE` de lojas não contamina `tab=delete` ou `tab=users`).
  - **Sanitização de Sintaxe PostgREST e Busca Tolerante a Acentos em Produtos (`/products`, `/sales`, `/store/:slug`)**:
    - Sanitização de caracteres delimitadores de árvore lógica do PostgREST (`%`, `,`, `(`, `)`) evitando erros `PGRST100 (syntax error)`.
    - Busca com `buildAccentRegex` e `.imatch` no catálogo de produtos, no PDV e no catálogo público de e-commerce.
  - **Sanitização e Acentuação em Clientes (`/customers`) e Fornecedores (`/suppliers`)**:
    - Busca tolerante a acentos e caracteres especiais em nomes corporativos, nomes fantasia, documentos, telefones e e-mails de clientes e fornecedores.
  - **Expansão de Busca em Ordens de Compra (`/purchasing`)**:
    - A busca agora pré-localiza fornecedores compatíveis (`corporate_name`, `trade_name`) e busca em conjunto por número do pedido e observações.
    - Aceita filtros de status ou fornecedor `'ALL'` ou `'all'` sem quebrar a listagem.
  - **Sanitização em Logs de Auditoria (`/audit`)**:
    - Sanitização de caracteres no campo de busca de logs de auditoria e normalização de filtro de ação `'ALL'`.
  - **Busca em Memória Resiliente a Acentos em Categorias, Equipe e Lojas**:
    - `CategoriesPage.tsx`, `TeamPage.tsx` e `StoresPage.tsx` atualizados para normalizar strings com decomposição NFD (`normalize('NFD')`), permitindo encontrar termos sem se preocupar com maiúsculas/minúsculas ou acentuação gráfica.

- **Correção de Erro HTTP 400 na Exclusão Definitiva de Pedidos (`/global-admin?tab=delete`)** (`GlobalDeletePanel.tsx`, migration `20261015000018_fix_restore_stock_after_delete_cancelled_orders.sql`):
  - **Bypass de Restauração de Estoque em Pedidos Cancelados**:
    - Pedidos com status `CANCELLED` já tiveram seu estoque estornado previamente no momento do cancelamento (`restore_sale_stock`).
    - A migration 15 havia regredido a função `restore_stock_after_delete` omitindo o bypass da migration 12, fazendo com que a exclusão de pedidos cancelados tentasse reverter novamente o saldo e disparasse erro `400 (P0001: o saldo do produto mudou depois deste registro)`.
    - Migration 18 restabelece a salvaguarda em `restore_stock_after_delete` e adiciona validação direta em `global_admin_delete` (`COALESCE(status, '') <> 'CANCELLED'`), garantindo exclusão limpa sem erros.
  - **Otimizações no Painel de Exclusão (`GlobalDeletePanel.tsx`)**:
    - Ajuste automático de paginação: quando o operador exclui o último item de uma página (ex.: página 3), o painel transiciona automaticamente para a página anterior válida (`page - 1`), impedindo visualização de páginas órfãs vazias.
    - Mensagem de erro inteligível no frontend caso o operador tente excluir um pedido não-cancelado cujos produtos já tenham sofrido movimentações subsequentes no estoque.

- **Correção de Erro HTTP 400 na Busca de Pedidos e Vendas (`/orders`)** (`orderService.ts`):
  - **Eliminação de Referência Inválida à Coluna Inexistente `customer_name` em `orders`**:
    - A tabela `orders` possui relação via `customer_id` e não possui a coluna `customer_name`. O filtro `.or('order_number.ilike...,customer_name.ilike...')` gerava erro `400 (Bad Request)` em qualquer busca textual.
  - **Busca Multidimensional e Tolerante a Acentos**:
    - A busca agora pré-resolve clientes compatíveis na tabela `customers` (por nome, documento ou telefone) e produtos compatíveis na tabela `products` (por nome ou SKU) através da função `buildAccentRegex`.
    - Localiza os pedidos tanto pelo número do pedido (`order_number`), observações (`notes`), cliente vinculado (`customer_id.in`) quanto pelos itens contidos no pedido (`order_items.product_id.in`), permitindo pesquisar por exemplo `"uva"`, `"PED-906"`, ou o nome de um cliente sem erros.

- **Correção de Erro HTTP 400 e Busca Tolerante a Acentos em Estoque e Movimentações (`/inventory`)** (`inventoryService.ts`, `productUtils.ts`):
  - **Eliminação de `.or()` com Colunas de Relações Embutidas**:
    - O PostgREST do Supabase não suporta filtros `.or()` de primeiro nível referenciando tabelas relacionadas (como `products.name` ou `products.sku` em consultas sobre `stock_balances`).
    - Em `inventoryService.getStockBalances`, a busca agora resolve previamente os IDs dos produtos correspondentes diretamente na tabela `products` e aplica `query.in('product_id', productIds)`. Se nenhum produto for encontrado, retorna `{ data: [], total: 0 }` imediatamente sem disparar erro 400.
    - Em `inventoryService.getStockMovements`, a busca também pré-resolve `product_id` e `batch_id` para utilizar filtros válidos na tabela raiz (`notes`, `reason_code`, `cost_center_code`, `product_id.in`, `batch_id.in`).
  - **Busca Tolerante a Acentuação (`buildAccentRegex`)**:
    - Implementada a função `buildAccentRegex` que mapeia vogais para conjuntos fonéticos (ex.: `vitoria` localiza `Uva Vitória` e vice-versa), utilizando PostgREST `imatch` (`~*` no PostgreSQL).
  - **Atualização de Timestamp de Saldo na Importação**:
    - Ao importar planilhas que atualizam preços ou saldos, `stock_balances.updated_at` é atualizado para o timestamp atual, garantindo que o produto apareça imediatamente na primeira página da listagem (ordenada por `updated_at desc`).

- **Correção e Suporte a Reimportação de Planilha Exportada de Estoque (`/inventory`)** (`StockImportModal.tsx`, `inventoryService.ts`, `importParser.ts`):
  - **Reconhecimento de Colunas Exportadas de Saldos**:
    - Adicionados aliases canônicos em `importParser.ts` para cabeçalhos gerados na exportação: `Saldo Físico`, `Disponível`, `Preço de Compra / Custo Unit. (R$)`, `Preço de Venda Unit. (R$)`, `Estoque Mínimo`, `Produto`, `Unidade`.
    - Normalização resiliente com `parseImportNumber`, suportando decimais com vírgula ou ponto, símbolos monetários (`R$`) e formatos numéricos diversos.
  - **Tratamento Inteligente de Importação de Saldos vs. Movimentações Avulsas**:
    - Quando o arquivo não possui coluna `movement_type` (como planilhas exportadas de saldos), o sistema classifica os registros como `isBalanceImport = true` e tipo base `ADJUSTMENT`.
    - Não exige campos obrigatórios de baixas avulsas (`reason_code`, `cost_center_code`, `approver_email`) para importações de saldos físicos.
    - Validação de quantidade ajustada para aceitar saldo zero (`quantity >= 0`), eliminando o erro falso de `quantidade inválida`.
    - Fallback de localização de produto por SKU, ID e Nome do Produto (`product_name`).
  - **Atualização Atômica de Preços, Estoque Mínimo e Verificação de Delta de Saldo**:
    - Em `inventoryService.importMovementsBulk`, sincroniza automaticamente `cost_price`, `selling_price` e `min_stock` na tabela `products` para refletir de imediato no PDV e catálogo.
    - Compara a quantidade informada com o saldo atual (`Math.abs(targetQty - currentQty) > 0.0001`): se o usuário alterou apenas o preço ou custo sem mexer na quantidade física, não chama o RPC de movimento com delta zero (evitando o erro `A quantidade informada nao altera o saldo atual`), atualizando os preços com sucesso total.
    - Suporta ajuste de saldo para zero com auditoria e sem disparar restrições de quantidade estrita.

- **Edição de Pedidos via Reabertura no PDV (`/orders` → `/sales`)** (`OrdersPage.tsx`, `SalesPage.tsx`, `orderService.ts`, `productService.ts`):
  - **Ação "Editar no PDV" na Área de Detalhes do Pedido**:
    - Adicionado botão de ação em destaque **"Editar Pedido no PDV"** no modal de detalhes do pedido (`/orders`).
    - Modal de confirmação inteligente detalhando o estorno atômico de estoque e envio dos itens e do cliente para a tela de Venda.
    - Se o pedido estiver ativo, estorna o estoque atômico de volta para a loja (`restore_sale_stock`) e redireciona para `/sales?editOrder=:id`.
  - **Sincronização com Preço Vigente do Estoque e Reutilização do Número do Pedido**:
    - **Sincronização Automática com Preço Vigente**: Ao carregar os itens do pedido em edição no PDV, o sistema atualiza automaticamente os preços unitários (`unitPrice`) com o valor atual de venda do produto no catálogo/estoque (`fresh.selling_price`), garantindo que alterações de preço feitas no estoque reflitam imediatamente no pedido revisado.
    - **Atualização In-Place sem Duplicata**: Na finalização da edição, o sistema reaproveita o número do pedido original (`orderNumber`) e substitui o registro anterior (`replaceOrderId`), eliminando duplicatas com status cancelado e garantindo histórico limpo.
    - **Navegação Direta e Feedback**: Redireciona de volta para `/orders` com notificação de sucesso e carrinho limpo ao finalizar ou descartar a edição.
  - **Experiência de Edição Completa no PDV (`/sales`)**:
    - Pré-carregamento imediato dos itens no carrinho (com suporte total a itens pesáveis `KG` ou unitários `UN`, preços vigentes e descontos).
    - Pré-seleção automática do cliente vinculado no combobox, com possibilidade de alterar para outro cliente ou cadastrar novo via modal rápido.
    - Exibição de banner de alerta contextual (*"Editando pedido PED-XXXXXX. Altere os itens e o cliente à vontade"*), com botão para descartar edição.
    - Inclusão dos produtos do pedido no mapa de saldos (`stockByProduct`) com atualização em lote via `productService.getProductsByIds`.
    - Finalização da venda gera o pedido revisado e sincroniza os estoques e métricas.

- **Cadastro Rápido de Clientes na Venda PDV e Otimização do Combobox de Clientes** (`SalesPage.tsx`, `CustomerQuickCreateModal.tsx`, `CustomerCombobox.tsx`):
  - **Botão de Ação Direta "Novo Cliente"**:
    - Adicionado botão com ícone `UserPlus` ao lado do seletor de clientes na lateral do checkout do PDV (`/sales`).
    - Abre o modal rápido `CustomerQuickCreateModal` com campos essenciais: Nome Completo/Razão Social, CPF/CNPJ, Telefone/WhatsApp, E-mail e Observações.
    - Salva no banco de dados (`customers`), invalida as consultas de clientes do cache e seleciona automaticamente o novo cliente na venda em andamento (`selectedCustomerId`).
  - **Combobox de Clientes Aprimorado (`CustomerCombobox`)**:
    - Resolução automática de dados do cliente por ID (`customer-by-id`) quando selecionado programaticamente ou cadastrado via modal, garantindo exibição imediata do nome e documento no campo.
    - Amostra ajustada para os **3 últimos clientes** cadastrados, garantindo que os elementos caibam com perfeição na visualização do operador sem cortes visuais.
    - Posicionamento dinâmico inteligente (abre para cima quando posicionado próximo ao rodapé do painel de checkout), garantindo visibilidade total dos itens e do botão "Consumidor Final".

## 2026-10-08

- **Suporte a Produtos Pesáveis e Venda Fracionada (KG / Gramas) no Catálogo Público da Loja** (`CatalogPublicPage.tsx`, `productUtils.ts`):
  - **Experiência de Pesagem Completa para o Consumidor Final**:
    - Produtos com unidade `KG` recebem a etiqueta visual **`KG (PESO)`** e preço formatado por quilo (`R$ XX,XX/kg`).
    - Botão **"Escolher Peso (KG)"** abre o modal interativo de pesagem (`WeightInputModal`) diretamente na vitrine pública.
    - O cliente pode digitar livremente em gramas (ex: `150g`), quilos (ex: `0,150 kg`) ou valor que deseja gastar em R$ (ex: `R$ 5,00`), além de usar os atalhos rápidos (`100g`, `150g`, `250g`, `500g`, `1 kg`).
  - **Carrinho & Pedidos via WhatsApp com Discriminação de Peso**:
    - No carrinho do catálogo público, exibe a gramatura/quilos e cálculo proporcional exato.
    - Ao finalizar no WhatsApp, a mensagem gerada discrimina detalhadamente os itens pesados com peso e preço por quilo (ex: `• Alho a Granel (150g) - R$ 2,47 (R$ 16,45/kg)`).
  - **Grade Responsiva**: Catálogo adaptado para 1 item por linha no mobile e cards enriquecidos.

- **Otimizações Mobile: Layout de 1 Item por Linha no PDV e Menu com Botão 'Acessar Painel' em Destaque** (`SalesPage.tsx`, `PublicLayout.tsx`, `AppLayout.tsx`):
  - **Catálogo PDV em 1 Item por Linha no Mobile** (`SalesPage.tsx`):
    - Grade ajustada para `grid-cols-1` em telas móveis (`< 640px`) e `sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.
    - Cards com tipografia nítida, botões de toque confortáveis, badge de peso `KG`, preço em destaque e saldo visual sem apertos.
  - **Menu de Navegação Pública & Entrada na Plataforma** (`PublicLayout.tsx`):
    - Itens do menu móvel reestruturados em lista vertical de 1 item por linha com espaçamento amplo e feedback de toque.
    - Botão **"Acessar Painel"** (para usuários logados) e **"Acessar Painel / Entrar"** colocado em **destaque primário full-width** com ícone e sombra (`shadow-primary/25`).
  - **Menu Lateral do App** (`AppLayout.tsx`):
    - Navegação inferior de atalhos ajustada para 1 item por linha contínua no mobile.

- **Suporte a Produtos Pesáveis e Venda Fracionada (KG / Gramas) no PDV Frente de Caixa** (`SalesPage.tsx`, `WeightInputModal.tsx`):
  - **Identificação Automática de Itens Pesáveis**: Detecção inteligente de produtos cadastrados com unidade `KG` ou `QUILOGRAMA`. Exibição de badge `KG` e preço formatado por quilo (`R$ XX,XX/kg`) no catálogo e no carrinho.
  - **Modal Interativo de Pesagem & Gramatura** (`WeightInputModal`):
    - Ao selecionar um produto em KG no PDV, abre modal intuitivo para informe de peso.
    - Suporte a 3 modos de entrada sincronizados em tempo real:
      1. **Gramas (g)** com botões de incremento/decremento rápido (-50g / +50g).
      2. **Quilogramas (kg)** com precisão decimal (3 casas decimais - `0,150 kg`).
      3. **Valor em Dinheiro (R$)** calculando automaticamente a quantidade correspondente em quilos/gramas.
    - **Atalhos Rápidos de Peso**: Botões de 1 toque para pesos frequentes (`100g`, `150g`, `200g`, `250g`, `300g`, `500g`, `750g`, `1 kg`, `1,5 kg`, `2 kg`).
    - Validação de saldo disponível em tempo real e visualização de total calculado.
  - **Carrinho & Checkout com Precisão Fracionária**:
    - Botão de ajuste rápido de peso diretamente no carrinho com abertura do modal ou ajuste em passos de 50g.
    - Integração transparente com `orderService.createOrder` e a função RPC atômica do Supabase (`NUMERIC(12,3)`), baixando a fração exata do estoque (ex: 0,150 kg de Alho a Granel).

- **Sincronização Cadastral, Preços de Compra/Venda, Rastreabilidade de Fornecedores e Lotes no Estoque**:
  - **Cadastro Completo de Produtos no Catálogo Mestre** (`ProductsPage.tsx`, `productService.ts`):
    - Inclusão dos campos de **Preço de Custo (R$)**, **Preço de Venda (PDV) (R$)** e seleção de **Fornecedor Principal** diretamente no modal de criação e edição de produtos.
    - Exibição de colunas de Custo, Venda e Fornecedor na tabela de listagem de produtos com cálculo de margem em tempo real.
  - **Lançamento Enriquecido de Movimentações Manuais** (`InventoryPage.tsx`, `inventoryService.ts`):
    - Modal de *Lançar Movimento* agora suporta informe de **Preço de Compra / Custo Unitário**, **Preço de Venda Unitário no PDV**, **Fornecedor**, **Número do Lote** e **Data de Validade** nas entradas manuais.
    - Sincronização automática com a tabela de produtos (`products`) e lotes (`stock_batches`) para atualização imediata no PDV frente de caixa.
  - **Rastreabilidade e Origem do Estoque** (`ProductStockDetailsModal.tsx`, `InventoryPage.tsx`, `inventoryService.ts`):
    - Novo modal de *Origem & Lotes* acessível por linha de saldo, exibindo:
      1. Fornecedor vinculado, dados cadastrais e contatos (telefone, e-mail, contato).
      2. Relação de todos os lotes ativos, validades e status de expiração (dias restantes, avisos 30d/7d).
      3. Histórico das entradas e compras com preços unitários pagos e notas.
    - Filtro rápido de saldo no topo de Estoque (`Todos os Produtos`, `Com Estoque Ativo`, `Estoque Zerado`).
    - Ordenação padrão por itens recentemente movimentados (`updated_at desc`).

## 2026-10-07

- **Plano de Teste & Roteiro de Automação E2E com Execução em Tenant Dedicado** (`test-automation/`):
  - **Criação do Tenant Isolado de Testes**: Loja dedicada `Loja QA Automação E2E` (`loja-qa-automacao-e2e`) para execução de testes contínuos sem interferir em lojas de produção ou homologação.
  - **Roteiro Técnico Passo a Passo para Automação Externa** (`test-automation/ROTEIRO_AUTOMACAO_TESTES_E2E.md`, `test-automation/roteiro_casos_de_teste.json`): Especificação completa contendo 33 casos de teste (TC-01 a TC-33) com pré-condições, rotas, payloads, critérios de aceite e templates para automação em Playwright, Cypress e Postman.
  - **Runner Automatizado de Testes** (`test-automation/executar_roteiro_testes.js`): Execução ponta a ponta cobrindo cadastro de fornecedores, 4 categorias, 4 produtos no catálogo mestre, carga inicial de 400 unidades de estoque com lotes e validades (`31/10/2026`), venda no PDV com dedução atômica, cancelamento com estorno automático, emissão e recebimento de ordem de compra, e acesso/validação em 100% das telas da aplicação (incluindo os 9 relatórios de varejo, auditoria, configurações e catálogo público web).
  - **Relatório Executivo & Evidências Gravadas Localmente** (`test-automation/RELATORIO_EXECUCAO_TESTES.md`, `test-automation/resultado_execucao_testes.json`): 100% de sucesso (33/33 casos de teste aprovados em 20,26 segundos).

## 2026-10-05

- **Padronização Responsiva de Tabelas & Botões de Ação Visíveis no Mobile** (`src/components/common/ResponsiveTable.tsx`, `src/index.css`, e todas as páginas de gestão):
  - **Unificação do Padrão de Cards Mobile**: Substituição de tabelas/listas duplicadas isoladas por `<ResponsiveTable>`, transformando cada linha da tabela em cards organizados em dispositivos móveis (`< 768px`) com grid de 2 colunas e labels semânticos.
  - **Botões de Ação Grandes e Imediatamente Visíveis**: Eliminação de menus escondidos ou botões de ícone minúsculos nas ações de linha. Em todas as telas (`/products`, `/categories`, `/purchases`, `/orders`, `/customers`, `/suppliers`, `/batches`, `/stores`, `/team`, `/inventory`, `/audit`, `/notifications` e `/global-admin`), as ações agora possuem botões grandes (`min-height: 38px`), áreas de toque acessíveis (*touch-friendly*), ícones e textos claros (Ex: *Fotos, Editar, Excluir, Detalhes, Receber, Cancelar, Baixa, Reset Senha*).
  - **CSS Responsivo Dedicado**: Otimização de `.responsive-mobile-cards tbody td.mobile-table-actions` para renderizar ações em linha horizontal inferior com separador visual, ocultação do rótulo redundante "AÇÕES" e expansão natural dos botões.

## 2026-10-02

- **Página de Evidências na Landing Page & Rota `/evidence`** (`src/pages/EvidencePage.tsx`, `AppRoutes.tsx`, `PublicLayout.tsx`, `LandingPage.tsx`):
  - Nova página pública interativa integrada à arquitetura React da aplicação com filtro por categoria, alternador de visualização (Desktop/Mobile/Ambos), busca instantânea e modal lightbox em tela cheia com atalho `ESC`.
  - Links de navegação adicionados no menu principal superior, menu mobile e rodapé do site institucional.
  - Seção de vitrine de qualidade e testes adicionada na `LandingPage` com cards de visualização rápida.
- **Caderno Executivo de Testes em Markdown** (`docs/pt-BR/test-evidence.md`, `docs/evidence/README.md`):
  - Documentação completa em Markdown com todas as 50 capturas de tela renderizadas em pares Desktop & Mobile, detalhamento das rotas, descrições operacionais e tabela consolidada de testes de APIs REST com tokens HBAC.
- **Caderno Executivo de Testes & Evidências Visuais em HTML** (`docs/pt-BR/test-evidence.html`, `public/test-evidence.html`):
  - Execução automatizada de testes e captura em alta resolução de 50 screenshots (25 telas e fluxos em Desktop 1440×900 e Mobile 390×844).
  - Validação de 100% dos fluxos de gestão, incluindo Dashboard, Catálogo Mestre, Estoque com Valorização, Compras com Markup, PDV Frente de Caixa, Pedidos, Clientes, Fornecedores, Validades, os 9 Relatórios de Varejo e as 5 abas do Painel Global Admin.
  - Testes de API REST e integração com IAs externas via tokens HBAC na loja de homologação GNZ Hortifruti com status HTTP 200 OK.
  - Relatório interativo em HTML moderno com filtros dinâmicos, comparador de viewport, busca e visualizador modal lightbox com zoom.
- Novos Relatórios de Gestão Estratégica & Varejo em `/reports` (`ReportsPage.tsx`, `reportService.ts`, `report.types.ts`):
  - **Giro de Estoque & Compra Baseada no Consumo (`demand`)**: Cálculo de consumo médio diário (últimos 30 dias), previsão de esgotamento/cobertura em dias (*runout*), recomendação inteligente de compra para cobertura de 30 dias, investimento necessário projetado e classificação de urgência (`URGENT`, `ATTENTION`, `NORMAL`, `OVERSTOCK`).
  - **Ticket Médio por Cliente & Comportamento / LTV (`customers`)**: Análise de histórico de compras com cálculo de total de pedidos, LTV acumulado, ticket médio por transação, recência (dias desde a última compra), canal preferido de atendimento e segmentação automática (`VIP`, `FREQUENT`, `OCCASIONAL`, `INACTIVE`).
  - **Levantamento & Investimento de Capital de Giro por Categoria (`investment`)**: Consolidação do capital investido (a custo) por categoria, potencial de faturamento na gôndola, lucro bruto projetado, margem %, % de alocação no estoque da loja e GMROI (*Gross Margin Return on Investment*).
  - Sincronização completa de URL state para todas as abas de relatórios via `useTablePagination` (`?tab=...&page=...&search=...&status=...`).
  - Exportação CSV dedicada para todos os 9 relatórios consolidados do sistema.
- Redesenho e modernização do menu de relatórios em `/reports` (`ReportsPage.tsx`):
  - **Menu Segmentado de Relatórios**: Barra de navegação moderna com abas em pílula, ícones dedicados por tipo de análise, títulos responsivos e badges dinâmicos de contagem/alerta (ex: total de unidades, status da Curva ABC 80/15/5, alertas de ruptura e perdas).
  - **Barra de Contexto e Filtros Integrada**: Header contextual com ícone temático, descrição explicativa da análise ativa, contador instantâneo de registros filtrados, seletores de categoria/classe ABC/gravidade com ícones integrados e botões de ação rápida para exportação CSV e impressão de demonstrativo executivo.
  - **Experiência Responsiva e Touch**: Container com rolagem horizontal suave para dispositivos móveis sem quebra de layout ou estouro de viewport.

## 2026-10-01

- Painel Global Admin (`/global-admin`, `GlobalAdminDashboardPage.tsx`):
  - **Menu Dropdown de Ações Rápidas**: Transformação das ações de topo e de linha nas tabelas de Lojas e Usuários em menus dropdown (`<DropdownMenu />`), organizando edição, transferência de propriedade, catálogo público, redefinição de senha e exclusão.
  - **Central de Backup & Exportação Multi-loja** (`GlobalBackupPanel.tsx`, `backupService.ts`):
    - Exportação de Dump SQL da base com comandos `INSERT INTO` relacionais completos, filtráveis por loja individual ou backup geral de todas as lojas.
    - Exportação de arquivo `.ZIP` contendo todas as imagens de produtos da loja com manifesto indexado (`manifest.json` com SKU, nome e ID do produto).
    - Exportação de pacote relacional estruturado em `.JSON` para BI, auditoria e homologação.
  - **Gerenciador e Explorador de Banco de Dados (CRUD Completo)** (`GlobalDbExplorerPanel.tsx`, `dbManagerService.ts`):
    - Interface dinâmica para inspeção tabular com paginação, busca e filtro por loja.
    - Modais de inserção de novos registros, edição de linhas existentes e exclusão com modal de confirmação em todas as tabelas gerenciadas (`stores`, `products`, `categories`, `stock_balances`, `stock_batches`, `stock_movements`, `orders`, `purchase_orders`, `customers`, `suppliers`, `cost_centers`, `loss_reasons`).
  - **Configuração de API & Controle de Acesso HBAC por Loja** (`GlobalApiKeyHbacPanel.tsx`, `apiKeyService.ts`):
    - Geração de tokens de API com escopos HBAC granulares (`products:*`, `inventory:*`, `orders:*`, `purchases:*`, `customers:*`, `reports:*`, `audit:*`) e presets rápidos (Admin, Operador, Leitura, Integração ERP/PDV).
    - Isolamento rígido por loja (`store_id`) associada ao token ou escopo global multi-loja.
    - Suporte a tokens com expiração configurável (30, 90, 365 dias) ou chave permanente (sem expiração).
    - Gestão de ciclo de vida (cópia de chave, ativação/desativação, revogação) e documentação interativa integrada com exemplos de cabeçalhos e chamadas `curl`/`fetch`.
- Desacoplamento de Preço de Custo e Preço de Venda do cadastro base de produtos em `/products` (`ProductsPage.tsx`): o cadastro em `/products` funciona como catálogo mestre (SKU, código de barras, categoria, unidade, estoques mín/máx), permitindo que preços reais de custo e venda venham das entradas em estoque (`/purchases`, entrada em lote, lotes de diferentes fornecedores).
- Reformulação completa da página de Relatórios em `/reports` (`ReportsPage.tsx`, `reportService.ts`, `report.types.ts`):
  - KPIs executivos no topo: Estoque em Custo, Estoque em Venda, Margem Bruta %, Faturamento no Mês, Perdas Operacionais e Alertas de Ruptura.
  - Relatório 1: **Valorização & Rentabilidade do Estoque** (Custo Unitário, Venda Unitária, Totais, Lucro Estimado e Margem %).
  - Relatório 2: **Curva ABC & Mix de Produtos** (Classificação A/B/C automática por valor, % do mix, % acumulado e diretrizes de reposição).
  - Relatório 3: **Compras & Fornecedores** (Volume financeiro por pedido, custo total, venda projetada e margens praticadas).
  - Relatório 4: **Perdas & Baixas Operacionais** (Avarias, vencimentos, descartes, centros de custo e operadores).
  - Relatório 5: **Ruptura & Reposição** (Identificação de produtos zerados e críticos com cálculo automático de déficit de compra e custo estimado de reposição).
  - Relatório 6: **Desempenho de Vendas** (Histórico detalhado por canal, cliente, descontos e total pago).
  - Padrão visual e funcional unificado com `/inventory` e `/products`: paginação integrada, responsividade desktop/mobile, busca instantânea, filtros por categoria/status e exportação CSV em todos os relatórios.
- Integração de Preço de Custo e Preço de Venda em `/purchases` (`PurchasingPage.tsx`, `purchasingService.ts`, `purchasing.types.ts`): emissão de ordens de compra com cálculo em tempo real de lucratividade/margem por item e total, sincronização imediata dos custos e preços de venda com o catálogo de produtos e reflexão direta nos relatórios e saldos de `/inventory`.
- Implementação de avaliação financeira e valores de produtos em `/inventory`: exibição de Valor de Compra (Custo unitário e total), Valor de Venda (tabela unitário e total), Lucro Estimado e Margem média consolidada nos cards de KPI e colunas da tabela de saldos (`InventoryPage.tsx`, `inventoryService.ts`, `inventory.types.ts`).
- Exportação avançada de saldos em CSV incluindo valores de compra, venda, totalização e margem estimada.
- Implementação de seleção múltipla e baixa de estoque em lote na aba de saldos de `/inventory` (`BulkStockWriteoffModal.tsx`, `inventoryService.writeoffBulkStock`, `InventoryPage.tsx`), com suporte a motivo, centro de custo, aprovador e preenchimento rápido de saldo total.
- Ação em lote para remoção de produtos zerados selecionados para Global Admin.

## 2026-09-30

- Correção de contraste e legibilidade da badge "Global Admin" na listagem de usuários de `/global-admin` (`GlobalAdminDashboardPage.tsx`).
- Remoção de produtos com estoque zerado no painel `/inventory` para o perfil Global Admin (individual e em lote com `ConfirmModal`).
- Seleção múltipla de produtos em `/products` e modal de entrada de estoque em lote direta (`BulkStockEntryModal.tsx`, `inventoryService.addBulkStock`).
- Remoção de jargões técnicos excessivos ("SaaS", "Enterprise", "Multi-tenant") e padronização da marca para "Olivelas Gestão / Estoque & Vendas".
- Redesenho completo e profissional da Landing Page (`LandingPage.tsx`) com foco em valor real, segmentos atendidos, workflow prático, catálogo WhatsApp e FAQ detalhado.
- Normalização robusta de cabeçalhos e valores na importação de produtos CSV/JSON em massa (`importParser.ts`, `productService.ts` e `ProductsPage.tsx`).
- Correção de pré-visualização de preços e categorias na modal de importação em massa.
- Sistema de galeria de imagens para produtos com suporte a upload pelo dispositivo/câmera e reuso da biblioteca de mídia (`ProductGalleryModal.tsx`, `productImageService.ts`).

## 2026-09-27

- Criação da árvore `docs/` (pt-BR) a partir de inventário do código e SQL.
- Guias de replicação de shell desktop e mobile.
- `AGENTS.md` apontando para `docs/pt-BR/ai-context.md`.
- Status dos docs: `DRAFT` (sem revisão humana registrada).
