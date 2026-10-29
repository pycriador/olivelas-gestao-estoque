---
id: REF-OLIVELAS-DOCS-CHANGELOG
title: Changelog da documentação
type: Reference
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-10-29
language: pt-BR
classification: Confirmed
---

# Changelog da documentação

## 2026-10-29

- **Correção da Troca de Abas e Contadores em Tempo Real em `/inventory` (`Saldos`, `Movimentos`, `Aprovações de Baixa`, `Remessas p/ Filiais`)** (`useTablePagination.ts`, `InventoryPage.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`):
  - **Causa Raiz (`useTablePagination.ts` + React Router v7)**:
    - Em `react-router-dom` v7, múltiplas chamadas a `setSearchParams` no mesmo ciclo de evento leem `location.search` da closure da renderização atual (não enfileirando mutações de forma síncrona). Em `InventoryPage.tsx`, os botões das abas (`Saldos`, `Movimentos`, `Aprovações de Baixa`, `Remessas p/ Filiais`) invocavam `setFilter('tab', '...')` seguido de `setPage(1)` no mesmo `onClick`; a segunda chamada (`setPage(1)`) lia `searchParams` obsoleto (sem `tab`) e sobrescrevia a URL de volta para `?`, cancelando a navegação de aba.
    - Adicionado `latestParamsRef` síncrono em `useTablePagination.ts` para compor múltiplas atualizações de query string no mesmo evento sem perda de parâmetros, além de remover chamadas redundantes a `setPage(1)` (pois `setFilter` já reseta `page`).
  - **Contadores e Invalidação de Queries (`InventoryPage.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`)**:
    - As queries de `balancesData`, `movementsData` e `lossReasons` passaram a carregar sempre que há loja ativa (`enabled: Boolean(hasActiveStore)`), exibindo os contadores reais nas abas desde o primeiro carregamento e invalidando `stock-writeoff-requests` imediatamente após solicitações ou baixas de estoque.

- **Cadastro de Funcionários, Papéis Granulares, Aprovador de Baixa de Estoque (`STOCK_APPROVER`) e Remessa de Estoque para Filiais Sem Venda** (`supabase/migrations/20261030000023_staff_roles_approvers_and_branches.sql`, `TeamPage.tsx`, `GlobalAdminDashboardPage.tsx`, `StoresPage.tsx`, `InventoryPage.tsx`, `EmployeeRolePermissionsModal.tsx`, `StoreCustomRolesModal.tsx`, `StockBranchTransferModal.tsx`, `StockWriteoffModal.tsx`, `BulkStockWriteoffModal.tsx`):
  - **Gestão Completa de Funcionários e Papéis Customizados (`/team` e `/global-admin?tab=users`)**:
    - `STORE_ADMIN` e `GLOBAL_ADMIN` podem cadastrar/editar funcionários via RPC `public.upsert_store_employee`, definindo matrícula (`employee_code`), cargo (`job_title`), papel base (`STORE_ADMIN`, `STOCK_APPROVER`, `MANAGER`, `SELLER`, `CASHIER`, `INVENTORY`, `FINANCE`, `VIEWER`), papel customizado da loja (`public.store_custom_roles`) e matriz de permissões granulares individuais (`granted_permissions` e `revoked_permissions`) para todos os recursos do sistema.
  - **Fluxo Exclusivo de Aprovador de Baixa de Estoque (`STOCK_APPROVER` / `inventory.approve_writeoff`)**:
    - Função `public.can_user_approve_writeoff(p_store_id, p_user_id, p_estimated_value)` valida se o usuário possui alçada explícita de aprovação de baixa e se o valor financeiro está dentro do limite `max_writeoff_value`.
    - `public.apply_stock_movement` endurecida para bloquear qualquer baixa direta (`LOSS` / `ADJUSTMENT`) cujo operador ou aprovador (`approved_by`) não possua alçada válida.
    - Fila de solicitações de baixa (`public.stock_writeoff_requests`) e RPC `public.review_stock_writeoff_request`: operadores sem alçada enviam solicitações pendentes (`PENDING`), e somente aprovadores autorizados podem aprovar (efetuando a baixa atômica do lote) ou rejeitar com justificativa auditada.
  - **Cadastro de Filiais e Transferência de Estoque Sem Venda (`/stores` e `/inventory`)**:
    - Suporte a vínculo de unidades como Filial (`is_branch = true`, `parent_store_id`, `branch_code`, `manager_name`) em `public.stores`.
    - Tabelas `public.stock_transfers` e `public.stock_transfer_items` + RPC atômica `public.execute_stock_transfer_to_branch`: transfere lotes da Matriz para a Filial (`TRANSFER_OUT` -> `TRANSFER_IN`) sem necessidade de venda, sincronizando categoria, produto mestre e lote com validade na filial para venda imediata no PDV da filial.

- **Planos Comerciais SaaS, Grupos de Permissões em Tela com Grafo de Dependências e Controle Financeiro de Assinaturas** (`supabase/migrations/20261029000022_saas_permission_groups_and_billing.sql`, `GlobalSaasBillingPanel.tsx`, `SubscriptionGuardModal.tsx`, `featureDependencies.ts`, `saasBillingService.ts`, `usePermissions.ts`, `ProtectedRoute.tsx`, `AppLayout.tsx`):
  - **Motor de Dependências entre Telas (`featureDependencies.ts`)**:
    - Ao desmarcar um módulo para um usuário ou plano (mesmo que seja `STORE_ADMIN`), o sistema exibe alertas em tempo real sobre impactos funcionais em outros módulos (ex.: desativar `sales_pos` impacta `orders_management`; desativar `inventory_control` impacta `batches_expiration` e `purchases_suppliers`).
  - **Grupos de Perfil com Precificação Comercial e Cobrança (`saas_permission_groups`, `user_subscriptions`, `subscription_payments`)**:
    - Criação e edição de pacotes comerciais com valores mensais/anuais (ex.: *Catálogo WhatsApp*, *Controle de Estoque + Validades*, *PDV & Frente de Caixa*, *ERP Enterprise Completo*), atribuição direta a usuários com módulos customizados, bloqueio por inadimplência e histórico auditado de pagamentos.

