---
id: SEC-OLIVELAS
title: Segurança
type: Security
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-28
language: pt-BR
classification: Confirmed
source:
  - supabase/migrations/20260925000002_rls_policies.sql
  - supabase/migrations/20260927000011_harden_grants_and_legacy_rpcs.sql
  - supabase/migrations/20260927000012_fix_cancelled_order_hard_delete.sql
  - supabase/migrations/20260927000013_global_admin_profile_policies.sql
  - supabase/migrations/20260927000014_global_admin_delete_auth_user.sql
  - supabase/migrations/20260927000015_revoke_internal_helpers_from_authenticated.sql
  - supabase/migrations/20260927000016_close_authenticated_default_on_new_functions.sql
  - src/routes/ProtectedRoute.tsx
  - src/hooks/usePermissions.ts
---

# Segurança

Modelo: **confiança no PostgreSQL (RLS + SECURITY DEFINER seletivo)**. O frontend escolhe `store_id` da sessão; isso **não** substitui RLS.

## Identidade

- Supabase Auth (`auth.users`) ↔ `public.profiles` (`handle_new_user`).
- Flag `profiles.is_global_admin`.
- Papel por loja em `store_users.role`.

## Fronteiras de confiança

| Fronteira | Controle |
| --- | --- |
| Browser | SPA pública no Pages; chave **anon/publishable** no bundle |
| PostgREST | JWT; RLS |
| Storage | policies por bucket e primeiro segmento do path |
| RPCs | `GRANT` explícito para `authenticated` na migration 11; `anon`, `PUBLIC`, `authenticated` e `service_role` sem EXECUTE; funções novas perdem todo EXECUTE default via evento `fn_revoke_default_function_exec` (migrations 11 e 16) |

### anonymous com EXECUTE (achado de 2026-09-27)

A auditoria do banco de produção mostrou que **todas** as funções privileged de estoque e venda tinham `anon=X/postgres` explícito em `proacl`, alcançáveis por qualquer visitante com a chave pública, sem sessão. Duas causas:

- O Supabase cria `ALTER DEFAULT PRIVILEGES` com `anon=X` para funções no schema `public`.
- O `REVOKE ALL ... FROM PUBLIC` das migrations anteriores não removia isso: um grant explícito para `anon` só sai com `REVOKE` do próprio `anon`.

Corrigido na migration 11, que revoga de `PUBLIC` e `anon` por função e dá `GRANT` explícito a `authenticated` para as 9 RPCs que o app usa.

Sobre funções **futuras**: `ALTER DEFAULT PRIVILEGES ... FROM PUBLIC` não resolve, porque o EXECUTE para `PUBLIC` é default implícito do Postgres e o `pg_default_acl` gerado é descartado (verificado no PG 17). Quem fecha isso é o event trigger `trg_revoke_default_function_exec`, que roda em `ddl_command_end`. A migration 11 fechava só `PUBLIC`/`anon`; a migration 16 ampliou o revoke para `authenticated` e `service_role`, verificando que uma função recém-criada nasce com `anon=false authenticated=false service_role=false`. **Consequência para quem escreve migration: toda RPC nova precisa de `GRANT EXECUTE ... TO authenticated`, senão o app perde acesso.** O teste `15_grants.sql` (G7/G7b/G8) cobre esse contrato.

Duas correções de fechamento da auditoria de 2026-09-27:

- **Helpers internos (migration 15):** `restore_stock_after_delete` e `seed_default_cost_centers` eram executáveis por qualquer `authenticated` (o default do Supabase concedia, e a 11 só revogava `PUBLIC`/`anon`). `restore_stock_after_delete` é SECURITY DEFINER e reverte saldo de qualquer loja — comprovável por um usuário sem vínculo levando o saldo de 45 para 50 em produção. A 15 revoga `authenticated`/`service_role` dos dois e ainda adiciona guard interno (`is_global_admin`) no corpo do primeiro. `global_admin_delete` continua funcionando porque, sendo SECURITY DEFINER, chama o helper com o privilégio do dono.
- **Default de funções novas (migration 16):** mesmo após a 11, função nova nascia com `authenticated=true service_role=true`. A 16 faz o event trigger revogar também esses dois, fechando a classe: RPC nova não nasce executável por ninguém sem GRANT explícito.

`process_sale_stock_deduction` (legada) perdeu EXECUTE para todos e recebeu guard interno: recusa estoque insuficiente em vez de inserir linha de saldo negativo, que era a origem do histórico de saldos quebrados.

## Autorização no UI

- `ProtectedRoute`: sessão + opcional global admin.
- `usePermissions`: mapa TypeScript por papel (espelha em grande parte o seed, mas **não** consulta `role_permissions`).
- `PermissionGate`: componente pronto, **não usado** nas pages.

Qualquer “esconder botão” é UX. Operações indevidas devem falhar no RLS/RPC.

## Padrões RLS (migration 02, simplificado)

- **Perfil:** usuário vê/edita o próprio `profiles` (policies posteriores em 13 para admin global).
- **Lojas:** membro ou catálogo público ativo; insert autenticado / global admin; update admin da loja ou global; delete (soft) global admin.
- **Cadastros com `store_id`:** `has_store_access` no SELECT; papéis staff no write (varia: produtos, estoque, compras, pedidos).
- **Produtos SELECT:** membro **ou** produto publicado no catálogo (`is_published_catalog` e loja ativa — ver SQL exato).
- **Imagens de produto SELECT:** policy `"Product images select: all"` (leitura ampla no SQL).
- **Pedidos INSERT:** staff **ou** checkout público (condição na policy; o catálogo atual usa WhatsApp).
- **Catálogos:** SELECT público; modify store admin.
- **Notificações:** destinatário ou staff da loja.

Detalhe fino: abrir o arquivo `20260925000002_rls_policies.sql`. Não copiar USING clauses da memória.

## Hard delete global

`global_admin_delete` e `global_admin_delete_platform_user`: restritos a global admin (corpo SQL). Recusam exclusão quando há histórico comercial, conforme comentários da migration 10. Auditoria na mesma transação.

## Estoque

Baixas de venda: RPC atômica 09. Restore no cancelamento: `restore_sale_stock`. Movimentos manuais: `apply_stock_movement`. Hard delete de pedido: `restore_stock_after_delete` (10, ajustada em 12 para não reverter uma segunda vez a venda de um pedido já cancelado; acesso restrito a global admin desde a migration 15).

## Dados no browser

localStorage: perfil, lojas, loja ativa, tema, locale, token Supabase. Não é cofre; sessão comprometida no dispositivo = acesso até expirar/revogar.

## Superfície de ataque (existente, não explorada aqui)

SPA + anon key + RLS. Catálogo público lê produtos publicados. Storage buckets marcados `public` para leitura.

Não há neste repo: WAF, rate limit de aplicação, CSP headers custom, SAST CI (lint `oxlint` no workflow com `|| true`).

## Relacionamentos

- [backend-inventory.md](backend-inventory.md)
- [contracts.md](contracts.md)
