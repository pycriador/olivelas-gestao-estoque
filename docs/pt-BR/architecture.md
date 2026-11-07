---
id: ARCH-OLIVELAS-SYSTEM
title: Arquitetura do sistema
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-11-07
language: pt-BR
classification: Confirmed
source:
  - src/App.tsx
  - src/lib/supabase/client.ts
  - vite.config.ts
  - .github/workflows/deploy.yml
---

# Arquitetura

Níveis usados: **Contexto → Sistema → Unidades deployáveis → Componentes → Implementação**. Não há segundo runtime de API neste repo.

## Contexto

```mermaid
flowchart LR
  Browser[Browser SPA]
  GH[GitHub Pages]
  SB[Supabase PostgreSQL + Auth + Storage + Realtime + RPCs + pgcrypto AI Vault]
  LLM[Provedores LLM: Google Gemini / OpenAI / Anthropic Claude / Custom Endpoint]
  WA[WhatsApp externo]
  AI[Agentes IA / ERPs Externos via HBAC & API Studio]
  Browser --> GH
  Browser --> SB
  Browser --> LLM
  Browser -.-> WA
  AI --> SB
```

- **GitHub Pages** serve o `dist/` gerado pelo Vite (workflow `deploy.yml`).
- **Supabase** autentica, guarda dados isolados por RLS, armazena chaves de IA criptografadas com `pgcrypto`, arquivos e publica mudanças Realtime.
- **Provedores LLM (Gemini, OpenAI, Claude, Custom)** são acionados pelo orquestrador `aiOrchestratorService.ts` com Context Prompt Injection, Anti-Prompt Injection e Fallback Multi-Nível (`Primário → Secundário → Contingência Analítica Local`).
- **WhatsApp** é aberto via URL a partir do catálogo público; não há SDK WhatsApp no `package.json`.
- **Agentes Externos / IA** consomem o PostgREST e a RPC `get_ai_report` autenticados via cabeçalho `X-HBAC-Token`.

## Sistema

Uma aplicação: `package.json` name `olivelas-gestao-estoque`. React 19, React Router 7, TanStack Query 5, Zustand, Tailwind 3, cliente `@supabase/supabase-js`.

`App.tsx`: `QueryClientProvider` (staleTime 5 min), `BrowserRouter` com `basename={import.meta.env.BASE_URL}`, `Toaster` sonner `top-right`, `initAuth()` no mount.

## Unidades deployáveis

| Unidade | Onde | Papel |
| --- | --- | --- |
| SPA estática | `dist/` após `npm run build` | UI |
| Projeto Supabase | migrations em `supabase/migrations/` | Auth, DB, Storage, RPCs, Realtime, HBAC |

`FULL_DATABASE_SETUP.sql` é um arquivo agregado no mesmo diretório de migrations. **Não tratar como migration adicional** sem conferir o que já foi aplicado no projeto remoto (risco de duplicar objetos). Fonte canônica incremental: arquivos datados `20260925000001` … `20261103000029`.

## Componentes de responsabilidade (não cada arquivo)

| Componente | Responsabilidade | Não-responsabilidade |
| --- | --- | --- |
| Rotas, `ProtectedRoute` e `PermissionGate` | Shell marketing / auth / app / catálogo e guarda de módulos SaaS + permissões granulares | Transações SQL |
| Stores Zustand | Sessão (`authStore`), tema (`themeStore`), carrinho público (`cartStore`), i18n | RLS |
| Services | Chamadas `supabase.from` / `rpc` (`orderService`, `inventoryService`, `reportService`, `customerService`, `savedViewService`, `saasBillingService`, `contractService`, `aiOrchestratorService`, etc.) | Render |
| PostgreSQL + RLS + RPCs | Isolamento multi-tenant, vendas atômicas, alçada de baixa (`can_user_approve_writeoff`), remessa entre filiais (`execute_stock_transfer_to_branch`), cofre `pgcrypto` de IA (`upsert_ai_provider_config`, `resolve_ai_execution_runtime`) | Layout |
| Storage | Imagens produtos/loja/avatar | Metadados de produto (tabelas SQL) |

## Fluxo de sessão (implementação)

1. `authStore.initAuth` → `authService.getCurrentUser` + `getUserStores` + perfil de permissões SaaS (`saasBillingService.getUserPermissionProfile`).
2. Cache em `localStorage`: `olivelas_user_profile`, `olivelas_user_stores`, `olivelas_active_store_id`.
3. Token Supabase: `storageKey: 'olivelas_supabase_auth_token'` e `fetch` com `credentials: 'omit'`.
4. `ProtectedRoute`: loading spinner; se não autenticado → `/login`; se `requireGlobalAdmin` e não admin → `/dashboard`.
5. `PermissionGate`: valida se o módulo/recurso está habilitado no pacote SaaS do usuário e nas permissões do funcionário.

## Organização de `src/`

```text
src/
  components/admin|ai|commercial|common|inventory|products|sales|settings|team|ui
  constants/      featureDependencies.ts, granularPermissions.ts
  hooks/          useAuth, useTenant, usePermissions, useRealtime, useI18n, useTheme, useTablePagination
  i18n/           pt-BR, en-US, es-ES
  layouts/        AppLayout, AuthLayout, PublicLayout
  lib/            supabase/client.ts, storeThemes.ts
  pages/          36 páginas (incluindo Copilot IA da Loja, Central de IA no Global Admin, Novos Contratos & Gerenciador de Contratos e rotas dedicadas de edição do Global Admin e Equipe)
  routes/         AppRoutes, ProtectedRoute, PermissionGate
  services/       26 services de domínio (incluindo aiOrchestratorService.ts e bulkStoreBuilderService.ts)
  stores/         authStore, cartStore, themeStore
  types/          database.types.ts e tipos de domínio
  utils/          formatters, currency, barcode, dates, export, importParser, productUtils, errorHandler
scripts/          bulk-store-builder.mjs, specs/primor.json
.agents/skills/   bulk-store-creator/SKILL.md
```

Alias `@` → `./src` (`vite.config.ts`).

## Relacionamentos

- Inventário UI: [frontend-inventory.md](frontend-inventory.md)
- Inventário dados: [backend-inventory.md](backend-inventory.md)
- Contratos: [contracts.md](contracts.md)
