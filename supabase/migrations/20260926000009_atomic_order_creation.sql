-- =============================================================================
-- MIGRATION: 20260926000009_atomic_order_creation.sql
-- Cria pedido + itens + pagamento + baixa de estoque em UMA transacao, com
-- trava de linha por produto e recusa explicita quando o saldo disponivel nao
-- cobre o carrinho.
--
-- Por que uma nova RPC: createOrder() no cliente fazia 3 inserts seguidos e
-- depois chamava process_sale_stock_deduction em modo "fire-and-forget"
-- (supabase.rpc nao lanca excecao, o erro era descartado). Entre as etapas
-- nada impedia estoque negativo:
--   process_sale_stock_deduction -> UPDATE ... SET quantity = quantity - q
--   sem qualquer verificacao, e ainda inseria saldo negativo quando a linha
--   de stock_balances nao existia.
--
-- Aqui: SELECT ... FOR UPDATE serializa vendas concorrentes do mesmo produto,
-- e a validacao acontece ANTES de qualquer escrita, entao ou o pedido inteiro
-- e criado com estoque baixo, ou nada e gravado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos auxiliares
-- -----------------------------------------------------------------------------
-- Derruba a assinatura antiga de 10 parametros ANTES de recriar o wrapper no
-- fim do arquivo. O DROP e explicito (e nao um CREATE OR REPLACE) porque a
-- assinatura muda de "10 argumentos, o ultimo com default" para "10
-- argumentos, todos obrigatorios": o PostgreSQL nao aceita remover um default
-- via OR REPLACE, e sem o DROP o DEFAULT antigo voltaria a tornar a chamada
-- de 9 argumentos ambigua. Tudo na mesma transacao, entao nao ha janela sem
-- a funcao.
DROP FUNCTION IF EXISTS public.create_order_with_stock(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN
);

