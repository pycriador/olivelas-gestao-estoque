-- ========================================================================
-- OLIVELAS - FULL DATABASE SETUP (RUN ALL IN SUPABASE SQL EDITOR)
-- Multi-Tenant Enterprise Schema, RLS Policies, Atomic RPCs & Seed Data
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'GLOBAL_ADMIN',
    'STORE_ADMIN',
    'FINANCE',
    'SELLER',
    'INVENTORY',
    'VIEWER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM (
    'DRAFT',
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_channel_enum AS ENUM (
    'IN_STORE',
    'WHATSAPP',
    'CATALOG',
    'ECOMMERCE',
    'API'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM (
    'CASH',
    'PIX',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'BOLETO',
    'BANK_TRANSFER',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'PAID',
    'REFUNDED',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type_enum AS ENUM (
    'ENTRY',
    'EXIT',
    'SALE',
    'RETURN',
    'ADJUSTMENT',
    'LOSS',
    'DAMAGE',
    'EXPIRATION',
    'TRANSFER',
    'INVENTORY_COUNT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE batch_status_enum AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'DEPLETED',
    'BLOCKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE purchase_order_status_enum AS ENUM (
    'DRAFT',
    'ISSUED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------
-- 2. CORE TABLES
-- ------------------------------------------------------------------------

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_global_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Stores (Tenants)
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  document TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  address_street TEXT,
  address_number TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zipcode TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  theme_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores(is_active);

-- Store Users (RBAC mapping)
CREATE TABLE IF NOT EXISTS public.store_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role_enum DEFAULT 'VIEWER' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_store_user UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_users_store ON public.store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON public.store_users(user_id);

-- Roles & Permissions
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_code TEXT NOT NULL REFERENCES public.roles(code) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  CONSTRAINT uq_role_permission UNIQUE(role_code, permission_code)
);

-- Categories, Brands, Manufacturers
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_category_store_slug UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_store ON public.categories(store_id);

CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_brand_store_name UNIQUE(store_id, name)
);

CREATE TABLE IF NOT EXISTS public.manufacturers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_manufacturer_store_name UNIQUE(store_id, name)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  corporate_name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suppliers_store ON public.suppliers(store_id);

CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zipcode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  ean TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  cost_price NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  selling_price NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  margin_percentage NUMERIC(6, 2),
  unit TEXT DEFAULT 'UN' NOT NULL,
  weight_kg NUMERIC(8, 3),
  dimensions JSONB DEFAULT '{}'::jsonb,
  min_stock NUMERIC(12, 3) DEFAULT 0 NOT NULL,
  max_stock NUMERIC(12, 3) DEFAULT 1000 NOT NULL,
  controls_batch BOOLEAN DEFAULT FALSE NOT NULL,
  controls_expiration BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_published_catalog BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_product_store_sku UNIQUE(store_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL,
  display_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Stock Balances & Batches
CREATE TABLE IF NOT EXISTS public.stock_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 3) DEFAULT 0 NOT NULL,
  reserved_quantity NUMERIC(12, 3) DEFAULT 0 NOT NULL,
  available_quantity NUMERIC(12, 3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_stock_balance_store_product UNIQUE(store_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_store ON public.stock_balances(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_product ON public.stock_balances(product_id);

CREATE TABLE IF NOT EXISTS public.stock_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  quantity NUMERIC(12, 3) DEFAULT 0 NOT NULL,
  cost_price NUMERIC(12, 2),
  manufacturing_date DATE,
  expiration_date DATE,
  status batch_status_enum DEFAULT 'ACTIVE' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_stock_batch UNIQUE(store_id, product_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_stock_batches_store ON public.stock_batches(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_expiration ON public.stock_batches(expiration_date);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.stock_batches(id) ON DELETE SET NULL,
  movement_type stock_movement_type_enum NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  previous_quantity NUMERIC(12, 3) NOT NULL,
  new_quantity NUMERIC(12, 3) NOT NULL,
  unit_cost NUMERIC(12, 2),
  reference_id TEXT,
  reference_type TEXT,
  notes TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_store ON public.stock_movements(store_id);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  status purchase_order_status_enum DEFAULT 'DRAFT' NOT NULL,
  subtotal NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  shipping_cost NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  total_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  notes TEXT,
  issued_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_po_store_number UNIQUE(store_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_ordered NUMERIC(12, 3) NOT NULL,
  quantity_received NUMERIC(12, 3) DEFAULT 0 NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL,
  total_cost NUMERIC(12, 2) NOT NULL,
  lot_number TEXT,
  expiration_date DATE
);

-- Orders, Order Items & Payments
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  channel order_channel_enum DEFAULT 'IN_STORE' NOT NULL,
  status order_status_enum DEFAULT 'PENDING' NOT NULL,
  subtotal NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  discount_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  shipping_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  total_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_order_store_number UNIQUE(store_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders(store_id);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES public.stock_batches(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  unit_cost NUMERIC(12, 2),
  discount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  method payment_method_enum NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status payment_status_enum DEFAULT 'PENDING' NOT NULL,
  transaction_id TEXT,
  provider TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_code TEXT,
  shipping_type TEXT,
  cost NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL,
  delivery_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notifications & Audit Logs
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS & ATOMIC RPCS
-- ------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_global_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.has_store_access(check_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.is_global_admin() OR EXISTS (
    SELECT 1 FROM public.store_users
    WHERE store_id = check_store_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.has_store_role(check_store_id UUID, required_roles user_role_enum[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.is_global_admin() OR EXISTS (
    SELECT 1 FROM public.store_users
    WHERE store_id = check_store_id
      AND user_id = auth.uid()
      AND is_active = TRUE
      AND (role = 'STORE_ADMIN' OR role = ANY(required_roles))
  );
$$;

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

  FOR v_item IN
    SELECT oi.id, oi.product_id, oi.batch_id, oi.quantity, p.name AS product_name, p.controls_batch
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
  LOOP
    SELECT quantity INTO v_current_stock
    FROM public.stock_balances
    WHERE store_id = v_store_id AND product_id = v_item.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
      VALUES (v_store_id, v_item.product_id, -v_item.quantity, 0);
      v_current_stock := 0;
    ELSE
      UPDATE public.stock_balances
      SET quantity = quantity - v_item.quantity,
          updated_at = NOW()
      WHERE store_id = v_store_id AND product_id = v_item.product_id;
    END IF;

    IF v_item.batch_id IS NOT NULL THEN
      UPDATE public.stock_batches
      SET quantity = GREATEST(0, quantity - v_item.quantity),
          status = CASE WHEN quantity - v_item.quantity <= 0 THEN 'DEPLETED'::batch_status_enum ELSE status END,
          updated_at = NOW()
      WHERE id = v_item.batch_id;
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

  UPDATE public.orders
  SET status = 'CONFIRMED',
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

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

  FOR v_item IN
    SELECT oi.id, oi.product_id, oi.batch_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
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

    IF v_item.batch_id IS NOT NULL THEN
      UPDATE public.stock_batches
      SET quantity = quantity + v_item.quantity,
          status = 'ACTIVE'::batch_status_enum,
          updated_at = NOW()
      WHERE id = v_item.batch_id;
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

  FOR v_item IN
    SELECT poi.id, poi.product_id, poi.quantity_ordered, poi.unit_cost, poi.lot_number, poi.expiration_date
    FROM public.purchase_order_items poi
    WHERE poi.purchase_order_id = p_purchase_order_id
  LOOP
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

    UPDATE public.products
    SET cost_price = v_item.unit_cost,
        updated_at = NOW()
    WHERE id = v_item.product_id;

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

    UPDATE public.purchase_order_items
    SET quantity_received = quantity_ordered
    WHERE id = v_item.id;
  END LOOP;

  UPDATE public.purchase_orders
  SET status = 'RECEIVED',
      received_at = NOW(),
      updated_at = NOW()
  WHERE id = p_purchase_order_id;

  RETURN TRUE;
END;
$$;

-- Automatic Profile Creation Trigger
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

-- ------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_global_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Stores Policies
DROP POLICY IF EXISTS "Stores select policy" ON public.stores;
CREATE POLICY "Stores select policy"
  ON public.stores FOR SELECT
  USING (
    public.is_global_admin()
    OR (is_active = TRUE AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM public.store_users WHERE store_id = id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Stores insert policy" ON public.stores;
CREATE POLICY "Stores insert policy"
  ON public.stores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Stores update policy" ON public.stores;
CREATE POLICY "Stores update policy"
  ON public.stores FOR UPDATE
  USING (public.has_store_role(id, ARRAY['STORE_ADMIN']::user_role_enum[]));

-- Store Users Policies
DROP POLICY IF EXISTS "Store users view policy" ON public.store_users;
CREATE POLICY "Store users view policy"
  ON public.store_users FOR SELECT
  USING (user_id = auth.uid() OR public.has_store_access(store_id));

DROP POLICY IF EXISTS "Store users manage policy" ON public.store_users;
CREATE POLICY "Store users manage policy"
  ON public.store_users FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]));

-- Roles & Permissions (Select by all authenticated)
DROP POLICY IF EXISTS "Roles read policy" ON public.roles;
CREATE POLICY "Roles read policy" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permissions read policy" ON public.permissions;
CREATE POLICY "Permissions read policy" ON public.permissions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Role permissions read policy" ON public.role_permissions;
CREATE POLICY "Role permissions read policy" ON public.role_permissions FOR SELECT USING (auth.role() = 'authenticated');

-- Categories, Brands & Manufacturers
DROP POLICY IF EXISTS "Categories select policy" ON public.categories;
CREATE POLICY "Categories select policy" ON public.categories FOR SELECT USING (public.has_store_access(store_id) OR true);

DROP POLICY IF EXISTS "Categories modify policy" ON public.categories;
CREATE POLICY "Categories modify policy" ON public.categories FOR ALL USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'SELLER']::user_role_enum[]));

DROP POLICY IF EXISTS "Brands select policy" ON public.brands;
CREATE POLICY "Brands select policy" ON public.brands FOR SELECT USING (public.has_store_access(store_id) OR true);

DROP POLICY IF EXISTS "Brands modify policy" ON public.brands;
CREATE POLICY "Brands modify policy" ON public.brands FOR ALL USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

DROP POLICY IF EXISTS "Manufacturers select policy" ON public.manufacturers;
CREATE POLICY "Manufacturers select policy" ON public.manufacturers FOR SELECT USING (public.has_store_access(store_id) OR true);

DROP POLICY IF EXISTS "Manufacturers modify policy" ON public.manufacturers;
CREATE POLICY "Manufacturers modify policy" ON public.manufacturers FOR ALL USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

-- Products & Images
DROP POLICY IF EXISTS "Products select policy" ON public.products;
CREATE POLICY "Products select policy" ON public.products FOR SELECT
  USING ((deleted_at IS NULL AND is_published_catalog = TRUE AND is_active = TRUE) OR public.has_store_access(store_id));

DROP POLICY IF EXISTS "Products insert policy" ON public.products;
CREATE POLICY "Products insert policy" ON public.products FOR INSERT
  WITH CHECK (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

DROP POLICY IF EXISTS "Products update policy" ON public.products;
CREATE POLICY "Products update policy" ON public.products FOR UPDATE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

DROP POLICY IF EXISTS "Products delete policy" ON public.products;
CREATE POLICY "Products delete policy" ON public.products FOR DELETE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]));

DROP POLICY IF EXISTS "Product images select policy" ON public.product_images;
CREATE POLICY "Product images select policy" ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Product images modify policy" ON public.product_images;
CREATE POLICY "Product images modify policy" ON public.product_images FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

-- Stock Balances & Batches & Movements
DROP POLICY IF EXISTS "Stock balances select policy" ON public.stock_balances;
CREATE POLICY "Stock balances select policy" ON public.stock_balances FOR SELECT USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Stock balances modify policy" ON public.stock_balances;
CREATE POLICY "Stock balances modify policy" ON public.stock_balances FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'SELLER']::user_role_enum[]));

DROP POLICY IF EXISTS "Stock batches select policy" ON public.stock_batches;
CREATE POLICY "Stock batches select policy" ON public.stock_batches FOR SELECT USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Stock batches modify policy" ON public.stock_batches;
CREATE POLICY "Stock batches modify policy" ON public.stock_batches FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

DROP POLICY IF EXISTS "Stock movements select policy" ON public.stock_movements;
CREATE POLICY "Stock movements select policy" ON public.stock_movements FOR SELECT USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Stock movements insert policy" ON public.stock_movements;
CREATE POLICY "Stock movements insert policy" ON public.stock_movements FOR INSERT
  WITH CHECK (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'SELLER']::user_role_enum[]));

-- Customers & Suppliers
DROP POLICY IF EXISTS "Customers select policy" ON public.customers;
CREATE POLICY "Customers select policy" ON public.customers FOR SELECT USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Customers modify policy" ON public.customers;
CREATE POLICY "Customers modify policy" ON public.customers FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'SELLER', 'FINANCE']::user_role_enum[]));

