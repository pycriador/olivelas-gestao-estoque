import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  aiOrchestratorService,
  DEFAULT_AI_PERSONAS,
} from '@/services/aiOrchestratorService'
import { AiMarkdownContent } from '@/components/ai/AiMarkdownContent'
import { DEFAULT_PERMISSION_MODULES } from '@/constants/screenDependencies'
import { useTenant } from '@/hooks/useTenant'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import type {
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
  const [pinnedModelInfo, setPinnedModelInfo] = useState<{
    providerCode: string
    model: string
    sectionLabel: string
  } | null>(null)

  const runAnalysis = useCallback(
    async (promptOverride?: string, personaOverride?: string) => {
      if (!isModuleEnabled) return
      setLoading(true)
      try {
        const res = await aiOrchestratorService.executeModulePrompt({
          storeId: storeId || 'all',
          storeName: storeName || 'Loja Olivelas',
          userId: user?.id || null,
          moduleCode,
          taskType,
          userPrompt: promptOverride || defaultPrompt,
          personaCode: personaOverride || selectedPersonaCode,
          extraContextData,
        })
        setResult(res)
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
      isModuleEnabled,
      moduleCode,
      selectedPersonaCode,
      storeId,
      storeName,
      taskType,
      user?.id,
    ]
  )

  useEffect(() => {
    aiOrchestratorService
      .listPersonas(storeId)
      .then((list) => {
        if (list.length > 0) setPersonas(list)
      })
      .catch(() => {})
    aiOrchestratorService
      .getPinnedModelForTask({ taskType, moduleCode })
      .then((info) => {
        setPinnedModelInfo({
          providerCode: info.providerCode,
          model: info.model,
          sectionLabel: info.sectionLabel,
        })
      })
      .catch(() => {})
  }, [storeId, taskType, moduleCode])

  useEffect(() => {
    if (isModuleEnabled && expanded && !result && !loading) {
      runAnalysis()
    }
  }, [expanded, isModuleEnabled, loading, result, runAnalysis])

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Texto copiado para a área de transferência!')
  }

  const handleAskCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customQuestion.trim()) return
    setExpanded(true)
    runAnalysis(customQuestion.trim())
  }

  if (!isModuleEnabled) {
    return (
      <Card
        className={cn(
          'border-violet-500/35 bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent p-4',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-bold text-foreground">{title}</h3>
                <Badge variant="outline">
                  Add-on Comercial IA ({moduleDefinition?.name || moduleCode})
                </Badge>
                {moduleDefinition && (
                  <Badge variant="default">
                    +{formatCurrency(moduleDefinition.monthlyPrice)}/mês
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Este módulo de Inteligência Artificial analisa dados em tempo real da sua loja. Solicite ao Super Admin a ativação no seu plano comercial.
              </p>
            </div>
          </div>

          {isGlobalAdmin && (
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate('/global-admin?tab=users')}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Habilitar Módulo na Loja
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-violet-500/35 bg-gradient-to-br from-violet-500/[0.07] via-surface to-emerald-500/[0.04] shadow-xs',
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-xs font-bold text-foreground sm:text-sm">
                {title}
              </h3>
              <Badge variant="default" className="font-mono text-[10px]">
                {result
                  ? `${result.providerUsed} • ${result.modelUsed}`
                  : pinnedModelInfo
                    ? `${pinnedModelInfo.providerCode} • ${pinnedModelInfo.model}`
                    : 'Gemini AI Ready'}
              </Badge>
              {result?.fallbackTriggered && (
                <Badge variant="warning" className="text-[10px]">
                  Contingência Analítica Ativa
                </Badge>
              )}
              {result?.promptInjectionBlocked && (
                <Badge variant="danger" className="text-[10px]">
                  Escudo Anti-Injection Ativado
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Persona */}
          <select
            value={selectedPersonaCode}
            onChange={(e) => {
              const nextPersona = e.target.value
              setSelectedPersonaCode(nextPersona)
              runAnalysis(customQuestion.trim() || defaultPrompt, nextPersona)
            }}
            aria-label="Selecionar Persona de IA"
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground"
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
            variant="outline"
            isLoading={loading}
            onClick={() => runAnalysis(customQuestion.trim() || defaultPrompt)}
            className="h-8 text-xs"
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Recalcular IA
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => navigate('/ai-copilot')}
            className="h-8 text-xs text-primary"
          >
            <Bot className="mr-1 h-3.5 w-3.5" />
            Abrir Copiloto
          </Button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={expanded ? 'Recolher análise de IA' : 'Expandir análise de IA'}
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
        <div className="p-4 space-y-4">
          {/* Quick Prompts */}
          {quickPrompts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Análises Rápidas:
              </span>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCustomQuestion(qp.prompt)
                    runAnalysis(qp.prompt)
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-violet-500/20 transition"
                >
                  <Zap className="h-3 w-3 text-violet-500" />
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* KPI Highlights da IA */}
          {result && result.highlights.length > 0 && !compact && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {result.highlights.map((hl, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border p-2.5',
                    hl.severity === 'CRITICAL'
                      ? 'border-danger/40 bg-danger/10'
                      : hl.severity === 'WARNING'
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : hl.severity === 'SUCCESS'
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-border bg-background/80'
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {hl.title}
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-foreground">
                    {hl.metric}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
                    {hl.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resposta Principal da IA */}
          <div className="rounded-xl border border-border/80 bg-background/95 p-3.5 text-xs leading-relaxed text-foreground">
            {loading ? (
              <div className="flex items-center gap-2.5 py-4 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin text-violet-500" />
                <span>
                  A Inteligência Artificial está avaliando o estoque, validades, vendas e oportunidades da loja <strong>{storeName}</strong>...
                </span>
              </div>
            ) : result ? (
              <div className="space-y-3">
                <AiMarkdownContent content={result.answer} />

                {/* Ações Recomendadas pela IA */}
                {result.actionSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {result.actionSuggestions.map((act) => (
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

                    <button
                      type="button"
                      onClick={() => handleCopyText(result.answer)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                      Copiar Diagnóstico
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">
                Clique em <strong>Recalcular IA</strong> para gerar recomendações para esta tela.
              </div>
            )}
          </div>

          {/* Barra de Pergunta Direta ao Módulo */}
          <form onSubmit={handleAskCustom} className="flex items-center gap-2">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Pergunte à IA sobre os dados desta tela (ex: Qual produto tem maior risco ou margem?)..."
                className="h-9 pl-9 text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              variant="default"
              isLoading={loading}
              className="h-9 shrink-0"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Perguntar à IA
            </Button>
          </form>
        </div>
      )}
    </Card>
  )
}
