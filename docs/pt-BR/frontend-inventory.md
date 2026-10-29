---
id: ARCH-OLIVELAS-FRONTEND
title: Inventário frontend
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
language: pt-BR
classification: Confirmed
source:
  - src/routes/AppRoutes.tsx
  - src/layouts/AppLayout.tsx
  - src/services/
---

# Inventário frontend

## Rotas (`AppRoutes.tsx`)

### Marketing (`PublicLayout`)

| Path | Page |
| --- | --- |
| `/` | `LandingPage` |
| `/features` | `FeaturesPage` |
| `/pricing` | `PricingPage` |
| `/contact` | `ContactPage` |

### Catálogo (sem layout shell de marketing)

| Path | Page |
| --- | --- |
| `/store/:slug` | `CatalogPublicPage` |

### Auth (`AuthLayout`)

| Path | Page |
| --- | --- |
| `/login` | `LoginPage` |
| `/register` | `RegisterPage` |
| `/forgot-password` | `ForgotPasswordPage` |
| `/reset-password` | `ResetPasswordPage` |

### App autenticado (`ProtectedRoute` + `AppLayout`)

| Path | Page | Extra |
| --- | --- | --- |
| `/dashboard` | `DashboardPage` | Painel analítico multi-loja (`Matriz` & `Filiais`), vendas mensais (12 meses), top produtos mais vendidos, filtros de período/tempo/canal e exportação CSV/JSON/PDF |
| `/global-admin` | `GlobalAdminDashboardPage` | segundo `ProtectedRoute` com `requireGlobalAdmin` |
| `/global-admin/stores/new` | `GlobalAdminStoreEditPage` | segundo `ProtectedRoute` com `requireGlobalAdmin` |
| `/global-admin/stores/:storeId/edit` | `GlobalAdminStoreEditPage` | Edição completa da loja, filiação (`Matriz` / `Filial`), `STORE_ADMIN`s e equipe |
| `/global-admin/stores/:storeId/employees/new` | `StoreEmployeeEditPage` | Criação de funcionário com Store ID na URL (`requireGlobalAdmin`) |
| `/global-admin/stores/:storeId/employees/:employeeId` | `StoreEmployeeEditPage` | Edição completa de funcionário, alçada de baixa e permissões granulares (`requireGlobalAdmin`) |
| `/global-admin/users/:userId/edit` | `GlobalAdminUserEditPage` | Edição de conta, senha e lojas administradas do `STORE_ADMIN` / `GLOBAL_ADMIN` |
| `/global-admin/users/:userId/permissions` | `GlobalAdminUserPermissionsPage` | Gestão em tela inteira de grupo de permissões, módulos liberados e grafo de dependências |
| `/global-admin/users/:userId/billing` | `GlobalAdminUserBillingPage` | Controle de pagamentos, faturas, cálculo de licenças de funcionários e histórico financeiro |
| `/global-admin/finance/rules` | `GlobalAdminFinanceRulesPage` | Regras financeiras globais (10 funcionários grátis por loja, valor por licença adicional) e exceções por loja |
| `/global-admin/finance/plans` | `GlobalAdminFinancePlansPage` | Catálogo comercial de grupos de permissões e tabela de valores por módulo |
| `/global-admin/finance/payments` | `GlobalAdminFinancePaymentsPage` | Livro-razão consolidado de faturas e histórico de pagamentos de todas as contas |
| `/stores` | `StoresPage` | `PermissionGate` (`moduleCode="MOD_TEAM_AUDIT"`) |
| `/products` | `ProductsPage` | Catálogo mestre com entrada em lote e galeria; `PermissionGate` (`moduleCode="MOD_CATALOG_WA"`) |
| `/categories` | `CategoriesPage` | `PermissionGate` (`moduleCode="MOD_CATALOG_WA"`) |
| `/inventory` | `InventoryPage` | Saldos, valorização a custo/venda, baixa em lote, lotes e movimentações; `PermissionGate` (`moduleCode="MOD_INVENTORY"`) |
| `/expiration` | `ExpirationPage` | `PermissionGate` (`moduleCode="MOD_EXPIRATION"`) |
| `/sales` | `SalesPage` | PDV; `PermissionGate` (`moduleCode="MOD_POS_SALES"`) |
| `/orders` | `OrdersPage` | `PermissionGate` (`moduleCode="MOD_CATALOG_WA"`) |
| `/customers` | `CustomersPage` | Gestão de clientes com histórico completo de pedidos por cliente, links profundos (`?customerId=...&orderId=...`), filtro multi-seleção de status, visões salvas no banco por loja/filial e exportação detalhada dos itens visíveis; `PermissionGate` (`moduleCode="MOD_CUSTOMERS"`) |
| `/suppliers` | `SuppliersPage` | `PermissionGate` (`moduleCode="MOD_SUPPLIERS"`) |
| `/purchases` | `PurchasingPage` | Ordens de compra com cálculo de markup e margem; `PermissionGate` (`moduleCode="MOD_PURCHASING"`) |
| `/reports` | `ReportsPage` | 9 relatórios analíticos com filtro de período/datas personalizadas (`Hoje`, `Esta Semana`, `Este Mês`, `De/Até`), registro de compras/vendas com data e hora exatas, pedidos por cliente com link para `/customers` e exportação CSV somente dos itens visíveis com detalhes; `PermissionGate` (`moduleCode="MOD_REPORTS"`) |
| `/notifications` | `NotificationsPage` | |
| `/audit` | `AuditLogsPage` | `PermissionGate` (`moduleCode="MOD_TEAM_AUDIT"`) |
| `/team` | `TeamPage` | `PermissionGate` (`moduleCode="MOD_TEAM_AUDIT"`) |
| `/team/new` | `StoreEmployeeEditPage` | Cadastro de funcionário da loja ativa (`moduleCode="MOD_TEAM_AUDIT"`) |
| `/team/:employeeId` | `StoreEmployeeEditPage` | Edição de funcionário da loja ativa (`moduleCode="MOD_TEAM_AUDIT"`) |
| `/team/stores/:storeId/employees/:employeeId` | `StoreEmployeeEditPage` | Edição de funcionário com identificação explícita de loja e funcionário na URL (`moduleCode="MOD_TEAM_AUDIT"`) |
| `/integrations` | `ApiIntegrationsPage` | API Studio & Conector de Serviços estilo Postman (De → Para, Dry-Run, Upsert e cURL); `PermissionGate` (`moduleCode="MOD_API_INTEGRATIONS"`) |
| `/settings` | `SettingsPage` | `PermissionGate` (`moduleCode="MOD_TEAM_AUDIT"`) |
| `*` | `NotFoundPage` | fora dos layouts acima |

