---
id: ARCH-OLIVELAS-FRONTEND
title: Inventário frontend
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
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
| `/products` | `ProductsPage` | |
| `/categories` | `CategoriesPage` | |
| `/inventory` | `InventoryPage` | |
| `/expiration` | `ExpirationPage` | |
| `/sales` | `SalesPage` | PDV |
| `/orders` | `OrdersPage` | |
| `/customers` | `CustomersPage` | |
| `/suppliers` | `SuppliersPage` | |
| `/purchases` | `PurchasingPage` | |
| `/reports` | `ReportsPage` | |
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
| `ProductsPage` | tabela `hidden md:block` + lista `md:hidden` |
| Maioria cadastros | `ResponsiveTable` e/ou tabela + `Modal` CRUD; rodapé de modal `flex-col-reverse sm:flex-row` |
| `CatalogPublicPage` | grade de produtos, modal de carrinho, WhatsApp |
| `GlobalAdminDashboardPage` | métricas globais + `GlobalDeletePanel` |

## Componentes

### `components/ui`

`button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`, `modal.tsx`, `confirm-modal.tsx`, `dropdown-menu.tsx`, `pagination.tsx`, `SortableHeader.tsx`.

`modal.tsx`: em viewport estreita, alinhamento `items-end` e cantos superiores arredondados (`rounded-t-[1.75rem]`); handle visível `sm:hidden`; footer com `safe-area-inset-bottom`.

### `components/common`

`PageHeader` (portal para `#page-header-slot`), `ResponsiveTable`, `GlobalCommandK` (Ctrl/Cmd+K), `EmptyState`, `LoadingSkeleton`, `LanguageSelector`, `ThemeToggle`.

### Domínio

| Pasta | Arquivos |
| --- | --- |
| `admin/` | `GlobalDeletePanel.tsx` |
| `inventory/` | `StockWriteoffModal.tsx`, `StockImportModal.tsx` |
| `products/` | `ProductGalleryModal.tsx` |
| `sales/` | `CustomerCombobox.tsx` |
| `settings/` | `StoreThemeSelector.tsx` |

## Hooks

| Hook | Função |
| --- | --- |
| `useAuth` | wrapper do `authStore` |
| `useTenant` | `storeId`, `storeName`, `storeSlug`, `role`, `setActiveStore` |
| `usePermissions` | mapa local `ROLE_PERMISSIONS_MAP` + flags `canManageStore`, `canManageInventory`, `canSell`, `canViewReports` |
| `useRealtimeSubscriptions` | canais `stock_balances`, `orders`, `notifications` filtrados por `store_id` |
| `useTablePagination` | `page`, `pageSize`, `search`, `sortBy`, `sortOrder` e filtros extras na **query string** |
| `useI18n` | locale persistido `olivelas_preferred_locale` |
| `useTheme` | `olivelas_theme_preference` (`light` \| `dark` \| `system`) |

## Zustand

| Store | Persistência |
| --- | --- |
| `authStore` | profile/stores/loja ativa em localStorage (chaves `olivelas_*`) |
| `themeStore` | `olivelas_theme_preference` |
| `cartStore` | carrinho do catálogo público (arquivo `src/stores/cartStore.ts`) |
| `useI18nStore` | em `src/i18n/index.ts` |

Tema **da loja**: `stores.theme_config.appTheme` + `applyStoreTheme` em `AppLayout` (`src/lib/storeThemes.ts`). Famílias de cor listadas nesse arquivo (ex.: `ocean-dark` default).

## Services — operações exportadas

| Módulo | Métodos |
| --- | --- |
| `authService` | `getCurrentSession`, `getCurrentUser`, `getUserStores`, `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `resetPasswordForEmail`, `updatePassword`, `signOut` |
| `storeService` | `getStoreBySlug`, `getStoreById`, `listAllStores`, `listStores`, `createStore`, `updateStore`, `softDeleteStore` |
| `productService` | `listProducts`, `listProductsForPOS`, `listPublicCatalogProducts`, `getProductById`, `createProduct`, `updateProduct`, `softDeleteProduct`, `listCategories`, `createCategory`, `importProductsBulk` |
| `categoryService` | `listCategories`, `createCategory`, `updateCategory`, `deleteCategory` |
| `productImageService` | listagem, upload biblioteca/produto, attach, primary, reorder, remove |
| `storageService` | `uploadProductImage`, `deleteProductImage`, `uploadStoreLogo` |
| `inventoryService` | saldos, movimentos, lotes, `applyMovement` (RPC), centros de custo, motivos de perda, import, disposições de lote |
| `orderService` | `listOrders`, `createOrder` (RPC), `cancelOrder` (RPC `restore_sale_stock`), `updateOrderStatus` |
| `customerService` | list/get/create/update/`softDeleteCustomer` |
| `supplierService` | list/create/update/`softDeleteSupplier` |
| `purchasingService` | list/create/`receivePurchaseOrder` (RPC) |
| `userService` | usuários plataforma, membros da loja, convite, papéis, delete via RPC |
| `globalAdminService` | `listEntities`, `hardDelete` (RPC `global_admin_delete`) |
| `notificationService` | list, mark read, `generateStockAlerts` (RPC) |
| `auditService` | `listAuditLogs`, `logAction` |
| `reportService` | `getDashboardMetrics`, `getGlobalAdminMetrics` |

## Utils

`cn.ts`, `currency.ts`, `dates.ts`, `barcode.ts`, `export.ts`, `importParser.ts`, `errorHandler.ts`.

## Tipos

Reexport em `src/types/index.ts`: `database`, `auth`, `store`, `product`, `inventory`, `order`. Também existem `customer.types.ts`, `supplier.types.ts`, `purchasing.types.ts`, `user.types.ts` fora do barrel.

## i18n

Locales: `pt-BR` (padrão), `en-US`, `es-ES`. Tipagem do dicionário = `typeof ptBR`.

## QueryClient (`App.tsx`)

`refetchOnWindowFocus/Mount/Reconnect`: false; `retry`: 1; `staleTime`: 5 minutos; `gcTime`: 30 minutos.
