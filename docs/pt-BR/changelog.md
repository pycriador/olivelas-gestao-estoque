---
id: REF-OLIVELAS-DOCS-CHANGELOG
title: Changelog da documentação
type: Reference
status: DRAFT
owner: project-maintainers
created: 2026-09-27
updated: 2026-09-27
language: pt-BR
classification: Confirmed
---

# Changelog da documentação

## 2026-10-15

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
  - **Experiência de Edição Completa no PDV (`/sales`)**:
    - Pré-carregamento imediato dos itens no carrinho (com suporte total a itens pesáveis `KG` ou unitários `UN`, preços originais e descontos).
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