## Navegação do `AppLayout`

Item de topo: Dashboard (`/dashboard`).

Grupos (ids no código):

| Grupo `id` | Paths |
| --- | --- |
| `global-admin` *(apenas `isGlobalAdmin`)* | `/global-admin`, `/global-admin?tab=stores`, `/global-admin/stores/new`, `/global-admin?tab=users`, `/global-admin/users/new`, `/global-admin?tab=finance`, `/global-admin/finance/rules`, `/global-admin/finance/plans`, `/global-admin/finance/payments`, `/global-admin?tab=backups`, `/global-admin?tab=db-explorer`, `/global-admin?tab=api-hbac`, `/global-admin?tab=delete` |
| `registry` | `/products`, `/categories`, `/customers`, `/suppliers` |
| `control` | `/inventory`, `/expiration`, `/purchases` |
| `management` | `/orders`, `/reports`, `/stores`, `/team`, `/team/new` |

Links soltos (inferiores): `/sales`, `/integrations`, `/notifications`, `/audit`, `/settings`.

Link “Catálogo Público” se `storeSlug` existe e não é `'global'`. Link “+ Gerenciar Todas as Lojas” no switcher só se `isGlobalAdmin`.

Labels vêm de `t.nav.*` (`src/i18n/locales/pt-BR.ts` e equivalentes EN/ES).

## Páginas — padrão de UI (observado)

