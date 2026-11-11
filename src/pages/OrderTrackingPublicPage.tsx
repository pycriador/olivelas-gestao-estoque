import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { orderService } from '@/services/orderService'
import { applyStoreTheme, getCatalogCustomization } from '@/lib/storeThemes'
import { formatCurrency } from '@/utils/currency'
import { formatDateTime } from '@/utils/dates'
import { formatProductWeight } from '@/utils/productUtils'
import {
  buildOrderTrackingUrl,
  getOrderStatusBadgeVariant,
  getStoreOrderStatusLabels,
  normalizeWhatsAppPhone,
} from '@/utils/orderStatusConfig'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  MessageCircle,
  Package,
  ShoppingBag,
  Store as StoreIcon,
  Truck,
  ArrowLeft,
  Sparkles,
  MapPin,
  User,
  Phone,
  Ban,
  RefreshCw,
  CreditCard,
} from 'lucide-react'
import type { OrderStatus } from '@/types/database.types'

export function OrderTrackingPublicPage() {
  const { slug, orderId } = useParams<{ slug?: string; orderId: string }>()
  const queryClient = useQueryClient()
  const [copiedUrl, setCopiedUrl] = React.useState(false)
  const [lastRealtimePulse, setLastRealtimePulse] = React.useState<Date | null>(null)

  const {
    data: order,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['public-order-tracking', orderId],
    queryFn: () => orderService.getPublicOrderTracking(orderId || ''),
    enabled: Boolean(orderId),
    staleTime: 0,
    // Revalida periodicamente enquanto o pedido ainda não estiver Finalizado (COMPLETED) ou Cancelado
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status
      if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
        return false
      }
      return 5000
    },
  })

  const store = order?.store
  const resolvedSlug = slug || store?.slug || ''
  const catalogConfig = React.useMemo(
    () => getCatalogCustomization(store?.theme_config),
    [store?.theme_config]
  )

  // Aplica o tema visual e cores personalizadas do catálogo da loja
  React.useEffect(() => {
    if (!store?.theme_config) return
    applyStoreTheme(catalogConfig.catalogTheme, {
      primaryColor: catalogConfig.primaryColor,
      accentColor: catalogConfig.accentColor,
    })
    return () => applyStoreTheme(null)
  }, [store?.theme_config, catalogConfig.catalogTheme, catalogConfig.primaryColor, catalogConfig.accentColor])

  // Assinatura Supabase Realtime (postgres_changes) para atualização instantânea de status
  React.useEffect(() => {
    if (!isSupabaseConfigured || !orderId) return

    const channel = supabase
      .channel(`public-order-track-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setLastRealtimePulse(new Date())
          queryClient.invalidateQueries({ queryKey: ['public-order-tracking', orderId] })
          const newStatus = (payload.new as any)?.status as OrderStatus | undefined
          if (newStatus) {
            const labels = getStoreOrderStatusLabels(store?.theme_config, order?.store_id)
            toast.success(`Status atualizado em tempo real: ${labels[newStatus] || newStatus}`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, queryClient, store?.theme_config, order?.store_id])

  const statusLabels = React.useMemo(
    () => getStoreOrderStatusLabels(store?.theme_config, order?.store_id),
    [store?.theme_config, order?.store_id]
  )

  const isFinalized = order?.status === 'COMPLETED'
  const isCancelled = order?.status === 'CANCELLED'

  // Etapas visuais da linha do tempo
  const trackingSteps = React.useMemo(() => {
    const baseSteps: Array<{
      status: OrderStatus
      label: string
      subtitle: string
      icon: React.ElementType
    }> = [
      {
        status: 'PENDING',
        label: statusLabels.PENDING,
        subtitle: 'Seu pedido foi registrado na plataforma da loja',
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
        subtitle: 'Os itens estão sendo separados e preparados',
        icon: Package,
      },
      {
        status: 'READY',
        label: statusLabels.READY,
        subtitle: 'Pedido embalado e pronto para entrega ou retirada',
        icon: ShoppingBag,
      },
    ]

    if (order?.status === 'SHIPPED') {
      baseSteps.push({
        status: 'SHIPPED',
        label: statusLabels.SHIPPED,
        subtitle: 'Seu pedido saiu para entrega',
        icon: Truck,
      })
    }

    baseSteps.push({
      status: 'DELIVERED',
      label: statusLabels.DELIVERED,
      subtitle: 'Pedido entregue no endereço ou retirado pelo cliente',
      icon: Truck,
    })

    baseSteps.push({
      status: 'COMPLETED',
      label: statusLabels.COMPLETED,
      subtitle: 'Pedido concluído e finalizado com sucesso!',
      icon: Sparkles,
    })

    return baseSteps
  }, [statusLabels, order?.status])

  const currentStepIndex = React.useMemo(() => {
    if (!order) return 0
    const idx = trackingSteps.findIndex((s) => s.status === order.status)
    return idx >= 0 ? idx : 0
  }, [order, trackingSteps])

  const trackingUrl = order ? buildOrderTrackingUrl(order.id, resolvedSlug) : ''

  const handleCopyTrackingLink = async () => {
    if (!trackingUrl) return
    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopiedUrl(true)
      toast.success('Link de acompanhamento copiado!')
      setTimeout(() => setCopiedUrl(false), 2500)
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  const handleSendToStoreWhatsApp = () => {
    if (!order) return
    const storePhone = normalizeWhatsAppPhone(store?.whatsapp || store?.phone)
    const itemsLines = (order.items || [])
      .map((it) => {
        const isKg = (it.unit || '').toUpperCase() === 'KG'
        const qtyText = isKg ? formatProductWeight(it.quantity) : `${it.quantity}x`
        return `• ${qtyText} ${it.product_name} - ${formatCurrency(it.total_price)}`
      })
      .join('\n')

    const currentStatusLabel = statusLabels[order.status] || order.status
    const message = `*PEDIDO ONLINE #${order.order_number}*\n*Loja:* ${
      store?.name || 'Catálogo Online'
    }\n*Status Atual:* ${currentStatusLabel}\n\n*Cliente:* ${
      order.customer_name || 'Não informado'
    }${order.customer_phone ? `\n*WhatsApp:* ${order.customer_phone}` : ''}\n*Entrega:* ${
      order.delivery_address || 'Retirada / A combinar'
    }\n\n*Itens do Pedido:*\n${itemsLines}\n\n*TOTAL: ${formatCurrency(
      order.total_amount
    )}*\n\n🔗 *Acompanhar status em tempo real:*\n${trackingUrl}`

    const encoded = encodeURIComponent(message)
    const waUrl = storePhone
      ? `https://wa.me/${storePhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(waUrl, '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 space-y-3">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">
          Conectando ao acompanhamento em tempo real do pedido...
        </p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 bg-background">
        <ShoppingBag className="h-14 w-14 text-muted-foreground/60" />
        <h1 className="text-xl font-bold text-foreground">Pedido não encontrado</h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Não encontramos um pedido com este código de rastreamento. Verifique se o link está correto.
        </p>
        {resolvedSlug && (
          <Link to={`/store/${resolvedSlug}`}>
            <Button size="sm" className="text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a Loja
            </Button>
          </Link>
        )}
      </div>
    )
  }

  const currentStatusAlias = statusLabels[order.status] || order.status

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Brand Header */}
      <header
        className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border shadow-xs"
        style={
          catalogConfig.headerBgColor
            ? { backgroundColor: catalogConfig.headerBgColor }
            : undefined
        }
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {store?.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-xs shrink-0">
                {(store?.name || 'L').slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base leading-tight text-foreground truncate">
                {store?.name || 'Acompanhamento de Pedido'}
              </h1>
              <span className="text-[11px] text-muted-foreground block truncate">
                Status do Pedido em Tempo Real
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {resolvedSlug && (
              <Link to={`/store/${resolvedSlug}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Catálogo
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-5">
        {/* Live Status Hero Card */}
        <Card className="border border-border shadow-sm bg-card overflow-hidden">
          <div
            className={`px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2 ${
              isFinalized
                ? 'bg-emerald-500/10'
                : isCancelled
                ? 'bg-danger/10'
                : 'bg-primary/5'
            }`}
          >
            <div className="flex items-center gap-2">
              {isFinalized ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Pedido Concluído
                </span>
              ) : isCancelled ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-danger">
                  <Ban className="h-4 w-4" /> Pedido Cancelado
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  Acompanhamento em Tempo Real Ativo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-mono">
                {lastRealtimePulse
                  ? `Atualizado às ${lastRealtimePulse.toLocaleTimeString('pt-BR')}`
                  : `Atualizado em ${formatDateTime(order.updated_at || order.created_at)}`}
              </span>
              {!isFinalized && !isCancelled && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  title="Atualizar status agora"
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
                </button>
              )}
            </div>
          </div>

          <CardContent className="p-5 space-y-6">
            {/* Order Headline */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
              <div>
                <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                  Número do Pedido
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-foreground mt-0.5">
                  #{order.order_number}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Realizado em {formatDateTime(order.created_at)}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5">
                <span className="text-[11px] uppercase font-bold text-muted-foreground">
                  Status Atual
                </span>
                <Badge
                  variant={getOrderStatusBadgeVariant(order.status)}
                  className="text-xs sm:text-sm px-3 py-1 font-bold w-fit"
                >
                  {currentStatusAlias}
                </Badge>
              </div>
            </div>

            {/* Cancelled Notice OR Stepper */}
            {isCancelled ? (
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 space-y-1.5">
                <div className="font-bold text-sm text-danger flex items-center gap-2">
                  <Ban className="h-4 w-4 shrink-0" /> Este pedido foi cancelado
                </div>
                {order.cancellation_reason && (
                  <p className="text-xs text-foreground">
                    <b>Motivo informado:</b> {order.cancellation_reason}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Progresso do Pedido
                  </h2>
                  <span className="text-xs font-semibold text-primary">
                    Etapa {currentStepIndex + 1} de {trackingSteps.length}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isFinalized ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{
                      width: `${Math.max(
                        12,
                        Math.round(((currentStepIndex + 1) / trackingSteps.length) * 100)
                      )}%`,
                    }}
                  />
                </div>

                {/* Timeline Steps */}
                <div className="space-y-3 pt-1">
                  {trackingSteps.map((step, index) => {
                    const Icon = step.icon
                    const isCompleted = index < currentStepIndex || isFinalized
                    const isCurrent = index === currentStepIndex && !isFinalized

                    return (
                      <div
                        key={step.status}
                        className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'border-primary/40 bg-primary/5 shadow-xs'
                            : isCompleted
                            ? 'border-emerald-500/25 bg-emerald-500/5'
                            : 'border-border/50 bg-muted/20 opacity-60'
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-primary text-primary-foreground animate-pulse'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-foreground">
                              {step.label}
                            </span>
                            {isCurrent && (
                              <Badge variant="default" className="text-[10px] px-2 py-0">
                                Status Atual
                              </Badge>
                            )}
                            {isCompleted && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Concluído
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {step.subtitle}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions: WhatsApp & Copy Tracking URL */}
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row gap-2.5">
              <Button
                type="button"
                onClick={handleSendToStoreWhatsApp}
                className="flex-1 h-11 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar / Falar no WhatsApp da Loja
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyTrackingLink}
                className="h-11 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" /> Link Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copiar Link deste Pedido
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Delivery Info + Order Items */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-border shadow-xs bg-card md:col-span-1">
            <CardContent className="p-4 space-y-3 text-xs">
              <h3 className="font-bold uppercase text-[11px] text-muted-foreground tracking-wider">
                Dados do Cliente & Entrega
              </h3>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Cliente</span>
                    <span className="font-semibold text-foreground">{order.customer_name}</span>
                  </div>
                </div>

                {order.customer_phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] text-muted-foreground block">WhatsApp / Telefone</span>
                      <span className="font-mono font-medium text-foreground">
                        {order.customer_phone}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Entrega / Retirada</span>
                    <span className="font-medium text-foreground">
                      {order.delivery_address || 'Retirada na loja / A combinar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Pagamento</span>
                    <span className="font-medium text-foreground">{order.payment_method}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-xs bg-card md:col-span-2">
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase text-[11px] text-muted-foreground tracking-wider">
                  Itens do Pedido ({order.items?.length || 0})
                </h3>
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {(order.items || []).map((item) => {
                  const isKg = (item.unit || '').toUpperCase() === 'KG'
                  return (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 bg-surface"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-xs sm:text-sm truncate">
                          {item.product_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {isKg ? formatProductWeight(item.quantity) : `${item.quantity}x`} ×{' '}
                          {formatCurrency(item.unit_price)}
                          {isKg ? '/kg' : ''}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-foreground text-xs sm:text-sm shrink-0">
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto</span>
                    <span className="font-mono">-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm sm:text-base text-foreground pt-2 border-t border-border">
                  <span>Total do Pedido</span>
                  <span className="font-mono text-primary">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
