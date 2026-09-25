# Olivelas — Plataforma SaaS Multi-Loja de Gestão de Estoque & Vendas

> **Arquitetura Enterprise:** React 19 + TypeScript + Vite + Tailwind CSS + Supabase (PostgreSQL, Auth, Storage, Realtime, RPCs) + GitHub Pages CI/CD.

---

## 🚀 1. Visão Geral do Projeto

A plataforma **Olivelas** é um SaaS empresarial multi-loja e multi-tenant concebido desde a base com isolamento estrito de dados através de **Row Level Security (RLS)** no PostgreSQL do Supabase. O frontend opera como uma SPA estática de altíssima performance hospedada no **GitHub Pages**, com suporte automático a rotas de subpath (ex: `https://usuario.github.io/repositorio/`).

---

## 🛠️ 2. Stack Tecnológica

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, class-variance-authority, clsx, tailwind-merge.
- **Gerenciamento de Estado & Dados:** TanStack Query v5, Zustand.
- **Roteamento & SPA Fallback:** React Router v7 com script 404 SPA de redirecionamento dinâmico.
- **Internacionalização:** Sistema tipado com suporte a **PT-BR** (padrão), **EN-US** e **ES-ES** com persistência.
- **Temas:** Light, Dark e System com tokens de superfície e glassmorphism.
- **Backend Gerenciado (Supabase):**
  - **PostgreSQL Multi-Tenant:** RLS ativado em todas as tabelas via relacionamento `store_users`.
  - **Supabase Auth:** Email/senha e Google OAuth, controle de sessão resiliente.
  - **Supabase Storage:** Buckets organizados e protegidos por loja (`products/{store_id}/...`).
  - **Supabase Realtime:** Atualização automática de saldos de estoque, pedidos e alertas.
  - **Stored Procedures (RPC):** Baixas e estornos de estoque atômicos protegidos contra concorrência (`process_sale_stock_deduction`, `restore_sale_stock`, `receive_purchase_order_stock`).
- **CI/CD:** GitHub Actions com lint, typecheck e deploy automatizado para o GitHub Pages.

---

## 🏢 3. Estrutura do Projeto

```
olivelas-gestao-estoque/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Pipeline CI/CD GitHub Actions
├── public/
│   └── 404.html                    # Script de resolução de subpaths SPA para GitHub Pages
├── src/
│   ├── components/
│   │   ├── common/                 # ThemeToggle, LanguageSelector, CommandK, EmptyState, etc.
│   │   └── ui/                     # Button, Input, Card, Badge, Modal
│   ├── hooks/                      # useAuth, useTenant, usePermissions, useRealtime, useI18n
│   ├── i18n/                       # pt-BR, en-US, es-ES
│   ├── layouts/                    # AppLayout, AuthLayout, PublicLayout
│   ├── lib/supabase/               # Client singleton com tipagem do banco
│   ├── pages/                      # Dashboard, Lojas, Produtos, Estoque, Validades, PDV, Pedidos, Catálogo
│   ├── routes/                     # AppRoutes, ProtectedRoute, PermissionGate
│   ├── services/                   # Camada de serviços (auth, store, product, inventory, order, etc.)
│   ├── stores/                     # authStore, cartStore, themeStore
│   ├── types/                      # database.types.ts, auth, store, product, order
│   └── utils/                      # formatters, currency, barcode, dates, export, errorHandler
├── supabase/
│   ├── migrations/
│   │   ├── 20260925000001_initial_schema.sql
│   │   ├── 20260925000002_rls_policies.sql
│   │   ├── 20260925000003_functions_rpcs.sql
│   │   └── 20260925000004_storage_security.sql
│   └── seed/
│       └── seed.sql                # Roles (GLOBAL_ADMIN, STORE_ADMIN, etc.) & Permissões
├── .env.example
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 🔒 4. Segurança & Isolamento Multi-Tenant (RLS)

1. **Nunca confiar no frontend:** O `store_id` não pode ser forjado pelo cliente para acessar dados alheios.
2. **Políticas PostgreSQL RLS:** Cada tabela possui políticas que verificam se o `auth.uid()` pertence à loja através da tabela de associação `store_users`.
3. **Global Admin:** Possui visibilidade global estritamente auditada.
4. **Soft Delete:** Produtos, clientes, fornecedores e lojas possuem colunas `deleted_at` e `deleted_by`, preservando o histórico contábil e fiscal.
5. **Transações Atômicas:** As vendas no PDV realizam bloqueio de linha (`FOR UPDATE`) no PostgreSQL, garantindo que baixas de estoque e compras não sofram condições de corrida (*race conditions*).

---

## 📱 5. Catálogo Digital com WhatsApp

Cada loja cadastrada possui uma URL exclusiva (`/store/{slug}`) acessível publicamente:
- Vitrine de produtos publicados com fotos, preços e categorias.
- Carrinho de compras interativo.
- Envio formatado do pedido para o WhatsApp oficial da loja com resumo de itens, total e dados de entrega.

---

## 📦 6. Como Executar Localmente

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/usuario/olivelas-gestao-estoque.git
   cd olivelas-gestao-estoque
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente:**
   Copie `.env.example` para `.env.local` e preencha suas credenciais públicas do Supabase:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_anon
   ```

4. **Executar em modo desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Verificação de TypeScript e Build:**
   ```bash
   npm run build
   ```

---

## 📄 7. Licença

Desenvolvido para uso comercial enterprise. Todos os direitos reservados.
