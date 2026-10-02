-- Migration: 20261002000017_api_tokens.sql
-- Tabela e políticas RLS para armazenamento seguro de Chaves de API e Escopos HBAC

CREATE TABLE IF NOT EXISTS public.api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(50) NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL DEFAULT 'Acesso Global',
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

-- Índices de performance e consulta rápida
CREATE INDEX IF NOT EXISTS idx_api_tokens_store_id ON public.api_tokens(store_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON public.api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_is_active ON public.api_tokens(is_active);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (RLS):
-- 1. Administrador Global tem controle total (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "global_admins_all_api_tokens" ON public.api_tokens
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_global_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_global_admin = true
        )
    );

-- 2. Administrador da Loja pode gerenciar tokens restritos à sua filial
CREATE POLICY "store_admins_manage_store_api_tokens" ON public.api_tokens
    FOR ALL
    TO authenticated
    USING (
        store_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.store_users su
            WHERE su.user_id = auth.uid()
              AND su.store_id = api_tokens.store_id
              AND su.role = 'STORE_ADMIN'::public.user_role_enum
        )
    )
    WITH CHECK (
        store_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.store_users su
            WHERE su.user_id = auth.uid()
              AND su.store_id = api_tokens.store_id
              AND su.role = 'STORE_ADMIN'::public.user_role_enum
        )
    );

-- 3. Validação de token ativo por chave
CREATE POLICY "anon_read_active_tokens" ON public.api_tokens
    FOR SELECT
    TO anon
    USING (
        is_active = true AND (expires_at IS NULL OR expires_at > now())
    );

-- Permissões de schema
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT SELECT ON public.api_tokens TO anon;
