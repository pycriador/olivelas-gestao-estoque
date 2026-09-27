-- ========================================================================
-- SPRINT 07: BAIXA DE ESTOQUE COM RASTREABILIDADE
-- Centro de custo de perda, motivo especifico, lote/validade,
-- identificacao do operador e do aprovador
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. Centros de custo (perda operacional) por loja
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'OPERATIONAL_LOSS' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_cost_center_store_code UNIQUE(store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_store
  ON public.cost_centers(store_id, is_active);

-- Centros de custo padrao, criados para cada loja
CREATE OR REPLACE FUNCTION public.seed_default_cost_centers(p_store_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cost_centers (store_id, code, name, category)
  VALUES
    (p_store_id, 'PERDA-OP', 'Perda Operacional', 'OPERATIONAL_LOSS'),
    (p_store_id, 'VENC-OP',  'Descarte por Vencimento', 'EXPIRATION'),
    (p_store_id, 'AVARIA-OP','Avaria e Quebra', 'DAMAGE'),
    (p_store_id, 'INVENT-OP','Ajuste de Inventario', 'INVENTORY'),
    (p_store_id, 'DEVOL-OP', 'Devolucao a Fornecedor', 'SUPPLIER_RETURN')
  ON CONFLICT (store_id, code) DO NOTHING;
END;
$$;

-- Popula lojas existentes
DO $$
DECLARE
  s UUID;
BEGIN
  FOR s IN SELECT id FROM public.stores LOOP
    PERFORM public.seed_default_cost_centers(s);
  END LOOP;
END;
$$;

-- Novas lojas recebem os centros de custo padrao automaticamente.
-- EXECUTE FUNCTION nao aceita argumentos, entao a trigger chama um wrapper
-- que repassa NEW.id para a funcao que faz o trabalho.
CREATE OR REPLACE FUNCTION public.trg_seed_cost_centers_for_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.seed_default_cost_centers(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_cost_centers ON public.stores;
-- AFTER INSERT, nao BEFORE: o trigger escreve em cost_centers, que tem FK
-- para stores(id). Em BEFORE INSERT a linha de stores ainda nao passou pela
-- verificacao de FK e o insert do trigger falha com violacao de FK.
CREATE TRIGGER trg_seed_cost_centers
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_cost_centers_for_store();

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cost centers select: tenant" ON public.cost_centers;
CREATE POLICY "Cost centers select: tenant"
  ON public.cost_centers FOR SELECT
  USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Cost centers insert: tenant admin" ON public.cost_centers;
CREATE POLICY "Cost centers insert: tenant admin"
  ON public.cost_centers FOR INSERT
  WITH CHECK (
    public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[])
  );

DROP POLICY IF EXISTS "Cost centers update: tenant admin" ON public.cost_centers;
CREATE POLICY "Cost centers update: tenant admin"
  ON public.cost_centers FOR UPDATE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]))
  WITH CHECK (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]));

DROP POLICY IF EXISTS "Cost centers delete: tenant admin" ON public.cost_centers;
CREATE POLICY "Cost centers delete: tenant admin"
  ON public.cost_centers FOR DELETE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 2. Matricula do colaborador (por loja)
-- ------------------------------------------------------------------------
ALTER TABLE public.store_users
  ADD COLUMN IF NOT EXISTS employee_registration TEXT;

-- ------------------------------------------------------------------------
-- 3. Rastreabilidade da movimentacao
-- ------------------------------------------------------------------------
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS reason_detail TEXT,
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_center_code TEXT,
  ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operator_registration TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_registration TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reason
  ON public.stock_movements(store_id, reason_code);

CREATE INDEX IF NOT EXISTS idx_stock_movements_approved
  ON public.stock_movements(approved_by);

CREATE INDEX IF NOT EXISTS idx_stock_movements_approved_at
  ON public.stock_movements(approved_at DESC);

-- Motivos de perda padrao (referencia para o front)
COMMENT ON COLUMN public.stock_movements.reason_code IS
  'Motivo especifico da saida: VENCIMENTO, QUEBRA, AVARIA, INVENTARIO, DEVOLUCAO_CLIENTE, ROUBADO, EVAPORACAO, OUTROS';

