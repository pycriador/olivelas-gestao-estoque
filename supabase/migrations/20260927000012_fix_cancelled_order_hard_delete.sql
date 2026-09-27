-- A cancelled order has already restored its stock in restore_sale_stock.
-- Deleting it must not reverse the original sale a second time.
CREATE OR REPLACE FUNCTION public.restore_stock_after_delete(
  p_store_id UUID,
  p_reference_type TEXT,
  p_reference_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group RECORD;
BEGIN
  IF UPPER(p_reference_type) = 'ORDER' AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id::TEXT = p_reference_id
      AND o.store_id = p_store_id
      AND o.status = 'CANCELLED'
  ) THEN
    RETURN TRUE;
  END IF;

  FOR v_group IN
    SELECT m.product_id,
           (ARRAY_AGG(m.previous_quantity ORDER BY m.created_at, m.id))[1] AS restore_to,
           (ARRAY_AGG(m.new_quantity ORDER BY m.created_at DESC, m.id DESC))[1] AS expected_current,
           COUNT(*) AS movements
    FROM public.stock_movements m
    WHERE m.store_id = p_store_id
      AND UPPER(m.reference_type) = UPPER(p_reference_type)
      AND m.reference_id = p_reference_id
      AND m.previous_quantity IS NOT NULL
      AND m.new_quantity IS NOT NULL
    GROUP BY m.product_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_balances sb
      WHERE sb.store_id = p_store_id AND sb.product_id = v_group.product_id
    ) THEN
      CONTINUE;
    END IF;

    IF v_group.expected_current IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.stock_balances sb
      WHERE sb.store_id = p_store_id
        AND sb.product_id = v_group.product_id
        AND sb.quantity = v_group.expected_current
    ) THEN
      RAISE EXCEPTION
        'Nao foi possivel remover: o saldo do produto mudou depois deste registro. Estoque % ja foi movimentado.',
        v_group.product_id;
    END IF;

    UPDATE public.stock_balances
    SET quantity = v_group.restore_to,
        updated_at = NOW()
    WHERE store_id = p_store_id
      AND product_id = v_group.product_id;

    UPDATE public.stock_batches sb
    SET quantity = sb.quantity + COALESCE((
          SELECT SUM(m.quantity) FROM public.stock_movements m
          WHERE m.store_id = p_store_id
            AND m.product_id = v_group.product_id
            AND UPPER(m.reference_type) = UPPER(p_reference_type)
            AND m.reference_id = p_reference_id
            AND m.movement_type IN ('SALE', 'EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION')
        ), 0),
        status = CASE
          WHEN sb.status = 'DEPLETED'::batch_status_enum
               AND sb.quantity + COALESCE((
                 SELECT SUM(m.quantity) FROM public.stock_movements m
                 WHERE m.store_id = p_store_id
                   AND m.product_id = v_group.product_id
                   AND UPPER(m.reference_type) = UPPER(p_reference_type)
                   AND m.reference_id = p_reference_id
                   AND m.movement_type IN ('SALE', 'EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION')
               ), 0) > 0
          THEN 'ACTIVE'::batch_status_enum
          ELSE sb.status
        END,
        updated_at = NOW()
    WHERE sb.store_id = p_store_id
      AND sb.product_id = v_group.product_id
      AND EXISTS (
        SELECT 1 FROM public.stock_movements m
        WHERE m.store_id = p_store_id
          AND m.product_id = v_group.product_id
          AND UPPER(m.reference_type) = UPPER(p_reference_type)
          AND m.reference_id = p_reference_id
          AND m.movement_type IN ('SALE', 'EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION')
          AND m.batch_id = sb.id
      );
  END LOOP;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_stock_after_delete(UUID, TEXT, TEXT) FROM PUBLIC, anon;