-- Itens vem do cliente como JSONB; o shape eValidado item a item.
CREATE OR REPLACE FUNCTION public.create_order_with_stock(
  p_store_id UUID,
  p_customer_id UUID,
  p_channel TEXT,
  p_order_number TEXT,
  p_items JSONB,
  p_discount_amount NUMERIC DEFAULT 0,
  p_shipping_amount NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_user_id UUID := auth.uid();
  v_item RECORD;
  v_product_id UUID;
  v_batch_id UUID;
  v_lock_batch_id UUID;
  v_batch_product UUID;
  v_channel public.order_channel_enum;
  v_payment_method TEXT;
  v_payment_status public.payment_status_enum;
  v_quantity NUMERIC(12, 3);
  v_unit_price NUMERIC(12, 2);
  v_unit_cost NUMERIC(12, 2);
  v_discount NUMERIC(12, 2);
  v_total_price NUMERIC(12, 2);

  v_subtotal NUMERIC(12, 2) := 0;
  v_discount_amount NUMERIC(12, 2) := 0;
  v_shipping_amount NUMERIC(12, 2) := 0;
  v_total NUMERIC(12, 2) := 0;

  v_current_stock NUMERIC(12, 3);
  v_available NUMERIC(12, 3);
  v_requested NUMERIC(12, 3);
  v_product_name TEXT;
  v_product_sku TEXT;
  v_batch_quantity NUMERIC(12, 3);
BEGIN
  ------------------------------------------------------------------
  -- Guarda de acesso
  ------------------------------------------------------------------
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'Loja nao informada';
  END IF;

  IF NOT public.has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Sem acesso a loja %', p_store_id;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens';
  END IF;

  ------------------------------------------------------------------
  -- Normaliza os itens: valida shape e calcula totais
  ------------------------------------------------------------------
  FOR v_item IN
    SELECT
      (x->>'productId')::UUID AS product_id,
      NULLIF(x->>'batchId', '')::UUID AS batch_id,
      (x->>'quantity')::NUMERIC(12, 3) AS quantity,
      (x->>'unitPrice')::NUMERIC(12, 2) AS unit_price,
      NULLIF(x->>'unitCost', '')::NUMERIC(12, 2) AS unit_cost,
      COALESCE(NULLIF(x->>'discount', '')::NUMERIC(12, 2), 0) AS discount
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    -- FOR v_item IN SELECT expoe as colunas em v_item.<coluna>; as variaveis
    -- abaixo precisam ser preenchidas explicitamente a cada iteracao.
    v_product_id := v_item.product_id;
    v_batch_id := v_item.batch_id;
    v_quantity := v_item.quantity;
    v_unit_price := v_item.unit_price;
    v_unit_cost := v_item.unit_cost;
    v_discount := v_item.discount;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Item sem productId';
    END IF;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantidade invalida para o produto %', v_product_id;
    END IF;

    IF v_unit_price IS NULL OR v_unit_price < 0 THEN
      RAISE EXCEPTION 'Preco invalido para o produto %', v_product_id;
    END IF;

    v_discount := COALESCE(v_discount, 0);
    IF v_discount < 0 THEN
      RAISE EXCEPTION 'Desconto invalido para o produto %', v_product_id;
    END IF;

    v_total_price := v_quantity * v_unit_price - v_discount;
    v_subtotal := v_subtotal + v_total_price;
  END LOOP;

  v_discount_amount := COALESCE(p_discount_amount, 0);
  v_shipping_amount := COALESCE(p_shipping_amount, 0);
  v_total := GREATEST(v_subtotal - v_discount_amount + v_shipping_amount, 0);

  ------------------------------------------------------------------
  -- Passagem 1: garante e trava a linha de saldo de cada produto.
  --
  -- O lock e tomado em ordem estavel (product_id) para evitar deadlocks
  -- entre dois caixas vendendo os mesmos produtos em ordem diferente.
  --
  -- NAO da para usar FOR UPDATE no LEFT JOIN das linhas de saldo: o
  -- Postgres recusa lock no lado nulo de outer join. Por isso o
  -- INSERT ... ON CONFLICT e o FOR UPDATE acontecem antes, em separado.
  ------------------------------------------------------------------
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
      AND p.deleted_at IS NULL;

    IF v_product_name IS NULL THEN
      RAISE EXCEPTION 'Produto % nao pertence a esta loja', v_product_id;
    END IF;

    -- Produto sem movimentacao ainda nao tem linha de saldo.
    INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
    VALUES (p_store_id, v_product_id, 0, 0)
    ON CONFLICT (store_id, product_id) DO NOTHING;

    PERFORM 1
    FROM public.stock_balances sb
    WHERE sb.store_id = p_store_id AND sb.product_id = v_product_id
    FOR UPDATE;
  END LOOP;

  -- Lotes citados no carrinho tambem sao travados e validados.
  FOR v_lock_batch_id IN
    SELECT DISTINCT NULLIF(x->>'batchId', '')::UUID AS bid
    FROM jsonb_array_elements(p_items) AS x
    WHERE NULLIF(x->>'batchId', '') IS NOT NULL
    ORDER BY 1
  LOOP
    SELECT sb.quantity, sb.product_id, p.name
      INTO v_batch_quantity, v_batch_product, v_product_name
    FROM public.stock_batches sb
    JOIN public.products p ON p.id = sb.product_id
    WHERE sb.id = v_lock_batch_id
      AND sb.store_id = p_store_id
    FOR UPDATE OF sb;

    IF v_batch_quantity IS NULL THEN
      RAISE EXCEPTION 'Lote % inexistente ou de outra loja', v_lock_batch_id;
    END IF;

    -- O lote tem que ser do produto da linha que o cita. Sem esta checagem um
    -- lote da mesma loja, mas de outro produto, era debitado em nome do item.
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_items) AS x
      WHERE NULLIF(x->>'batchId', '')::UUID = v_lock_batch_id
        AND (x->>'productId')::UUID IS DISTINCT FROM v_batch_product
    ) THEN
      RAISE EXCEPTION
        'Lote % pertence ao produto %, e nao ao produto informado no item',
        v_lock_batch_id, v_batch_product;
    END IF;

    SELECT COALESCE(SUM((x->>'quantity')::NUMERIC(12, 3)), 0)
      INTO v_requested
    FROM jsonb_array_elements(p_items) AS x
    WHERE NULLIF(x->>'batchId', '')::UUID = v_lock_batch_id;

    IF v_batch_quantity < v_requested THEN
      RAISE EXCEPTION
        'Estoque insuficiente no lote % de "%": disponivel %, solicitado %',
        v_lock_batch_id, v_product_name, v_batch_quantity, v_requested;
    END IF;
  END LOOP;

  ------------------------------------------------------------------
  -- Passagem 2: valida o disponivel. Tudo ja esta travado nesta
  -- transacao, entao a leitura abaixo nao corre para o ceu.
  ------------------------------------------------------------------
  FOR v_product_id IN
    SELECT DISTINCT (x->>'productId')::UUID AS pid
    FROM jsonb_array_elements(p_items) AS x
    ORDER BY 1
  LOOP
    SELECT
      p.name,
      p.sku,
      COALESCE(sb.quantity, 0) - COALESCE(sb.reserved_quantity, 0)
    INTO v_product_name, v_product_sku, v_available
    FROM public.products p
    LEFT JOIN public.stock_balances sb
      ON sb.product_id = p.id AND sb.store_id = p.store_id
    WHERE p.id = v_product_id;

    -- Saldo negativo herdado de movimentacoes antigas conta como zero.
    v_available := GREATEST(v_available, 0);

    -- O carrinho pode repetir o mesmo produto em linhas separadas.
    SELECT COALESCE(SUM((x->>'quantity')::NUMERIC(12, 3)), 0)
      INTO v_requested
    FROM jsonb_array_elements(p_items) AS x
    WHERE (x->>'productId')::UUID = v_product_id;

    IF v_available < v_requested THEN
      RAISE EXCEPTION
        'Estoque insuficiente para "%" (%): disponivel %, solicitado %',
        v_product_name,
        COALESCE(NULLIF(v_product_sku, ''), v_product_id::TEXT),
        v_available,
        v_requested;
    END IF;
  END LOOP;

  ------------------------------------------------------------------
  -- Valida os enums. p_channel e TEXT no cliente, mas orders.channel e
  -- order_channel_enum: sem o cast explicito o INSERT falha com
  -- "coluna channel e do tipo order_channel_enum mas expressao e do tipo text".
  ------------------------------------------------------------------
  BEGIN
    v_channel := p_channel::public.order_channel_enum;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Canal de venda invalido: %', p_channel;
  END;

  IF NULLIF(p_payment_method, '') IS NOT NULL THEN
    BEGIN
      PERFORM p_payment_method::public.payment_method_enum;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Forma de pagamento invalida: %', p_payment_method;
    END;
  END IF;

  ------------------------------------------------------------------
  -- Grava o pedido
  ------------------------------------------------------------------
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
    notes
  ) VALUES (
    p_store_id,
    p_customer_id,
    v_user_id,
    p_order_number,
    v_channel,
    -- Mantem o comportamento anterior: o ciclo de vida do pedido nao muda
    -- aqui. Quem muda de status depois e updateOrderStatus().
    'PENDING'::order_status_enum,
    v_subtotal,
    v_discount_amount,
    v_shipping_amount,
    v_total,
    p_notes
  )
  RETURNING id INTO v_order_id;

  ------------------------------------------------------------------
  -- Grava os itens
  ------------------------------------------------------------------
  FOR v_item IN
    SELECT
      (x->>'productId')::UUID AS product_id,
      NULLIF(x->>'batchId', '')::UUID AS batch_id,
      (x->>'quantity')::NUMERIC(12, 3) AS quantity,
      (x->>'unitPrice')::NUMERIC(12, 2) AS unit_price,
      NULLIF(x->>'unitCost', '')::NUMERIC(12, 2) AS unit_cost,
      COALESCE(NULLIF(x->>'discount', '')::NUMERIC(12, 2), 0) AS discount
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    v_product_id := v_item.product_id;
    v_batch_id := v_item.batch_id;
    v_quantity := v_item.quantity;
    v_unit_price := v_item.unit_price;
    v_unit_cost := v_item.unit_cost;
    v_discount := v_item.discount;
    v_total_price := v_quantity * v_unit_price - v_discount;

    INSERT INTO public.order_items (
      order_id,
      store_id,
      product_id,
      batch_id,
      quantity,
      unit_price,
      unit_cost,
      discount,
      total_price
    ) VALUES (
      v_order_id,
      p_store_id,
      v_product_id,
      v_batch_id,
      v_quantity,
      v_unit_price,
      v_unit_cost,
      v_discount,
      v_total_price
    );
  END LOOP;

  ------------------------------------------------------------------
  -- Pagamento
  ------------------------------------------------------------------
  IF NULLIF(p_payment_method, '') IS NOT NULL THEN
    INSERT INTO public.payments (order_id, store_id, method, amount, status)
    VALUES (
      v_order_id,
      p_store_id,
      p_payment_method::public.payment_method_enum,
      v_total,
      CASE
        WHEN v_channel = 'IN_STORE'::public.order_channel_enum
          THEN 'PAID'::public.payment_status_enum
        ELSE 'PENDING'::public.payment_status_enum
      END
    );
  END IF;

  ------------------------------------------------------------------
  -- Baixa de estoque + movimentacao (ja validado e travado acima)
  ------------------------------------------------------------------
  FOR v_item IN
    SELECT
      (x->>'productId')::UUID AS product_id,
      NULLIF(x->>'batchId', '')::UUID AS batch_id,
      (x->>'quantity')::NUMERIC(12, 3) AS quantity
    FROM jsonb_array_elements(p_items) AS x
  LOOP
    v_product_id := v_item.product_id;
    v_batch_id := v_item.batch_id;
    v_quantity := v_item.quantity;

    -- Linha de saldo pode nao existir (produto nunca movimentado).
    -- INSERT ... ON CONFLICT monta a linha zerada antes de debitar.
    INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
    VALUES (p_store_id, v_product_id, 0, 0)
    ON CONFLICT (store_id, product_id) DO NOTHING;

    SELECT quantity
      INTO v_current_stock
    FROM public.stock_balances
    WHERE store_id = p_store_id AND product_id = v_product_id
    FOR UPDATE;

    UPDATE public.stock_balances
    SET quantity = quantity - v_quantity,
        updated_at = NOW()
    WHERE store_id = p_store_id AND product_id = v_product_id;

    -- Lote vinculado
    IF v_batch_id IS NOT NULL THEN
      UPDATE public.stock_batches
      SET quantity = GREATEST(0, quantity - v_quantity),
          status = CASE
            WHEN quantity - v_quantity <= 0 THEN 'DEPLETED'::batch_status_enum
            ELSE status
          END,
          updated_at = NOW()
      WHERE id = v_batch_id
        AND product_id = v_product_id;
    END IF;

    INSERT INTO public.stock_movements (
      store_id,
      product_id,
      batch_id,
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
      v_product_id,
      v_batch_id,
      'SALE',
      v_quantity,
      v_current_stock,
      v_current_stock - v_quantity,
      v_order_id::TEXT,
      'order',
      'Venda registrada no PDV',
      v_user_id
    );
  END LOOP;

  ------------------------------------------------------------------
  -- Auditoria na mesma transacao
  ------------------------------------------------------------------
  INSERT INTO public.audit_logs (store_id, user_id, action, entity, entity_id, after_data)
  VALUES (
    p_store_id,
    v_user_id,
    'ORDER_CREATED',
    'orders',
    v_order_id::TEXT,
    jsonb_build_object(
      'order_number', p_order_number,
      'channel', p_channel,
      'subtotal', v_subtotal,
      'total', v_total,
      'item_count', jsonb_array_length(p_items)
    )
  );

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION public.create_order_with_stock(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT
) IS
  'Cria pedido, itens, pagamento e baixa de estoque em uma transacao, recusando estoque insuficiente.';

