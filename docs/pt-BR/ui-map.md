---
id: ARCH-OLIVELAS-UI-MAP
title: Mapa de interface desktop e mobile
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
language: pt-BR
classification: Confirmed
source:
  - src/layouts/AppLayout.tsx
  - src/layouts/PublicLayout.tsx
  - src/layouts/AuthLayout.tsx
  - src/index.css
  - tailwind.config.js
  - src/components/common/ResponsiveTable.tsx
  - src/components/common/PageHeader.tsx
  - src/components/ui/modal.tsx
  - src/components/ui/dropdown-menu.tsx
  - src/pages/DashboardPage.tsx
  - src/pages/ReportsPage.tsx
  - src/pages/CustomersPage.tsx
  - src/pages/GlobalAdminDashboardPage.tsx
---

# Mapa desktop × mobile

Não há aplicativo nativo. “Mobile” e “desktop” são **viewports** da mesma SPA, com Tailwind (defaults): `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px. `darkMode: ['class']`.

A classe `xs:` aparece em `PageHeader` (`xs:max-w-[200px]`). `tailwind.config.js` **não** define screen `xs`. Efeito prático: o prefixo `xs:` não aplica (utilitário ignorado). Confirmed no config; o `max-w-[160px]` sem prefixo continua válido.

## Shell autenticado (`AppLayout`)

Raiz: `h-dvh max-h-dvh flex flex-col md:flex-row overflow-hidden`.

| Região | &lt; `md` (mobile) | ≥ `md` (desktop) |
| --- | --- | --- |
| Sidebar | `fixed` `w-64` `z-50`; `-translate-x-full` até `sidebarOpen` | `md:static md:translate-x-0` sempre visível |
| Backdrop | `fixed inset-0 bg-black/60` `md:hidden` | ausente |
| Botão hamburger | header `md:hidden` | oculto |
| Fechar sidebar (X) | brand header `md:hidden` | oculto |
| Grupos de nav | botão accordion `md:hidden`; filhos `hidden` salvo grupo aberto | título `hidden md:flex`; filhos `md:block` |
| Links inferiores | `grid grid-cols-1` no mobile | `md:block md:space-y-1` |
| Header | coluna (`flex-col`); altura `min-h-12` | `md:h-12 md:flex-row` |
| Main | `overflow-y-auto overflow-x-hidden` | `overflow-y-auto overflow-x-hidden` (scroll vertical unificado em todas as páginas) |

Command palette (`GlobalCommandK`) está sempre montada no layout.

Tema da loja: `applyStoreTheme` quando há `storeId` ≠ `'all'`.

### Estrutura do Menu Lateral (`AppLayout`)

O menu lateral autenticado organiza todas as páginas e telas dedicadas em seções claras, filtradas dinamicamente via `hasRouteAccess`:

1. **Topo**:
   - `/dashboard` — Painel Geral (Dashboard Executivo Multi-Loja)
2. **Seção `Admin Global` (`id: 'global-admin'`, exclusiva para `GLOBAL_ADMIN`)**:
   - `/global-admin?tab=stores` — Lojas & Filiais (Matriz) (também destaca `/global-admin` sem `tab` e `/global-admin/stores/:storeId/edit`; o item duplicado "Painel Admin Global" e o menu horizontal de abas dentro da página `/global-admin` foram removidos)
   - `/global-admin/stores/new` — Nova Loja / Filial
   - `/global-admin?tab=users` — Usuários Store Admin (também destaca `/global-admin/users/:userId/*`)
   - `/global-admin/users/new` — Novo Admin de Loja
   - `/global-admin?tab=finance` — Financeiro (Visão Geral)
   - `/global-admin/finance/rules` — Regras & Licenças (10 Grátis)
   - `/global-admin/finance/plans` — Planos & Telas SaaS
   - `/global-admin/finance/payments` — Pagamentos & Faturas
   - `/global-admin?tab=backups` — Backups Multi-Loja
   - `/global-admin?tab=db-explorer` — DB Explorer (Banco)
   - `/global-admin?tab=api-hbac` — Chaves API & HBAC
   - `/global-admin?tab=delete` — Exclusão Definitiva
3. **Seção `Cadastros` (`id: 'registry'`)**:
   - `/products`, `/categories`, `/customers`, `/suppliers`
4. **Seção `Controle` (`id: 'control'`)**:
   - `/inventory`, `/expiration`, `/purchases`
5. **Seção `Gestão` (`id: 'management'`)**:
   - `/orders` — Pedidos
   - `/reports` — Relatórios
   - `/stores` — Lojas & Filiais
   - `/team` — Equipe & Papéis (também destaca `/team/:employeeId`)
   - `/team/new` — Novo Funcionário
6. **Links Inferiores**:
   - `/sales`, `/integrations`, `/notifications`, `/audit`, `/settings`

## Shell marketing (`PublicLayout`)

| Região | Mobile | `md+` |
| --- | --- | --- |
| Links Recursos / Planos / Evidências / Contato | hamburger; lista vertical 1 item por linha com botão CTA em destaque | `hidden md:flex` na navbar |
| Idioma / tema / login | no painel aberto | `hidden md:flex` à direita |
| Footer | `grid-cols-1` | `md:grid-cols-4` |

## Shell auth (`AuthLayout`)

Header empilha (`flex-col`) e vira `sm:flex-row`. Formulário `max-w-md` centralizado. Sem drawer.

## Tabelas (`ResponsiveTable`)

`ResponsiveTable` + CSS em `src/index.css` `@media (max-width: 767px)`:

- `.mobile-table-sort` visível (também `md:hidden` no JSX).
- `thead` oculto; `tbody tr` vira card `grid-template-columns: repeat(2, minmax(0, 1fr))`.
- Labels via `data-mobile-label` (MutationObserver nas `th`).
- Primeira célula e células `.mobile-table-actions` ocupam a linha inteira.

## Menus Dropdown via Portal (`DropdownMenu`)

`src/components/ui/dropdown-menu.tsx` renderiza o menu flutuante via `createPortal(..., document.body)` com medição real das dimensões do DOM (`useLayoutEffect`, `ResizeObserver` e `getBoundingClientRect`), respeitando margens seguras de viewport (`12px` em todos os lados, `width: 'max-content'`, `maxWidth: 'calc(100vw - 24px)'`, `maxHeight: 'calc(100vh - 24px)'`) e exibindo os rótulos completos das opções sem truncamento (`whitespace-normal sm:whitespace-nowrap break-words`), garantindo que o menu **Ações Rápidas** em todas as páginas (`/global-admin`, `/global-admin/stores/:storeId/edit`, `/global-admin/finance/*`, `/global-admin/users/:userId/*`, `/stores`, `/team`, `/expiration`, `/dashboard`) nunca saia da tela na lateral nem corte o nome das opções.

## Dashboard Executivo Multi-Loja (`DashboardPage`)

- **Barra de Controle Dinâmica**: seletor de unidade (`Todas as Lojas Consolidado`, `Matriz` ou `Filial`), presets rápidos de período (`Hoje`, `7d`, `30d`, `90d`, `Este Mês`, `Mês Passado`, `Este Ano`, `Tudo`), seletor de datas `De / Até`, filtro de canal (`PDV`, `WhatsApp`, `Online`), granularidade (`Diário`, `Semanal`, `Mensal`) e dropdown `Baixar Dados` (CSV, JSON e PDF/Impressão).
- **Grade de 8 KPIs Executivos**: cards responsivos (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) com badges de variação percentual vs. período anterior.
- **Gráficos Interativos**:
  - Gráfico principal de **Vendas Mensais (12 Meses)** e **Evolução no Período** com barras de Receita/Lucro e linha de tendência.
  - Card comparativo **Desempenho por Loja (Matriz vs. Filiais)** clicável para filtrar o Dashboard por unidade.
  - Ranking **Top Produtos Mais Vendidos** ordenável por Receita (`R$`), Volume (`un.`) ou Lucro (`R$`).
  - Gráficos de **Vendas por Categoria (Donut SVG)**, **Canais de Venda**, **Meios de Pagamento** e **Ritmo por Dia da Semana**.

## Central de Relatórios (`ReportsPage`)

Estrutura visual e responsividade:
- **Seletor de Loja e Barra de Filtros de Período / Datas Personalizadas**: permite alternar entre qualquer loja ou `Todas as Lojas (Consolidado)` e filtrar por `Todo o Histórico`, `Hoje`, `Esta Semana`, `Este Mês`, `Mês Passado`, `Últimos 90 Dias`, `Este Ano` ou intervalo `De / Até`.
- **Barra de KPIs Executivos no Topo**: 6 cards responsivos (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`) fixados para visualização instantânea de métricas financeiras.
- **Navegação Segmentada**: Barra de 9 abas com rolagem horizontal suave no mobile (`overflow-x-auto custom-scrollbar`), ícones coloridos por contexto e badges dinâmicos de alerta.
- **Registros com Data/Hora e Deep-Linking**:
  - Aba **Ticket Médio & Clientes (`customers`)**: exibe todos os pedidos de cada cliente com data e hora exatas (`DD/MM/YYYY HH:mm`), sub-tabela expansível e links clicáveis para `/customers?customerId=:id&orderId=:orderId`.
  - Aba **Compras & Fornecedores (`purchasing`)**: exibe data e hora exatas de emissão/recebimento e resumo dos itens comprados.
  - Aba **Vendas & Desempenho (`sales`)**: exibe data e hora exatas, itens detalhados, meio de pagamento e link para o pedido na tela do cliente.
- **Botão `Exportar Visíveis`**: exporta exclusivamente as linhas visíveis da aba ativa com todos os detalhes.

## Clientes, Pedidos na URL & Visões Salvas (`CustomersPage`)

- **Barra de Visões Salvas por Loja/Filial (`store_saved_views`)**: pílulas no topo para alternar em 1 clique entre visões padrão (*Pedidos em Aberto*, *Pedidos Fechados*, *Pedidos Cancelados*, *Todos os Clientes Ativos*) e visões personalizadas salvas no banco para aquela loja ou filial (`store_id`).
- **Seletor Multi-Status e Filtro de Período**: dropdown com checkboxes para múltipla seleção simultânea de status de pedidos (`PENDING`, `CONFIRMED`, `PROCESSING`, `READY`, `SHIPPED`, `DELIVERED`, `CANCELLED`) e status cadastral (`ACTIVE`, `INACTIVE`), além de presets de datas.
- **Coluna "Pedidos Realizados" e Sub-Tabela Expansível**: cada cliente exibe seus pedidos como pílulas clicáveis (com número, data/hora, total e status) e permite expandir o histórico completo na própria tabela.
- **Deep-Link via URL (`/customers?customerId=...&orderId=...`)**: filtra automaticamente o cliente na listagem e abre o modal de detalhes completos do pedido selecionado, com botão `Exportar Visíveis` no cabeçalho.

## Painel Global Admin (`GlobalAdminDashboardPage`) e Páginas Dedicadas

- **Navegação em 7 Abas**: Lojas & Filiais (`stores`), Usuários Admin (`users`), Financeiro (`finance`), Central de Backup (`backups`), Explorador de Banco de Dados (`database`), Chaves de API / HBAC (`apikeys`) e Exclusão Definitiva (`delete`).
- **Hierarquia Matriz → Filiais (`tab=stores` e `/stores`)**: filiais renderizadas como itens filhos indentados (`└─ Filial`) abaixo da Matriz correspondente.
- **Páginas Completas com URLs Próprias (substituindo modais sobrecarregados)**:
  - `/global-admin/stores/:storeId/edit` (edição da loja, filiação Matriz/Filial e administradores `STORE_ADMIN`)
  - `/global-admin/stores/:storeId/employees/:employeeId` e `/team/stores/:storeId/employees/:employeeId` (cadastro/edição de funcionário e 47 permissões granulares)
  - `/global-admin/users/:userId/edit`, `/global-admin/users/:userId/permissions` e `/global-admin/users/:userId/billing`
  - `/global-admin/finance/rules` (franquia de 10 funcionários grátis por loja e valor por licença extra), `/global-admin/finance/plans` (planos SaaS com grafo de dependências) e `/global-admin/finance/payments` (histórico e lançamento de pagamentos).

## PDV (`SalesPage`)

`grid-cols-1 lg:grid-cols-12`: abaixo de `lg`, grade de produtos e painel do carrinho **empilham**. Grid de cards de produto: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`. Suporta produtos pesáveis (`KG`/gramas via `WeightInputModal`), cadastro rápido de cliente (`CustomerQuickCreateModal`), associação automática de `"Cliente Genérico"` e modo de edição de pedido (`/sales?editOrder=:id`).

## Catálogo público (`CatalogPublicPage`)

Layout próprio (não usa `AppLayout`). Suporta seleção de peso (`KG`/gramas) para itens pesáveis, carrinho em `Modal` e checkout formatado via WhatsApp.

## Relacionamentos

- Replicação: [guides/ui-desktop.md](guides/ui-desktop.md), [guides/ui-mobile.md](guides/ui-mobile.md)
- Componentes: [frontend-inventory.md](frontend-inventory.md)
