---
id: EVD-OLIVELAS-GAPS
title: Lacunas e dívida documental
type: Evidence
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
language: pt-BR
classification: Confirmed
---

# Lacunas (não inventar o restante)

Itens **ausentes neste repositório** ou **confirmados como fora do escopo atual**:

| Lacuna | Classificação | Nota |
| --- | --- | --- |
| Árvore `docs/en/` | Confirmed | Só `docs/pt-BR/` nesta entrega |
| SLI/SLO, runbooks, dono on-call | Unknown | não há arquivos de SRE/on-call no repositório |
| App nativo iOS/Android | Confirmed | só SPA responsiva |
| Supabase CLI `config.toml` | Confirmed | ausente; migrations em `supabase/migrations/` |
| URL de produção / service_role key | Unknown | não commitado no código-fonte (correto para segredo) |
| Screen Tailwind `xs` | Confirmed | usado em classe em `PageHeader.tsx`, não definido em `tailwind.config.js` |
| Lint como quality gate bloqueante | Confirmed | `npm run lint \|\| true` no GitHub Actions |

## Lacunas anteriormente registradas e já resolvidas no código

- ~~`PermissionGate` nas rotas~~ → **Resolvido**: `PermissionGate` é utilizado em `src/routes/AppRoutes.tsx` para proteger os módulos (`MOD_CATALOG_WA`, `MOD_INVENTORY`, `MOD_EXPIRATION`, `MOD_POS_SALES`, `MOD_CUSTOMERS`, `MOD_SUPPLIERS`, `MOD_PURCHASING`, `MOD_REPORTS`, `MOD_TEAM_AUDIT`, `MOD_API_INTEGRATIONS`).
- ~~Permissões granulares por funcionário e planos SaaS~~ → **Resolvido**: `usePermissions` hidrata o perfil SaaS (`user_subscriptions` / `saas_permission_groups`) e as 47 permissões granulares de `store_users` + `store_custom_roles` (migrations 22 e 23).
- ~~Roteiro e runner de testes E2E~~ → **Resolvido**: suíte de automação E2E documentada e executável em `test-automation/` (`executar_roteiro_testes.js`, 33/33 casos aprovados).

Quando preencher uma lacuna no código, atualize este arquivo (riscar ou mover para o doc canônico).
