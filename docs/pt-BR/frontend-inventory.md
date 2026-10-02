---
id: ARCH-OLIVELAS-FRONTEND
title: Inventário frontend
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-02
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
| `/dashboard` | `DashboardPage` | |
| `/global-admin` | `GlobalAdminDashboardPage` | segundo `ProtectedRoute` com `requireGlobalAdmin` |
| `/stores` | `StoresPage` | |
| `/products` | `ProductsPage` | Catálogo mestre com entrada em lote e galeria |
| `/categories` | `CategoriesPage` | |
| `/inventory` | `InventoryPage` | Saldos, valorização a custo/venda, baixa em lote, lotes e movimentações |
| `/expiration` | `ExpirationPage` | |
| `/sales` | `SalesPage` | PDV |
| `/orders` | `OrdersPage` | |
| `/customers` | `CustomersPage` | |
| `/suppliers` | `SuppliersPage` | |
| `/purchases` | `PurchasingPage` | Ordens de compra com cálculo de markup e margem |
| `/reports` | `ReportsPage` | 9 relatórios analíticos com paginação por URL e exportação CSV |
| `/notifications` | `NotificationsPage` | |
| `/audit` | `AuditLogsPage` | |
| `/team` | `TeamPage` | |
| `/settings` | `SettingsPage` | |
| `*` | `NotFoundPage` | fora dos layouts acima |

## Navegação do `AppLayout`

Itens de topo: Dashboard; se `isGlobalAdmin`, também Admin Global (`/global-admin`).

Grupos (ids no código):

| Grupo `id` | Paths |
| --- | --- |
| `registry` | `/products`, `/categories`, `/customers`, `/suppliers` |
| `control` | `/inventory`, `/expiration`, `/purchases` |
| `management` | `/orders`, `/reports`, `/team` |

Links soltos (grid 2 colunas no mobile): `/sales`, `/notifications`, `/audit`, `/settings`.

Link “Catálogo Público” se `storeSlug` existe e não é `'global'`. Link “+ Gerenciar Todas as Lojas” no switcher só se `isGlobalAdmin`.

Labels vêm de `t.nav.*` (`src/i18n/locales/pt-BR.ts` e equivalentes EN/ES).

## Páginas — padrão de UI (observado)

| Page | Padrão principal |
| --- | --- |
| `DashboardPage` | cards de métrica (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) + lista de pedidos recentes |
| `SalesPage` | PDV: `grid-cols-1 lg:grid-cols-12` (catálogo 8 / carrinho 4 em `lg`) |
| `ProductsPage` | catálogo mestre: tabela `hidden md:block` + lista `md:hidden`, seleção múltipla e `BulkStockEntryModal` |
| `InventoryPage` | KPI de valorização a custo/venda + abas de saldos, lotes, movimentações, centros de custo, motivos de perda e `BulkStockWriteoffModal` |
| `ReportsPage` | menu segmentado com 9 abas analíticas, KPI summary, barra contextual de filtros por categoria/status/classe/urgência/segmento, busca instantânea, sincronização de URL e exportação CSV |
| `GlobalAdminDashboardPage` | métricas globais + abas de Lojas, Usuários, `GlobalDbExplorerPanel` (CRUD dinâmico), `GlobalBackupPanel` (Dumps SQL/ZIP/JSON) e `GlobalApiKeyHbacPanel` (Gestor de Chaves HBAC) |
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
| `admin/` | `GlobalDeletePanel.tsx`, `GlobalDbExplorerPanel.tsx`, `GlobalBackupPanel.tsx`, `GlobalApiKeyHbacPanel.tsx` |
| `inventory/` | `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`, `StockImportModal.tsx` |
| `products/` | `ProductGalleryModal.tsx`, `BulkStockEntryModal.tsx` |
| `sales/` | `CustomerCombobox.tsx` |
| `settings/` | `StoreThemeSelector.tsx` |

