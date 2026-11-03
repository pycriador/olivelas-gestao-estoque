import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight,
  Bot,
  Copy,
  Maximize2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  aiOrchestratorService,
  DEFAULT_AI_PERSONAS,
  toDeterministicUuid,
} from '@/services/aiOrchestratorService'
import { useTenant } from '@/hooks/useTenant'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/utils/cn'
import type { AiChatMessage, AiPersona } from '@/types/ai.types'

const QUICK_STORE_QUESTIONS = [
  {
    label: 'Resumo mensal das vendas',
    prompt:
      'Faça um resumo mensal completo das vendas da loja, ticket médio, margem estimada e principais oportunidades de crescimento.',
  },
  {
    label: 'Avaliar produtos mais vendidos',
    prompt:
      'Avalie os produtos mais vendidos da loja (Curva A), participação no faturamento e quais itens devemos destacar hoje.',
  },
  {
    label: 'Avisar produtos vencendo (FEFO)',
    prompt:
      'Quais lotes e produtos estão vencendo nos próximos dias ou já venceram? Monte um plano de liquidação FEFO imediato.',
  },
  {
    label: 'Sugerir produtos p/ clientes',
    prompt:
      'Avalie o perfil de compras dos nossos clientes e sugira quais produtos devemos ofertar para clientes VIP e para reativar inativos.',
  },
  {
    label: 'Tendências de compras e estoque',
    prompt:
      'Quais são as tendências de compras e quais produtos com estoque baixo precisam de pedido urgente aos fornecedores?',
  },
]

