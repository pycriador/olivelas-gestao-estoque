-- =============================================================================
-- MIGRATION: 20260926000007_expiration_dispositions.sql
-- Justificativa de status para alertas de validade/lote na tela /expiration.
-- Um lote pode receber uma disposicao ("Acao") com nota opcional, e cada
-- mudanca gera uma entrada em audit_logs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enumeracao de acoes possiveis para um alerta de validade
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expiration_action_enum') THEN
    CREATE TYPE public.expiration_action_enum AS ENUM (
      'PURCHASED',      -- Reposto: novo lote foi comprado
      'RETURNED',       -- Devolvido ao fornecedor
      'WRITTEN_OFF',    -- Baixado do estoque
      'DISCARDED',      -- Descartado (queima/perda)
      'KEPT',           -- Mantido em estoque, sem acao
      'ON_HOLD'         -- Bloqueado para inspecao
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Tabela de disposicoes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_dispositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.stock_batches(id) ON DELETE CASCADE,
  action public.expiration_action_enum NOT NULL,
  note TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_dispositions_store
  ON public.batch_dispositions(store_id);
CREATE INDEX IF NOT EXISTS idx_batch_dispositions_batch
  ON public.batch_dispositions(batch_id, created_at DESC);

COMMENT ON TABLE public.batch_dispositions IS
  'Historico de justificativas aplicadas aos alertas de validade/lote.';

-- -----------------------------------------------------------------------------
-- 3. Trigger de updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_batch_disposition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_batch_disposition_updated_at ON public.batch_dispositions;
CREATE TRIGGER trg_batch_disposition_updated_at
  BEFORE UPDATE ON public.batch_dispositions
  FOR EACH ROW EXECUTE FUNCTION public.touch_batch_disposition_updated_at();

-- -----------------------------------------------------------------------------
-- 4. RPC: registra a disposicao e audita na mesma transacao
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_batch_disposition(
  p_batch_id UUID,
  p_action TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_store_id UUID;
  v_batch_product UUID;
  v_batch_lot TEXT;
  v_user_id UUID;
  v_disposition_id UUID;
  v_action public.expiration_action_enum;
BEGIN
  -- Valida a acao contra a enumeracao (erro claro em vez de cast generico).
  BEGIN
    v_action := p_action::public.expiration_action_enum;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Acao de validade invalida: %', p_action;
  END;

  SELECT sb.store_id, sb.product_id, sb.lot_number
    INTO v_store_id, v_batch_product, v_batch_lot
  FROM public.stock_batches sb
  WHERE sb.id = p_batch_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Lote nao encontrado: %', p_batch_id;
  END;

  -- Chamar usuario explicitamente evita confundir o escopo com o da secao.
  v_user_id := auth.uid();

  INSERT INTO public.batch_dispositions (store_id, batch_id, action, note, user_id)
  VALUES (v_store_id, p_batch_id, v_action, NULLIF(TRIM(p_note), ''), v_user_id)
  RETURNING id INTO v_disposition_id;

  INSERT INTO public.audit_logs (
    store_id, user_id, action, entity, entity_id, after_data
  ) VALUES (
    v_store_id,
    v_user_id,
    'EXPIRATION_DISPOSITION_SET',
    'stock_batch',
    p_batch_id::TEXT,
    jsonb_build_object(
      'action', v_action::TEXT,
      'note', NULLIF(TRIM(p_note), ''),
      'product_id', v_batch_product,
      'lot_number', v_batch_lot,
      'disposition_id', v_disposition_id
    )
  );

  RETURN v_disposition_id;
END;
$$;

COMMENT ON FUNCTION public.set_batch_disposition(UUID, TEXT, TEXT) IS
  'Registra a justificativa de um alerta de validade e audita na mesma transacao.';

-- -----------------------------------------------------------------------------
-- 5. View: disposicao mais recente por lote
-- security_invoker mantem o RLS de batch_dispositions valendo na view; sem
-- isso a view leria com as permissoes do dono e furaria o tenant.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.latest_batch_dispositions
WITH (security_invoker = true) AS
SELECT DISTINCT ON (d.batch_id)
  d.id,
  d.store_id,
  d.batch_id,
  d.action,
  d.note,
  d.user_id,
  d.created_at
FROM public.batch_dispositions d
ORDER BY d.batch_id, d.created_at DESC;

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.batch_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Batch dispositions select: tenant only" ON public.batch_dispositions;
CREATE POLICY "Batch dispositions select: tenant only"
  ON public.batch_dispositions FOR SELECT
  USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Batch dispositions modify: tenant inventory or admin"
  ON public.batch_dispositions;
CREATE POLICY "Batch dispositions modify: tenant inventory or admin"
  ON public.batch_dispositions FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]))
  WITH CHECK (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));