DROP POLICY IF EXISTS "Suppliers select policy" ON public.suppliers;
CREATE POLICY "Suppliers select policy" ON public.suppliers FOR SELECT USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Suppliers modify policy" ON public.suppliers;
CREATE POLICY "Suppliers modify policy" ON public.suppliers FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'FINANCE']::user_role_enum[]));

-- Purchase Orders & Orders
DROP POLICY IF EXISTS "Purchase orders select policy" ON public.purchase_orders;
CREATE POLICY "Purchase orders select policy" ON public.purchase_orders FOR SELECT USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Purchase orders modify policy" ON public.purchase_orders;
CREATE POLICY "Purchase orders modify policy" ON public.purchase_orders FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'FINANCE']::user_role_enum[]));

DROP POLICY IF EXISTS "Purchase order items select policy" ON public.purchase_order_items;
CREATE POLICY "Purchase order items select policy" ON public.purchase_order_items FOR SELECT USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Purchase order items modify policy" ON public.purchase_order_items;
CREATE POLICY "Purchase order items modify policy" ON public.purchase_order_items FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'FINANCE']::user_role_enum[]));

DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
CREATE POLICY "Orders select policy" ON public.orders FOR SELECT
  USING (public.has_store_access(store_id) OR (user_id IS NOT NULL AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
CREATE POLICY "Orders insert policy" ON public.orders FOR INSERT
  WITH CHECK (public.has_store_access(store_id) OR channel IN ('CATALOG', 'WHATSAPP'));

DROP POLICY IF EXISTS "Orders update policy" ON public.orders;
CREATE POLICY "Orders update policy" ON public.orders FOR UPDATE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'SELLER', 'FINANCE']::user_role_enum[]));