COMMENT ON COLUMN public.stock_movements.cost_center_code IS
  'Snapshot do codigo do centro de custo no momento do lancamento';

-- ------------------------------------------------------------------------
-- 4. Catalogo de motivos de perda
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loss_reasons (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  default_cost_center_code TEXT,
  requires_approval BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INT DEFAULT 0 NOT NULL
);

INSERT INTO public.loss_reasons (code, label, default_cost_center_code, sort_order)
VALUES
  ('VENCIMENTO',          'Vencimento / Produto imprestavel',    'VENC-OP',   10),
  ('QUEBRA',              'Quebra durante manuseio',              'AVARIA-OP', 20),
  ('AVARIA',              'Avaria / Embalagem violada',           'AVARIA-OP', 30),
  ('INVENTARIO',          'Ajuste de inventario',                 'INVENT-OP', 40),
  ('DEVOLUCAO_CLIENTE',   'Devolucao de cliente',                 'DEVOL-OP',  50),
  ('DEVOLUCAO_FORNECEDOR','Devolucao a fornecedor',               'DEVOL-OP',  60),
  ('ROUBADO',             'Perda por roubo / extravio',           'PERDA-OP',  70),
  ('EVAPORACAO',          'Evaporacao / perda natural',           'PERDA-OP',  80),
  ('CONTAGEM',            'Divergencia de contagem fisica',       'INVENT-OP', 90),
  ('OUTROS',              'Outro motivo',                         'PERDA-OP', 999)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    default_cost_center_code = EXCLUDED.default_cost_center_code,
    sort_order = EXCLUDED.sort_order;

ALTER TABLE public.loss_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Loss reasons select: authenticated" ON public.loss_reasons;
CREATE POLICY "Loss reasons select: authenticated"
  ON public.loss_reasons FOR SELECT
  USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------
