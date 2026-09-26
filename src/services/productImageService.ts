import { supabase } from '@/lib/supabase/client'
import type { ProductImage } from '@/types/product.types'

const BUCKET = 'products'
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]
export const ACCEPTED_IMAGE_EXT = '.jpg,.jpeg,.png,.webp,.gif,.avif'

export interface LibraryImage {
  id: string
  store_id: string
  file_name: string
  storage_path: string
  public_url: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  source: 'library' | 'product'
  product_id?: string | null
  product_name?: string | null
}

export interface ReusableImage {
  kind: 'library' | 'product'
  refId: string
  storagePath: string
  publicUrl: string
  label: string
  fileName: string
}

function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'imagem'
  )
}

function buildPath(prefix: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
  const stamp = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  return `${prefix}/${stamp}-${slugify(fileName.replace(/\.[^.]+$/, ''))}.${ext}`
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" não é um formato de imagem aceito (use JPG, PNG, WEBP, GIF ou AVIF).`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB e o limite é 10 MB.`
  }
  return null
}

function publicUrlFor(storagePath: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

/** Remove o objeto do bucket apenas se nenhuma outra linha o referencia. */
async function removeIfOrphan(
  storagePath: string,
  opts: { ignoreImageId?: string } = {}
): Promise<void> {
  const { data: stillUsedByImage } = await supabase
    .from('product_images')
    .select('id')
    .eq('storage_path', storagePath)
    .limit(1)

  if (stillUsedByImage && stillUsedByImage.length > 0) {
    const kept = opts.ignoreImageId
      ? stillUsedByImage.some((row: any) => row.id !== opts.ignoreImageId)
      : true
    if (kept) return
  }

  const { data: stillUsedByLibrary } = await supabase
    .from('media_library')
    .select('id')
    .eq('storage_path', storagePath)
    .limit(1)

  if (stillUsedByLibrary && stillUsedByLibrary.length > 0) return

  await supabase.storage.from(BUCKET).remove([storagePath])
}

export const productImageService = {
  // ------------------------------------------------------------------
  // Leitura
  // ------------------------------------------------------------------
  async listProductImages(productId: string): Promise<ProductImage[]> {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  async listLibrary(storeId: string, search?: string): Promise<LibraryImage[]> {
    let query = supabase
      .from('media_library')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(120)

    if (search?.trim()) {
      query = query.ilike('file_name', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any) => ({ ...row, source: 'library' as const }))
  },

  async listReusableFromProducts(
    storeId: string,
    excludeProductId: string,
    search?: string
  ): Promise<LibraryImage[]> {
    const { data, error } = await supabase
      .from('product_images')
      .select('*, products ( id, name )')
      .eq('store_id', storeId)
      .neq('product_id', excludeProductId)
      .order('created_at', { ascending: false })
      .limit(120)

    if (error) throw error

    let rows = data || []
    if (search?.trim()) {
      const term = search.trim().toLowerCase()
      rows = rows.filter(
        (row: any) =>
          row.products?.name?.toLowerCase().includes(term) ||
          row.storage_path.toLowerCase().includes(term)
      )
    }

    return rows.map((row: any) => ({
      id: row.id,
      store_id: row.store_id,
      file_name: row.products?.name || 'Imagem de produto',
      storage_path: row.storage_path,
      public_url: row.public_url,
      mime_type: null,
      size_bytes: null,
      created_at: row.created_at,
      source: 'product' as const,
      product_id: row.product_id,
      product_name: row.products?.name ?? null,
    }))
  },

  // ------------------------------------------------------------------
  // Upload
  // ------------------------------------------------------------------
  async uploadToLibrary(storeId: string, file: File): Promise<LibraryImage> {
    const storagePath = buildPath(`${storeId}/library`, file.name)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { cacheControl: '31536000', upsert: false })

    if (uploadError) throw uploadError

    const { data: libraryRows, error: insertError } = await supabase
      .from('media_library')
      .insert({
        store_id: storeId,
        file_name: file.name,
        storage_path: storagePath,
        public_url: publicUrlFor(storagePath),
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select('*')
      .single()

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      throw insertError
    }

    return { ...libraryRows, source: 'library' }
  },

  async uploadProductImages(
    storeId: string,
    productId: string,
    files: File[],
    hasExistingImages: boolean
  ): Promise<ProductImage[]> {
    const uploaded: ProductImage[] = []
    const { data: current } = await supabase
      .from('product_images')
      .select('id, display_order')
      .eq('product_id', productId)

    const startOrder = (current || []).reduce(
      (max, row: any) => Math.max(max, row.display_order ?? 0),
      -1
    ) + 1

    for (const [index, file] of files.entries()) {
      const invalid = validateImageFile(file)
      if (invalid) throw new Error(invalid)

      const storagePath = buildPath(`${storeId}/${productId}`, file.name)

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { cacheControl: '31536000', upsert: false })

      if (uploadError) throw uploadError

      const publicUrl = publicUrlFor(storagePath)

      const { data, error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          store_id: storeId,
          storage_path: storagePath,
          public_url: publicUrl,
          is_primary: !hasExistingImages && index === 0,
          display_order: startOrder + index,
        })
        .select('*')
        .single()

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([storagePath])
        throw insertError
      }

      // Mantem o arquivo disponivel na biblioteca da loja para reuso future
      await supabase.from('media_library').upsert(
        {
          store_id: storeId,
          file_name: file.name,
          storage_path: storagePath,
          public_url: publicUrl,
          mime_type: file.type,
          size_bytes: file.size,
        },
        { onConflict: 'store_id,storage_path', ignoreDuplicates: true }
      )

      uploaded.push(data as ProductImage)
    }

    return uploaded
  },

  // ------------------------------------------------------------------
  // Reuso de imagens ja existentes
  // ------------------------------------------------------------------
  async attachExistingImage(
    storeId: string,
    productId: string,
    source: { storagePath: string; fileName: string },
    displayOrder: number,
    hasExistingImages: boolean
  ): Promise<ProductImage> {
    const storagePath = buildPath(`${storeId}/${productId}`, source.fileName)

    const { error: copyError } = await supabase.storage
      .from(BUCKET)
      .copy(source.storagePath, storagePath)

    if (copyError) throw copyError

    const publicUrl = publicUrlFor(storagePath)

    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        store_id: storeId,
        storage_path: storagePath,
        public_url: publicUrl,
        is_primary: !hasExistingImages,
        display_order: displayOrder,
      })
      .select('*')
      .single()

    if (error) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      throw error
    }

    return data as ProductImage
  },

  // ------------------------------------------------------------------
  // Organizacao
  // ------------------------------------------------------------------
  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', productId)
      .neq('id', imageId)

    const { error } = await supabase
      .from('product_images')
      .update({ is_primary: true, display_order: 0 })
      .eq('id', imageId)
      .eq('product_id', productId)

    if (error) throw error

    const { data: others } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .neq('id', imageId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (others?.length) {
      await productImageService.reorderImages(
        productId,
        others.map((row: any) => row.id)
      )
    }
  },

  async reorderImages(productId: string, orderedIds: string[]): Promise<void> {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await supabase
        .from('product_images')
        .update({ display_order: index })
        .eq('id', orderedIds[index])
        .eq('product_id', productId)
    }
  },

  // ------------------------------------------------------------------
  // Remocao
  // ------------------------------------------------------------------
  async removeProductImage(image: ProductImage): Promise<void> {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', image.id)
    if (error) throw error

    await removeIfOrphan(image.storage_path, { ignoreImageId: image.id })

    const { data: remaining } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', image.product_id)
      .eq('is_primary', true)
      .limit(1)

    if (!remaining || remaining.length === 0) {
      const { data: fallback } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', image.product_id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)

      if (fallback?.length) {
        await supabase
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', fallback[0].id)
      }
    }
  },

  async removeLibraryImage(image: LibraryImage): Promise<void> {
    const { error } = await supabase.from('media_library').delete().eq('id', image.id)
    if (error) throw error
    await removeIfOrphan(image.storage_path)
  },
}
