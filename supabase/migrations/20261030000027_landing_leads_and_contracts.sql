-- ============================================================================
-- MIGRATION 27: VINCULAÇÃO DE PLANOS NA LANDING PAGE, SOLICITAÇÕES DE PRÉ-CADASTRO
-- ("NOVOS CONTRATOS") E GERENCIADOR DE CONTRATOS (SUPABASE + GOOGLE DRIVE)
-- ============================================================================

-- 1. Adicionar flags de vinculação e destaque na Landing Page em permission_groups
ALTER TABLE public.permission_groups
  ADD COLUMN IF NOT EXISTS show_on_landing_page BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_highlighted_on_landing BOOLEAN NOT NULL DEFAULT FALSE;

-- Marcar o plano Enterprise como destacado por padrão na Landing Page
UPDATE public.permission_groups
SET is_highlighted_on_landing = TRUE
WHERE code = 'PLAN_FULL_ENTERPRISE';

-- Garantir leitura pública (anon e authenticated) dos planos ativos vinculados à Landing Page e dos módulos ativos
DROP POLICY IF EXISTS "permission_groups_public_landing_select" ON public.permission_groups;
CREATE POLICY "permission_groups_public_landing_select"
  ON public.permission_groups
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE AND show_on_landing_page = TRUE);

DROP POLICY IF EXISTS "permission_modules_public_landing_select" ON public.permission_modules;
CREATE POLICY "permission_modules_public_landing_select"
  ON public.permission_modules
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

-- 2. Tabela de solicitações comerciais / pré-cadastro da Landing Page ("Novos Contratos")
CREATE TABLE IF NOT EXISTS public.commercial_plan_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  company_name TEXT,
  plan_id UUID REFERENCES public.permission_groups(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL', 'YEARLY')),
  base_plan_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  included_modules TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  addon_modules TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  addons_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_employees INTEGER NOT NULL DEFAULT 10,
  extra_employees_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  setup_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'NEGOTIATING', 'CONTRACT_GENERATED', 'SIGNED', 'CONVERTED', 'ARCHIVED')),
  admin_notes TEXT,
  contract_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_plan_proposals_status ON public.commercial_plan_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_plan_proposals_email ON public.commercial_plan_proposals(LOWER(customer_email));

ALTER TABLE public.commercial_plan_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_plan_proposals_public_insert" ON public.commercial_plan_proposals;
CREATE POLICY "commercial_plan_proposals_public_insert"
  ON public.commercial_plan_proposals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "commercial_plan_proposals_global_admin_all" ON public.commercial_plan_proposals;
CREATE POLICY "commercial_plan_proposals_global_admin_all"
  ON public.commercial_plan_proposals
  FOR ALL
  TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());

