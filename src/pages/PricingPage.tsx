import { Link } from 'react-router-dom'
import { Check, Users, ShieldCheck, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PricingPage() {
  const plans = [
    {
      name: 'Catálogo & Pedidos WhatsApp',
      price: 'R$ 49,90',
      period: '/mês por Store Admin',
      description: 'Ideal para comércios que desejam vender pelo catálogo digital com pedidos diretos no WhatsApp.',
      features: [
        'Catálogo Público Online (/store/sua-loja)',
        'Produtos unitários e pesáveis (KG / gramas)',
        'Gestão de Clientes com histórico de pedidos',
        'Visões de filtros salvas no banco por loja',
        'Até 10 funcionários operacionais grátis por loja',
        'Exportação detalhada dos pedidos visíveis (CSV)',
      ],
      cta: 'Começar com Catálogo',
      popular: false,
    },
    {
      name: 'Controle de Estoque & Validades',
      price: 'R$ 99,90',
      period: '/mês por Store Admin',
      description: 'Para operações focadas em controle rigoroso de lotes, validades, compras e aprovadores de baixa.',
      features: [
        'Tudo do plano Catálogo WhatsApp',
        'Controle completo de Saldos, Lotes & Validades',
        'Alertas automáticos de vencimento (7 e 30 dias)',
        'Fluxo de Aprovador de Baixa (STOCK_APPROVER)',
        'Ordens de Compra, Fornecedores & Cálculo de Markup',
        'Até 10 funcionários operacionais grátis por loja',
      ],
      cta: 'Escolher Controle de Estoque',
      popular: false,
    },
    {
      name: 'ERP Completo + PDV + Filiais',
      price: 'R$ 189,90',
      period: '/mês por Store Admin',
      description: 'Solução completa com Frente de Caixa (PDV), Matriz & Filiais, Dashboard BI, 9 Relatórios e API Studio.',
      features: [
        'Frente de Caixa (PDV) ilimitado (UN e KG)',
        'Hierarquia Matriz → Filiais & Remessa Sem Venda',
        'Dashboard Executivo Multi-Loja & Vendas Mensais',
        'Todos os 9 Relatórios Analíticos com Data e Hora',
        'API Studio (Postman) & Chaves REST HBAC',
        'Até 10 funcionários grátis por loja (+ R$ 19,90/licença extra)',
      ],
      cta: 'Assinar ERP Completo',
      popular: true,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Planos modulares sob medida para sua operação
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Monte pacotes de funcionalidades de acordo com a necessidade de cada cliente. Funcionários operacionais da loja não pagam plano individual — apenas o titular Store Admin possui assinatura.
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
                Mais Completo
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
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
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

      {/* Regras Comerciais & Licenciamento Transparente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
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
            O Global Admin pode personalizar quais módulos cada Store Admin contrata, visualizando em tempo real a relação de dependência entre telas e o valor mensal resultante.
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
