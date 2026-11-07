---
id: CTX-OLIVELAS-OVERVIEW
title: Visão do sistema
type: Context
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-11-07
language: pt-BR
classification: Confirmed
source:
  - README.md
  - src/routes/AppRoutes.tsx
  - supabase/migrations/20260925000001_initial_schema.sql
  - supabase/migrations/20261030000023_staff_roles_approvers_and_branches.sql
  - supabase/migrations/20261030000024_global_finance_licensing_rules.sql
  - supabase/migrations/20261030000025_store_saved_views.sql
  - supabase/migrations/20261030000026_employee_pin_reset_and_policy.sql
  - supabase/migrations/20261030000027_landing_leads_and_contracts.sql
  - supabase/migrations/20261103000028_ai_platform_and_modules.sql
  - supabase/migrations/20261103000029_global_admin_hard_delete_store.sql
---

# Visão do sistema

## Problema que o código endereça

Operação SaaS de **várias lojas e filiais** (`Matriz → Filiais`) no mesmo banco PostgreSQL com isolamento RLS, abrangendo:
- **Dashboard Executivo Multi-Loja (`/dashboard`)**: KPIs comparativos, gráficos de vendas mensais (12m), comparativo Matriz vs. Filiais, ranking Top Produtos, filtros de período, exportação CSV/JSON/PDF e resumo executivo por IA.
- **Catálogo Mestre & Estoque (`/products`, `/inventory`, `/batches`)**: saldos físicos, lotes com validade FEFO, movimentações, baixas em lote, valorização a custo/venda, fluxo exclusivo de **Aprovador de Baixa de Estoque (`STOCK_APPROVER`)** (`can_user_approve_writeoff`, `stock_writeoff_requests`, `review_stock_writeoff_request`), **remessa de produtos da Matriz para Filiais sem venda** (`execute_stock_transfer_to_branch`) e **Radar Preditivo de Validades FEFO com IA**.
- **PDV Frente de Caixa & Pedidos (`/sales`, `/orders`)**: vendas unitárias e pesáveis (`KG`/gramas), associação automática de `"Cliente Genérico"`, edição de pedidos com reabertura no PDV (`/sales?editOrder=:id`), controle de entregas e **Sugestão Inteligente de Cross-Sell/Upsell por IA**.
- **CRM de Clientes com Pedidos na URL & Visões Salvas (`/customers`)**: histórico completo de pedidos por cliente com link direto na URL (`/customers?customerId=...&orderId=...`), filtro de status com múltipla seleção, visões salvas no banco por loja/filial (`store_saved_views`), exportação detalhada somente dos registros visíveis (`Exportar Visíveis`) e **Análise de Perfil/Recompra por IA**.
- **Compras & Fornecedores (`/purchases`, `/suppliers`)**: ordens de compra com cálculo dinâmico de margem/markup, entrada atômica em estoque e **Previsão de Demanda e Tendências de Compras com IA**.
- **9 Relatórios Analíticos de Varejo (`/reports`)**: filtros de datas personalizadas/períodos, registros de compras e vendas com data e hora exatas, pedidos por cliente com deep-link, exportação `Exportar Visíveis` e **Auditor Executivo de BI com IA**.
- **Plataforma de Inteligência Artificial Multi-Provedor, Cofre `pgcrypto` & Copilot da Loja (`/ai-copilot`, `/global-admin/ai`)**: chaves de API de IA (Google Gemini principal, OpenAI, Anthropic Claude e Endpoints Customizados OpenAI-Compatible) criptografadas no Supabase via `pgcrypto` (`pgp_sym_encrypt`/`pgp_sym_decrypt`), 5 módulos comerciais add-on (`MOD_AI_COPILOT_CHAT`, `MOD_AI_SALES_CRM`, `MOD_AI_INVENTORY_EXPIRATION`, `MOD_AI_PURCHASING_TRENDS`, `MOD_AI_BI_INSIGHTS`) que somam no preço mensal da loja, **Context Prompt Injection** com dados reais da loja, **Escudo Anti-Prompt Injection**, **Fallback Multi-Nível** (`Primário → Secundário → Contingência Analítica Local`), **Personas Configuráveis** e **Chatbot Copilot da Loja** (página `/ai-copilot` e gaveta flutuante global).
- **Gestão de Equipe, 47 Permissões Granulares, Reset/Política de PIN & Planos Comerciais SaaS (`/team`, `/global-admin`)**: franquia de **10 funcionários grátis por loja** (`global_billing_rules`), papéis customizados (`store_custom_roles`), configuração de **Reset Obrigatório de PIN no Próximo Login e Pré-requisitos de Complexidade** (`/team/:employeeId`, `complete_employee_pin_reset`), grupos de permissão com grafo de dependências entre telas (`featureDependencies.ts`), páginas dedicadas de edição com URLs próprias, integrador de APIs estilo Postman (`/integrations`), tokens HBAC e central de backups multi-loja.
- **Configurador Interativo de Planos na Landing Page, Seção "Novos Contratos" & Gerenciador de Contratos (`/`, `/pricing`, `/global-admin/finance/plans`, `/global-admin/contracts`)**: flag de vinculação de planos na Landing Page (`show_on_landing_page`, `is_highlighted_on_landing`), simulador interativo de planos + módulos adicionais avulsos (incluindo os 5 add-ons de IA) com pré-cadastro (`InteractivePlanBuilderSection`, `commercial_plan_proposals`, `submit_commercial_proposal`), fila comercial "Novos Contratos" para o Global Admin e Gerenciador de Contratos (`platform_contracts`) com variáveis dinâmicas, exportação em **HTML**, **DOCX** e **PDF**, armazenamento no **Supabase** e integração com o **Google Drive do Global Admin**.
- **Criação de Rede de Lojas em Lote (CLI, Skill do Agente & IA da Loja) e Visualização Hierárquica Matriz → Filiais (`/stores`, `/global-admin?tab=stores`, `/ai-copilot`, `scripts/bulk-store-builder.mjs`)**: provisionamento automatizado de Loja Matriz, Filiais subordinadas (`{Matriz} - Filial {Código}`, ex.: `Primor - Filial P1`), Administradores (`STORE_ADMIN`), Fornecedores, Categorias, Produtos, Fotos sem direitos autorais e Lotes FEFO via especificação JSON (`scripts/specs/primor.json`) ou comando em linguagem natural interpretado pela IA da Loja, além do seletor hierárquico em árvore (`Matriz -> └─ Filial`) no topo da barra lateral (`AppLayout.tsx`).

