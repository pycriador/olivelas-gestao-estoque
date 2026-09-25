-- ========================================================================
-- SPRINT 02 & 03: SEED DATA (ROLES & GRANULAR PERMISSIONS)
-- ========================================================================

-- Insert Standard System Roles
INSERT INTO public.roles (code, name, description, is_system)
VALUES
  ('GLOBAL_ADMIN', 'Administrador Global', 'Acesso irrestrito a todas as lojas e configurações do sistema', TRUE),
  ('STORE_ADMIN', 'Administrador da Loja', 'Gestão completa da loja, equipe, produtos, clientes e configurações', TRUE),
  ('FINANCE', 'Financeiro', 'Gestão financeira, relatórios de vendas, compras e pagamentos', TRUE),
  ('SELLER', 'Vendedor', 'Realização de vendas, emissão de pedidos e consulta de catálogo', TRUE),
  ('INVENTORY', 'Estoquista', 'Controle de estoque, entradas, saídas, conferência e lotes', TRUE),
  ('VIEWER', 'Visualizador', 'Acesso somente leitura a consultas e relatórios operacionais', TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Insert Granular Permissions
INSERT INTO public.permissions (code, name, module, description)
VALUES
  -- Products
  ('products.read', 'Visualizar Produtos', 'products', 'Permite consultar o catálogo de produtos'),
  ('products.create', 'Cadastrar Produtos', 'products', 'Permite criar novos produtos'),
  ('products.update', 'Editar Produtos', 'products', 'Permite alterar produtos e preços'),
  ('products.delete', 'Excluir Produtos', 'products', 'Permite inativar ou excluir produtos'),

  -- Inventory
  ('inventory.read', 'Visualizar Estoque', 'inventory', 'Permite consultar saldos e lotes'),
  ('inventory.adjust', 'Ajustar Estoque', 'inventory', 'Permite realizar correções e ajustes de estoque'),
  ('inventory.receive', 'Receber Mercadorias', 'inventory', 'Permite lançar entradas de estoque'),
  ('inventory.writeoff', 'Dar Baixa em Estoque', 'inventory', 'Permite baixas por perda, quebra ou vencimento'),

  -- Sales & Orders
  ('sales.read', 'Visualizar Vendas', 'sales', 'Permite consultar vendas e pedidos'),
  ('sales.create', 'Realizar Vendas', 'sales', 'Permite abrir novas vendas no PDV ou pedidos'),
  ('sales.update', 'Alterar Pedidos', 'sales', 'Permite editar pedidos em andamento'),
  ('sales.cancel', 'Cancelar Vendas', 'sales', 'Permite estornar vendas e restaurar estoque'),

  -- Customers
  ('customers.read', 'Visualizar Clientes', 'customers', 'Permite consultar base de clientes'),
  ('customers.create', 'Cadastrar Clientes', 'customers', 'Permite cadastrar novos clientes'),
  ('customers.update', 'Editar Clientes', 'customers', 'Permite atualizar dados de clientes'),
  ('customers.delete', 'Excluir Clientes', 'customers', 'Permite remover clientes da loja'),

  -- Suppliers
  ('suppliers.read', 'Visualizar Fornecedores', 'suppliers', 'Permite consultar fornecedores'),
  ('suppliers.create', 'Cadastrar Fornecedores', 'suppliers', 'Permite cadastrar novos fornecedores'),
  ('suppliers.update', 'Editar Fornecedores', 'suppliers', 'Permite atualizar fornecedores'),
  ('suppliers.delete', 'Excluir Fornecedores', 'suppliers', 'Permite remover fornecedores'),

  -- Purchasing
  ('purchase_orders.read', 'Visualizar Compras', 'purchasing', 'Permite consultar ordens de compra'),
  ('purchase_orders.create', 'Criar Ordem de Compra', 'purchasing', 'Permite emitir novas ordens de compra'),
  ('purchase_orders.update', 'Editar Ordem de Compra', 'purchasing', 'Permite alterar ordens de compra'),
  ('purchase_orders.cancel', 'Cancelar Ordem de Compra', 'purchasing', 'Permite cancelar ordens de compra'),
  ('purchase_orders.receive', 'Receber Compras', 'purchasing', 'Permite dar entrada no estoque via compra'),

  -- Reports
  ('reports.sales', 'Relatório de Vendas', 'reports', 'Permite gerar relatórios de faturamento e vendas'),
  ('reports.inventory', 'Relatório de Estoque', 'reports', 'Permite relatórios de saldos, curvas e perdas'),
  ('reports.customers', 'Relatório de Clientes', 'reports', 'Permite relatórios de clientes e ticket médio'),
  ('reports.suppliers', 'Relatório de Fornecedores', 'reports', 'Permite relatórios de compras e fornecedores'),

  -- Administration
  ('stores.manage', 'Gerenciar Loja', 'stores', 'Permite alterar dados cadastrais e tema da loja'),
  ('users.manage', 'Gerenciar Equipe', 'users', 'Permite convidar membros e alterar papéis'),
  ('roles.manage', 'Gerenciar Funções', 'roles', 'Permite gerenciar funções personalizadas'),
  ('permissions.manage', 'Gerenciar Permissões', 'permissions', 'Permite configurar permissões')
ON CONFLICT (code) DO NOTHING;

-- Map Default Permissions to STORE_ADMIN (all store permissions)
INSERT INTO public.role_permissions (role_code, permission_code)
SELECT 'STORE_ADMIN', code FROM public.permissions
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Map Default Permissions to SELLER
INSERT INTO public.role_permissions (role_code, permission_code)
VALUES
  ('SELLER', 'products.read'),
  ('SELLER', 'inventory.read'),
  ('SELLER', 'sales.read'),
  ('SELLER', 'sales.create'),
  ('SELLER', 'sales.update'),
  ('SELLER', 'customers.read'),
  ('SELLER', 'customers.create'),
  ('SELLER', 'customers.update'),
  ('SELLER', 'reports.sales')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Map Default Permissions to INVENTORY
INSERT INTO public.role_permissions (role_code, permission_code)
VALUES
  ('INVENTORY', 'products.read'),
  ('INVENTORY', 'products.create'),
  ('INVENTORY', 'products.update'),
  ('INVENTORY', 'inventory.read'),
  ('INVENTORY', 'inventory.adjust'),
  ('INVENTORY', 'inventory.receive'),
  ('INVENTORY', 'inventory.writeoff'),
  ('INVENTORY', 'suppliers.read'),
  ('INVENTORY', 'purchase_orders.read'),
  ('INVENTORY', 'purchase_orders.receive'),
  ('INVENTORY', 'reports.inventory')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Map Default Permissions to FINANCE
INSERT INTO public.role_permissions (role_code, permission_code)
VALUES
  ('FINANCE', 'sales.read'),
  ('FINANCE', 'purchase_orders.read'),
  ('FINANCE', 'purchase_orders.create'),
  ('FINANCE', 'customers.read'),
  ('FINANCE', 'suppliers.read'),
  ('FINANCE', 'reports.sales'),
  ('FINANCE', 'reports.inventory'),
  ('FINANCE', 'reports.customers'),
  ('FINANCE', 'reports.suppliers')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Map Default Permissions to VIEWER
INSERT INTO public.role_permissions (role_code, permission_code)
VALUES
  ('VIEWER', 'products.read'),
  ('VIEWER', 'inventory.read'),
  ('VIEWER', 'sales.read'),
  ('VIEWER', 'customers.read'),
  ('VIEWER', 'reports.sales')
ON CONFLICT (role_code, permission_code) DO NOTHING;
