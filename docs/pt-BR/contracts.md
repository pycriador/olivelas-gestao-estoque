---
id: CONTRACT-OLIVELAS-CLIENT
title: Contratos cliente ↔ Supabase & Integrações
type: Contract
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
language: pt-BR
classification: Confirmed
source:
  - src/lib/supabase/client.ts
  - .env.example
  - src/services/
---

# Contratos

Não há OpenAPI próprio neste repositório. O contrato é o **PostgREST / RPC / Auth / Storage** do projeto Supabase, tipado em `src/types/database.types.ts` e chamado pelos services, além dos endpoints REST para consumo por agentes e IAs externas documentados em [api-ai-integration.md](api-ai-integration.md).

## Cliente JS

`createClient(url, key)` com:

- `persistSession`, `autoRefreshToken`, `detectSessionInUrl`
- `storageKey: 'olivelas_supabase_auth_token'`
- `global.fetch` com `credentials: 'omit'` (ignora cabeçalhos `Set-Cookie` da infraestrutura Cloudflare como `__cf_bm` em chamadas `fetch`, já que a autenticação usa exclusivamente JWT no header `Authorization` + `localStorage`)
- Realtime `eventsPerSecond: 10`

`isSupabaseConfigured` é false se URL contém `placeholder` ou key é `placeholder_key`.

Variáveis lidas (`vite.config.ts` `envPrefix: ['VITE_', 'SUPABASE_']`):

| Nome | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` ou `SUPABASE_URL` | URL do projeto |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` | chave pública |
| `VITE_BASE_PATH` | `base` do Vite no `build` (dev usa `/`) |
| `VITE_APP_NAME`, `VITE_DEFAULT_LOCALE` | `.env.example`; **não** há leitura obrigatória no `client.ts` |

## Auth (Auth API Supabase)

Via `authService`: email/senha (`signInWithPassword` / `signUp`), `signInWithOAuth` provider `google`, recovery e `updateUser` senha, `signOut`.

## Tokens de API & Controle de Acesso HBAC

Via `apiKeyService` e tabela `public.api_tokens` (migrations 17 e 20):
- Formato do token exposto: `olv_live_<32_hex_chars>`.
- Armazenamento e auditoria: token completo em `token`, prefixo mascarado em `key_prefix`, escopos em `jsonb` (`scopes`), controle de expiração (`expires_at`), status (`is_active`) e carimbo de último uso (`last_used_at`).
- Cabeçalhos HTTP enviados por agentes externos ao PostgREST:
  - `apikey: <SUPABASE_PUBLISHABLE_OR_ANON_KEY>`
  - `Authorization: Bearer <SUPABASE_PUBLISHABLE_OR_ANON_KEY>`
  - `X-HBAC-Token: olv_live_...`
  - `X-Store-ID: <UUID_DA_LOJA>`
- Validação em duas camadas no PostgreSQL:
  1. Hook `pgrst.db_pre_request` (`public.check_hbac_pre_request()`): bloqueia imediatamente tokens inexistentes/expirados (`28000`), inativos (`42501`), divergência de `X-Store-ID` (`42501`) ou escopo incompatível com o endpoint/método HTTP (`42501`).
  2. RLS por linha (`public.has_hbac_scope(store_id, required_scopes)`): garante isolamento estrito por `store_id` em todas as tabelas de negócio (`products`, `categories`, `stock_balances`, `stock_batches`, `stock_movements`, `orders`, `order_items`, `payments`, `purchase_orders`, `purchase_order_items`, `suppliers`, `customers`, `customer_addresses`, `audit_logs`, `notifications`).
- Escopos HBAC disponíveis: `*` (Full Admin), `products:read|write|delete`, `inventory:read|write|adjust`, `orders:read|write|cancel`, `purchases:read|write`, `customers:read|write`, `reports:read|list|kpis|valuation|abc|stockouts|purchases|losses|sales`, `audit:read`.
- Isolamento: `store_id` (loja específica) ou `null` (token de alcance global multi-loja).

## Tabelas (PostgREST)

Cada service usa `supabase.from('<tabela>')` com filtros `store_id` no cliente **e** RLS no servidor (incluindo `public.store_saved_views` em `savedViewService.ts` para visões personalizadas de filtros por loja/filial). Lista de tabelas: [backend-inventory.md](backend-inventory.md).

## RPCs invocadas pelo front

Assinaturas completas estão nas migrations; o front passa os argumentos usados em:

