-- ========================================================================
-- SPRINT 06: PRODUCT IMAGE GALLERY + STORE MEDIA LIBRARY
-- Biblioteca de mídia da loja + integridade da galeria de produtos
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. Biblioteca de mídia (independente de produtos)
--    Guarda arquivos enviados pela loja, allowing reuso em varios produtos.
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_library_store
  ON public.media_library(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_library_path
  ON public.media_library(storage_path);

-- Evita registrar o mesmo arquivo duas vezes na biblioteca
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_library_store_path
  ON public.media_library(store_id, storage_path);

-- ------------------------------------------------------------------------
-- 2. Integridade da galeria: apenas uma imagem principal por produto
-- ------------------------------------------------------------------------
-- Normaliza dados existentes (mantem a primeira como principal)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY is_primary DESC, display_order ASC, created_at ASC) AS rn
  FROM public.product_images
)
UPDATE public.product_images pi
SET is_primary = FALSE
FROM ranked r
WHERE pi.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_single_primary
  ON public.product_images(product_id)
  WHERE is_primary;

-- ------------------------------------------------------------------------
-- 3. Limites do bucket 'products'
-- ------------------------------------------------------------------------
UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
WHERE id = 'products';

-- ------------------------------------------------------------------------
-- 4. Policy de UPDATE no storage (necessaria para sobrescrever arquivo)
-- ------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant Staff Update Product Images" ON storage.objects;

CREATE POLICY "Tenant Staff Update Product Images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'products'
    AND (
      public.is_global_admin()
      OR public.has_store_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[]
      )
    )
  )
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

-- ------------------------------------------------------------------------
-- 5. RLS da biblioteca de midia
-- ------------------------------------------------------------------------
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Media library select: tenant" ON public.media_library;
CREATE POLICY "Media library select: tenant"
  ON public.media_library FOR SELECT
  USING (public.has_store_access(store_id));

DROP POLICY IF EXISTS "Media library insert: tenant staff" ON public.media_library;
CREATE POLICY "Media library insert: tenant staff"
  ON public.media_library FOR INSERT
  WITH CHECK (
    public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[])
  );

DROP POLICY IF EXISTS "Media library update: tenant staff" ON public.media_library;
CREATE POLICY "Media library update: tenant staff"
  ON public.media_library FOR UPDATE
  USING (
    public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[])
  )
  WITH CHECK (
    public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[])
  );

DROP POLICY IF EXISTS "Media library delete: tenant staff" ON public.media_library;
CREATE POLICY "Media library delete: tenant staff"
  ON public.media_library FOR DELETE
  USING (
    public.has_store_role(store_id, ARRAY['STORE_ADMIN', 'INVENTORY']::user_role_enum[])
  );
