---
id: ARCH-OLIVELAS-BACKEND
title: Inventário backend (Supabase)
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
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
15. `20260927000015_revoke_internal_helpers_from_authenticated.sql`
16. `20260927000016_close_authenticated_default_on_new_functions.sql`
17. `20261002000017_api_tokens.sql`
18. `20261015000018_fix_restore_stock_after_delete_cancelled_orders.sql`
19. `20261019000019_allow_delete_cancelled_orders_on_edit.sql`
20. `20261028000020_hbac_api_integration.sql`
21. `20261029000021_external_api_integrator.sql`
22. `20261030000022_permission_groups_and_billing.sql`
23. `20261030000023_staff_roles_approvers_and_branches.sql`
24. `20261030000024_global_finance_licensing_rules.sql`
25. `20261030000025_store_saved_views.sql`
26. `20261030000026_employee_pin_reset_and_policy.sql`
27. `20261030000027_landing_leads_and_contracts.sql`

Mais `FULL_DATABASE_SETUP.sql` (snapshot; ver [architecture.md](architecture.md)).

## Enums (`initial_schema` e posteriores)

`user_role_enum` (`GLOBAL_ADMIN`, `STORE_ADMIN`, `STOCK_APPROVER`, `FINANCE`, `SELLER`, `INVENTORY`, `VIEWER`), `order_status_enum`, `order_channel_enum`, `payment_method_enum`, `payment_status_enum`, `stock_movement_type_enum`, `batch_status_enum`, `purchase_order_status_enum`.

Depois: `expiration_action_enum` (`PURCHASED`, `RETURNED`, `WRITTEN_OFF`, `DISCARDED`, `KEPT`, `ON_HOLD`) em `20260926000007`.

## Tabelas

### Identidade e tenant

| Tabela | Papel |
| --- | --- |
| `profiles` | 1:1 `auth.users`; `is_global_admin` |
| `stores` | tenant; `slug` único; `theme_config`; `deleted_at`; hierarquia de filiais (`parent_store_id`, `branch_code`, `is_branch`, `manager_name`); exceções de licenciamento de equipe (`free_employees_limit`, `extra_employee_price`) |
| `store_users` | membership `store_id` + `user_id` + `role` + credenciais granulares de funcionário (`job_title`, `employee_registration`, `custom_role_id`, `can_approve_writeoff`, `approval_pin`, `require_pin_reset`, `pin_requirements`, `pin_updated_at`, `max_writeoff_value`, `granted_permissions`, `revoked_permissions`) |
| `store_custom_roles` | papéis operacionais customizados por loja (`code`, `name`, `base_role`, `permissions`, `can_approve_writeoff`, `max_writeoff_value`) |
| `roles`, `permissions`, `role_permissions` | catálogo de permissões (seed + 24 permissões granulares adicionais na migration 23) |
| `permission_modules` | catálogo de módulos de tela comercializáveis com preço mensal (`monthly_price`) |
| `permission_groups` | pacotes comerciais de permissões (ex.: Catálogo WhatsApp, Controle de Estoque, ERP Completo) com preços base e flags de vinculação na Landing Page (`show_on_landing_page`, `is_highlighted_on_landing`) |
| `commercial_plan_proposals` | solicitações de pré-cadastro e propostas personalizadas criadas pelo visitante na Landing Page ("Novos Contratos"), com Nome (`customer_name`), E-mail (`customer_email`), Celular/WhatsApp (`customer_phone`), plano base (`plan_id`, `plan_name`, `base_plan_price`), módulos adicionais avulsos (`addon_modules`, `addons_price`), ciclo, protocolo (`protocol_code`) e status comercial (`NEW`, `CONTACTED`, `CONTRACT_GENERATED`, `SIGNED`, `ARCHIVED`) |
| `platform_contracts` | contratos comerciais emitidos no Gerenciador de Contratos pelo Global Admin (`contract_number`, `title`, `provider_name`, `customer_name`, `product_name`, `addon_modules`, `monthly_value`, `custom_terms`, `rendered_html`, `supabase_storage_path`, `supabase_public_url`, `google_drive_file_id`, `google_drive_web_link`, `status`) |
| `user_permission_profiles` | perfil efetivo de permissões e assinatura por usuário (`enabled_modules`, `enforce_over_store_admin`, `agreed_monthly_value`, `payment_status`, `next_due_date`) |
| `subscription_payments` | livro-razão de faturas e histórico de pagamentos SaaS por usuário (`reference_month`, `amount`, `paid_amount`, `payment_method`, `status`, `due_date`, `paid_at`) |
| `global_billing_rules` | regras globais de licenciamento comercial SaaS (franquia padrão `default_free_employees_per_store = 10`, preço por funcionário excedente `extra_employee_price = 19.90`, carência e cobrança de filiais) |
| `permission_billing_audit_logs` | trilha de auditoria imutável de alterações de grupo, módulos, preços e baixas de pagamento |
| `store_saved_views` | visões de filtros salvas no banco de dados individualmente por loja ou filial (`store_id` + `page_key`, ex.: `customers`), armazenando `filters` (`jsonb`) como múltipla seleção de status de pedidos, status de cliente, período/datas e flag `is_default` |

