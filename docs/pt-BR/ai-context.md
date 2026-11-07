---
id: CTX-OLIVELAS-AI
title: Contexto para agentes e engenharia
type: Context
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-11-07
language: pt-BR
classification: Confirmed
related:
  - REF-OLIVELAS-INDEX
  - CTX-OLIVELAS-OVERVIEW
  - ARCH-OLIVELAS-SYSTEM
---

# Contexto AI-ready — Olivelas

## O que é este sistema

SPA React (Vite) de gestão SaaS multi-loja e multi-filial de estoque, PDV, BI, vendas e Inteligência Artificial Nativa (`Google Gemini` principal + `OpenAI`, `Claude` e `Custom`). O browser fala com o projeto Supabase (Auth, PostgreSQL com RLS, Storage, Realtime, RPCs e Cofre de Chaves de IA com `pgcrypto`). Não há servidor de API próprio neste repositório, mas há orquestrador de IA multi-provedor (`aiOrchestratorService.ts`), Copiloto Chatbot da Loja (`/ai-copilot` + gaveta flutuante global), central de governança de IA do Super Admin (`/global-admin/ai`), integrador de APIs estilo Postman (`/integrations`), catálogo REST e tokens de acesso HBAC para integração com IAs externas e agentes autônomos.

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
4. **`PermissionGate` e `usePermissions`:** `PermissionGate` (`src/routes/PermissionGate.tsx`) envolve as rotas de módulos em `src/routes/AppRoutes.tsx` (`MOD_CATALOG_WA`, `MOD_INVENTORY`, `MOD_EXPIRATION`, `MOD_POS_SALES`, `MOD_CUSTOMERS`, `MOD_SUPPLIERS`, `MOD_PURCHASING`, `MOD_REPORTS`, `MOD_TEAM_AUDIT`, `MOD_API_INTEGRATIONS`, `MOD_AI_COPILOT_CHAT`, `MOD_AI_SALES_CRM`, `MOD_AI_INVENTORY_EXPIRATION`, `MOD_AI_PURCHASING_TRENDS`, `MOD_AI_BI_INSIGHTS`). O hook `usePermissions` combina o pacote SaaS ativo (`user_subscriptions` / `saas_permission_groups`) com o papel da loja (`store_users.role`), papel customizado (`store_custom_roles`) e 47 permissões granulares (`granted_permissions` / `revoked_permissions`).

## Restrições do produto (código)

- Tenant ativo: `useTenant()` / `authStore.activeStore`. `storeId === 'all'` é visão global consolidada do admin (`DashboardPage` e `ReportsPage` suportam consulta consolidada quando `storeId === 'all'`; `AppLayout` não assina Realtime nesse caso).
- Plataforma de Inteligência Artificial Multi-Provedor, Módulos Comerciais de IA (Add-ons) e Copiloto da Loja (`/global-admin/ai`, `/global-admin/ai/:tab`, `/ai-copilot`, `aiOrchestratorService.ts`, migration `20261103000028_ai_platform_and_modules.sql`):
  - **URLs Próprias por Aba em `/global-admin/ai/:tab`**: `/global-admin/ai/providers` (Cofre de Chaves API & Modelos), `/global-admin/ai/personas` (Personas & Context Prompt Injection), `/global-admin/ai/security-fallback` (Escudo Anti-Injection, Fallback & Simulador), `/global-admin/ai/commercial-modules` (Módulos Comerciais de IA / Add-ons) e `/global-admin/ai/telemetry` (Telemetria & Consumo com filtros por busca, provedor, módulo, status, persona, loja, período e paginação completa).
  - **Cofre de Chaves API (`public.ai_provider_configs` + `pgcrypto`)**: o Super Admin configura as chaves de API (`GEMINI` principal padrão, `OPENAI`, `CLAUDE` e `CUSTOM` compatível com Grok/DeepSeek/Ollama/OpenRouter), carrega dinamicamente os modelos disponíveis da chave (`fetchModelsFromProviderKey`) e fixa o modelo de cada parte do site (`sectionModels` / `AI_SITE_SECTIONS`) via RPC `upsert_ai_provider_config`; listagens usam `list_ai_provider_configs_safe` (mascarando a chave) e a resolução de execução valida a loja/módulo via `resolve_ai_execution_runtime`.
  - **5 Módulos Comerciais de IA (Acréscimo nas Lojas)**: `MOD_AI_COPILOT_CHAT` (R$ 49,90/mês), `MOD_AI_SALES_CRM` (R$ 39,90/mês), `MOD_AI_INVENTORY_EXPIRATION` (R$ 34,90/mês), `MOD_AI_PURCHASING_TRENDS` (R$ 34,90/mês) e `MOD_AI_BI_INSIGHTS` (R$ 44,90/mês), na categoria `INTELIGENCIA_ARTIFICIAL`, somando-se automaticamente ao valor mensal acordado nos planos das lojas (`/global-admin/users/:userId/permissions` e Landing Page).
  - **Context Prompt Injection, Escudo Anti-Injection, Fallback em Cascata e Personas (`public.ai_personas`, `public.ai_store_configs`)**: injeção dinâmica de métricas verificadas da loja (`StoreAiContextSnapshot`), bloqueio de jailbreak/extração de segredos, personas configuráveis (`STRATEGIC_CFO`, `COMMERCIAL_GROWTH`, `INVENTORY_AUDITOR`, `PRACTICAL_COPILOT`) e fallback multicamada (`Modelo Principal Gemini -> Modelo Fast -> Provedor Backup -> Motor Analítico Determinístico Local`).
  - **Copiloto Chatbot & Cards de IA em Todos os Módulos**: página `/ai-copilot` (`AiCopilotPage`), gaveta flutuante global (`AiStoreCopilotDrawer`) e componente `<AiModuleInsightCard />` integrado em `/dashboard`, `/expiration`, `/customers`, `/sales`, `/purchases`, `/inventory` e `/reports`.
