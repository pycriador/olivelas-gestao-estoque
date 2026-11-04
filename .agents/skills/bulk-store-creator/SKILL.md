---
name: bulk-store-creator
description: >-
  Use this skill when the user asks to create stores in bulk ("criação de loja em lote"),
  including a headquarters store (Matriz), linked branches (Filiais), store administrators
  (STORE_ADMIN), suppliers, categories, products, royalty-free product photos for the online
  catalog, initial stock balances, and expiration batches using either the agent's AI or the
  Store AI.
---

# Bulk Store & Branch Creator (`bulk-store-creator`)

Esta skill automatiza a criação em massa de uma rede completa de lojas (**Loja Matriz + Filiais Vinculadas**) na plataforma **Olivelas Gestão de Estoque**, populando administradores, fornecedores, categorias, produtos publicados no catálogo online, fotos sem direitos autorais (Unsplash/CC0 no Supabase Storage), saldos de estoque e lotes de validade.

## Quando usar esta Skill

Ative esta skill sempre que o usuário pedir:
- Criação de uma nova loja ou rede de lojas em lote (Matriz e Filiais como `P1`, `P2`, etc.).
- Atribuição em massa de administradores (`STORE_ADMIN`) em múltiplas lojas/filiais.
- Cadastro em lote de fornecedores, produtos com preços de comércio, saldos diferenciados entre Matriz e Filiais, lotes de validade e fotos sem direitos autorais.

## Fluxo Passo a Passo

### 1. Estruturar a Especificação (`BulkStoreSpec`)

Monte um arquivo JSON em `scripts/specs/<slug-da-matriz>.json` (veja o modelo de referência em [examples/primor-spec.json](./examples/primor-spec.json)) ou utilize diretamente o modo de geração via IA da Loja (`--prompt`).

Regras de modelagem:
- **Matriz (`headquarters`)**: `name`, `slug` (ex.: `"primor"`), `description`.
- **Filiais (`branches`)**: array com `name` (ex.: `"P1"`), `slug` (ex.: `"primor-p1"`), `branchCode` (ex.: `"P1"`). Todas são vinculadas automaticamente com `is_branch = true` e `parent_store_id = headquarters.id`.
- **Administradores (`admins`)**: lista de e-mails que receberão papel `STORE_ADMIN` (`can_approve_writeoff = true`) na Matriz e em todas as Filiais, além da liberação de todos os módulos em `user_permission_profiles`.
- **Fornecedores (`suppliers`)**: cadastrados em todas as unidades e referenciados nos produtos via `supplierKey`.
- **Produtos (`products`)**:
  - Se o usuário pedir `"colocar um preço de comércio"`, defina um `sellingPrice` compatível com o mercado brasileiro e `costPrice` (~55% do preço de venda).
  - Produtos com mesmo nome e preços distintos (ex.: duas `Marmita A` de R$ 15,00 e R$ 20,00) devem manter o `name` desejado pelo usuário e usar `sku` distintos (ex.: `PRM-MAR-A15` e `PRM-MAR-A20`), pois a constraint `uq_product_store_sku` é por `(store_id, sku)`.
  - `headquartersQty` define o estoque inicial na Matriz; `branchQty` (ou `branchQuantities` por código de filial) define o estoque inicial nas Filiais.
  - `expirationDate` no formato ISO `YYYY-MM-DD` (ex.: `"2026-12-31"` para `31/12/2026`).
  - `isPublishedCatalog: true` e `isActive: true` para disponibilizar no PDV (`/sales`) e no Catálogo Online (`/store/:slug`).
  - `imageUrl`: URL de foto royalty-free (Unsplash). Caso omitida, o script resolve automaticamente pelo catálogo curado em `ROYALTY_FREE_IMAGE_CATALOG`.

### 2. Executar o Script de Criação em Massa

Execute o builder a partir da raiz do repositório:

```bash
# 1. Validar com Dry-Run (opcional)
node scripts/bulk-store-builder.mjs --spec scripts/specs/<slug>.json --dry-run

# 2. Executar criação real no Supabase (PostgreSQL + Storage)
node scripts/bulk-store-builder.mjs --spec scripts/specs/<slug>.json
```

Alternativamente, para usar a **IA da Loja** configurada no Cofre (`public.ai_provider_configs`) diretamente a partir de uma instrução em texto livre:

```bash
node scripts/bulk-store-builder.mjs \
  --prompt "Criar loja matriz X com filiais F1 e F2, fornecedores A e B e produtos..." \
  --save-spec scripts/specs/gerado-ia.json
```

### 3. Validar a Criação

Após a execução do script, verifique:
1. **Lojas e Filiais**: Matriz com `is_branch = false` e Filiais com `is_branch = true` e `parent_store_id` apontando para a Matriz.
2. **Administradores**: E-mails vinculados em `public.store_users` com `role = 'STORE_ADMIN'` em todas as lojas criadas.
3. **Catálogo, Fotos e Estoque**: Todos os produtos com `is_active = true`, `is_published_catalog = true`, imagem principal em `public.product_images` (`is_primary = true`), saldo em `public.stock_balances` e lote ativo em `public.stock_batches` com a data de validade solicitada.
