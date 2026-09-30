import { Link } from 'react-router-dom'
import {
  Layers,
  ShoppingBag,
  Store,
  Clock,
  Truck,
  ShieldCheck,
  TrendingUp,
  MessageCircle,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FeaturesPage() {
  const modules = [
    {
      icon: Layers,
      title: 'Controle de Estoque & Movimentações',
      desc: 'Gestão de entradas, saídas, perdas, avarias, transferências e inventários físicos com atualização imediata de saldos.',
    },
    {
      icon: Clock,
      title: 'Gestão de Lotes & Validades',
      desc: 'Painel com classificação de vencidos, produtos a vencer em 7 e 30 dias para evitar descarte e planejar liquidações.',
    },
    {
      icon: ShoppingBag,
      title: 'Frente de Caixa (PDV) Ágil',
      desc: 'Lançamento instantâneo de vendas com múltiplos pagamentos, baixa automática no estoque e comprovantes.',
    },
    {
      icon: MessageCircle,
      title: 'Catálogo Online com WhatsApp',
      desc: 'Cada loja ganha seu link exclusivo para exibir produtos, receber pedidos montados no carrinho e fechar no WhatsApp.',
    },
    {
      icon: Store,
      title: 'Gestão de Múltiplas Lojas & Filiais',
      desc: 'Unidades independentes, visualização centralizada para o Administrador e troca rápida entre filiais.',
    },
    {
      icon: Truck,
      title: 'Gestão de Compras & Fornecedores',
      desc: 'Emissão de ordens de compra, acompanhamento de custos e entrada conferida com atualização direta de estoque.',
    },
    {
      icon: TrendingUp,
      title: 'Relatórios Gerenciais & Exportação',
      desc: 'Curvas de vendas, produtos com baixo estoque, relatórios em CSV e documentos prontos para impressão.',
    },
    {
      icon: ShieldCheck,
      title: 'Segurança & RLS PostgreSQL',
      desc: 'Isolamento garantido por políticas de segurança no banco de dados e auditoria completa de ações críticas.',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Recursos Completos para o seu Negócio
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Desenvolvido para garantir precisão máxima no controle de estoque, compras organizadas e agilidade no atendimento de vendas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {modules.map((m, idx) => {
          const Icon = m.icon
          return (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-surface border border-border shadow-sm flex items-start gap-5 hover:border-primary/50 transition-all"
            >
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                <Icon className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-10 rounded-3xl bg-surface border border-border text-center space-y-4 max-w-3xl mx-auto">
        <h3 className="text-xl font-bold">Experimente todos os recursos sem compromisso</h3>
        <p className="text-xs text-muted-foreground">
          Crie sua loja e equipe em menos de 2 minutos.
        </p>
        <Link to="/register">
          <Button size="lg" className="shadow-lg shadow-primary/20">
            Criar Conta Gratuita <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