-- 5. Movimentacao atomica com lote, centro de custo e aprovacao
--    Substitui o fluxo client-side nao-transacional de createManualMovement
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_stock_movement(
  p_product_id UUID,
  p_movement_type stock_movement_type_enum,
  p_quantity NUMERIC,
  p_batch_id UUID DEFAULT NULL,
  p_lot_number TEXT DEFAULT NULL,
  p_expiration_date DATE DEFAULT NULL,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_reason_code TEXT DEFAULT NULL,
  p_reason_detail TEXT DEFAULT NULL,
  p_cost_center_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_approved_by UUID DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_balance_id UUID;
  v_current NUMERIC;
  v_new NUMERIC;
  v_delta NUMERIC;
  v_movement_id UUID;
  v_batch_id UUID;
  v_batch_qty NUMERIC;
  v_operator UUID := auth.uid();
  v_operator_reg TEXT;
  v_approver_reg TEXT;
  v_cost_center_code TEXT;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  -- Loja a partir do produto
  SELECT store_id INTO v_store_id
  FROM public.products
  WHERE id = p_product_id AND deleted_at IS NULL;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Produto nao encontrado.';
  END IF;

  IF NOT public.has_store_role(
    v_store_id,
    ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]
  ) THEN
    RAISE EXCEPTION 'Sem permissao para movimentar estoque nesta loja.';
  END IF;

  -- Segregacao de funcoes: aprovador nao pode ser o proprio operador
  IF p_approved_by IS NOT NULL AND p_approved_by = v_operator THEN
    RAISE EXCEPTION 'O aprovador deve ser diferente do operador.';
  END IF;

  -- Sinal conforme o tipo de movimento
  IF p_movement_type IN ('EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION', 'SALE') THEN
    v_delta := -p_quantity;
  ELSIF p_movement_type = 'ADJUSTMENT' THEN
    -- p_quantity e a quantidade alvo
    SELECT quantity INTO v_current
    FROM public.stock_balances
    WHERE store_id = v_store_id AND product_id = p_product_id
    FOR UPDATE;

    v_current := COALESCE(v_current, 0);
    v_delta := p_quantity - v_current;
  ELSE
    v_delta := p_quantity;
  END IF;

  IF v_delta = 0 THEN
    RAISE EXCEPTION 'A quantidade informada nao altera o saldo atual.';
  END IF;

  -- Trava e atualiza o saldo
  INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
  VALUES (v_store_id, p_product_id, 0, 0)
  ON CONFLICT (store_id, product_id) DO NOTHING;

  SELECT id, quantity INTO v_balance_id, v_current
  FROM public.stock_balances
  WHERE store_id = v_store_id AND product_id = p_product_id
  FOR UPDATE;

  v_new := v_current + v_delta;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente: disponivel %, solicitado %.',
      v_current, ABS(v_delta);
  END IF;

  UPDATE public.stock_balances
  SET quantity = v_new, updated_at = NOW()
  WHERE id = v_balance_id;

  -- Lote: usa o informado, cria/mescla por lote+validade, ou ignora
  v_batch_id := p_batch_id;

  IF v_batch_id IS NULL AND p_lot_number IS NOT NULL AND TRIM(p_lot_number) <> '' THEN
    SELECT id INTO v_batch_id
    FROM public.stock_batches
    WHERE store_id = v_store_id
      AND product_id = p_product_id
      AND lot_number = TRIM(p_lot_number)
      AND COALESCE(expiration_date = p_expiration_date, expiration_date IS NULL)
    LIMIT 1;

    IF v_batch_id IS NULL THEN
      INSERT INTO public.stock_batches (
        store_id, product_id, lot_number, quantity, cost_price, expiration_date, status
      )
      VALUES (
        v_store_id, p_product_id, TRIM(p_lot_number), 0, p_unit_cost,
        p_expiration_date,
        CASE
          WHEN p_expiration_date IS NOT NULL AND p_expiration_date < CURRENT_DATE THEN 'EXPIRED'
          ELSE 'ACTIVE'
        END
      )
      RETURNING id INTO v_batch_id;
    END IF;
  END IF;

  -- Movimenta o lote
  IF v_batch_id IS NOT NULL THEN
    SELECT quantity INTO v_batch_qty
    FROM public.stock_batches
    WHERE id = v_batch_id AND store_id = v_store_id
    FOR UPDATE;

    v_batch_qty := COALESCE(v_batch_qty, 0);

    UPDATE public.stock_batches
    SET
      quantity = GREATEST(v_batch_qty + v_delta, 0),
      status = CASE
        WHEN GREATEST(v_batch_qty + v_delta, 0) <= 0 THEN 'DEPLETED'::batch_status_enum
        WHEN expiration_date IS NOT NULL AND expiration_date < CURRENT_DATE THEN 'EXPIRED'::batch_status_enum
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = v_batch_id;
  END IF;

  -- Matricula do operador e do aprovador
  SELECT employee_registration INTO v_operator_reg
  FROM public.store_users
  WHERE store_id = v_store_id AND user_id = v_operator
  LIMIT 1;

  IF p_approved_by IS NOT NULL THEN
    SELECT employee_registration INTO v_approver_reg
    FROM public.store_users
    WHERE store_id = v_store_id AND user_id = p_approved_by
    LIMIT 1;
  END IF;

  -- Snapshot do centro de custo
  IF p_cost_center_id IS NOT NULL THEN
    SELECT code INTO v_cost_center_code
    FROM public.cost_centers
    WHERE id = p_cost_center_id AND store_id = v_store_id;
  END IF;

  INSERT INTO public.stock_movements (
    store_id, product_id, batch_id, movement_type, quantity,
    previous_quantity, new_quantity, unit_cost, reference_id, reference_type,
    notes, user_id, reason_code, reason_detail, cost_center_id, cost_center_code,
    operator_id, operator_registration, approved_by, approved_by_registration, approved_at
  )
  VALUES (
    v_store_id, p_product_id, v_batch_id, p_movement_type, p_quantity,
    v_current, v_new, p_unit_cost, p_reference_id, p_reference_type,
    p_notes, v_operator, p_reason_code, p_reason_detail, p_cost_center_id, v_cost_center_code,
    v_operator, v_operator_reg, p_approved_by, v_approver_reg,
    CASE WHEN p_approved_by IS NOT NULL THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stock_movement(
  UUID, stock_movement_type_enum, NUMERIC, UUID, TEXT, DATE, NUMERIC,
  TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT
) TO authenticated;
