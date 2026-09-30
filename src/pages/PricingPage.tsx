import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: 'R$ 0',
      period: '/mês (Gratuito)',
      description: 'Ideal para lojas individuais que desejam organizar o estoque e vender no WhatsApp.',
      features: [
        '1 Loja (Tenant)',
        'Até 500 produtos cadastrados',
        'Controle básico de estoque',
        'Catálogo online com link exclusivo',
        'Checkout no WhatsApp',
        'Exportação CSV',
      ],
      cta: 'Começar Grátis',
      popular: false,
    },
    {
      name: 'Professional',
      price: 'R$ 89',
      period: '/mês por loja',
      description: 'Para comércios em crescimento que precisam de lotes, validades e PDV avançado.',
      features: [
        'Multi-lojas ativadas',
        'Produtos e vendas ilimitadas',
        'Controle completo de Lotes & Validades',
        'Frente de Caixa (PDV) ilimitado',
        'Ordens de compra & Fornecedores',
        'Relatórios gerenciais completos',
        'Gestão de equipe e permissões (RBAC)',
      ],
      cta: 'Assinar Plano Pro',
      popular: true,
    },
    {
      name: 'Redes & Franquias',
      price: 'Sob Consulta',
      period: '',
      description: 'Para redes de lojas, franquias e operações que demandam suporte prioritário.',
      features: [
        'Múltiplas lojas & franquias centralizadas',
        'Acesso Global Admin unificado',
        'Trilha de auditoria expandida',
        'Treinamento e migração de dados',
        'SLA de atendimento prioritário',
        'API aberta para integrações de ERP/E-commerce',
      ],
      cta: 'Falar com Consultor',
      popular: false,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Planos transparentes para todas as fases
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Escolha o plano ideal para a sua operação. Cancele ou altere a qualquer momento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`p-8 rounded-3xl bg-surface border transition-all flex flex-col justify-between ${
              plan.popular
                ? 'border-primary ring-2 ring-primary shadow-xl relative scale-105'
                : 'border-border shadow-sm'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-extrabold uppercase tracking-wider shadow-md">
                Mais Escolhido
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
                <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                <span className="text-xs text-muted-foreground ml-1">{plan.period}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border">
                {plan.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2.5 text-xs text-foreground">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8">
              <Link to="/register">
                <Button
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                  className="w-full text-xs font-bold"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
