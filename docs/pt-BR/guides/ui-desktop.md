---
id: REF-OLIVELAS-GUIDE-DESKTOP
title: Replicar a interface desktop
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
  - src/layouts/AuthLayout.tsx
  - src/pages/SalesPage.tsx
  - src/pages/DashboardPage.tsx
  - src/components/common/PageHeader.tsx
  - src/components/common/GlobalCommandK.tsx
  - src/components/ui/modal.tsx
  - docs/pt-BR/ui-map.md
---

# Como construir a interface desktop (replicar esta lógica)

Este guia descreve **o contrato visual e estrutural que o Olivelas usa a partir de `md` (768px) e, no PDV, a partir de `lg` (1024px)**. Serve para copiar o *comportamento* em outro SPA React + Tailwind. Não é um kit de UI genérico.

Fonte normativa do mapa: [ui-map.md](../ui-map.md). Inventário de arquivos: [frontend-inventory.md](../frontend-inventory.md).

## 1. Decisão de produto (o que o Olivelas fez)

Uma única SPA. Desktop = sidebar permanente + conteúdo em linha. Mobile = o mesmo DOM com classes `md:*` / `lg:*` (ver [guides/ui-mobile.md](ui-mobile.md)). Não criar um segundo app só para desktop.

## 2. Breakpoints a copiar

| Token Tailwind | Pixels (default v3) | Papel neste projeto |
| --- | --- | --- |
| `sm` | 640 | header auth, grids 2 colunas, busca do `PageHeader` sempre visível |
| `md` | 768 | **sidebar estática**, grupos de nav expandidos, tabelas “de verdade” |
| `lg` | 1024 | main `overflow-hidden` no app; PDV duas colunas |
| `xl` | 1280 | densidade extra no grid do PDV |

Não introduza `xs` sem registrá-lo em `theme.extend.screens` (neste repo o `xs:` do `PageHeader` não tem screen).

## 3. Shell autenticado (checklist)

Implementar um layout equivalente a `AppLayout`:

1. **Viewport travado:** `h-dvh max-h-dvh overflow-hidden` no wrapper. O scroll fica no `<main>` ou *dentro* de cards (`min-h-0`, `flex-1`, `overflow-y-auto`).
2. **Eixo:** `flex-col` no mobile, `md:flex-row` no desktop.
3. **Sidebar `w-64`:** no desktop `md:static md:translate-x-0`. Não use drawer no desktop.
4. **Nav em três camadas:**
   - links soltos no topo (Dashboard, e Admin se o papel exigir);
   - **grupos** com título uppercase sempre visível (`hidden md:flex` no rótulo de grupo);
   - filhos sempre `md:block` (sem accordion no desktop);
   - links de PDV/notificações/auditoria/settings em lista vertical (`md:block md:space-y-1`).
5. **Switcher de tenant** no topo da sidebar (dropdown absoluto).
6. **Header de 48px** (`md:h-12 md:flex-row md:items-center`): slot de título (`#page-header-slot`) à esquerda; idioma / atalho de tema / sino à direita. Sem hamburger.
7. **Command palette** Ctrl/Cmd+K: painel **centralizado** (`sm:items-start sm:pt-20 sm:max-w-2xl sm:rounded-2xl`), não sheet inferior.
8. **Main** com padding `md:p-3.5`. A partir de `lg`, `overflow-hidden` no main para páginas que preenchem a altura (tabelas internas).

## 4. Header de página (portal)

`PageHeader` injeta título + busca no slot do chrome. No desktop (`sm+`): título e input na mesma barra; input com `sm:max-w-xs md:max-w-sm lg:max-w-md`. Não coloque o H1 só no body da página se quiser o mesmo chrome compacto.

## 5. Listagens

No desktop:

- Tabela HTML com `thead` visível, `SortableHeader` nas colunas, linha de ações na última célula.
- Container com scroll interno e header sticky (`sticky top-0` no `thead`), como `ProductsPage` no bloco `hidden md:block`.
- Paginação: texto “Exibir:” `hidden md:inline`; controles em `sm:flex-row`.

`ResponsiveTable` no desktop é tabela normal (o CSS de cards só vale `max-width: 767px`).

## 6. Dashboard e cards

Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Ações rápidas em `sm:flex-row` alinhadas à direita. Não empilhar métricas em uma coluna no desktop.

## 7. PDV (desktop largo)

A partir de `lg`:

- `grid-cols-12`: catálogo `lg:col-span-8`, carrinho `lg:col-span-4`, ambos `min-h-0 h-full overflow-hidden`.
- Grade de produtos `sm:grid-cols-3 xl:grid-cols-4`.
- Carrinho permanece visível ao lado (não só em modal).

Abaixo de `lg` o mesmo grid vira uma coluna — isso é mobile/tablet; não “consertar” isso no desktop estreito se quiser fidelidade.

## 8. Modais no desktop

`Modal`: centrado, `sm:items-center`, borda em todos os lados, `sm:rounded-2xl`, sem handle. Footer `sm:flex-row sm:justify-end`. Botões `sm:w-auto sm:h-10` (não full-width). Formulários `sm:grid-cols-2`.

## 9. Marketing e auth

- `PublicLayout`: nav horizontal `md:flex`; CTAs na mesma faixa; footer `md:grid-cols-4`.
- `AuthLayout`: logo e tools na mesma linha `sm:flex-row`; card `max-w-md` no centro.

## 10. Densidade e tokens

- Tipografia de nav: `text-xs`; ícones `h-4 w-4`.
- Cores via CSS variables (`--background`, `--sidebar-*`, `--primary`) e `dark` na classe do `html`.
- Toaster `position="top-right"` (`App.tsx`).

## 11. Estado que o desktop assume

- Teclado: CommandK, ordenação por clique no header.
- Hover em linhas e botões (`hover:bg-muted`).
- Sidebar sempre disponível para troca de loja sem cobrir o conteúdo.

## 12. Ordem de implementação em outro projeto

1. Tokens CSS + Tailwind `darkMode: 'class'`.
2. `AppLayout` com sidebar estática `md+` e slot de header.
3. `PageHeader` portal.
4. Tabela desktop + paginação URL (`useTablePagination`).
5. Modais centrados.
6. CommandK.
7. Página “larga” (PDV ou equivalente) com `lg:grid-cols-12`.
8. Só então aplicar o guia mobile no **mesmo** layout.

## Anti-padrões (em relação a este código)

- Sidebar que some no desktop.
- Forçar cards no desktop (o projeto usa tabela ≥ `md`, exceto métricas).
- PDV em modal no desktop largo (aqui o carrinho é coluna).
- Duplicar rotas `/m/` vs `/`.
