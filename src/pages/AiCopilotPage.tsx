import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  Copy,
  Layers,
  MessageSquare,
  Package,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  aiOrchestratorService,
  DEFAULT_AI_PERSONAS,
  toDeterministicUuid,
} from '@/services/aiOrchestratorService'
import { AiMarkdownContent } from '@/components/ai/AiMarkdownContent'
import { BulkStoreAiBuilderModal } from '@/components/admin/BulkStoreAiBuilderModal'
import { useTenant } from '@/hooks/useTenant'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type {
  AiChatMessage,
  AiPersona,
  AiStoreConfig,
  StoreAiContextSnapshot,
} from '@/types/ai.types'

const STRATEGIC_PROMPTS = [
  {
    category: 'Vendas & Produtos',
    title: 'Resumo Mensal de Vendas & Curva A',
    prompt:
      'Faça um resumo mensal executivo das vendas da loja, avalie os produtos mais vendidos, margem bruta e indique onde podemos crescer faturamento nesta semana.',
  },
  {
    category: 'Validades FEFO',
    title: 'Alerta de Lotes Vencendo & Liquidação',
    prompt:
      'Quais produtos e lotes estão vencendo nos próximos dias ou já venceram? Crie um plano de ação FEFO com sugestão de desconto e texto de campanha para WhatsApp.',
  },
  {
    category: 'Clientes & CRM',
    title: 'Avaliar e Sugerir Produtos para Clientes',
    prompt:
      'Avalie o comportamento de compras dos nossos clientes VIP e clientes inativos, sugerindo exatamente quais produtos da loja devemos ofertar para cada perfil.',
  },
  {
    category: 'Compras & Estoque',
    title: 'Tendências de Compras & Reposição',
    prompt:
      'Quais são as tendências de compras atuais e quais produtos com estoque baixo exigem pedido imediato aos fornecedores para evitar ruptura?',
  },
  {
    category: 'Simulação What-If',
    title: 'Simular Promoção Relâmpago (ROI)',
    prompt:
      'Simule o impacto financeiro se aplicarmos 15% de desconto nos lotes próximos do vencimento combinado com nossos 3 produtos mais vendidos em um kit promocional.',
  },
]