- **Integrador de APIs Estilo Postman & Vinculação com Serviços Internos (`/integrations`)** (`supabase/migrations/20261028000021_api_integrator_studio.sql`, `ApiIntegratorPage.tsx`, `apiIntegratorService.ts`, `CustomersPage.tsx`, `CategoriesPage.tsx`, `ProductsPage.tsx`, `SuppliersPage.tsx`):
  - **Request Builder Completo**: Configuração de método HTTP, URL, autenticação (`Bearer`, `Basic`, `API Key`, `Custom Header`), query params, headers, body JSON/Form, variáveis de ambiente encriptadas e JSONPath Data Explorer.
  - **Service Binding Engine**: Mapeamento visual ` Drag/Select` de campos JSON externos para os serviços internos de **Clientes**, **Grupos/Categorias**, **Produtos**, **Fornecedores** e **Estoque**, com botão de sincronização direta nas telas operacionais e logs de execução (`api_sync_logs`).

## 2026-10-19

- **Associação Obrigatória de Cliente com Fallback Automático para "Cliente Genérico" no PDV (`/sales`)** (`customerService.ts`, `orderService.ts`, `CustomerCombobox.tsx`, `SalesPage.tsx`):
  - **Resolução e Criação Automática (`customerService.getOrCreateGenericCustomer`)**:
    - Todo pedido criado no PDV exige vínculo com um registro válido de cliente (`customer_id`).
    - Caso o operador não informe nenhum cliente no seletor do PDV, `orderService.createOrder` localiza automaticamente o cadastro `"Cliente Genérico"` (ou `"Consumidor Final"`) da loja ativa — reativando-o caso esteja inativo — ou cria o registro `"Cliente Genérico"` automaticamente antes de invocar a RPC `create_order_with_stock`.
  - **Atualização Visual no Checkout e Combobox (`CustomerCombobox.tsx`, `SalesPage.tsx`)**:
    - Indicadores visuais no seletor e rodapé de checkout informando que o cliente é obrigatório e que `"Cliente Genérico"` é associado por padrão quando nenhum cliente específico é selecionado.

- **Correção do Salvamento na Edição de Vendas (`/orders` → `/sales?editOrder=:id`)** (`orderService.ts`, `SalesPage.tsx`, migration `20261019000019_allow_delete_cancelled_orders_on_edit.sql`):
  - **Causa Raiz 1 — Bloqueio Silencioso de RLS `DELETE` e Violação de Constraint `uq_order_store_number` (`23505`)**:
    - A tabela `public.orders` não possuía política RLS para `DELETE`, fazendo com que `supabase.from('orders').delete().eq('id', replaceOrderId)` afetasse `0` linhas silenciosamente e a chamada subsequente a `create_order_with_stock` falhasse com erro de chave duplicada (`uq_order_store_number`) ao reutilizar o mesmo `order_number`.
    - Criada a migration `20261019000019_allow_delete_cancelled_orders_on_edit.sql` adicionando a política `"Orders delete cancelled: tenant staff"` para permitir exclusão de pedidos já cancelados (`status = 'CANCELLED'`) pela equipe da loja (`STORE_ADMIN`, `SELLER`, `FINANCE`) ou `is_global_admin()`.
    - Adicionada proteção multicamada em `orderService.createOrder`: localiza todos os registros conflitantes da loja por `id = replaceOrderId` ou `order_number`, garante o cancelamento prévio e restauração de estoque (ignorando caso já esteja cancelado), tenta exclusão direta e, se o registro permanecer no banco, renomeia seu `order_number` com sufixo `-SUB-` (ocultado em `orderService.listOrders` e `globalAdminService.listEntities`).
    - Adicionada validação preventiva (*pre-flight check*) de unicidade de `(store_id, order_number)` antes de chamar `create_order_with_stock` e ampliação do *retry* automático contra `23505` / `uq_order_store_number`, eliminando em definitivo a mensagem `"Registro duplicado. Já existe um item com este identificador único nesta loja."` ao salvar uma venda editada.
  - **Causa Raiz 2 — Falso Positivo de `"Estoque insuficiente"` ao Carregar Pedido para Edição (`SalesPage.tsx`)**:
    - Os itens vindos do relacionamento `orders -> order_items -> products(*)` não contêm a coluna calculada `stock_quantity` (que vem de `stock_balances`), fazendo com que `stockByProduct` avaliasse `0` se `storeId` ainda não estivesse disponível no primeiro ciclo ou se o cache de `products-pos` estivesse obsoleto (`keepPreviousData`).
    - O carregamento de `editOrder` agora aguarda `storeId` estar definido, inicializa `stock_quantity` de cada item do carrinho de edição com `Math.max(Number(prod?.stock_quantity ?? 0), itemQty)` e consolida `stockByProduct` preservando o maior saldo entre a listagem e o carrinho reaberto.

## 2026-10-15

