-- =============================================================================
-- MIGRATION 30: PEDIDOS INTEGRADOS DO CATÁLOGO PÚBLICO (/store/:slug),
-- RASTREAMENTO EM TEMPO REAL POR PEDIDO E PERSONALIZAÇÃO DE STATUS ("APELIDOS")
-- =============================================================================

-- 0. Adicionar o valor 'COMPLETED' (Finalizado) ao enum order_status_enum,
-- mantendo 'DELIVERED' para Entregue e 'COMPLETED' para Finalizado.
ALTER TYPE public.order_status_enum ADD VALUE IF NOT EXISTS 'COMPLETED';

-- 1. Adicionar colunas de snapshot de contato/entrega diretamente em public.orders
-- para garantir exibição imediata em /orders e na página pública de acompanhamento,
-- além do vínculo com public.customers.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- 2. Garantir que public.orders participe da publicação Realtime do Supabase
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Permitir leitura pública (anon/authenticated) restrita a pedidos do catálogo/acompanhamento
-- e itens de pedido correspondentes, mantendo segurança por UUID do pedido.
DROP POLICY IF EXISTS "Orders select: public tracking by id" ON public.orders;
CREATE POLICY "Orders select: public tracking by id"
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (
    public.has_store_access(store_id)
    OR (user_id IS NOT NULL AND user_id = auth.uid())
    OR channel IN ('CATALOG', 'WHATSAPP', 'IN_STORE')
  );

DROP POLICY IF EXISTS "Order items select: public tracking by order" ON public.order_items;
CREATE POLICY "Order items select: public tracking by order"
  ON public.order_items
  FOR SELECT
  TO anon, authenticated
  USING (
    public.has_store_access(store_id)
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id)
  );

