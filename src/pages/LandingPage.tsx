import { Link } from 'react-router-dom'
import {
  Package,
  Layers,
  ShoppingBag,
  Store,
  ShieldCheck,
  TrendingUp,
  MessageCircle,
  Truck,
  CheckCircle2,
  ArrowRight,
  Clock,
  QrCode
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingPage() {
  const features = [
    {
      icon: Store,
      title: 'Multi-Loja & Multi-Tenant',
      description: 'Gerencie múltiplas unidades, franquias ou filiais de forma completamente isolada e centralizada em uma única plataforma.',
    },
    {
      icon: Layers,
      title: 'Gestão Avançada de Estoque',
      description: 'Controle de saldos em tempo real, histórico de movimentações, ponto de reposição, estoque mínimo e máximo.',
    },
    {
      icon: Clock,
      title: 'Lotes & Validades',
      description: 'Alertas proativos para produtos vencidos e com vencimento crítico em 7 e 30 dias, evitando perdas financeiras.',
    },
    {
      icon: ShoppingBag,
      title: 'PDV & Gestão de Vendas',
      description: 'Frente de caixa ágil com baixa atômica de estoque, suporte a múltiplos métodos de pagamento (PIX, Cartão, Dinheiro) e cancelamentos auditados.',
    },
    {
      icon: MessageCircle,
      title: 'Catálogo Público & WhatsApp',
      description: 'Página exclusiva para sua loja com catálogo online personalizável, carrinho dinâmico e finalização de pedidos diretamente no WhatsApp.',
    },
    {
      icon: Truck,
      title: 'Compras & Fornecedores',
      description: 'Emissão de ordens de compra e recebimento conferido de mercadorias com entrada automática no estoque e geração de lotes.',
    },
    {
      icon: TrendingUp,
      title: 'Relatórios & Exportação',
      description: 'Métricas de faturamento, ticket médio, curvas de produtos mais vendidos e exportação segura para CSV e impressão.',
    },
    {
      icon: ShieldCheck,
      title: 'Segurança & RLS PostgreSQL',
      description: 'Isolamento rigoroso por Row Level Security (RLS) no banco de dados, trilha de auditoria completa e controle granular de permissões.',
    },
  ]

  const faqs = [
    {
      q: 'Como funciona o isolamento multi-loja?',
      a: 'Cada loja opera como um tenant independente protegido por políticas nativas de PostgreSQL (Row Level Security). Os usuários de uma loja nunca conseguem acessar ou visualizar dados de outra filial.',
    },
    {
      q: 'O catálogo público funciona sem login para os clientes?',
      a: 'Sim! Seus clientes acessam o link exclusivo da sua loja (ex: /store/sua-loja), navegam pelos produtos publicados, adicionam itens ao carrinho e enviam o pedido formatado para o seu WhatsApp.',
    },
    {
      q: 'Posso cadastrar diferentes perfis de equipe na mesma loja?',
      a: 'Sim. A plataforma conta com perfis pré-configurados: Administrador da Loja, Vendedor, Estoquista, Financeiro e Visualizador, cada um com permissões específicas de acesso.',
    },
    {
      q: 'Como são tratados os cancelamentos de venda?',
      a: 'Nenhum registro de venda é simplesmente apagado. O cancelamento exige motivo, gera registro no log de auditoria e executa um procedimento atômico de estorno do estoque.',
    },
  ]

  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase">
          🚀 Plataforma SaaS Enterprise Multi-Tenant
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Gestão completa de <span className="text-primary">estoque, vendas e lojas</span> em uma só solução.
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Centralize o controle de produtos, validades, lotes, compras, pedidos omnicanal e catálogo com checkout no WhatsApp com total segurança e desempenho em tempo real.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/register">
            <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
              Começar Agora Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              Acessar Minha Conta
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Badges */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" /> Multi-Tenant Real
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" /> Controle de Validade & Lote
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" /> Catálogo WhatsApp
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" /> PostgreSQL RLS Seguro
          </span>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tudo o que sua operação precisa para crescer
          </h2>
          <p className="text-sm text-muted-foreground">
            Arquitetura robusta pensada para lojas individuais ou redes inteiras de franquias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-surface border border-border shadow-sm hover:border-primary/50 transition-all duration-200 hover:-translate-y-1"
              >
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-foreground">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* WhatsApp Catalog Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-background border border-primary/20 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold">
              <MessageCircle className="h-3.5 w-3.5" /> Canal WhatsApp Integrado
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Venda mais com seu Catálogo Digital Direto no WhatsApp
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Publique seus produtos com fotos, preços e categorias em segundos. Seus clientes montam o carrinho no navegador e o pedido chega pronto para você fechar a venda no WhatsApp.
            </p>
            <div className="pt-2">
              <Link to="/register">
                <Button size="default" className="shadow-md">
                  Criar Meu Catálogo Grátis
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="h-10 w-10 rounded-full bg-success/20 text-success flex items-center justify-center font-bold">
                📱
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Loja Exemplo Online</div>
                <div className="text-[11px] text-muted-foreground">Catálogo Aberto</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-lg border border-border/50">
              &quot;Olá! Gostaria de fazer o pedido: <br />
              - 2x Azeite Extra Virgem 500ml (R$ 84,00)<br />
              - 1x Azeitonas Recheadas (R$ 18,50)<br />
              <b>Total: R$ 102,50</b>&quot;
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold">Perguntas Frequentes</h2>
          <p className="text-xs text-muted-foreground">Tire suas dúvidas sobre a plataforma</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-surface border border-border space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div className="p-12 rounded-3xl bg-primary text-primary-foreground space-y-6 shadow-2xl shadow-primary/30">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Pronto para transformar a gestão do seu estoque?
          </h2>
          <p className="text-sm text-primary-foreground/90 max-w-xl mx-auto">
            Cadastre sua primeira loja agora mesmo e tenha controle absoluto sobre seus produtos, compras e vendas.
          </p>
          <div className="pt-2">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="font-bold text-primary px-8">
                Começar Agora
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
