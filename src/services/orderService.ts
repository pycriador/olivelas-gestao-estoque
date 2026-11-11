import { supabase } from '@/lib/supabase/client'
import { auditService } from '@/services/auditService'
import { customerService } from '@/services/customerService'
import { useAuthStore } from '@/stores/authStore'
import { buildAccentRegex } from '@/utils/productUtils'
import {
  getLocalOrderStatusHistory,
  markOrderCompletedLocally,
  recordLocalOrderStatusHistory,
  resolveEffectiveOrderStatus,
} from '@/utils/orderStatusConfig'
import type { Order, OrderStatusHistoryEntry } from '@/types/order.types'
import type { OrderChannel, OrderStatus, PaymentMethod } from '@/types/database.types'

async function resolveCurrentUserAttribution(): Promise<{
  userId: string | null
  userName: string
  userEmail: string | null
}> {
  const storeUser = useAuthStore.getState().user
  if (storeUser) {
    return {
      userId: storeUser.id,
      userName: storeUser.fullName?.trim() || storeUser.email || 'Operador Autenticado',
      userEmail: storeUser.email || null,
    }
  }
  try {
    const { data } = await supabase.auth.getUser()
    const authUser = data?.user
    if (authUser) {
      return {
        userId: authUser.id,
        userName:
          (authUser.user_metadata?.full_name as string)?.trim() ||
          authUser.email ||
          'Operador Autenticado',
        userEmail: authUser.email || null,
      }
    }
  } catch {
    // ignore auth lookup errors
  }
  return {
    userId: null,
    userName: 'Operador do Sistema',
    userEmail: null,
  }
}

export interface CreateOrderPayload {
  storeId: string
  customerId?: string | null
  allowGenericCustomer?: boolean
  channel: OrderChannel
  items: {
    productId: string
    quantity: number
    unitPrice: number
    unitCost?: number
    discount?: number
    batchId?: string
  }[]
  discountAmount?: number
  shippingAmount?: number
  notes?: string
  paymentMethod?: PaymentMethod
  replaceOrderId?: string
  orderNumber?: string
}

export interface CreatePublicCatalogOrderPayload {
  storeId: string
  customerName: string
  customerPhone?: string
  deliveryAddress?: string
  paymentMethod?: PaymentMethod
  notes?: string
  items: {
    productId: string
    productName?: string
    unit?: string
    quantity: number
    unitPrice: number
  }[]
}

export interface PublicOrderTrackingData {
  id: string
  store_id: string
  order_number: string
  channel: OrderChannel
  status: OrderStatus
  subtotal: number
  discount_amount: number
  shipping_amount: number
  total_amount: number
  notes: string | null
  customer_name: string
  customer_phone: string | null
  delivery_address: string | null
  payment_method: string
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  store: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    phone: string | null
    whatsapp: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    theme_config: unknown
  } | null
  items: Array<{
    id: string
    product_id: string
    product_name: string
    product_sku: string
    unit: string
    quantity: number
    unit_price: number
    discount: number
    total_price: number
  }>
}

function parseCustomerSnapshotFromNotes(notes?: string | null): {
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
} {
  if (!notes) return {}
  const nameMatch = notes.match(/Cliente:\s*([^|•\n]+)/i)
  const phoneMatch = notes.match(/(?:WhatsApp|Tel|Telefone):\s*([^|•\n]+)/i)
  const addressMatch = notes.match(/Entrega:\s*([^|•\n]+)/i)
  return {
    customerName: nameMatch?.[1]?.trim(),
    customerPhone: phoneMatch?.[1]?.trim(),
    deliveryAddress: addressMatch?.[1]?.trim(),
  }
}

