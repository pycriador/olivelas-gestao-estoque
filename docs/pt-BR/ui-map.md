---
id: ARCH-OLIVELAS-UI-MAP
title: Mapa de interface desktop e mobile
type: Architecture
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
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
| Links inferiores | `grid grid-cols-2` | `md:block md:space-y-1` |
| Header | coluna (`flex-col`); altura `min-h-12` | `md:h-12 md:flex-row` |
| Main | `overflow-y-auto` | `lg:overflow-hidden` a partir de `lg` |

Command palette (`GlobalCommandK`) está sempre montada no layout.

Tema da loja: `applyStoreTheme` quando há `storeId` ≠ `'all'`.

## Shell marketing (`PublicLayout`)

| Região | Mobile | `md+` |
| --- | --- | --- |
| Links Recursos / Planos / Contato | hamburger; painel `grid-cols-2` | `hidden md:flex` na navbar |
| Idioma / tema / login | no painel aberto | `hidden md:flex` à direita |
| Footer | `grid-cols-1` | `md:grid-cols-4` |

## Shell auth (`AuthLayout`)

Header empilha (`flex-col`) e vira `sm:flex-row`. Formulário `max-w-md` centralizado. Sem drawer.

## Tabelas

`ResponsiveTable` + CSS em `src/index.css` `@media (max-width: 767px)`:

- `.mobile-table-sort` visível (também `md:hidden` no JSX).
- `thead` oculto; `tbody tr` vira card `grid-template-columns: repeat(2, minmax(0, 1fr))`.
- Labels via `data-mobile-label` (MutationObserver nas `th`).
- Primeira célula e células `.mobile-table-actions` ocupam a linha inteira.

`ProductsPage` **não** usa só esse CSS: duplica markup — tabela `hidden md:block` e lista `md:hidden`.

## Header de página (`PageHeader`)

Portal para `#page-header-slot`. Abaixo de `sm`, o campo de busca vira ícone; ao abrir, o título some (`hidden sm:flex` no bloco do título quando a busca está expandida).

## Modais e CommandK

Padrão sheet:

- Mobile: `items-end`, `rounded-t-[1.75rem]`, handle, `slide-in-from-bottom`.
- `sm+`: centralizado, `sm:rounded-2xl`, borda completa.

CommandK: mobile `items-end`; `sm:items-start sm:pt-20`. Atalho Ctrl/Cmd+K (pouco relevante em teclado virtual; a UI ainda abre se `isOpen`).

## Central de Relatórios (`ReportsPage`)

Estrutura visual e responsividade:
- **Barra de KPIs Executivos no Topo**: 6 cards responsivos (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`) fixados para visualização instantânea de métricas financeiras.
- **Navegação Segmentada**: Barra de pílulas com rolagem horizontal suave no mobile (`overflow-x-auto custom-scrollbar`), ícones coloridos por contexto e badges dinâmicos de alerta.
- **Barra Contextual de Filtros**: Header dinâmico com descrição da análise ativa, contador instantâneo de registros, seletores contextuais (Categoria, Classe ABC, Urgência de Compra, Segmento de Cliente ou Gravidade) e botões de ação para Exportação CSV e Impressão de Demonstrativo.
- **Modo Tabela vs Mobile Cards**: Desktop exibe tabela densa com sticky header e colunas numéricas alinhadas à direita; mobile (`md:hidden`) renderiza cards detalhados estruturados em grid 2 colunas com tipografia mono para valores.
- **Paginação Paginada no Rodapé**: Fixada no card principal e sincronizada com a query string da URL.

## Painel Global Admin (`GlobalAdminDashboardPage`)

- **Navegação em 5 Abas**: Lojas, Usuários da Plataforma, Explorador de Banco de Dados (`GlobalDbExplorerPanel`), Central de Backup Multi-loja (`GlobalBackupPanel`) e Chaves de API / HBAC (`GlobalApiKeyHbacPanel`).
- **Menus de Ações Rápidas**: Menus dropdown (`<DropdownMenu />`) na listagem de lojas e usuários para evitar poluição visual.
- **Explorador de Banco de Dados**: CRUD completo para 12 entidades relacionais com modais de inserção/edição e confirmação de exclusão.
- **Central de Backup**: Geração sob demanda de Dumps SQL relacionais completos (`INSERT INTO`), pacotes compactados `.ZIP` de imagens com `manifest.json` e arquivos estruturados `.JSON`.
- **Gestor de Tokens HBAC**: Criação de chaves com seleção granular de escopos, preset rápido, cópia instantânea e documentação interativa com exemplos `curl`/`fetch`.

## PDV (`SalesPage`)

`grid-cols-1 lg:grid-cols-12`: abaixo de `lg`, grade de produtos e painel do carrinho **empilham**. Grid de cards de produto: `grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`.

## Formulários em modal

Padrão repetido nas pages: campos `grid-cols-1 sm:grid-cols-2`; botões Cancelar/Salvar `flex-col-reverse sm:flex-row` e `w-full sm:w-auto h-11 sm:h-10` (área de toque maior no mobile).

## Catálogo público

Layout próprio (não usa `AppLayout`). Carrinho em `Modal`. Checkout WhatsApp.

## Tokens visuais

CSS variables em `:root` e `.dark` (`src/index.css`). Cores Tailwind mapeiam `hsl(var(--...))`. Utilitários `.glass` / `.glass-border` existem; uso pontual nas pages não foi inventariado um a um.

## Relacionamentos

- Replicação: [guides/ui-desktop.md](guides/ui-desktop.md), [guides/ui-mobile.md](guides/ui-mobile.md)
- Componentes: [frontend-inventory.md](frontend-inventory.md)