- Hierarquia Matriz → Filiais e Nomenclatura Composta (`formatStoreHierarchyName`, `AppLayout.tsx`, `StoresPage.tsx`): lojas filiais possuem `is_branch = true` e `parent_store_id` apontando para a Matriz. No banco e na interface, filiais com códigos curtos (`P1`, `P2`, etc.) são padronizadas com o nome da Matriz (`Primor - Filial P1` / `Primor • Filial P1`) e exibidas agrupadas em árvore (`Matriz -> └─ Filial`) no seletor do topo da barra lateral (com busca rápida), nas páginas de lojas e nos filtros de `/dashboard` e `/reports`. Transferência de lotes sem venda usa a RPC `execute_stock_transfer_to_branch`.
- Criação de Rede de Lojas em Lote (`scripts/bulk-store-builder.mjs`, `.agents/skills/bulk-store-creator/SKILL.md`, `src/services/bulkStoreBuilderService.ts`, `src/components/admin/BulkStoreAiBuilderModal.tsx`): provisionamento automatizado e idempotente de Loja Matriz, Filiais vinculadas, Administradores `STORE_ADMIN`, Fornecedores, Categorias, Produtos ativos no catálogo online, Fotos sem direitos autorais no bucket `products` e Saldos/Lotes com validade FEFO via especificação JSON (`scripts/specs/primor.json`) ou prompt em linguagem natural interpretado pela IA da Loja.
- Exclusão Definitiva de Lojas e Filiais (`global_admin_hard_delete_store`, migration `20261103000029_global_admin_hard_delete_store.sql`): permite ao Global Admin remover permanentemente lojas ou filiais e suas dependências em ordem segura.
- Alçada de Baixa de Estoque: baixas manuais (`LOSS` ou `ADJUSTMENT` negativo) exigem validação por `can_user_approve_writeoff`; operadores sem alçada abrem solicitações em `stock_writeoff_requests` revisadas via `review_stock_writeoff_request`.
- Visões Salvas por Loja/Filial: filtros de status (múltipla seleção) e período em `/customers` são persistidos no banco por `store_id` na tabela `public.store_saved_views` (`savedViewService.ts`).
- Reset Obrigatório de PIN & Política de Complexidade (`/team/:employeeId`): `store_users.require_pin_reset` e `store_users.pin_requirements` (JSONB) com validação e troca via RPC `complete_employee_pin_reset`.
- Configurador Comercial Interativo, Novos Contratos & Gerenciador de Contratos (`/`, `/pricing`, `/global-admin/finance/plans`, `/global-admin/contracts`): planos vinculados à Landing Page via `permission_groups.show_on_landing_page` / `is_highlighted_on_landing`; pré-cadastro comercial salvo em `public.commercial_plan_proposals` (`submit_commercial_proposal`); e gerenciador de contratos (`public.platform_contracts` + `contractService.ts`) com exportação em HTML, DOCX e PDF, armazenamento no Supabase Storage e sincronização com o Google Drive do Global Admin.
- Isolamento: políticas RLS + helpers `is_global_admin`, `has_store_access`, `has_store_role` e `has_hbac_scope`.
- Venda atômica: `orderService.createOrder` chama RPC `create_order_with_stock` (garantindo associação de `"Cliente Genérico"` quando nenhum cliente é informado).
- Build Pages: `VITE_BASE_PATH` no workflow `.github/workflows/deploy.yml`.
