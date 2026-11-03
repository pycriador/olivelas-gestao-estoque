import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  History,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
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
import { DEFAULT_PERMISSION_MODULES } from '@/constants/screenDependencies'
import { useTenant } from '@/hooks/useTenant'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type {
  AiChatMessage,
  AiExecutionResult,
  AiPersona,
  AiTaskType,
} from '@/types/ai.types'
import type { ModuleCode } from '@/types/permissionGroup.types'

interface AiModuleInsightCardProps {
  moduleCode: ModuleCode
  taskType: AiTaskType
  title: string
  subtitle: string
  defaultPrompt?: string
  quickPrompts?: Array<{ label: string; prompt: string }>
  extraContextData?: Record<string, unknown>
  defaultExpanded?: boolean
  compact?: boolean
  className?: string
}

export const AiModuleInsightCard: React.FC<AiModuleInsightCardProps> = ({
  moduleCode,
  taskType,
  title,
  subtitle,
  defaultPrompt = 'Analise os indicadores atuais desta tela e aponte as 3 melhores oportunidades de negócio, alertas críticos e ações recomendadas.',
  quickPrompts = [],
  extraContextData,
  defaultExpanded = true,
  compact = false,
  className,
}) => {
  const navigate = useNavigate()
  const { storeId, storeName } = useTenant()
  const { hasModule } = usePermissions()
  const { user, isGlobalAdmin } = useAuth()

  const isModuleEnabled = isGlobalAdmin || hasModule(moduleCode)

  const moduleDefinition = DEFAULT_PERMISSION_MODULES.find(
    (m) => m.code === moduleCode
  )

  const [expanded, setExpanded] = useState(defaultExpanded)
  const [loading, setLoading] = useState(false)
  const [personas, setPersonas] = useState<AiPersona[]>(DEFAULT_AI_PERSONAS)
  const [selectedPersonaCode, setSelectedPersonaCode] =
    useState<string>('PRACTICAL_COPILOT')
  const [customQuestion, setCustomQuestion] = useState('')
  const [result, setResult] = useState<AiExecutionResult | null>(null)
  const [historyMessages, setHistoryMessages] = useState<AiChatMessage[]>([])
  const [pinnedModelInfo, setPinnedModelInfo] = useState<{
    providerCode: string
    model: string
    sectionLabel: string
  } | null>(null)

  const historyScrollRef = useRef<HTMLDivElement>(null)

  const sessionId = React.useMemo(
    () =>
      toDeterministicUuid(
        `module-${moduleCode}-${taskType}-${storeId || 'global'}`
      ),
    [moduleCode, taskType, storeId]
  )

  // Carrega apenas metadados e histórico salvo (SEM disparar chamada automática de IA)
  useEffect(() => {
    let active = true
    aiOrchestratorService
      .listPersonas(storeId)
      .then((list) => {
        if (active && list.length > 0) setPersonas(list)
      })
      .catch(() => {})

    aiOrchestratorService
      .getPinnedModelForTask({ taskType, moduleCode })
      .then((info) => {
        if (active) {
          setPinnedModelInfo({
            providerCode: info.providerCode,
            model: info.model,
            sectionLabel: info.sectionLabel,
          })
        }
      })
      .catch(() => {})

    aiOrchestratorService
      .listChatMessages(sessionId)
      .then((msgs) => {
        if (active) {
          setHistoryMessages(msgs)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [storeId, taskType, moduleCode, sessionId])

  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight
    }
  }, [historyMessages, loading])

  const runAnalysis = useCallback(
    async (promptOverride?: string, personaOverride?: string) => {
      if (!isModuleEnabled || loading) return
      const promptText = (promptOverride || defaultPrompt).trim()
      const activePersona = personaOverride || selectedPersonaCode

      setExpanded(true)
      setLoading(true)

      const userMsg: AiChatMessage = {
        id: crypto.randomUUID(),
        sessionId,
        storeId: storeId || 'all',
        role: 'user',
        content: promptText,
        personaCode: activePersona,
        createdAt: new Date().toISOString(),
      }

      const nextHistory = [...historyMessages, userMsg]
      setHistoryMessages(nextHistory)
      aiOrchestratorService.appendChatMessage(userMsg).catch(() => {})

      try {
        const res = await aiOrchestratorService.executeModulePrompt({
          storeId: storeId || 'all',
          storeName: storeName || 'Loja Olivelas',
          userId: user?.id || null,
          moduleCode,
          taskType,
          userPrompt: promptText,
          personaCode: activePersona,
          extraContextData,
          conversationHistory: nextHistory,
        })
        setResult(res)

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

        setHistoryMessages((prev) => [...prev, assistantMsg])
        aiOrchestratorService.appendChatMessage(assistantMsg).catch(() => {})
      } catch (err: any) {
        toast.error(
          err?.message || 'Não foi possível gerar o diagnóstico de IA.'
        )
      } finally {
        setLoading(false)
      }
    },
    [
      defaultPrompt,
      extraContextData,
      historyMessages,
      isModuleEnabled,
      loading,
      moduleCode,
      selectedPersonaCode,
      sessionId,
      storeId,
      storeName,
      taskType,
      user?.id,
    ]
  )

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Texto copiado para a área de transferência!')
  }

  const handleAskCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const question = customQuestion.trim()
    if (!question || loading) return
    setCustomQuestion('')
    runAnalysis(question)
  }

  const handleClearLocalHistory = () => {
    setHistoryMessages([])
    setResult(null)
    try {
      const raw = localStorage.getItem('olivelas_ai_chat_history_v1')
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, AiChatMessage[]>
        delete parsed[sessionId]
        localStorage.setItem(
          'olivelas_ai_chat_history_v1',
          JSON.stringify(parsed)
        )
      }
    } catch {
      // ignore storage errors
    }
    toast.success('Histórico de conversa deste módulo limpo.')
  }

  if (!isModuleEnabled) {
    return (
      <Card
        className={cn(
          'flex-shrink-0 border-violet-500/35 bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent p-3',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-300">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-xs font-bold text-foreground">{title}</h3>
                <Badge variant="outline" className="text-[10px]">
                  Add-on IA ({moduleDefinition?.name || moduleCode})
                </Badge>
                {moduleDefinition && (
                  <Badge variant="default" className="text-[10px]">
                    +{formatCurrency(moduleDefinition.monthlyPrice)}/mês
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Solicite ao Super Admin a ativação deste módulo de IA no seu plano comercial.
              </p>
            </div>
          </div>

          {isGlobalAdmin && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs"
              onClick={() => navigate('/global-admin?tab=users')}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Habilitar Módulo
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const latestAssistantMsg = [...historyMessages]
    .reverse()
    .find((m) => m.role === 'assistant')

  return (
    <Card
      className={cn(
        'flex-shrink-0 overflow-hidden border-violet-500/35 bg-gradient-to-br from-violet-500/[0.06] via-surface to-emerald-500/[0.03] shadow-2xs',
        className
      )}
    >
      {/* Compact Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-2xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-xs font-bold text-foreground truncate">
                {title}
              </h3>
              <Badge variant="default" className="font-mono text-[10px] h-4.5 px-1.5">
                {result
                  ? `${result.providerUsed} • ${result.modelUsed}`
                  : latestAssistantMsg?.modelUsed
                    ? `${latestAssistantMsg.providerUsed || 'GEMINI'} • ${latestAssistantMsg.modelUsed}`
                    : pinnedModelInfo
                      ? `${pinnedModelInfo.providerCode} • ${pinnedModelInfo.model}`
                      : 'Gemini AI'}
              </Badge>
              {historyMessages.length > 0 && (
                <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 gap-1">
                  <History className="h-2.5 w-2.5 text-violet-500" />
                  {historyMessages.filter((m) => m.role === 'assistant').length}{' '}
                  {historyMessages.filter((m) => m.role === 'assistant').length === 1
                    ? 'análise'
                    : 'análises'}
                </Badge>
              )}
            </div>
            {!compact && (
              <p className="text-[11px] text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Seletor de Persona (não dispara chamada sozinho; apenas seleciona para a próxima solicitação) */}
          <select
            value={selectedPersonaCode}
            onChange={(e) => setSelectedPersonaCode(e.target.value)}
            aria-label="Selecionar Persona de IA"
            className="h-7 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold text-foreground"
          >
            {personas.map((p) => (
              <option key={p.code} value={p.code}>
                Persona: {p.name}
              </option>
            ))}
          </select>

          <Button
            type="button"
            size="sm"
            variant="default"
            isLoading={loading}
            onClick={() => runAnalysis(customQuestion.trim() || defaultPrompt)}
            className="h-7 px-2.5 text-[11px] bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {historyMessages.length > 0 ? 'Nova Análise IA' : 'Analisar com IA'}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => navigate('/ai-copilot')}
            className="h-7 px-2 text-[11px] text-primary"
          >
            <Bot className="mr-1 h-3 w-3" />
            Copiloto
          </Button>

          {historyMessages.length > 0 && (
            <button
              type="button"
              onClick={handleClearLocalHistory}
              title="Limpar histórico de conversa deste módulo"
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={
              expanded ? 'Recolher painel de IA' : 'Expandir painel de IA'
            }
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-2.5 sm:p-3 space-y-2">
          {/* Quick Prompts */}
          {quickPrompts.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Sugestões:
              </span>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => runAnalysis(qp.prompt)}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-violet-500/20 transition shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <Zap className="h-2.5 w-2.5 text-violet-500" />
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Caixa Compacta de Histórico de Conversa & Resposta Sob Demanda */}
          {(historyMessages.length > 0 || loading) ? (
            <div
              ref={historyScrollRef}
              className="max-h-44 overflow-y-auto custom-scrollbar rounded-xl border border-border/80 bg-background/95 p-2.5 space-y-2.5 text-xs leading-relaxed text-foreground"
            >
              {historyMessages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'rounded-lg p-2.5',
                      isUser
                        ? 'bg-violet-500/10 border border-violet-500/20 text-foreground ml-4'
                        : 'bg-card border border-border/70 text-foreground'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span className="font-bold text-violet-600 dark:text-violet-400">
                        {isUser
                          ? 'Você solicitou:'
                          : `${msg.providerUsed || 'GEMINI'} • ${msg.modelUsed || pinnedModelInfo?.model || 'gemini-2.5-flash'}`}
                      </span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.content)}
                          className="inline-flex items-center gap-1 text-[10px] hover:text-foreground"
                        >
                          <Copy className="h-2.5 w-2.5" />
                          Copiar
                        </button>
                      )}
                    </div>

                    {isUser ? (
                      <div className="text-[11px] font-medium">{msg.content}</div>
                    ) : (
                      <AiMarkdownContent content={msg.content} />
                    )}

                    {!isUser &&
                      msg.actionSuggestions &&
                      msg.actionSuggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-1.5">
                          {msg.actionSuggestions.map((act) => (
                            <Button
                              key={act.id}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (act.whatsappText) {
                                  handleCopyText(act.whatsappText)
                                } else if (act.route) {
                                  navigate(act.route)
                                }
                              }}
                              className="h-6 px-2 text-[10px]"
                            >
                              {act.whatsappText ? (
                                <Copy className="mr-1 h-2.5 w-2.5 text-emerald-500" />
                              ) : (
                                <ArrowRight className="mr-1 h-2.5 w-2.5 text-primary" />
                              )}
                              {act.label}
                            </Button>
                          ))}
                        </div>
                      )}
                  </div>
                )
              })}

              {loading && (
                <div className="flex items-center gap-2 py-2 px-1 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-500 shrink-0" />
                  <span>
                    Consultando IA em tempo real para a loja{' '}
                    <strong>{storeName}</strong>...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/70 bg-background/60 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span>
                A IA carrega apenas quando solicitada. Clique em{' '}
                <strong className="text-foreground">Analisar com IA</strong> ou faça uma pergunta abaixo.
              </span>
            </div>
          )}

          {/* Barra Compacta de Pergunta Direta ao Módulo */}
          <form onSubmit={handleAskCustom} className="flex items-center gap-1.5">
            <Input
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Pergunte à IA sobre os dados desta tela e pressione Enter..."
              className="h-8 text-xs"
              icon={<MessageSquare className="h-3.5 w-3.5" />}
            />
            <Button
              type="submit"
              size="sm"
              variant="default"
              isLoading={loading}
              disabled={!customQuestion.trim()}
              className="h-8 px-3 text-xs shrink-0"
            >
              <Send className="mr-1 h-3 w-3" />
              Perguntar
            </Button>
          </form>
        </div>
      )}
    </Card>
  )
}