- **Revisão e Correção Abrangente de Filtros e Buscas na Plataforma** (`useTablePagination.ts`, `globalAdminService.ts`, `productService.ts`, `customerService.ts`, `supplierService.ts`, `purchasingService.ts`, `auditService.ts`, `CategoriesPage.tsx`, `TeamPage.tsx`, `StoresPage.tsx`, `GlobalAdminDashboardPage.tsx`, `GlobalDeletePanel.tsx`):
  - **Correção de Digitação e Reset de Filtro em `useTablePagination.ts`**:
    - Removido `.trim()` em tempo real no `setSearch`, permitindo digitar espaços entre palavras sem que sejam apagados a cada renderização.
    - Normalizada a limpeza de chaves de filtro em `setFilter`: valores `'ALL'`, `'all'`, `'TODOS'`, `'todos'` ou strings vazias removem o parâmetro da URL de forma uniforme, sem deixar parâmetros obsoletos residuais.
  - **Correção da Tabela `suppliers` no Painel de Exclusão Global (`/global-admin?tab=delete`)**:
    - Corrigida referência indevida a `name` na tabela `suppliers` (que possui `corporate_name` e `trade_name`), evitando o erro SQL `42703 (column suppliers.name does not exist)` que quebrava o carregamento da entidade de fornecedores.
    - Adicionado suporte a busca tolerante a acentos via `buildAccentRegex` e `.imatch` em todas as entidades do painel de exclusão global.
    - Limpeza automática da busca ao alternar entre entidades e retorno suave de página caso o usuário exclua registros restantes da página atual.
    - Isolamento de filtros por aba no `GlobalAdminDashboardPage.tsx`: alternar entre abas limpa os parâmetros de filtro que pertenciam apenas à aba anterior (ex: `status=ACTIVE` de lojas não contamina `tab=delete` ou `tab=users`).
  - **Sanitização de Sintaxe PostgREST e Busca Tolerante a Acentos em Produtos (`/products`, `/sales`, `/store/:slug`)**:
    - Sanitização de caracteres delimitadores de árvore lógica do PostgREST (`%`, `,`, `(`, `)`) evitando erros `PGRST100 (syntax error)`.
    - Busca com `buildAccentRegex` e `.imatch` no catálogo de produtos, no PDV e no catálogo público de e-commerce.
  - **Sanitização e Acentuação em Clientes (`/customers`) e Fornecedores (`/suppliers`)**:
    - Busca tolerante a acentos e caracteres especiais em nomes corporativos, nomes fantasia, documentos, telefones e e-mails de clientes e fornecedores.
  - **Expansão de Busca em Ordens de Compra (`/purchasing`)**:
    - A busca agora pré-localiza fornecedores compatíveis (`corporate_name`, `trade_name`) e busca em conjunto por número do pedido e observações.
    - Aceita filtros de status ou fornecedor `'ALL'` ou `'all'` sem quebrar a listagem.
  - **Sanitização em Logs de Auditoria (`/audit`)**:
    - Sanitização de caracteres no campo de busca de logs de auditoria e normalização de filtro de ação `'ALL'`.
  - **Busca em Memória Resiliente a Acentos em Categorias, Equipe e Lojas**:
    - `CategoriesPage.tsx`, `TeamPage.tsx` e `StoresPage.tsx` atualizados para normalizar strings com decomposição NFD (`normalize('NFD')`), permitindo encontrar termos sem se preocupar com maiúsculas/minúsculas ou acentuação gráfica.

- **Correção de Erro HTTP 400 na Exclusão Definitiva de Pedidos (`/global-admin?tab=delete`)** (`GlobalDeletePanel.tsx`, migration `20261015000018_fix_restore_stock_after_delete_cancelled_orders.sql`):
  - **Bypass de Restauração de Estoque em Pedidos Cancelados**:
    - Pedidos com status `CANCELLED` já tiveram seu estoque estornado previamente no momento do cancelamento (`restore_sale_stock`).
    - A migration 15 havia regredido a função `restore_stock_after_delete` omitindo o bypass da migration 12, fazendo com que a exclusão de pedidos cancelados tentasse reverter novamente o saldo e disparasse erro `400 (P0001: o saldo do produto mudou depois deste registro)`.
    - Migration 18 restabelece a salvaguarda em `restore_stock_after_delete` e adiciona validação direta em `global_admin_delete` (`COALESCE(status, '') <> 'CANCELLED'`), garantindo exclusão limpa sem erros.
  - **Otimizações no Painel de Exclusão (`GlobalDeletePanel.tsx`)**:
    - Ajuste automático de paginação: quando o operador exclui o último item de uma página (ex.: página 3), o painel transiciona automaticamente para a página anterior válida (`page - 1`), impedindo visualização de páginas órfãs vazias.
    - Mensagem de erro inteligível no frontend caso o operador tente excluir um pedido não-cancelado cujos produtos já tenham sofrido movimentações subsequentes no estoque.

- **Correção de Erro HTTP 400 na Busca de Pedidos e Vendas (`/orders`)** (`orderService.ts`):
  - **Eliminação de Referência Inválida à Coluna Inexistente `customer_name` em `orders`**:
    - A tabela `orders` possui relação via `customer_id` e não possui a coluna `customer_name`. O filtro `.or('order_number.ilike...,customer_name.ilike...')` gerava erro `400 (Bad Request)` em qualquer busca textual.
  - **Busca Multidimensional e Tolerante a Acentos**:
    - A busca agora pré-resolve clientes compatíveis na tabela `customers` (por nome, documento ou telefone) e produtos compatíveis na tabela `products` (por nome ou SKU) através da função `buildAccentRegex`.
    - Localiza os pedidos tanto pelo número do pedido (`order_number`), observações (`notes`), cliente vinculado (`customer_id.in`) quanto pelos itens contidos no pedido (`order_items.product_id.in`), permitindo pesquisar por exemplo `"uva"`, `"PED-906"`, ou o nome de um cliente sem erros.