REVOKE ALL ON FUNCTION public.create_order_with_stock(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT
) TO authenticated;

-- -----------------------------------------------------------------------------
-- Compatibilidade com o frontend ja publicado
--
-- O bundle em producao (GitHub Pages) ainda chama a assinatura antiga, de 10
-- parametros, com p_deduct_stock. Duas opcoes:
--   a) derrubar a assinatura de 10 args  -> o app publicado passa a dar erro
--      em toda venda ate um novo deploy;
--   b) manter a assinatura antiga como wrapper que SEMPRE da baixa.
-- A opcao (b) fecha o bypass sem janela de indisponibilidade: nao existe mais
-- caminho para criar pedido sem baixa, porque p_deduct_stock e ignorado.
--
-- Depois que o novo bundle estiver no ar, este wrapper pode ser removido.
-- Por enquanto ele e a opcao segura: venda parada custa mais que um
-- parametro legado a mais na assinatura.
--
-- p_deduct_stock e os demais NAO tem DEFAULT, e isso e essencial. Com
-- qualquer default, uma chamada de 9 argumentos serviria para as duas
-- funcoes e o PostgreSQL responderia "funcao nao e unica" -- inclusive na
-- chamada interna deste wrapper para o core, o que derrubaria toda venda.
-- Sem default, so a assinatura de 10 argumentos aceita 10 argumentos, e so
-- a de 9 aceita 9. O bundle antigo envia os 10 nomes explicitamente, entao
-- nenhuma chamada legitima e perdida.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_stock(
  p_store_id UUID,
  p_customer_id UUID,
  p_channel TEXT,
  p_order_number TEXT,
  p_items JSONB,
  p_discount_amount NUMERIC,
  p_shipping_amount NUMERIC,
  p_notes TEXT,
  p_payment_method TEXT,
  p_deduct_stock BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- p_deduct_stock e deliberadamente IGNORADO. Aceitar o parametro e nao
  -- respeita-lo seria a mesma falha de antes, so que mais escondida.
  RETURN public.create_order_with_stock(
    p_store_id,
    p_customer_id,
    p_channel,
    p_order_number,
    p_items,
    p_discount_amount,
    p_shipping_amount,
    p_notes,
    p_payment_method
  );
END;
$$;

COMMENT ON FUNCTION public.create_order_with_stock(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN
) IS
  'Wrapper de compatibilidade para o frontend antigo. Ignora p_deduct_stock e sempre da baixa de estoque.';

REVOKE ALL ON FUNCTION public.create_order_with_stock(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(
  UUID, UUID, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN
) TO authenticated;