| Page | Padrão principal |
| --- | --- |
| `DashboardPage` | Painel executivo de Business Intelligence: barra de filtros de período (`Hoje`, `7d`, `30d`, `90d`, `Este Mês`, `Mês Passado`, `Este Ano`, `Tudo`, `De/Até`), filtro por loja (`Todas as Lojas`, `Matriz`, `Filial`) e canal (`PDV`, `WhatsApp`, `Online`), 8 KPIs com variação `%` vs. período anterior, gráfico de evolução temporal (**Vendas Mensais 12 Meses** ou **Evolução no Período** diária/semanal/mensal), comparativo **Desempenho por Loja (Matriz vs. Filiais)** com drill-down em 1 clique, **Ranking de Produtos Mais Vendidos** com foto/margem/alerta de estoque, gráficos de acompanhamento (Donut SVG de Categorias, Canais, Meios de Pagamento e Ritmo Semanal), tabela de pedidos do período e menu `Baixar Dados do Período` (CSV, JSON e Relatório PDF/Impressão) |
| `SalesPage` | PDV: `grid-cols-1 lg:grid-cols-12` (catálogo 8 com miniaturas de `product_images` / carrinho 4 em `lg`) |
| `ProductsPage` | catálogo mestre: tabela `hidden md:block` + lista `md:hidden` com miniaturas, seleção múltipla e `BulkStockEntryModal` |
| `InventoryPage` | KPI de valorização a custo/venda + abas de Saldos (com miniaturas de produtos), Movimentações, **Aprovação de Baixas** (`stock_writeoff_requests`) e **Remessas p/ Filiais** (`stock_transfers` sem venda), além de `StockWriteoffModal`, `BulkStockWriteoffModal` e `StockBranchTransferModal` |
| `StoresPage` | Gestão Hierárquica de Lojas & Filiais (`Matriz -> └─ Filial`): filtros Todas / Matrizes / Filiais, KPIs de unidades e remessas, `DropdownMenu` consolidado em Ações Rápidas, cadastro de Filial vinculada à Matriz e envio de estoque para filial sem venda |
| `TeamPage` | Gestão de Funcionários, Aprovadores de Baixa & Licenças: KPIs de equipe, aprovadores e cota de licenças grátis (`10 funcionários grátis`), `DropdownMenu` em Ações Rápidas e navegação para página dedicada `/team/stores/:storeId/employees/:employeeId` |
| `ExpirationPage` | KPIs de validade (Vencidos, `<= 7d`, `<= 30d`, No Prazo) + listagem de lotes com miniaturas de produtos e justificativas (`batch_dispositions`) |
| `CustomersPage` | Barra de **Visões Salvas no Banco por Loja/Filial** (`store_saved_views` com presets *Pedidos em Aberto*, *Pedidos Fechados*, *Pedidos Cancelados*, *Todos os Clientes Ativos* + criação/atualização/exclusão individual por `store_id`), seletor **Multi-Seleção de Status** (status dos pedidos e status do cadastro), filtro de período/datas personalizadas (`Hoje`, `Esta Semana`, `Este Mês`, `Mês Passado`, `90d`, `Este Ano`, `De/Até`), coluna **Pedidos Realizados** com chips clicáveis (`?customerId=:id&orderId=:orderId`) e sub-tabela expansível com todos os pedidos do cliente, modal de inspeção detalhada do pedido acionado via URL e botão **Exportar Visíveis** que exporta somente as linhas visíveis em tela com o detalhamento completo de cada pedido e seus itens |
| `ReportsPage` | menu segmentado com 9 abas analíticas (`valuation`, `abc`, `demand`, `customers`, `investment`, `purchasing`, `losses`, `stockouts`, `sales`), seletor de escopo por loja (`Todas as Lojas Consolidado` ou unidade específica), filtro de período/datas personalizadas (`Todo o Histórico`, `Hoje`, `Esta Semana`, `Este Mês`, `Mês Passado`, `Últimos 90 Dias`, `Este Ano`, `Personalizado De/Até`) sincronizado na URL (`?period=...&from=...&to=...`), listagem de pedidos por cliente com data/hora e link direto para `/customers?customerId=...&orderId=...`, registro de compras e vendas com data e hora exatas (`DD/MM/YYYY HH:mm`) e detalhamento de itens, e botão `Exportar Visíveis` que exporta somente os registros visíveis na página atual com detalhamento completo |
| `GlobalAdminDashboardPage` | métricas globais + abas de **Lojas & Filiais** (árvore hierárquica `Matriz -> └─ Filial`), **Usuários Admin** (restrito a `STORE_ADMIN` e `GLOBAL_ADMIN` pagantes de plano), **Financeiro** (hub com cards para Regras & Licenças, Planos & Módulos e Pagamentos), `GlobalDbExplorerPanel`, `GlobalBackupPanel`, `GlobalApiKeyHbacPanel` e `GlobalDeletePanel`, todos com `DropdownMenu` unificado na coluna **Ações Rápidas** |
| `ApiIntegrationsPage` | API Studio estilo Postman (`grid-cols-1 lg:grid-cols-12`): Request Builder HTTP, Importar/Exportar cURL, Templates Prontos, Mapeador Visual De → Para com Auto-Map, Simulação Dry-Run e Sincronização em lote com Clientes, Categorias, Produtos, Fornecedores e Estoque |
| `PurchasingPage` | ordens de compra com cálculo de custo unitário, markup, preço de venda sugerido e lucro previsto |
| Maioria cadastros | `ResponsiveTable` e/ou tabela + `Modal` CRUD; rodapé de modal `flex-col-reverse sm:flex-row` |
| `CatalogPublicPage` | grade de produtos, modal de carrinho, WhatsApp |

