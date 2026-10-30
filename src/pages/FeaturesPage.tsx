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
  ArrowRight,
  Users,
  BarChart3,
  Webhook,
  CreditCard,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FeaturesPage() {
  const modules = [
    {
      icon: TrendingUp,
      title: 'Dashboard Executivo Multi-Loja & BI (/dashboard)',
      desc: 'Gráficos comparativos de desempenho por loja (Matriz vs. Filiais), evolução de Vendas Mensais (12 meses), Ranking de Produtos Mais Vendidos com margem e estoque, filtros de período (Hoje, 7d, 30d, 90d, Este Mês, De/Até) e exportação em CSV, JSON e PDF.',
    },
    {
      icon: Layers,
      title: 'Controle de Estoque & Aprovador de Baixa (/inventory)',
      desc: 'Saldos físicos em tempo real, valorização a preço de custo e venda, movimentações auditadas, baixa em lote e fluxo estrito de Aprovador de Baixa de Estoque (STOCK_APPROVER) com fila de aprovação pendente e limite de alçada financeira.',
    },
    {
      icon: Clock,
      title: 'Gestão de Lotes & Validades (/expiration)',
      desc: 'Monitoramento automático de lotes vencidos, críticos (≤ 7 dias), em atenção (≤ 30 dias) e no prazo, com registro de justificativas e destinação de lotes (batch_dispositions).',
    },
    {
      icon: Store,
      title: 'Hierarquia Matriz → Filiais & Remessa Sem Venda (/stores)',
      desc: 'Organização hierárquica de filiais abaixo da loja Matriz e transferência atômica de produtos e lotes do estoque para filiais sem necessidade de registrar uma venda, deixando os itens prontos para o PDV da filial.',
    },
    {
      icon: ShoppingBag,
      title: 'Frente de Caixa (PDV) & Produtos Pesáveis (/sales)',
      desc: 'Venda ágil com código de barras, suporte a itens vendidos por peso (gramas, quilos ou valor em R$), cadastro rápido de clientes, associação automática de Cliente Genérico e reabertura de pedidos para edição no PDV.',
    },
    {
      icon: Users,
      title: 'Clientes, Pedidos por URL & Visões Salvas no Banco (/customers)',
      desc: 'Listagem de todos os pedidos realizados por cada cliente com link direto e filtragem por URL (?customerId=...&orderId=...), seleção múltipla de status (Abertos, Fechados, Cancelados), visões salvas no banco individualmente por loja/filial e exportação detalhada somente dos itens visíveis.',
    },
    {
      icon: BarChart3,
      title: '9 Relatórios Analíticos com Data, Hora & Período (/reports)',
      desc: 'Valorização de Estoque, Curva ABC (80/15/5), Giro & Sugestão de Compra, Ticket Médio & Pedidos por Cliente, Investimento & GMROI, Registro de Compras com Data e Hora, Perdas, Rupturas e Vendas com filtros personalizados de data e exportação dos registros visíveis.',
    },
    {
      icon: Truck,
      title: 'Gestão de Compras, Fornecedores & Markup (/purchases)',
      desc: 'Emissão de ordens de compra vinculadas a fornecedores, cálculo em tempo real de custo unitário, markup, preço de venda sugerido e lucro previsto, com recebimento conferido que alimenta lotes e saldos automaticamente.',
    },
    {
      icon: MessageCircle,
      title: 'Catálogo Público Online com WhatsApp (/store/:slug)',
      desc: 'Cada loja possui sua vitrine digital pública com busca, filtro por categorias, suporte a produtos pesáveis (KG) e envio do pedido formatado diretamente para o WhatsApp da loja.',
    },
    {
      icon: UserCheck,
      title: 'Funcionários, Papéis & 10 Licenças Grátis por Loja (/team)',
      desc: 'Cadastro de colaboradores com matrícula, cargo, papéis customizados por loja, 47 permissões granulares, telas de edição com URL própria (/team/stores/:storeId/employees/:employeeId) e franquia padrão de 10 funcionários grátis por loja.',
    },
    {
      icon: CreditCard,
      title: 'Planos SaaS, Grafo de Dependências & Financeiro (/global-admin)',
      desc: 'Grupos comerciais de permissões com valores mensais, grafo inteligente que alerta o que pode parar de funcionar ao desmarcar uma tela (mesmo para Admin Loja), gestão de regras de licenciamento e livro-razão de pagamentos.',
    },
    {
      icon: Webhook,
      title: 'API Studio Estilo Postman & Tokens HBAC (/integrations)',
      desc: 'Conector HTTP externo com importação/exportação cURL, mapeamento visual De → Para, simulação Dry-Run e chaves de API HBAC (olv_live_...) com escopos granulares por loja para integração com ERPs e Agentes de IA.',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" /> Arquitetura Multi-Loja Completa
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Todos os Recursos da Plataforma Olivelas
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Conheça em detalhes os 12 módulos projetados para garantir precisão absoluta no estoque, governança entre matriz e filiais, agilidade nas vendas e inteligência analítica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((m, idx) => {
          const Icon = m.icon
          return (
            <div
              key={idx}
              className="p-7 rounded-3xl bg-surface border border-border shadow-sm flex items-start gap-5 hover:border-primary/50 transition-all"
            >
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-foreground">{m.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-10 rounded-3xl bg-surface border border-border text-center space-y-4 max-w-3xl mx-auto">
        <h3 className="text-xl font-bold">Experimente todos os recursos na prática</h3>
        <p className="text-xs text-muted-foreground">
          Crie sua conta gratuita ou acesse a galeria de evidências homologadas.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link to="/register">
            <Button size="lg" className="shadow-lg shadow-primary/20">
              Criar Conta Gratuita <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link to="/evidence">
            <Button variant="outline" size="lg">
              Ver Galeria de 50 Telas
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
