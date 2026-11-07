---
id: REF-OLIVELAS-DOCS-CHANGELOG
title: Changelog da documentação
type: Reference
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-11-07
language: pt-BR
classification: Confirmed
---

# Changelog da documentação

## 2026-11-07

- **Padronização de Nomenclatura de Filiais no Banco (`{Matriz} - Filial {Código}`), Sincronização Completa do `package-lock.json` e Atualização Geral da Documentação & `README.md`** (`scripts/bulk-store-builder.mjs`, `src/services/bulkStoreBuilderService.ts`, `package-lock.json`, `README.md`, `docs/pt-BR/README.md`, `docs/pt-BR/ai-context.md`, `docs/pt-BR/overview.md`, `docs/pt-BR/architecture.md`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/contracts.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/security.md`, `docs/pt-BR/operations.md`, `docs/pt-BR/changelog.md`):
  - **Padronização no Banco (`public.stores`) e nos Criadores em Lote**: as filiais da rede Primor foram atualizadas no banco para `Primor - Filial P1` até `Primor - Filial P5` (`branch_code: P1..P5`), e tanto o CLI (`scripts/bulk-store-builder.mjs`) quanto o serviço web (`src/services/bulkStoreBuilderService.ts`) passaram a gravar automaticamente o nome composto `{Matriz} - Filial {Nome}` quando a filial é informada apenas pelo código curto.
  - **Sincronização do `package-lock.json` para o CI/CD (`npm ci`)**: sincronizado o lockfile com o pacote `pg` para execução limpa do workflow `.github/workflows/deploy.yml` no GitHub Pages.
  - **Atualização Geral da Árvore de Documentação e `README.md`**: consolidados todos os documentos de arquitetura, inventário frontend/backend, contratos, mapa de UI, operações e `README.md` principal.

## 2026-11-04

- **Seletor Hierárquico de Lojas e Filiais no Topo da Barra Lateral (`Matriz -> └─ Filial`) e Exibição Composta (`Primor • Filial P1`)** (`src/layouts/AppLayout.tsx`, `src/types/auth.types.ts`, `src/services/authService.ts`, `src/hooks/useTenant.ts`, `src/pages/DashboardPage.tsx`, `src/pages/ReportsPage.tsx`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/changelog.md`):
  - **Exibição Composta de Filiais (`formatStoreHierarchyName` em `src/types/auth.types.ts`)**: filiais cujo nome é um código curto (`P1`, `P2`, `P3`, etc.) passam a ser exibidas automaticamente com o nome da sua Matriz (`Primor • Filial P1`, `Primor • Filial P2`, etc.) tanto no botão da loja ativa no topo da barra lateral quanto no menu suspenso de troca de loja e nos seletores de unidade em `/dashboard` e `/reports`.
  - **Agrupamento Hierárquico em Árvore (`Matriz -> └─ Filiais`) e Busca Rápida em `AppLayout.tsx`**: o seletor de lojas no topo da barra lateral agrupa cada **Loja Matriz** seguida imediatamente por suas **Filiais vinculadas** indentadas (`└─`), ordenadas numericamente (`P1, P2, P3, P4, P5`), com ícones distintos (`Building2` para Matriz e `GitBranch` para Filial), badges de tipo (`Matriz • 5 filiais` / `Filial • P1`) e campo de busca instantânea (`Buscar matriz ou filial...`).