export const AiStoreCopilotDrawer: React.FC = () => {
  const navigate = useNavigate()
  const { storeId, storeName } = useTenant()
  const { user, isGlobalAdmin } = useAuth()
  const { hasModule } = usePermissions()

  const canUseCopilot =
    isGlobalAdmin || hasModule('MOD_AI_COPILOT_CHAT')

  const [isOpen, setIsOpen] = useState(false)
  const [personas, setPersonas] = useState<AiPersona[]>(DEFAULT_AI_PERSONAS)
  const [selectedPersonaCode, setSelectedPersonaCode] =
    useState<string>('PRACTICAL_COPILOT')
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [inputPrompt, setInputPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string>(() =>
    toDeterministicUuid(`drawer-${storeId || 'global'}`)
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadSession = useCallback(async () => {
    const sid = toDeterministicUuid(`drawer-${storeId || 'global'}`)
    setSessionId(sid)
    const [loadedPersonas, history] = await Promise.all([
      aiOrchestratorService.listPersonas(storeId),
      aiOrchestratorService.listChatMessages(sid),
    ])
    if (loadedPersonas.length > 0) {
      setPersonas(loadedPersonas)
    }

    if (history.length > 0) {
      setMessages(history)
    } else {
      setMessages([
        {
          id: 'welcome-msg',
          sessionId: sid,
          storeId: storeId || 'all',
          role: 'assistant',
          content: `Olá, Administrador! Sou o **Copiloto de IA da loja ${storeName || 'Olivelas'}**.\n\nEstou conectado em tempo real ao seu estoque, lotes com validade (FEFO), faturamento mensal, produtos mais vendidos e carteira de clientes.\n\nO que você gostaria de analisar agora?`,
          providerUsed: 'GEMINI',
          modelUsed: 'gemini-2.5-flash',
          personaCode: 'PRACTICAL_COPILOT',
          createdAt: new Date().toISOString(),
        },
      ])
    }
  }, [storeId, storeName])

  useEffect(() => {
    if (isOpen) {
      loadSession()
    }
  }, [isOpen, loadSession])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSendQuestion = async (promptText?: string) => {
    const text = (promptText ?? inputPrompt).trim()
    if (!text || sending) return

    if (!canUseCopilot) {
      toast.warning(
        'O módulo Chatbot Copiloto da Loja (MOD_AI_COPILOT_CHAT) não está habilitado no plano desta loja.'
      )
      return
    }

    setInputPrompt('')
    const userMsg: AiChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      storeId: storeId || 'all',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }

    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    await aiOrchestratorService.appendChatMessage(userMsg)

    setSending(true)
    try {
      const execution = await aiOrchestratorService.executeModulePrompt({
        storeId: storeId || 'all',
        storeName: storeName || 'Loja Olivelas',
        userId: user?.id || null,
        moduleCode: 'MOD_AI_COPILOT_CHAT',
        taskType: 'CHAT_COPILOT',
        userPrompt: text,
        personaCode: selectedPersonaCode,
        conversationHistory: updatedHistory,
      })

      const assistantMsg: AiChatMessage = {
        id: crypto.randomUUID(),
        sessionId,
        storeId: storeId || 'all',
        role: 'assistant',
        content: execution.answer,
        providerUsed: execution.providerUsed,
        modelUsed: execution.modelUsed,
        personaCode: execution.personaUsed.code,
        fallbackTriggered: execution.fallbackTriggered,
        promptInjectionFlagged: execution.promptInjectionBlocked,
        actionSuggestions: execution.actionSuggestions,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMsg])
      await aiOrchestratorService.appendChatMessage(assistantMsg)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao consultar o Copiloto de IA.')
    } finally {
      setSending(false)
    }
  }

  const handleClearChat = () => {
    const freshWelcome: AiChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      storeId: storeId || 'all',
      role: 'assistant',
      content: `Histórico reiniciado! Estou pronto para avaliar vendas, produtos mais vendidos, validades de lotes, clientes e compras da loja **${storeName || 'Olivelas'}**.`,
      providerUsed: 'GEMINI',
      modelUsed: 'gemini-2.5-flash',
      personaCode: selectedPersonaCode,
      createdAt: new Date().toISOString(),
    }
    setMessages([freshWelcome])
  }

  return (
    <>
      {/* Botão Flutuante Global no Canto Inferior Direito */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Chatbot Copiloto de IA da Loja"
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-primary px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-600/30 transition hover:scale-105"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="hidden sm:inline">Copiloto IA da Loja</span>
        </button>
      </div>

      {/* Drawer Lateral do Chatbot */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-600/15 via-primary/10 to-transparent px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-foreground">
                      Copiloto IA • {storeName || 'Loja'}
                    </h2>
                    <Badge variant="success" className="text-[9px]">
                      <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
                      Shield Ativo
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pergunte sobre vendas, estoque, lotes vencendo, clientes e tendências
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    navigate('/ai-copilot')
                  }}
                  title="Expandir em Tela Cheia (/ai-copilot)"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Limpar conversa"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fechar Copiloto de IA"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Seletor de Persona & Atalhos */}
            <div className="space-y-2 border-b border-border bg-muted/20 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Persona Especialista:
                </span>
                <select
                  value={selectedPersonaCode}
                  onChange={(e) => setSelectedPersonaCode(e.target.value)}
                  className="h-7 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold text-foreground"
                >
                  {personas.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({p.tone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {QUICK_STORE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuestion(q.prompt)}
                    className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-foreground hover:bg-violet-500/20"
                  >
                    <Zap className="mr-1 inline h-2.5 w-2.5 text-violet-500" />
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar">
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col gap-1.5',
                      isUser ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs',
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : msg.promptInjectionFlagged
                            ? 'border border-danger/40 bg-danger/10 text-foreground'
                            : 'border border-border bg-background text-foreground'
                      )}
                    >
                      {!isUser && (
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 border-b border-border/60 pb-1 text-[10px] text-muted-foreground">
                          <span className="font-bold text-violet-600 dark:text-violet-400">
                            {msg.providerUsed || 'GEMINI'} •{' '}
                            {msg.modelUsed || 'gemini-2.5-flash'}
                          </span>
                          {msg.fallbackTriggered && (
                            <Badge variant="warning" className="text-[9px]">
                              Fallback Local
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="whitespace-pre-line">{msg.content}</div>

                      {!isUser &&
                        msg.actionSuggestions &&
                        msg.actionSuggestions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2">
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
                                      'Mensagem copiada para o WhatsApp!'
                                    )
                                  } else if (act.route) {
                                    setIsOpen(false)
                                    navigate(act.route)
                                  }
                                }}
                                className="h-7 text-[10px]"
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
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-500" />
                  Consultando indicadores reais da loja {storeName}...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendQuestion()
              }}
              className="border-t border-border bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Pergunte sobre vendas, produtos vencendo, clientes ou estoque..."
                  className="text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  isLoading={sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
