# Plano Arquitetural — Portal Público Portátil (`spa_portal`)

> **Status:** Implementado na pasta `spa_portal/`  
> **Objetivo:** Versão portátil, autônoma e altamente personalizável da área pública da loja (Catálogo Online + Acompanhamento de Pedidos em Tempo Real), conectada exclusivamente aos dados de um único cliente (`store_id`) via **credencial HBAC única e expirável (`X-HBAC-Token`)** na API do Supabase.

---

## 1. Visão Geral & Problema Resolvido

No ERP principal, a vitrine pública vive em `/store/:slug` e o rastreio em `/store/:slug/order/:orderId`. Porém, clientes estratégicos frequentemente desejam:
1. **Hospedar sua própria vitrine em domínio próprio** (ex.: `pedidos.hortifrutidocliente.com.br`) com **layout 100% sob medida** (identidade visual exclusiva, banners promocionais customizados, vitrine temática).
2. **Isolamento total do ERP administrativo:** o pacote publicado no domínio do cliente não deve conter nenhuma rota, componente ou lógica do backoffice (`/dashboard`, `/global-admin`, `/inventory`, etc.).
3. **Credencial única por loja com revogação instantânea:** a conexão com o Supabase deve utilizar uma credencial exclusiva daquela loja (`X-HBAC-Token` + `X-Store-ID`) que possa ser **expirada ou desativada em 1 clique** pelo Administrador caso haja suspeita de vazamento ou encerramento contratual.

---

## 2. Arquitetura de Segurança & Credencial Expirável

### 2.1. Cabeçalhos Obrigatórios em Toda Requisição
O cliente HTTP de `spa_portal/src/api/supabasePortalClient.ts` injeta automaticamente:

```http
apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>
Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>
X-Store-ID: <VITE_PORTAL_STORE_ID>
X-HBAC-Token: olv_live_<TOKEN_EXCLUSIVO_DA_LOJA>
```

### 2.2. Defesa em 3 Camadas no Banco de Dados (Supabase / PostgreSQL)
1. **Camada 1 — Interceptação Pré-Request (`public.check_hbac_pre_request`):**
   - Executada pelo PostgREST **antes** de qualquer query ou RPC.
   - Verifica na tabela `public.api_tokens` se o `X-HBAC-Token`:
     - Existe;
     - Está ativo (`is_active = TRUE`);
     - Não expirou (`expires_at IS NULL OR expires_at > NOW()`);
     - Pertence exatamente à loja informada em `X-Store-ID` (`store_id = X-Store-ID`);
     - Possui os escopos necessários (`products:read`, `orders:read`, `orders:write`).
   - Caso qualquer verificação falhe, o banco aborta a requisição com erro `28000` (`HTTP 403`) ou `42501` (`HTTP 401`).
2. **Camada 2 — Row-Level Security por Linha (`public.has_hbac_scope`):**
   - Garante que nenhuma consulta em `stores`, `categories`, `products`, `product_images`, `orders` ou `order_items` retorne registros de outra loja, mesmo se alguém tentar manipular parâmetros de URL.
3. **Camada 3 — Projeção Segura & RPCs Atômicas:**
   - O `spa_portal` consulta apenas colunas públicas dos produtos (`id, store_id, name, sku, barcode, description, unit, selling_price, category_id, is_active, is_published_catalog`), jamais expondo `cost_price` ou `min_stock`.
   - A criação de pedido utiliza a RPC `public.create_public_catalog_order`, que valida preços diretamente no banco de dados (impedindo adulteração de preço no front-end), trava e baixa o estoque atomicamente e notifica a equipe da loja em `/orders`.
   - O acompanhamento utiliza `public.get_public_order_tracking` e valida que `order.store_id === VITE_PORTAL_STORE_ID`.

### 2.3. Procedimento em Caso de Vazamento de Credencial
1. Acesse o ERP principal em `/global-admin?tab=api-hbac`.
2. Localize o token da loja afetada e clique em **Desativar** ou **Excluir** (ou edite a validade para expirar).
3. Imediatamente, qualquer instância usando o token antigo passa a receber `401/403` do PostgREST e exibe a tela de bloqueio `CredentialErrorScreen`.
4. Gere um novo token `olv_live_...` para a loja e atualize `VITE_PORTAL_HBAC_TOKEN` no ambiente de hospedagem do portal.