export interface OrderListParams {
  search?: string
  status?: string
  channel?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export const orderService = {
  async listOrders(
    storeId: string,
    params: OrderListParams = {}
  ): Promise<{ data: Order[]; total: number }> {
    const {
      search,
      status,
      channel,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = params

    let query = supabase
      .from('orders')
      .select(
        `
        *,
        customers ( name, phone, email ),
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products ( * )
        ),
        payments ( id, method, amount, status )
      `,
        { count: 'exact' }
      )
      .eq('store_id', storeId)
      .not('order_number', 'like', '%-SUB-%')

    if (search?.trim()) {
      const q = search.trim()
      const pattern = buildAccentRegex(q)

      // 1. Clientes com nome, documento ou telefone compatíveis
      const { data: matchedCustomers } = await supabase
        .from('customers')
        .select('id')
        .eq('store_id', storeId)
        .or(`name.imatch.${pattern},document.imatch.${pattern},phone.imatch.${pattern}`)

      const matchedCustomerIds = (matchedCustomers || []).map((c: any) => c.id)

      // 2. Produtos com nome ou SKU compatíveis nos itens do pedido
      const { data: matchedProducts } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .or(`name.imatch.${pattern},sku.imatch.${pattern}`)

      const matchedProductIds = (matchedProducts || []).map((p: any) => p.id)

      let productOrderIds: string[] = []
      if (matchedProductIds.length > 0) {
        const { data: matchedItems } = await supabase
          .from('order_items')
          .select('order_id')
          .eq('store_id', storeId)
          .in('product_id', matchedProductIds)
        productOrderIds = (matchedItems || []).map((i: any) => i.order_id)
      }

      const orConditions: string[] = [
        `order_number.imatch.${pattern}`,
        `notes.imatch.${pattern}`,
      ]

      if (matchedCustomerIds.length > 0) {
        orConditions.push(`customer_id.in.(${matchedCustomerIds.join(',')})`)
      }

      if (productOrderIds.length > 0) {
        orConditions.push(`id.in.(${productOrderIds.join(',')})`)
      }

      query = query.or(orConditions.join(','))
    }

    if (status && status !== 'ALL') {
      if (status === 'COMPLETED') {
        query = query.in('status', ['DELIVERED'])
      } else {
        query = query.eq('status', status)
      }
    }

    if (channel && channel !== 'ALL') {
      query = query.eq('channel', channel)
    }

    const orderCol = ['order_number', 'total_amount', 'created_at', 'status', 'channel'].includes(sortBy)
      ? sortBy
      : 'created_at'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order(orderCol, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) throw error

    const mapped = (data || []).map((o: any) => {
      const parsedNotes = parseCustomerSnapshotFromNotes(o.notes)
      return {
        ...o,
        status: resolveEffectiveOrderStatus(o.status, o.notes, o.id),
        customer_name:
          o.customers?.name ||
          o.customer_name ||
          parsedNotes.customerName ||
          'Cliente Genérico',
        customer_phone:
          o.customers?.whatsapp ||
          o.customers?.phone ||
          o.customer_phone ||
          parsedNotes.customerPhone,
        customer_email: o.customers?.email || o.customer_email,
        delivery_address: o.delivery_address || parsedNotes.deliveryAddress || null,
        items: (o.order_items || []).map((oi: any) => ({
          ...oi,
          product: oi.products,
          product_name: oi.products?.name || 'Produto',
          product_sku: oi.products?.sku || '',
        })),
        payments: o.payments || [],
      }
    })

    return {
      data: mapped,
      total: count || 0,
    }
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    let orderNumber = payload.orderNumber || `PED-${Date.now().toString().slice(-6)}`

    // Regra de cliente no PDV (/sales):
    // Se a loja exigir cadastro obrigatório (ou se o Cliente Genérico não estiver liberado na área administrativa),
    // bloqueia vendas sem cliente identificado. Caso contrário, vincula ao único Cliente Genérico da loja.
    let resolvedCustomerId = payload.customerId ? payload.customerId.trim() : ''
    if (!resolvedCustomerId) {
      if (payload.allowGenericCustomer === false) {
        throw new Error(
          'O cadastro ou seleção de um cliente identificado é obrigatório para finalizar a venda nesta loja.'
        )
      }
      const genericCustomer = await customerService.getOrCreateGenericCustomer(payload.storeId)
      resolvedCustomerId = genericCustomer.id
    }

    // Se estamos editando/substituindo um pedido existente ou reutilizando um orderNumber
    if (payload.replaceOrderId || payload.orderNumber) {
      const orFilters: string[] = []
      if (payload.replaceOrderId) {
        orFilters.push(`id.eq.${payload.replaceOrderId}`)
      }
      if (orderNumber) {
        orFilters.push(`order_number.eq.${orderNumber}`)
      }

      const { data: conflictingOrders } = await supabase
        .from('orders')
        .select('id, status, order_number')
        .eq('store_id', payload.storeId)
        .or(orFilters.join(','))

      for (const existingOrder of conflictingOrders || []) {
        // Garante que o estoque do pedido substituído foi estornado caso ainda não esteja CANCELLED
        if (existingOrder.status !== 'CANCELLED') {
          try {
            await this.cancelOrder(
              existingOrder.id,
              `Substituição por edição no PDV (${existingOrder.order_number || orderNumber})`
            )
          } catch (cancelErr: any) {
            const msg = String(cancelErr?.message || '')
            if (!msg.toLowerCase().includes('já foi cancelado')) {
              throw cancelErr
            }
          }
        }

        // 1. Tenta remover diretamente o registro do pedido cancelado substituído
        const { data: deletedRows, error: delErr } = await supabase
          .from('orders')
          .delete()
          .eq('id', existingOrder.id)
          .eq('store_id', payload.storeId)
          .select('id')

        const wasDeleted = !delErr && Array.isArray(deletedRows) && deletedRows.length > 0

        // 2. Se o registro antigo ainda existir no banco (ex: RLS sem policy DELETE aplicada no ambiente),
        // renomeia o order_number do pedido cancelado antigo para liberar o número original
        // sem violar a constraint uq_order_store_number.
        if (!wasDeleted) {
          const archivedOrderNumber = `${existingOrder.order_number}-SUB-${Date.now().toString().slice(-4)}-${existingOrder.id.slice(0, 4)}`
          await supabase
            .from('orders')
            .update({
              order_number: archivedOrderNumber,
              notes: `[SUBSTITUÍDO NA EDIÇÃO] ${payload.notes || ''}`.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.id)
            .eq('store_id', payload.storeId)
        }
      }
    }

    // Verificação preventiva (pre-flight) de unicidade de (store_id, order_number) antes de chamar a RPC:
    // se por qualquer restrição de permissão ainda houver um registro ocupando este order_number na loja,
    // gera um número único imediatamente para nunca disparar erro 23505 ("Registro duplicado").
    const { data: stillOccupying } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', payload.storeId)
      .eq('order_number', orderNumber)
      .limit(1)

    if (stillOccupying && stillOccupying.length > 0) {
      orderNumber = `PED-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`
    }

    const rpcItems = payload.items.map((item) => ({
      productId: item.productId,
      batchId: item.batchId || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost:
        typeof item.unitCost === 'number' && !Number.isNaN(item.unitCost)
          ? item.unitCost
          : null,
      discount: item.discount || 0,
    }))

    // Tudo em uma transacao no servidor: pedido, itens, pagamento, baixa de
    // estoque e auditoria. A RPC trava a linha de saldo de cada produto
    // (FOR UPDATE) e recusa com "Estoque insuficiente para ..." quando o
    // disponivel nao cobre o carrinho, entao nao existe venda acima do
    // estoque nem pedido orfao por insert parcial.
    let { data: orderId, error } = await supabase.rpc('create_order_with_stock', {
      p_store_id: payload.storeId,
      p_customer_id: resolvedCustomerId,
      p_channel: payload.channel,
      p_order_number: orderNumber,
      p_items: rpcItems,
      p_discount_amount: payload.discountAmount || 0,
      p_shipping_amount: payload.shippingAmount || 0,
      p_notes: payload.notes || null,
      p_payment_method: payload.paymentMethod || null,
    })

    // Fallback de segurança caso ainda ocorra colisão de número de pedido (23505 / uq_order_store_number)
    if (error) {
      const errBlob = `${error.code || ''} ${error.message || ''} ${(error as any).details || ''} ${(error as any).hint || ''}`.toLowerCase()
      if (
        errBlob.includes('23505') ||
        errBlob.includes('duplicate') ||
        errBlob.includes('unique') ||
        errBlob.includes('uq_order_store_number') ||
        errBlob.includes('duplicad')
      ) {
        orderNumber = `PED-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`
        const retry = await supabase.rpc('create_order_with_stock', {
          p_store_id: payload.storeId,
          p_customer_id: resolvedCustomerId,
          p_channel: payload.channel,
          p_order_number: orderNumber,
          p_items: rpcItems,
          p_discount_amount: payload.discountAmount || 0,
          p_shipping_amount: payload.shippingAmount || 0,
          p_notes: payload.notes || null,
          p_payment_method: payload.paymentMethod || null,
        })
        orderId = retry.data
        error = retry.error
      }
    }

    if (error) throw error
    if (!orderId) throw new Error('O pedido não foi criado.')

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError) throw fetchError

    const actor = await resolveCurrentUserAttribution()
    const createdAtIso = order.created_at || new Date().toISOString()
    const effectiveToStatus = resolveEffectiveOrderStatus(order.status, order.notes, order.id)
    const historyAction = payload.replaceOrderId ? 'ORDER_EDITED_IN_POS' : 'ORDER_CREATED'
    const historyReason = payload.replaceOrderId
      ? `Pedido editado e reaberto no PDV (#${order.order_number})`
      : `Pedido registrado no PDV (#${order.order_number})`

    recordLocalOrderStatusHistory({
      id: `local-${order.id}-${Date.now()}`,
      orderId: order.id,
      fromStatus: null,
      toStatus: effectiveToStatus,
      userId: actor.userId,
      userName: actor.userName,
      userEmail: actor.userEmail,
      reason: historyReason,
      action: historyAction,
      createdAt: createdAtIso,
    })

    await auditService.logAction({
      storeId: payload.storeId,
      action: historyAction,
      entity: 'orders',
      entityId: order.id,
      beforeData: null,
      afterData: {
        status: effectiveToStatus,
        from_status: null,
        to_status: effectiveToStatus,
        user_name: actor.userName,
        user_email: actor.userEmail,
        order_number: order.order_number,
        reason: historyReason,
      },
    })

    return order as Order
  },

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('id, store_id, status, notes, order_number')
      .eq('id', orderId)
      .maybeSingle()

    const prevStatus = currentOrder
      ? resolveEffectiveOrderStatus(currentOrder.status, currentOrder.notes, orderId)
      : null

    const { error } = await supabase.rpc('restore_sale_stock', {
      p_order_id: orderId,
      p_reason: reason,
    })

    if (error) throw error

    markOrderCompletedLocally(orderId, false)
    const actor = await resolveCurrentUserAttribution()
    const nowIso = new Date().toISOString()

    recordLocalOrderStatusHistory({
      id: `local-${orderId}-${Date.now()}`,
      orderId,
      fromStatus: prevStatus,
      toStatus: 'CANCELLED',
      userId: actor.userId,
      userName: actor.userName,
      userEmail: actor.userEmail,
      reason,
      action: 'ORDER_CANCELLED',
      createdAt: nowIso,
    })

    await auditService.logAction({
      storeId: currentOrder?.store_id,
      action: 'ORDER_CANCELLED',
      entity: 'orders',
      entityId: orderId,
      beforeData: prevStatus ? { status: prevStatus } : null,
      afterData: {
        status: 'CANCELLED',
        from_status: prevStatus,
        to_status: 'CANCELLED',
        reason,
        user_name: actor.userName,
        user_email: actor.userEmail,
        order_number: currentOrder?.order_number,
      },
    })
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<void> {
    const { data: beforeOrder } = await supabase
      .from('orders')
      .select('id, store_id, status, notes, order_number')
      .eq('id', orderId)
      .maybeSingle()

    const prevStatus = beforeOrder
      ? resolveEffectiveOrderStatus(beforeOrder.status, beforeOrder.notes, orderId)
      : null

    markOrderCompletedLocally(orderId, status === 'COMPLETED')

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) {
      // Fallback caso o enum order_status_enum no banco remoto ainda não tenha recebido 'COMPLETED' (Migration 30)
      const errMsg = String(error.message || '').toLowerCase()
      if (
        status === 'COMPLETED' &&
        (errMsg.includes('order_status_enum') ||
          errMsg.includes('invalid input value') ||
          error.code === '22P02')
      ) {
        const existingNotes = (beforeOrder?.notes || '').replace(/\s*\[STATUS:COMPLETED\]/g, '').trim()
        const nextNotes = existingNotes
          ? `${existingNotes} [STATUS:COMPLETED]`
          : '[STATUS:COMPLETED]'

        const { error: fallbackErr } = await supabase
          .from('orders')
          .update({
            status: 'DELIVERED',
            notes: nextNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)

        if (fallbackErr) throw fallbackErr
      } else {
        throw error
      }
    } else if (status !== 'COMPLETED') {
      // Limpa eventual marcador de fallback nas notas se o status voltou para outro valor
      if (beforeOrder?.notes?.includes('[STATUS:COMPLETED]')) {
        const cleanedNotes = beforeOrder.notes.replace(/\s*\[STATUS:COMPLETED\]/g, '').trim()
        await supabase
          .from('orders')
          .update({ notes: cleanedNotes || null })
          .eq('id', orderId)
      }
    }

    const actor = await resolveCurrentUserAttribution()
    const nowIso = new Date().toISOString()

    recordLocalOrderStatusHistory({
      id: `local-${orderId}-${Date.now()}`,
      orderId,
      fromStatus: prevStatus,
      toStatus: status,
      userId: actor.userId,
      userName: actor.userName,
      userEmail: actor.userEmail,
      reason: reason || null,
      action: 'ORDER_STATUS_UPDATED',
      createdAt: nowIso,
    })

    await auditService.logAction({
      storeId: beforeOrder?.store_id,
      action: 'ORDER_STATUS_UPDATED',
      entity: 'orders',
      entityId: orderId,
      beforeData: prevStatus ? { status: prevStatus } : null,
      afterData: {
        status,
        from_status: prevStatus,
        to_status: status,
        reason: reason || null,
        user_name: actor.userName,
        user_email: actor.userEmail,
        order_number: beforeOrder?.order_number,
      },
    })
  },

  async getOrderStatusHistory(
    orderId: string,
    orderSnapshot?: Order | null
  ): Promise<OrderStatusHistoryEntry[]> {
    if (!orderId) return []

    const localEntries = getLocalOrderStatusHistory(orderId)
    let dbEntries: OrderStatusHistoryEntry[] = []

    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select(
          `
          id,
          user_id,
          action,
          before_data,
          after_data,
          created_at,
          profiles ( id, full_name, email )
        `
        )
        .eq('entity', 'orders')
        .eq('entity_id', orderId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && Array.isArray(logs)) {
        dbEntries = logs.map((row: any) => {
          const beforeData = (row.before_data || {}) as Record<string, any>
          const afterData = (row.after_data || {}) as Record<string, any>
          const profile = row.profiles as { id?: string; full_name?: string; email?: string } | null

          const fromStatus = (afterData.from_status || beforeData.status || null) as OrderStatus | null
          const toStatus = (afterData.to_status ||
            afterData.status ||
            (row.action === 'ORDER_CANCELLED'
              ? 'CANCELLED'
              : orderSnapshot?.status || 'PENDING')) as OrderStatus

          const resolvedUserName =
            profile?.full_name?.trim() ||
            afterData.user_name?.trim() ||
            profile?.email ||
            afterData.user_email ||
            'Operador Autenticado'

          const resolvedUserEmail = profile?.email || afterData.user_email || null

          return {
            id: row.id,
            orderId,
            fromStatus,
            toStatus,
            userId: row.user_id || null,
            userName: resolvedUserName,
            userEmail: resolvedUserEmail,
            reason: afterData.reason || null,
            action: row.action || 'ORDER_STATUS_UPDATED',
            createdAt: row.created_at,
          }
        })
      }
    } catch {
      // ignore if audit_logs is restricted by RLS for current role; localEntries will serve as fallback
    }

    // Mescla registros do banco (audit_logs) com registros locais sem duplicar o mesmo evento
    const merged: OrderStatusHistoryEntry[] = [...dbEntries]

    for (const local of localEntries) {
      const localTs = new Date(local.createdAt).getTime()
      const isDuplicate = dbEntries.some((db) => {
        const dbTs = new Date(db.createdAt).getTime()
        return (
          db.toStatus === local.toStatus &&
          db.action === local.action &&
          Math.abs(dbTs - localTs) < 8000
        )
      })
      if (!isDuplicate) {
        merged.push(local)
      }
    }

    // Garante que existe um marco inicial de criação do pedido se houver snapshot
    if (orderSnapshot) {
      const hasCreationEntry = merged.some(
        (e) => e.action === 'ORDER_CREATED' || e.action === 'ORDER_EDITED_IN_POS'
      )
      if (!hasCreationEntry) {
        const initialStatus: OrderStatus =
          orderSnapshot.channel === 'CATALOG' ? 'PENDING' : 'CONFIRMED'
        merged.push({
          id: `initial-${orderSnapshot.id}`,
          orderId: orderSnapshot.id,
          fromStatus: null,
          toStatus: initialStatus,
          userId: orderSnapshot.user_id || null,
          userName:
            orderSnapshot.channel === 'CATALOG'
              ? `Catálogo Online (${orderSnapshot.customer_name || 'Cliente'})`
              : 'Operador PDV',
          userEmail: null,
          reason:
            orderSnapshot.channel === 'CATALOG'
              ? 'Pedido recebido pelo catálogo público online'
              : 'Pedido registrado no PDV',
          action: 'ORDER_CREATED',
          createdAt: orderSnapshot.created_at,
        })
      }
    }

    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  async getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers ( id, name, phone, email, document ),
        order_items (
          id,
          order_id,
          store_id,
          product_id,
          batch_id,
          quantity,
          unit_price,
          unit_cost,
          discount,
          total_price,
          products ( * )
        ),
        payments ( id, method, amount, status )
      `)
      .eq('id', orderId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const parsedNotes = parseCustomerSnapshotFromNotes(data.notes)

    return {
      ...data,
      status: resolveEffectiveOrderStatus(data.status, data.notes, data.id),
      customer_name:
        data.customers?.name ||
        data.customer_name ||
        parsedNotes.customerName ||
        'Cliente Genérico',
      customer_phone:
        data.customers?.whatsapp ||
        data.customers?.phone ||
        data.customer_phone ||
        parsedNotes.customerPhone,
      customer_email: data.customers?.email || data.customer_email,
      delivery_address: data.delivery_address || parsedNotes.deliveryAddress || null,
      items: (data.order_items || []).map((oi: any) => ({
        ...oi,
        product: oi.products,
        product_name: oi.products?.name || 'Produto',
        product_sku: oi.products?.sku || '',
      })),
      payments: data.payments || [],
    } as unknown as Order
  },

  /**
   * Cria um pedido diretamente a partir do Catálogo Público (/store/:slug),
   * integrando com a plataforma interna (/orders) e baixando o estoque atomicamente.
   */
  async createPublicCatalogOrder(
    payload: CreatePublicCatalogOrderPayload
  ): Promise<{
    id: string
    order_number: string
    status: OrderStatus
    total_amount: number
    created_at: string
  }> {
    const cleanName = payload.customerName?.trim() || 'Cliente Catálogo Online'
    const cleanPhone = payload.customerPhone?.trim() || ''
    const cleanAddress = payload.deliveryAddress?.trim() || ''

    const rpcItems = payload.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }))

    // 1. Tenta via RPC atômica SECURITY DEFINER (Migration 30)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_public_catalog_order',
      {
        p_store_id: payload.storeId,
        p_customer_name: cleanName,
        p_customer_phone: cleanPhone || null,
        p_delivery_address: cleanAddress || null,
        p_items: rpcItems,
        p_payment_method: payload.paymentMethod || 'PIX',
        p_notes: payload.notes || null,
      }
    )

    if (!rpcError && rpcResult && (rpcResult as any).id) {
      const res = rpcResult as any
      return {
        id: res.id,
        order_number: res.order_number,
        status: (res.status || 'PENDING') as OrderStatus,
        total_amount: Number(res.total_amount || 0),
        created_at: res.created_at || new Date().toISOString(),
      }
    }

    // Se o erro for de validação de negócio (ex: estoque insuficiente), repassa imediatamente
    const errMsg = String(rpcError?.message || '')
    if (
      rpcError &&
      !errMsg.includes('Could not find the function') &&
      !errMsg.includes('schema cache') &&
      !errMsg.includes('42883')
    ) {
      throw rpcError
    }

    // 2. Fallback resiliente caso a migration 30 ainda não tenha sido aplicada no banco remoto:
    // usa as políticas públicas de INSERT em orders e order_items (channel = 'CATALOG')
    const orderNumber = `PED-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`
    const subtotal = payload.items.reduce(
      (acc, item) => acc + Number((item.quantity * item.unitPrice).toFixed(2)),
      0
    )

    const structuredNotes = [
      `Cliente: ${cleanName}`,
      cleanPhone ? `WhatsApp: ${cleanPhone}` : null,
      cleanAddress ? `Entrega: ${cleanAddress}` : 'Entrega: Retirada / A combinar',
      payload.paymentMethod ? `Pagamento: ${payload.paymentMethod}` : null,
      payload.notes?.trim() ? `Obs: ${payload.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    const { data: insertedOrder, error: insertOrderErr } = await supabase
      .from('orders')
      .insert({
        store_id: payload.storeId,
        order_number: orderNumber,
        channel: 'CATALOG',
        status: 'PENDING',
        subtotal,
        discount_amount: 0,
        shipping_amount: 0,
        total_amount: subtotal,
        notes: structuredNotes,
      })
      .select('*')
      .single()

    if (insertOrderErr || !insertedOrder) {
      throw insertOrderErr || new Error('Não foi possível registrar o pedido online.')
    }

    const orderItemsRows = payload.items.map((it) => ({
      order_id: insertedOrder.id,
      store_id: payload.storeId,
      product_id: it.productId,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      discount: 0,
      total_price: Number((it.quantity * it.unitPrice).toFixed(2)),
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsRows)
    if (itemsErr) {
      console.error('Erro ao inserir itens do pedido público:', itemsErr)
    }

    return {
      id: insertedOrder.id,
      order_number: insertedOrder.order_number,
      status: (insertedOrder.status || 'PENDING') as OrderStatus,
      total_amount: Number(insertedOrder.total_amount || subtotal),
      created_at: insertedOrder.created_at || new Date().toISOString(),
    }
  },

  /**
   * Busca os dados públicos de acompanhamento em tempo real de um pedido específico.
   */
  async getPublicOrderTracking(orderId: string): Promise<PublicOrderTrackingData | null> {
    if (!orderId) return null

    // 1. Tenta via RPC SECURITY DEFINER (Migration 30)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_public_order_tracking',
      { p_order_id: orderId }
    )

    if (!rpcError && rpcData) {
      const d = rpcData as any
      const parsedNotes = parseCustomerSnapshotFromNotes(d.notes)
      return {
        ...d,
        status: resolveEffectiveOrderStatus(d.status, d.notes, d.id),
        customer_name: d.customer_name || parsedNotes.customerName || 'Cliente',
        customer_phone: d.customer_phone || parsedNotes.customerPhone || null,
        delivery_address: d.delivery_address || parsedNotes.deliveryAddress || null,
      } as PublicOrderTrackingData
    }

    // 2. Fallback: consulta direta às tabelas públicas/permitidas
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select(
        `
        *,
        customers ( name, phone, whatsapp ),
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          discount,
          total_price,
          products ( name, sku, unit )
        ),
        payments ( method )
      `
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !orderData) return null

    const { data: storeData } = await supabase
      .from('stores')
      .select(
        'id, name, slug, logo_url, phone, whatsapp, address_street, address_city, address_state, theme_config'
      )
      .eq('id', orderData.store_id)
      .maybeSingle()

    const parsedNotes = parseCustomerSnapshotFromNotes(orderData.notes)

    return {
      id: orderData.id,
      store_id: orderData.store_id,
      order_number: orderData.order_number,
      channel: orderData.channel,
      status: resolveEffectiveOrderStatus(orderData.status, orderData.notes, orderData.id),
      subtotal: Number(orderData.subtotal || 0),
      discount_amount: Number(orderData.discount_amount || 0),
      shipping_amount: Number(orderData.shipping_amount || 0),
      total_amount: Number(orderData.total_amount || 0),
      notes: orderData.notes,
      customer_name:
        (orderData as any).customer_name ||
        (orderData as any).customers?.name ||
        parsedNotes.customerName ||
        'Cliente',
      customer_phone:
        (orderData as any).customer_phone ||
        (orderData as any).customers?.whatsapp ||
        (orderData as any).customers?.phone ||
        parsedNotes.customerPhone ||
        null,
      delivery_address:
        (orderData as any).delivery_address || parsedNotes.deliveryAddress || null,
      payment_method: (orderData as any).payments?.[0]?.method || 'PIX',
      cancelled_at: orderData.cancelled_at,
      cancellation_reason: orderData.cancellation_reason,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
      store: storeData
        ? {
            id: storeData.id,
            name: storeData.name,
            slug: storeData.slug,
            logo_url: storeData.logo_url,
            phone: storeData.phone,
            whatsapp: storeData.whatsapp,
            address_street: storeData.address_street,
            address_city: storeData.address_city,
            address_state: storeData.address_state,
            theme_config: storeData.theme_config,
          }
        : null,
      items: ((orderData as any).order_items || []).map((oi: any) => ({
        id: oi.id,
        product_id: oi.product_id,
        product_name: oi.products?.name || 'Produto',
        product_sku: oi.products?.sku || '',
        unit: oi.products?.unit || 'UN',
        quantity: Number(oi.quantity || 0),
        unit_price: Number(oi.unit_price || 0),
        discount: Number(oi.discount || 0),
        total_price: Number(oi.total_price || 0),
      })),
    }
  },
}
