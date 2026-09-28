---
id: REF-OLIVELAS-INDEX
title: Índice da documentação Olivelas
type: Reference
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
source:
  - docs/pt-BR/
standard: Documentation Standard v1.0 (adapted)
---

# Documentação Olivelas (pt-BR)

> Status: DRAFT  
> Fonte: código e SQL deste repositório, inventariados em 2026-09-27.

## Como ler (progressive disclosure)

```text
Contexto (overview, ai-context)
  → Sistema (architecture)
    → Componentes (frontend-inventory, backend-inventory)
      → Interface desktop/mobile (ui-map)
        → Contratos (contracts)
          → Segurança (security)
            → Operação (operations)
              → Replicar UI (guides)
```

## Documentos

| ID / arquivo | Tipo | Conteúdo |
| --- | --- | --- |
| [ai-context.md](ai-context.md) | Context | Entrada para humanos e agentes |
| [overview.md](overview.md) | Context | Problema, atores, limites do sistema |
| [architecture.md](architecture.md) | Architecture | Unidades deployáveis, fluxo, pastas |
| [frontend-inventory.md](frontend-inventory.md) | Architecture | Rotas, pages, components, hooks, stores, services |
| [backend-inventory.md](backend-inventory.md) | Architecture | Tabelas, enums, RLS, RPCs, storage, seed |
| [ui-map.md](ui-map.md) | Architecture | Mapa factual desktop vs mobile |
| [contracts.md](contracts.md) | Contract | Cliente Supabase, RPCs usadas pelo front, env |
| [security.md](security.md) | Security | Auth, RLS, grants, isolamento de tenant |
| [operations.md](operations.md) | Operation | Dev local, CI/CD, migrations |
| [knowledge-gaps.md](knowledge-gaps.md) | Evidence | O que o repositório **não** documenta ou não implementa |
| [changelog.md](changelog.md) | Reference | Histórico desta árvore de docs |
| [guides/ui-desktop.md](guides/ui-desktop.md) | Reference | Como replicar a lógica de interface **desktop** |
| [guides/ui-mobile.md](guides/ui-mobile.md) | Reference | Como replicar a lógica de interface **mobile** |

## Afirmações (claims)

| Claim | Classificação | Evidência |
| --- | --- | --- |
| A SPA é o único frontend neste repositório | Confirmed | `src/`, `package.json` — não há app nativo |
| O backend de dados é Supabase (PostgreSQL + Auth + Storage + Realtime) | Confirmed | `src/lib/supabase/client.ts`, `supabase/migrations/` |
| Documentação EN espelhada não existe ainda | Confirmed | Árvore `docs/en/` ausente |
