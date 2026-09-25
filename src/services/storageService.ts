import { supabase } from '@/lib/supabase/client'

export const storageService = {
  async uploadProductImage(
    storeId: string,
    productId: string,
    file: File
  ): Promise<{ publicUrl: string; storagePath: string }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    const storagePath = `${storeId}/${productId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(storagePath)

    // Also register image in product_images table
    await supabase.from('product_images').insert({
      product_id: productId,
      store_id: storeId,
      storage_path: storagePath,
      public_url: publicUrl,
      is_primary: false,
      display_order: 0,
    })

    return { publicUrl, storagePath }
  },

  async deleteProductImage(imageId: string, storagePath: string): Promise<void> {
    // 1. Delete from bucket
    await supabase.storage.from('products').remove([storagePath])
    // 2. Delete database record
    await supabase.from('product_images').delete().eq('id', imageId)
  },

  async uploadStoreLogo(storeId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const storagePath = `${storeId}/logo-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('stores')
      .upload(storagePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('stores')
      .getPublicUrl(storagePath)

    await supabase.from('stores').update({ logo_url: publicUrl }).eq('id', storeId)
    return publicUrl
  },
}
