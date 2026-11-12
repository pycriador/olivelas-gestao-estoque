import * as React from 'react'
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  Truck,
  User,
} from 'lucide-react'
import { supabasePortalApi } from '../api/supabasePortalClient'
import type { PortalOrderStatus, PortalOrderTracking } from '../types/portal.types'
import {
  PAYMENT_METHOD_LABELS,
  buildPortalOrderTrackingUrl,
  formatCurrency,
  formatDateTime,
  formatProductWeight,
  getPortalStatusLabels,
  normalizeWhatsAppPhone,
} from '../utils/portalFormatters'

interface OrderTrackingViewProps {
  orderId: string
  onBackToCatalog: () => void
}

export function OrderTrackingView({ orderId, onBackToCatalog }: OrderTrackingViewProps) {
  const [order, setOrder] = React.useState<PortalOrderTracking | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [lastPulse, setLastPulse] = React.useState<Date | null>(null)

  const loadOrder = React.useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      try {
        const res = await supabasePortalApi.fetchOrderTracking(orderId)
        setOrder(res)
      } catch (err) {
        console.error('Erro ao consultar pedido:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [orderId]
  )

  React.useEffect(() => {
    loadOrder(false)
  }, [loadOrder])

  // Assinatura Realtime + Polling de segurança enquanto o pedido estiver em aberto
  React.useEffect(() => {
    if (!orderId) return

    const unsubscribe = supabasePortalApi.subscribeToOrderRealtime(orderId, () => {
      setLastPulse(new Date())
      loadOrder(true)
    })

    const timer = window.setInterval(() => {
      setOrder((curr) => {
        if (curr && curr.status !== 'COMPLETED' && curr.status !== 'CANCELLED') {
          loadOrder(true)
        }
        return curr
      })
    }, 5000)

    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [orderId, loadOrder])

  const store = order?.store
  const statusLabels = React.useMemo(
    () => getPortalStatusLabels(store?.theme_config),
    [store?.theme_config]
  )

  const steps = React.useMemo(() => {
    const list: Array<{
      status: PortalOrderStatus
      label: string
      subtitle: string
      icon: React.ElementType
    }> = [
      {
        status: 'PENDING',
        label: statusLabels.PENDING,
        subtitle: 'Pedido registrado na plataforma da loja',
        icon: Clock,
      },
      {
        status: 'CONFIRMED',
        label: statusLabels.CONFIRMED,
        subtitle: 'A loja conferiu e confirmou o seu pedido',
        icon: CheckCircle2,
      },
      {
        status: 'PROCESSING',
        label: statusLabels.PROCESSING,
        subtitle: 'Itens sendo separados, pesados e embalados',
        icon: Package,
      },
      {
        status: 'READY',
        label: statusLabels.READY,
        subtitle: 'Pronto para retirada ou saída para entrega',
        icon: ShoppingBag,
      },
    ]

    if (order?.status === 'SHIPPED') {
      list.push({
        status: 'SHIPPED',
        label: statusLabels.SHIPPED,
        subtitle: 'Pedido em rota de entrega para o seu endereço',
        icon: Truck,
      })
    }

    list.push({
      status: 'DELIVERED',
      label: statusLabels.DELIVERED,
      subtitle: 'Pedido entregue ou retirado pelo cliente',
      icon: Truck,
    })

    list.push({
      status: 'COMPLETED',
      label: statusLabels.COMPLETED,
      subtitle: 'Pedido concluído e finalizado com sucesso!',
      icon: Sparkles,
    })

    return list
  }, [statusLabels, order?.status])

  const currentStepIndex = React.useMemo(() => {
    if (!order) return 0
    const idx = steps.findIndex((s) => s.status === order.status)
    return idx >= 0 ? idx : 0
  }, [order, steps])

  const trackingUrl = buildPortalOrderTrackingUrl(orderId)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // ignore
    }
  }

  const handleOpenWhatsApp = () => {
    if (!order) return
    const phone = normalizeWhatsAppPhone(store?.whatsapp || store?.phone)
    const itemsLines = (order.items || [])
      .map((it) => {
        const isKg = (it.unit || '').toUpperCase() === 'KG'
        const qty = isKg ? formatProductWeight(it.quantity) : `${it.quantity}x`
        return `• ${qty} ${it.product_name} - ${formatCurrency(it.total_price)}`
      })
      .join('\n')

    const statusText = statusLabels[order.status] || order.status
    const text = `*PEDIDO ONLINE #${order.order_number}*\n*Loja:* ${
      store?.name || 'Loja Online'
    }\n*Status Atual:* ${statusText}\n\n*Cliente:* ${order.customer_name}\n*Entrega:* ${
      order.delivery_address || 'Retirada / A combinar'
    }\n\n*Itens:*\n${itemsLines}\n\n*TOTAL: ${formatCurrency(
      order.total_amount
    )}*\n\n🔗 *Link de acompanhamento:*\n${trackingUrl}`

    const encoded = encodeURIComponent(text)
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-3 bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-slate-500">
          Conectando ao rastreamento em tempo real do pedido...
        </p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50 dark:bg-slate-950">
        <ShoppingBag className="h-12 w-12 text-slate-400" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          Pedido não localizado nesta loja
        </h1>
        <p className="text-xs text-slate-500 max-w-sm">
          Verifique se o código do pedido está correto. Este portal exibe exclusivamente pedidos vinculados à credencial desta loja.
        </p>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a Vitrine
        </button>
      </div>
    )
  }

  const isCompleted = order.status === 'COMPLETED'
  const isCancelled = order.status === 'CANCELLED'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-14">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {store?.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <StoreIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">{store?.name || 'Acompanhamento de Pedido'}</h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {!isCompleted && !isCancelled ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Atualização em tempo real ativa
                  </>
                ) : (
                  <span>Acompanhamento encerrado</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadOrder(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              type="button"
              onClick={onBackToCatalog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Vitrine
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        {/* Card Principal de Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Pedido #{order.order_number}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isCompleted
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : isCancelled
                      ? 'bg-red-500/15 text-red-600 dark:text-red-300'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Realizado em {formatDateTime(order.created_at)}
                {lastPulse && ` • Atualizado às ${lastPulse.toLocaleTimeString('pt-BR')}`}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                Total do Pedido
              </span>
              <span className="text-xl font-black text-emerald-600">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>

          {/* Linha do Tempo */}
          {isCancelled ? (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3">
              <Ban className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                  {statusLabels.CANCELLED}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {order.cancellation_reason || 'Este pedido foi cancelado pela loja.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isDone = isCompleted || index < currentStepIndex
                const isCurrent = !isCompleted && index === currentStepIndex

                return (
                  <div
                    key={step.status}
                    className={`flex items-start gap-3.5 p-3 rounded-xl border transition ${
                      isCurrent
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : isDone
                        ? 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                        : 'border-transparent opacity-50'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        isDone || isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{step.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            Etapa Atual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ações Rápidas */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Link Copiado!' : 'Copiar Link de Rastreio'}
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar / Falar no WhatsApp da Loja
            </button>
          </div>
        </div>

        {/* Dados do Cliente e Entrega */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Cliente
            </span>
            <p className="text-xs font-bold">{order.customer_name}</p>
            {order.customer_phone && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {order.customer_phone}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Entrega / Retirada
            </span>
            <p className="text-xs font-bold">
              {order.delivery_address || 'Retirada na loja / A combinar'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Forma de Pagamento
            </span>
            <p className="text-xs font-bold">
              {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
            </p>
          </div>
        </div>

        {/* Lista de Itens do Pedido */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Itens do Pedido ({order.items?.length || 0})
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(order.items || []).map((item) => {
              const isKg = (item.unit || '').toUpperCase() === 'KG'
              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{item.product_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {isKg ? formatProductWeight(item.quantity) : `${item.quantity} ${item.unit}`} ×{' '}
                      {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.total_price)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