-- 3. RPC pública para registrar proposta comercial a partir da Landing Page e retornar protocolo
CREATE OR REPLACE FUNCTION public.submit_commercial_proposal(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_company_name TEXT DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL,
  p_plan_code TEXT DEFAULT 'CUSTOM_PLAN',
  p_plan_name TEXT DEFAULT 'Plano Personalizado',
  p_billing_cycle TEXT DEFAULT 'MONTHLY',
  p_base_plan_price NUMERIC DEFAULT 0,
  p_included_modules TEXT[] DEFAULT '{}'::TEXT[],
  p_addon_modules TEXT[] DEFAULT '{}'::TEXT[],
  p_addons_price NUMERIC DEFAULT 0,
  p_estimated_employees INTEGER DEFAULT 10,
  p_extra_employees_price NUMERIC DEFAULT 0,
  p_total_monthly_price NUMERIC DEFAULT 0,
  p_setup_fee NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_protocol TEXT;
  v_cycle TEXT := CASE WHEN UPPER(COALESCE(p_billing_cycle, 'MONTHLY')) = 'ANNUAL' THEN 'ANNUAL' ELSE 'MONTHLY' END;
BEGIN
  IF TRIM(COALESCE(p_customer_name, '')) = '' THEN
    RAISE EXCEPTION 'O nome é obrigatório para registrar a proposta.';
  END IF;

  IF TRIM(COALESCE(p_customer_email, '')) = '' THEN
    RAISE EXCEPTION 'O e-mail é obrigatório para registrar a proposta.';
  END IF;

  IF TRIM(COALESCE(p_customer_phone, '')) = '' THEN
    RAISE EXCEPTION 'O celular / WhatsApp é obrigatório para registrar a proposta.';
  END IF;

  v_protocol := 'PROP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(v_id::TEXT, '-', '') FROM 1 FOR 6));

  INSERT INTO public.commercial_plan_proposals (
    id,
    protocol_code,
    customer_name,
    customer_email,
    customer_phone,
    company_name,
    plan_id,
    plan_code,
    plan_name,
    billing_cycle,
    base_plan_price,
    included_modules,
    addon_modules,
    addons_price,
    estimated_employees,
    extra_employees_price,
    total_monthly_price,
    setup_fee,
    notes,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_id,
    v_protocol,
    TRIM(p_customer_name),
    LOWER(TRIM(p_customer_email)),
    TRIM(p_customer_phone),
    NULLIF(TRIM(COALESCE(p_company_name, '')), ''),
    p_plan_id,
    COALESCE(NULLIF(TRIM(p_plan_code), ''), 'CUSTOM_PLAN'),
    COALESCE(NULLIF(TRIM(p_plan_name), ''), 'Plano Personalizado'),
    v_cycle,
    GREATEST(0, COALESCE(p_base_plan_price, 0)),
    COALESCE(p_included_modules, '{}'::TEXT[]),
    COALESCE(p_addon_modules, '{}'::TEXT[]),
    GREATEST(0, COALESCE(p_addons_price, 0)),
    GREATEST(1, COALESCE(p_estimated_employees, 10)),
    GREATEST(0, COALESCE(p_extra_employees_price, 0)),
    GREATEST(0, COALESCE(p_total_monthly_price, 0)),
    GREATEST(0, COALESCE(p_setup_fee, 0)),
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    'NEW',
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'protocolCode', v_protocol,
    'status', 'NEW',
    'createdAt', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_commercial_proposal(
  TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT[], TEXT[], NUMERIC, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT
) TO anon, authenticated;

-- 4. Tabela do Gerenciador de Contratos da Plataforma (platform_contracts)
CREATE TABLE IF NOT EXISTS public.platform_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.commercial_plan_proposals(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT_FOR_SIGNATURE', 'SIGNED', 'CANCELLED')),
  provider_name TEXT NOT NULL,
  provider_document TEXT,
  provider_email TEXT,
  provider_phone TEXT,
  customer_name TEXT NOT NULL,
  customer_document TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_company TEXT,
  customer_address TEXT,
  product_name TEXT NOT NULL,
  plan_code TEXT,
  included_modules TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  addon_modules TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL', 'YEARLY')),
  monthly_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  setup_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  free_employees_limit INTEGER NOT NULL DEFAULT 10,
  due_day INTEGER NOT NULL DEFAULT 10,
  duration_months INTEGER NOT NULL DEFAULT 12,
  jurisdiction_city TEXT DEFAULT 'São Paulo - SP',
  custom_terms TEXT NOT NULL,
  rendered_html TEXT,
  supabase_storage_bucket TEXT DEFAULT 'products',
  supabase_storage_path TEXT,
  supabase_public_url TEXT,
  google_drive_file_id TEXT,
  google_drive_web_link TEXT,
  google_drive_folder_id TEXT,
  google_drive_synced_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_contracts_status ON public.platform_contracts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_contracts_proposal ON public.platform_contracts(proposal_id);

ALTER TABLE public.platform_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_contracts_global_admin_all" ON public.platform_contracts;
CREATE POLICY "platform_contracts_global_admin_all"
  ON public.platform_contracts
  FOR ALL
  TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());
