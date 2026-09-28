---
id: REF-OLIVELAS-GUIDE-MOBILE
title: Replicar a interface mobile
type: Reference
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
source:
  - src/layouts/AppLayout.tsx
  - src/layouts/PublicLayout.tsx
  - src/index.css
  - src/components/common/ResponsiveTable.tsx
  - src/components/common/PageHeader.tsx
  - src/components/common/GlobalCommandK.tsx
  - src/components/ui/modal.tsx
  - src/pages/ProductsPage.tsx
  - src/pages/SalesPage.tsx
  - docs/pt-BR/ui-map.md
---

# Como construir a interface mobile (replicar esta lógica)

Este guia descreve o contrato **abaixo de `md` (768px)** — e o PDV empilhado **abaixo de `lg`**. É a mesma árvore de componentes do desktop; a diferença é CSS e um pouco de estado (`sidebarOpen`, `mobileExpandedGroup`, busca do `PageHeader`).

Mapa factual: [ui-map.md](../ui-map.md). Par do desktop: [ui-desktop.md](ui-desktop.md).

## 1. O que não fazer

- Não criar React Native / Capacitor neste padrão: o Olivelas é **web responsivo**.
- Não usar bottom tab bar: a navegação mobile é **drawer esquerdo** + accordion.
- Não depender de hover nem de Ctrl+K como único caminho (o CommandK existe, mas o acesso principal é o menu).

## 2. Altura e safe area

- Shell: `h-dvh max-h-dvh` (barra de URL móvel).
- Footers de modal e lista do CommandK: `pb-[max(1rem,env(safe-area-inset-bottom))]`.
- Evite `h-screen` sozinho no app autenticado.

## 3. Drawer de navegação (checklist `AppLayout`)

1. Estado `sidebarOpen` default `false`.
2. Aside `fixed inset-y-0 left-0 z-50 w-64` com `transform`: fechado `-translate-x-full`, aberto `translate-x-0`. Transição `duration-200`.
3. Backdrop `fixed inset-0 z-40 bg-black/60 backdrop-blur-sm` **somente** `md:hidden`; clique fecha o drawer.
4. Hamburger no header (`aria-label` “Abrir menu lateral”); X no brand da sidebar.
5. Ao navegar: `closeMobileNavigation()` zera drawer **e** `mobileExpandedGroup`.
6. **Grupos:** no mobile o título do grupo é `<button>` com `aria-expanded` / `aria-controls`. Só um grupo “aberto”: `mobileExpandedGroup ?? grupoDaRotaAtual`. Filhos `hidden` se o grupo não está aberto.
7. Links de PDV/notificações/auditoria/settings: `grid grid-cols-2 gap-1` para caber no thumb sem lista infinita.

## 4. Header compacto

- Coluna: hamburger + slot de título; na linha de baixo ou wrap, utilitários (idioma, tema, sino). Classes: `flex-col gap-2` até `md:flex-row`.
- `PageHeader`: abaixo de `sm`, esconda o input atrás do ícone Search; ao abrir, esconda o título (`isMobileOpen ? 'hidden sm:flex'`). Feche com X. Se o input já tem `value`, mantenha aberto.

## 5. Tabelas → cards (dois padrões usados aqui)

### Padrão A — um markup (`ResponsiveTable`)

1. Envolva a `<table>` no shell.
2. Colete `SortableHeader` na árvore; no mobile mostre select “Ordenar” + botão de direção (`md:hidden`).
3. CSS `@media (max-width: 767px)`: esconda `thead`; cada `tr` vira card 2 colunas; `td::before { content: attr(data-mobile-label) }`.
4. Preencha `data-mobile-label` a partir do texto das `th` (MutationObserver, como no componente).
5. Células de ações: classe `mobile-table-actions` se o header casar com `/aç(ões|ão)|ações rápidas|inspecionar/i`.

### Padrão B — dois markups (`ProductsPage`)

Tabela `hidden md:block` **e** lista `md:hidden` (divide-y). Use quando a linha desktop for densa demais para o grid 2×N.

Escolha um padrão por tela; não misture os dois na mesma lista sem motivo.

## 6. Sheets em vez de dialogs

`modal.tsx` e `GlobalCommandK`:

- Container: `items-end` no mobile, `sm:items-center` / `sm:items-start` depois.
- Painel: `rounded-t-[1.75rem]`, `border-t`, sem borda completa até `sm:border`.
- Handle `w-12 h-1.5` só `sm:hidden`.
- Animação `slide-in-from-bottom`.
- Botão “Fechar” texto no CommandK `sm:hidden` quando a query está vazia.

Formulários: botões empilhados `flex-col-reverse` (primário embaixo, mais perto do polegar); `h-11 w-full` no mobile.

## 7. Marketing público

Navbar: ícone Menu/X `md:hidden`. Painel `basis-full` com links `grid-cols-2`. Login/registro no rodapé do painel. Não deixe os links `hidden md:flex` como único caminho.

## 8. PDV e catálogo no telefone

- `SalesPage`: uma coluna até `lg` — o usuário **rola** do grid de produtos para o carrinho. Não esconda o carrinho atrás de um único FAB neste projeto (ele é o segundo bloco do grid).
- Produtos PDV: `grid-cols-2` no mais estreito.
- Catálogo `/store/:slug`: carrinho em modal (sheet); checkout = WhatsApp, não formulário de pagamento in-app.

## 9. Main scroll

Abaixo de `lg`, `main` usa `overflow-y-auto`. Páginas longas (dashboard, relatórios) devem ser a área que rola, não o `body` do documento (o shell já é `overflow-hidden`).

## 10. Toque e alvos

Padrão observado: controles de modal `h-11` no mobile vs `h-10` no `sm+`; ícones de header `p-1.5` (~40px com ícone 16–20px). Nav items `py-2.5`.

## 11. Realtime e teclado

Não bloqueie a UI mobile esperando atalho. Realtime (`useRealtimeSubscriptions`) é independente do viewport.

## 12. Ordem de implementação em outro projeto

1. Mesmo `AppLayout` do desktop, com as classes `md:hidden` / `-translate-x-full` ligadas a estado.
2. Accordion de grupos + grid 2 colunas nos links extras.
3. CSS de tabela-card **ou** lista duplicada.
4. Modal sheet + safe-area.
5. `PageHeader` colapsável.
6. Verificar PDV em 390px de largura: catálogo e carrinho empilhados, ambos usáveis.
7. Verificar landing: menu hamburger abre Recursos / Planos / Contato / auth.

## 13. Teste manual mínimo (o que o código espera)

| Viewport | Esperado |
| --- | --- |
| ~390×844 | drawer, cards/tabela-card, sheet, PDV empilhado |
| ~768 | sidebar aparece, tabela desktop, grupos abertos |
| ~1024 | PDV duas colunas, main sem scroll de página se a view for “viewport fit” |

Não há testes automatizados de viewport neste repositório ([knowledge-gaps.md](../knowledge-gaps.md)).