## Atores (implementados)

| Ator | Como entra | Evidência |
| --- | --- | --- |
| Visitante | `PublicLayout`: `/`, `/features`, `/pricing`, `/contact`, `/evidence` | `AppRoutes.tsx` |
| Cliente do catálogo | `/store/:slug` sem login | `CatalogPublicPage.tsx` |
| Usuário autenticado | `/login`, `/register`, OAuth Google no `authService` | `authService.ts`, `AuthLayout` |
| Membro da loja / Funcionário | `AppLayout` + `ProtectedRoute` + `PermissionGate` | papéis em `user_role_enum` + `store_custom_roles` |
| Aprovador de Baixa | `STOCK_APPROVER` ou `can_approve_writeoff = true` / `inventory.approve_writeoff` | `can_user_approve_writeoff` (migration 23) |
| Global admin | `profiles.is_global_admin`; rotas `/global-admin*` com `requireGlobalAdmin` | `ProtectedRoute`, schema `profiles` |

Papéis de loja no enum SQL (`user_role_enum`): `GLOBAL_ADMIN`, `STORE_ADMIN`, `STOCK_APPROVER`, `MANAGER`, `FINANCE`, `SELLER`, `CASHIER`, `INVENTORY`, `VIEWER` (`20260925000001_initial_schema.sql` e `20261030000023_staff_roles_approvers_and_branches.sql`).

## Limite do sistema (o que este repo contém)

**Contém:** frontend SPA React 19, 29 migrations SQL versionadas e seed SQL, workflow GitHub Pages, script CLI + Skill + Modal Web de criação de rede de lojas em lote (`scripts/bulk-store-builder.mjs`, `.agents/skills/bulk-store-creator/`, `BulkStoreAiBuilderModal.tsx`), roteiro e runner de automação E2E (`test-automation/`), caderno executivo de evidências (50 screenshots Desktop/Mobile), central de 9 relatórios de varejo, plataforma de IA multi-provedor (Gemini, OpenAI, Claude, Custom) com cofre `pgcrypto` + 5 módulos comerciais de IA + Chatbot Copilot (`/ai-copilot`), configurador comercial interativo na Landing Page, gerenciador de contratos (HTML/DOCX/PDF + Supabase + Google Drive), integrador Postman-style, backups relacionais (SQL/ZIP/JSON), gestor de tokens de API com HBAC e catálogo de IA.

**Não contém neste repositório (Unknown / ausente):** app iOS/Android nativo, BFF, gateway próprio fora do Supabase, SLOs, runbooks de incidente, Dockerfile, Terraform.

## Não-objetivos observados no código

- Checkout de catálogo **não** grava pedido no banco pela UI pública: monta mensagem formatada (incluindo itens pesáveis em `KG`/gramas) e abre o WhatsApp da loja (`CatalogPublicPage` + `cartStore`).

## Relacionamentos

- Arquitetura: [architecture.md](architecture.md)
- Segurança: [security.md](security.md)
