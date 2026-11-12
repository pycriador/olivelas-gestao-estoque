# Olivelas — SPA Portal Público Portátil (`spa_portal`)

Versão portátil, leve e independente da vitrine pública e do rastreamento de pedidos em tempo real da plataforma **Olivelas**.

Projetada para ser hospedada em qualquer servidor estático (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3 ou domínio próprio do cliente) conectando-se **exclusivamente aos dados de uma única loja (`store_id`)** por meio de uma **credencial única e expirável (`X-HBAC-Token`)**.

---

## 🚀 Passo a Passo de Configuração

### 1. Gerar a Credencial Única da Loja no Painel Admin
1. No sistema principal Olivelas, acesse **Admin Global → API & Tokens HBAC** (`/global-admin?tab=api-hbac`).
2. Clique em **Novo Token HBAC**.
3. Selecione a **Loja do Cliente** (ex.: `GNZ Hortifruti`).
4. Defina o prazo de expiração desejado (ex.: `90 dias`, `365 dias` ou `Sem expiração`).
5. Selecione apenas os escopos mínimos necessários para a operação pública:
   - `products:read` (Leitura de produtos, categorias, fotos e dados públicos da loja)
   - `orders:read` (Acompanhamento de pedidos em tempo real)
   - `orders:write` (Criação de pedidos online com baixa de estoque)
6. Copie o token gerado (`olv_live_...`) e o UUID da loja (`store_id`).

> 🔒 **Em caso de vazamento de credencial:** basta desativar ou excluir o token em `/global-admin?tab=api-hbac`. O banco de dados bloqueia instantaneamente qualquer acesso da credencial antiga (`HTTP 401/403`) sem afetar outras lojas.

---

### 2. Configurar as Variáveis de Ambiente (`.env`)
Copie o arquivo `.env.example` para `.env` dentro da pasta `spa_portal/`:

```bash
cp .env.example .env
```

Preencha com os dados do projeto Supabase e a credencial exclusiva da loja:

```env
VITE_SUPABASE_URL="https://mffrafqyjbjitlhjnlai.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_NfhTi2u06ypAJzlqHms5ug_MW_8bLlQ"

# Identificador único da loja cliente (UUID)
VITE_PORTAL_STORE_ID="f8fdfd0e-a13a-44a6-ba98-53e61be300db"

# Credencial HBAC exclusiva da loja (expirável/revogável no painel Admin)
VITE_PORTAL_HBAC_TOKEN="olv_live_49a8e80f7f1f1391231fde8e8552972d"

# Opcional: Slug amigável e customizações visuais
VITE_PORTAL_STORE_SLUG="gnz-hortifruti"
VITE_PORTAL_BRAND_PRIMARY="#16a34a"
VITE_PORTAL_BRAND_ACCENT="#f59e0b"
```

---

### 3. Executar Localmente ou Gerar Build de Produção

```bash
cd spa_portal
npm install
npm run dev
```

Para gerar os arquivos estáticos prontos para deploy (`spa_portal/dist/`):

```bash
npm run build
npm run preview
```

---

## 🔗 Rotas Suportadas pelo Portal Portátil

O `spa_portal` suporta roteamento híbrido por **Hash (`#/...`)** e **Query String (`?order=...`)**, garantindo funcionamento imediato em qualquer hospedagem estática sem necessidade de regras complexas de rewrite no servidor:

- **Vitrine Pública da Loja:**
  - `/` ou `#/`
- **Link de Acompanhamento de Pedido em Tempo Real:**
  - `#/order/<UUID_DO_PEDIDO>`
  - `?order=<UUID_DO_PEDIDO>`

---

## 🎨 Personalização Avançada por Cliente

Consulte o arquivo [`PLAN.md`](./PLAN.md) e o arquivo [`src/config/portal.config.ts`](./src/config/portal.config.ts) para personalizar:
- Cores primárias e de destaque (`primaryColor`, `accentColor`);
- Estilo dos cards de produto (`modern`, `compact`, `editorial`);
- Textos de destaque do Hero/Banner, avisos de entrega e selos de confiança;
- Exemplos de presets em [`presets/gnz-hortifruti.preset.json`](./presets/gnz-hortifruti.preset.json).
