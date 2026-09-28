-- =============================================================================
-- MIGRATION: 20260926000010_global_admin_delete.sql
-- Exclusao definitiva (hard delete) de qualquer registro em qualquer loja,
-- restrita ao Admin Global, sem pedir justificativa, sempre com trilha em
-- audit_logs gravada na MESMA transacao da exclusao.
--
-- Politica de integridade: registro com historico comercial nao e apagado.
-- A RPC devolve um erro explicando exatamente o que bloqueia, em vez de
-- cascatear e destruir o historico financeiro de terceiros.
--   - produto  referenciado por order_items / purchase_order_items -> bloqueia
--   - fornecedor referenciado por purchase_orders              -> bloqueia
--   - compra ja recebida (estoque lançado)                      -> bloqueia
-- O que nao tem historico e removido em cascata (itens do pedido, pagamentos,
-- imagens, lotes e saldos do produto).
--
-- Estoque: stock_balances.quantity e um contador, nao um valor derivado, e
-- nao ha trigger que o mantenha. Apagar um pedido ou uma movimentacao sem
-- tocar no saldo deixaria o estoque permanentemente errado, sem nenhum
-- registro do porque. Por isso os dois ramos usam
-- restore_stock_after_delete, que so reverte quando o saldo ainda e
-- exatamente o que a movimentacao deixou -- se ja mexeu no produto depois, a
-- operacao e recusada em vez de inventar um numero.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: reverte o efeito de um conjunto de movimentacoes sobre o saldo.
--
-- Exige que o saldo atual do produto seja igual ao new_quantity da ultima
-- movimentacao do grupo. Isso garante que nada mexeu no produto entre a
-- movimentacao e a exclusao. Se nao bater, devolve false e a RPC aborta.
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
BEGIN
  -- Um grupo por produto: da primeira a ultima movimentacao do registro.
  FOR v_group IN
    SELECT m.product_id,
           (ARRAY_AGG(m.previous_quantity ORDER BY m.created_at, m.id))[1] AS restore_to,
           (ARRAY_AGG(m.new_quantity ORDER BY m.created_at DESC, m.id DESC))[1] AS expected_current,
           COUNT(*) AS movements
    FROM public.stock_movements m
    WHERE m.store_id = p_store_id
      -- Case-insensitive de proposito: os pedidos ja gravados no banco
      -- usavam reference_type 'ORDER' (maiusculo) de uma versao anterior do
      -- fluxo, enquanto create_order_with_stock grava 'order'. Comparar case
      -- a sensitive faria o helper nao achar as movimentacoes dos pedidos
      -- antigos e o estoque ficaria errado em silencio, sem erro visivel.
      AND UPPER(m.reference_type) = UPPER(p_reference_type)
      AND m.reference_id = p_reference_id
      AND m.previous_quantity IS NOT NULL
      AND m.new_quantity IS NOT NULL
    GROUP BY m.product_id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.stock_balances sb
                   WHERE sb.store_id = p_store_id AND sb.product_id = v_group.product_id) THEN
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
        'Nao foi possivel remover: o saldo do produto mudou depois deste registro. Estoc % ja foi movimentado.',
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

REVOKE ALL ON FUNCTION public.restore_stock_after_delete(UUID, TEXT, TEXT) FROM PUBLIC;

COMMENT ON FUNCTION public.restore_stock_after_delete(UUID, TEXT, TEXT) IS
  'Reverte o efeito das movimentacoes de um registro sobre o saldo, so se o saldo atual ainda for o que a movimentacao deixou.';

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
  ------------------------------------------------------------------
  -- Guarda: apenas Admin Global
  ------------------------------------------------------------------
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Apenas o Admin Global pode excluir registros';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Registro nao informado';
  END IF;

  ------------------------------------------------------------------
  -- ORDERS (pedido)
  -- order_items, payments e shipments caem por ON DELETE CASCADE
  -- O estoque deducted pelo pedido volta, desde que o saldo do produto ainda
  -- seja exatamente o que a venda deixou (ver restore_stock_after_delete).
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

    -- Reverte o saldo ANTES do DELETE: depois de apagados os movimentos, o
    -- helper nao teria mais o que ler.
    PERFORM public.restore_stock_after_delete(v_store_id, 'order', p_id::TEXT);

    DELETE FROM public.orders WHERE id = p_id;

    v_detail := format('Pedido %s removido com %s item(ns); estoque revertido', v_label, v_count);

  ------------------------------------------------------------------
  -- STOCK MOVEMENTS (movimentacao)
  -- O saldo volta ao valor anterior da propria movimentacao, e so se ainda
  -- estiver como ela deixou. Sem isso, stock_balances ficaria com um
  -- contador que ninguem mais consegue explicar.
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

    -- O helper reverte o grupo inteiro referenciado por esta movimentacao.
    -- Uma movimentacao avulsa (sem reference) so pode ser removida se nao
    -- tiver mexido no saldo.
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
  -- Bloqueia se houver historico comercial.
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

    -- Movimentacao de estoque tambem e historico: apagar o produto em cascata
    -- apagaria o historico de saldo sem que o usuario pedisse isso. Lotes com
    -- quantidade tambem contam como estoque em uso.
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

    -- Sem historico: imagens, lotes, saldos e movimentacoes caem em cascata.
    DELETE FROM public.products WHERE id = p_id;

    v_detail := format('Produto %s removido (sem historico comercial)', v_label);

  ------------------------------------------------------------------
  -- CUSTOMERS (cliente)
  -- orders.customer_id e ON DELETE SET NULL, entao o historico permanece
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
  -- Bloqueia se houver compras vinculadas
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

    -- products.supplier_id e SET NULL, supplier_contacts em cascata.
    DELETE FROM public.suppliers WHERE id = p_id;

    v_detail := format('Fornecedor %s removido', v_label);

  ------------------------------------------------------------------
  -- PURCHASE ORDERS (compra)
  -- purchase_order_items em cascata
  --
  -- Compra ja recebida e bloqueada: receive_purchase_order_stock lancou o
  -- estoque, criou lotes e sobrescreveu o cost_price do produto. Apagar a
  -- compra deixaria saldo e lote semlastreado, e a entrada nao e
  -- reversivel com seguranca (o lote pode ter sido consumido depois).
  -- Compra nao recebida (DRAFT/ISSUED/CANCELLED) nao tocou estoque e pode
  -- sair limpa.
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

    -- Impede que o admin global remova a si mesmo e fique sem acesso.
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

REVOKE ALL ON FUNCTION public.global_admin_delete(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_admin_delete(TEXT, UUID) TO authenticated;
