-- =============================================================================
-- MIGRATION 29: EXCLUSÃO DEFINITIVA DE LOJAS E FILIAIS PELO GLOBAL ADMIN
-- Permite que o Global Admin exclua permanentemente (hard delete) qualquer
-- Loja Matriz ou Filial, limpando dependências restritivas (ON DELETE RESTRICT)
-- em ordem segura e registrando trilha de auditoria na mesma transação.
-- =============================================================================

-- 1. Garantir políticas de DELETE para Global Admin nas tabelas operacionais dependentes
DROP POLICY IF EXISTS "Global admin full delete orders" ON public.orders;
CREATE POLICY "Global admin full delete orders"
  ON public.orders FOR DELETE
  USING (public.is_global_admin());

DROP POLICY IF EXISTS "Global admin full delete order_items" ON public.order_items;
CREATE POLICY "Global admin full delete order_items"
  ON public.order_items FOR DELETE
  USING (public.is_global_admin());

DROP POLICY IF EXISTS "Global admin full delete stock_movements" ON public.stock_movements;
CREATE POLICY "Global admin full delete stock_movements"
  ON public.stock_movements FOR DELETE
  USING (public.is_global_admin());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_transfers'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Global admin full delete stock_transfers" ON public.stock_transfers';
    EXECUTE 'CREATE POLICY "Global admin full delete stock_transfers" ON public.stock_transfers FOR DELETE USING (public.is_global_admin())';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_transfer_items'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Global admin full delete stock_transfer_items" ON public.stock_transfer_items';
    EXECUTE 'CREATE POLICY "Global admin full delete stock_transfer_items" ON public.stock_transfer_items FOR DELETE USING (public.is_global_admin())';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_writeoff_requests'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Global admin full delete stock_writeoff_requests" ON public.stock_writeoff_requests';
    EXECUTE 'CREATE POLICY "Global admin full delete stock_writeoff_requests" ON public.stock_writeoff_requests FOR DELETE USING (public.is_global_admin())';
  END IF;
END $$;

-- 2. RPC Atômica: global_admin_hard_delete_store
CREATE OR REPLACE FUNCTION public.global_admin_hard_delete_store(
  p_store_id UUID,
  p_delete_branches BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_store RECORD;
  v_before JSONB;
  v_child RECORD;
  v_deleted_branches INT := 0;
  v_unlinked_branches INT := 0;
BEGIN
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Apenas o Global Admin pode excluir lojas ou filiais definitivamente.';
  END IF;

  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'ID da loja/filial não informado.';
  END IF;

  SELECT *
    INTO v_store
  FROM public.stores
  WHERE id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja ou filial não encontrada.';
  END IF;

  v_before := to_jsonb(v_store);

  -- Tratar filiais subordinadas caso esta unidade seja uma Matriz
  IF COALESCE(p_delete_branches, FALSE) THEN
    FOR v_child IN
      SELECT id, name
      FROM public.stores
      WHERE parent_store_id = p_store_id
        AND id <> p_store_id
    LOOP
      PERFORM public.global_admin_hard_delete_store(v_child.id, TRUE);
      v_deleted_branches := v_deleted_branches + 1;
    END LOOP;
  ELSE
    UPDATE public.stores
    SET parent_store_id = NULL,
        is_branch = FALSE,
        updated_at = NOW()
    WHERE parent_store_id = p_store_id;
    GET DIAGNOSTICS v_unlinked_branches = ROW_COUNT;
  END IF;

  -- Remover itens de transferência e remessas entre filiais que referenciam produtos desta loja (ON DELETE RESTRICT)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_transfer_items'
  ) THEN
    DELETE FROM public.stock_transfer_items
    WHERE source_product_id IN (SELECT id FROM public.products WHERE store_id = p_store_id)
       OR destination_product_id IN (SELECT id FROM public.products WHERE store_id = p_store_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_transfers'
  ) THEN
    DELETE FROM public.stock_transfers
    WHERE source_store_id = p_store_id
       OR destination_store_id = p_store_id;
  END IF;

  -- Remover itens de pedidos e pedidos da loja (order_items.product_id possui ON DELETE RESTRICT)
  DELETE FROM public.order_items WHERE store_id = p_store_id;
  DELETE FROM public.orders WHERE store_id = p_store_id;

  -- Remover itens de compra e ordens de compra da loja (purchase_order_items.product_id e purchase_orders.supplier_id possuem ON DELETE RESTRICT)
  DELETE FROM public.purchase_order_items WHERE store_id = p_store_id;
  DELETE FROM public.purchase_orders WHERE store_id = p_store_id;

  -- Remover movimentações, lotes, saldos, produtos e fornecedores da loja
  DELETE FROM public.stock_movements WHERE store_id = p_store_id;
  DELETE FROM public.stock_batches WHERE store_id = p_store_id;
  DELETE FROM public.stock_balances WHERE store_id = p_store_id;
  DELETE FROM public.products WHERE store_id = p_store_id;
  DELETE FROM public.suppliers WHERE store_id = p_store_id;

  -- Registrar auditoria antes da remoção definitiva (audit_logs.store_id é ON DELETE SET NULL)
  INSERT INTO public.audit_logs (
    store_id,
    user_id,
    action,
    entity,
    entity_id,
    before_data,
    after_data
  ) VALUES (
    NULL,
    v_user_id,
    'GLOBAL_HARD_DELETE_STORE',
    'stores',
    p_store_id::TEXT,
    v_before,
    jsonb_build_object(
      'deleted_store_name', v_store.name,
      'deleted_store_slug', v_store.slug,
      'was_branch', COALESCE(v_store.is_branch, FALSE),
      'deleted_child_branches', v_deleted_branches,
      'unlinked_child_branches', v_unlinked_branches
    )
  );

  -- Excluir definitivamente a loja/filial (demais tabelas com ON DELETE CASCADE são limpas automaticamente)
  DELETE FROM public.stores WHERE id = p_store_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'id', p_store_id,
    'name', v_store.name,
    'slug', v_store.slug,
    'wasBranch', COALESCE(v_store.is_branch, FALSE),
    'deletedBranchesCount', v_deleted_branches,
    'unlinkedBranchesCount', v_unlinked_branches
  );
END;
$$;

REVOKE ALL ON FUNCTION public.global_admin_hard_delete_store(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_admin_hard_delete_store(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.global_admin_hard_delete_store(UUID, BOOLEAN) IS
  'Exclui definitivamente (hard delete) uma Loja Matriz ou Filial e todos os seus dados operacionais, exclusivo para Global Admin.';