## Componentes

### `components/ui`

`button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`, `modal.tsx`, `confirm-modal.tsx`, `dropdown-menu.tsx`, `pagination.tsx`, `SortableHeader.tsx`.

`modal.tsx`: em viewport estreita, alinhamento `items-end` e cantos superiores arredondados (`rounded-t-[1.75rem]`); handle visível `sm:hidden`; footer com `safe-area-inset-bottom`.

### `components/common`

`PageHeader` (portal para `#page-header-slot`), `ResponsiveTable`, `GlobalCommandK` (Ctrl/Cmd+K), `EmptyState`, `LoadingSkeleton`, `LanguageSelector`, `ThemeToggle`.

### Domínio

| Pasta | Arquivos |
| --- | --- |
| `admin/` | `GlobalDeletePanel.tsx`, `GlobalDbExplorerPanel.tsx`, `GlobalBackupPanel.tsx`, `GlobalApiKeyHbacPanel.tsx`, `UserPermissionsAndPricingModal.tsx`, `UserBillingHistoryModal.tsx`, `PermissionGroupsManagerModal.tsx` |
| `inventory/` | `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`, `StockBranchTransferModal.tsx`, `StockImportModal.tsx` |
| `team/` | `EmployeeRolePermissionsModal.tsx`, `StoreCustomRolesModal.tsx` |
| `products/` | `ProductGalleryModal.tsx`, `BulkStockEntryModal.tsx` |
| `sales/` | `CustomerCombobox.tsx` |
| `settings/` | `StoreThemeSelector.tsx` |

## Hooks

| Hook | Função |
| --- | --- |
| `useAuth` | wrapper do `authStore` |
| `useTenant` | `storeId`, `storeName`, `storeSlug`, `role`, `setActiveStore` |
| `usePermissions` | resolução híbrida das 47 permissões granulares (`src/constants/granularPermissions.ts`) combinando papel base (`UserRole`, incluindo `STOCK_APPROVER`), papel customizado da loja (`store_custom_roles`), `granted_permissions`, `revoked_permissions` e `can_approve_writeoff` + sobreposição dinâmica de `UserPermissionProfile` (`hasModuleAccess`, `hasRouteAccess`, `enforceOverStoreAdmin`) + flags `canApproveWriteoff`, `canRequestWriteoff`, `canTransferBranch`, `canManageBranches`, `canManageTeam`, `canManageStore`, `canManageInventory`, `canSell`, `canViewReports` |
| `useRealtimeSubscriptions` | canais `stock_balances`, `orders`, `notifications` filtrados por `store_id` |
| `useTablePagination` | `page`, `pageSize`, `search`, `sortBy`, `sortOrder` e filtros extras (`tab`, `category`, `status`) sincronizados na **query string da URL** |
| `useI18n` | locale persistido `olivelas_preferred_locale` |
| `useTheme` | `olivelas_theme_preference` (`light` \| `dark` \| `system`) |

## Zustand

| Store | Persistência |
| --- | --- |
| `authStore` | profile/stores/loja ativa em localStorage (chaves `olivelas_*`) |
| `themeStore` | `olivelas_theme_preference` |
| `cartStore` | carrinho do catálogo público (arquivo `src/stores/cartStore.ts`) |
| `useI18nStore` | em `src/i18n/index.ts` |

Tema **da loja**: `stores.theme_config.appTheme` + `applyStoreTheme` em `AppLayout` (`src/lib/storeThemes.ts`).

## Services — operações exportadas

