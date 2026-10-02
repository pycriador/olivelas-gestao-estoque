---
id: CTX-OLIVELAS-OVERVIEW
title: Visão do sistema
type: Context
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-02
language: pt-BR
classification: Confirmed
source:
  - README.md
  - src/routes/AppRoutes.tsx
  - supabase/migrations/20260925000001_initial_schema.sql
---

# Visão do sistema

## Problema que o código endereça

Operação de **várias lojas** (tenants) no mesmo banco, com usuários associados via `store_users`, produtos, estoque (saldos, lotes, movimentações, valorização de estoque, baixas em lote), pedidos/PDV, compras com margem e markup, 9 relatórios analíticos de varejo, central de backups multi-loja, gerenciamento de tokens HBAC para integração com IA externa, catálogo público por slug e painel de administrador global com CRUD dinâmico de banco de dados.

## Atores (implementados)

| Ator | Como entra | Evidência |
| --- | --- | --- |
| Visitante | `PublicLayout`: `/`, `/features`, `/pricing`, `/contact` | `AppRoutes.tsx` |
| Cliente do catálogo | `/store/:slug` sem login | `CatalogPublicPage.tsx` |
| Usuário autenticado | `/login`, `/register`, OAuth Google no `authService` | `authService.ts`, `AuthLayout` |
| Membro da loja | `AppLayout` + `ProtectedRoute` | papéis em `user_role_enum` |
| Global admin | `profiles.is_global_admin`; rota `/global-admin` com `requireGlobalAdmin` | `ProtectedRoute`, schema `profiles` |

Papéis de loja no enum SQL: `GLOBAL_ADMIN`, `STORE_ADMIN`, `FINANCE`, `SELLER`, `INVENTORY`, `VIEWER` (`20260925000001_initial_schema.sql`). Seed de `roles` / `permissions` / `role_permissions`: `supabase/seed/seed.sql`.

## Limite do sistema (o que este repo contém)

**Contém:** frontend SPA, migrations e seed SQL, workflow GitHub Pages, central de relatórios de varejo, backups relacionais (SQL/ZIP/JSON), gestor de tokens de API com HBAC e catálogo de IA.

**Não contém neste repositório (Unknown / ausente):** app iOS/Android nativo, BFF, gateway próprio, testes automatizados de UI, SLOs, runbooks de incidente, Dockerfile, Terraform.

## Não-objetivos observados no código

- Checkout de catálogo **não** grava pedido no banco pela UI pública: monta mensagem e abre WhatsApp (`CatalogPublicPage` + `cartStore`). Canal `WHATSAPP` / `CATALOG` existe no enum; o fluxo público usa WhatsApp.
- `PermissionGate` não envolve as rotas do `AppRoutes` (todas as páginas autenticadas passam só por `ProtectedRoute`).

## Relacionamentos

- Arquitetura: [architecture.md](architecture.md)
- Segurança: [security.md](security.md)
