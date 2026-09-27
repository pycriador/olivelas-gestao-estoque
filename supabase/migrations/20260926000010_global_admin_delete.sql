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
-- O que nao tem historico e removido em cascata (itens do pedido, pagamentos,
-- imagens, lotes e saldos do produto).
-- =============================================================================

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

    DELETE FROM public.orders WHERE id = p_id;

    v_detail := format('Pedido %s removido com %s item(ns)', v_label, v_count);

  ------------------------------------------------------------------
  -- STOCK MOVEMENTS (movimentacao)
  -- Nao tem dependentes. O saldo NAO e recalculado: a movimentacao era o
  -- registro do que aconteceu, e o before_data fica preservado no audit.
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

    DELETE FROM public.stock_movements WHERE id = p_id;

    v_detail := format('Movimentacao (%s) removida', v_label);

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
    SELECT row_to_json(s), s.store_id, s.name
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
  ------------------------------------------------------------------
  ELSIF p_entity = 'purchase_orders' THEN
    SELECT row_to_json(po), po.store_id, po.order_number
      INTO v_before, v_store_id, v_label
    FROM public.purchase_orders po
    WHERE po.id = p_id;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Compra nao encontrada';
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
