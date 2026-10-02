import { supabase } from '@/lib/supabase/client'
import JSZip from 'jszip'

export interface BackupProgress {
  status: 'idle' | 'fetching_data' | 'generating_sql' | 'downloading_images' | 'compressing_zip' | 'done' | 'error'
  percent: number
  message: string
}

export const backupService = {
  /**
   * Gera um arquivo de dump SQL completo com comandos INSERT INTO para todas as tabelas
   * filtrado pela loja selecionada ou de todo o sistema.
   */
  async generateStoreSQLDump(
    storeId?: string,
    storeName?: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<void> {
    onProgress?.({ status: 'fetching_data', percent: 10, message: 'Consultando tabelas do banco de dados...' })

    const tablesToExport = [
      { name: 'stores', query: supabase.from('stores').select('*') },
      { name: 'categories', query: supabase.from('categories').select('*') },
      { name: 'products', query: supabase.from('products').select('*') },
      { name: 'product_images', query: supabase.from('product_images').select('*') },
      { name: 'cost_centers', query: supabase.from('cost_centers').select('*') },
      { name: 'loss_reasons', query: supabase.from('loss_reasons').select('*') },
      { name: 'stock_balances', query: supabase.from('stock_balances').select('*') },
      { name: 'stock_batches', query: supabase.from('stock_batches').select('*') },
      { name: 'stock_movements', query: supabase.from('stock_movements').select('*') },
      { name: 'customers', query: supabase.from('customers').select('*') },
      { name: 'suppliers', query: supabase.from('suppliers').select('*') },
      { name: 'purchase_orders', query: supabase.from('purchase_orders').select('*') },
      { name: 'purchase_order_items', query: supabase.from('purchase_order_items').select('*') },
      { name: 'orders', query: supabase.from('orders').select('*') },
      { name: 'order_items', query: supabase.from('order_items').select('*') },
    ]

    const sqlLines: string[] = [
      `-- =====================================================================`,
      `-- OLIVELAS GESTÃO - BACKUP DE BANCO DE DADOS SQL`,
      `-- Escopo: ${storeId ? `Loja: ${storeName || storeId}` : 'Backup Global (Todas as Lojas)'}`,
      `-- Data do Backup: ${new Date().toISOString()}`,
      `-- Plataforma: Olivelas Gestão de Estoque & Vendas`,
      `-- =====================================================================\n`,
      `SET statement_timeout = 0;`,
      `SET client_encoding = 'UTF8';`,
      `SET standard_conforming_strings = on;\n`,
    ]

    let completedTables = 0
    const totalTables = tablesToExport.length

    for (const table of tablesToExport) {
      let q = table.query
      if (storeId && table.name !== 'loss_reasons') {
        if (table.name === 'stores') {
          q = q.eq('id', storeId)
        } else if (table.name === 'product_images') {
          // Join or filter by store handled by product link if possible, or skip store filter for global
        } else {
          q = q.eq('store_id', storeId)
        }
      }

      const { data, error } = await q
      if (error) {
        console.warn(`Erro ao consultar tabela ${table.name} para backup:`, error)
      }

      const rows = (data || []) as Record<string, any>[]
      sqlLines.push(`\n-- -----------------------------------------------------`)
      sqlLines.push(`-- Dados da tabela: ${table.name} (${rows.length} registros)`)
      sqlLines.push(`-- -----------------------------------------------------`)

      if (rows.length > 0) {
        for (const row of rows) {
          const columns = Object.keys(row)
          const formattedValues = columns.map((col) => {
            const val = row[col]
            if (val === null || val === undefined) return 'NULL'
            if (typeof val === 'number') return String(val)
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
            return `'${String(val).replace(/'/g, "''")}'`
          })

          sqlLines.push(
            `INSERT INTO public.${table.name} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${formattedValues.join(', ')}) ON CONFLICT DO NOTHING;`
          )
        }
      } else {
        sqlLines.push(`-- (Nenhum registro encontrado)`)
      }

      completedTables++
      const percent = 10 + Math.round((completedTables / totalTables) * 60)
      onProgress?.({
        status: 'generating_sql',
        percent,
        message: `Exportando tabela ${table.name} (${completedTables}/${totalTables})...`,
      })
    }

    onProgress?.({ status: 'generating_sql', percent: 85, message: 'Montando arquivo SQL...' })

    const fullSql = sqlLines.join('\n')
    const blob = new Blob([fullSql], { type: 'application/sql;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const dateStr = new Date().toISOString().slice(0, 10)
    const targetSlug = storeName ? storeName.toLowerCase().replace(/\s+/g, '_') : 'global'
    const fileName = `backup_sql_${targetSlug}_${dateStr}.sql`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    onProgress?.({ status: 'done', percent: 100, message: 'Download do backup SQL concluído com sucesso!' })
  },

  /**
   * Baixa e compacta todas as imagens de produtos vinculadas em um arquivo ZIP estruturado
   */
  async generateStoreImagesZip(
    storeId?: string,
    storeName?: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<void> {
    onProgress?.({ status: 'fetching_data', percent: 10, message: 'Localizando imagens dos produtos...' })

    let query = supabase
      .from('product_images')
      .select(`
        id,
        product_id,
        storage_path,
        public_url,
        is_primary,
        products (
          id,
          name,
          sku,
          store_id
        )
      `)

    const { data: images, error } = await query
    if (error) throw error

    let filteredImages = (images || []) as any[]
    if (storeId) {
      filteredImages = filteredImages.filter((img) => img.products?.store_id === storeId)
    }

    if (filteredImages.length === 0) {
      throw new Error('Nenhuma imagem encontrada para os produtos desta loja.')
    }

    onProgress?.({
      status: 'downloading_images',
      percent: 20,
      message: `Baixando ${filteredImages.length} imagens...`,
    })

    const zip = new JSZip()
    const imgFolder = zip.folder('imagens_produtos')
    const manifest: any[] = []

    let downloadedCount = 0
    for (const img of filteredImages) {
      try {
        const prodSku = img.products?.sku || 'PROD'
        const prodName = (img.products?.name || 'produto').replace(/[^a-zA-Z0-9_-]/g, '_')
        const ext = img.public_url.split('.').pop()?.split('?')[0] || 'jpg'
        const fileName = `${prodSku}_${prodName}_${img.id.slice(0, 8)}.${ext}`

        // Fetch image blob
        const res = await fetch(img.public_url)
        if (res.ok) {
          const blob = await res.blob()
          imgFolder?.file(fileName, blob)

          manifest.push({
            imageId: img.id,
            productId: img.product_id,
            productSku: prodSku,
            productName: img.products?.name,
            fileName,
            isPrimary: img.is_primary,
            originalUrl: img.public_url,
          })
        }
      } catch (err) {
        console.warn(`Falha ao baixar imagem ${img.public_url}:`, err)
      }

      downloadedCount++
      const percent = 20 + Math.round((downloadedCount / filteredImages.length) * 60)
      onProgress?.({
        status: 'downloading_images',
        percent,
        message: `Baixando imagens (${downloadedCount}/${filteredImages.length})...`,
      })
    }

    // Add Manifest file
    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          backupDate: new Date().toISOString(),
          storeId: storeId || 'GLOBAL',
          storeName: storeName || 'Todas as Lojas',
          totalImages: manifest.length,
          images: manifest,
        },
        null,
        2
      )
    )

    onProgress?.({ status: 'compressing_zip', percent: 85, message: 'Compactando arquivo .ZIP...' })

    const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      const p = 85 + Math.round(metadata.percent * 0.14)
      onProgress?.({ status: 'compressing_zip', percent: p, message: `Compactando (${Math.round(metadata.percent)}%)...` })
    })

    const dateStr = new Date().toISOString().slice(0, 10)
    const targetSlug = storeName ? storeName.toLowerCase().replace(/\s+/g, '_') : 'global'
    const zipName = `backup_imagens_${targetSlug}_${dateStr}.zip`

    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.href = url
    link.download = zipName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    onProgress?.({ status: 'done', percent: 100, message: 'Download do ZIP de imagens concluído com sucesso!' })
  },

  /**
   * Exporta pacote JSON estruturado contendo todos os dados relacionais
   */
  async generateStoreJSONPackage(storeId?: string, storeName?: string): Promise<void> {
    const tables = [
      'stores',
      'categories',
      'products',
      'product_images',
      'cost_centers',
      'loss_reasons',
      'stock_balances',
      'stock_batches',
      'stock_movements',
      'customers',
      'suppliers',
      'purchase_orders',
      'purchase_order_items',
      'orders',
      'order_items',
    ]

    const fullData: Record<string, any[]> = {}

    for (const tableName of tables) {
      let q = supabase.from(tableName).select('*')
      if (storeId && tableName !== 'loss_reasons') {
        if (tableName === 'stores') {
          q = q.eq('id', storeId)
        } else if (tableName !== 'product_images') {
          q = q.eq('store_id', storeId)
        }
      }
      const { data } = await q
      fullData[tableName] = data || []
    }

    const packagePayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storeId: storeId || 'GLOBAL',
      storeName: storeName || 'Todas as Lojas',
      tables: fullData,
    }

    const blob = new Blob([JSON.stringify(packagePayload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)

    const dateStr = new Date().toISOString().slice(0, 10)
    const targetSlug = storeName ? storeName.toLowerCase().replace(/\s+/g, '_') : 'global'
    const fileName = `backup_dados_${targetSlug}_${dateStr}.json`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}
