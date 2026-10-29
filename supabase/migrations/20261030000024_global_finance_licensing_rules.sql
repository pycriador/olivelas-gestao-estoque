-- ============================================================================
-- Migration 24: Regras Financeiras Globais & Licenciamento de Funcionários por Loja
-- ============================================================================
-- 1. Tabela `public.platform_billing_rules` para configurar a cota padrão de
--    funcionários gratuitos por loja (padrão: 10 funcionários grátis) e o valor
--    cobrado por cada licença adicional de funcionário ativo.
-- 2. Colunas opcionais em `public.stores` (`free_employees_limit` e
--    `extra_employee_price`) para permitir exceções comerciais por loja/filial.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_billing_rules (
  id text PRIMARY KEY DEFAULT 'default',
  default_free_employees_per_store integer NOT NULL DEFAULT 10 CHECK (default_free_employees_per_store >= 0),
  default_extra_employee_price numeric(10, 2) NOT NULL DEFAULT 19.90 CHECK (default_extra_employee_price >= 0),
  count_store_admins_in_quota boolean NOT NULL DEFAULT false,
  grace_period_days integer NOT NULL DEFAULT 5 CHECK (grace_period_days >= 0),
  auto_block_overdue boolean NOT NULL DEFAULT true,
  pix_key text,
  billing_support_whatsapp text,
  notes text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_billing_rules (
  id,
  default_free_employees_per_store,
  default_extra_employee_price,
  count_store_admins_in_quota,
  grace_period_days,
  auto_block_overdue,
  notes
)
VALUES (
  'default',
  10,
  19.90,
  false,
  5,
  true,
  'Cada loja possui direito a 10 funcionários gratuitos. Licenças adicionais de funcionários ativos são cobradas mensalmente na fatura do Store Admin.'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS free_employees_limit integer CHECK (free_employees_limit IS NULL OR free_employees_limit >= 0),
  ADD COLUMN IF NOT EXISTS extra_employee_price numeric(10, 2) CHECK (extra_employee_price IS NULL OR extra_employee_price >= 0);

ALTER TABLE public.platform_billing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_billing_rules_select_authenticated" ON public.platform_billing_rules;
CREATE POLICY "platform_billing_rules_select_authenticated"
  ON public.platform_billing_rules
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "platform_billing_rules_manage_global_admin" ON public.platform_billing_rules;
CREATE POLICY "platform_billing_rules_manage_global_admin"
  ON public.platform_billing_rules
  FOR ALL
  TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());