---

## 3. Funcionalidades Incluídas no `spa_portal`

1. **Catálogo Público Completo (`CatalogView.tsx`):**
   - Cabeçalho com logo, endereço, WhatsApp, badge de status da loja e alternância de tema Claro/Escuro.
   - Banner Hero personalizável via banco (`banner_url`) ou via preset local (`portal.config.ts`).
   - Busca em tempo real (nome, SKU, código de barras com regex insensível a acentos).
   - Filtro por categorias da loja e filtro por faixa de preço (`Mín R$` / `Máx R$`).
   - Paginação configurável (`6`, `8`, `12`, `16`, `24`, `36`, `48`, `96` itens por página).
   - Suporte nativo a **produtos pesáveis (`KG`)** com modal de seleção de peso (`150g`, `250g`, `500g`, `1kg` ou digitação livre).
2. **Sacola & Checkout Integrado:**
   - Persistência do carrinho no `localStorage` isolada por `store_id`.
   - Formulário de checkout com Nome, WhatsApp/Telefone, Endereço de Entrega (ou Retirada), Forma de Pagamento (`PIX`, `CREDIT_CARD`, `DEBIT_CARD`, `CASH`) e Observações.
   - Botão **Finalizar Pedido Online** (registra em `/orders` com baixa atômica de estoque e redireciona para o rastreio ao vivo) e botão **Enviar + Abrir no WhatsApp** (interpola o template de WhatsApp configurado na loja).
3. **Link e Página de Acompanhamento de Pedido em Tempo Real (`OrderTrackingView.tsx`):**
   - Acessível via `#/order/<UUID_DO_PEDIDO>` ou `?order=<UUID_DO_PEDIDO>`.
   - Linha do tempo visual completa (`PENDING` → `CONFIRMED` → `PROCESSING` → `READY` → `SHIPPED` → `DELIVERED` → `COMPLETED` + tratamento de `CANCELLED`).
   - Respeita automaticamente os **apelidos personalizados de status da loja** (`stores.theme_config.orderStatusAliases`).
   - Atualização instantânea via **Supabase Realtime (`postgres_changes`)** na tabela `public.orders` + revalidação automática a cada 5 segundos enquanto o pedido estiver em andamento.
   - Botão para copiar o link de acompanhamento e botão para falar com a loja no WhatsApp informando o resumo do pedido.
   - Barra de **Meus Pedidos Recentes** no topo da vitrine para o cliente retornar rapidamente aos seus pedidos anteriores.

---

## 4. Como Criar Novas Lojas Personalizadas a partir do `spa_portal`

Você pode usar duas abordagens:

### Abordagem A — Customização por Variáveis de Ambiente + Preset JSON (Recomendado para Múltiplos Deploys)
1. Crie um arquivo em `spa_portal/presets/<nome-do-cliente>.preset.json` (veja `presets/gnz-hortifruti.preset.json` como modelo).
2. Configure o `.env` apontando para o `VITE_PORTAL_STORE_ID` e `VITE_PORTAL_HBAC_TOKEN` daquele cliente.
3. Personalize cores, textos de Hero, estilo dos cards (`modern`, `compact` ou `editorial`), avisos de frete/entrega e rodapé em `src/config/portal.config.ts`.

### Abordagem B — Customização Estrutural de Componentes (White-Label Sob Medida)
- Como `spa_portal/src/api/supabasePortalClient.ts` concentra toda a comunicação autenticada por HBAC e `spa_portal/src/utils/portalFormatters.ts` concentra as regras de negócio (pesos KG, WhatsApp, status), você pode alterar livremente o JSX/Tailwind de `CatalogView.tsx` e `OrderTrackingView.tsx` para criar experiências visuais exclusivas para cada cliente sem risco de quebrar a integração com o estoque e `/orders`.