| RPC | Arquivo caller |
| --- | --- |
| `create_order_with_stock` | `orderService.ts` |
| `restore_sale_stock` | `orderService.ts` |
| `receive_purchase_order_stock` | `purchasingService.ts` |
| `apply_stock_movement` | `inventoryService.ts` |
| `set_batch_disposition` / `clear_batch_disposition` | `inventoryService.ts` |
| `generate_stock_alerts` | `notificationService.ts` |
| `global_admin_delete` | `globalAdminService.ts` |
| `global_admin_delete_platform_user` | `userService.ts` |
| `get_ai_report` | Agentes externos / IA via REST (`GET`/`POST /rest/v1/rpc/get_ai_report`) e Explorador de Escopos em `GlobalApiKeyHbacPanel.tsx` |
| `assign_user_permission_group` | `saasBillingService.ts` |
| `record_subscription_payment` | `saasBillingService.ts` |
| `upsert_store_employee` | `userService.ts` |
| `complete_employee_pin_reset` | `userService.ts` (`EmployeePinResetModal.tsx`) |
| `submit_commercial_proposal` | `contractService.ts` (`InteractivePlanBuilderSection.tsx`) |
| `can_user_approve_writeoff` | `inventoryService.ts` / validação interna em `apply_stock_movement` e `review_stock_writeoff_request` |
| `review_stock_writeoff_request` | `inventoryService.ts` |
| `execute_stock_transfer_to_branch` | `inventoryService.ts` |

`create_order_with_stock`: pedido + itens + pagamento + baixa com `FOR UPDATE` (comentário e corpo em `20260926000009_atomic_order_creation.sql`).

## Catálogo de Relatórios Analíticos & Dashboard Executivo (`reportService.ts`)

Módulos consolidados para consumo em tela (`/dashboard` e `/reports`, ambos com suporte a `dateRange?: ReportDateRangeFilter` e `storeId === 'all'`) e integrações:
1. `getExecutiveDashboardData(params)`: Consolidado completo do Dashboard Executivo Multi-Loja (8 KPIs com variação vs. período anterior, séries diária/semanal/mensal, vendas mensais de 12 meses, comparativo Matriz vs. Filiais, Top Produtos, categorias, canais, pagamentos e alertas operacionais).
2. `getRetailSummaryKPIs(storeId, dateRange)`: Resumo executivo macro da Central de Relatórios.
3. `getValuationReport(storeId)`: Valorização do estoque a custo e venda, markup e margem por SKU.
4. `getAbcCurveReport(storeId)`: Curva ABC de Pareto 80/15/5 com diretrizes estratégicas.
5. `getConsumptionDemandReport(storeId, dateRange)`: Giro de estoque, runout em dias, sugestão inteligente de compra para 30 dias e urgência.
6. `getCustomerTicketReport(storeId, dateRange)`: LTV, ticket médio por cliente, recência, segmentação VIP/Frequente/Ocasional/Inativo e lista completa dos pedidos do cliente (`orders`) com data/hora e itens para deep-linking (`/customers?customerId=...&orderId=...`).
7. `getCapitalInvestmentReport(storeId)`: Capital investido por categoria, potencial de venda, margem e GMROI.
8. `getPurchasingReport(storeId, dateRange)`: Histórico de ordens de compra e recebimentos com data/hora exatas e resumo de itens comprados (`itemsSummary`).
9. `getLossesReport(storeId, dateRange)`: Perdas, avarias, vencimentos e centros de custo.
10. `getStockoutsReport(storeId)`: Ruptura total e alertas de estoque crítico com custo de reposição.
11. `getSalesPerformanceReport(storeId, dateRange)`: Faturamento, canais, meio de pagamento, itens detalhados e data/hora exatas de cada venda.

## Realtime

Eventos `postgres_changes` em `public.stock_balances` (`*`), `public.orders` (`*`), `public.notifications` (`INSERT`), filtro `store_id=eq.{storeId}`. Invalidam query keys TanStack listadas em `useRealtime.ts`.

## Storage

Buckets `products`, `stores`, `avatars`. APIs em `storageService` / `productImageService`.

## Query string de listagens e Deep-Linking

Contrato de UI (não HTTP próprio):
- `useTablePagination` grava `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, `tab`, `category`, `status` como filtros na URL (sincronizados de forma atômica via `latestParamsRef` e `setFilters`).
- Em `/customers`, a URL também sincroniza `?customerId=<uuid>&orderId=<uuid>&orderStatuses=PENDING,PROCESSING&period=30d&from=...&to=...&view=<viewId>`, permitindo compartilhar links diretos para o pedido de um cliente específico ou abrir visões salvas da loja/filial.

## Quebras conhecidas no histórico SQL

Migration 09 documenta que o fluxo antigo (inserts + `process_sale_stock_deduction` sem tratar erro) permitia estoque inconsistente; o contrato vigente de criação de venda é a RPC atômica.