- **Correção de Erro HTTP 400 e Busca Tolerante a Acentos em Estoque e Movimentações (`/inventory`)** (`inventoryService.ts`, `productUtils.ts`):
  - **Eliminação de `.or()` com Colunas de Relações Embutidas**:
    - O PostgREST do Supabase não suporta filtros `.or()` de primeiro nível referenciando tabelas relacionadas (como `products.name` ou `products.sku` em consultas sobre `stock_balances`).
    - Em `inventoryService.getStockBalances`, a busca agora resolve previamente os IDs dos produtos correspondentes diretamente na tabela `products` e aplica `query.in('product_id', productIds)`. Se nenhum produto for encontrado, retorna `{ data: [], total: 0 }` imediatamente sem disparar erro 400.
    - Em `inventoryService.getStockMovements`, a busca também pré-resolve `product_id` e `batch_id` para utilizar filtros válidos na tabela raiz (`notes`, `reason_code`, `cost_center_code`, `product_id.in`, `batch_id.in`).
  - **Busca Tolerante a Acentuação (`buildAccentRegex`)**:
    - Implementada a função `buildAccentRegex` que mapeia vogais para conjuntos fonéticos (ex.: `vitoria` localiza `Uva Vitória` e vice-versa), utilizando PostgREST `imatch` (`~*` no PostgreSQL).
  - **Atualização de Timestamp de Saldo na Importação**:
    - Ao importar planilhas que atualizam preços ou saldos, `stock_balances.updated_at` é atualizado para o timestamp atual, garantindo que o produto apareça imediatamente na primeira página da listagem (ordenada por `updated_at desc`).

- **Correção e Suporte a Reimportação de Planilha Exportada de Estoque (`/inventory`)** (`StockImportModal.tsx`, `inventoryService.ts`, `importParser.ts`):
  - **Reconhecimento de Colunas Exportadas de Saldos**:
    - Adicionados aliases canônicos em `importParser.ts` para cabeçalhos gerados na exportação: `Saldo Físico`, `Disponível`, `Preço de Compra / Custo Unit. (R$)`, `Preço de Venda Unit. (R$)`, `Estoque Mínimo`, `Produto`, `Unidade`.
    - Normalização resiliente com `parseImportNumber`, suportando decimais com vírgula ou ponto, símbolos monetários (`R$`) e formatos numéricos diversos.
  - **Tratamento Inteligente de Importação de Saldos vs. Movimentações Avulsas**:
    - Quando o arquivo não possui coluna `movement_type` (como planilhas exportadas de saldos), o sistema classifica os registros como `isBalanceImport = true` e tipo base `ADJUSTMENT`.
    - Não exige campos obrigatórios de baixas avulsas (`reason_code`, `cost_center_code`, `approver_email`) para importações de saldos físicos.
    - Validação de quantidade ajustada para aceitar saldo zero (`quantity >= 0`), eliminando o erro falso de `quantidade inválida`.
    - Fallback de localização de produto por SKU, ID e Nome do Produto (`product_name`).
  - **Atualização Atômica de Preços, Estoque Mínimo e Verificação de Delta de Saldo**:
    - Em `inventoryService.importMovementsBulk`, sincroniza automaticamente `cost_price`, `selling_price` e `min_stock` na tabela `products` para refletir de imediato no PDV e catálogo.
    - Compara a quantidade informada com o saldo atual (`Math.abs(targetQty - currentQty) > 0.0001`): se o usuário alterou apenas o preço ou custo sem mexer na quantidade física, não chama o RPC de movimento com delta zero (evitando o erro `A quantidade informada nao altera o saldo atual`), atualizando os preços com sucesso total.
    - Suporta ajuste de saldo para zero com auditoria e sem disparar restrições de quantidade estrita.

- **Edição de Pedidos via Reabertura no PDV (`/orders` → `/sales`)** (`OrdersPage.tsx`, `SalesPage.tsx`, `orderService.ts`, `productService.ts`):
  - **Ação "Editar no PDV" na Área de Detalhes do Pedido**:
    - Adicionado botão de ação em destaque **"Editar Pedido no PDV"** no modal de detalhes do pedido (`/orders`).
    - Modal de confirmação inteligente detalhando o estorno atômico de estoque e envio dos itens e do cliente para a tela de Venda.
    - Se o pedido estiver ativo, estorna o estoque atômico de volta para a loja (`restore_sale_stock`) e redireciona para `/sales?editOrder=:id`.
  - **Sincronização com Preço Vigente do Estoque e Reutilização do Número do Pedido**:
    - **Sincronização Automática com Preço Vigente**: Ao carregar os itens do pedido em edição no PDV, o sistema atualiza automaticamente os preços unitários (`unitPrice`) com o valor atual de venda do produto no catálogo/estoque (`fresh.selling_price`), garantindo que alterações de preço feitas no estoque reflitam imediatamente no pedido revisado.
    - **Atualização In-Place sem Duplicata**: Na finalização da edição, o sistema reaproveita o número do pedido original (`orderNumber`) e substitui o registro anterior (`replaceOrderId`), eliminando duplicatas com status cancelado e garantindo histórico limpo.
    - **Navegação Direta e Feedback**: Redireciona de volta para `/orders` com notificação de sucesso e carrinho limpo ao finalizar ou descartar a edição.
  - **Experiência de Edição Completa no PDV (`/sales`)**:
    - Pré-carregamento imediato dos itens no carrinho (com suporte total a itens pesáveis `KG` ou unitários `UN`, preços vigentes e descontos).
    - Pré-seleção automática do cliente vinculado no combobox, com possibilidade de alterar para outro cliente ou cadastrar novo via modal rápido.
    - Exibição de banner de alerta contextual (*"Editando pedido PED-XXXXXX. Altere os itens e o cliente à vontade"*), com botão para descartar edição.
    - Inclusão dos produtos do pedido no mapa de saldos (`stockByProduct`) com atualização em lote via `productService.getProductsByIds`.
    - Finalização da venda gera o pedido revisado e sincroniza os estoques e métricas.

