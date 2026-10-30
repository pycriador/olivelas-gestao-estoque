import { useEffect, useState } from 'react'
import { Check, Users, ShieldCheck, Building2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { permissionGroupService } from '@/services/permissionGroupService'
import { InteractivePlanBuilderSection } from '@/components/commercial/InteractivePlanBuilderSection'
import type { PermissionGroup, PermissionModule } from '@/types/permissionGroup.types'
import { toast } from 'sonner'

const FREE_EMPLOYEES_PER_STORE = 10

export function PricingPage() {
  const [plans, setPlans] = useState<PermissionGroup[]>([])
  const [modules, setModules] = useState<PermissionModule[]>([])
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | null>(null)
  const [selectionTrigger, setSelectionTrigger] = useState(0)

  useEffect(() => {
    Promise.all([
      permissionGroupService.listPublicLandingPlans(),
      permissionGroupService.listModules(),
    ])
      .then(([loadedPlans, loadedModules]) => {
        setPlans(loadedPlans)
        setModules(loadedModules)
      })
      .catch(() => {})
  }, [])

  const getModuleName = (code: string) =>
    modules.find((m) => m.code === code)?.name || code

  const handleSelectPlanToCustomize = (plan: PermissionGroup) => {
    setPreselectedPlanId(plan.id)
    setSelectionTrigger((prev) => prev + 1)
    toast.success(`Plano "${plan.name}" adicionado ao carrinho para personalizar!`)
    if (window.location.hash !== '#personalizar-plano') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#personalizar-plano`)
    }
    const target = document.getElementById('personalizar-plano')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-20">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Planos Vinculados pelo Global Admin
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Planos modulares sob medida para sua operação
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Monte pacotes de funcionalidades de acordo com a necessidade de cada cliente. Funcionários operacionais da loja não pagam plano individual — apenas o titular Admin Loja possui assinatura.
        </p>
      </div>

      {/* Vitrine dos Planos Vinculados na Landing Page */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-8 rounded-3xl bg-surface border transition-all flex flex-col justify-between ${
              plan.isHighlightedOnLanding
                ? 'border-primary ring-2 ring-primary shadow-xl relative md:scale-105'
                : 'border-border shadow-sm'
            }`}
          >
            {plan.isHighlightedOnLanding && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-extrabold uppercase tracking-wider shadow-md">
                Mais Popular
              </span>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                  {plan.description}
                </p>
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-foreground">
                  R$ {Number(plan.baseMonthlyPrice || 0).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">/mês por Admin Loja</span>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ou R$ {Number(plan.annualPrice || 0).toFixed(2)}/ano no plano anual
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border">
                <div className="flex items-center gap-2.5 text-xs text-foreground font-semibold">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Até {FREE_EMPLOYEES_PER_STORE} funcionários operacionais grátis por loja</span>
                </div>
                {(plan.enabledModules || []).map((code) => (
                  <div key={code} className="flex items-center gap-2.5 text-xs text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{getModuleName(code)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <Button
                type="button"
                variant={plan.isHighlightedOnLanding ? 'default' : 'outline'}
                size="lg"
                className="w-full text-xs font-bold"
                onClick={() => handleSelectPlanToCustomize(plan)}
              >
                Personalizar & Solicitar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Configurador Interativo de Planos + Adicionais Avulsos + Pré-Cadastro */}
      <InteractivePlanBuilderSection
        id="personalizar-plano"
        preselectedPlanId={preselectedPlanId}
        selectionTrigger={selectionTrigger}
      />

      {/* Regras Comerciais & Licenciamento Transparente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 max-w-6xl mx-auto">
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Users className="h-4 w-4" />
            <span>10 Funcionários Grátis por Loja</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cada unidade conta com franquia gratuita de até 10 funcionários ativos (vendedores, estoquistas, aprovadores de baixa, financeiro). Licenças adicionais são configuráveis por unidade.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Módulos Avulsos & Grafo de Telas</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O Global Admin pode personalizar quais módulos cada Admin Loja contrata, visualizando em tempo real a relação de dependência entre telas e o valor mensal resultante.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Building2 className="h-4 w-4" />
            <span>Expansão para Filiais</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cadastre filiais vinculadas à Matriz com código próprio, gerente responsável e transferência direta de lotes de estoque sem necessidade de venda.
          </p>
        </div>
      </div>
    </div>
  )
}
