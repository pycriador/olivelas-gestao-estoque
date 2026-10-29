-- =============================================================================
-- Migration: 20261030000022_permission_groups_and_billing.sql
-- Descrição:
--   1. Cria `public.permission_modules` (catálogo de módulos de tela com valores
--      comerciais mensais e metadados de rotas/permissões).
--   2. Cria `public.permission_groups` (grupos de perfil comerciais com valores
--      para venda de planos prontos como "Catálogo somente por WhatsApp",
--      "Controle de Estoque", "PDV + Estoque", "Gestão Completa", etc.).
--   3. Cria `public.user_permission_profiles` (vínculo por usuário com suporte
--      a restrição efetiva inclusive sobre STORE_ADMIN, cálculo de valor mensal,
--      desconto, ciclo de cobrança e status de pagamento).
--   4. Cria `public.subscription_payments` (controle de pagamentos, vencimentos,
--      baixas PIX/Boleto/Cartão/Transferência e histórico financeiro completo).
--   5. Cria `public.permission_billing_audit_logs` (trilha de auditoria de
--      mudanças de permissões, planos, valores e pagamentos).
--   6. Configura RLS seguro e revoga acesso de `anon`.
-- =============================================================================

-- 1. Catálogo de Módulos de Tela Precificáveis
CREATE TABLE IF NOT EXISTS public.permission_modules (
    code VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'OPERACAO' CHECK (
        category IN ('VENDAS', 'CATALOGO_ESTOQUE', 'COMPRAS_SUPRIMENTOS', 'GESTAO_BI', 'TECNOLOGIA')
    ),
    routes TEXT[] NOT NULL DEFAULT '{}',
    permissions TEXT[] NOT NULL DEFAULT '{}',
    monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Grupos de Perfil / Planos Comerciais
CREATE TABLE IF NOT EXISTS public.permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    badge_color VARCHAR(32) NOT NULL DEFAULT 'indigo',
    enabled_modules TEXT[] NOT NULL DEFAULT '{}',
    enabled_permissions TEXT[] NOT NULL DEFAULT '{}',
    base_monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    annual_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    setup_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_system_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Perfil de Permissões Efetivas e Contrato Comercial por Usuário
CREATE TABLE IF NOT EXISTS public.user_permission_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    permission_group_id UUID REFERENCES public.permission_groups(id) ON DELETE SET NULL,
    custom_plan_name VARCHAR(150),
    enforce_over_store_admin BOOLEAN NOT NULL DEFAULT true,
    enabled_modules TEXT[] NOT NULL DEFAULT '{}',
    granted_permissions TEXT[] NOT NULL DEFAULT '{}',
    revoked_permissions TEXT[] NOT NULL DEFAULT '{}',
    billing_cycle VARCHAR(24) NOT NULL DEFAULT 'MONTHLY' CHECK (
        billing_cycle IN ('MONTHLY', 'ANNUAL', 'LIFETIME', 'FREE_TRIAL', 'CUSTOM')
    ),
    calculated_monthly_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    agreed_monthly_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    setup_fee_charged NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (
        payment_status IN ('ACTIVE', 'TRIAL', 'PENDING', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXEMPT')
    ),
    block_on_overdue BOOLEAN NOT NULL DEFAULT false,
    billing_day INTEGER NOT NULL DEFAULT 10 CHECK (billing_day >= 1 AND billing_day <= 31),
    trial_ends_at TIMESTAMPTZ,
    next_due_date DATE,
    last_payment_at TIMESTAMPTZ,
    commercial_notes TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_permission_profiles_user_id ON public.user_permission_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_profiles_group_id ON public.user_permission_profiles(permission_group_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_profiles_payment_status ON public.user_permission_profiles(payment_status);

-- 4. Controle e Histórico de Pagamentos (Ledger Financeiro SaaS)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_permission_profile_id UUID REFERENCES public.user_permission_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    reference_month VARCHAR(20) NOT NULL,
    description VARCHAR(255) NOT NULL,
    snapshot_plan_name VARCHAR(150),
    snapshot_modules TEXT[] NOT NULL DEFAULT '{}',
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'PIX' CHECK (
        payment_method IN ('PIX', 'BOLETO', 'CREDIT_CARD', 'TRANSFER', 'CASH', 'OTHER')
    ),
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED')
    ),
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_at TIMESTAMPTZ,
    external_transaction_id VARCHAR(150),
    receipt_url TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_due_date ON public.subscription_payments(due_date DESC);

-- 5. Log de Auditoria de Permissões, Planos e Pagamentos
CREATE TABLE IF NOT EXISTS public.permission_billing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL CHECK (
        event_type IN (
            'GROUP_ASSIGNED',
            'MODULES_CHANGED',
            'PRICE_UPDATED',
            'PAYMENT_CREATED',
            'PAYMENT_MARKED_PAID',
            'PAYMENT_STATUS_CHANGED',
            'GROUP_CATALOG_UPDATED'
        )
    ),
    summary TEXT NOT NULL,
    previous_state JSONB DEFAULT '{}'::jsonb,
    new_state JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perm_billing_audit_target_user ON public.permission_billing_audit_logs(target_user_id, created_at DESC);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.touch_permission_billing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_permission_modules ON public.permission_modules;
CREATE TRIGGER trg_touch_permission_modules
    BEFORE UPDATE ON public.permission_modules
    FOR EACH ROW EXECUTE FUNCTION public.touch_permission_billing_updated_at();

DROP TRIGGER IF EXISTS trg_touch_permission_groups ON public.permission_groups;
CREATE TRIGGER trg_touch_permission_groups
    BEFORE UPDATE ON public.permission_groups
    FOR EACH ROW EXECUTE FUNCTION public.touch_permission_billing_updated_at();

DROP TRIGGER IF EXISTS trg_touch_user_permission_profiles ON public.user_permission_profiles;
CREATE TRIGGER trg_touch_user_permission_profiles
    BEFORE UPDATE ON public.user_permission_profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_permission_billing_updated_at();

DROP TRIGGER IF EXISTS trg_touch_subscription_payments ON public.subscription_payments;
CREATE TRIGGER trg_touch_subscription_payments
    BEFORE UPDATE ON public.subscription_payments
    FOR EACH ROW EXECUTE FUNCTION public.touch_permission_billing_updated_at();

-- Helper SQL para verificar se o usuário possui determinado módulo efetivo
CREATE OR REPLACE FUNCTION public.user_has_effective_module(
    p_module_code TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_global BOOLEAN;
    v_profile RECORD;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT is_global_admin INTO v_is_global
    FROM public.profiles
    WHERE id = p_user_id;

    IF COALESCE(v_is_global, false) THEN
        RETURN true;
    END IF;

    SELECT
        enabled_modules,
        enforce_over_store_admin,
        payment_status,
        block_on_overdue
    INTO v_profile
    FROM public.user_permission_profiles
    WHERE user_id = p_user_id;

    -- Se o usuário ainda não tem perfil restritivo configurado pelo Global Admin, libera padrão
    IF NOT FOUND THEN
        RETURN true;
    END IF;

    -- Se estiver suspenso por inadimplência com bloqueio ativo
    IF v_profile.block_on_overdue AND v_profile.payment_status IN ('SUSPENDED', 'CANCELLED') THEN
        RETURN false;
    END IF;

    RETURN p_module_code = ANY(COALESCE(v_profile.enabled_modules, '{}'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_effective_module(TEXT, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_effective_module(TEXT, UUID) FROM anon;

-- Habilitar RLS
ALTER TABLE public.permission_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_billing_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: permission_modules
DROP POLICY IF EXISTS "authenticated_read_permission_modules" ON public.permission_modules;
CREATE POLICY "authenticated_read_permission_modules" ON public.permission_modules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "global_admin_manage_permission_modules" ON public.permission_modules;
CREATE POLICY "global_admin_manage_permission_modules" ON public.permission_modules
    FOR ALL TO authenticated
    USING (public.is_global_admin())
    WITH CHECK (public.is_global_admin());

-- Policies: permission_groups
DROP POLICY IF EXISTS "authenticated_read_permission_groups" ON public.permission_groups;
CREATE POLICY "authenticated_read_permission_groups" ON public.permission_groups
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "global_admin_manage_permission_groups" ON public.permission_groups;
CREATE POLICY "global_admin_manage_permission_groups" ON public.permission_groups
    FOR ALL TO authenticated
    USING (public.is_global_admin())
    WITH CHECK (public.is_global_admin());

-- Policies: user_permission_profiles
DROP POLICY IF EXISTS "users_read_own_permission_profile" ON public.user_permission_profiles;
CREATE POLICY "users_read_own_permission_profile" ON public.user_permission_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_global_admin());

DROP POLICY IF EXISTS "global_admin_manage_user_permission_profiles" ON public.user_permission_profiles;
CREATE POLICY "global_admin_manage_user_permission_profiles" ON public.user_permission_profiles
    FOR ALL TO authenticated
    USING (public.is_global_admin())
    WITH CHECK (public.is_global_admin());

-- Policies: subscription_payments
DROP POLICY IF EXISTS "users_read_own_subscription_payments" ON public.subscription_payments;
CREATE POLICY "users_read_own_subscription_payments" ON public.subscription_payments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_global_admin());

DROP POLICY IF EXISTS "global_admin_manage_subscription_payments" ON public.subscription_payments;
CREATE POLICY "global_admin_manage_subscription_payments" ON public.subscription_payments
    FOR ALL TO authenticated
    USING (public.is_global_admin())
    WITH CHECK (public.is_global_admin());

-- Policies: permission_billing_audit_logs
DROP POLICY IF EXISTS "users_read_own_permission_billing_audit" ON public.permission_billing_audit_logs;
CREATE POLICY "users_read_own_permission_billing_audit" ON public.permission_billing_audit_logs
    FOR SELECT TO authenticated
    USING (target_user_id = auth.uid() OR public.is_global_admin());

DROP POLICY IF EXISTS "global_admin_manage_permission_billing_audit" ON public.permission_billing_audit_logs;
CREATE POLICY "global_admin_manage_permission_billing_audit" ON public.permission_billing_audit_logs
    FOR ALL TO authenticated
    USING (public.is_global_admin())
    WITH CHECK (public.is_global_admin());

-- Grants para authenticated e Revoke para anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_billing_audit_logs TO authenticated;

REVOKE ALL ON TABLE public.permission_modules FROM anon;
REVOKE ALL ON TABLE public.permission_groups FROM anon;
REVOKE ALL ON TABLE public.user_permission_profiles FROM anon;
REVOKE ALL ON TABLE public.subscription_payments FROM anon;
REVOKE ALL ON TABLE public.permission_billing_audit_logs FROM anon;

-- =============================================================================
-- SEED INICIAL: 10 Módulos de Tela Precificáveis e 5 Grupos Comerciais
-- =============================================================================

INSERT INTO public.permission_modules (code, name, description, category, routes, permissions, monthly_price, sort_order, is_active)
VALUES
    (
        'MOD_CATALOG_WA',
        'Catálogo de Produtos & Vendas WhatsApp',
        'Cadastro de produtos, categorias, vitrine online pública (/store/:slug) e recebimento/gestão de pedidos pelo WhatsApp (/orders).',
        'VENDAS',
        ARRAY['/products', '/categories', '/orders'],
        ARRAY['products.read', 'products.create', 'products.update', 'products.delete', 'categories.manage', 'orders.read', 'orders.manage', 'catalog.whatsapp'],
        49.90,
        1,
        true
    ),
    (
        'MOD_POS_SALES',
        'Vendas PDV (Frente de Caixa Presencial)',
        'Tela de Ponto de Venda rápido (/sales) com leitor de código de barras, múltiplos meios de pagamento e baixa imediata.',
        'VENDAS',
        ARRAY['/sales'],
        ARRAY['sales.pos', 'sales.read', 'sales.create', 'sales.update'],
        59.90,
        2,
        true
    ),
    (
        'MOD_INVENTORY',
        'Controle de Estoque (Saldos, Kardex e Baixas)',
        'Gestão completa de saldos em estoque (/inventory), ajustes manuais, baixas por perda/avaria e histórico de movimentações.',
        'CATALOGO_ESTOQUE',
        ARRAY['/inventory'],
        ARRAY['inventory.read', 'inventory.adjust', 'inventory.receive', 'inventory.writeoff'],
        49.90,
        3,
        true
    ),
    (
        'MOD_EXPIRATION',
        'Controle de Lotes & Validades (FEFO)',
        'Monitoramento de validades (/expiration), semáforo de lotes próximos do vencimento e tratativas (devolução, descarte, retenção).',
        'CATALOGO_ESTOQUE',
        ARRAY['/expiration'],
        ARRAY['inventory.expiration', 'inventory.batches'],
        29.90,
        4,
        true
    ),
    (
        'MOD_PURCHASING',
        'Gestão de Compras (Ordens de Compra)',
        'Emissão de Ordens de Compra (/purchases), acompanhamento de entregas, entrada automática de lotes no estoque e atualização de custo/markup.',
        'COMPRAS_SUPRIMENTOS',
        ARRAY['/purchases'],
        ARRAY['purchasing.read', 'purchasing.create', 'purchasing.receive', 'purchase_orders.read', 'purchase_orders.create', 'purchase_orders.receive'],
        39.90,
        5,
        true
    ),
    (
        'MOD_SUPPLIERS',
        'Cadastro & Gestão de Fornecedores',
        'Base de fornecedores (/suppliers), CNPJ, contatos comerciais e vínculo com produtos e ordens de compra.',
        'COMPRAS_SUPRIMENTOS',
        ARRAY['/suppliers'],
        ARRAY['suppliers.read', 'suppliers.create', 'suppliers.update', 'suppliers.delete'],
        19.90,
        6,
        true
    ),
    (
        'MOD_CUSTOMERS',
        'Cadastro de Clientes & CRM',
        'Gestão da carteira de clientes (/customers), endereços de entrega e histórico nominal de compras.',
        'VENDAS',
        ARRAY['/customers'],
        ARRAY['customers.read', 'customers.create', 'customers.update', 'customers.delete'],
        24.90,
        7,
        true
    ),
    (
        'MOD_REPORTS',
        'Gestão de Relatórios & BI (Curva ABC, Valuation, CSV)',
        'Painel analítico (/reports) com Curva ABC, Valuation de estoque, Perdas, Compras por Fornecedor, Ticket Médio, Previsão de Demanda e exportação CSV.',
        'GESTAO_BI',
        ARRAY['/reports'],
        ARRAY['reports.view', 'reports.sales', 'reports.inventory', 'reports.purchasing', 'reports.export'],
        49.90,
        8,
        true
    ),
    (
        'MOD_TEAM_AUDIT',
        'Gestão de Equipe, Configurações & Auditoria',
        'Gerenciamento de colaboradores da loja (/team), trilha de auditoria (/audit) e personalização visual/dados da loja (/settings).',
        'GESTAO_BI',
        ARRAY['/team', '/audit', '/settings', '/stores'],
        ARRAY['users.manage', 'stores.manage', 'audit.view'],
        29.90,
        9,
        true
    ),
    (
        'MOD_API_INTEGRATIONS',
        'Integrações Externas API (Conector REST & HBAC)',
        'Conectores HTTP estilo Postman (/integrations) para sincronizar Clientes, Produtos, Fornecedores e Estoque com ERPs externos.',
        'TECNOLOGIA',
        ARRAY['/integrations'],
        ARRAY['integrations.manage'],
        79.90,
        10,
        true
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    routes = EXCLUDED.routes,
    permissions = EXCLUDED.permissions,
    monthly_price = EXCLUDED.monthly_price,
    sort_order = EXCLUDED.sort_order;

INSERT INTO public.permission_groups (code, name, description, badge_color, enabled_modules, enabled_permissions, base_monthly_price, annual_price, setup_fee, is_system_default, sort_order)
VALUES
    (
        'PLAN_WHATSAPP_ONLY',
        'Catálogo de Venda Somente por WhatsApp',
        'Ideal para negócios que vendem exclusivamente pelo link do catálogo online e recebem pedidos no WhatsApp, sem necessidade de PDV presencial ou compras complexas.',
        'emerald',
        ARRAY['MOD_CATALOG_WA', 'MOD_CUSTOMERS'],
        ARRAY['products.read', 'products.create', 'products.update', 'products.delete', 'categories.manage', 'orders.read', 'orders.manage', 'catalog.whatsapp', 'customers.read', 'customers.create', 'customers.update'],
        59.90,
        599.00,
        0.00,
        false,
        1
    ),
    (
        'PLAN_INVENTORY_CONTROL',
        'Controle de Estoque, Validades & Compras',
        'Focado em operação de almoxarifado, restaurantes e controle rigoroso de saldos, lotes/validades FEFO, fornecedores e ordens de compra (sem PDV e sem Relatórios BI).',
        'amber',
        ARRAY['MOD_CATALOG_WA', 'MOD_INVENTORY', 'MOD_EXPIRATION', 'MOD_PURCHASING', 'MOD_SUPPLIERS'],
        ARRAY['products.read', 'products.create', 'products.update', 'categories.manage', 'inventory.read', 'inventory.adjust', 'inventory.receive', 'inventory.writeoff', 'inventory.expiration', 'inventory.batches', 'purchasing.read', 'purchasing.create', 'purchasing.receive', 'purchase_orders.read', 'purchase_orders.create', 'purchase_orders.receive', 'suppliers.read', 'suppliers.create', 'suppliers.update'],
        119.90,
        1199.00,
        150.00,
        false,
        2
    ),
    (
        'PLAN_POS_AND_STOCK',
        'Comercial PDV + Estoque + Catálogo WhatsApp',
        'Operação completa de frente de caixa presencial (PDV), vendas por WhatsApp, clientes e controle de estoque/validades (sem módulo de Compras e sem Relatórios BI).',
        'blue',
        ARRAY['MOD_CATALOG_WA', 'MOD_POS_SALES', 'MOD_INVENTORY', 'MOD_EXPIRATION', 'MOD_CUSTOMERS'],
        ARRAY['products.read', 'products.create', 'products.update', 'categories.manage', 'orders.read', 'orders.manage', 'catalog.whatsapp', 'sales.pos', 'sales.read', 'sales.create', 'sales.update', 'inventory.read', 'inventory.adjust', 'inventory.receive', 'inventory.writeoff', 'inventory.expiration', 'inventory.batches', 'customers.read', 'customers.create', 'customers.update'],
        149.90,
        1499.00,
        150.00,
        false,
        3
    ),
    (
        'PLAN_PRO_MANAGEMENT',
        'Gestão Completa Pro (PDV + Estoque + Compras + Relatórios)',
        'Inclui todas as ferramentas operacionais da loja, gestão de compras, controle de equipe/auditoria e relatórios gerenciais completos.',
        'indigo',
        ARRAY['MOD_CATALOG_WA', 'MOD_POS_SALES', 'MOD_INVENTORY', 'MOD_EXPIRATION', 'MOD_PURCHASING', 'MOD_SUPPLIERS', 'MOD_CUSTOMERS', 'MOD_REPORTS', 'MOD_TEAM_AUDIT'],
        ARRAY['products.*', 'categories.manage', 'orders.*', 'catalog.whatsapp', 'sales.*', 'inventory.*', 'purchasing.*', 'purchase_orders.*', 'suppliers.*', 'customers.*', 'reports.*', 'users.manage', 'stores.manage', 'audit.view'],
        199.90,
        1999.00,
        250.00,
        true,
        4
    ),
    (
        'PLAN_ENTERPRISE_FULL',
        'Enterprise Full + Integrações API Externa',
        'Acesso total irrestrito a todos os módulos da plataforma, incluindo o Integrador de APIs Externas (ERP/CRM) e Tokens HBAC.',
        'violet',
        ARRAY['MOD_CATALOG_WA', 'MOD_POS_SALES', 'MOD_INVENTORY', 'MOD_EXPIRATION', 'MOD_PURCHASING', 'MOD_SUPPLIERS', 'MOD_CUSTOMERS', 'MOD_REPORTS', 'MOD_TEAM_AUDIT', 'MOD_API_INTEGRATIONS'],
        ARRAY['*'],
        269.90,
        2699.00,
        350.00,
        false,
        5
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    badge_color = EXCLUDED.badge_color,
    enabled_modules = EXCLUDED.enabled_modules,
    enabled_permissions = EXCLUDED.enabled_permissions,
    base_monthly_price = EXCLUDED.base_monthly_price,
    annual_price = EXCLUDED.annual_price,
    setup_fee = EXCLUDED.setup_fee,
    sort_order = EXCLUDED.sort_order;

NOTIFY pgrst, 'reload schema';
