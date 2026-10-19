-- =============================================================================
-- MIGRATION: 20261019000019_allow_delete_cancelled_orders_on_edit.sql
-- Permite que operadores autorizados da loja (STORE_ADMIN, SELLER, FINANCE) ou
-- Admin Global removam pedidos previamente cancelados (status = 'CANCELLED')
-- durante o fluxo de substituição/edição de venda no PDV (/sales?editOrder=...).
-- =============================================================================

DROP POLICY IF EXISTS "Orders delete cancelled: tenant staff" ON public.orders;

CREATE POLICY "Orders delete cancelled: tenant staff"
  ON public.orders FOR DELETE
  USING (
    status = 'CANCELLED'::public.order_status_enum
    AND (
      public.is_global_admin()
      OR public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'SELLER', 'FINANCE']::public.user_role_enum[])
    )
  );
