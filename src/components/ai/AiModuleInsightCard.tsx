import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  Maximize2,
  MessageSquare,
  Minimize2,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  X,
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
  defaultExpanded = false,
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

  // Por padrão vem minimizado em todas as telas
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [isFullScreen, setIsFullScreen] = useState(false)
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
  const fullScreenScrollRef = useRef<HTMLDivElement>(null)

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
    if (fullScreenScrollRef.current) {
      fullScreenScrollRef.current.scrollTop =
        fullScreenScrollRef.current.scrollHeight
    }
  }, [historyMessages, loading, isFullScreen, expanded])

  // Fechar tela cheia com tecla ESC e travar scroll do body no mobile
  useEffect(() => {
    if (!isFullScreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullScreen])

  const runAnalysis = useCallback(
    async (promptOverride?: string, personaOverride?: string) => {
      if (!isModuleEnabled || loading) return
      const promptText = (promptOverride || defaultPrompt).trim()
      const activePersona = personaOverride || selectedPersonaCode

      if (!isFullScreen) {
        setExpanded(true)
      }
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
      isFullScreen,
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

  const activeModelLabel = result
    ? `${result.providerUsed} • ${result.modelUsed}`
    : latestAssistantMsg?.modelUsed
      ? `${latestAssistantMsg.providerUsed || 'GEMINI'} • ${latestAssistantMsg.modelUsed}`
      : pinnedModelInfo
        ? `${pinnedModelInfo.providerCode} • ${pinnedModelInfo.model}`
        : 'Gemini AI'

  const analysisCount = historyMessages.filter(
    (m) => m.role === 'assistant'
  ).length

  const renderMessagesList = (isFullScreenView: boolean) => {
    if (historyMessages.length === 0 && !loading) {
      return (
        <div
          className={cn(
            'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border/80 bg-background/70',
            isFullScreenView ? 'p-6 text-sm' : 'px-3.5 py-2.5 text-xs'
          )}
        >
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Agente de IA pronto para analisar os dados desta tela sob demanda
            </p>
            <p className="text-muted-foreground text-[11px] sm:text-xs">
              Clique em <strong className="text-foreground">Analisar com IA</strong>, escolha uma sugestão rápida ou envie sua pergunta abaixo.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="default"
            isLoading={loading}
            onClick={() => runAnalysis(defaultPrompt)}
            className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Gerar Análise Completa Agora
          </Button>
        </div>
      )
    }

    return (
      <div
        ref={isFullScreenView ? fullScreenScrollRef : historyScrollRef}
        className={cn(
          'overflow-y-auto custom-scrollbar rounded-xl border border-border/80 bg-background/95 text-foreground',
          isFullScreenView
            ? 'flex-1 min-h-0 p-4 sm:p-6 space-y-4 text-sm leading-relaxed'
            : 'max-h-80 sm:max-h-96 p-3 space-y-3 text-xs leading-relaxed'
        )}
      >
        {historyMessages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
              className={cn(
                'rounded-xl transition-all',
                isFullScreenView ? 'p-4' : 'p-3',
                isUser
                  ? 'bg-violet-500/10 border border-violet-500/25 text-foreground ml-4 sm:ml-10'
                  : 'bg-card border border-border/80 text-foreground shadow-2xs'
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 text-[11px] text-muted-foreground">
                <span className="font-bold text-violet-600 dark:text-violet-400">
                  {isUser
                    ? 'Você solicitou:'
                    : `${msg.providerUsed || 'GEMINI'} • ${msg.modelUsed || pinnedModelInfo?.model || 'gemini-2.5-flash'}`}
                </span>
                <div className="flex items-center gap-2">
                  {!isUser && !isFullScreenView && (
                    <button
                      type="button"
                      onClick={() => setIsFullScreen(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                      title="Ler esta análise em tela cheia"
                    >
                      <Maximize2 className="h-2.5 w-2.5" />
                      Tela Cheia
                    </button>
                  )}
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.content)}
                      className="inline-flex items-center gap-1 text-[10px] hover:text-foreground cursor-pointer"
                    >
                      <Copy className="h-2.5 w-2.5" />
                      Copiar
                    </button>
                  )}
                </div>
              </div>

              {isUser ? (
                <div
                  className={cn(
                    'font-medium',
                    isFullScreenView ? 'text-sm' : 'text-xs'
                  )}
                >
                  {msg.content}
                </div>
              ) : (
                <AiMarkdownContent
                  content={msg.content}
                  className={isFullScreenView ? 'text-sm leading-relaxed' : undefined}
                />
              )}

              {!isUser &&
                msg.actionSuggestions &&
                msg.actionSuggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
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
                            setIsFullScreen(false)
                            navigate(act.route)
                          }
                        }}
                        className="h-7 px-2.5 text-[11px]"
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
          )
        })}

        {loading && (
          <div className="flex items-center gap-2.5 py-3 px-2 text-xs sm:text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin text-violet-500 shrink-0" />
            <span>
              Consultando IA em tempo real para a loja{' '}
              <strong>{storeName || 'Olivelas'}</strong>...
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Card
        className={cn(
          'flex-shrink-0 min-w-0 overflow-hidden border-violet-500/35 bg-gradient-to-br from-violet-500/[0.06] via-surface to-emerald-500/[0.03] shadow-2xs',
          className
        )}
      >
        {/* Barra Superior (Por padrão minimizada; clicável para expandir ou abrir em Tela Cheia) */}
        <div
          className={cn(
            'flex flex-col lg:flex-row lg:items-center justify-between gap-2 px-3 py-2.5 sm:py-2 min-w-0',
            expanded && 'border-b border-border/60'
          )}
        >
          <div className="flex items-start sm:items-center justify-between gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-start sm:items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
              title={
                expanded
                  ? 'Clique para minimizar o painel de IA'
                  : 'Clique para expandir o painel de IA'
              }
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-2xs group-hover:scale-105 transition-transform mt-0.5 sm:mt-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <h3 className="text-xs font-bold text-foreground line-clamp-1 sm:truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {title}
                  </h3>
                  <Badge
                    variant="default"
                    className="font-mono text-[10px] h-4.5 px-1.5 shrink-0 max-w-full truncate"
                  >
                    {activeModelLabel}
                  </Badge>
                  {analysisCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4.5 px-1.5 gap-1 shrink-0"
                    >
                      <History className="h-2.5 w-2.5 text-violet-500" />
                      {analysisCount}{' '}
                      {analysisCount === 1 ? 'análise' : 'análises'}
                    </Badge>
                  )}
                  {!expanded && (
                    <span className="text-[10px] font-medium text-muted-foreground hidden xl:inline">
                      • Clique para expandir ou abra em Tela Cheia
                    </span>
                  )}
                </div>
                {!compact && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 sm:truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </button>

            {/* Botão rápido de Expandir/Minimizar visível no topo direito no mobile */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="lg:hidden inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 cursor-pointer"
              aria-label={
                expanded ? 'Minimizar painel de IA' : 'Expandir painel de IA'
              }
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full lg:w-auto min-w-0">
            {/* Seletor de Persona */}
            <select
              value={selectedPersonaCode}
              onChange={(e) => setSelectedPersonaCode(e.target.value)}
              aria-label="Selecionar Persona de IA"
              className="h-7 min-w-0 flex-1 sm:flex-initial sm:max-w-[190px] truncate rounded-lg border border-border bg-background px-2 text-[11px] font-semibold text-foreground cursor-pointer"
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
              className="h-7 px-2.5 text-[11px] bg-violet-600 hover:bg-violet-700 text-white shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="mr-1 h-3 w-3 shrink-0" />
              {historyMessages.length > 0 ? 'Nova Análise' : 'Analisar IA'}
            </Button>

            {/* Botão Abrir em Tela Cheia */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsFullScreen(true)}
              title="Abrir o agente de IA desta tela em modo Tela Cheia para leitura detalhada"
              className="h-7 px-2.5 text-[11px] border-violet-500/40 text-violet-700 dark:text-violet-300 hover:bg-violet-500/15 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Maximize2 className="mr-1 h-3 w-3 shrink-0" />
              Tela Cheia
            </Button>

            {historyMessages.length > 0 && (
              <button
                type="button"
                onClick={handleClearLocalHistory}
                title="Limpar histórico de conversa deste módulo"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="hidden lg:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 whitespace-nowrap cursor-pointer"
              aria-label={
                expanded ? 'Minimizar painel de IA' : 'Expandir painel de IA'
              }
              title={
                expanded ? 'Minimizar painel de IA' : 'Expandir painel de IA'
              }
            >
              {expanded ? (
                <>
                  <span>Minimizar</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Expandir</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Corpo Expandido Inline */}
        {expanded && (
          <div className="p-2.5 sm:p-3 space-y-2.5">
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

            {renderMessagesList(false)}

            <form onSubmit={handleAskCustom} className="flex items-center gap-1.5">
              <Input
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Pergunte à IA sobre os dados desta tela..."
                className="h-8 text-xs"
                icon={<MessageSquare className="h-3.5 w-3.5" />}
              />
              <Button
                type="submit"
                size="sm"
                variant="default"
                isLoading={loading}
                disabled={!customQuestion.trim()}
                className="h-8 px-3 text-xs shrink-0 whitespace-nowrap"
              >
                <Send className="mr-1 h-3 w-3 shrink-0" />
                Perguntar
              </Button>
            </form>
          </div>
        )}
      </Card>

      {/* MODAL EM TELA CHEIA RENDERIZADO VIA PORTAL NO BODY PARA FUNCIONAR PERFEITAMENTE NO MOBILE */}
      {isFullScreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex h-dvh w-screen flex-col bg-background overflow-hidden animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label={`Tela Cheia: ${title}`}
          >
            {/* Header Tela Cheia */}
            <div className="flex flex-col gap-2 border-b border-border bg-gradient-to-r from-violet-600/12 via-surface to-emerald-500/5 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0">
              {/* Linha 1: Título + Badge + Botão Sair/Fechar */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-xs sm:text-base font-bold text-foreground truncate">
                        {title}
                      </h2>
                      <Badge
                        variant="default"
                        className="font-mono text-[10px] sm:text-xs shrink-0 hidden sm:inline-flex"
                      >
                        {activeModelLabel}
                      </Badge>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                      Unidade: <strong>{storeName || 'Consolidado'}</strong> •{' '}
                      <span className="font-mono">{activeModelLabel}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsFullScreen(false)}
                    className="h-8 px-2.5 sm:px-3 text-xs font-semibold border-border whitespace-nowrap cursor-pointer"
                    title="Voltar para a tela (Esc)"
                  >
                    <Minimize2 className="mr-1 h-3.5 w-3.5 shrink-0" />
                    <span className="hidden xs:inline">Sair da Tela Cheia</span>
                    <span className="xs:hidden">Voltar</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setIsFullScreen(false)}
                    aria-label="Fechar tela cheia"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Linha 2: Controles (Persona + Analisar + Limpar + Central Copiloto) */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <select
                  value={selectedPersonaCode}
                  onChange={(e) => setSelectedPersonaCode(e.target.value)}
                  aria-label="Selecionar Persona de IA"
                  className="h-8 min-w-0 flex-1 sm:flex-initial sm:w-64 truncate rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground cursor-pointer"
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
                  className="h-8 px-2.5 sm:px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5 shrink-0" />
                  {historyMessages.length > 0 ? 'Nova Análise' : 'Analisar IA'}
                </Button>

                {historyMessages.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleClearLocalHistory}
                    className="h-8 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Limpar histórico de conversa deste módulo"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:mr-1 shrink-0" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsFullScreen(false)
                    navigate('/ai-copilot')
                  }}
                  className="hidden md:inline-flex h-8 px-2.5 text-xs text-primary shrink-0 cursor-pointer"
                >
                  <Bot className="mr-1 h-3.5 w-3.5" />
                  Central Copiloto
                </Button>
              </div>
            </div>

            {/* Barra de Atalhos Rápidos na Tela Cheia */}
            {quickPrompts.length > 0 && (
              <div className="border-b border-border/70 bg-muted/20 px-3 sm:px-6 py-2 shrink-0">
                <div className="mx-auto flex max-w-6xl items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 custom-scrollbar">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                    Atalhos:
                  </span>
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={loading}
                      onClick={() => runAnalysis(qp.prompt)}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-500/35 bg-violet-500/10 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-foreground hover:bg-violet-500/20 transition shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Zap className="h-3 w-3 text-violet-500 shrink-0" />
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Corpo Principal Rolável em Tela Cheia */}
            <div className="flex-1 min-h-0 flex flex-col mx-auto w-full max-w-6xl p-2.5 sm:p-6 overflow-hidden">
              {renderMessagesList(true)}
            </div>

            {/* Barra de Pergunta Fixa no Rodapé da Tela Cheia */}
            <div className="border-t border-border bg-surface/95 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0">
              <form
                onSubmit={handleAskCustom}
                className="mx-auto flex max-w-6xl items-center gap-2"
              >
                <Input
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Pergunte sobre os indicadores desta tela..."
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                  icon={<MessageSquare className="h-4 w-4" />}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  isLoading={loading}
                  disabled={!customQuestion.trim()}
                  className="h-9 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 sm:mr-1.5 shrink-0" />
                  <span className="hidden xs:inline ml-1 sm:ml-0">Enviar</span>
                </Button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
