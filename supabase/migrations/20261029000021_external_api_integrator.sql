-- =============================================================================
-- Migration: 20261029000021_external_api_integrator.sql
-- Descrição:
--   1. Cria a tabela `public.api_integrations` para armazenar conectores HTTP
--      estilo Postman (URL, Método, Auth, Headers, Query Params, Body JSON,
--      caminho raiz da resposta e mapeamento De-Para com serviços internos:
--      customers, categories, products, suppliers, inventory).
--   2. Cria a tabela `public.api_integration_logs` para histórico e auditoria
--      detalhada de todas as execuções e sincronizações.
--   3. Configura políticas RLS restritas a `GLOBAL_ADMIN` e `STORE_ADMIN`
--      da loja correspondente.
--   4. Revoga todos os privilégios do papel `anon` sobre ambas as tabelas para
--      proteger credenciais e tokens de APIs de terceiros.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_service VARCHAR(50) NOT NULL CHECK (
        target_service IN ('customers', 'categories', 'products', 'suppliers', 'inventory')
    ),
    method VARCHAR(16) NOT NULL DEFAULT 'GET' CHECK (
        method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
    ),
    url TEXT NOT NULL,
    auth_type VARCHAR(32) NOT NULL DEFAULT 'NONE' CHECK (
        auth_type IN ('NONE', 'BEARER', 'API_KEY', 'BASIC', 'CUSTOM_HEADER')
    ),
    auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    query_params JSONB NOT NULL DEFAULT '[]'::jsonb,
    headers JSONB NOT NULL DEFAULT '[]'::jsonb,
    body_type VARCHAR(32) NOT NULL DEFAULT 'none' CHECK (
        body_type IN ('none', 'json', 'form-urlencoded', 'raw')
    ),
    body_content TEXT DEFAULT '',
    response_root_path VARCHAR(255) NOT NULL DEFAULT '$',
    upsert_key VARCHAR(100) NOT NULL DEFAULT 'name',
    field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    last_run_status VARCHAR(32) CHECK (
        last_run_status IS NULL OR last_run_status IN ('SUCCESS', 'PARTIAL', 'ERROR')
    ),
    last_run_summary JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_integrations_store_id ON public.api_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_api_integrations_target_service ON public.api_integrations(target_service);
CREATE INDEX IF NOT EXISTS idx_api_integrations_is_active ON public.api_integrations(is_active);

CREATE TABLE IF NOT EXISTS public.api_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES public.api_integrations(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    integration_name VARCHAR(255) NOT NULL,
    target_service VARCHAR(50) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'ERROR')),
    http_status INTEGER,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    records_fetched INTEGER NOT NULL DEFAULT 0,
    records_created INTEGER NOT NULL DEFAULT 0,
    records_updated INTEGER NOT NULL DEFAULT 0,
    records_failed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    executed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_integration_logs_integration_id ON public.api_integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_api_integration_logs_store_id ON public.api_integration_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_api_integration_logs_created_at ON public.api_integration_logs(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.touch_api_integrations_updated_at()
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

DROP TRIGGER IF EXISTS trg_touch_api_integrations_updated_at ON public.api_integrations;
CREATE TRIGGER trg_touch_api_integrations_updated_at
    BEFORE UPDATE ON public.api_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_api_integrations_updated_at();

-- Habilitar RLS
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_integration_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para api_integrations
DROP POLICY IF EXISTS "global_admins_all_api_integrations" ON public.api_integrations;
CREATE POLICY "global_admins_all_api_integrations" ON public.api_integrations
    FOR ALL
    TO authenticated
    USING (public.is_global_admin())
    WITH CHECK (public.is_global_admin());

DROP POLICY IF EXISTS "store_admins_manage_store_api_integrations" ON public.api_integrations;
CREATE POLICY "store_admins_manage_store_api_integrations" ON public.api_integrations
    FOR ALL
    TO authenticated
    USING (
        store_id IS NOT NULL AND
        public.has_store_role(store_id, ARRAY['STORE_ADMIN'::public.user_role_enum])
    )
    WITH CHECK (
        store_id IS NOT NULL AND
        public.has_store_role(store_id, ARRAY['STORE_ADMIN'::public.user_role_enum])
    );

-- Políticas para api_integration_logs
DROP POLICY IF EXISTS "global_admins_all_api_integration_logs" ON public.api_integration_logs;
CREATE POLICY "global_admins_all_api_integration_logs" ON public.api_integration_logs
    FOR ALL
    TO authenticated
    USING (public.is_global_admin())
    WITH CHECK (public.is_global_admin());

DROP POLICY IF EXISTS "store_admins_manage_store_api_integration_logs" ON public.api_integration_logs;
CREATE POLICY "store_admins_manage_store_api_integration_logs" ON public.api_integration_logs
    FOR ALL
    TO authenticated
    USING (
        store_id IS NOT NULL AND
        public.has_store_role(store_id, ARRAY['STORE_ADMIN'::public.user_role_enum])
    )
    WITH CHECK (
        store_id IS NOT NULL AND
        public.has_store_role(store_id, ARRAY['STORE_ADMIN'::public.user_role_enum])
    );

-- Segurança: Conceder a authenticated e bloquear totalmente anon (proteção de credenciais externas)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_integration_logs TO authenticated;

REVOKE ALL ON TABLE public.api_integrations FROM anon;
REVOKE ALL ON TABLE public.api_integration_logs FROM anon;

NOTIFY pgrst, 'reload schema';