- **Script CLI, Skill do Agente e Modal Web de Criação de Rede de Lojas em Lote (IA) + Provisionamento Completo da Rede "Primor" (Matriz + Filiais P1 a P5)** (`scripts/bulk-store-builder.mjs`, `scripts/specs/primor.json`, `.agents/skills/bulk-store-creator/SKILL.md`, `.agents/skills/bulk-store-creator/examples/primor-spec.json`, `src/services/bulkStoreBuilderService.ts`, `src/components/admin/BulkStoreAiBuilderModal.tsx`, `src/pages/StoresPage.tsx`, `src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/AiCopilotPage.tsx`, `package.json`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/operations.md`, `docs/pt-BR/changelog.md`):
  - **Script de Criação em Lote (`scripts/bulk-store-builder.mjs` + `scripts/specs/primor.json`)**:
    - Suporta execução via arquivo JSON (`npm run store:bulk -- --spec scripts/specs/primor.json` ou `npm run store:primor`), via prompt em linguagem natural interpretado pela IA da Loja (`--prompt "..."`) e simulação (`--dry-run`).
    - Provisiona de forma transacional e idempotente: Loja Matriz, Filiais subordinadas (`is_branch = true`, `parent_store_id`), vínculo de Administradores (`STORE_ADMIN` em `store_users` + liberação dos 15 módulos em `user_permission_profiles`), Fornecedores (`suppliers`), Categorias (`categories`), Produtos (`products` com `is_active = true` e `is_published_catalog = true`), download e upload de fotos reais sem direitos autorais (Unsplash CC0) para o Supabase Storage (`products`) + `product_images` + `media_library`, além de `stock_balances`, `product_batches` (validade `2026-12-31`) e `stock_movements` (`INITIAL_LOAD`).
  - **Skill do Agente (`.agents/skills/bulk-store-creator/SKILL.md`)**:
    - Skill de workspace que ensina o agente a transformar qualquer pedido de criação em lote de lojas, filiais, fornecedores e produtos em uma especificação JSON validada e executá-la no banco de dados.
  - **Interface Web (`BulkStoreAiBuilderModal.tsx` e `bulkStoreBuilderService.ts`)**:
    - Botão **"Criação em Lote (IA)"** integrado em `/stores` (`StoresPage.tsx`), `/global-admin?tab=stores` (`GlobalAdminDashboardPage.tsx`) e `/ai-copilot` (`AiCopilotPage.tsx`), permitindo gerar a especificação com a IA da Loja a partir de um comando em texto, carregar o preset da Rede Primor ou editar o JSON antes de executar em lote.
  - **Rede "Primor" Criada no Supabase**:
    - Matriz **Primor** (`/store/primor`) e 5 filiais vinculadas **P1** (`/store/primor-p1`), **P2** (`/store/primor-p2`), **P3** (`/store/primor-p3`), **P4** (`/store/primor-p4`) e **P5** (`/store/primor-p5`).
    - Administradores (`STORE_ADMIN`) em todas as 6 unidades: `willian.o.jesus@gmail.com` e `priscilamnmiranda@gmail.com`.
    - Fornecedores `Cozinha A` e `Cozinha B` cadastrados em todas as unidades.
    - 10 produtos por unidade (60 produtos no total), todos ativos, à venda no catálogo online, com validade `31/12/2026` e fotos sem direitos autorais: `Refrigerante Lata`, `Refrigerante Pequeno`, `Água sem gás`, `Guaraná Dolly`, `Suco natural`, `Marmita A` (R$ 15,00 — SKU `PRM-MAR-A15`), `Marmita B` (R$ 15,00 — SKU `PRM-MAR-B15`), `Marmita A` (R$ 20,00 — SKU `PRM-MAR-A20`), `Marmita B` (R$ 20,00 — SKU `PRM-MAR-B20`) e `Marmita A/B` (R$ 15,00 — SKU `PRM-MAR-AB15`), com estoques exatos (950 UN na Matriz e 545 UN em cada Filial).

- **Melhorias no PDV (`/sales`) Mobile & Desktop e Botão "Copiloto IA da Loja" na Barra Superior** (`src/pages/SalesPage.tsx`, `src/layouts/AppLayout.tsx`, `src/components/ai/AiStoreCopilotDrawer.tsx`, `docs/pt-BR/changelog.md`):
  - **PDV (`/sales`) no Mobile — 5 Itens por Página, Persistência de Filtros e Dock Fixo de Checkout**:
    - O catálogo de produtos em telas mobile (`< 1024px`) exibe por padrão **5 itens por página** (`pageSize = 5`, com opções `[5, 12, 24, 48, 96]` na paginação).
    - Todos os filtros aplicados no PDV (`stock`: `Com estoque` / `Todos` / `Zerados`, `category`, `search` e `pageSize`) são salvos automaticamente em `localStorage` (`olivelas_pos_filters_v1`) e sincronizados com a URL, mantendo-se preservados ao navegar entre telas, recarregar a página ou concluir uma venda.
    - A área de fechamento (**Cliente**, **Pagamento**, **Total a Pagar** e botão **Finalizar Venda**) permanece fixa na parte inferior da tela mobile (`flex-shrink-0`), enquanto o restante da interface acima rola em seu próprio container (`flex-1 min-h-0 overflow-y-auto`), respeitando integralmente o espaço fixo sem sobreposição.
  - **PDV (`/sales`) no Desktop — Catálogo e Carrinho Ocupando Até o Final da Página**:
    - Na visão desktop (`lg:grid-cols-12 lg:flex-1 lg:min-h-0`), tanto a coluna de **Catálogo de Produtos** (8 colunas) quanto a coluna de **Carrinho & Checkout** (4 colunas) utilizam `lg:h-full lg:flex-1 lg:min-h-0`, estendendo os cards até o final da tela com rolagem interna independente e rodapés (paginação à esquerda e fechamento de venda à direita) alinhados na base da página.
  - **Botão "Copiloto IA da Loja" na Barra Superior ao Lado do Idioma (`src/layouts/AppLayout.tsx`, `src/components/ai/AiStoreCopilotDrawer.tsx`)**:
    - Removido o botão flutuante do canto inferior direito (`fixed bottom-4 right-4`) e posicionado o botão **"Copiloto IA da Loja"** diretamente no `<header>` superior do `AppLayout`, imediatamente ao lado do seletor de idioma (`<LanguageSelector />`), abrindo a gaveta/modal do Copiloto via `createPortal(..., document.body)`.

- **Correção do Botão e do Modo "Tela Cheia" dos Agentes de IA na Versão Mobile** (`src/components/ai/AiModuleInsightCard.tsx`, `src/components/ai/AiStoreCopilotDrawer.tsx`, `docs/pt-BR/changelog.md`):
  - **Renderização via Portal (`createPortal(..., document.body)`) em `AiModuleInsightCard.tsx`**: o modal de **Tela Cheia** dos agentes de IA de módulo passou a ser montado diretamente no `document.body` com `fixed inset-0 z-[100] h-dvh w-screen overflow-hidden` e bloqueio de rolagem do fundo (`document.body.style.overflow = 'hidden'`), evitando que containers pais com `animate-in` (CSS transform) ou `overflow-x-hidden` prendessem ou cortassem a visualização em tela cheia no celular.
  - **Header Compacto e Sem Estouro Horizontal no Mobile (`AiModuleInsightCard.tsx` e `AiStoreCopilotDrawer.tsx`)**: o seletor de Persona passou a usar `min-w-0 flex-1 truncate` e rótulos enxutos (`Persona: ${p.name}`), eliminando o estouro horizontal causado pela descrição longa de tom (`${p.tone}`) dentro do `<select>` nativo; os botões **Analisar IA**, **Tela Cheia** e **Sair da Tela Cheia / Voltar** receberam `shrink-0 whitespace-nowrap` para nunca quebrarem em duas linhas no mobile.
  - **Expansão Real na Gaveta `AiStoreCopilotDrawer.tsx` no Mobile**: no celular, a gaveta abre como bottom-sheet (`h-[82dvh] rounded-t-2xl`) e, ao tocar em **Tela Cheia**, expande para `100%` da altura do dispositivo (`h-dvh rounded-none`).

- **Responsividade Mobile da Barra de Filtros e Caixas de Visão em `/dashboard`** (`src/pages/DashboardPage.tsx`, `docs/pt-BR/changelog.md`):
  - **Barra de Filtros Executiva Contida no Viewport Mobile**: os seletores de `Unidade` e `Canal` passaram a ter `w-full sm:w-auto min-w-0 max-w-full` com `flex-1 min-w-0 truncate` nos elementos `<select>`, evitando que nomes longos de lojas/unidades estourassem a largura do card em telas mobile.
  - **Atalhos de Período, Datas e Granularidade em Grids Responsivos**: os botões de granularidade (`grid-cols-3 sm:flex`), atalhos de período (`grid-cols-4 sm:flex`), inputs de data `De/Até` (`grid-cols-2 sm:flex min-w-0`) e botões de ação (`Atualizar`, `Exportar Dados` e `Nova Venda`) foram organizados em grades fluidas para mobile.
  - **Filtros Internos das Caixas de Visão e Tabelas (`min-w-0 overflow-hidden`)**: adicionadas travas `min-w-0 overflow-hidden` em todos os cards de gráficos/KPIs e convertidos os seletores internos (`Vendas Mensais (12M) | Período Filtrado`, `Vendas | Lucro | Pedidos | Estoque`, `Faturamento (R$) | Qtd. Vendida | Lucro (R$)` e abas da tabela inferior + busca) para grids responsivos que nunca ultrapassam as bordas dos cards no celular.

- **Modal de Digitação e Seleção de Quantidade Também para Itens por Unidade no PDV (`/sales`)** (`src/components/sales/WeightInputModal.tsx`, `src/pages/SalesPage.tsx`, `docs/pt-BR/changelog.md`):
  - **Abertura do Modal para Todos os Produtos (`addToCart` em `src/pages/SalesPage.tsx`)**: ao clicar em qualquer card de produto no catálogo do PDV (`/sales`) ou no badge numérico de quantidade dentro do carrinho, o sistema abre o modal interativo (`WeightInputModal.tsx`), tanto para produtos vendidos por peso (`KG`) quanto para itens vendidos por unidade (`UN`, `CX`, `PCT`, `DZ`, etc.).
  - **Modo Unidades no `WeightInputModal.tsx`**: quando o produto não é pesável (`isWeighedProduct(product) === false`), o modal adapta automaticamente o título para **"Digitar / Selecionar Quantidade (UN)"**, exibe abas para **Quantidade (`UN`)** e **Valor em R$**, campo numérico com foco e seleção automática (`autoFocus`), botões de passo `-1` / `+1`, atalhos rápidos de 1 toque (`1 un`, `2 un`, `3 un`, `5 un`, `6 un`, `10 un`), prévia em tempo real do **Total a Pagar** e validação de limite de estoque.

## 2026-11-03

- **Agentes de IA Minimizados por Padrão em Todas as Telas e Modo de Leitura/Chat em Tela Cheia (`isFullScreen`)** (`src/components/ai/AiModuleInsightCard.tsx`, `src/components/ai/AiStoreCopilotDrawer.tsx`, `src/pages/InventoryPage.tsx`, `src/pages/PurchasingPage.tsx`, `docs/pt-BR/changelog.md`):
  - **Minimizado por Padrão em Todas as Telas (`defaultExpanded = false` em `AiModuleInsightCard.tsx`)**: todos os painéis de IA incorporados (`/dashboard`, `/reports`, `/inventory`, `/purchases`, `/expiration`, `/customers` e `/sales`) iniciam recolhidos (minimizados) em uma única barra compacta, preservando o espaço vertical das tabelas e gráficos ao abrir a página.
  - **Modo Tela Cheia (`Tela Cheia` / `Sair da Tela Cheia` em `AiModuleInsightCard.tsx` e `AiStoreCopilotDrawer.tsx`)**: adicionado botão **"Tela Cheia"** (`Maximize2`) tanto no cabeçalho minimizado/expandido de `<AiModuleInsightCard />` quanto dentro de cada análise e na gaveta flutuante `AiStoreCopilotDrawer`. Ao clicar em **"Tela Cheia"**, abre-se uma visualização dedicada em tela inteira (`fixed inset-0 z-50`) com tipografia ampliada (`text-sm leading-relaxed`), seletor de Persona, sugestões rápidas de perguntas, histórico completo de análises e barra de chat no rodapé para leitura confortável e detalhada (com suporte à tecla `Esc` para sair).
  - **Área Inline Ampliada Quando Expandida**: quando o usuário expande o card na própria página (`Expandir`), a área de leitura foi ampliada para `max-h-80 sm:max-h-96` para evitar caixas pequenas demais.

- **Correção de Barra de Rolagem, Alinhamento do Header e Carregamento Sob Demanda com Histórico Compacto nos Cards de IA em `/reports`** (`src/pages/ReportsPage.tsx`, `src/components/ai/AiModuleInsightCard.tsx`, `src/layouts/AppLayout.tsx`, `src/components/common/PageHeader.tsx`, `src/components/ui/input.tsx`, `docs/pt-BR/changelog.md`):
  - **Barra de Rolagem Funcional em `/reports` (`src/pages/ReportsPage.tsx`)**: removida a trava rígida `h-full flex-1 min-h-0` do container raiz da página de relatórios e dos wrappers de tabela, permitindo que o `<main>` rolável do `AppLayout` role suavemente por todos os indicadores, abas e tabelas sem esmagar a área de dados.
  - **Correção de Sobreposição no Header (`src/pages/ReportsPage.tsx`, `src/layouts/AppLayout.tsx`, `src/components/common/PageHeader.tsx`, `src/components/ui/input.tsx`)**: como o componente `<Input>` renderiza um `<div className="w-full relative">` externo, combiná-lo com o seletor de lojas dentro de um `flex-wrap` no `<PageHeader>` quebrava o header fixo de `48px` (`md:h-12`) em duas linhas que transbordavam sobre o conteúdo abaixo. O seletor de loja foi movido para a barra de ferramentas contextual do relatório (ao lado do filtro de período), o `<PageHeader>` passou a exibir apenas a busca rápida alinhada em linha única e o `<header>` de `AppLayout.tsx` passou a usar `md:min-h-12 md:py-1.5`.
  - **IA Carregada Apenas Quando Solicitada + Histórico de Conversa em Caixa Compacta (`src/components/ai/AiModuleInsightCard.tsx`)**: removido o `useEffect` que disparava inferência automática ao abrir a página; agora o `<AiModuleInsightCard />` carrega passivamente o histórico de mensagens da sessão (`aiOrchestratorService.listChatMessages`) e o exibe dentro de uma caixa rolável compacta (`max-h-44 overflow-y-auto custom-scrollbar`), executando novas análises somente quando o usuário clica em **"Analisar com IA"** / **"Nova Análise IA"**, seleciona um atalho rápido ou envia uma pergunta.

- **Inferência Generativa Real de IA (Sem `Fallback Local` / `• Motor Resiliente`) e Renderização Nativa de Markdown no Copiloto e Cards de IA** (`src/services/aiOrchestratorService.ts`, `src/components/ai/AiMarkdownContent.tsx`, `src/components/ai/AiStoreCopilotDrawer.tsx`, `src/pages/AiCopilotPage.tsx`, `src/components/ai/AiModuleInsightCard.tsx`, `src/pages/admin/GlobalAdminAiSettingsPage.tsx`, `docs/pt-BR/changelog.md`):
  - **Execução Generativa Real em Nuvem (`callExternalProviderApi` + `callGenerativeCloudRelay` em `src/services/aiOrchestratorService.ts`)**: substituída a queda para `Fallback Local` / `• Motor Resiliente` por execução generativa de LLM ao vivo utilizando o contexto verificado da loja (`<verified_store_snapshot>`), a Persona selecionada, diretrizes da unidade e o histórico de conversa (`conversationHistory`), atendendo chaves padrão (`AIza*`, `sk-*`, `sk-ant-*`), chaves Google `AQ.*` e todos os 47 IDs de modelos do catálogo Gemini (séries 4.0, 3.8, 3.7, 3.6, 3.5, 3.1, 3.0, 2.5, 2.0, 1.5 e Gemma 3) sem erros HTTP 401/404 no navegador.
  - **Persistência Imediata de Chave no Cofre Local (`fetchModelsFromProviderKey` / `testProviderConnection`) e Sanitização de Histórico (`listChatMessages`)**: ao validar ou listar modelos com uma chave de API em `/global-admin/ai/providers`, a chave já é sincronizada no cofre local para uso imediato pelos módulos e pelo Copiloto; mensagens antigas cacheadas que continham sufixo `• Motor Resiliente` ou `fallbackTriggered: true` são limpas automaticamente ao carregar o histórico.
  - **Renderizador Rico de Markdown (`src/components/ai/AiMarkdownContent.tsx`)**: criado componente dedicado para converter títulos (`###`, `####`), negrito (`**texto**`), itálico (`*texto*`), código inline (`` `SKU` ``), listas ordenadas/não ordenadas, citações e tabelas Markdown em elementos visuais estilizados na gaveta `AiStoreCopilotDrawer`, na central `/ai-copilot`, nos cards `<AiModuleInsightCard />` e no simulador de `/global-admin/ai/security-fallback`.

- **Correção de HTTP 400 (`invalid input syntax for type uuid`) ao Abrir o Copiloto IA (`ai_chat_messages` / `ai_chat_sessions`)** (`src/services/aiOrchestratorService.ts`, `src/components/ai/AiStoreCopilotDrawer.tsx`, `src/pages/AiCopilotPage.tsx`, `docs/pt-BR/changelog.md`):
  - Criados os utilitários `isValidUuid(value)` e `toDeterministicUuid(seed)` em `src/services/aiOrchestratorService.ts` para converter sementes de sessão (`drawer-${storeId}` na gaveta lateral e `copilot-page-${storeId}` na página `/ai-copilot`) em UUIDs RFC 4122 determinísticos antes de consultar `public.ai_chat_messages`, eliminando o erro `HTTP 400` quando o PostgREST filtrava `session_id=eq.drawer-...` em uma coluna do tipo `UUID`.
  - Em `aiOrchestratorService.appendChatMessage`, adicionado `upsert` automático da sessão pai em `public.ai_chat_sessions` (`onConflict: 'id'`) e validação de `store_id` via `isValidUuid` antes de inserir mensagens em `public.ai_chat_messages`, garantindo integridade referencial de chave estrangeira (`session_id REFERENCES public.ai_chat_sessions(id)`).

- **Catálogo Completo de 47 Modelos Google Gemini (Séries 4, 3.8, 3.7, 3.6, 3.5, 3.1, 3.0, 2.5, 2.0, 1.5 e Gemma 3), Suporte Nativo a Chaves `AQ.*` (Vertex AI Express Mode) e Eliminação de HTTP 400 em `store_users`** (`src/services/aiOrchestratorService.ts`, `src/pages/admin/GlobalAdminAiSettingsPage.tsx`, `src/services/userService.ts`, `docs/pt-BR/changelog.md`):
  - Expandido o catálogo oficial de modelos do Google Gemini (`GEMINI_COMPLETE_MODEL_CATALOG`) para **47 modelos oficiais**, incluindo as gerações **Gemini 4** (`gemini-4-argon`, `gemini-4.0-pro`, `gemini-4.0-flash`, `gemini-4.0-flash-lite`), **Gemini 3.8 / 3.7** (`gemini-3.8-flash`, `gemini-3.7-pro`, `gemini-3.7-flash`, `gemini-3.7-flash-lite`), **Gemini 3.6 / 3.5** (`gemini-3.6-pro`, `gemini-3.6-flash`, `gemini-3.6-flash-lite`, `gemini-3.5-pro`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`), **Gemini 3.1 / 3.0** (`gemini-3.1-pro`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-3-flash`, `gemini-3-flash-preview`), **Gemini 2.5**, **Gemini 2.0**, **Gemini 1.5**, aliases `-latest` e **Gemma 3**.
  - Chaves de autenticação do **Vertex AI Express Mode** com prefixo `AQ.` utilizam o endpoint global `https://aiplatform.googleapis.com/v1/publishers/google/models/{MODEL_ID}:generateContent` (com fallback automático para `v1beta1` em modelos preview) e liberam todo o catálogo sem disparar `GET /v1beta/models` (que não é suportado no modo Express sem projeto/região GCP).
  - Em `userService.listStoreMembers` (`src/services/userService.ts`), substituída a listagem explícita de colunas da migration 26 (`require_pin_reset`, `pin_requirements`, `pin_updated_at`) por `select('*, store_custom_roles(id, name), profiles(...)')`, eliminando a resposta `HTTP 400 Bad Request` no PostgREST quando o banco ainda não teve a migration 26 aplicada.

- **Destaque Ativo no Menu Lateral para `/global-admin/ai/:tab`** (`src/layouts/AppLayout.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/changelog.md`):
  - Atualizada a função `isNavItemActive` em `src/layouts/AppLayout.tsx` para destacar o item `"Central de IA & Chaves API"` (`/global-admin/ai`) tanto na rota base `/global-admin/ai` quanto em todas as sub-rotas de abas (`/global-admin/ai/providers`, `/global-admin/ai/personas`, `/global-admin/ai/security-fallback`, `/global-admin/ai/commercial-modules` e `/global-admin/ai/telemetry`).

- **Exclusão Definitiva (Hard Delete) de Lojas e Filiais pelo Global Admin em `/global-admin?tab=stores`, `/global-admin/stores/:storeId/edit` e `/global-admin?tab=delete`** (`supabase/migrations/20261103000029_global_admin_hard_delete_store.sql`, `src/services/storeService.ts`, `src/services/globalAdminService.ts`, `src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/admin/GlobalAdminStoreEditPage.tsx`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/changelog.md`):
  - **Menu `Ações Rápidas` e Modal de Confirmação em `/global-admin?tab=stores` (`GlobalAdminDashboardPage.tsx`)**: adicionada a ação **"Excluir Loja Definitivamente" / "Excluir Filial Definitivamente"** com modal de confirmação explícito; quando a loja selecionada é uma **Matriz** com filiais vinculadas, o Global Admin pode optar entre desvincular as filiais subordinadas (mantendo-as ativas como lojas independentes) ou excluir todas as filiais subordinadas junto com a Matriz.
  - **Botão de Exclusão Definitiva em `/global-admin/stores/:storeId/edit` (`GlobalAdminStoreEditPage.tsx`) e Entidade `Loja / Filial` em `/global-admin?tab=delete` (`globalAdminService.ts`)**: adicionado botão `"Excluir Loja/Filial Definitivamente"` na barra de ações da página de edição da loja, botão `"Excluir"` direto nas linhas de filiais subordinadas e suporte à entidade `'stores'` no painel de Exclusão Definitiva.
  - **RPC `global_admin_hard_delete_store` + Fallback Resiliente (`storeService.deleteStorePermanently`, migration 29)**: remove em ordem segura todas as dependências com `ON DELETE RESTRICT` (`stock_transfer_items`, `order_items`, `orders`, `purchase_order_items`, `purchase_orders`, `products`, `suppliers`) antes de remover o registro em `public.stores`, registrando auditoria `GLOBAL_HARD_DELETE_STORE`.

- **URLs Próprias por Aba em `/global-admin/ai/:tab` e Paginação + Filtros Multi-Dimensionais em Telemetria & Consumo (`/global-admin/ai/telemetry`)** (`src/routes/AppRoutes.tsx`, `src/pages/admin/GlobalAdminAiSettingsPage.tsx`, `src/services/aiOrchestratorService.ts`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/ai-context.md`, `docs/pt-BR/changelog.md`):
  - **Rota Dedicada por Aba (`/global-admin/ai/:tab`)**: cada uma das 5 abas da Central de Governança de IA possui agora sua própria URL direta (`/global-admin/ai/providers`, `/global-admin/ai/personas`, `/global-admin/ai/security-fallback`, `/global-admin/ai/commercial-modules` e `/global-admin/ai/telemetry`), com redirecionamento canônico automático ao acessar `/global-admin/ai`.
  - **Filtros Multi-Dimensionais e Paginação em Telemetria & Consumo (`/global-admin/ai/telemetry`)**: adicionados cards de KPIs filtrados (Chamadas Filtradas, Tokens Consumidos, Latência Média, Escudo & Resiliência), filtros combinados por busca textual, provedor (`GEMINI`, `OPENAI`, `CLAUDE`, `CUSTOM`), status (`SUCCESS`, `FALLBACK_LOCAL`, `BLOCKED_INJECTION`, `ERROR`), módulo comercial, persona, loja e período (`Hoje`, `Últimos 7 dias`, `Últimos 30 dias`, `Intervalo Personalizado`), exportação CSV e paginação completa com seletor de itens por página (`10`, `20`, `50`, `100`) e navegação de páginas (`Primeira`, `Anterior`, páginas numeradas, `Próxima`, `Última`).

- **Arquitetura e Implementação Completa de Inteligência Artificial Multi-Provedor (`Gemini` Principal, `OpenAI`, `Claude`, `Personalizada`), Cofre de Chaves no Supabase (`pgcrypto`), 5 Módulos Comerciais de IA (Add-ons nas Lojas), Context Prompt Injection + Escudo Anti-Injection, Fallback em Cascata, Personas Configuráveis, Copiloto Chatbot (`/ai-copilot` + Gaveta Global) e IA Incorporada em Todos os Módulos** (`supabase/migrations/20261103000028_ai_platform_and_modules.sql`, `src/types/ai.types.ts`, `src/services/aiOrchestratorService.ts`, `src/pages/admin/GlobalAdminAiSettingsPage.tsx`, `src/pages/AiCopilotPage.tsx`, `src/components/ai/AiModuleInsightCard.tsx`, `src/components/ai/AiStoreCopilotDrawer.tsx`, `src/types/permissionGroup.types.ts`, `src/constants/screenDependencies.ts`, `src/services/permissionGroupService.ts`, `src/pages/admin/GlobalAdminUserPermissionsPage.tsx`, `src/components/admin/UserPermissionsAndPricingModal.tsx`, `src/components/commercial/InteractivePlanBuilderSection.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/ExpirationPage.tsx`, `src/pages/CustomersPage.tsx`, `src/pages/SalesPage.tsx`, `src/pages/PurchasingPage.tsx`, `src/pages/InventoryPage.tsx`, `src/pages/ReportsPage.tsx`, `src/layouts/AppLayout.tsx`, `src/routes/AppRoutes.tsx`, `docs/pt-BR/ai-context.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/security.md`, `docs/pt-BR/changelog.md`):
  - **Cofre de Chaves API Criptografado no Supabase e Configuração pelo Super Admin (`/global-admin/ai`, `GlobalAdminAiSettingsPage.tsx`, migration 28)**:
    - Suporte completo a **Google Gemini (IA Principal padrão)** (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`), **OpenAI** (`gpt-4o-mini`, `gpt-4o`, `o3-mini`), **Anthropic Claude** (`claude-3-7-sonnet-latest`, `claude-3-5-haiku-latest`) e **IA Personalizada (OpenAI-Compatible)** (Grok, DeepSeek, Ollama, OpenRouter, vLLM).
    - Chaves de API criptografadas via `pgcrypto` (`pgp_sym_encrypt` / `pgp_sym_decrypt`, com `SET search_path = public, extensions, pg_temp`) em `public.ai_provider_configs`, gerenciadas via RPC `upsert_ai_provider_config`, listadas de forma mascarada (`list_ai_provider_configs_safe`) e resolvidas em tempo de execução por `resolve_ai_execution_runtime`.
    - **Descoberta Dinâmica de Modelos por Chave API e Fixação por Parte do Site (`fetchModelsFromProviderKey`, `AI_SITE_SECTIONS`, `sectionModels`)**: ao digitar/colar uma chave de API ou clicar em *"Carregar Modelos da Chave API"* em `/global-admin/ai`, o sistema consulta ao vivo o endpoint oficial de modelos do provedor (`GET /v1beta/models` no Gemini, `GET /v1/models` na OpenAI/Claude/Custom) e permite fixar o modelo exato desejado para cada uma das **8 partes/telas do site** (`CHAT_COPILOT` em `/ai-copilot`, `DASHBOARD_SUMMARY` em `/dashboard`, `POS_CROSS_SELL` em `/sales`, `CRM_CUSTOMERS` em `/customers`, `EXPIRATION_FEFO` em `/expiration`, `INVENTORY_STOCK` em `/inventory`, `PURCHASING_TRENDS` em `/purchases` e `REPORTS_BI` em `/reports`).
    - Teste de conexão e latência em tempo real para qualquer provedor/modelo configurado pelo Super Admin.
  - **5 Módulos Comerciais de IA como Acréscimo (Add-ons) nos Planos das Lojas (`INTELIGENCIA_ARTIFICIAL`)**:
    - `MOD_AI_COPILOT_CHAT` (*Copiloto IA & Chatbot da Loja* — R$ 49,90/mês), `MOD_AI_SALES_CRM` (*IA Comercial: Sugestão de Produtos & CRM* — R$ 39,90/mês), `MOD_AI_INVENTORY_EXPIRATION` (*IA de Validades, Alertas FEFO & Estoque* — R$ 34,90/mês), `MOD_AI_PURCHASING_TRENDS` (*IA de Compras & Tendências de Demanda* — R$ 34,90/mês) e `MOD_AI_BI_INSIGHTS` (*IA Executiva: Resumo Mensal & BI* — R$ 44,90/mês).
    - Botão de 1 clique **"Habilitar / Desabilitar Pacote Completo de IA (+5 Módulos)"** e discriminação financeira explícita do acréscimo mensal de IA em `/global-admin/users/:userId/permissions` (`GlobalAdminUserPermissionsPage.tsx`), `UserPermissionsAndPricingModal.tsx` e no configurador da Landing Page (`InteractivePlanBuilderSection.tsx`).
  - **Context Prompt Injection, Escudo Anti-Prompt Injection, Fallback Multicamada e Personas Configuráveis (`aiOrchestratorService.ts`)**:
    - **Context Prompt Injection**: injeta automaticamente dados reais verificados da loja ativa (`StoreAiContextSnapshot` com faturamento mensal, margem, top produtos da Curva A, lotes vencendo/vencidos FEFO, alertas de compra/ruptura e clientes VIP/inativos).
    - **Escudo Anti-Prompt Injection**: inspeciona e bloqueia ataques de *jailbreak* ou extração de credenciais/dados de outras lojas antes da chamada ao LLM, com simulador interativo de segurança em `/global-admin/ai`.
    - **Fallback Automático em Cascata**: tenta `Modelo Principal Gemini -> Modelo Fast Gemini -> Provedor Backup (OpenAI/Claude/Custom) -> Motor Analítico Determinístico Local`, garantindo disponibilidade de 100% mesmo sem chave externa.
    - **Personas Configuráveis (`public.ai_personas`)**: 4 personas nativas (*CFO & Estrategista de Margem*, *Diretor Comercial & Growth*, *Auditor Implacável de Estoque & FEFO*, *Copiloto Prático do Dia a Dia*) + criação de novas personas com tom de voz, template de injeção e guardrails próprios.
  - **Chatbot Copiloto da Loja (`/ai-copilot` + `AiStoreCopilotDrawer`) e IA em Todos os Módulos (`AiModuleInsightCard`)**:
    - Central Copiloto (`/ai-copilot`) e gaveta flutuante global (`AiStoreCopilotDrawer`) para o Administrador da Loja conversar com a IA sobre vendas, estoque, validades, clientes e compras.
    - Card `<AiModuleInsightCard />` integrado em **Dashboard** (`/dashboard`), **Validades** (`/expiration`), **Clientes** (`/customers`), **PDV / Vendas** (`/sales`), **Compras** (`/purchases`), **Estoque** (`/inventory`) e **Relatórios** (`/reports`).

## 2026-10-29

- **Ajuste do Botão `"Personalizar & Solicitar"` e Pré-Seleção no Carrinho de Personalização em `/pricing#personalizar-plano`** (`src/pages/PricingPage.tsx`, `src/components/commercial/InteractivePlanBuilderSection.tsx`, `docs/pt-BR/changelog.md`):
  - **Rótulo Conciso nos Cards de Planos (`PricingPage.tsx`)**: alterado o texto do botão de `"Personalizar & Solicitar {plan.name}"` para `"Personalizar & Solicitar"`, evitando quebra ou excesso de texto dentro do card.
  - **Pré-Seleção Automática no Carrinho (`InteractivePlanBuilderSection.tsx`)**: ao clicar em `"Personalizar & Solicitar"`, o plano escolhido (`preselectedPlanId`) é imediatamente pré-selecionado no configurador e adicionado ao painel lateral **Carrinho & Pré-Cadastro** (listando o plano, seus módulos inclusos e eventuais adicionais avulsos), com rolagem suave até `#personalizar-plano` e destaque visual no carrinho.

- **Padronização do Nome de Exibição do Papel `STORE_ADMIN` para `"Admin Loja"` em Todo o Código** (`src/constants/granularPermissions.ts`, `src/layouts/AppLayout.tsx`, `src/pages/StoresPage.tsx`, `src/pages/TeamPage.tsx`, `src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/admin/GlobalAdminStoreEditPage.tsx`, `src/pages/admin/GlobalAdminUserEditPage.tsx`, `src/pages/admin/GlobalAdminUserPermissionsPage.tsx`, `src/pages/admin/GlobalAdminUserBillingPage.tsx`, `src/pages/admin/GlobalAdminFinancePaymentsPage.tsx`, `src/pages/admin/GlobalAdminFinanceRulesPage.tsx`, `src/components/admin/UserPermissionsAndPricingModal.tsx`, `src/pages/LandingPage.tsx`, `src/pages/PricingPage.tsx`, `src/pages/FeaturesPage.tsx`, `src/services/permissionGroupService.ts`, `src/i18n/locales/pt-BR.ts`, `src/i18n/locales/en-US.ts`, `src/i18n/locales/es-ES.ts`, `docs/pt-BR/changelog.md`):
  - **Rótulo Oficial `"Admin Loja"` (`ROLE_METADATA.STORE_ADMIN` e `formatRoleLabel`)**: atualizado `ROLE_METADATA.STORE_ADMIN.label` e `shortLabel` para `'Admin Loja'` e criado o helper `formatRoleLabel(role)` em `src/constants/granularPermissions.ts`.
  - **Substituição em Todas as Telas, Menus, Tabelas, Badges, Filtros e Modais**: todas as ocorrências visíveis de `"STORE_ADMIN"`, `"Store Admin"`, `"Administrador da Loja"` e interpolações diretas de `{role}` no seletor de lojas da barra lateral (`AppLayout.tsx`), páginas do Admin Global (`/global-admin`, `/global-admin/stores/:storeId/edit`, `/global-admin/users/:userId/*`, `/global-admin/finance/*`), páginas operacionais (`/stores`, `/team`), Landing Page (`/`, `/pricing`, `/features`) e dicionários i18n (`pt-BR`, `en-US`, `es-ES`) foram padronizadas para **"Admin Loja"**, preservando o identificador técnico `'STORE_ADMIN'` no banco de dados (`user_role_enum`) e nas consultas/RPCs.

- **Flag de Vinculação na Landing Page (`/global-admin/finance/plans`), Configurador Interativo de Planos + Adicionais Avulsos + Pré-Cadastro na Landing Page (`/` e `/pricing`), Seção "Novos Contratos" e Gerenciador de Contratos Completo (`/global-admin/contracts` com Exportação HTML, DOCX e PDF + Armazenamento no Supabase e Google Drive)** (`supabase/migrations/20261030000027_landing_leads_and_contracts.sql`, `src/types/permissionGroup.types.ts`, `src/constants/screenDependencies.ts`, `src/services/permissionGroupService.ts`, `src/pages/admin/GlobalAdminFinancePlansPage.tsx`, `src/types/contract.types.ts`, `src/services/contractService.ts`, `src/components/commercial/InteractivePlanBuilderSection.tsx`, `src/pages/LandingPage.tsx`, `src/pages/PricingPage.tsx`, `src/pages/admin/GlobalAdminContractsPage.tsx`, `src/layouts/AppLayout.tsx`, `src/routes/AppRoutes.tsx`, `src/i18n/locales/pt-BR.ts`, `src/i18n/locales/en-US.ts`, `src/i18n/locales/es-ES.ts`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/contracts.md`, `docs/pt-BR/changelog.md`):
  - **Flag de Vinculação na Landing Page em Planos Comerciais (`/global-admin/finance/plans`)**:
    - Adicionadas as flags `showOnLandingPage` (`show_on_landing_page`) e `isHighlightedOnLanding` (`is_highlighted_on_landing`) aos grupos de permissões (`permission_groups`), com switches rápidos nos cards e no modal de criação/edição de planos em `GlobalAdminFinancePlansPage.tsx`.
    - Criadas políticas públicas de leitura (`permission_groups_public_landing_select` e `permission_modules_public_landing_select`) para sincronizar automaticamente na Landing Page os planos ativos vinculados e o catálogo de módulos adicionais.
  - **Configurador Interativo de Planos + Adicionais Avulsos + Pré-Cadastro na Landing Page (`/` e `/pricing`, `InteractivePlanBuilderSection.tsx`)**:
    - Seção interativa onde o visitante escolhe um plano base vinculado pelo Global Admin (ou monta um plano 100% personalizado), ativa/desativa módulos adicionais avulsos com cálculo financeiro em tempo real (ciclo Mensal ou Anual + simulador da franquia de 10 funcionários grátis por loja), preenche **Nome**, **E-mail** e **Celular / WhatsApp** e registra a proposta na plataforma (`submit_commercial_proposal` / `commercial_plan_proposals`).
  - **Seção "Novos Contratos" para o Global Admin (`/global-admin/contracts`, `GlobalAdminContractsPage.tsx`)**:
    - Listagem dedicada no padrão visual de `/expiration` exibindo todas as solicitações e pré-cadastros registrados na Landing Page, com filtro por status (`NEW`, `CONTACTED`, `CONTRACT_GENERATED`, `SIGNED`, `ARCHIVED`), botões de contato em 1 clique via **WhatsApp** (com mensagem pré-formatada contendo o plano e adicionais escolhidos) e **E-mail**, e botão **"Gerar Contrato"** que pré-preenche automaticamente o Gerenciador de Contratos.
  - **Gerenciador de Contratos Completo com Exportação HTML, DOCX e PDF + Supabase + Google Drive (`GlobalAdminContractsPage.tsx`, `contractService.ts`)**:
    - Editor completo de contratos com preenchimento de **Meu Nome / Contratada** (`providerName`, documento, e-mail e representante), **Nome do Cliente / Contratante** (`customerName`, documento, e-mail, celular e endereço), **Produto / Plano Comprado** (`purchasedProduct`), **Módulos Adicionais** (`additionalModules`), valores, condições de pagamento e **Termos Personalizados** (`customTerms`) com variáveis dinâmicas (`{{MEU_NOME}}`, `{{NOME_CLIENTE}}`, `{{PRODUTO_COMPRADO}}`, `{{MODULOS_ADICIONAIS}}`, `{{VALOR_TOTAL}}`, etc.) e pré-visualização da folha A4 em tempo real.
    - Exportação pronta para assinatura em **HTML**, **DOCX** (pacote OpenXML `.docx` real gerado via `JSZip`) e **PDF** (folha A4 paginada para impressão/PDF).
    - Armazenamento primário no **Supabase** (tabela `public.platform_contracts` + upload do documento no bucket `products` em `contracts/`) e integração com o **Google Drive do Global Admin** (upload direto via Google Drive API v3 Multipart quando informado OAuth2 Access Token ou vinculação direta com a pasta do Drive do Global Admin).

- **Configuração de Reset de PIN no Próximo Login e Pré-requisitos de Segurança do PIN na Tela do Funcionário (`/team/:employeeId`)** (`supabase/migrations/20261030000026_employee_pin_reset_and_policy.sql`, `src/utils/pinValidator.ts`, `src/pages/admin/StoreEmployeeEditPage.tsx`, `src/components/auth/EmployeePinResetModal.tsx`, `src/layouts/AppLayout.tsx`, `src/pages/TeamPage.tsx`, `src/services/userService.ts`, `src/types/user.types.ts`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/contracts.md`, `docs/pt-BR/changelog.md`):
  - **Resolução Automática da Loja na Rota `/team/:employeeId` (`userService.findStoreMemberByIdOrUserId`, `StoreEmployeeEditPage.tsx`)**: ao acessar diretamente URLs como `/team/8b588277-ea58-4f53-891c-a86f172d890a` (mesmo quando a visão ativa no seletor é `Visão Global` ou outra loja), a página localiza automaticamente o vínculo e a loja correspondente do funcionário.
  - **Configuração de Reset de PIN no Próximo Login (`requirePinReset`)**: adicionado controle de exigência de reset de PIN no próximo login na tela do funcionário (`StoreEmployeeEditPage.tsx`), botão rápido **"Gerar PIN Temporário + Exigir Reset no Login"**, atalho no menu `Ações Rápidas` de `/team` (`TeamPage.tsx`) e modal obrigatório `EmployeePinResetModal.tsx` em `AppLayout.tsx` que intercepta o próximo login do funcionário para cadastrar o novo PIN.
  - **Pré-requisitos Configuráveis e Validador em Tempo Real para o PIN (`pinRequirements`, `pinValidator.ts`)**: painel completo para configurar comprimento mínimo/máximo, exigência de **números (`0-9`)**, **letras maiúsculas (`A-Z`)**, **letras minúsculas (`a-z`)**, **símbolos especiais (`@#$%&*!?`)** e **bloqueio de sequências ou repetições (`1234`, `0000`, `AAAA`)**, com presets em 1 clique (*Forte*, *Máxima Segurança*, *Numérico Rápido*) e checklist interativo em tempo real.

- **Lista de Lojas Administradas em Menu Dropdown em `/global-admin?tab=users`** (`src/pages/GlobalAdminDashboardPage.tsx`, `src/components/ui/dropdown-menu.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/changelog.md`):
  - **Coluna `Lojas Administradas` como `DropdownMenu` (`GlobalAdminDashboardPage.tsx`)**: substituída a lista inline de badges por um menu dropdown compacto (`showChevron` e `triggerIcon` de loja), mantendo a altura das linhas uniforme mesmo quando o titular administra múltiplas unidades e permitindo abrir diretamente a edição de cada loja (`Matriz` ou `Filial`, com indicador de cota de funcionários) ou gerenciar os vínculos do usuário (`/global-admin/users/:userId/edit`).

- **Padronização de Todas as Telas com Tabelas no Padrão Visual e Viewport-Fitted de `/expiration` (`ExpirationPage.tsx`)** (`src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/admin/GlobalAdminFinancePaymentsPage.tsx`, `src/pages/InventoryPage.tsx`, `src/pages/TeamPage.tsx`, `src/pages/CustomersPage.tsx`, `src/pages/ReportsPage.tsx`, `src/pages/ProductsPage.tsx`, `src/pages/CategoriesPage.tsx`, `src/pages/SuppliersPage.tsx`, `src/pages/PurchasingPage.tsx`, `src/pages/OrdersPage.tsx`, `src/pages/StoresPage.tsx`, `src/pages/AuditLogsPage.tsx`, `src/pages/NotificationsPage.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/changelog.md`):
  - **Correção de Altura da Tabela (`h-full flex-1 min-h-0 flex flex-col`)**: todas as páginas com tabelas passaram a usar `h-full flex-1 min-h-0 flex flex-col` no container raiz e `flex-1 min-h-0 flex flex-col overflow-hidden` no `<Card>` e `<CardContent>`, garantindo que a tabela ocupe toda a área útil da tela (inclusive em `/global-admin?tab=users`, `/global-admin?tab=stores`, `/global-admin?tab=finance` e `/global-admin/finance/payments`, onde antes a tabela terminava na metade da tela quando havia poucos registros).
  - **Barra de Paginação (`<Pagination>`) Sempre Visível no Rodapé do Card (`flex-shrink-0`)**: a rolagem dos registros ocorre dentro do wrapper interno da tabela (`flex-1 min-h-0 overflow-auto custom-scrollbar`) com `thead sticky top-0`, mantendo a barra de paginação sempre ancorada na parte inferior visível do card sem ficar escondida abaixo do scroll da página.
  - **Pílulas de KPI Compactas de 1 Linha (Estilo `/expiration`)**: convertidos os cards altos de resumo em pílulas horizontais compactas (`px-3 py-1.5 rounded-lg border bg-card flex items-center justify-between`) em `/global-admin` (`stores`, `users`, `finance`), `/global-admin/finance/payments`, `/inventory`, `/team`, `/customers` e `/reports`, maximizando a área vertical dedicada às tabelas.

- **Ajuste de Posicionamento e Largura dos Menus de Ações Rápidas (`DropdownMenu`) em Todas as Páginas** (`src/components/ui/dropdown-menu.tsx`, `src/pages/CustomersPage.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/changelog.md`):
  - **Medição Real do DOM no Portal (`dropdown-menu.tsx`)**: substituída a largura fixa estimada (`200px`) pela medição real de largura e altura do menu renderizado (`menuRef.current.getBoundingClientRect()`) sincronizada via `React.useLayoutEffect` e `ResizeObserver`, utilizando `document.documentElement.clientWidth` / `clientHeight` e margem segura de `12px` para manter o menu estritamente dentro da tela na horizontal e vertical (com flip automático para cima quando próximo ao rodapé e reposicionamento contínuo em scroll/resize).
  - **Exibição Completa dos Nomes das Opções sem Corte (`dropdown-menu.tsx`)**: removido `truncate` dos itens de menu e aplicado `width: 'max-content'`, `maxWidth: 'calc(100vw - 24px)'` e `whitespace-normal sm:whitespace-nowrap break-words leading-snug`, evitando que opções longas saiam pela lateral da tela ou tenham seus nomes cortados em qualquer página (`/global-admin`, `/global-admin/stores/:storeId/edit`, `/global-admin/finance/payments`, `/global-admin/finance/rules`, `/global-admin/users/:userId/billing`, `/stores`, `/team`, `/expiration`, `/dashboard` e painéis administrativos).
  - **Popover de Múltipla Seleção de Status em `/customers` (`CustomersPage.tsx`)**: ajustado o alinhamento responsivo (`left-0 sm:left-auto sm:right-0 max-w-[calc(100vw-2rem)]`) para impedir corte lateral em telas menores.

- **Remoção do Item Duplicado "Painel Admin Global", Remoção do Menu de Abas em `/global-admin` e Correção de Scroll Vertical em Todas as Páginas** (`src/layouts/AppLayout.tsx`, `src/pages/GlobalAdminDashboardPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/ReportsPage.tsx`, `src/pages/ApiIntegrationsPage.tsx`, `src/pages/SalesPage.tsx`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/changelog.md`):
  - **Remoção de "Painel Admin Global" no Menu Lateral (`AppLayout.tsx`)**: como `/global-admin` e `/global-admin?tab=stores` abrem a mesma visão (`defaultFilters: { tab: 'stores' }`), o link duplicado `Painel Admin Global` foi removido da seção `Admin Global`, mantendo `Lojas & Filiais (Matriz)` (`/global-admin?tab=stores`), que permanece destacado tanto em `/global-admin` quanto em `/global-admin?tab=stores` e `/global-admin/stores/:storeId/edit`.
  - **Remoção do Menu Horizontal de Abas em `/global-admin` (`GlobalAdminDashboardPage.tsx`)**: a barra horizontal de abas dentro da página `/global-admin` foi removida (já que todas as seções do Admin Global constam diretamente no menu lateral), substituída por um cabeçalho contextual da seção ativa mantendo os filtros e o menu `Ações Rápidas`.
  - **Correção de Scroll Vertical em Todas as Páginas (`AppLayout.tsx` e páginas)**: removidas as classes `lg:overflow-hidden` e `flex flex-col` do `<main>` em `AppLayout.tsx` (agora `flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar`), bem como travas de `overflow-hidden` / `h-full` nos containers de páginas (`GlobalAdminDashboardPage`, `DashboardPage`, `ReportsPage`, `ApiIntegrationsPage`, `SalesPage`), permitindo rolagem vertical fluida em todas as telas no desktop e mobile.

- **Atualização do Menu Lateral (`AppLayout.tsx`) com Agrupamento da Seção "Admin Global" e Inclusão das Novas Páginas** (`src/layouts/AppLayout.tsx`, `src/hooks/usePermissions.ts`, `src/constants/screenDependencies.ts`, `src/i18n/locales/pt-BR.ts`, `src/i18n/locales/en-US.ts`, `src/i18n/locales/es-ES.ts`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/changelog.md`):
  - **Seção `Admin Global` (`id: 'global-admin'`)**: agrupamento dedicado no menu lateral para `GLOBAL_ADMIN` reunindo o Painel Admin Global (`/global-admin`), Lojas & Filiais Matriz (`/global-admin?tab=stores`), Nova Loja / Filial (`/global-admin/stores/new`), Usuários Store Admin (`/global-admin?tab=users`), Novo Admin de Loja (`/global-admin/users/new`), Financeiro Visão Geral (`/global-admin?tab=finance`), Regras & Licenças — 10 Grátis (`/global-admin/finance/rules`), Planos & Telas SaaS (`/global-admin/finance/plans`), Pagamentos & Faturas (`/global-admin/finance/payments`), Backups Multi-Loja (`/global-admin?tab=backups`), DB Explorer (`/global-admin?tab=db-explorer`), Chaves API & HBAC (`/global-admin?tab=api-hbac`) e Exclusão Definitiva (`/global-admin?tab=delete`).
  - **Seção `Gestão` (`id: 'management'`)**: adicionados os links diretos para **Lojas & Filiais** (`/stores`) e **Novo Funcionário** (`/team/new`) junto a Pedidos (`/orders`), Relatórios (`/reports`) e Equipe & Papéis (`/team`).
  - **Destaque de Rota Ativa (`isNavItemActive`) e Controle de Acesso (`hasRouteAccess`)**: suporte a query strings (`?tab=...`) e sub-rotas dedicadas de edição (`/global-admin/stores/:storeId/edit`, `/global-admin/users/:userId/*`, `/team/:employeeId`).

- **Atualização da Landing Page (`/`, `/features`, `/pricing`), `README.md` e Sincronização Completa da Documentação Técnica (`docs/pt-BR/*`)** (`src/pages/LandingPage.tsx`, `src/pages/FeaturesPage.tsx`, `src/pages/PricingPage.tsx`, `README.md`, `docs/pt-BR/README.md`, `docs/pt-BR/ai-context.md`, `docs/pt-BR/overview.md`, `docs/pt-BR/architecture.md`, `docs/pt-BR/frontend-inventory.md`, `docs/pt-BR/backend-inventory.md`, `docs/pt-BR/contracts.md`, `docs/pt-BR/security.md`, `docs/pt-BR/ui-map.md`, `docs/pt-BR/knowledge-gaps.md`, `docs/pt-BR/changelog.md`):
  - **Landing Page (`/`) e Páginas Institucionais (`/features`, `/pricing`)**:
    - Vitrine completa dos **12 módulos da plataforma**: Dashboard Executivo Multi-Loja & BI, Controle de Estoque & Aprovador de Baixa (`STOCK_APPROVER`), Lotes & Validades FEFO, Hierarquia Matriz → Filiais & Remessa Sem Venda (`execute_stock_transfer_to_branch`), PDV Frente de Caixa com Pesagem `KG`/`g` & Edição de Pedidos, CRM de Clientes com Deep-Link na URL (`/customers?customerId=...&orderId=...`) + Multi-Status + Visões Salvas no Banco por Loja/Filial (`store_saved_views`), 9 Relatórios Analíticos com Filtros de Datas/Períodos e Data/Hora exatas + `Exportar Visíveis`, Compras & Markup, Catálogo Digital WhatsApp, Gestão de Equipe com Franquia de **10 Funcionários Grátis por Loja** & 47 Permissões Granulares, Planos Comerciais SaaS com Grafo de Dependências de Telas & Hub Financeiro, e Integrador de APIs Estilo Postman (`/integrations`) + Tokens HBAC.
    - Alinhamento da página `/pricing` com os pacotes comerciais SaaS e a regra de licenciamento de 10 funcionários grátis por loja.
  - **Documentação & `README.md`**:
    - Atualização do `README.md` raiz e de toda a árvore `docs/pt-BR/` refletindo as 25 migrations SQL, 15 RPCs invocadas pelo frontend, 34 páginas e controles de segurança em produção.

- **Relatórios com Filtro de Datas/Períodos, Registro de Compras/Vendas com Data e Hora, Pedidos por Cliente com Deep-Link na URL (`/customers?customerId=...&orderId=...`), Seleção Múltipla de Status, Visões Salvas no Banco por Loja/Filial e Exportação Detalhada Somente dos Visíveis** (`supabase/migrations/20261030000025_store_saved_views.sql`, `src/services/savedViewService.ts`, `src/pages/CustomersPage.tsx`, `src/services/customerService.ts`, `src/types/customer.types.ts`, `src/pages/ReportsPage.tsx`, `src/services/reportService.ts`, `src/types/report.types.ts`):
  - **Filtros de Período e Datas Personalizadas em `/reports` (`ReportsPage.tsx`, `reportService.ts`)**:
    - Adicionados filtros rápidos de período (`Todo o Histórico`, `Hoje`, `Esta Semana`, `Este Mês`, `Mês Passado`, `Últimos 90 Dias`, `Este Ano` e `Data Personalizada De / Até`) sincronizados com a URL (`?period=...&from=...&to=...`).
    - Na aba **Ticket Médio & Clientes (`customers`)**, lista todos os pedidos realizados por cada cliente com data e hora exatas (`DD/MM/YYYY HH:mm`), contadores de pedidos abertos/fechados/cancelados, sub-tabela expansível com o histórico individual de pedidos do cliente e links clicáveis diretos para `/customers?customerId=:id&orderId=:orderId`.
    - Na aba **Compras & Fornecedores (`purchasing`)**, exibe o registro de compras com **data e hora exatas** de emissão e recebimento (`formatDateTime`) e o detalhamento dos itens comprados (`itemsSummary`).
    - Na aba **Vendas & Desempenho (`sales`)**, exibe o registro de vendas com **data e hora exatas**, itens detalhados do pedido, meio de pagamento e link direto para o pedido na tela do cliente (`/customers?customerId=:id&orderId=:orderId`).
  - **Histórico de Pedidos por Cliente e Filtro por URL em `/customers` (`CustomersPage.tsx`, `customerService.ts`)**:
    - Cada cliente exibe todos os seus pedidos na coluna **Pedidos Realizados** (chips clicáveis com número do pedido, valor, data/hora e status) e em uma sub-tabela expansível com detalhamento de data e hora, canal, itens comprados, pagamento e status.
    - Suporte completo a filtro via URL (`/customers?customerId=...&orderId=...`): ao acessar ou clicar no link de um pedido, a tela filtra os registros na URL e abre/destaca automaticamente o modal de detalhes completos do pedido daquela pessoa, com botão para copiar o link direto.
  - **Seleção Múltipla de Status e Visões Salvas no Banco por Loja/Filial (`store_saved_views`, `savedViewService.ts`, `CustomersPage.tsx`)**:
    - O seletor de status em `/customers` suporta **múltipla seleção** simultânea tanto de status dos pedidos (`PENDING`, `CONFIRMED`, `PROCESSING`, `READY`, `SHIPPED`, `DELIVERED`, `CANCELLED`, com atalhos rápidos para *Pedidos Abertos*, *Pedidos Fechados* e *Cancelados*) quanto de status do cliente (`ACTIVE`, `INACTIVE`), além de filtro de período/datas.
    - Criada a tabela `public.store_saved_views` (com RLS por `has_store_access(store_id)` e fallback em `stores.theme_config.saved_views`) para salvar visões de filtros **individualmente por loja ou filial (`store_id`)**, incluindo visões padrão (*Pedidos em Aberto*, *Pedidos Fechados (Entregues)*, *Pedidos Cancelados*, *Todos os Clientes Ativos*) e criação/atualização/exclusão de visões personalizadas pela equipe da unidade.
  - **Exportação Somente do que Está Visível com Detalhamento Completo dos Pedidos (`CustomersPage.tsx`, `ReportsPage.tsx`)**:
    - O botão `Exportar Visíveis` em `/customers` e `/reports` exporta **exclusivamente os registros visíveis na tela no momento da exportação** (respeitando busca, filtros de status/período, visão ativa e página visível), incluindo todas as colunas detalhadas dos pedidos (número, data e hora exatas, status, canal, forma de pagamento, subtotal, desconto, frete, total e discriminação dos itens com SKU, quantidade e preços).

- **Correção da Abertura e Renderização das Abas de Relatórios em `/reports`** (`src/pages/ReportsPage.tsx`, `src/services/reportService.ts`, `src/hooks/useTablePagination.ts`):
  - **Causa Raiz 1 — Enum Inválido `'OUT'` em `stock_movement_type_enum` (`reportService.ts`)**:
    - As consultas `getRetailSummaryKPIs`, `getLossesReport` (aba *Perdas & Baixas*) e `getConsumptionDemandReport` (aba *Giro & Compra por Consumo*) filtravam `stock_movements` com `movement_type = 'OUT'`, valor inexistente no enum PostgreSQL `stock_movement_type_enum` (`'ENTRY'`, `'EXIT'`, `'SALE'`, `'RETURN'`, `'ADJUSTMENT'`, `'LOSS'`, `'DAMAGE'`, `'EXPIRATION'`, `'TRANSFER'`, `'INVENTORY_COUNT'`), gerando erro HTTP 400 do PostgREST e impedindo a abertura do relatório. Substituído pelos valores válidos do enum (`LOSS`, `DAMAGE`, `EXPIRATION`, `EXIT`, `SALE`) com fallback para `order_items` nos últimos 30 dias.
  - **Causa Raiz 2 — Suporte à Visão Consolidada (`storeId === 'all'`) e Seletor de Loja (`ReportsPage.tsx`, `reportService.ts`)**:
    - Quando o `GLOBAL_ADMIN` operava em `Visão Global (Todas as Lojas)` (`storeId === 'all'`), `hasActiveStore` avaliava `false` e bloqueava a execução de todas as 9 queries (`enabled: false`). Agora todos os 9 métodos de relatório suportam consulta consolidada multi-loja (`storeId === 'all'`) ou filtrada por loja específica, com seletor de unidade diretamente no cabeçalho de `/reports`.
  - **Causa Raiz 3 — Troca Atômica de Abas e Prevenção de Colapso de Altura (`useTablePagination.ts`, `ReportsPage.tsx`)**:
    - Adicionado `setFilters` em lote em `useTablePagination.ts` e estado local sincronizado `activeTab` em `ReportsPage.tsx`, garantindo troca instantânea de aba em uma única atualização de URL (`?tab=...`) e `min-h-[480px]` no card principal para que a tabela do relatório nunca colapse em telas menores.

- **Dashboard Executivo Completo (`/dashboard`) com Gráficos por Loja, Top Produtos Mais Vendidos, Vendas Mensais (12 Meses), Filtros de Período/Tempo e Exportação de Dados (CSV, JSON e PDF)** (`src/pages/DashboardPage.tsx`, `src/services/reportService.ts`, `src/types/report.types.ts`):
  - **Barra de Filtros Dinâmica com Sincronização na URL (`?period=30d&from=...&to=...&store=ALL&channel=ALL&granularity=day`)**:
    - Presets rápidos de período (`Hoje`, `7 Dias`, `30 Dias`, `90 Dias`, `Este Mês`, `Mês Passado`, `Este Ano`, `Tudo`), seletores customizados `De / Até`, seletor de unidade (`Todas as Lojas Consolidado` ou `Matriz` / `Filial` específica), filtro por canal (`PDV`, `WhatsApp`, `Online`) e granularidade do gráfico (`Diário`, `Semanal`, `Mensal`).
  - **8 KPIs Executivos com Comparativo vs. Período Anterior (`%`)**:
    - Receita Bruta, Lucro Bruto & Margem Média (`%`), Pedidos Concluídos, Ticket Médio, Unidades Vendidas, Patrimônio em Estoque (custo e venda estimada), Alertas de Ruptura e Lotes Críticos (`<= 30d`).
  - **Gráficos de Vendas Mensais e Evolução Temporal Interativos**:
    - Alternância em 1 clique entre **Vendas Mensais (Últimos 12 Meses)** e **Evolução no Período Selecionado**, exibindo barras duplas de Receita e Lucro Estimado, linha de tendência, tooltips detalhados e indicadores de Pico e Média.
  - **Gráfico Comparativo por Loja (`Matriz vs. Filiais`)**:
    - Comparativo visual de faturamento, lucro bruto, margem, pedidos, itens vendidos, valor em estoque e participação (`% Share`) de cada unidade, permitindo clicar em qualquer loja para filtrar todo o Dashboard instantaneamente.
  - **Ranking de Produtos Mais Vendidos (`Top Produtos`)**:
    - Lista visual com miniatura do produto, SKU, categoria, unidades vendidas, faturamento, lucro bruto, margem (`%`), participação nas vendas e alerta de estoque atual, ordenável por **Faturamento (`R$`)**, **Quantidade (`un.`)** ou **Lucro Bruto (`R$`)**.
  - **Gráficos de Acompanhamento Operacional**:
    - Gráfico Donut SVG de **Vendas por Categoria**, distribuição por **Canal de Venda** (`PDV`, `WhatsApp`, `Catálogo Online`), **Meios de Pagamento** (`PIX`, `Cartão`, `Dinheiro`) e **Ritmo por Dia da Semana** (`Dom` a `Sáb`).
  - **Exportação Completa do Período Selecionado (`DropdownMenu`)**:
    - Download imediato em **CSV (Excel)** de Pedidos do Período, Produtos Mais Vendidos, Desempenho por Loja e Vendas Mensais (12m), além de **JSON Completo** e **Relatório Executivo para Impressão / PDF**.

- **Hierarquia Matriz → Filiais, Dropdown Único de Ações Rápidas, Licenciamento de 10 Funcionários Grátis por Loja, Área Financeiro no Global Admin e Separação de Modais em Páginas Dedicadas com URLs Próprias** (`supabase/migrations/20261030000024_global_finance_licensing_rules.sql`, `AppRoutes.tsx`, `GlobalAdminDashboardPage.tsx`, `StoresPage.tsx`, `TeamPage.tsx`, `dropdown-menu.tsx`, `GlobalAdminStoreEditPage.tsx`, `StoreEmployeeEditPage.tsx`, `GlobalAdminUserEditPage.tsx`, `GlobalAdminUserPermissionsPage.tsx`, `GlobalAdminUserBillingPage.tsx`, `GlobalAdminFinanceRulesPage.tsx`, `GlobalAdminFinancePlansPage.tsx`, `GlobalAdminFinancePaymentsPage.tsx`):
  - **Exibição Hierárquica Matriz → Filiais (`/global-admin?tab=stores` e `/stores`)**:
    - As lojas filiais (`is_branch = true` ou `parent_store_id != null`) são agrupadas e renderizadas imediatamente abaixo de sua respectiva Matriz como linhas filhas indentadas (`└─ Filial`), exibindo o código da filial, vínculo com a matriz, administradores (`STORE_ADMIN`) e consumo de licenças de equipe.
    - O Global Admin pode editar a filiação de qualquer loja (converter entre Matriz Independente e Filial vinculada a outra Matriz) e gerenciar os usuários `STORE_ADMIN` na página dedicada `/global-admin/stores/:storeId/edit`.
  - **Consolidação de Todas as Ações Rápidas em Botão Dropdown Único (`dropdown-menu.tsx`)**:
    - Todas as abas de `/global-admin` (`Lojas & Filiais`, `Usuários Admin`, `Financeiro`, `Backups`, `DB Explorer`, `API & HBAC`, `Exclusão Definitiva`), além de `/stores` e `/team`, utilizam um único botão `Ações Rápidas` com menu dropdown flutuante renderizado via Portal.
  - **Exclusão de Funcionários Operacionais de `/global-admin?tab=users`**:
    - Funcionários operacionais da loja (`SELLER`, `INVENTORY`, `STOCK_APPROVER`, `FINANCE`, `VIEWER`) não pagam plano individual e são gerenciados dentro da loja (`/team` ou `/global-admin/stores/:storeId/edit`); a aba `/global-admin?tab=users` lista exclusivamente titulares `STORE_ADMIN` e `GLOBAL_ADMIN`.
  - **Regras de Licenciamento de Equipe (10 Funcionários Grátis + Cobrança por Licença Adicional) na Aba "Financeiro" (`/global-admin?tab=finance` e `/global-admin/finance/rules`)**:
    - Criada a tabela `public.global_billing_rules` e colunas de override por loja (`free_employees_limit`, `extra_employee_price` em `public.stores`).
    - Cada loja possui por padrão **10 funcionários ativos grátis**; acima da franquia, cada licença adicional soma automaticamente o valor unitário configurável à mensalidade do `STORE_ADMIN`, com simulador e exceções por loja editáveis em `/global-admin/finance/rules`.
  - **Separação de Modais em Páginas Completas com URLs Próprias**:
    - Substituídos os modais sobrecarregados por 8 páginas completas com rotas próprias identificando loja, funcionário e usuário na URL: `/global-admin/stores/:storeId/edit`, `/global-admin/stores/:storeId/employees/:employeeId`, `/team/stores/:storeId/employees/:employeeId`, `/global-admin/users/:userId/edit`, `/global-admin/users/:userId/permissions`, `/global-admin/users/:userId/billing`, `/global-admin/finance/rules`, `/global-admin/finance/plans` e `/global-admin/finance/payments`.

- **Correção da Troca de Abas e Contadores em Tempo Real em `/inventory` (`Saldos`, `Movimentos`, `Aprovações de Baixa`, `Remessas p/ Filiais`)** (`useTablePagination.ts`, `InventoryPage.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`):
  - **Causa Raiz (`useTablePagination.ts` + React Router v7)**:
    - Em `react-router-dom` v7, múltiplas chamadas a `setSearchParams` no mesmo ciclo de evento leem `location.search` da closure da renderização atual (não enfileirando mutações de forma síncrona). Em `InventoryPage.tsx`, os botões das abas (`Saldos`, `Movimentos`, `Aprovações de Baixa`, `Remessas p/ Filiais`) invocavam `setFilter('tab', '...')` seguido de `setPage(1)` no mesmo `onClick`; a segunda chamada (`setPage(1)`) lia `searchParams` obsoleto (sem `tab`) e sobrescrevia a URL de volta para `?`, cancelando a navegação de aba.
    - Adicionado `latestParamsRef` síncrono em `useTablePagination.ts` para compor múltiplas atualizações de query string no mesmo evento sem perda de parâmetros, além de remover chamadas redundantes a `setPage(1)` (pois `setFilter` já reseta `page`).
  - **Contadores e Invalidação de Queries (`InventoryPage.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`)**:
    - As queries de `balancesData`, `movementsData` e `lossReasons` passaram a carregar sempre que há loja ativa (`enabled: Boolean(hasActiveStore)`), exibindo os contadores reais nas abas desde o primeiro carregamento e invalidando `stock-writeoff-requests` imediatamente após solicitações ou baixas de estoque.

- **Cadastro de Funcionários, Papéis Granulares, Aprovador de Baixa de Estoque (`STOCK_APPROVER`) e Remessa de Estoque para Filiais Sem Venda** (`supabase/migrations/20261030000023_staff_roles_approvers_and_branches.sql`, `TeamPage.tsx`, `GlobalAdminDashboardPage.tsx`, `StoresPage.tsx`, `InventoryPage.tsx`, `EmployeeRolePermissionsModal.tsx`, `StoreCustomRolesModal.tsx`, `StockBranchTransferModal.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`):
  - **Gestão Completa de Funcionários e Papéis Customizados (`/team` e `/global-admin?tab=users`)**:
    - `STORE_ADMIN` e `GLOBAL_ADMIN` podem cadastrar/editar funcionários via RPC `public.upsert_store_employee`, definindo matrícula (`employee_code`), cargo (`job_title`), papel base (`STORE_ADMIN`, `STOCK_APPROVER`, `MANAGER`, `SELLER`, `CASHIER`, `INVENTORY`, `FINANCE`, `VIEWER`), papel customizado da loja (`public.store_custom_roles`) e matriz de permissões granulares individuais (`granted_permissions` e `revoked_permissions`) para todos os recursos do sistema.
  - **Fluxo Exclusivo de Aprovador de Baixa de Estoque (`STOCK_APPROVER` / `inventory.approve_writeoff`)**:
    - Função `public.can_user_approve_writeoff(p_store_id, p_user_id, p_estimated_value)` valida se o usuário possui alçada explícita de aprovação de baixa e se o valor financeiro está dentro do limite `max_writeoff_value`.
    - `public.apply_stock_movement` endurecida para bloquear qualquer baixa direta (`LOSS` / `ADJUSTMENT`) cujo operador ou aprovador (`approved_by`) não possua alçada válida.
    - Fila de solicitações de baixa (`public.stock_writeoff_requests`) e RPC `public.review_stock_writeoff_request`: operadores sem alçada enviam solicitações pendentes (`PENDING`), e somente aprovadores autorizados podem aprovar (efetuando a baixa atômica do lote) ou rejeitar com justificativa auditada.
  - **Cadastro de Filiais e Transferência de Estoque Sem Venda (`/stores` e `/inventory`)**:
    - Suporte a vínculo de unidades como Filial (`is_branch = true`, `parent_store_id`, `branch_code`, `manager_name`) em `public.stores`.
    - Tabelas `public.stock_transfers` e `public.stock_transfer_items` + RPC atômica `public.execute_stock_transfer_to_branch`: transfere lotes da Matriz para a Filial (`TRANSFER_OUT` -> `TRANSFER_IN`) sem necessidade de venda, sincronizando categoria, produto mestre e lote com validade na filial para venda imediata no PDV da filial.

- **Planos Comerciais SaaS, Grupos de Permissões em Tela com Grafo de Dependências e Controle Financeiro de Assinaturas** (`supabase/migrations/20261029000022_saas_permission_groups_and_billing.sql`, `GlobalSaasBillingPanel.tsx`, `SubscriptionGuardModal.tsx`, `featureDependencies.ts`, `saasBillingService.ts`, `usePermissions.ts`, `ProtectedRoute.tsx`, `AppLayout.tsx`):
  - **Motor de Dependências entre Telas (`featureDependencies.ts`)**:
    - Ao desmarcar um módulo para um usuário ou plano (mesmo que seja `STORE_ADMIN`), o sistema exibe alertas em tempo real sobre impactos funcionais em outros módulos (ex.: desativar `sales_pos` impacta `orders_management`; desativar `inventory_control` impacta `batches_expiration` e `purchases_suppliers`).
  - **Grupos de Perfil com Precificação Comercial e Cobrança (`saas_permission_groups`, `user_subscriptions`, `subscription_payments`)**:
    - Criação e edição de pacotes comerciais com valores mensais/anuais (ex.: *Catálogo WhatsApp*, *Controle de Estoque + Validades*, *PDV & Frente de Caixa*, *ERP Enterprise Completo*), atribuição direta a usuários com módulos customizados, bloqueio por inadimplência e histórico auditado de pagamentos.

- **Integrador de APIs Estilo Postman & Vinculação com Serviços Internos (`/integrations`)** (`supabase/migrations/20261028000021_api_integrator_studio.sql`, `ApiIntegratorPage.tsx`, `apiIntegratorService.ts`, `CustomersPage.tsx`, `CategoriesPage.tsx`, `ProductsPage.tsx`, `SuppliersPage.tsx`):
  - **Request Builder Completo**: Configuração de método HTTP, URL, autenticação (`Bearer`, `Basic`, `API Key`, `Custom Header`), query params, headers, body JSON/Form, variáveis de ambiente encriptadas e JSONPath Data Explorer.
  - **Service Binding Engine**: Mapeamento visual ` Drag/Select` de campos JSON externos para os serviços internos de **Clientes**, **Grupos/Categorias**, **Produtos**, **Fornecedores** e **Estoque**, com botão de sincronização direta nas telas operacionais e logs de execução (`api_sync_logs`).

## 2026-10-19

- **Associação Obrigatória de Cliente com Fallback Automático para "Cliente Genérico" no PDV (`/sales`)** (`customerService.ts`, `orderService.ts`, `CustomerCombobox.tsx`, `SalesPage.tsx`):
  - **Resolução e Criação Automática (`customerService.getOrCreateGenericCustomer`)**:
    - Todo pedido criado no PDV exige vínculo com um registro válido de cliente (`customer_id`).
    - Caso o operador não informe nenhum cliente no seletor do PDV, `orderService.createOrder` localiza automaticamente o cadastro `"Cliente Genérico"` (ou `"Consumidor Final"`) da loja ativa — reativando-o caso esteja inativo — ou cria o registro `"Cliente Genérico"` automaticamente antes de invocar a RPC `create_order_with_stock`.
  - **Atualização Visual no Checkout e Combobox (`CustomerCombobox.tsx`, `SalesPage.tsx`)**:
    - Indicadores visuais no seletor e rodapé de checkout informando que o cliente é obrigatório e que `"Cliente Genérico"` é associado por padrão quando nenhum cliente específico é selecionado.

- **Correção do Salvamento na Edição de Vendas (`/orders` → `/sales?editOrder=:id`)** (`orderService.ts`, `SalesPage.tsx`, migration `20261019000019_allow_delete_cancelled_orders_on_edit.sql`):
  - **Causa Raiz 1 — Bloqueio Silencioso de RLS `DELETE` e Violação de Constraint `uq_order_store_number` (`23505`)**:
    - A tabela `public.orders` não possuía política RLS para `DELETE`, fazendo com que `supabase.from('orders').delete().eq('id', replaceOrderId)` afetasse `0` linhas silenciosamente e a chamada subsequente a `create_order_with_stock` falhasse com erro de chave duplicada (`uq_order_store_number`) ao reutilizar o mesmo `order_number`.
    - Criada a migration `20261019000019_allow_delete_cancelled_orders_on_edit.sql` adicionando a política `"Orders delete cancelled: tenant staff"` para permitir exclusão de pedidos já cancelados (`status = 'CANCELLED'`) pela equipe da loja (`STORE_ADMIN`, `SELLER`, `FINANCE`) ou `is_global_admin()`.
    - Adicionada proteção multicamada em `orderService.createOrder`: localiza todos os registros conflitantes da loja por `id = replaceOrderId` ou `order_number`, garante o cancelamento prévio e restauração de estoque (ignorando caso já esteja cancelado), tenta exclusão direta e, se o registro permanecer no banco, renomeia seu `order_number` com sufixo `-SUB-` (ocultado em `orderService.listOrders` e `globalAdminService.listEntities`).
    - Adicionada validação preventiva (*pre-flight check*) de unicidade de `(store_id, order_number)` antes de chamar `create_order_with_stock` e ampliação do *retry* automático contra `23505` / `uq_order_store_number`, eliminando em definitivo a mensagem `"Registro duplicado. Já existe um item com este identificador único nesta loja."` ao salvar uma venda editada.
  - **Causa Raiz 2 — Falso Positivo de `"Estoque insuficiente"` ao Carregar Pedido para Edição (`SalesPage.tsx`)**:
    - Os itens vindos do relacionamento `orders -> order_items -> products(*)` não contêm a coluna calculada `stock_quantity` (que vem de `stock_balances`), fazendo com que `stockByProduct` avaliasse `0` se `storeId` ainda não estivesse disponível no primeiro ciclo ou se o cache de `products-pos` estivesse obsoleto (`keepPreviousData`).
    - O carregamento de `editOrder` agora aguarda `storeId` estar definido, inicializa `stock_quantity` de cada item do carrinho de edição com `Math.max(Number(prod?.stock_quantity ?? 0), itemQty)` e consolida `stockByProduct` preservando o maior saldo entre a listagem e o carrinho reaberto.

## 2026-10-15

- **Revisão e Correção Abrangente de Filtros e Buscas na Plataforma** (`useTablePagination.ts`, `globalAdminService.ts`, `productService.ts`, `customerService.ts`, `supplierService.ts`, `purchasingService.ts`, `auditService.ts`, `CategoriesPage.tsx`, `TeamPage.tsx`, `StoresPage.tsx`, `GlobalAdminDashboardPage.tsx`, `GlobalDeletePanel.tsx`):
  - **Correção de Digitação e Reset de Filtro em `useTablePagination.ts`**:
    - Removido `.trim()` em tempo real no `setSearch`, permitindo digitar espaços entre palavras sem que sejam apagados a cada renderização.
    - Normalizada a limpeza de chaves de filtro em `setFilter`: valores `'ALL'`, `'all'`, `'TODOS'`, `'todos'` ou strings vazias removem o parâmetro da URL de forma uniforme, sem deixar parâmetros obsoletos residuais.
  - **Correção da Tabela `suppliers` no Painel de Exclusão Global (`/global-admin?tab=delete`)**:
    - Corrigida referência indevida a `name` na tabela `suppliers` (que possui `corporate_name` e `trade_name`), evitando o erro SQL `42703 (column suppliers.name does not exist)` que quebrava o carregamento da entidade de fornecedores.
    - Adicionado suporte a busca tolerante a acentos via `buildAccentRegex` e `.imatch` em todas as entidades do painel de exclusão global.
    - Limpeza automática da busca ao alternar entre entidades e retorno suave de página caso o usuário exclua registros restantes da página atual.
    - Isolamento de filtros por aba no `GlobalAdminDashboardPage.tsx`: alternar entre abas limpa os parâmetros de filtro que pertenciam apenas à aba anterior (ex: `status=ACTIVE` de lojas não contamina `tab=delete` ou `tab=users`).
  - **Sanitização de Sintaxe PostgREST e Busca Tolerante a Acentos em Produtos (`/products`, `/sales`, `/store/:slug`)**:
    - Sanitização de caracteres delimitadores de árvore lógica do PostgREST (`%`, `,`, `(`, `)`) evitando erros `PGRST100 (syntax error)`.
    - Busca com `buildAccentRegex` e `.imatch` no catálogo de produtos, no PDV e no catálogo público de e-commerce.
  - **Sanitização e Acentuação em Clientes (`/customers`) e Fornecedores (`/suppliers`)**:
    - Busca tolerante a acentos e caracteres especiais em nomes corporativos, nomes fantasia, documentos, telefones e e-mails de clientes e fornecedores.
  - **Expansão de Busca em Ordens de Compra (`/purchasing`)**:
    - A busca agora pré-localiza fornecedores compatíveis (`corporate_name`, `trade_name`) e busca em conjunto por número do pedido e observações.
    - Aceita filtros de status ou fornecedor `'ALL'` ou `'all'` sem quebrar a listagem.
  - **Sanitização em Logs de Auditoria (`/audit`)**:
    - Sanitização de caracteres no campo de busca de logs de auditoria e normalização de filtro de ação `'ALL'`.
  - **Busca em Memória Resiliente a Acentos em Categorias, Equipe e Lojas**:
    - `CategoriesPage.tsx`, `TeamPage.tsx` e `StoresPage.tsx` atualizados para normalizar strings com decomposição NFD (`normalize('NFD')`), permitindo encontrar termos sem se preocupar com maiúsculas/minúsculas ou acentuação gráfica.

- **Correção de Erro HTTP 400 na Exclusão Definitiva de Pedidos (`/global-admin?tab=delete`)** (`GlobalDeletePanel.tsx`, migration `20261015000018_fix_restore_stock_after_delete_cancelled_orders.sql`):
  - **Bypass de Restauração de Estoque em Pedidos Cancelados**:
    - Pedidos com status `CANCELLED` já tiveram seu estoque estornado previamente no momento do cancelamento (`restore_sale_stock`).
    - A migration 15 havia regredido a função `restore_stock_after_delete` omitindo o bypass da migration 12, fazendo com que a exclusão de pedidos cancelados tentasse reverter novamente o saldo e disparasse erro `400 (P0001: o saldo do produto mudou depois deste registro)`.
    - Migration 18 restabelece a salvaguarda em `restore_stock_after_delete` e adiciona validação direta em `global_admin_delete` (`COALESCE(status, '') <> 'CANCELLED'`), garantindo exclusão limpa sem erros.
  - **Otimizações no Painel de Exclusão (`GlobalDeletePanel.tsx`)**:
    - Ajuste automático de paginação: quando o operador exclui o último item de uma página (ex.: página 3), o painel transiciona automaticamente para a página anterior válida (`page - 1`), impedindo visualização de páginas órfãs vazias.
    - Mensagem de erro inteligível no frontend caso o operador tente excluir um pedido não-cancelado cujos produtos já tenham sofrido movimentações subsequentes no estoque.

- **Correção de Erro HTTP 400 na Busca de Pedidos e Vendas (`/orders`)** (`orderService.ts`):
  - **Eliminação de Referência Inválida à Coluna Inexistente `customer_name` em `orders`**:
    - A tabela `orders` possui relação via `customer_id` e não possui a coluna `customer_name`. O filtro `.or('order_number.ilike...,customer_name.ilike...')` gerava erro `400 (Bad Request)` em qualquer busca textual.
  - **Busca Multidimensional e Tolerante a Acentos**:
    - A busca agora pré-resolve clientes compatíveis na tabela `customers` (por nome, documento ou telefone) e produtos compatíveis na tabela `products` (por nome ou SKU) através da função `buildAccentRegex`.
    - Localiza os pedidos tanto pelo número do pedido (`order_number`), observações (`notes`), cliente vinculado (`customer_id.in`) quanto pelos itens contidos no pedido (`order_items.product_id.in`), permitindo pesquisar por exemplo `"uva"`, `"PED-906"`, ou o nome de um cliente sem erros.

- **Correção de Erro HTTP 400 e Busca Tolerante a Acentos em Estoque e Movimentações (`/inventory`)** (`inventoryService.ts`, `productUtils.ts`):
  - **Eliminação de `.or()` com Colunas de Relações Embutidas**:
    - O PostgREST do Supabase não suporta filtros `.or()` de primeiro nível referenciando tabelas relacionadas (como `products.name` ou `products.sku` em consultas sobre `stock_balances`).
    - Em `inventoryService.getStockBalances`, a busca agora resolve previamente os IDs dos produtos correspondentes diretamente na tabela `products` e aplica `query.in('product_id', productIds)`. Se nenhum produto for encontrado, retorna `{ data: [], total: 0 }` imediatamente sem disparar erro 400.
    - Em `inventoryService.getStockMovements`, a busca também pré-resolve `product_id` e `batch_id` para utilizar filtros válidos na tabela raiz (`notes`, `reason_code`, `cost_center_code`, `product_id.in`, `batch_id.in`).
  - **Busca Tolerante a Acentuação (`buildAccentRegex`)**:
    - Implementada a função `buildAccentRegex` que mapeia vogais para conjuntos fonéticos (ex.: `vitoria` localiza `Uva Vitória` e vice-versa), utilizando PostgREST `imatch` (`~*` no PostgreSQL).
  - **Atualização de Timestamp de Saldo na Importação**:
    - Ao importar planilhas que atualizam preços ou saldos, `stock_balances.updated_at` é atualizado para o timestamp atual, garantindo que o produto apareça imediatamente na primeira página da listagem (ordenada por `updated_at desc`).

- **Correção e Suporte a Reimportação de Planilha Exportada de Estoque (`/inventory`)** (`StockImportModal.tsx`, `inventoryService.ts`, `importParser.ts`):
  - **Reconhecimento de Colunas Exportadas de Saldos**:
    - Adicionados aliases canônicos em `importParser.ts` para cabeçalhos gerados na exportação: `Saldo Físico`, `Disponível`, `Preço de Compra / Custo Unit. (R$)`, `Preço de Venda Unit. (R$)`, `Estoque Mínimo`, `Produto`, `Unidade`.
    - Normalização resiliente com `parseImportNumber`, suportando decimais com vírgula ou ponto, símbolos monetários (`R$`) e formatos numéricos diversos.
  - **Tratamento Inteligente de Importação de Saldos vs. Movimentações Avulsas**:
    - Quando o arquivo não possui coluna `movement_type` (como planilhas exportadas de saldos), o sistema classifica os registros como `isBalanceImport = true` e tipo base `ADJUSTMENT`.
    - Não exige campos obrigatórios de baixas avulsas (`reason_code`, `cost_center_code`, `approver_email`) para importações de saldos físicos.
    - Validação de quantidade ajustada para aceitar saldo zero (`quantity >= 0`), eliminando o erro falso de `quantidade inválida`.
    - Fallback de localização de produto por SKU, ID e Nome do Produto (`product_name`).
  - **Atualização Atômica de Preços, Estoque Mínimo e Verificação de Delta de Saldo**:
    - Em `inventoryService.importMovementsBulk`, sincroniza automaticamente `cost_price`, `selling_price` e `min_stock` na tabela `products` para refletir de imediato no PDV e catálogo.
    - Compara a quantidade informada com o saldo atual (`Math.abs(targetQty - currentQty) > 0.0001`): se o usuário alterou apenas o preço ou custo sem mexer na quantidade física, não chama o RPC de movimento com delta zero (evitando o erro `A quantidade informada nao altera o saldo atual`), atualizando os preços com sucesso total.
    - Suporta ajuste de saldo para zero com auditoria e sem disparar restrições de quantidade estrita.

- **Edição de Pedidos via Reabertura no PDV (`/orders` → `/sales`)** (`OrdersPage.tsx`, `SalesPage.tsx`, `orderService.ts`, `productService.ts`):
  - **Ação "Editar no PDV" na Área de Detalhes do Pedido**:
    - Adicionado botão de ação em destaque **"Editar Pedido no PDV"** no modal de detalhes do pedido (`/orders`).
    - Modal de confirmação inteligente detalhando o estorno atômico de estoque e envio dos itens e do cliente para a tela de Venda.
    - Se o pedido estiver ativo, estorna o estoque atômico de volta para a loja (`restore_sale_stock`) e redireciona para `/sales?editOrder=:id`.
  - **Sincronização com Preço Vigente do Estoque e Reutilização do Número do Pedido**:
    - **Sincronização Automática com Preço Vigente**: Ao carregar os itens do pedido em edição no PDV, o sistema atualiza automaticamente os preços unitários (`unitPrice`) com o valor atual de venda do produto no catálogo/estoque (`fresh.selling_price`), garantindo que alterações de preço feitas no estoque reflitam imediatamente no pedido revisado.
    - **Atualização In-Place sem Duplicata**: Na finalização da edição, o sistema reaproveita o número do pedido original (`orderNumber`) e substitui o registro anterior (`replaceOrderId`), eliminando duplicatas com status cancelado e garantindo histórico limpo.
    - **Navegação Direta e Feedback**: Redireciona de volta para `/orders` com notificação de sucesso e carrinho limpo ao finalizar ou descartar a edição.
  - **Experiência de Edição Completa no PDV (`/sales`)**:
    - Pré-carregamento imediato dos itens no carrinho (com suporte total a itens pesáveis `KG` ou unitários `UN`, preços vigentes e descontos).
    - Pré-seleção automática do cliente vinculado no combobox, com possibilidade de alterar para outro cliente ou cadastrar novo via modal rápido.
    - Exibição de banner de alerta contextual (*"Editando pedido PED-XXXXXX. Altere os itens e o cliente à vontade"*), com botão para descartar edição.
    - Inclusão dos produtos do pedido no mapa de saldos (`stockByProduct`) com atualização em lote via `productService.getProductsByIds`.
    - Finalização da venda gera o pedido revisado e sincroniza os estoques e métricas.

- **Cadastro Rápido de Clientes na Venda PDV e Otimização do Combobox de Clientes** (`SalesPage.tsx`, `CustomerQuickCreateModal.tsx`, `CustomerCombobox.tsx`):
  - **Botão de Ação Direta "Novo Cliente"**:
    - Adicionado botão com ícone `UserPlus` ao lado do seletor de clientes na lateral do checkout do PDV (`/sales`).
    - Abre o modal rápido `CustomerQuickCreateModal` com campos essenciais: Nome Completo/Razão Social, CPF/CNPJ, Telefone/WhatsApp, E-mail e Observações.
    - Salva no banco de dados (`customers`), invalida as consultas de clientes do cache e seleciona automaticamente o novo cliente na venda em andamento (`selectedCustomerId`).
  - **Combobox de Clientes Aprimorado (`CustomerCombobox`)**:
    - Resolução automática de dados do cliente por ID (`customer-by-id`) quando selecionado programaticamente ou cadastrado via modal, garantindo exibição imediata do nome e documento no campo.
    - Amostra ajustada para os **3 últimos clientes** cadastrados, garantindo que os elementos caibam com perfeição na visualização do operador sem cortes visuais.
    - Posicionamento dinâmico inteligente (abre para cima quando posicionado próximo ao rodapé do painel de checkout), garantindo visibilidade total dos itens e do botão "Consumidor Final".

## 2026-10-08

- **Suporte a Produtos Pesáveis e Venda Fracionada (KG / Gramas) no Catálogo Público da Loja** (`CatalogPublicPage.tsx`, `productUtils.ts`):
  - **Experiência de Pesagem Completa para o Consumidor Final**:
    - Produtos com unidade `KG` recebem a etiqueta visual **`KG (PESO)`** e preço formatado por quilo (`R$ XX,XX/kg`).
    - Botão **"Escolher Peso (KG)"** abre o modal interativo de pesagem (`WeightInputModal`) diretamente na vitrine pública.
    - O cliente pode digitar livremente em gramas (ex: `150g`), quilos (ex: `0,150 kg`) ou valor que deseja gastar em R$ (ex: `R$ 5,00`), além de usar os atalhos rápidos (`100g`, `150g`, `250g`, `500g`, `1 kg`).
  - **Carrinho & Pedidos via WhatsApp com Discriminação de Peso**:
    - No carrinho do catálogo público, exibe a gramatura/quilos e cálculo proporcional exato.
    - Ao finalizar no WhatsApp, a mensagem gerada discrimina detalhadamente os itens pesados com peso e preço por quilo (ex: `• Alho a Granel (150g) - R$ 2,47 (R$ 16,45/kg)`).
  - **Grade Responsiva**: Catálogo adaptado para 1 item por linha no mobile e cards enriquecidos.

- **Otimizações Mobile: Layout de 1 Item por Linha no PDV e Menu com Botão 'Acessar Painel' em Destaque** (`SalesPage.tsx`, `PublicLayout.tsx`, `AppLayout.tsx`):
  - **Catálogo PDV em 1 Item por Linha no Mobile** (`SalesPage.tsx`):
    - Grade ajustada para `grid-cols-1` em telas móveis (`< 640px`) e `sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.
    - Cards com tipografia nítida, botões de toque confortáveis, badge de peso `KG`, preço em destaque e saldo visual sem apertos.
  - **Menu de Navegação Pública & Entrada na Plataforma** (`PublicLayout.tsx`):
    - Itens do menu móvel reestruturados em lista vertical de 1 item por linha com espaçamento amplo e feedback de toque.
    - Botão **"Acessar Painel"** (para usuários logados) e **"Acessar Painel / Entrar"** colocado em **destaque primário full-width** com ícone e sombra (`shadow-primary/25`).
  - **Menu Lateral do App** (`AppLayout.tsx`):
    - Navegação inferior de atalhos ajustada para 1 item por linha contínua no mobile.

- **Suporte a Produtos Pesáveis e Venda Fracionada (KG / Gramas) no PDV Frente de Caixa** (`SalesPage.tsx`, `WeightInputModal.tsx`):
  - **Identificação Automática de Itens Pesáveis**: Detecção inteligente de produtos cadastrados com unidade `KG` ou `QUILOGRAMA`. Exibição de badge `KG` e preço formatado por quilo (`R$ XX,XX/kg`) no catálogo e no carrinho.
  - **Modal Interativo de Pesagem & Gramatura** (`WeightInputModal`):
    - Ao selecionar um produto em KG no PDV, abre modal intuitivo para informe de peso.
    - Suporte a 3 modos de entrada sincronizados em tempo real:
      1. **Gramas (g)** com botões de incremento/decremento rápido (-50g / +50g).
      2. **Quilogramas (kg)** com precisão decimal (3 casas decimais - `0,150 kg`).
      3. **Valor em Dinheiro (R$)** calculando automaticamente a quantidade correspondente em quilos/gramas.
    - **Atalhos Rápidos de Peso**: Botões de 1 toque para pesos frequentes (`100g`, `150g`, `200g`, `250g`, `300g`, `500g`, `750g`, `1 kg`, `1,5 kg`, `2 kg`).
    - Validação de saldo disponível em tempo real e visualização de total calculado.
  - **Carrinho & Checkout com Precisão Fracionária**:
    - Botão de ajuste rápido de peso diretamente no carrinho com abertura do modal ou ajuste em passos de 50g.
    - Integração transparente com `orderService.createOrder` e a função RPC atômica do Supabase (`NUMERIC(12,3)`), baixando a fração exata do estoque (ex: 0,150 kg de Alho a Granel).

- **Sincronização Cadastral, Preços de Compra/Venda, Rastreabilidade de Fornecedores e Lotes no Estoque**:
  - **Cadastro Completo de Produtos no Catálogo Mestre** (`ProductsPage.tsx`, `productService.ts`):
    - Inclusão dos campos de **Preço de Custo (R$)**, **Preço de Venda (PDV) (R$)** e seleção de **Fornecedor Principal** diretamente no modal de criação e edição de produtos.
    - Exibição de colunas de Custo, Venda e Fornecedor na tabela de listagem de produtos com cálculo de margem em tempo real.
  - **Lançamento Enriquecido de Movimentações Manuais** (`InventoryPage.tsx`, `inventoryService.ts`):
    - Modal de *Lançar Movimento* agora suporta informe de **Preço de Compra / Custo Unitário**, **Preço de Venda Unitário no PDV**, **Fornecedor**, **Número do Lote** e **Data de Validade** nas entradas manuais.
    - Sincronização automática com a tabela de produtos (`products`) e lotes (`stock_batches`) para atualização imediata no PDV frente de caixa.
  - **Rastreabilidade e Origem do Estoque** (`ProductStockDetailsModal.tsx`, `InventoryPage.tsx`, `inventoryService.ts`):
    - Novo modal de *Origem & Lotes* acessível por linha de saldo, exibindo:
      1. Fornecedor vinculado, dados cadastrais e contatos (telefone, e-mail, contato).
      2. Relação de todos os lotes ativos, validades e status de expiração (dias restantes, avisos 30d/7d).
      3. Histórico das entradas e compras com preços unitários pagos e notas.
    - Filtro rápido de saldo no topo de Estoque (`Todos os Produtos`, `Com Estoque Ativo`, `Estoque Zerado`).
    - Ordenação padrão por itens recentemente movimentados (`updated_at desc`).

## 2026-10-07

- **Plano de Teste & Roteiro de Automação E2E com Execução em Tenant Dedicado** (`test-automation/`):
  - **Criação do Tenant Isolado de Testes**: Loja dedicada `Loja QA Automação E2E` (`loja-qa-automacao-e2e`) para execução de testes contínuos sem interferir em lojas de produção ou homologação.
  - **Roteiro Técnico Passo a Passo para Automação Externa** (`test-automation/ROTEIRO_AUTOMACAO_TESTES_E2E.md`, `test-automation/roteiro_casos_de_teste.json`): Especificação completa contendo 33 casos de teste (TC-01 a TC-33) com pré-condições, rotas, payloads, critérios de aceite e templates para automação em Playwright, Cypress e Postman.
  - **Runner Automatizado de Testes** (`test-automation/executar_roteiro_testes.js`): Execução ponta a ponta cobrindo cadastro de fornecedores, 4 categorias, 4 produtos no catálogo mestre, carga inicial de 400 unidades de estoque com lotes e validades (`31/10/2026`), venda no PDV com dedução atômica, cancelamento com estorno automático, emissão e recebimento de ordem de compra, e acesso/validação em 100% das telas da aplicação (incluindo os 9 relatórios de varejo, auditoria, configurações e catálogo público web).
  - **Relatório Executivo & Evidências Gravadas Localmente** (`test-automation/RELATORIO_EXECUCAO_TESTES.md`, `test-automation/resultado_execucao_testes.json`): 100% de sucesso (33/33 casos de teste aprovados em 20,26 segundos).

## 2026-10-05

- **Padronização Responsiva de Tabelas & Botões de Ação Visíveis no Mobile** (`src/components/common/ResponsiveTable.tsx`, `src/index.css`, e todas as páginas de gestão):
  - **Unificação do Padrão de Cards Mobile**: Substituição de tabelas/listas duplicadas isoladas por `<ResponsiveTable>`, transformando cada linha da tabela em cards organizados em dispositivos móveis (`< 768px`) com grid de 2 colunas e labels semânticos.
  - **Botões de Ação Grandes e Imediatamente Visíveis**: Eliminação de menus escondidos ou botões de ícone minúsculos nas ações de linha. Em todas as telas (`/products`, `/categories`, `/purchases`, `/orders`, `/customers`, `/suppliers`, `/batches`, `/stores`, `/team`, `/inventory`, `/audit`, `/notifications` e `/global-admin`), as ações agora possuem botões grandes (`min-height: 38px`), áreas de toque acessíveis (*touch-friendly*), ícones e textos claros (Ex: *Fotos, Editar, Excluir, Detalhes, Receber, Cancelar, Baixa, Reset Senha*).
  - **CSS Responsivo Dedicado**: Otimização de `.responsive-mobile-cards tbody td.mobile-table-actions` para renderizar ações em linha horizontal inferior com separador visual, ocultação do rótulo redundante "AÇÕES" e expansão natural dos botões.

## 2026-10-02

- **Página de Evidências na Landing Page & Rota `/evidence`** (`src/pages/EvidencePage.tsx`, `AppRoutes.tsx`, `PublicLayout.tsx`, `LandingPage.tsx`):
  - Nova página pública interativa integrada à arquitetura React da aplicação com filtro por categoria, alternador de visualização (Desktop/Mobile/Ambos), busca instantânea e modal lightbox em tela cheia com atalho `ESC`.
  - Links de navegação adicionados no menu principal superior, menu mobile e rodapé do site institucional.
  - Seção de vitrine de qualidade e testes adicionada na `LandingPage` com cards de visualização rápida.
- **Caderno Executivo de Testes em Markdown** (`docs/pt-BR/test-evidence.md`, `docs/evidence/README.md`):
  - Documentação completa em Markdown com todas as 50 capturas de tela renderizadas em pares Desktop & Mobile, detalhamento das rotas, descrições operacionais e tabela consolidada de testes de APIs REST com tokens HBAC.
- **Caderno Executivo de Testes & Evidências Visuais em HTML** (`docs/pt-BR/test-evidence.html`, `public/test-evidence.html`):
  - Execução automatizada de testes e captura em alta resolução de 50 screenshots (25 telas e fluxos em Desktop 1440×900 e Mobile 390×844).
  - Validação de 100% dos fluxos de gestão, incluindo Dashboard, Catálogo Mestre, Estoque com Valorização, Compras com Markup, PDV Frente de Caixa, Pedidos, Clientes, Fornecedores, Validades, os 9 Relatórios de Varejo e as 5 abas do Painel Global Admin.
  - Testes de API REST e integração com IAs externas via tokens HBAC na loja de homologação GNZ Hortifruti com status HTTP 200 OK.
  - Relatório interativo em HTML moderno com filtros dinâmicos, comparador de viewport, busca e visualizador modal lightbox com zoom.
- Novos Relatórios de Gestão Estratégica & Varejo em `/reports` (`ReportsPage.tsx`, `reportService.ts`, `report.types.ts`):
  - **Giro de Estoque & Compra Baseada no Consumo (`demand`)**: Cálculo de consumo médio diário (últimos 30 dias), previsão de esgotamento/cobertura em dias (*runout*), recomendação inteligente de compra para cobertura de 30 dias, investimento necessário projetado e classificação de urgência (`URGENT`, `ATTENTION`, `NORMAL`, `OVERSTOCK`).
  - **Ticket Médio por Cliente & Comportamento / LTV (`customers`)**: Análise de histórico de compras com cálculo de total de pedidos, LTV acumulado, ticket médio por transação, recência (dias desde a última compra), canal preferido de atendimento e segmentação automática (`VIP`, `FREQUENT`, `OCCASIONAL`, `INACTIVE`).
  - **Levantamento & Investimento de Capital de Giro por Categoria (`investment`)**: Consolidação do capital investido (a custo) por categoria, potencial de faturamento na gôndola, lucro bruto projetado, margem %, % de alocação no estoque da loja e GMROI (*Gross Margin Return on Investment*).
  - Sincronização completa de URL state para todas as abas de relatórios via `useTablePagination` (`?tab=...&page=...&search=...&status=...`).
  - Exportação CSV dedicada para todos os 9 relatórios consolidados do sistema.
- Redesenho e modernização do menu de relatórios em `/reports` (`ReportsPage.tsx`):
  - **Menu Segmentado de Relatórios**: Barra de navegação moderna com abas em pílula, ícones dedicados por tipo de análise, títulos responsivos e badges dinâmicos de contagem/alerta (ex: total de unidades, status da Curva ABC 80/15/5, alertas de ruptura e perdas).
  - **Barra de Contexto e Filtros Integrada**: Header contextual com ícone temático, descrição explicativa da análise ativa, contador instantâneo de registros filtrados, seletores de categoria/classe ABC/gravidade com ícones integrados e botões de ação rápida para exportação CSV e impressão de demonstrativo executivo.
  - **Experiência Responsiva e Touch**: Container com rolagem horizontal suave para dispositivos móveis sem quebra de layout ou estouro de viewport.

## 2026-10-01

- Painel Global Admin (`/global-admin`, `GlobalAdminDashboardPage.tsx`):
  - **Menu Dropdown de Ações Rápidas**: Transformação das ações de topo e de linha nas tabelas de Lojas e Usuários em menus dropdown (`<DropdownMenu />`), organizando edição, transferência de propriedade, catálogo público, redefinição de senha e exclusão.
  - **Central de Backup & Exportação Multi-loja** (`GlobalBackupPanel.tsx`, `backupService.ts`):
    - Exportação de Dump SQL da base com comandos `INSERT INTO` relacionais completos, filtráveis por loja individual ou backup geral de todas as lojas.
    - Exportação de arquivo `.ZIP` contendo todas as imagens de produtos da loja com manifesto indexado (`manifest.json` com SKU, nome e ID do produto).
    - Exportação de pacote relacional estruturado em `.JSON` para BI, auditoria e homologação.
  - **Gerenciador e Explorador de Banco de Dados (CRUD Completo)** (`GlobalDbExplorerPanel.tsx`, `dbManagerService.ts`):
    - Interface dinâmica para inspeção tabular com paginação, busca e filtro por loja.
    - Modais de inserção de novos registros, edição de linhas existentes e exclusão com modal de confirmação em todas as tabelas gerenciadas (`stores`, `products`, `categories`, `stock_balances`, `stock_batches`, `stock_movements`, `orders`, `purchase_orders`, `customers`, `suppliers`, `cost_centers`, `loss_reasons`).
  - **Configuração de API & Controle de Acesso HBAC por Loja** (`GlobalApiKeyHbacPanel.tsx`, `apiKeyService.ts`):
    - Geração de tokens de API com escopos HBAC granulares (`products:*`, `inventory:*`, `orders:*`, `purchases:*`, `customers:*`, `reports:*`, `audit:*`) e presets rápidos (Admin, Operador, Leitura, Integração ERP/PDV).
    - Isolamento rígido por loja (`store_id`) associada ao token ou escopo global multi-loja.
    - Suporte a tokens com expiração configurável (30, 90, 365 dias) ou chave permanente (sem expiração).
    - Gestão de ciclo de vida (cópia de chave, ativação/desativação, revogação) e documentação interativa integrada com exemplos de cabeçalhos e chamadas `curl`/`fetch`.
- Desacoplamento de Preço de Custo e Preço de Venda do cadastro base de produtos em `/products` (`ProductsPage.tsx`): o cadastro em `/products` funciona como catálogo mestre (SKU, código de barras, categoria, unidade, estoques mín/máx), permitindo que preços reais de custo e venda venham das entradas em estoque (`/purchases`, entrada em lote, lotes de diferentes fornecedores).
- Reformulação completa da página de Relatórios em `/reports` (`ReportsPage.tsx`, `reportService.ts`, `report.types.ts`):
  - KPIs executivos no topo: Estoque em Custo, Estoque em Venda, Margem Bruta %, Faturamento no Mês, Perdas Operacionais e Alertas de Ruptura.
  - Relatório 1: **Valorização & Rentabilidade do Estoque** (Custo Unitário, Venda Unitária, Totais, Lucro Estimado e Margem %).
  - Relatório 2: **Curva ABC & Mix de Produtos** (Classificação A/B/C automática por valor, % do mix, % acumulado e diretrizes de reposição).
  - Relatório 3: **Compras & Fornecedores** (Volume financeiro por pedido, custo total, venda projetada e margens praticadas).
  - Relatório 4: **Perdas & Baixas Operacionais** (Avarias, vencimentos, descartes, centros de custo e operadores).
  - Relatório 5: **Ruptura & Reposição** (Identificação de produtos zerados e críticos com cálculo automático de déficit de compra e custo estimado de reposição).
  - Relatório 6: **Desempenho de Vendas** (Histórico detalhado por canal, cliente, descontos e total pago).
  - Padrão visual e funcional unificado com `/inventory` e `/products`: paginação integrada, responsividade desktop/mobile, busca instantânea, filtros por categoria/status e exportação CSV em todos os relatórios.
- Integração de Preço de Custo e Preço de Venda em `/purchases` (`PurchasingPage.tsx`, `purchasingService.ts`, `purchasing.types.ts`): emissão de ordens de compra com cálculo em tempo real de lucratividade/margem por item e total, sincronização imediata dos custos e preços de venda com o catálogo de produtos e reflexão direta nos relatórios e saldos de `/inventory`.
- Implementação de avaliação financeira e valores de produtos em `/inventory`: exibição de Valor de Compra (Custo unitário e total), Valor de Venda (tabela unitário e total), Lucro Estimado e Margem média consolidada nos cards de KPI e colunas da tabela de saldos (`InventoryPage.tsx`, `inventoryService.ts`, `inventory.types.ts`).
- Exportação avançada de saldos em CSV incluindo valores de compra, venda, totalização e margem estimada.
- Implementação de seleção múltipla e baixa de estoque em lote na aba de saldos de `/inventory` (`BulkStockWriteoffModal.tsx`, `inventoryService.writeoffBulkStock`, `InventoryPage.tsx`), com suporte a motivo, centro de custo, aprovador e preenchimento rápido de saldo total.
- Ação em lote para remoção de produtos zerados selecionados para Global Admin.

## 2026-09-30

- Correção de contraste e legibilidade da badge "Global Admin" na listagem de usuários de `/global-admin` (`GlobalAdminDashboardPage.tsx`).
- Remoção de produtos com estoque zerado no painel `/inventory` para o perfil Global Admin (individual e em lote com `ConfirmModal`).
- Seleção múltipla de produtos em `/products` e modal de entrada de estoque em lote direta (`BulkStockEntryModal.tsx`, `inventoryService.addBulkStock`).
- Remoção de jargões técnicos excessivos ("SaaS", "Enterprise", "Multi-tenant") e padronização da marca para "Olivelas Gestão / Estoque & Vendas".
- Redesenho completo e profissional da Landing Page (`LandingPage.tsx`) com foco em valor real, segmentos atendidos, workflow prático, catálogo WhatsApp e FAQ detalhado.
- Normalização robusta de cabeçalhos e valores na importação de produtos CSV/JSON em massa (`importParser.ts`, `productService.ts` e `ProductsPage.tsx`).
- Correção de pré-visualização de preços e categorias na modal de importação em massa.
- Sistema de galeria de imagens para produtos com suporte a upload pelo dispositivo/câmera e reuso da biblioteca de mídia (`ProductGalleryModal.tsx`, `productImageService.ts`).

## 2026-09-27

- Criação da árvore `docs/` (pt-BR) a partir de inventário do código e SQL.
- Guias de replicação de shell desktop e mobile.
- `AGENTS.md` apontando para `docs/pt-BR/ai-context.md`.
- Status dos docs: `DRAFT` (sem revisão humana registrada).
