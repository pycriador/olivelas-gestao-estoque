-- =============================================================================
-- MIGRATION: 20261015000018_fix_restore_stock_after_delete_cancelled_orders.sql
-- Restaura a salvaguarda de pedidos cancelados na exclusao definitiva (hard delete)
-- e protege contra reversoes duplicadas ou erros 400 por divergencia de saldo.
--
-- Contexto:
-- A migration 20260927000012_fix_cancelled_order_hard_delete.sql adicionou a
-- checagem de o.status = 'CANCELLED' em restore_stock_after_delete. Porém, a
-- migration 20260927000015_revoke_internal_helpers_from_authenticated.sql reescreveu
-- a funcao adicionando a guarda is_global_admin mas omitiu o bypass de pedidos
-- cancelados.
--
-- Pedidos cancelados já tiveram seu estoque estornado para a loja via
-- restore_sale_stock. Tentar reverter novamente em restore_stock_after_delete
-- gerava erro 400 (P0001: 'saldo do produto mudou depois deste registro')
-- ou estornava saldo em duplicidade caso o saldo nao tivesse mudado.
--
-- Esta migration:
-- 1. Restabelece o bypass para pedidos com status CANCELLED em restore_stock_after_delete.
-- 2. Atualiza global_admin_delete para evitar invocar o helper quando o pedido for CANCELLED.
-- 3. Mantem as protecoes de segurança (REVOKE de PUBLIC/anon/authenticated para o helper).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper interno com a guarda de Admin Global e o bypass para pedidos cancelados
-- -----------------------------------------------------------------------------
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
  v_chamador UUID := auth.uid();
BEGIN
  -- Guarda de segurança: apenas Admin Global pode invocar
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_chamador AND is_global_admin
  ) THEN
    RAISE EXCEPTION
      'restauracao de saldo restrita a global admin. Use a exclusao global '
      'ou chame create_order_with_stock / restore_sale_stock.';
  END IF;

  -- Se o pedido ja estiver cancelado, o estoque ja foi restaurado pelo restore_sale_stock.
  -- Nao deve reverter a venda uma segunda vez nem falhar se o saldo mudou depois.
  IF UPPER(p_reference_type) = 'ORDER' AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id::TEXT = p_reference_id
      AND o.store_id = p_store_id
      AND o.status = 'CANCELLED'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Um grupo por produto: da primeira a ultima movimentacao do registro.
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
      -- Sem linha de saldo nao ha o que reverter.
      CONTINUE;
    END IF;

    IF v_group.expected_current IS NULL THEN
      -- Movimentacao sem saldo registrado (log sem efeito no estoque).
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

    -- Um lote que a movimentacao esvaziou volta a ficar ativo.
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

