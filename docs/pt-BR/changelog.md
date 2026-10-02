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

## 2026-10-02

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