### Cadastro

`categories`, `brands`, `manufacturers`, `suppliers`, `supplier_contacts`, `customers`, `customer_addresses`, `products`, `product_images`, `media_library` (migration 05).

### Estoque & Filiais

`stock_balances` (`available_quantity` gerada), `stock_batches`, `stock_movements`, `stock_writeoff_requests` (fila de aprovação de baixas de estoque pendentes/aprovadas/rejeitadas na migration 23), `stock_transfers` e `stock_transfer_items` (remessas/transferências de produtos entre Matriz e Filiais sem venda na migration 23), `inventory_counts`, `inventory_count_items`, `cost_centers`, `loss_reasons` (writeoff 06), `batch_dispositions` (07).

### Comercial

`purchase_orders`, `purchase_order_items`, `orders`, `order_items`, `payments`, `shipments`, `catalogs`.

### Operação & Integrações

`notifications`, `audit_logs`, `security_logs`, `api_tokens` (tokens de acesso HBAC `olv_live_...` com prefixo `key_prefix`, `store_id`, escopos `jsonb`, controle de validade `expires_at`, `is_active` e `last_used_at`), `api_integrations` (conectores de API externa estilo Postman por loja com `target_service`, `method`, `url`, `auth_type`, `auth_config`, `headers`, `query_params`, `response_root_path`, `unique_key_field` e `field_mappings`), `api_integration_logs` (histórico auditável de execuções e sincronizações de API externa por loja).

## Helpers RLS e HBAC (migrations 02 e 20)

| Função | Uso |
| --- | --- |
| `is_global_admin()` | `profiles.is_global_admin` do `auth.uid()` |
| `has_store_access(uuid)` | membro ativo da loja ou global admin |
| `has_store_role(uuid, user_role_enum[])` | papel na loja ou global admin |
| `get_request_hbac_token()` | extrai o cabeçalho HTTP `X-HBAC-Token` (ou `Authorization: Bearer olv_live_...`) do PostgREST |
| `get_request_store_id()` | extrai e valida UUID do cabeçalho HTTP `X-Store-ID` |
| `has_hbac_scope(uuid, text[])` | valida token HBAC ativo, não expirado, pertencente à loja (`store_id` ou global `NULL`) e detentor de ao menos um escopo requerido (ou `*`) |
| `check_hbac_pre_request()` | hook `pgrst.db_pre_request` no role `authenticator`; rejeita tokens inválidos/expirados (`28000`), inativos/outra loja/escopo insuficiente (`42501`) antes da execução da query |

Políticas nomeadas por tabela estão em `20260925000002_rls_policies.sql` e alterações posteriores (`media_library`, writeoff, profile policies 13). Resumo operacional: [security.md](security.md).

## RPCs / funções (nome exato)

Usadas pelo frontend (`supabase.rpc`):

| RPC | Service |
| --- | --- |
| `create_order_with_stock` | `orderService.createOrder` |
| `restore_sale_stock` | `orderService.cancelOrder` |
| `receive_purchase_order_stock` | `purchasingService.receivePurchaseOrder` |
| `apply_stock_movement` | `inventoryService.applyMovement` (endurecida na migration 23 com validação estrita `can_user_approve_writeoff` e alçada `max_writeoff_value`) |
| `review_stock_writeoff_request` | `inventoryService.reviewWriteoffRequest` (aprova ou rejeita solicitações pendentes de baixa, restrito a aprovadores de baixa de estoque) |
| `execute_stock_transfer_to_branch` | `inventoryService.executeStockTransferToBranch` (transfere produtos e lotes do estoque para uma filial sem venda, sincronizando catálogo, imagens e saldos no destino) |
| `upsert_store_employee` | `userService.upsertStoreEmployee` (cria/atualiza funcionário na loja com papel, matrícula, credencial de aprovador de baixa, política de pré-requisitos do PIN, flag de reset no próximo login e permissões granulares sem deslogar o admin atual) |
| `complete_employee_pin_reset` | `userService.completeEmployeePinReset` (conclui o reset obrigatório de PIN pelo próprio funcionário no login, validando contra `pin_requirements` e limpando `require_pin_reset`) |
| `submit_commercial_proposal` | `contractService.submitProposal` (registra proposta comercial personalizada e pré-cadastro a partir da Landing Page `/` ou `/pricing` para `anon` e `authenticated`, gerando protocolo `PROP-YYYYMMDD-XXXXXX`) |
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
| `restore_stock_after_delete` | 10 / 12 / 18 (helper de hard delete) |
| `fn_revoke_default_function_exec` | 11 / 16 (revoke de EXECUTE em funções novas) |
| `sync_stock_movement_from_api` | 20 (`BEFORE INSERT` trigger em `stock_movements` que preenche `previous_quantity`/`new_quantity` e sincroniza `stock_balances` em inserções diretas via REST) |
| `get_ai_report` | 20 (RPC analítica consolidada para agentes externos/IA via `GET`/`POST /rest/v1/rpc/get_ai_report`) |
| `user_has_effective_module` | 22 (verifica no banco se o usuário possui acesso efetivo ao módulo de tela considerando `user_permission_profiles` e `enforce_over_store_admin`) |

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