- **Cadastro Rápido de Clientes na Venda PDV e Otimização do Combobox de Clientes** (`SalesPage.tsx`, `CustomerQuickCreateModal.tsx`, `CustomerCombobox.tsx`):
  - **Botão de Ação Direta "Novo Cliente"**:
    - Adicionado botão com ícone `UserPlus` ao lado do seletor de clientes na lateral do checkout do PDV (`/sales`).
    - Abre o modal rápido `CustomerQuickCreateModal` com campos essenciais: Nome Completo/Razão Social, CPF/CNPJ, Telefone/WhatsApp, E-mail e Observações.
    - Salva no banco de dados (`customers`), invalida as consultas de clientes do cache e seleciona automaticamente o novo cliente na venda em andamento (`selectedCustomerId`).
  - **Combobox de Clientes Aprimorado (`CustomerCombobox`)**:
    - Resolução automática de dados do cliente por ID (`customer-by-id`) quando selecionado programaticamente ou cadastrado via modal, garantindo exibição imediata do nome e documento no campo.
    - Amostra ajustada para os **3 últimos clientes** cadastrados, garantindo que os elementos caibam com perfeição na visualização do operador sem cortes visuais.
    - Posicionamento dinâmico inteligente (abre para cima quando posicionado próximo ao rodapé do painel de checkout), garantindo visibilidade total dos itens e do botão "Consumidor Final".

## 2026-10-08

- **Suporte a Produtos Pesáveis e Venda Fracionada (KG / Gramas) no Catálogo Público da Loja** (`CatalogPublicPage.tsx`, `productUtils.ts`):
  - **Experiência de Pesagem Completa para o Consumidor Final**:
    - Produtos com unidade `KG` recebem a etiqueta visual **`KG (PESO)`** e preço formatado por quilo (`R$ XX,XX/kg`).
    - Botão **"Escolher Peso (KG)"** abre o modal interativo de pesagem (`WeightInputModal`) diretamente na vitrine pública.
    - O cliente pode digitar livremente em gramas (ex: `150g`), quilos (ex: `0,150 kg`) ou valor que deseja gastar em R$ (ex: `R$ 5,00`), além de usar os atalhos rápidos (`100g`, `150g`, `250g`, `500g`, `1 kg`).
  - **Carrinho & Pedidos via WhatsApp com Discriminação de Peso**:
    - No carrinho do catálogo público, exibe a gramatura/quilos e cálculo proporcional exato.
    - Ao finalizar no WhatsApp, a mensagem gerada discrimina detalhadamente os itens pesados com peso e preço por quilo (ex: `• Alho a Granel (150g) - R$ 2,47 (R$ 16,45/kg)`).
  - **Grade Responsiva**: Catálogo adaptado para 1 item por linha no mobile e cards enriquecidos.

