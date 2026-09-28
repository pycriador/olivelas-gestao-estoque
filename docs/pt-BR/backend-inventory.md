---
id: ARCH-OLIVELAS-BACKEND
title: Inventário backend (Supabase)
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
source:
  - supabase/migrations/
  - supabase/seed/seed.sql
---

# Inventário backend

Ordem incremental observada (arquivos datados):

1. `20260925000001_initial_schema.sql`
2. `20260925000002_rls_policies.sql`
3. `20260925000003_functions_rpcs.sql`
4. `20260925000004_storage_security.sql`
5. `20260925000005_media_library.sql`
6. `20260925000006_stock_writeoff.sql`
7. `20260926000007_expiration_dispositions.sql`
8. `20260926000008_stock_alerts.sql`
9. `20260926000009_atomic_order_creation.sql`
10. `20260926000010_global_admin_delete.sql`
11. `20260927000011_harden_grants_and_legacy_rpcs.sql`
12. `20260927000012_fix_cancelled_order_hard_delete.sql`
13. `20260927000013_global_admin_profile_policies.sql`
14. `20260927000014_global_admin_delete_auth_user.sql`

Mais `FULL_DATABASE_SETUP.sql` (snapshot; ver [architecture.md](architecture.md)).

## Enums (`initial_schema`)

`user_role_enum`, `order_status_enum`, `order_channel_enum`, `payment_method_enum`, `payment_status_enum`, `stock_movement_type_enum`, `batch_status_enum`, `purchase_order_status_enum`.

Depois: `expiration_action_enum` (`PURCHASED`, `RETURNED`, `WRITTEN_OFF`, `DISCARDED`, `KEPT`, `ON_HOLD`) em `20260926000007`.

## Tabelas

### Identidade e tenant

| Tabela | Papel |
| --- | --- |
| `profiles` | 1:1 `auth.users`; `is_global_admin` |
| `stores` | tenant; `slug` único; `theme_config`; `deleted_at` |
| `store_users` | membership `store_id` + `user_id` + `role` |
| `roles`, `permissions`, `role_permissions` | catálogo de permissões (seed) |

### Cadastro

`categories`, `brands`, `manufacturers`, `suppliers`, `supplier_contacts`, `customers`, `customer_addresses`, `products`, `product_images`, `media_library` (migration 05).

### Estoque

`stock_balances` (`available_quantity` gerada), `stock_batches`, `stock_movements`, `inventory_counts`, `inventory_count_items`, `cost_centers`, `loss_reasons` (writeoff 06), `batch_dispositions` (07).

### Comercial

`purchase_orders`, `purchase_order_items`, `orders`, `order_items`, `payments`, `shipments`, `catalogs`.

### Operação

`notifications`, `audit_logs`, `security_logs`.

## Helpers RLS (migration 02)

| Função | Uso |
| --- | --- |
| `is_global_admin()` | `profiles.is_global_admin` do `auth.uid()` |
| `has_store_access(uuid)` | membro ativo da loja ou global admin |
| `has_store_role(uuid, user_role_enum[])` | papel na loja ou global admin |

Políticas nomeadas por tabela estão em `20260925000002_rls_policies.sql` e alterações posteriores (`media_library`, writeoff, profile policies 13). Resumo operacional: [security.md](security.md).

## RPCs / funções (nome exato)

Usadas pelo frontend (`supabase.rpc`):

| RPC | Service |
| --- | --- |
| `create_order_with_stock` | `orderService.createOrder` |
| `restore_sale_stock` | `orderService.cancelOrder` |
| `receive_purchase_order_stock` | `purchasingService.receivePurchaseOrder` |
| `apply_stock_movement` | `inventoryService.applyMovement` |
| `set_batch_disposition` | `inventoryService.setBatchDisposition` |
| `clear_batch_disposition` | `inventoryService.clearBatchDisposition` |
| `generate_stock_alerts` | `notificationService.generateStockAlerts` |
| `global_admin_delete` | `globalAdminService.hardDelete` |
| `global_admin_delete_platform_user` | `userService.deleteUser` |

Definidas no SQL e **não** listadas acima como chamada direta no `src/services` (podem ser internas, trigger ou legado):

| Função | Onde |
| --- | --- |
| `process_sale_stock_deduction` | 03; endurecida em 11 (legado vs `create_order_with_stock`) |
| `handle_new_user` | trigger de perfil |
| `seed_default_cost_centers` | writeoff 06 |
| `trg_seed_cost_centers_for_store` | 06 |
| `touch_batch_disposition_updated_at` | 07 |
| `restore_stock_after_delete` | 10 / 12 (helper de hard delete) |
| `fn_revoke_default_function_exec` | 11 (revoke de EXECUTE em funções novas) |

## Storage

Buckets públicos: `products`, `stores`, `avatars` (`20260925000004_storage_security.sql`).

Paths documentados no próprio SQL:

- produtos: `{store_id}/{product_id}/{filename}`
- loja: `{store_id}/{filename}`
- avatars: `{user_id}/{filename}`

SELECT público nos três buckets; INSERT/DELETE de produtos para `STORE_ADMIN`/`INVENTORY` ou global admin; assets da loja para `STORE_ADMIN` ou global admin; avatar para o próprio `user_id`.

## Seed (`supabase/seed/seed.sql`)

Roles sistema: `GLOBAL_ADMIN`, `STORE_ADMIN`, `FINANCE`, `SELLER`, `INVENTORY`, `VIEWER`.

Permissões `module.code` (exemplos): `products.*`, `inventory.*`, `sales.*`, `customers.*`, `suppliers.*`, `purchase_orders.*`, `reports.*`, `stores.manage`, `users.manage`, `roles.manage`, `permissions.manage`.

Mapeamento seed: `STORE_ADMIN` recebe todas as permissões da tabela `permissions`; demais papéis recebem subconjuntos listados no seed.

**Nota:** o frontend `usePermissions` **não lê** `role_permissions` do banco; usa `ROLE_PERMISSIONS_MAP` hardcoded. RLS continua sendo a barreira real. Classificação: Confirmed.