| Módulo | Métodos principais |
| --- | --- |
| `authService` | `getCurrentSession`, `getCurrentUser`, `getUserStores`, `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `resetPasswordForEmail`, `updatePassword`, `signOut` |
| `storeService` | `getStoreBySlug`, `getStoreById`, `listAllStores`, `listStores`, `listBranches`, `listTransferDestinationStores`, `createStore`, `updateStore`, `softDeleteStore` |
| `productService` | `listProducts`, `listProductsForPOS`, `listPublicCatalogProducts`, `getProductById`, `createProduct`, `updateProduct`, `softDeleteProduct`, `listCategories`, `createCategory`, `importProductsBulk` |
| `categoryService` | `listCategories`, `createCategory`, `updateCategory`, `deleteCategory` |
| `productImageService` | listagem, upload biblioteca/produto, attach, primary, reorder, remove |
| `storageService` | `uploadProductImage`, `deleteProductImage`, `uploadStoreLogo` |
| `inventoryService` | saldos, valorização financeira, movimentos, lotes, `applyMovement` (RPC com validação estrita de aprovador de baixa), solicitações de baixa (`listWriteoffRequests`, `createWriteoffRequest`, `reviewWriteoffRequest`), remessas para filiais sem venda (`listStockTransfers`, `executeStockTransferToBranch`), centros de custo, motivos de perda, import, disposições de lote, baixa em lote (`writeoffBulkStock`), remoção de estoque zerado |
| `orderService` | `listOrders`, `createOrder` (RPC com resolução automática de `Cliente Genérico` e substituição resiliente em edições), `cancelOrder` (RPC `restore_sale_stock`), `updateOrderStatus` |
| `customerService` | list/get/create/update/`softDeleteCustomer`, `getOrCreateGenericCustomer`, enriquecimento de clientes com histórico completo de pedidos (`orders`, `order_items`, `payments`), filtragem multi-status (`customerStatuses`, `orderStatuses`), período (`dateFrom`, `dateTo`), deep-link por `customerId`/`orderId` e `getOrderDetailsByIdOrNumber` |
| `savedViewService` | `listViews`, `saveView`, `setDefaultView`, `deleteView` — persistência de visões de filtros salvas no banco de dados (`store_saved_views` + fallback `stores.theme_config.saved_views`) isoladas individualmente por loja ou filial (`store_id`) |
| `supplierService` | list/create/update/`softDeleteSupplier` |
| `purchasingService` | list/create/`receivePurchaseOrder` (RPC), cálculo de lucratividade e sincronização de custos/preços com catálogo |
| `userService` | usuários plataforma, membros da loja (`listStoreMembers`, `listStoreWriteoffApprovers`), cadastro seguro de funcionários (`upsertStoreEmployee` via RPC `upsert_store_employee`), papéis customizados (`listStoreCustomRoles`, `upsertStoreCustomRole`, `deleteStoreCustomRole`), delete via RPC |
| `globalAdminService` | `listEntities`, `hardDelete` (RPC `global_admin_delete`) |
| `dbManagerService` | `listTableData`, `createRow`, `updateRow`, `deleteRow` para CRUD dinâmico de 12 tabelas no painel admin |
| `backupService` | `generateSqlDump`, `generateImagesZip`, `generateJsonBackup` (multi-loja e loja individual) |
| `apiKeyService` | `listApiKeys`, `createApiKey`, `toggleApiKeyStatus`, `revokeApiKey`, validação e documentação interativa de escopos HBAC |
| `apiIntegrationService` | `listIntegrations`, `saveIntegration`, `deleteIntegration`, `listLogs`, `executeHttpRequest`, `extractRecordsArray`, `simulateSync`, `executeSync`, `parseCurlCommand`, `generateCurlCommand`, `detectJsonArrays`, `autoMapFields` |
| `permissionGroupService` | `listModules`, `updateModulePrice`, `listGroups`, `saveGroup`, `deleteGroup`, `listAllUserProfiles`, `getUserProfile`, `saveUserProfile`, `listUserPayments`, `createPayment`, `markPaymentAsPaid`, `updatePaymentStatus`, `listUserAuditLogs` |
| `notificationService` | list, mark read, `generateStockAlerts` (RPC) |
| `auditService` | `listAuditLogs`, `logAction` |
| `reportService` | `getRetailSummaryKPIs`, `getValuationReport`, `getAbcCurveReport`, `getConsumptionDemandReport`, `getCustomerTicketReport`, `getCapitalInvestmentReport`, `getPurchasingReport`, `getLossesReport`, `getStockoutsReport`, `getSalesPerformanceReport`, `getAvailableReportsList`, `getGlobalAdminMetrics` |

## Utils

`cn.ts`, `currency.ts`, `dates.ts`, `barcode.ts`, `export.ts` (`exportToCSV`, `printFormattedDocument`), `importParser.ts`, `errorHandler.ts`.

## Tipos

Reexport em `src/types/index.ts`: `database`, `auth`, `store`, `product`, `inventory`, `order`.
Módulos dedicados: `report.types.ts`, `apiKey.types.ts`, `apiIntegration.types.ts`, `permissionGroup.types.ts`, `backup.types.ts`, `dbManager.types.ts`, `customer.types.ts`, `supplier.types.ts`, `purchasing.types.ts`, `user.types.ts`.

## i18n

Locales: `pt-BR` (padrão), `en-US`, `es-ES`. Tipagem do dicionário = `typeof ptBR`.

## QueryClient (`App.tsx`)

`refetchOnWindowFocus/Mount/Reconnect`: false; `retry`: 1; `staleTime`: 5 minutos; `gcTime`: 30 minutos.
