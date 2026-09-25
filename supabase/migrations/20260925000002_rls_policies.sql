-- ========================================================================
-- SPRINT 02: SUPABASE FOUNDATION - ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Multi-Tenant Isolation & Role Authorization
-- ========================================================================

-- Helper Function: Check if auth.uid() is Global Admin
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

-- Helper Function: Check if auth.uid() belongs to active store
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

-- Helper Function: Check if user has specific role or admin in store
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

-- ========================================================================
-- ENABLE RLS ON ALL TABLES
-- ========================================================================
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
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------
-- 1. Profiles Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_global_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ------------------------------------------------------------------------
-- 2. Stores Policies (Public catalog read + Member management)
-- ------------------------------------------------------------------------
CREATE POLICY "Stores select policy: Members or Public active catalog"
  ON public.stores FOR SELECT
  USING (
    public.is_global_admin()
    OR (is_active = TRUE AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM public.store_users WHERE store_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Stores insert policy: Global Admins or Authenticated user creating initial store"
  ON public.stores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Stores update policy: Store Admin or Global Admin"
  ON public.stores FOR UPDATE
  USING (public.has_store_role(id, ARRAY['STORE_ADMIN']::user_role_enum[]));

CREATE POLICY "Stores delete policy: Global Admin only (soft delete)"
  ON public.stores FOR DELETE
  USING (public.is_global_admin());

-- ------------------------------------------------------------------------
-- 3. Store Users Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Store users view policy"
  ON public.store_users FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_store_access(store_id)
  );

CREATE POLICY "Store users manage policy"
  ON public.store_users FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 4. Roles & Permissions Policies (Read by authenticated)
-- ------------------------------------------------------------------------
CREATE POLICY "Roles read by all authenticated"
  ON public.roles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Permissions read by all authenticated"
  ON public.permissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Role permissions read by all authenticated"
  ON public.role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------
-- 5. Categories, Brands & Manufacturers Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Categories select: tenant or public"
  ON public.categories FOR SELECT
  USING (public.has_store_access(store_id) OR true);

CREATE POLICY "Categories modify: tenant staff"
  ON public.categories FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'SELLER']::user_role_enum[]));

CREATE POLICY "Brands select: tenant"
  ON public.brands FOR SELECT
  USING (public.has_store_access(store_id) OR true);

CREATE POLICY "Brands modify: tenant staff"
  ON public.brands FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

CREATE POLICY "Manufacturers select: tenant"
  ON public.manufacturers FOR SELECT
  USING (public.has_store_access(store_id) OR true);

CREATE POLICY "Manufacturers modify: tenant staff"
  ON public.manufacturers FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 6. Products & Product Images Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Products select: tenant member or published catalog"
  ON public.products FOR SELECT
  USING (
    (deleted_at IS NULL AND is_published_catalog = TRUE AND is_active = TRUE)
    OR public.has_store_access(store_id)
  );

CREATE POLICY "Products insert: tenant staff"
  ON public.products FOR INSERT
  WITH CHECK (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

CREATE POLICY "Products update: tenant staff"
  ON public.products FOR UPDATE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

CREATE POLICY "Products soft-delete: Store Admin"
  ON public.products FOR DELETE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]));

CREATE POLICY "Product images select: all"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "Product images modify: tenant staff"
  ON public.product_images FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 7. Stock Balances, Batches, Movements & Inventory Counts
-- ------------------------------------------------------------------------
CREATE POLICY "Stock balances select: tenant only"
  ON public.stock_balances FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Stock balances modify: tenant inventory or admin"
  ON public.stock_balances FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'SELLER']::user_role_enum[]));

CREATE POLICY "Stock batches select: tenant only"
  ON public.stock_batches FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Stock batches modify: tenant inventory or admin"
  ON public.stock_batches FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

CREATE POLICY "Stock movements select: tenant only"
  ON public.stock_movements FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Stock movements insert: tenant staff"
  ON public.stock_movements FOR INSERT
  WITH CHECK (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'SELLER']::user_role_enum[]));

