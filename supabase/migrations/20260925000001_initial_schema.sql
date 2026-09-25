-- ========================================================================
-- SPRINT 02: SUPABASE FOUNDATION - INITIAL SCHEMA
-- Multi-Tenant SaaS Platform for Inventory & Store Management
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
CREATE TYPE user_role_enum AS ENUM (
  'GLOBAL_ADMIN',
  'STORE_ADMIN',
  'FINANCE',
  'SELLER',
  'INVENTORY',
  'VIEWER'
);

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

CREATE TYPE order_channel_enum AS ENUM (
  'IN_STORE',
  'WHATSAPP',
  'CATALOG',
  'ECOMMERCE',
  'API'
);

CREATE TYPE payment_method_enum AS ENUM (
  'CASH',
  'PIX',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BOLETO',
  'BANK_TRANSFER',
  'OTHER'
);

CREATE TYPE payment_status_enum AS ENUM (
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'REFUNDED',
  'FAILED',
  'CANCELLED'
);

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

CREATE TYPE batch_status_enum AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'DEPLETED',
  'BLOCKED'
);

CREATE TYPE purchase_order_status_enum AS ENUM (
  'DRAFT',
  'ISSUED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED'
);

-- ------------------------------------------------------------------------
-- 1. Profiles (Linked to auth.users)
-- ------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------
-- 2. Stores (Tenants)
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_stores_slug ON public.stores(slug);
CREATE INDEX idx_stores_is_active ON public.stores(is_active);

-- ------------------------------------------------------------------------
-- 3. Store Users (Tenant membership & RBAC mapping)
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_store_users_store ON public.store_users(store_id);
CREATE INDEX idx_store_users_user ON public.store_users(user_id);

-- ------------------------------------------------------------------------
-- 4. Roles & Permissions Master Tables
-- ------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------
-- 5. Categories, Brands & Manufacturers
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_categories_store ON public.categories(store_id);

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

-- ------------------------------------------------------------------------
-- 6. Suppliers & Contacts
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_suppliers_store ON public.suppliers(store_id);

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

-- ------------------------------------------------------------------------
-- 7. Customers & Addresses
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_customers_store ON public.customers(store_id);

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

-- ------------------------------------------------------------------------
-- 8. Products & Images
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_category ON public.products(category_id);

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

CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- ------------------------------------------------------------------------
-- 9. Stock Balances, Movements, Batches & Physical Counts
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_stock_balances_store ON public.stock_balances(store_id);
CREATE INDEX idx_stock_balances_product ON public.stock_balances(product_id);

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

CREATE INDEX idx_stock_batches_store ON public.stock_batches(store_id);
CREATE INDEX idx_stock_batches_expiration ON public.stock_batches(expiration_date);

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

CREATE INDEX idx_stock_movements_store ON public.stock_movements(store_id);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(created_at);

CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'IN_PROGRESS' NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_count_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  system_quantity NUMERIC(12, 3) NOT NULL,
  counted_quantity NUMERIC(12, 3) NOT NULL,
  difference NUMERIC(12, 3) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  adjusted BOOLEAN DEFAULT FALSE NOT NULL
);

-- ------------------------------------------------------------------------
-- 10. Purchase Orders, Items & Receipts
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_purchase_orders_store ON public.purchase_orders(store_id);

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

-- ------------------------------------------------------------------------
-- 11. Orders, Order Items, Payments & Shipments
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_orders_store ON public.orders(store_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at);

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

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

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

-- ------------------------------------------------------------------------
-- 12. Public Catalogs Customization
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT,
  custom_theme JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------
-- 13. Notifications, Audit Logs & Security Logs
-- ------------------------------------------------------------------------
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

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_store ON public.notifications(store_id);

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

CREATE INDEX idx_audit_logs_store ON public.audit_logs(store_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