- **Otimizações Mobile: Layout de 1 Item por Linha no PDV e Menu com Botão 'Acessar Painel' em Destaque** (`SalesPage.tsx`, `PublicLayout.tsx`, `AppLayout.tsx`):
  - **Catálogo PDV em 1 Item por Linha no Mobile** (`SalesPage.tsx`):
    - Grade ajustada para `grid-cols-1` em telas móveis (`< 640px`) e `sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.
    - Cards com tipografia nítida, botões de toque confortáveis, badge de peso `KG`, preço em destaque e saldo visual sem apertos.
  - **Menu de Navegação Pública & Entrada na Plataforma** (`PublicLayout.tsx`):
    - Itens do menu móvel reestruturados em lista vertical de 1 item por linha com espaçamento amplo e feedback de toque.
    - Botão **"Acessar Painel"** (para usuários logados) e **"Acessar Painel / Entrar"** colocado em **destaque primário full-width** com ícone e sombra (`shadow-primary/25`).
  - **Menu Lateral do App** (`AppLayout.tsx`):
    - Navegação inferior de atalhos ajustada para 1 item por linha contínua no mobile.

- **Suporte a Produtos Pesáveis e Venda Fracionada (KG / Gramas) no PDV Frente de Caixa** (`SalesPage.tsx`, `WeightInputModal.tsx`):
  - **Identificação Automática de Itens Pesáveis**: Detecção inteligente de produtos cadastrados com unidade `KG` ou `QUILOGRAMA`. Exibição de badge `KG` e preço formatado por quilo (`R$ XX,XX/kg`) no catálogo e no carrinho.
  - **Modal Interativo de Pesagem & Gramatura** (`WeightInputModal`):
    - Ao selecionar um produto em KG no PDV, abre modal intuitivo para informe de peso.
    - Suporte a 3 modos de entrada sincronizados em tempo real:
      1. **Gramas (g)** com botões de incremento/decremento rápido (-50g / +50g).
      2. **Quilogramas (kg)** com precisão decimal (3 casas decimais - `0,150 kg`).
      3. **Valor em Dinheiro (R$)** calculando automaticamente a quantidade correspondente em quilos/gramas.
    - **Atalhos Rápidos de Peso**: Botões de 1 toque para pesos frequentes (`100g`, `150g`, `200g`, `250g`, `300g`, `500g`, `750g`, `1 kg`, `1,5 kg`, `2 kg`).
    - Validação de saldo disponível em tempo real e visualização de total calculado.
  - **Carrinho & Checkout com Precisão Fracionária**:
    - Botão de ajuste rápido de peso diretamente no carrinho com abertura do modal ou ajuste em passos de 50g.
    - Integração transparente com `orderService.createOrder` e a função RPC atômica do Supabase (`NUMERIC(12,3)`), baixando a fração exata do estoque (ex: 0,150 kg de Alho a Granel).

- **Sincronização Cadastral, Preços de Compra/Venda, Rastreabilidade de Fornecedores e Lotes no Estoque**:
  - **Cadastro Completo de Produtos no Catálogo Mestre** (`ProductsPage.tsx`, `productService.ts`):
    - Inclusão dos campos de **Preço de Custo (R$)**, **Preço de Venda (PDV) (R$)** e seleção de **Fornecedor Principal** diretamente no modal de criação e edição de produtos.
    - Exibição de colunas de Custo, Venda e Fornecedor na tabela de listagem de produtos com cálculo de margem em tempo real.
  - **Lançamento Enriquecido de Movimentações Manuais** (`InventoryPage.tsx`, `inventoryService.ts`):
    - Modal de *Lançar Movimento* agora suporta informe de **Preço de Compra / Custo Unitário**, **Preço de Venda Unitário no PDV**, **Fornecedor**, **Número do Lote** e **Data de Validade** nas entradas manuais.
    - Sincronização automática com a tabela de produtos (`products`) e lotes (`stock_batches`) para atualização imediata no PDV frente de caixa.
  - **Rastreabilidade e Origem do Estoque** (`ProductStockDetailsModal.tsx`, `InventoryPage.tsx`, `inventoryService.ts`):
    - Novo modal de *Origem & Lotes* acessível por linha de saldo, exibindo:
      1. Fornecedor vinculado, dados cadastrais e contatos (telefone, e-mail, contato).
      2. Relação de todos os lotes ativos, validades e status de expiração (dias restantes, avisos 30d/7d).
      3. Histórico das entradas e compras com preços unitários pagos e notas.
    - Filtro rápido de saldo no topo de Estoque (`Todos os Produtos`, `Com Estoque Ativo`, `Estoque Zerado`).
    - Ordenação padrão por itens recentemente movimentados (`updated_at desc`).

## 2026-10-07

- **Plano de Teste & Roteiro de Automação E2E com Execução em Tenant Dedicado** (`test-automation/`):
  - **Criação do Tenant Isolado de Testes**: Loja dedicada `Loja QA Automação E2E` (`loja-qa-automacao-e2e`) para execução de testes contínuos sem interferir em lojas de produção ou homologação.
  - **Roteiro Técnico Passo a Passo para Automação Externa** (`test-automation/ROTEIRO_AUTOMACAO_TESTES_E2E.md`, `test-automation/roteiro_casos_de_teste.json`): Especificação completa contendo 33 casos de teste (TC-01 a TC-33) com pré-condições, rotas, payloads, critérios de aceite e templates para automação em Playwright, Cypress e Postman.
  - **Runner Automatizado de Testes** (`test-automation/executar_roteiro_testes.js`): Execução ponta a ponta cobrindo cadastro de fornecedores, 4 categorias, 4 produtos no catálogo mestre, carga inicial de 400 unidades de estoque com lotes e validades (`31/10/2026`), venda no PDV com dedução atômica, cancelamento com estorno automático, emissão e recebimento de ordem de compra, e acesso/validação em 100% das telas da aplicação (incluindo os 9 relatórios de varejo, auditoria, configurações e catálogo público web).
  - **Relatório Executivo & Evidências Gravadas Localmente** (`test-automation/RELATORIO_EXECUCAO_TESTES.md`, `test-automation/resultado_execucao_testes.json`): 100% de sucesso (33/33 casos de teste aprovados em 20,26 segundos).

## 2026-10-05

- **Padronização Responsiva de Tabelas & Botões de Ação Visíveis no Mobile** (`src/components/common/ResponsiveTable.tsx`, `src/index.css`, e todas as páginas de gestão):
  - **Unificação do Padrão de Cards Mobile**: Substituição de tabelas/listas duplicadas isoladas por `<ResponsiveTable>`, transformando cada linha da tabela em cards organizados em dispositivos móveis (`< 768px`) com grid de 2 colunas e labels semânticos.
  - **Botões de Ação Grandes e Imediatamente Visíveis**: Eliminação de menus escondidos ou botões de ícone minúsculos nas ações de linha. Em todas as telas (`/products`, `/categories`, `/purchases`, `/orders`, `/customers`, `/suppliers`, `/batches`, `/stores`, `/team`, `/inventory`, `/audit`, `/notifications` e `/global-admin`), as ações agora possuem botões grandes (`min-height: 38px`), áreas de toque acessíveis (*touch-friendly*), ícones e textos claros (Ex: *Fotos, Editar, Excluir, Detalhes, Receber, Cancelar, Baixa, Reset Senha*).
  - **CSS Responsivo Dedicado**: Otimização de `.responsive-mobile-cards tbody td.mobile-table-actions` para renderizar ações em linha horizontal inferior com separador visual, ocultação do rótulo redundante "AÇÕES" e expansão natural dos botões.

## 2026-10-02

- **Página de Evidências na Landing Page & Rota `/evidence`** (`src/pages/EvidencePage.tsx`, `AppRoutes.tsx`, `PublicLayout.tsx`, `LandingPage.tsx`):
  - Nova página pública interativa integrada à arquitetura React da aplicação com filtro por categoria, alternador de visualização (Desktop/Mobile/Ambos), busca instantânea e modal lightbox em tela cheia com atalho `ESC`.
  - Links de navegação adicionados no menu principal superior, menu mobile e rodapé do site institucional.
  - Seção de vitrine de qualidade e testes adicionada na `LandingPage` com cards de visualização rápida.
- **Caderno Executivo de Testes em Markdown** (`docs/pt-BR/test-evidence.md`, `docs/evidence/README.md`):
  - Documentação completa em Markdown com todas as 50 capturas de tela renderizadas em pares Desktop & Mobile, detalhamento das rotas, descrições operacionais e tabela consolidada de testes de APIs REST com tokens HBAC.
- **Caderno Executivo de Testes & Evidências Visuais em HTML** (`docs/pt-BR/test-evidence.html`, `public/test-evidence.html`):
  - Execução automatizada de testes e captura em alta resolução de 50 screenshots (25 telas e fluxos em Desktop 1440×900 e Mobile 390×844).
  - Validação de 100% dos fluxos de gestão, incluindo Dashboard, Catálogo Mestre, Estoque com Valorização, Compras com Markup, PDV Frente de Caixa, Pedidos, Clientes, Fornecedores, Validades, os 9 Relatórios de Varejo e as 5 abas do Painel Global Admin.
  - Testes de API REST e integração com IAs externas via tokens HBAC na loja de homologação GNZ Hortifruti com status HTTP 200 OK.
  - Relatório interativo em HTML moderno com filtros dinâmicos, comparador de viewport, busca e visualizador modal lightbox com zoom.
- Novos Relatórios de Gestão Estratégica & Varejo em `/reports` (`ReportsPage.tsx`, `reportService.ts`, `report.types.ts`):
  - **Giro de Estoque & Compra Baseada no Consumo (`demand`)**: Cálculo de consumo médio diário (últimos 30 dias), previsão de esgotamento/cobertura em dias (*runout*), recomendação inteligente de compra para cobertura de 30 dias, investimento necessário projetado e classificação de urgência (`URGENT`, `ATTENTION`, `NORMAL`, `OVERSTOCK`).
  - **Ticket Médio por Cliente & Comportamento / LTV (`customers`)**: Análise de histórico de compras com cálculo de total de pedidos, LTV acumulado, ticket médio por transação, recência (dias desde a última compra), canal preferido de atendimento e segmentação automática (`VIP`, `FREQUENT`, `OCCASIONAL`, `INACTIVE`).
  - **Levantamento & Investimento de Capital de Giro por Categoria (`investment`)**: Consolidação do capital investido (a custo) por categoria, potencial de faturamento na gôndola, lucro bruto projetado, margem %, % de alocação no estoque da loja e GMROI (*Gross Margin Return on Investment*).
  - Sincronização completa de URL state para todas as abas de relatórios via `useTablePagination` (`?tab=...&page=...&search=...&status=...`).
  - Exportação CSV dedicada para todos os 9 relatórios consolidados do sistema.
- Redesenho e modernização do menu de relatórios em `/reports` (`ReportsPage.tsx`):
  - **Menu Segmentado de Relatórios**: Barra de navegação moderna com abas em pílula, ícones dedicados por tipo de análise, títulos responsivos e badges dinâmicos de contagem/alerta (ex: total de unidades, status da Curva ABC 80/15/5, alertas de ruptura e perdas).
  - **Barra de Contexto e Filtros Integrada**: Header contextual com ícone temático, descrição explicativa da análise ativa, contador instantâneo de registros filtrados, seletores de categoria/classe ABC/gravidade com ícones integrados e botões de ação rápida para exportação CSV e impressão de demonstrativo executivo.
  - **Experiência Responsiva e Touch**: Container com rolagem horizontal suave para dispositivos móveis sem quebra de layout ou estouro de viewport.

## 2026-10-01

- Painel Global Admin (`/global-admin`, `GlobalAdminDashboardPage.tsx`):
  - **Menu Dropdown de Ações Rápidas**: Transformação das ações de topo e de linha nas tabelas de Lojas e Usuários em menus dropdown (`<DropdownMenu />`), organizando edição, transferência de propriedade, catálogo público, redefinição de senha e exclusão.
  - **Central de Backup & Exportação Multi-loja** (`GlobalBackupPanel.tsx`, `backupService.ts`):
    - Exportação de Dump SQL da base com comandos `INSERT INTO` relacionais completos, filtráveis por loja individual ou backup geral de todas as lojas.
    - Exportação de arquivo `.ZIP` contendo todas as imagens de produtos da loja com manifesto indexado (`manifest.json` com SKU, nome e ID do produto).
    - Exportação de pacote relacional estruturado em `.JSON` para BI, auditoria e homologação.
  - **Gerenciador e Explorador de Banco de Dados (CRUD Completo)** (`GlobalDbExplorerPanel.tsx`, `dbManagerService.ts`):
    - Interface dinâmica para inspeção tabular com paginação, busca e filtro por loja.
    - Modais de inserção de novos registros, edição de linhas existentes e exclusão com modal de confirmação em todas as tabelas gerenciadas (`stores`, `products`, `categories`, `stock_balances`, `stock_batches`, `stock_movements`, `orders`, `purchase_orders`, `customers`, `suppliers`, `cost_centers`, `loss_reasons`).
  - **Configuração de API & Controle de Acesso HBAC por Loja** (`GlobalApiKeyHbacPanel.tsx`, `apiKeyService.ts`):
    - Geração de tokens de API com escopos HBAC granulares (`products:*`, `inventory:*`, `orders:*`, `purchases:*`, `customers:*`, `reports:*`, `audit:*`) e presets rápidos (Admin, Operador, Leitura, Integração ERP/PDV).
    - Isolamento rígido por loja (`store_id`) associada ao token ou escopo global multi-loja.
    - Suporte a tokens com expiração configurável (30, 90, 365 dias) ou chave permanente (sem expiração).
    - Gestão de ciclo de vida (cópia de chave, ativação/desativação, revogação) e documentação interativa integrada com exemplos de cabeçalhos e chamadas `curl`/`fetch`.
- Desacoplamento de Preço de Custo e Preço de Venda do cadastro base de produtos em `/products` (`ProductsPage.tsx`): o cadastro em `/products` funciona como catálogo mestre (SKU, código de barras, categoria, unidade, estoques mín/máx), permitindo que preços reais de custo e venda venham das entradas em estoque (`/purchases`, entrada em lote, lotes de diferentes fornecedores).
- Reformulação completa da página de Relatórios em `/reports` (`ReportsPage.tsx`, `reportService.ts`, `report.types.ts`):
  - KPIs executivos no topo: Estoque em Custo, Estoque em Venda, Margem Bruta %, Faturamento no Mês, Perdas Operacionais e Alertas de Ruptura.
  - Relatório 1: **Valorização & Rentabilidade do Estoque** (Custo Unitário, Venda Unitária, Totais, Lucro Estimado e Margem %).
  - Relatório 2: **Curva ABC & Mix de Produtos** (Classificação A/B/C automática por valor, % do mix, % acumulado e diretrizes de reposição).
  - Relatório 3: **Compras & Fornecedores** (Volume financeiro por pedido, custo total, venda projetada e margens praticadas).
  - Relatório 4: **Perdas & Baixas Operacionais** (Avarias, vencimentos, descartes, centros de custo e operadores).
  - Relatório 5: **Ruptura & Reposição** (Identificação de produtos zerados e críticos com cálculo automático de déficit de compra e custo estimado de reposição).
  - Relatório 6: **Desempenho de Vendas** (Histórico detalhado por canal, cliente, descontos e total pago).
  - Padrão visual e funcional unificado com `/inventory` e `/products`: paginação integrada, responsividade desktop/mobile, busca instantânea, filtros por categoria/status e exportação CSV em todos os relatórios.
- Integração de Preço de Custo e Preço de Venda em `/purchases` (`PurchasingPage.tsx`, `purchasingService.ts`, `purchasing.types.ts`): emissão de ordens de compra com cálculo em tempo real de lucratividade/margem por item e total, sincronização imediata dos custos e preços de venda com o catálogo de produtos e reflexão direta nos relatórios e saldos de `/inventory`.
- Implementação de avaliação financeira e valores de produtos em `/inventory`: exibição de Valor de Compra (Custo unitário e total), Valor de Venda (tabela unitário e total), Lucro Estimado e Margem média consolidada nos cards de KPI e colunas da tabela de saldos (`InventoryPage.tsx`, `inventoryService.ts`, `inventory.types.ts`).
- Exportação avançada de saldos em CSV incluindo valores de compra, venda, totalização e margem estimada.
- Implementação de seleção múltipla e baixa de estoque em lote na aba de saldos de `/inventory` (`BulkStockWriteoffModal.tsx`, `inventoryService.writeoffBulkStock`, `InventoryPage.tsx`), com suporte a motivo, centro de custo, aprovador e preenchimento rápido de saldo total.
- Ação em lote para remoção de produtos zerados selecionados para Global Admin.

## 2026-09-30

- Correção de contraste e legibilidade da badge "Global Admin" na listagem de usuários de `/global-admin` (`GlobalAdminDashboardPage.tsx`).
- Remoção de produtos com estoque zerado no painel `/inventory` para o perfil Global Admin (individual e em lote com `ConfirmModal`).
- Seleção múltipla de produtos em `/products` e modal de entrada de estoque em lote direta (`BulkStockEntryModal.tsx`, `inventoryService.addBulkStock`).
- Remoção de jargões técnicos excessivos ("SaaS", "Enterprise", "Multi-tenant") e padronização da marca para "Olivelas Gestão / Estoque & Vendas".
- Redesenho completo e profissional da Landing Page (`LandingPage.tsx`) com foco em valor real, segmentos atendidos, workflow prático, catálogo WhatsApp e FAQ detalhado.
- Normalização robusta de cabeçalhos e valores na importação de produtos CSV/JSON em massa (`importParser.ts`, `productService.ts` e `ProductsPage.tsx`).
- Correção de pré-visualização de preços e categorias na modal de importação em massa.
- Sistema de galeria de imagens para produtos com suporte a upload pelo dispositivo/câmera e reuso da biblioteca de mídia (`ProductGalleryModal.tsx`, `productImageService.ts`).

## 2026-09-27

- Criação da árvore `docs/` (pt-BR) a partir de inventário do código e SQL.
- Guias de replicação de shell desktop e mobile.
- `AGENTS.md` apontando para `docs/pt-BR/ai-context.md`.
- Status dos docs: `DRAFT` (sem revisão humana registrada).
