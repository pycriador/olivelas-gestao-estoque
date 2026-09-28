---
id: CONTRACT-OLIVELAS-CLIENT
title: Contratos cliente ↔ Supabase
type: Contract
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
source:
  - src/lib/supabase/client.ts
  - .env.example
  - src/services/
---

# Contratos

Não há OpenAPI neste repositório. O contrato é o **PostgREST / RPC / Auth / Storage** do projeto Supabase, tipado em `src/types/database.types.ts` e chamado pelos services.

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

## Realtime

Eventos `postgres_changes` em `public.stock_balances` (`*`), `public.orders` (`*`), `public.notifications` (`INSERT`), filtro `store_id=eq.{storeId}`. Invalidam query keys TanStack listadas em `useRealtime.ts`.

## Storage

Buckets `products`, `stores`, `avatars`. APIs em `storageService` / `productImageService`.

## Query string de listagens

Contrato de UI (não HTTP próprio): `useTablePagination` grava `page`, `pageSize`, `search`, `sortBy`, `sortOrder` e demais chaves como filtros. Compartilhável por URL.

## Quebras conhecidas no histórico SQL

Migration 09 documenta que o fluxo antigo (inserts + `process_sale_stock_deduction` sem tratar erro) permitia estoque inconsistente; o contrato vigente de criação de venda é a RPC atômica.
