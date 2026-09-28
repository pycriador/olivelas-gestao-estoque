---
id: CTX-OLIVELAS-AI
title: Contexto para agentes e engenharia
type: Context
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
related:
  - REF-OLIVELAS-INDEX
  - CTX-OLIVELAS-OVERVIEW
  - ARCH-OLIVELAS-SYSTEM
---

# Contexto AI-ready — Olivelas

## O que é este sistema

SPA React (Vite) de gestão multi-loja de estoque e vendas. O browser fala com o projeto Supabase (Auth, PostgreSQL com RLS, Storage, Realtime, RPCs). Não há servidor de API próprio neste repositório.

## Pergunta → onde ler

| Pergunta | Documento |
| --- | --- |
| Para que serve e o que está fora do escopo? | [overview.md](overview.md) |
| Como as peças se conectam? | [architecture.md](architecture.md) |
| Quais rotas, páginas e pastas `src/` existem? | [frontend-inventory.md](frontend-inventory.md) |
| Quais tabelas, RPCs e políticas RLS existem? | [backend-inventory.md](backend-inventory.md) |
| O que muda entre viewport &lt; 768px e ≥ 768px? | [ui-map.md](ui-map.md) |
| Como o front chama o banco? | [contracts.md](contracts.md) |
| Quem pode o quê? | [security.md](security.md) |
| Como rodar e publicar? | [operations.md](operations.md) |
| Replicar shell desktop em outro projeto | [guides/ui-desktop.md](guides/ui-desktop.md) |
| Replicar shell mobile em outro projeto | [guides/ui-mobile.md](guides/ui-mobile.md) |
| O que não sabemos / não está no repo | [knowledge-gaps.md](knowledge-gaps.md) |

## Regras de resposta

1. **Evidência vence texto antigo.** Se o código divergir deste Markdown, atualize o Markdown.
2. **Não inventar.** Nomes de tabela, RPC, rota e classe CSS só se aparecerem no repo.
3. **Classificar.** `Confirmed` (arquivo citado), `Inferred` (dedução marcada), `Unknown` (não está no repo).
4. **`PermissionGate`** existe em `src/routes/PermissionGate.tsx` e **não é importado por nenhuma page** (busca em `src/` em 2026-09-27). Permissões no UI dependem de `usePermissions` onde as pages chamam o hook, e de RLS no banco.

## Restrições do produto (código)

- Tenant ativo: `useTenant()` / `authStore.activeStore`. `storeId === 'all'` é visão global do admin, não uma loja real (`AppLayout` não assina Realtime nesse caso).
- Isolamento: políticas RLS + helpers `is_global_admin`, `has_store_access`, `has_store_role` (`supabase/migrations/20260925000002_rls_policies.sql`).
- Venda atômica: `orderService.createOrder` chama RPC `create_order_with_stock`.
- Build Pages: `VITE_BASE_PATH` no workflow `.github/workflows/deploy.yml`.