REVOKE ALL ON FUNCTION public.restore_stock_after_delete(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Atualiza global_admin_delete para omitir chamada a restore_stock_after_delete
-- quando o pedido ja estiver cancelado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.global_admin_delete(
  p_entity TEXT,
  p_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row RECORD;
  v_store_id UUID;
  v_label TEXT;
  v_detail TEXT;
  v_before JSONB;
  v_count BIGINT;
BEGIN
  -- Guarda: apenas Admin Global
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Apenas o Admin Global pode excluir registros';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Registro nao informado';
  END IF;

  ------------------------------------------------------------------
  -- ORDERS (pedido)
  ------------------------------------------------------------------
  IF p_entity = 'orders' THEN
    SELECT row_to_json(o), o.store_id, o.order_number
      INTO v_before, v_store_id, v_label
    FROM public.orders o
    WHERE o.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Pedido nao encontrado';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.order_items WHERE order_id = p_id;

    -- Reverte o saldo ANTES do DELETE apenas se nao estiver cancelado
    -- (pedidos cancelados ja tiveram seu estoque revertido pelo restore_sale_stock).
    IF COALESCE(v_before->>'status', '') <> 'CANCELLED' THEN
      PERFORM public.restore_stock_after_delete(v_store_id, 'order', p_id::TEXT);
      v_detail := format('Pedido %s removido com %s item(ns); estoque revertido', v_label, v_count);
    ELSE
      v_detail := format('Pedido cancelado %s removido com %s item(ns) (estoque mantido)', v_label, v_count);
    END IF;

    DELETE FROM public.orders WHERE id = p_id;

  ------------------------------------------------------------------
  -- STOCK MOVEMENTS (movimentacao)
  ------------------------------------------------------------------
  ELSIF p_entity = 'stock_movements' THEN
    SELECT row_to_json(m), m.store_id,
           m.movement_type::TEXT || ' de ' || m.quantity
      INTO v_before, v_store_id, v_label
    FROM public.stock_movements m
    WHERE m.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Movimentacao nao encontrada';
    END IF;

    IF v_before ? 'reference_id' AND v_before ->> 'reference_id' IS NOT NULL
       AND v_before ->> 'reference_type' IS NOT NULL THEN
      PERFORM public.restore_stock_after_delete(
        v_store_id,
        v_before ->> 'reference_type',
        v_before ->> 'reference_id'
      );
    ELSIF v_before ->> 'previous_quantity' IS NOT NULL THEN
      RAISE EXCEPTION
        'Nao foi possivel remover: a movimentacao nao esta vinculada a um registro, entao nao da para reconstruir o saldo. Remova o pedido ou a compra que a originou.';
    END IF;

    DELETE FROM public.stock_movements WHERE id = p_id;

    v_detail := format('Movimentacao (%s) removida; saldo restaurado', v_label);

  ------------------------------------------------------------------
  -- PRODUCTS (produto)
  ------------------------------------------------------------------
  ELSIF p_entity = 'products' THEN
    SELECT row_to_json(p), p.store_id, p.sku
      INTO v_before, v_store_id, v_label
    FROM public.products p
    WHERE p.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Produto nao encontrado';
    END IF;

    SELECT
      (SELECT COUNT(*) FROM public.order_items WHERE product_id = p_id)
      + (SELECT COUNT(*) FROM public.purchase_order_items WHERE product_id = p_id)
    INTO v_count;

    IF v_count > 0 THEN
      RAISE EXCEPTION
        'Produto % tem historico comercial (%s registro(s) em pedidos/compras) e nao pode ser excluido. Desative-o ou arquive-o.',
        v_label, v_count;
    END IF;

    SELECT
      (SELECT COUNT(*) FROM public.stock_movements WHERE product_id = p_id)
      + (SELECT COUNT(*) FROM public.stock_batches
         WHERE product_id = p_id AND quantity > 0)
    INTO v_count;

    IF v_count > 0 THEN
      RAISE EXCEPTION
        'Produto % tem estoque movimentado (%s registro(s) de movimentacao/lote) e nao pode ser excluido.',
        v_label, v_count;
    END IF;

    DELETE FROM public.products WHERE id = p_id;

    v_detail := format('Produto %s removido (sem historico comercial)', v_label);

  ------------------------------------------------------------------
  -- CUSTOMERS (cliente)
  ------------------------------------------------------------------
  ELSIF p_entity = 'customers' THEN
    SELECT row_to_json(c), c.store_id, c.name
      INTO v_before, v_store_id, v_label
    FROM public.customers c
    WHERE c.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Cliente nao encontrado';
    END IF;

    DELETE FROM public.customers WHERE id = p_id;

    v_detail := format('Cliente %s removido', v_label);

  ------------------------------------------------------------------
  -- SUPPLIERS (fornecedor)
  ------------------------------------------------------------------
  ELSIF p_entity = 'suppliers' THEN
    SELECT row_to_json(s), s.store_id,
           COALESCE(NULLIF(s.trade_name, ''), s.corporate_name)
      INTO v_before, v_store_id, v_label
    FROM public.suppliers s
    WHERE s.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Fornecedor nao encontrado';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.purchase_orders
    WHERE supplier_id = p_id;

    IF v_count > 0 THEN
      RAISE EXCEPTION
        'Fornecedor % tem %s compra(s) vinculada(s) e nao pode ser excluido.',
        v_label, v_count;
    END IF;

    DELETE FROM public.suppliers WHERE id = p_id;

    v_detail := format('Fornecedor %s removido', v_label);

  ------------------------------------------------------------------
  -- PURCHASE ORDERS (compra)
  ------------------------------------------------------------------
  ELSIF p_entity = 'purchase_orders' THEN
    SELECT row_to_json(po), po.store_id, po.order_number
      INTO v_before, v_store_id, v_label
    FROM public.purchase_orders po
    WHERE po.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Compra nao encontrada';
    END IF;

    IF v_before ->> 'status' = 'RECEIVED' THEN
      RAISE EXCEPTION
        'Compra % ja foi recebida e o estoque foi lancado. Cancelar o recebimento no estoque antes de excluir, senao o saldo e os lotes ficam sem lastro.',
        v_label;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.stock_movements
    WHERE UPPER(reference_type) = 'PURCHASE_ORDER' AND reference_id = p_id::TEXT;

    IF v_count > 0 THEN
      RAISE EXCEPTION
        'Compra % tem %s lancamento(s) de estoque e nao pode ser excluida.',
        v_label, v_count;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.purchase_order_items
    WHERE purchase_order_id = p_id;

    DELETE FROM public.purchase_orders WHERE id = p_id;

    v_detail := format('Compra %s removida com %s item(ns)', v_label, v_count);

  ------------------------------------------------------------------
  -- STORE USERS (equipe)
  ------------------------------------------------------------------
  ELSIF p_entity = 'store_users' THEN
    SELECT row_to_json(su), su.store_id, su.role::TEXT
      INTO v_before, v_store_id, v_label
    FROM public.store_users su
    WHERE su.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Membro da equipe nao encontrado';
    END IF;

    IF (v_before->>'user_id')::UUID = v_user_id THEN
      RAISE EXCEPTION 'Voce nao pode remover a si mesmo da equipe';
    END IF;

    DELETE FROM public.store_users WHERE id = p_id;

    v_detail := format('Membro da equipe removido (perfil %s)', v_label);

  ELSE
    RAISE EXCEPTION 'Entidade nao suportada: %', p_entity;
  END IF;

  ------------------------------------------------------------------
  -- Auditoria: mesma transacao da exclusao, com o estado anterior
  ------------------------------------------------------------------
  INSERT INTO public.audit_logs (store_id, user_id, action, entity, entity_id, before_data)
  VALUES (
    v_store_id,
    v_user_id,
    'GLOBAL_HARD_DELETE',
    p_entity,
    p_id::TEXT,
    v_before
  );

  RETURN v_detail;
END;
$$;

COMMENT ON FUNCTION public.global_admin_delete(TEXT, UUID) IS
  'Exclusao definitiva cross-store pelo Admin Global, auditada na mesma transacao. Entidades: orders, stock_movements, products, customers, suppliers, purchase_orders, store_users.';

REVOKE ALL ON FUNCTION public.global_admin_delete(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_admin_delete(TEXT, UUID) TO authenticated;