export const AiCopilotPage: React.FC = () => {
  const navigate = useNavigate()
  const { storeId, storeName } = useTenant()
  const { user, isGlobalAdmin } = useAuth()

  const [snapshot, setSnapshot] = useState<StoreAiContextSnapshot | null>(null)
  const [personas, setPersonas] = useState<AiPersona[]>(DEFAULT_AI_PERSONAS)
  const [selectedPersonaCode, setSelectedPersonaCode] =
    useState<string>('PRACTICAL_COPILOT')
  const [storeConfig, setStoreConfig] = useState<AiStoreConfig | null>(null)
  const [showStoreConfigModal, setShowStoreConfigModal] = useState(false)
  const [showBulkBuilderModal, setShowBulkBuilderModal] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [inputPrompt, setInputPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingContext, setLoadingContext] = useState(true)
  const [pinnedModelBadge, setPinnedModelBadge] = useState<string>('GEMINI • gemini-2.5-flash')

  const sessionId = toDeterministicUuid(`copilot-page-${storeId || 'global'}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadCopilotEnvironment = useCallback(async () => {
    setLoadingContext(true)
    try {
      const [snap, loadedPersonas, cfg, history, pinnedInfo] = await Promise.all([
        aiOrchestratorService.buildStoreContextSnapshot(
          storeId || 'all',
          storeName || 'Loja Olivelas'
        ),
        aiOrchestratorService.listPersonas(storeId),
        aiOrchestratorService.getStoreAiConfig(storeId || 'all'),
        aiOrchestratorService.listChatMessages(sessionId),
        aiOrchestratorService.getPinnedModelForTask({
          taskType: 'CHAT_COPILOT',
          moduleCode: 'MOD_AI_COPILOT_CHAT',
        }),
      ])

      setPinnedModelBadge(`${pinnedInfo.providerCode} • ${pinnedInfo.model}`)
      setSnapshot(snap)
      if (loadedPersonas.length > 0) {
        setPersonas(loadedPersonas)
      }
      setStoreConfig(cfg)

      if (history.length > 0) {
        setMessages(history)
      } else {
        setMessages([
          {
            id: 'copilot-welcome',
            sessionId,
            storeId: storeId || 'all',
            role: 'assistant',
            content: `Bem-vindo à **Central Copiloto de IA da loja ${storeName || 'Olivelas'}**!\n\nJá carreguei o contexto operacional em tempo real:\n• **Faturamento (30d):** ${formatCurrency(snap.monthlyRevenue)} (${snap.monthlyOrdersCount} vendas)\n• **Lotes Vencendo / Vencidos (FEFO):** ${snap.expiringWithin30DaysCount} vencendo + ${snap.expiredBatchesCount} vencidos\n• **Itens Abaixo do Estoque Mínimo:** ${snap.lowStockCount}\n• **Base de Clientes Ativos:** ${snap.totalCustomersCount} (${snap.inactiveCustomersCount} inativos para reativação)\n\nEscolha uma análise estratégica ao lado ou digite sua pergunta abaixo!`,
            providerUsed: pinnedInfo.providerCode,
            modelUsed: pinnedInfo.model,
            personaCode: 'PRACTICAL_COPILOT',
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao inicializar Copiloto de IA.')
    } finally {
      setLoadingContext(false)
    }
  }, [sessionId, storeId, storeName])

  useEffect(() => {
    loadCopilotEnvironment()
  }, [loadCopilotEnvironment])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (promptOverride?: string) => {
    const text = (promptOverride ?? inputPrompt).trim()
    if (!text || sending) return

    setInputPrompt('')
    const userMsg: AiChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      storeId: storeId || 'all',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    await aiOrchestratorService.appendChatMessage(userMsg)

    setSending(true)
    try {
      const res = await aiOrchestratorService.executeModulePrompt({
        storeId: storeId || 'all',
        storeName: storeName || 'Loja Olivelas',
        userId: user?.id || null,
        moduleCode: 'MOD_AI_COPILOT_CHAT',
        taskType: 'CHAT_COPILOT',
        userPrompt: text,
        personaCode: selectedPersonaCode,
        conversationHistory: nextMessages,
      })

      const assistantMsg: AiChatMessage = {
        id: crypto.randomUUID(),
        sessionId,
        storeId: storeId || 'all',
        role: 'assistant',
        content: res.answer,
        providerUsed: res.providerUsed,
        modelUsed: res.modelUsed,
        personaCode: res.personaUsed.code,
        fallbackTriggered: res.fallbackTriggered,
        promptInjectionFlagged: res.promptInjectionBlocked,
        actionSuggestions: res.actionSuggestions,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMsg])
      await aiOrchestratorService.appendChatMessage(assistantMsg)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao processar pergunta na IA.')
    } finally {
      setSending(false)
    }
  }

  const handleSaveStoreConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeConfig) return
    setSavingConfig(true)
    try {
      await aiOrchestratorService.saveStoreAiConfig(storeConfig)
      toast.success(
        'Configurações de Persona, Nicho e Contexto de IA da loja salvas com sucesso!'
      )
      setShowStoreConfigModal(false)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar configuração de IA da loja.')
    } finally {
      setSavingConfig(false)
    }
  }

  const activePersona =
    personas.find((p) => p.code === selectedPersonaCode) || personas[0]

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={`Copiloto IA da Loja: ${storeName || 'Olivelas'}`}
        badge={
          <Badge variant="default" className="font-mono">
            <Sparkles className="mr-1 h-3 w-3" />
            Modelo Fixado: {pinnedModelBadge}
          </Badge>
        }
      />

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-600/10 via-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                Assistente Executivo Inteligente • {activePersona?.name}
              </h2>
              <Badge variant="success">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Anti-Prompt Injection Ativo
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Converse com a IA da sua loja para avaliar produtos mais vendidos, resumir vendas mensais, prever compras, criar campanhas para clientes e evitar perdas por validade.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowBulkBuilderModal(true)}
            className="border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 font-semibold"
          >
            <Layers className="mr-1.5 h-4 w-4" />
            Criação de Loja em Lote (IA)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowStoreConfigModal(!showStoreConfigModal)}
          >
            <Settings className="mr-1.5 h-4 w-4" />
            Personalizar IA da Loja
          </Button>
          {isGlobalAdmin && (
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => navigate('/global-admin/ai')}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Cofre de Chaves API (Super Admin)
            </Button>
          )}
        </div>
      </div>

      {/* Painel de Personalização de Contexto da Loja */}
      {showStoreConfigModal && storeConfig && (
        <Card className="border-primary/40 bg-primary/5 p-5">
          <form onSubmit={handleSaveStoreConfig} className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-sm font-bold text-foreground">
                Personalizar Contexto de IA e Metas da Loja ({storeName})
              </h3>
              <Button
                type="submit"
                size="sm"
                variant="default"
                isLoading={savingConfig}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Salvar Preferências
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Nicho / Segmento da Loja
                </label>
                <Input
                  value={storeConfig.businessNiche}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      businessNiche: e.target.value,
                    })
                  }
                  placeholder="Ex: Cosméticos, Velas Aromáticas & Bem-Estar"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Meta de Margem Bruta (%)
                </label>
                <Input
                  type="number"
                  value={String(storeConfig.targetMarginPercent)}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      targetMarginPercent: Number(e.target.value || 35),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Alerta Antecipado de Validade (Dias)
                </label>
                <Input
                  type="number"
                  value={String(storeConfig.expirationWarningDays)}
                  onChange={(e) =>
                    setStoreConfig({
                      ...storeConfig,
                      expirationWarningDays: Number(e.target.value || 15),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Contexto Extra da Loja (Injetado automaticamente no Prompt da IA)
              </label>
              <Input
                value={storeConfig.promptInjectionCustomContext || ''}
                onChange={(e) =>
                  setStoreConfig({
                    ...storeConfig,
                    promptInjectionCustomContext: e.target.value,
                  })
                }
                placeholder="Ex: Priorizar venda de kits presenteáveis e alertar sempre que velas aromáticas tiverem menos de 10 unidades..."
              />
            </div>
          </form>
        </Card>
      )}

      {/* Main Grid: Left Context & Prompts | Right Chat */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna Esquerda: Radar da Loja em Tempo Real + Prompts Estratégicos */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Dados Injetados na IA (Tempo Real)
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={loadCopilotEnvironment}
                isLoading={loadingContext}
                className="h-7 text-[11px]"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Atualizar
              </Button>
            </div>

            {snapshot && (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-border bg-muted/20 p-2.5">
                  <div className="text-[10px] text-muted-foreground">
                    Receita (30 dias)
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(snapshot.monthlyRevenue)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {snapshot.monthlyOrdersCount} vendas • Margem{' '}
                    {snapshot.estimatedGrossMarginPercent.toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
                  <div className="text-[10px] text-muted-foreground">
                    Lotes Vencendo (FEFO)
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {snapshot.expiringWithin30DaysCount} lotes
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Risco: {formatCurrency(snapshot.atRiskExpirationValue)}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-2.5">
                  <div className="text-[10px] text-muted-foreground">
                    Estoque Baixo / Ruptura
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-foreground">
                    {snapshot.lowStockCount} SKUs
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {snapshot.outOfStockCount} zerados
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-2.5">
                  <div className="text-[10px] text-muted-foreground">
                    Carteira de Clientes
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-primary">
                    {snapshot.totalCustomersCount} clientes
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {snapshot.inactiveCustomersCount} inativos (&gt;45d)
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Personas */}
          <Card className="p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Escolha a Persona do Copiloto
            </h3>
            <div className="space-y-2">
              {personas.map((p) => {
                const active = p.code === selectedPersonaCode
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedPersonaCode(p.code)}
                    className={cn(
                      'w-full rounded-xl border p-2.5 text-left transition',
                      active
                        ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500'
                        : 'border-border bg-background hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {p.name}
                      </span>
                      <Badge variant={active ? 'default' : 'outline'}>
                        {p.tone}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {p.roleTitle}
                    </p>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Prompts Estratégicos Prontos */}
          <Card className="p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Perguntas Estratégicas de 1 Clique
            </h3>
            <div className="space-y-2">
              {STRATEGIC_PROMPTS.map((sp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(sp.prompt)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-left transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400">
                      {sp.category}
                    </span>
                    <Zap className="h-3 w-3 text-amber-500" />
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-foreground">
                    {sp.title}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Coluna Direita (2 cols): Chat Conversacional */}
        <Card className="flex h-[680px] flex-col overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-bold text-foreground">
                Conversa com o Copiloto da Loja ({activePersona?.name})
              </span>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {messages.length} mensagens na sessão
            </Badge>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col gap-1',
                    isUser ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[92%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs',
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : msg.promptInjectionFlagged
                          ? 'border border-danger/40 bg-danger/10 text-foreground'
                          : 'border border-border bg-surface text-foreground'
                    )}
                  >
                    {!isUser && (
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-1.5 text-[10px] text-muted-foreground">
                        <span className="font-bold text-violet-600 dark:text-violet-400">
                          {msg.providerUsed || 'GEMINI'} •{' '}
                          {msg.modelUsed || 'gemini-2.5-flash'} • Persona:{' '}
                          {msg.personaCode || selectedPersonaCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content)
                            toast.success('Resposta copiada!')
                          }}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </button>
                      </div>
                    )}

                    {isUser ? (
                      <div className="whitespace-pre-line">{msg.content}</div>
                    ) : (
                      <AiMarkdownContent content={msg.content} />
                    )}

                    {!isUser &&
                      msg.actionSuggestions &&
                      msg.actionSuggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-2.5">
                          {msg.actionSuggestions.map((act) => (
                            <Button
                              key={act.id}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (act.whatsappText) {
                                  navigator.clipboard.writeText(
                                    act.whatsappText
                                  )
                                  toast.success(
                                    'Texto promocional copiado para enviar no WhatsApp!'
                                  )
                                } else if (act.route) {
                                  navigate(act.route)
                                }
                              }}
                              className="h-7 text-[11px]"
                            >
                              {act.whatsappText ? (
                                <Copy className="mr-1 h-3 w-3 text-emerald-500" />
                              ) : (
                                <ArrowRight className="mr-1 h-3 w-3 text-primary" />
                              )}
                              {act.label}
                            </Button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )
            })}

            {sending && (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-3.5 text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin text-violet-500" />
                <span>
                  O Copiloto está cruzando dados de vendas, estoque, validades e clientes da loja <strong>{storeName}</strong>...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="border-t border-border bg-background p-3.5"
          >
            <div className="flex items-center gap-2">
              <Input
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Pergunte qualquer coisa sobre a loja (Ex: Quais produtos estão vencendo? Qual tendência de compra? Sugira produtos para clientes)..."
                className="text-xs"
              />
              <Button
                type="submit"
                variant="default"
                isLoading={sending}
                className="shrink-0"
              >
                <Send className="mr-1.5 h-4 w-4" />
                Enviar
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <BulkStoreAiBuilderModal
        isOpen={showBulkBuilderModal}
        onClose={() => setShowBulkBuilderModal(false)}
        onCompleted={() => {
          loadCopilotEnvironment()
        }}
      />
    </div>
  )
}

export default AiCopilotPage
