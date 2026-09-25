-- ========================================================================
-- SPRINT 02: SUPABASE FOUNDATION - STORAGE BUCKETS & SECURITY POLICIES
-- Multi-Tenant Image & Asset Isolation
-- ========================================================================

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('products', 'products', true),
  ('stores', 'stores', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------
-- Storage Policies for 'products' bucket
-- Path format: {store_id}/{product_id}/{filename}
-- ------------------------------------------------------------------------
CREATE POLICY "Public Read Product Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Tenant Staff Upload Product Images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND (
      public.is_global_admin()
      OR public.has_store_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]
      )
    )
  );

CREATE POLICY "Tenant Staff Delete Product Images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products'
    AND (
      public.is_global_admin()
      OR public.has_store_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]
      )
    )
  );

-- ------------------------------------------------------------------------
-- Storage Policies for 'stores' bucket (logos, banners)
-- Path format: {store_id}/{filename}
-- ------------------------------------------------------------------------
CREATE POLICY "Public Read Store Logos & Banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stores');

CREATE POLICY "Store Admin Upload Store Assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stores'
    AND (
      public.is_global_admin()
      OR public.has_store_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['STORE_ADMIN']::user_role_enum[]
      )
    )
  );

-- ------------------------------------------------------------------------
-- Storage Policies for 'avatars' bucket
-- Path format: {user_id}/{filename}
-- ------------------------------------------------------------------------
CREATE POLICY "Public Read Avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "User Upload Avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      public.is_global_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
