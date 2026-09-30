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
  QrCode,
  Sparkles,
  BarChart3,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  Smartphone,
  Building2,
  Apple,
  Wine,
  ShoppingBasket
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingPage() {
  const mainFeatures = [
    {
      icon: Layers,
      title: 'Controle de Estoque em Tempo Real',
      description:
        'Acompanhe entradas, saídas, transferências, perdas e saldos instantaneamente. Defina estoque mínimo e máximo para nunca deixar faltar produtos.',
      badge: 'Essencial',
    },
    {
      icon: Clock,
      title: 'Gestão Inteligente de Lotes & Validades',
      description:
        'Evite prejuízos e desperdícios com alertas automáticos para itens vencidos e com vencimento próximo (7 e 30 dias). Perfeito para produtos perecíveis.',
      badge: 'Diferencial',
    },
    {
      icon: ShoppingBag,
      title: 'Frente de Caixa (PDV) Ágil e Preciso',
      description:
        'Venda com rapidez usando leitor de código de barras ou busca instantânea. Suporte a PIX, Cartão e Dinheiro com baixa atômica de estoque.',
      badge: 'Alta Performance',
    },
    {
      icon: MessageCircle,
      title: 'Catálogo Online Integrado ao WhatsApp',
      description:
        'Disponibilize um link próprio com fotos, preços e categorias da sua loja. O cliente monta o carrinho no navegador e o pedido chega pronto no seu WhatsApp.',
      badge: 'Venda Mais',
    },
    {
      icon: Truck,
      title: 'Compras, Fornecedores & Entrada de Lotes',
      description:
        'Organize pedidos de compra, controle histórico de fornecedores e faça a conferência de mercadorias com entrada direta no estoque.',
      badge: 'Gestão Completa',
    },
    {
      icon: Store,
      title: 'Gestão de Múltiplas Lojas e Filiais',
      description:
        'Administre uma ou várias unidades de forma independente e segura. Alterne entre filiais com um clique e tenha visão consolidada.',
      badge: 'Multi-Filiais',
    },
    {
      icon: BarChart3,
      title: 'Relatórios de Desempenho & Vendas',
      description:
        'Descubra seus produtos mais vendidos, margens de lucro, faturamento diário e mensal, além de exportação rápida para Excel/CSV e impressão.',
      badge: 'Decisões Inteligentes',
    },
    {
      icon: ShieldCheck,
      title: 'Segurança Total & Controle de Equipe',
      description:
        'Defina o que cada colaborador pode ver ou alterar (Administrador, Caixa, Estoquista, Vendedor) com registro completo de auditoria.',
      badge: 'Segurança Máxima',
    },
  ]

  const workflowSteps = [
    {
      step: '01',
      title: 'Cadastro & Importação',
      desc: 'Cadastre produtos com fotos, códigos de barras, categorias e preços, ou importe centenas de itens de uma vez via planilhas CSV.',
    },
    {
      step: '02',
      title: 'Controle de Lotes & Saldos',
      desc: 'Dê entrada de mercadorias informando datas de validade e lotes. O sistema avisa quando produtos estiverem próximos do vencimento.',
    },
    {
      step: '03',
      title: 'Vendas no Caixa e Online',
      desc: 'Atenda clientes fisicamente no PDV rápido ou compartilhe o link do seu catálogo digital para receber pedidos no WhatsApp.',
    },
    {
      step: '04',
      title: 'Relatórios & Decisão',
      desc: 'Acompanhe seu faturamento, reposição de estoque, produtos com maior margem e tome decisões com base em números confiáveis.',
    },
  ]

  const targetSegments = [
    {
      icon: Apple,
      title: 'Hortifrutis & Feirantes',
      desc: 'Controle rigoroso de pesagem (KG/UN), perecibilidade e giro rápido de estoque.',
    },
    {
      icon: ShoppingBasket,
      title: 'Mercados & Mercearias',
      desc: 'Agilidade na frente de caixa, código de barras e controle de centenas de categorias.',
    },
    {
      icon: Wine,
      title: 'Empórios & Bebidas',
      desc: 'Rastreabilidade de lotes, produtos artesanais e catálogo digital para pedidos rápidos.',
    },
    {
      icon: Building2,
      title: 'Redes & Lojas Físicas',
      desc: 'Gestão de estoque centralizada ou por filial, controle de equipes e compras organizadas.',
    },
  ]

  const faqs = [
    {
      q: 'Como funciona o controle de validade e lotes?',
      a: 'Ao dar entrada em uma mercadoria, você pode informar o número do lote e a data de validade. O sistema classifica automaticamente os itens em: no prazo, vencendo em até 30 dias, vencendo em até 7 dias e já vencidos, permitindo criar promoções ou descartes antes que o prejuízo aconteça.',
    },
    {
      q: 'Como meus clientes fazem pedidos pelo catálogo online?',
      a: 'Sua loja ganha um endereço exclusivo (exemplo: /store/sua-loja). Seus clientes podem acessar pelo celular ou computador sem precisar instalar nada, visualizar fotos e preços dos produtos, montar o carrinho e clicar em "Finalizar no WhatsApp". Você recebe a mensagem pronta com todos os itens, quantidades e valores calculados.',
    },
    {
      q: 'Consigo gerenciar mais de uma loja ou filial?',
      a: 'Sim! Você pode criar e gerenciar múltiplas unidades com total isolamento de dados. Cada loja possui seus próprios produtos, estoques, operadores e histórico de vendas, com facilidade para alternar entre elas no menu superior.',
    },
    {
      q: 'Posso cadastrar colaboradores com diferentes permissões?',
      a: 'Sim. Você pode convidar membros da sua equipe e atribuir funções específicas, como Administrador, Vendedor (acesso a vendas/PDV), Estoquista (gestão de entradas e lotes) e Financeiro, garantindo que cada colaborador acesse apenas o que é necessário.',
    },
    {
      q: 'É fácil importar produtos de outros sistemas ou planilhas?',
      a: 'Muito fácil! A ferramenta possui importação em massa inteligente via arquivos CSV ou JSON. Basta arrastar sua planilha existente ou colar o texto com nomes e preços que o sistema reconhece as colunas automaticamente e cadastra tudo em poucos segundos.',
    },
    {
      q: 'Posso adicionar fotos aos produtos pelo celular?',
      a: 'Sim. A galeria de produtos permite enviar imagens do computador, tirar foto na hora com a câmera do celular ou reutilizar imagens já cadastradas na sua biblioteca.',
    },
  ]

  return (
    <div className="space-y-24 py-8 sm:py-14">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide shadow-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Solução Completa para Varejo, Mercados, Empórios e Comércios</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
          Controle seu estoque, <span className="text-primary">acelere suas vendas</span> e gerencie suas lojas em um só lugar.
        </h1>

        <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Diga adeus a perdas por vencimento e planilhas confusas. Tenha controle em tempo real de produtos, lotes, compras com fornecedores, frente de caixa (PDV) ágil e um catálogo digital integrado ao WhatsApp.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link to="/register">
            <Button size="lg" className="h-12 px-8 text-sm sm:text-base font-semibold shadow-lg shadow-primary/25">
              Começar Agora Gratuitamente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="h-12 px-8 text-sm sm:text-base font-semibold">
              Acessar Minha Conta
            </Button>
          </Link>
        </div>

        {/* Highlight Pills */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Controle Preciso de Estoque
          </span>
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Alertas de Validade & Lotes
          </span>
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> PDV Frente de Caixa Rápido
          </span>
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Catálogo com Pedidos no WhatsApp
          </span>
        </div>
      </section>

      {/* Segmentos Atendidos */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Feito sob medida para o seu segmento
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Estruturado para atender as necessidades práticas do comércio do dia a dia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {targetSegments.map((seg, idx) => {
            const Icon = seg.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-surface border border-border shadow-xs hover:border-primary/50 transition-all duration-200"
              >
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit mb-3">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">{seg.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{seg.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Tudo o que sua operação precisa para vender mais e perder menos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Ferramentas completas e integradas para substituir planilhas manuais e sistemas lentos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {mainFeatures.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-surface border border-border shadow-xs hover:border-primary/50 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold mb-2 text-foreground">{feat.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-muted/30 border border-border p-8 sm:p-12 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Como funciona o fluxo na prática
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Um processo simples, rápido e à prova de erros para o seu cotidiano comercial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step, idx) => (
              <div key={idx} className="relative bg-surface p-6 rounded-2xl border border-border space-y-3">
                <div className="text-3xl font-extrabold text-primary/30 font-mono">
                  {step.step}
                </div>
                <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp Catalog Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-surface to-background border border-emerald-500/20 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <MessageCircle className="h-3.5 w-3.5" /> Canal de Vendas WhatsApp
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Seu Catálogo Digital Pronto para Vender no WhatsApp
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Publique seus produtos com fotos nítidas, descrições e preços em segundos. Seus clientes navegam pelo link da sua loja, montam o carrinho de compras no celular e o pedido chega detalhado direto no WhatsApp do seu vendedor.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button size="default" className="shadow-md font-semibold">
                  Criar Catálogo da Minha Loja
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                🛒
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Catálogo Online da Loja</div>
                <div className="text-[11px] text-muted-foreground">Pedidos Diretos no WhatsApp</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-xl border border-border/50 space-y-2 font-mono">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                📲 Mensagem de Pedido Recebida:
              </div>
              <div className="text-[11px] leading-relaxed">
                &quot;Olá! Gostaria de fazer o pedido:<br />
                • 2x Azeite Extra Virgem 500ml (R$ 99,80)<br />
                • 1x Queijo Meia Cura 500g (R$ 38,00)<br />
                • 1x Vinagre Balsâmico 250ml (R$ 24,50)<br />
                <b>Total: R$ 162,30</b><br />
                Entrega: Rua das Flores, 120&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Perguntas Frequentes</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Tire suas dúvidas sobre o funcionamento do sistema</p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-surface border border-border space-y-2">
              <h3 className="text-sm font-bold text-foreground">{faq.q}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <div className="p-10 sm:p-14 rounded-3xl bg-primary text-primary-foreground space-y-6 shadow-2xl shadow-primary/30">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Pronto para transformar a gestão do seu comércio?
          </h2>
          <p className="text-xs sm:text-sm text-primary-foreground/90 max-w-xl mx-auto leading-relaxed">
            Cadastre sua loja agora mesmo e tenha controle absoluto sobre seus produtos, compras, validades e vendas.
          </p>
          <div className="pt-2">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="font-bold text-primary px-8 h-12 text-sm sm:text-base">
                Criar Conta Gratuita
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
