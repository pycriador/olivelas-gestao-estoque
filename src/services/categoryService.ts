import { supabase } from '@/lib/supabase/client'
import { auditService } from './auditService'
import type { Category } from '@/types/product.types'

export interface CategoryInput {
  name: string
  parentId?: string | null
}

export interface CategoryWithUsage extends Category {
  product_count: number
}

/**
 * Gera um slug estavel a partir do nome.
 * Remove acentos antes de normalizar - sem isso "Açúcar" virava "a-c-car".
 */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export const categoryService = {
  /**
   * Lista as categorias ativas da loja com a contagem de produtos
   * que aponta para cada uma (contagem calculada em JS sobre produtos
   * nao excluidos, porque o RLS nao expoe o filtro `deleted_at` em counts).
   */
  async listCategories(storeId: string): Promise<CategoryWithUsage[]> {
    const [categoriesRes, productsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('store_id', storeId)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      supabase
        .from('products')
        .select('id, category_id')
        .eq('store_id', storeId)
        .is('deleted_at', null),
    ])

    if (categoriesRes.error) throw categoriesRes.error
    if (productsRes.error) throw productsRes.error

    const counts = new Map<string, number>()
    for (const product of productsRes.data || []) {
      if (!product.category_id) continue
      counts.set(product.category_id, (counts.get(product.category_id) || 0) + 1)
    }

    return ((categoriesRes.data || []) as Category[]).map((category) => ({
      ...category,
      product_count: counts.get(category.id) || 0,
    }))
  },

  /**
   * Cria uma categoria.
   *
   * A constraint `UNIQUE (store_id, slug)` nao inclui `deleted_at`, entao
   * uma categoria excluida (soft delete) continua reservando o slug. Nested
   * aqui: se o slug ja existe em uma linha soft-deleted, a linha e
   * ressuscitada em vez de falhar. Sem isso o usuario criaria a categoria,
   * ela "existiria" e nunca apareceria em nenhuma lista.
   */
  async createCategory(storeId: string, input: CategoryInput): Promise<Category> {
    const name = normalizeName(input.name)
    const slug = slugify(name)
    if (!name) throw new Error('Informe o nome da categoria.')
    if (!slug) throw new Error('O nome da categoria precisa conter ao menos uma letra ou número.')

    const { data: conflict } = await supabase
      .from('categories')
      .select('id, deleted_at, name')
      .eq('store_id', storeId)
      .eq('slug', slug)
      .maybeSingle()

    if (conflict) {
      if (!conflict.deleted_at) {
        throw new Error(`Já existe uma categoria chamada "${conflict.name}".`)
      }
      // Revive a linha soft-deleted para nao esbarrar no slug reservado.
      const { data: revived, error } = await supabase
        .from('categories')
        .update({
          name,
          parent_id: input.parentId || null,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conflict.id)
        .eq('store_id', storeId)
        .select()
        .single()

      if (error) throw error
      auditService.logAction({
        storeId,
        action: 'CATEGORY_CREATED',
        entity: 'categories',
        entityId: revived.id,
        afterData: { name: revived.name, slug: revived.slug, revived: true },
      })
      return revived as Category
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ store_id: storeId, name, slug, parent_id: input.parentId || null })
      .select()
      .single()

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'CATEGORY_CREATED',
      entity: 'categories',
      entityId: data.id,
      afterData: { name: data.name, slug: data.slug },
    })

    return data as Category
  },

  /**
   * Atualiza nome e categoria pai.
   *
   * O slug e recalculado a partir do novo nome, mas se o slug destino
   * pertence a outra categoria ele e preservado em vez de derrubar a
   * edicao - o slug nao tem consumidor no app, entao nenhuma navegacao
   * existente quebra.
   */
  async updateCategory(
    id: string,
    storeId: string,
    input: CategoryInput
  ): Promise<Category> {
    const name = normalizeName(input.name)
    if (!name) throw new Error('Informe o nome da categoria.')

    const { data: current, error: currentErr } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('store_id', storeId)
      .single()

    if (currentErr) throw currentErr

    const updates: Record<string, unknown> = {
      name,
      parent_id: input.parentId || null,
      updated_at: new Date().toISOString(),
    }

    const desiredSlug = slugify(name)
    if (desiredSlug && desiredSlug !== current.slug) {
      const { data: taken } = await supabase
        .from('categories')
        .select('id')
        .eq('store_id', storeId)
        .eq('slug', desiredSlug)
        .neq('id', id)
        .maybeSingle()

      if (!taken) updates.slug = desiredSlug
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'CATEGORY_UPDATED',
      entity: 'categories',
      entityId: id,
      afterData: { name: data.name, slug: data.slug, parent_id: data.parent_id },
    })

    return data as Category
  },

  /**
   * Remove a categoria.
   *
   * Delete fisico (e nao soft delete) de proposito: `products.category_id`
   * e `ON DELETE SET NULL`, entao o Postgres zera a referencia e os produtos
   * passam a exibir "Sem categoria" de forma coerente. Um soft delete deixaria
   * o produto com `category_id` apontando para algo invisivel nas listas.
   */
  async deleteCategory(id: string, storeId: string): Promise<void> {
    const { data: current, error: currentErr } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .eq('store_id', storeId)
      .single()

    if (currentErr) throw currentErr

    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('category_id', id)
      .is('deleted_at', null)

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error

    auditService.logAction({
      storeId,
      action: 'CATEGORY_DELETED',
      entity: 'categories',
      entityId: id,
      afterData: { name: current.name, products_unlinked: count || 0 },
    })
  },
}