DROP POLICY IF EXISTS "Order items select policy" ON public.order_items;
CREATE POLICY "Order items select policy" ON public.order_items FOR SELECT
  USING (public.has_store_access(store_id) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "Order items insert policy" ON public.order_items;
CREATE POLICY "Order items insert policy" ON public.order_items FOR INSERT
  WITH CHECK (public.has_store_access(store_id) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.channel IN ('CATALOG', 'WHATSAPP')));

DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
CREATE POLICY "Payments select policy" ON public.payments FOR SELECT
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'FINANCE', 'SELLER']::user_role_enum[]));

DROP POLICY IF EXISTS "Payments modify policy" ON public.payments;
CREATE POLICY "Payments modify policy" ON public.payments FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'FINANCE', 'SELLER']::user_role_enum[]));

DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
CREATE POLICY "Notifications select policy" ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.has_store_access(store_id));

DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;
CREATE POLICY "Notifications update policy" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.has_store_access(store_id));

DROP POLICY IF EXISTS "Audit logs select policy" ON public.audit_logs;
CREATE POLICY "Audit logs select policy" ON public.audit_logs FOR SELECT
  USING (public.is_global_admin() OR (store_id IS NOT NULL AND public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[])));

DROP POLICY IF EXISTS "Audit logs insert policy" ON public.audit_logs;
CREATE POLICY "Audit logs insert policy" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------
-- 5. STORAGE BUCKETS
-- ------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('products', 'products', true),
  ('stores', 'stores', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------
-- 6. SYSTEM ROLES & PERMISSIONS SEED DATA
-- ------------------------------------------------------------------------
INSERT INTO public.roles (code, name, description, is_system)
VALUES
  ('GLOBAL_ADMIN', 'Administrador Global', 'Acesso irrestrito a todas as lojas e configurações do sistema', TRUE),
  ('STORE_ADMIN', 'Administrador da Loja', 'Gestão completa da loja, equipe, produtos, clientes e configurações', TRUE),
  ('FINANCE', 'Financeiro', 'Gestão financeira, relatórios de vendas, compras e pagamentos', TRUE),
  ('SELLER', 'Vendedor', 'Realização de vendas, emissão de pedidos e consulta de catálogo', TRUE),
  ('INVENTORY', 'Estoquista', 'Controle de estoque, entradas, saídas, conferência e lotes', TRUE),
  ('VIEWER', 'Visualizador', 'Acesso somente leitura a consultas e relatórios operacionais', TRUE)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.permissions (code, name, module, description)
VALUES
  ('products.read', 'Visualizar Produtos', 'products', 'Permite consultar o catálogo de produtos'),
  ('products.create', 'Cadastrar Produtos', 'products', 'Permite criar novos produtos'),
  ('products.update', 'Editar Produtos', 'products', 'Permite alterar produtos e preços'),
  ('products.delete', 'Excluir Produtos', 'products', 'Permite inativar ou excluir produtos'),
  ('inventory.read', 'Visualizar Estoque', 'inventory', 'Permite consultar saldos e lotes'),
  ('inventory.adjust', 'Ajustar Estoque', 'inventory', 'Permite realizar correções e ajustes de estoque'),
  ('inventory.receive', 'Receber Mercadorias', 'inventory', 'Permite lançar entradas de estoque'),
  ('inventory.writeoff', 'Dar Baixa em Estoque', 'inventory', 'Permite baixas por perda, quebra ou vencimento'),
  ('sales.read', 'Visualizar Vendas', 'sales', 'Permite consultar vendas e pedidos'),
  ('sales.create', 'Realizar Vendas', 'sales', 'Permite abrir novas vendas no PDV ou pedidos'),
  ('sales.update', 'Alterar Pedidos', 'sales', 'Permite editar pedidos em andamento'),
  ('sales.cancel', 'Cancelar Vendas', 'sales', 'Permite estornar vendas e restaurar estoque'),
  ('customers.read', 'Visualizar Clientes', 'customers', 'Permite consultar base de clientes'),
  ('customers.create', 'Cadastrar Clientes', 'customers', 'Permite cadastrar novos clientes'),
  ('customers.update', 'Editar Clientes', 'customers', 'Permite atualizar dados de clientes'),
  ('customers.delete', 'Excluir Clientes', 'customers', 'Permite remover clientes da loja'),
  ('suppliers.read', 'Visualizar Fornecedores', 'suppliers', 'Permite consultar fornecedores'),
  ('suppliers.create', 'Cadastrar Fornecedores', 'suppliers', 'Permite cadastrar novos fornecedores'),
  ('suppliers.update', 'Editar Fornecedores', 'suppliers', 'Permite atualizar fornecedores'),
  ('suppliers.delete', 'Excluir Fornecedores', 'suppliers', 'Permite remover fornecedores'),
  ('purchase_orders.read', 'Visualizar Compras', 'purchasing', 'Permite consultar ordens de compra'),
  ('purchase_orders.create', 'Criar Ordem de Compra', 'purchasing', 'Permite emitir novas ordens de compra'),
  ('purchase_orders.update', 'Editar Ordem de Compra', 'purchasing', 'Permite alterar ordens de compra'),
  ('purchase_orders.cancel', 'Cancelar Ordem de Compra', 'purchasing', 'Permite cancelar ordens de compra'),
  ('purchase_orders.receive', 'Receber Compras', 'purchasing', 'Permite dar entrada no estoque via compra'),
  ('reports.sales', 'Relatório de Vendas', 'reports', 'Permite gerar relatórios de faturamento e vendas'),
  ('reports.inventory', 'Relatório de Estoque', 'reports', 'Permite relatórios de saldos, curvas e perdas'),
  ('reports.customers', 'Relatório de Clientes', 'reports', 'Permite relatórios de clientes e ticket médio'),
  ('reports.suppliers', 'Relatório de Fornecedores', 'reports', 'Permite relatórios de compras e fornecedores'),
  ('stores.manage', 'Gerenciar Loja', 'stores', 'Permite alterar dados cadastrais e tema da loja'),
  ('users.manage', 'Gerenciar Equipe', 'users', 'Permite convidar membros e alterar papéis'),
  ('roles.manage', 'Gerenciar Funções', 'roles', 'Permite gerenciar funções personalizadas'),
  ('permissions.manage', 'Gerenciar Permissões', 'permissions', 'Permite configurar permissões')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT 'STORE_ADMIN', code FROM public.permissions
ON CONFLICT (role_code, permission_code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
VALUES
  ('SELLER', 'products.read'),
  ('SELLER', 'inventory.read'),
  ('SELLER', 'sales.read'),
  ('SELLER', 'sales.create'),
  ('SELLER', 'sales.update'),
  ('SELLER', 'customers.read'),
  ('SELLER', 'customers.create'),
  ('SELLER', 'customers.update'),
  ('SELLER', 'reports.sales')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Populate existing users from auth.users into profiles if any
INSERT INTO public.profiles (id, email, full_name, is_global_admin)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  (email = 'willian.o.jesus@gmail.com')
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET is_global_admin = CASE 
  WHEN EXCLUDED.email = 'willian.o.jesus@gmail.com' THEN TRUE 
  ELSE profiles.is_global_admin 
END;
