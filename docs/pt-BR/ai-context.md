---
id: CTX-OLIVELAS-AI
title: Contexto para agentes e engenharia
type: Context
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
language: pt-BR
classification: Confirmed
related:
  - REF-OLIVELAS-INDEX
  - CTX-OLIVELAS-OVERVIEW
  - ARCH-OLIVELAS-SYSTEM
---

# Contexto AI-ready — Olivelas

## O que é este sistema

SPA React (Vite) de gestão SaaS multi-loja e multi-filial de estoque, PDV, BI e vendas. O browser fala com o projeto Supabase (Auth, PostgreSQL com RLS, Storage, Realtime, RPCs). Não há servidor de API próprio neste repositório, mas há integrador de APIs estilo Postman (`/integrations`), catálogo REST e tokens de acesso HBAC para integração com IAs externas e agentes autônomos.

## Pergunta → onde ler

| Pergunta | Documento |
| --- | --- |
| Para que serve e o que está fora do escopo? | [overview.md](overview.md) |
| Como as peças se conectam? | [architecture.md](architecture.md) |
| Quais rotas, páginas e pastas `src/` existem? | [frontend-inventory.md](frontend-inventory.md) |
| Quais tabelas, RPCs e políticas RLS existem? | [backend-inventory.md](backend-inventory.md) |
| O que muda entre viewport &lt; 768px e ≥ 768px? | [ui-map.md](ui-map.md) |
| Como o front chama o banco e integrações? | [contracts.md](contracts.md) |
| Como integrar com IAs externas via REST/HBAC? | [api-ai-integration.md](api-ai-integration.md) |
| Quem pode o quê? | [security.md](security.md) |
| Como rodar, exportar backups e publicar? | [operations.md](operations.md) |
| Replicar shell desktop em outro projeto | [guides/ui-desktop.md](guides/ui-desktop.md) |
| Replicar shell mobile em outro projeto | [guides/ui-mobile.md](guides/ui-mobile.md) |
| O que não sabemos / não está no repo | [knowledge-gaps.md](knowledge-gaps.md) |

## Regras de resposta

1. **Evidência vence texto antigo.** Se o código divergir deste Markdown, atualize o Markdown.
2. **Não inventar.** Nomes de tabela, RPC, rota e classe CSS só se aparecerem no repo.
3. **Classificar.** `Confirmed` (arquivo citado), `Inferred` (dedução marcada), `Unknown` (não está no repo).
4. **`PermissionGate` e `usePermissions`:** `PermissionGate` (`src/routes/PermissionGate.tsx`) envolve as rotas de módulos em `src/routes/AppRoutes.tsx` (`MOD_CATALOG_WA`, `MOD_INVENTORY`, `MOD_EXPIRATION`, `MOD_POS_SALES`, `MOD_CUSTOMERS`, `MOD_SUPPLIERS`, `MOD_PURCHASING`, `MOD_REPORTS`, `MOD_TEAM_AUDIT`, `MOD_API_INTEGRATIONS`). O hook `usePermissions` combina o pacote SaaS ativo (`user_subscriptions` / `saas_permission_groups`) com o papel da loja (`store_users.role`), papel customizado (`store_custom_roles`) e 47 permissões granulares (`granted_permissions` / `revoked_permissions`).

## Restrições do produto (código)

- Tenant ativo: `useTenant()` / `authStore.activeStore`. `storeId === 'all'` é visão global consolidada do admin (`DashboardPage` e `ReportsPage` suportam consulta consolidada quando `storeId === 'all'`; `AppLayout` não assina Realtime nesse caso).
- Hierarquia Matriz → Filiais: lojas filiais possuem `is_branch = true` e `parent_store_id` apontando para a Matriz. Transferência de lotes sem venda usa a RPC `execute_stock_transfer_to_branch`.
- Alçada de Baixa de Estoque: baixas manuais (`LOSS` ou `ADJUSTMENT` negativo) exigem validação por `can_user_approve_writeoff`; operadores sem alçada abrem solicitações em `stock_writeoff_requests` revisadas via `review_stock_writeoff_request`.
- Visões Salvas por Loja/Filial: filtros de status (múltipla seleção) e período em `/customers` são persistidos no banco por `store_id` na tabela `public.store_saved_views` (`savedViewService.ts`).
- Reset Obrigatório de PIN & Política de Complexidade (`/team/:employeeId`): `store_users.require_pin_reset` e `store_users.pin_requirements` (JSONB) com validação e troca via RPC `complete_employee_pin_reset`.
- Configurador Comercial Interativo, Novos Contratos & Gerenciador de Contratos (`/`, `/pricing`, `/global-admin/finance/plans`, `/global-admin/contracts`): planos vinculados à Landing Page via `permission_groups.show_on_landing_page` / `is_highlighted_on_landing`; pré-cadastro comercial salvo em `public.commercial_plan_proposals` (`submit_commercial_proposal`); e gerenciador de contratos (`public.platform_contracts` + `contractService.ts`) com exportação em HTML, DOCX e PDF, armazenamento no Supabase Storage e sincronização com o Google Drive do Global Admin.
- Isolamento: políticas RLS + helpers `is_global_admin`, `has_store_access`, `has_store_role` e `has_hbac_scope`.
- Venda atômica: `orderService.createOrder` chama RPC `create_order_with_stock` (garantindo associação de `"Cliente Genérico"` quando nenhum cliente é informado).
- Build Pages: `VITE_BASE_PATH` no workflow `.github/workflows/deploy.yml`.