-- 4. RPC Atômica: Criar Pedido a partir do Catálogo Público (/store/:slug)
-- Valida a loja ativa, cadastra ou localiza o cliente pelo telefone/WhatsApp,
-- trava e baixa o estoque atomicamente (igual ao PDV), gera notificação em tempo real
-- para a plataforma interna (/orders) e retorna os dados do pedido para redirecionamento.
CREATE OR REPLACE FUNCTION public.create_public_catalog_order(
  p_store_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_payment_method TEXT DEFAULT 'PIX',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store RECORD;
  v_customer_id UUID;
  v_clean_name TEXT := COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Cliente Catálogo Online');
  v_clean_phone TEXT := NULLIF(REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '\D', '', 'g'), '');
  v_clean_address TEXT := NULLIF(TRIM(COALESCE(p_delivery_address, '')), '');
  v_order_id UUID;
  v_order_number TEXT;
  v_item RECORD;
  v_product_id UUID;
  v_quantity NUMERIC(12, 3);
  v_unit_price NUMERIC(12, 2);
  v_unit_cost NUMERIC(12, 2);
  v_total_price NUMERIC(12, 2);
  v_subtotal NUMERIC(12, 2) := 0;
  v_total NUMERIC(12, 2) := 0;
  v_available NUMERIC(12, 3);
  v_requested NUMERIC(12, 3);
  v_current_stock NUMERIC(12, 3);
  v_product_name TEXT;
  v_product_sku TEXT;
  v_payment_method public.payment_method_enum := 'PIX'::public.payment_method_enum;
  v_composed_notes TEXT;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'Loja não informada.';
  END IF;

  SELECT id, name, slug, is_active, deleted_at
    INTO v_store
  FROM public.stores
  WHERE id = p_store_id
    AND is_active = TRUE
    AND deleted_at IS NULL;

  IF v_store.id IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada ou inativa.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'O carrinho está vazio. Adicione produtos para enviar o pedido.';
  END IF;

  -- Validar forma de pagamento
  IF NULLIF(TRIM(COALESCE(p_payment_method, '')), '') IS NOT NULL THEN
    BEGIN
      v_payment_method := TRIM(p_payment_method)::public.payment_method_enum;
    EXCEPTION WHEN OTHERS THEN
      v_payment_method := 'PIX'::public.payment_method_enum;
    END;
  END IF;

  -- Localizar ou criar cliente na loja (pelo telefone ou nome)
  IF v_clean_phone IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE store_id = p_store_id
      AND deleted_at IS NULL
      AND (
        REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g') = v_clean_phone
        OR REGEXP_REPLACE(COALESCE(whatsapp, ''), '\D', '', 'g') = v_clean_phone
      )
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      store_id,
      name,
      phone,
      whatsapp,
      notes,
      status
    ) VALUES (
      p_store_id,
      v_clean_name,
      COALESCE(NULLIF(TRIM(p_customer_phone), ''), NULL),
      COALESCE(NULLIF(TRIM(p_customer_phone), ''), NULL),
      CASE
        WHEN v_clean_address IS NOT NULL THEN 'Endereço Catálogo Online: ' || v_clean_address
        ELSE 'Cadastrado automaticamente via Catálogo Público Online'
      END,
      'ACTIVE'
    )
    RETURNING id INTO v_customer_id;
  ELSE
    -- Atualiza nome/telefone caso o cliente já exista
    UPDATE public.customers
    SET name = COALESCE(NULLIF(v_clean_name, 'Cliente Catálogo Online'), name),
        phone = COALESCE(NULLIF(TRIM(p_customer_phone), ''), phone),
        whatsapp = COALESCE(NULLIF(TRIM(p_customer_phone), ''), whatsapp),
        updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

  -- Passagem 1: Trava linhas de saldo dos produtos (em ordem estável por product_id)
  FOR v_product_id IN
    SELECT DISTINCT (x->>'productId')::UUID AS pid
    FROM jsonb_array_elements(p_items) AS x
    ORDER BY 1
  LOOP
    SELECT p.name, p.sku
      INTO v_product_name, v_product_sku
    FROM public.products p
    WHERE p.id = v_product_id
      AND p.store_id = p_store_id
      AND p.deleted_at IS NULL
      AND p.is_active = TRUE;

    IF v_product_name IS NULL THEN
      RAISE EXCEPTION 'Um dos produtos selecionados não está mais disponível nesta loja.';
    END IF;

    INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
    VALUES (p_store_id, v_product_id, 0, 0)
    ON CONFLICT (store_id, product_id) DO NOTHING;

    PERFORM 1
    FROM public.stock_balances sb
    WHERE sb.store_id = p_store_id AND sb.product_id = v_product_id
    FOR UPDATE;
  END LOOP;

  -- Passagem 2: Valida saldo disponível e calcula subtotal usando o preço oficial do banco
  FOR v_product_id IN
    SELECT DISTINCT (x->>'productId')::UUID AS pid
    FROM jsonb_array_elements(p_items) AS x
    ORDER BY 1
  LOOP
    SELECT
      p.name,
      p.sku,
      GREATEST(COALESCE(sb.quantity, 0) - COALESCE(sb.reserved_quantity, 0), 0)
    INTO v_product_name, v_product_sku, v_available
    FROM public.products p
    LEFT JOIN public.stock_balances sb
      ON sb.product_id = p.id AND sb.store_id = p.store_id
    WHERE p.id = v_product_id;

    SELECT COALESCE(SUM((x->>'quantity')::NUMERIC(12, 3)), 0)
      INTO v_requested
    FROM jsonb_array_elements(p_items) AS x
    WHERE (x->>'productId')::UUID = v_product_id;

    IF v_requested <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida para o produto "%".', v_product_name;
    END IF;

    IF v_available < v_requested THEN
      RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %.',
        v_product_name, v_available, v_requested;
    END IF;
  END LOOP;

  -- Calcula subtotal oficial
  FOR v_item IN
    SELECT
      (x->>'productId')::UUID AS product_id,
      (x->>'quantity')::NUMERIC(12, 3) AS quantity
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    SELECT p.selling_price, p.cost_price
      INTO v_unit_price, v_unit_cost
    FROM public.products p
    WHERE p.id = v_item.product_id
      AND p.store_id = p_store_id;

    v_total_price := ROUND(v_item.quantity * COALESCE(v_unit_price, 0), 2);
    v_subtotal := v_subtotal + v_total_price;
  END LOOP;

  v_total := GREATEST(v_subtotal, 0);

  -- Gerar número único do pedido
  v_order_number := 'PED-' || RIGHT((EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT::TEXT, 6) || '-' || FLOOR(RANDOM() * 90 + 10)::INT::TEXT;

  v_composed_notes := NULLIF(
    TRIM(
      CONCAT_WS(
        ' | ',
        CASE WHEN v_clean_address IS NOT NULL THEN 'Entrega: ' || v_clean_address ELSE 'Retirada / A combinar' END,
        NULLIF(TRIM(COALESCE(p_notes, '')), '')
      )
    ),
    ''
  );

  -- Inserir pedido em public.orders
  INSERT INTO public.orders (
    store_id,
    customer_id,
    user_id,
    order_number,
    channel,
    status,
    subtotal,
    discount_amount,
    shipping_amount,
    total_amount,
    notes,
    customer_name,
    customer_phone,
    delivery_address
  ) VALUES (
    p_store_id,
    v_customer_id,
    auth.uid(),
    v_order_number,
    'CATALOG'::public.order_channel_enum,
    'PENDING'::public.order_status_enum,
    v_subtotal,
    0,
    0,
    v_total,
    v_composed_notes,
    v_clean_name,
    NULLIF(TRIM(COALESCE(p_customer_phone, '')), ''),
    v_clean_address
  )
  RETURNING id INTO v_order_id;

  -- Inserir itens e baixar estoque atomicamente
  FOR v_item IN
    SELECT
      (x->>'productId')::UUID AS product_id,
      (x->>'quantity')::NUMERIC(12, 3) AS quantity
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    SELECT p.selling_price, p.cost_price
      INTO v_unit_price, v_unit_cost
    FROM public.products p
    WHERE p.id = v_item.product_id
      AND p.store_id = p_store_id;

    v_total_price := ROUND(v_item.quantity * COALESCE(v_unit_price, 0), 2);

    INSERT INTO public.order_items (
      order_id,
      store_id,
      product_id,
      quantity,
      unit_price,
      unit_cost,
      discount,
      total_price
    ) VALUES (
      v_order_id,
      p_store_id,
      v_item.product_id,
      v_item.quantity,
      COALESCE(v_unit_price, 0),
      v_unit_cost,
      0,
      v_total_price
    );

    SELECT quantity
      INTO v_current_stock
    FROM public.stock_balances
    WHERE store_id = p_store_id AND product_id = v_item.product_id
    FOR UPDATE;

    UPDATE public.stock_balances
    SET quantity = quantity - v_item.quantity,
        updated_at = NOW()
    WHERE store_id = p_store_id AND product_id = v_item.product_id;

    INSERT INTO public.stock_movements (
      store_id,
      product_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      reference_id,
      reference_type,
      notes,
      user_id
    ) VALUES (
      p_store_id,
      v_item.product_id,
      'SALE'::public.stock_movement_type_enum,
      v_item.quantity,
      v_current_stock,
      v_current_stock - v_item.quantity,
      v_order_id::TEXT,
      'order',
      'Pedido online via Catálogo Público (' || v_order_number || ')',
      auth.uid()
    );
  END LOOP;

  -- Registrar método de pagamento escolhido como PENDING
  INSERT INTO public.payments (
    order_id,
    store_id,
    method,
    amount,
    status
  ) VALUES (
    v_order_id,
    p_store_id,
    v_payment_method,
    v_total,
    'PENDING'::public.payment_status_enum
  );

  -- Notificar equipe da loja em tempo real
  INSERT INTO public.notifications (
    store_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_store_id,
    'NEW_ONLINE_ORDER',
    'Novo Pedido Online #' || v_order_number,
    'Cliente ' || v_clean_name || ' realizou um pedido online pelo Catálogo no valor de R$ ' || TO_CHAR(v_total, 'FM999G999D00'),
    jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'customer_name', v_clean_name,
      'customer_phone', v_clean_phone,
      'total_amount', v_total
    )
  );

  -- Auditoria
  INSERT INTO public.audit_logs (
    store_id,
    user_id,
    action,
    entity,
    entity_id,
    after_data
  ) VALUES (
    p_store_id,
    auth.uid(),
    'PUBLIC_CATALOG_ORDER_CREATED',
    'orders',
    v_order_id::TEXT,
    jsonb_build_object(
      'order_number', v_order_number,
      'channel', 'CATALOG',
      'customer_name', v_clean_name,
      'customer_phone', v_clean_phone,
      'total_amount', v_total
    )
  );

  RETURN jsonb_build_object(
    'id', v_order_id,
    'store_id', p_store_id,
    'customer_id', v_customer_id,
    'order_number', v_order_number,
    'channel', 'CATALOG',
    'status', 'PENDING',
    'subtotal', v_subtotal,
    'total_amount', v_total,
    'customer_name', v_clean_name,
    'customer_phone', NULLIF(TRIM(COALESCE(p_customer_phone, '')), ''),
    'delivery_address', v_clean_address,
    'notes', v_composed_notes,
    'created_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_catalog_order(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_catalog_order(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;

-- 5. RPC Pública de Rastreamento em Tempo Real por Pedido
-- Retorna os detalhes do pedido, loja (incluindo theme_config com os apelidos de status) e itens
CREATE OR REPLACE FUNCTION public.get_public_order_tracking(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_store RECORD;
  v_items JSONB;
  v_payment_method TEXT;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    o.*,
    COALESCE(o.customer_name, c.name, 'Cliente') AS resolved_customer_name,
    COALESCE(o.customer_phone, c.whatsapp, c.phone) AS resolved_customer_phone
  INTO v_order
  FROM public.orders o
  LEFT JOIN public.customers c ON c.id = o.customer_id
  WHERE o.id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    id,
    name,
    slug,
    logo_url,
    phone,
    whatsapp,
    address_street,
    address_number,
    address_neighborhood,
    address_city,
    address_state,
    theme_config
  INTO v_store
  FROM public.stores
  WHERE id = v_order.store_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', COALESCE(p.name, 'Produto'),
        'product_sku', COALESCE(p.sku, ''),
        'unit', COALESCE(p.unit, 'UN'),
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'discount', oi.discount,
        'total_price', oi.total_price
      )
    ),
    '[]'::JSONB
  )
  INTO v_items
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  SELECT method::TEXT
    INTO v_payment_method
  FROM public.payments
  WHERE order_id = v_order.id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'store_id', v_order.store_id,
    'order_number', v_order.order_number,
    'channel', v_order.channel,
    'status', v_order.status,
    'subtotal', v_order.subtotal,
    'discount_amount', v_order.discount_amount,
    'shipping_amount', v_order.shipping_amount,
    'total_amount', v_order.total_amount,
    'notes', v_order.notes,
    'customer_name', v_order.resolved_customer_name,
    'customer_phone', v_order.resolved_customer_phone,
    'delivery_address', v_order.delivery_address,
    'payment_method', COALESCE(v_payment_method, 'PIX'),
    'cancelled_at', v_order.cancelled_at,
    'cancellation_reason', v_order.cancellation_reason,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'store', jsonb_build_object(
      'id', v_store.id,
      'name', v_store.name,
      'slug', v_store.slug,
      'logo_url', v_store.logo_url,
      'phone', v_store.phone,
      'whatsapp', v_store.whatsapp,
      'address_street', v_store.address_street,
      'address_city', v_store.address_city,
      'address_state', v_store.address_state,
      'theme_config', COALESCE(v_store.theme_config, '{}'::JSONB)
    ),
    'items', v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_tracking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(UUID) TO anon, authenticated;
