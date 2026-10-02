---
id: CONTRACT-OLIVELAS-CLIENT
title: Contratos cliente ↔ Supabase & Integrações
type: Contract
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-02
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

Via `apiKeyService` e tabela `public.api_keys`:
- Formato do token exposto: `olv_live_<32_hex_chars>`.
- Armazenamento seguro: hash SHA-256 no banco de dados (`key_hash`), prefixo visível para auditoria (`key_prefix`), escopos em `jsonb` (`scopes`).
- Escopos HBAC disponíveis: `*` (Full Admin), `products:*`, `inventory:*`, `orders:*`, `purchases:*`, `customers:*`, `reports:*`, `audit:*`.
- Isolamento: `store_id` (loja específica) ou `null` (token de alcance global multi-loja).

## Tabelas (PostgREST)

Cada service usa `supabase.from('<tabela>')` com filtros `store_id` no cliente **e** RLS no servidor. Lista de tabelas: [backend-inventory.md](backend-inventory.md).

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

`create_order_with_stock`: pedido + itens + pagamento + baixa com `FOR UPDATE` (comentário e corpo em `20260926000009_atomic_order_creation.sql`).

## Catálogo de Relatórios Analíticos (`reportService.ts`)

Módulos consolidados para consumo em tela e integrações:
1. `getRetailSummaryKPIs(storeId)`: Resumo executivo macro.
2. `getValuationReport(storeId)`: Valorização do estoque a custo e venda, markup e margem por SKU.
3. `getAbcCurveReport(storeId)`: Curva ABC de Pareto 80/15/5 com diretrizes estratégicas.
4. `getConsumptionDemandReport(storeId)`: Giro de estoque, runout em dias, sugestão inteligente de compra para 30 dias e urgência.
5. `getCustomerTicketReport(storeId)`: LTV, ticket médio por cliente, recência e segmentação VIP/Frequente/Ocasional/Inativo.
6. `getCapitalInvestmentReport(storeId)`: Capital investido por categoria, potencial de venda, margem e GMROI.
7. `getPurchasingReport(storeId)`: Histórico de ordens de compra e recebimentos.
8. `getLossesReport(storeId)`: Perdas, avarias, vencimentos e centros de custo.
9. `getStockoutsReport(storeId)`: Ruptura total e alertas de estoque crítico com custo de reposição.
10. `getSalesPerformanceReport(storeId)`: Faturamento, canais e desempenho de pedidos.

## Realtime

Eventos `postgres_changes` em `public.stock_balances` (`*`), `public.orders` (`*`), `public.notifications` (`INSERT`), filtro `store_id=eq.{storeId}`. Invalidam query keys TanStack listadas em `useRealtime.ts`.

## Storage

Buckets `products`, `stores`, `avatars`. APIs em `storageService` / `productImageService`.

## Query string de listagens

Contrato de UI (não HTTP próprio): `useTablePagination` grava `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, `tab`, `category`, `status` como filtros na URL. Compartilhável e reidratável.

## Quebras conhecidas no histórico SQL

Migration 09 documenta que o fluxo antigo (inserts + `process_sale_stock_deduction` sem tratar erro) permitia estoque inconsistente; o contrato vigente de criação de venda é a RPC atômica.
