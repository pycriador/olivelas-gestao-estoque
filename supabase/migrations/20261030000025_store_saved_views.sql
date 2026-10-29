-- ============================================================================
-- Migration 25: Visões de Filtros Salvas por Loja / Filial (store_saved_views)
-- ============================================================================
-- Permite salvar visões personalizadas de filtros (status em múltipla seleção,
-- status de pedidos abertos/fechados/cancelados, períodos de datas, busca, etc.)
-- individualmente por loja ou filial (`store_id`) para as telas de Clientes,
-- Pedidos e Relatórios.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  page_key text NOT NULL CHECK (page_key IN ('customers', 'orders', 'reports')),
  name text NOT NULL,
  description text,
  color text DEFAULT 'primary',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_system_preset boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, page_key, name)
);

CREATE INDEX IF NOT EXISTS idx_store_saved_views_store_page
  ON public.store_saved_views (store_id, page_key);

ALTER TABLE public.store_saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_saved_views_select_policy" ON public.store_saved_views;
CREATE POLICY "store_saved_views_select_policy"
  ON public.store_saved_views
  FOR SELECT
  TO authenticated
  USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "store_saved_views_insert_policy" ON public.store_saved_views;
CREATE POLICY "store_saved_views_insert_policy"
  ON public.store_saved_views
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_store_access(store_id));

DROP POLICY IF EXISTS "store_saved_views_update_policy" ON public.store_saved_views;
CREATE POLICY "store_saved_views_update_policy"
  ON public.store_saved_views
  FOR UPDATE
  TO authenticated
  USING (public.has_store_access(store_id))
  WITH CHECK (public.has_store_access(store_id));

DROP POLICY IF EXISTS "store_saved_views_delete_policy" ON public.store_saved_views;
CREATE POLICY "store_saved_views_delete_policy"
  ON public.store_saved_views
  FOR DELETE
  TO authenticated
  USING (public.has_store_access(store_id));

-- Seed de visões padrão por loja e filial para acompanhamento rápido de
-- pedidos abertos, fechados (concluídos/entregues) e cancelados em /customers
INSERT INTO public.store_saved_views (
  store_id,
  page_key,
  name,
  description,
  color,
  filters,
  is_default,
  is_system_preset
)
SELECT
  s.id,
  'customers',
  v.name,
  v.description,
  v.color,
  v.filters::jsonb,
  v.is_default,
  true
FROM public.stores s
CROSS JOIN (
  VALUES
    (
      'Pedidos em Aberto',
      'Clientes com pedidos pendentes, confirmados, em separação, prontos ou enviados',
      'amber',
      '{"customerStatuses":["ACTIVE"],"orderStatuses":["PENDING","CONFIRMED","PROCESSING","READY","SHIPPED"],"period":"ALL","onlyWithOrders":true}',
      false
    ),
    (
      'Pedidos Fechados (Entregues)',
      'Clientes com pedidos finalizados e entregues com sucesso',
      'emerald',
      '{"customerStatuses":["ACTIVE"],"orderStatuses":["DELIVERED"],"period":"ALL","onlyWithOrders":true}',
      false
    ),
    (
      'Pedidos Cancelados',
      'Clientes que possuem pedidos cancelados para auditoria e retenção',
      'rose',
      '{"customerStatuses":["ACTIVE","INACTIVE"],"orderStatuses":["CANCELLED"],"period":"ALL","onlyWithOrders":true}',
      false
    ),
    (
      'Todos os Clientes Ativos',
      'Visão geral de clientes ativos da unidade com todos os status de pedido',
      'indigo',
      '{"customerStatuses":["ACTIVE"],"orderStatuses":[],"period":"ALL","onlyWithOrders":false}',
      true
    )
) AS v(name, description, color, filters, is_default)
WHERE s.deleted_at IS NULL
ON CONFLICT (store_id, page_key, name) DO NOTHING;