CREATE POLICY "Inventory counts select: tenant staff"
  ON public.inventory_counts FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Inventory counts modify: tenant inventory or admin"
  ON public.inventory_counts FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

CREATE POLICY "Inventory count items select: tenant staff"
  ON public.inventory_count_items FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Inventory count items modify: tenant inventory or admin"
  ON public.inventory_count_items FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 8. Customers & Addresses Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Customers select: tenant only"
  ON public.customers FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Customers modify: tenant staff"
  ON public.customers FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'SELLER', 'FINANCE']::user_role_enum[]));

CREATE POLICY "Customer addresses select: tenant only"
  ON public.customer_addresses FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Customer addresses modify: tenant staff"
  ON public.customer_addresses FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'SELLER']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 9. Suppliers & Purchase Orders Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Suppliers select: tenant only"
  ON public.suppliers FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Suppliers modify: tenant staff"
  ON public.suppliers FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'FINANCE']::user_role_enum[]));

CREATE POLICY "Purchase orders select: tenant only"
  ON public.purchase_orders FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Purchase orders modify: tenant inventory or finance"
  ON public.purchase_orders FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'FINANCE']::user_role_enum[]));

CREATE POLICY "Purchase order items select: tenant only"
  ON public.purchase_order_items FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Purchase order items modify: tenant inventory or finance"
  ON public.purchase_order_items FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY', 'FINANCE']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 10. Orders, Order Items, Payments & Shipments Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Orders select: tenant staff or order creator"
  ON public.orders FOR SELECT
  USING (
    public.has_store_access(store_id)
    OR (user_id IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Orders insert: tenant staff or public checkout"
  ON public.orders FOR INSERT
  WITH CHECK (
    public.has_store_access(store_id)
    OR channel IN ('CATALOG', 'WHATSAPP')
  );

CREATE POLICY "Orders update: tenant staff"
  ON public.orders FOR UPDATE
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'SELLER', 'FINANCE']::user_role_enum[]));

CREATE POLICY "Order items select: tenant or order owner"
  ON public.order_items FOR SELECT
  USING (
    public.has_store_access(store_id)
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "Order items insert: tenant or public checkout"
  ON public.order_items FOR INSERT
  WITH CHECK (
    public.has_store_access(store_id)
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.channel IN ('CATALOG', 'WHATSAPP'))
  );

CREATE POLICY "Payments select: tenant finance or admin"
  ON public.payments FOR SELECT
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'FINANCE', 'SELLER']::user_role_enum[]));

CREATE POLICY "Payments modify: tenant staff"
  ON public.payments FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'FINANCE', 'SELLER']::user_role_enum[]));

CREATE POLICY "Shipments select: tenant only"
  ON public.shipments FOR SELECT
  USING (public.has_store_access(store_id));

CREATE POLICY "Shipments modify: tenant staff"
  ON public.shipments FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'SELLER', 'INVENTORY']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 11. Catalogs Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Catalogs select: public"
  ON public.catalogs FOR SELECT
  USING (is_published = TRUE OR public.has_store_access(store_id));

CREATE POLICY "Catalogs modify: store admin"
  ON public.catalogs FOR ALL
  USING (public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[]));

-- ------------------------------------------------------------------------
-- 12. Notifications & Audit Logs Policies
-- ------------------------------------------------------------------------
CREATE POLICY "Notifications select: recipient or store staff"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.has_store_access(store_id));

CREATE POLICY "Notifications update: recipient"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.has_store_access(store_id));

CREATE POLICY "Audit logs select: store admin or global admin"
  ON public.audit_logs FOR SELECT
  USING (public.is_global_admin() OR (store_id IS NOT NULL AND public.has_store_role(store_id, ARRAY['STORE_ADMIN']::user_role_enum[])));

CREATE POLICY "Audit logs insert: system and authenticated"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Security logs select: global admin only"
  ON public.security_logs FOR SELECT
  USING (public.is_global_admin());
