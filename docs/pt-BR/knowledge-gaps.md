---
id: EVD-OLIVELAS-GAPS
title: Lacunas e dívida documental
type: Evidence
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
---

# Lacunas (não inventar o restante)

Itens **ausentes neste repositório** ou **confirmados como não ligados**:

| Lacuna | Classificação | Nota |
| --- | --- | --- |
| Árvore `docs/en/` | Confirmed | Só pt-BR nesta entrega |
| Testes (`*.test.*`, Playwright, Vitest) | Confirmed | não há suíte no `package.json` |
| `PermissionGate` nas rotas | Confirmed | arquivo existe; zero imports em pages |
| `usePermissions` vs tabela `role_permissions` | Confirmed | UI não hidrata permissões do seed SQL |
| SLI/SLO, runbooks, dono on-call | Unknown | não há arquivos |
| App nativo iOS/Android | Confirmed | só SPA |
| Supabase CLI `config.toml` | Confirmed | ausente |
| URL de produção / project-ref Supabase | Unknown | não commitado (correto para segredo) |
| Screen Tailwind `xs` | Confirmed | usado em classe, não definido no config |
| Lint como quality gate | Confirmed | `npm run lint \|\| true` no Actions |
| Tipos `customer`/`supplier`/`purchasing`/`user` no barrel `types/index.ts` | Confirmed | arquivos existem; barrel não os reexporta |
| Uso de `canManageStore` no `AppLayout` | Confirmed | desestruturado em `AppLayout.tsx` e não referenciado no JSX |

Quando preencher uma lacuna no código, atualize este arquivo (riscar ou mover para o doc canônico).
