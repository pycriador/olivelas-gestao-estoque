-- ========================================================================
-- SPRINT 02: SUPABASE FOUNDATION - CONCURRENCY-SAFE FUNCTIONS & RPCS
-- Atomic Stock Transactions, Batch Allocations & Cancellation Reversals
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. Atomic Sale Stock Deduction
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale_stock_deduction(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_current_stock NUMERIC(12, 3);
  v_store_id UUID;
  v_order_status order_status_enum;
BEGIN
  -- 1. Fetch and lock order
  SELECT store_id, status INTO v_store_id, v_order_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', p_order_id;
  END IF;

  IF v_order_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Não é possível baixar estoque de um pedido cancelado';
  END IF;

  -- 2. Process each item in the order
  FOR v_item IN
    SELECT oi.id, oi.product_id, oi.batch_id, oi.quantity, p.name AS product_name, p.controls_batch
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
  LOOP
    -- Lock current stock balance row
    SELECT quantity INTO v_current_stock
    FROM public.stock_balances
    WHERE store_id = v_store_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      -- Create initial record if missing
      INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
      VALUES (v_store_id, v_item.product_id, -v_item.quantity, 0);
      v_current_stock := 0;
    ELSE
      -- Concurrency check: prevent negative stock if strict or update balance
      UPDATE public.stock_balances
      SET quantity = quantity - v_item.quantity,
          updated_at = NOW()
      WHERE store_id = v_store_id AND product_id = v_item.product_id;
    END IF;

    -- If item was linked to a specific batch, decrement batch quantity
    IF v_item.batch_id IS NOT NULL THEN
      UPDATE public.stock_batches
      SET quantity = GREATEST(0, quantity - v_item.quantity),
          status = CASE WHEN quantity - v_item.quantity <= 0 THEN 'DEPLETED'::batch_status_enum ELSE status END,
          updated_at = NOW()
      WHERE id = v_item.batch_id;
    END IF;

    -- Record immutable stock movement
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
      v_store_id,
      v_item.product_id,
      v_item.batch_id,
      'SALE',
      v_item.quantity,
      v_current_stock,
      v_current_stock - v_item.quantity,
      p_order_id::text,
      'ORDER',
      'Baixa automática de venda',
      auth.uid()
    );
  END LOOP;

  -- 3. Update order status to CONFIRMED
  UPDATE public.orders
  SET status = 'CONFIRMED',
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------------------
-- 2. Atomic Order Cancellation & Stock Restoration
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_sale_stock(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Cancelamento de Pedido'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_current_stock NUMERIC(12, 3);
  v_store_id UUID;
  v_order_status order_status_enum;
BEGIN
  -- 1. Fetch and lock order
  SELECT store_id, status INTO v_store_id, v_order_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', p_order_id;
  END IF;

  IF v_order_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Este pedido já foi cancelado previamente';
  END IF;

  -- 2. Revert each item's stock
  FOR v_item IN
    SELECT oi.id, oi.product_id, oi.batch_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    -- Lock and update stock balance
    SELECT quantity INTO v_current_stock
    FROM public.stock_balances
    WHERE store_id = v_store_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
      VALUES (v_store_id, v_item.product_id, v_item.quantity, 0);
      v_current_stock := 0;
    ELSE
      UPDATE public.stock_balances
      SET quantity = quantity + v_item.quantity,
          updated_at = NOW()
      WHERE store_id = v_store_id AND product_id = v_item.product_id;
    END IF;

    -- If batch was allocated, restore batch balance
    IF v_item.batch_id IS NOT NULL THEN
      UPDATE public.stock_batches
      SET quantity = quantity + v_item.quantity,
          status = 'ACTIVE'::batch_status_enum,
          updated_at = NOW()
      WHERE id = v_item.batch_id;
    END IF;

    -- Record stock movement return
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
      v_store_id,
      v_item.product_id,
      v_item.batch_id,
      'RETURN',
      v_item.quantity,
      v_current_stock,
      v_current_stock + v_item.quantity,
      p_order_id::text,
      'ORDER_CANCELLATION',
      p_reason,
      auth.uid()
    );
  END LOOP;

  -- 3. Mark order as CANCELLED with audit fields
  UPDATE public.orders
  SET status = 'CANCELLED',
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      cancellation_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------------------
-- 3. Atomic Purchase Order Receiving & Stock Entry
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order_stock(p_purchase_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_current_stock NUMERIC(12, 3);
  v_store_id UUID;
  v_po_status purchase_order_status_enum;
  v_batch_id UUID;
BEGIN
  -- 1. Fetch and lock purchase order
  SELECT store_id, status INTO v_store_id, v_po_status
  FROM public.purchase_orders
  WHERE id = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de compra % não encontrada', p_purchase_order_id;
  END IF;

  IF v_po_status = 'RECEIVED' THEN
    RAISE EXCEPTION 'Esta ordem de compra já foi recebida anteriormente';
  END IF;

  -- 2. Process each item received
  FOR v_item IN
    SELECT poi.id, poi.product_id, poi.quantity_ordered, poi.unit_cost, poi.lot_number, poi.expiration_date
    FROM public.purchase_order_items poi
    WHERE poi.purchase_order_id = p_purchase_order_id
  LOOP
    -- Lock stock balance
    SELECT quantity INTO v_current_stock
    FROM public.stock_balances
    WHERE store_id = v_store_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
      VALUES (v_store_id, v_item.product_id, v_item.quantity_ordered, 0);
      v_current_stock := 0;
    ELSE
      UPDATE public.stock_balances
      SET quantity = quantity + v_item.quantity_ordered,
          updated_at = NOW()
      WHERE store_id = v_store_id AND product_id = v_item.product_id;
    END IF;

    -- Update product cost price if higher or new
    UPDATE public.products
    SET cost_price = v_item.unit_cost,
        updated_at = NOW()
    WHERE id = v_item.product_id;

    -- If lot number is present, insert or update batch
    v_batch_id := NULL;
    IF v_item.lot_number IS NOT NULL AND TRIM(v_item.lot_number) != '' THEN
      INSERT INTO public.stock_batches (
        store_id,
        product_id,
        lot_number,
        quantity,
        cost_price,
        expiration_date,
        status
      ) VALUES (
        v_store_id,
        v_item.product_id,
        v_item.lot_number,
        v_item.quantity_ordered,
        v_item.unit_cost,
        v_item.expiration_date,
        'ACTIVE'
      )
      ON CONFLICT (store_id, product_id, lot_number)
      DO UPDATE SET
        quantity = stock_batches.quantity + EXCLUDED.quantity,
        cost_price = EXCLUDED.cost_price,
        expiration_date = COALESCE(EXCLUDED.expiration_date, stock_batches.expiration_date),
        updated_at = NOW()
      RETURNING id INTO v_batch_id;
    END IF;

    -- Record stock movement
    INSERT INTO public.stock_movements (
      store_id,
      product_id,
      batch_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      unit_cost,
      reference_id,
      reference_type,
      notes,
      user_id
    ) VALUES (
      v_store_id,
      v_item.product_id,
      v_batch_id,
      'ENTRY',
      v_item.quantity_ordered,
      v_current_stock,
      v_current_stock + v_item.quantity_ordered,
      v_item.unit_cost,
      p_purchase_order_id::text,
      'PURCHASE_ORDER',
      'Recebimento de Ordem de Compra',
      auth.uid()
    );

    -- Mark received quantity
    UPDATE public.purchase_order_items
    SET quantity_received = quantity_ordered
    WHERE id = v_item.id;
  END LOOP;

  -- 3. Update Purchase Order Status
  UPDATE public.purchase_orders
  SET status = 'RECEIVED',
      received_at = NOW(),
      updated_at = NOW()
  WHERE id = p_purchase_order_id;

  RETURN TRUE;
END;
$$;

-- ------------------------------------------------------------------------
-- 4. Automatic Profile Creation on auth.users Signup Trigger
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_global_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    -- Explicitly grant Global Admin to designated owner email or first user
    (NEW.email = 'willian.o.jesus@gmail.com' OR COALESCE((SELECT COUNT(*) = 0 FROM public.profiles), FALSE))
  )
  ON CONFLICT (id) DO UPDATE
  SET is_global_admin = CASE 
    WHEN EXCLUDED.email = 'willian.o.jesus@gmail.com' THEN TRUE 
    ELSE profiles.is_global_admin 
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- If user already exists in profiles, promote to Global Admin
UPDATE public.profiles
SET is_global_admin = TRUE
WHERE email = 'willian.o.jesus@gmail.com';