## Hooks

| Hook | Função |
| --- | --- |
| `useAuth` | wrapper do `authStore` |
| `useTenant` | `storeId`, `storeName`, `storeSlug`, `role`, `setActiveStore` |
| `usePermissions` | mapa local `ROLE_PERMISSIONS_MAP` + flags `canManageStore`, `canManageInventory`, `canSell`, `canViewReports` |
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
| `storeService` | `getStoreBySlug`, `getStoreById`, `listAllStores`, `listStores`, `createStore`, `updateStore`, `softDeleteStore` |
| `productService` | `listProducts`, `listProductsForPOS`, `listPublicCatalogProducts`, `getProductById`, `createProduct`, `updateProduct`, `softDeleteProduct`, `listCategories`, `createCategory`, `importProductsBulk` |
| `categoryService` | `listCategories`, `createCategory`, `updateCategory`, `deleteCategory` |
| `productImageService` | listagem, upload biblioteca/produto, attach, primary, reorder, remove |
| `storageService` | `uploadProductImage`, `deleteProductImage`, `uploadStoreLogo` |
| `inventoryService` | saldos, valorização financeira, movimentos, lotes, `applyMovement` (RPC), centros de custo, motivos de perda, import, disposições de lote, baixa em lote (`writeoffBulkStock`), remoção de estoque zerado |
| `orderService` | `listOrders`, `createOrder` (RPC), `cancelOrder` (RPC `restore_sale_stock`), `updateOrderStatus` |
| `customerService` | list/get/create/update/`softDeleteCustomer` |
| `supplierService` | list/create/update/`softDeleteSupplier` |
| `purchasingService` | list/create/`receivePurchaseOrder` (RPC), cálculo de lucratividade e sincronização de custos/preços com catálogo |
| `userService` | usuários plataforma, membros da loja, convite, papéis, delete via RPC |
| `globalAdminService` | `listEntities`, `hardDelete` (RPC `global_admin_delete`) |
| `dbManagerService` | `listTableData`, `createRow`, `updateRow`, `deleteRow` para CRUD dinâmico de 12 tabelas no painel admin |
| `backupService` | `generateSqlDump`, `generateImagesZip`, `generateJsonBackup` (multi-loja e loja individual) |
| `apiKeyService` | `listApiKeys`, `createApiKey`, `toggleApiKeyStatus`, `revokeApiKey`, validação e documentação interativa de escopos HBAC |
| `notificationService` | list, mark read, `generateStockAlerts` (RPC) |
| `auditService` | `listAuditLogs`, `logAction` |
| `reportService` | `getRetailSummaryKPIs`, `getValuationReport`, `getAbcCurveReport`, `getConsumptionDemandReport`, `getCustomerTicketReport`, `getCapitalInvestmentReport`, `getPurchasingReport`, `getLossesReport`, `getStockoutsReport`, `getSalesPerformanceReport`, `getAvailableReportsList`, `getGlobalAdminMetrics` |

## Utils

`cn.ts`, `currency.ts`, `dates.ts`, `barcode.ts`, `export.ts` (`exportToCSV`, `printFormattedDocument`), `importParser.ts`, `errorHandler.ts`.

## Tipos

Reexport em `src/types/index.ts`: `database`, `auth`, `store`, `product`, `inventory`, `order`.
Módulos dedicados: `report.types.ts`, `apiKey.types.ts`, `backup.types.ts`, `dbManager.types.ts`, `customer.types.ts`, `supplier.types.ts`, `purchasing.types.ts`, `user.types.ts`.

## i18n

Locales: `pt-BR` (padrão), `en-US`, `es-ES`. Tipagem do dicionário = `typeof ptBR`.

## QueryClient (`App.tsx`)

`refetchOnWindowFocus/Mount/Reconnect`: false; `retry`: 1; `staleTime`: 5 minutos; `gcTime`: 30 minutos.
