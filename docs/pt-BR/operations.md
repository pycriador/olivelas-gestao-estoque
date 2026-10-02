---
id: OPS-OLIVELAS
title: Operações
type: Operation
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
source:
  - package.json
  - .github/workflows/deploy.yml
  - README.md
  - .env.example
---

# Operações

Não há service profile com SLI/SLO neste repositório (`Unknown` para disponibilidade alvo).

## Desenvolvimento local

Comandos em `package.json`:

| Script | Comando |
| --- | --- |
| `dev` | `vite` (porta 5173, `host: true`) |
| `build` | `tsc -b && vite build` |
| `lint` | `oxlint` |
| `preview` | `vite preview` |

Passos no `README.md`: clone, `npm install`, copiar `.env.example` → `.env.local`, `npm run dev`.

Aplicar SQL: usar o fluxo do projeto Supabase (Dashboard SQL ou CLI). Este repo **não** inclui `config.toml` do Supabase CLI.

## Ambiente GitHub Pages

Workflow `.github/workflows/deploy.yml`:

- Trigger: push `main`/`master` ou `workflow_dispatch`.
- Job `build-and-test`: Node 20, `npm ci`, `npx tsc --noEmit`, `npm run lint || true` (lint **não** falha o job), `npm run build`.
- Falha o build se `VITE_SUPABASE_URL` vazio/placeholder ou key placeholder.
- `VITE_BASE_PATH: "/${{ github.event.repository.name }}/"`.
- Artifact `dist/` → `actions/deploy-pages@v4`.
- Environment `github-pages`.

Fallback SPA: `public/404.html` (mencionado no README).

## Observabilidade

- Toasts `sonner`.
- `console.warn` se Supabase não configurado.
- Sem Datadog/Sentry/OpenTelemetry no `package.json`.

Realtime invalida caches de estoque, pedidos e notificações (`useRealtime.ts`).

## Backup / DR & Exportação

A aplicação conta com uma central nativa de backup e exportação no painel de administração global (`/global-admin` → `GlobalBackupPanel.tsx` / `backupService.ts`):
- **Dump SQL Relacional**: Geração sob demanda de arquivo `.sql` contendo `INSERT INTO` relacionais de todas as entidades, com suporte a filtro por loja individual ou extração completa multi-loja.
- **Pacote Compactado de Imagens (`.ZIP`)**: Download em lote de todas as fotos de produtos associadas às lojas, acompanhado de manifesto estruturado (`manifest.json` com SKU, nome e ID do produto).
- **Pacote Estruturado `.JSON`**: Exportação unificada para auditoria, migração de dados e relatórios externos.

Para disaster recovery em nível de infraestrutura, os snapshots continuam gerenciados na plataforma Supabase.

## Mudança de schema

Nova migration datada em `supabase/migrations/`. Atualizar [backend-inventory.md](backend-inventory.md), [contracts.md](contracts.md) e, se UI mudar, [ui-map.md](ui-map.md) / guias.

## Relacionamentos

- [knowledge-gaps.md](knowledge-gaps.md)
