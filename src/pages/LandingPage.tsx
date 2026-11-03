import { Link } from 'react-router-dom'
import {
  Layers,
  ShoppingBag,
  Store,
  ShieldCheck,
  MessageCircle,
  Truck,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart3,
  Building2,
  Apple,
  Wine,
  ShoppingBasket,
  Users,
  TrendingUp,
  Webhook,
  CreditCard,
  BookmarkCheck,
  Scale,
  KeyRound,
  Database,
  FileSpreadsheet,
  GitBranch,
  UserCheck,
  Bot,
  BrainCircuit,
  FileSignature,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InteractivePlanBuilderSection } from '@/components/commercial/InteractivePlanBuilderSection'

export function LandingPage() {
  const mainFeatures = [
    {
      icon: Bot,
      title: 'Copiloto IA & Chatbot Executivo da Loja',
      description:
        'Converse com a IA da sua loja (/ai-copilot e assistente flutuante) com Context Prompt Injection em tempo real, Personas configuráveis (CFO, Comercial, Auditor FEFO) e simulador "E Se?".',
      badge: 'IA Gemini Principal',
    },
    {
      icon: BrainCircuit,
      title: 'IA em Todos os Módulos & Add-ons SaaS',
      description:
        'Sugestão de produtos para clientes (CRM/PDV), tendências de compras, resumo mensal de vendas, alertas inteligentes de vencimento e cofre de chaves API (Gemini, OpenAI, Claude, Custom).',
      badge: '5 Módulos de IA',
    },
    {
      icon: TrendingUp,
      title: 'Dashboard Executivo Multi-Loja & BI',
      description:
        'Gráficos comparativos por loja (Matriz vs. Filiais), Vendas Mensais (12 meses), Top Produtos Mais Vendidos com margem, filtros de período e download em CSV, JSON e PDF.',
      badge: 'Business Intelligence',
    },
    {
      icon: Layers,
      title: 'Controle de Estoque & Aprovador de Baixa',
      description:
        'Saldos em tempo real, valorização a custo/venda, baixas em lote e trava exclusiva de Aprovador de Baixa (STOCK_APPROVER) com fila de aprovação e limite de alçada.',
      badge: 'Governança de Estoque',
    },
    {
      icon: Clock,
      title: 'Gestão Inteligente de Lotes & Validades',
      description:
        'Evite desperdícios com classificação automática de lotes vencidos, críticos (≤ 7 dias) e em atenção (≤ 30 dias), alertas da IA ao Administrador e histórico de destinação.',
      badge: 'Zero Desperdício',
    },
    {
      icon: GitBranch,
      title: 'Hierarquia Matriz → Filiais & Remessas',
      description:
        'Estrutura hierárquica de filiais abaixo da matriz e transferência atômica de produtos e lotes para filiais sem necessidade de registrar venda.',
      badge: 'Multi-Filiais',
    },
    {
      icon: ShoppingBag,
      title: 'PDV Frente de Caixa & Pesagem (KG/g)',
      description:
        'Venda rápida com código de barras, itens pesáveis fracionados (gramas, quilos ou valor em R$), cross-sell assistido por IA e reabertura/edição de pedidos no PDV.',
      badge: 'Alta Performance',
    },
    {
      icon: Users,
      title: 'Clientes, Pedidos por URL & Visões Salvas',
      description:
        'Histórico de todos os pedidos do cliente com link direto na URL, seleção múltipla de status, recomendação de produtos por IA, visões salvas por loja/filial e exportação detalhada.',
      badge: 'CRM & Rastreabilidade',
    },
    {
      icon: BarChart3,
      title: '9 Relatórios Analíticos com Data e Hora',
      description:
        'Curva ABC (80/15/5), Giro & Sugestão de Compra, Ticket Médio & Pedidos por Cliente, Registro de Compras e Vendas com data/hora exatas e explicação executiva por IA.',
      badge: 'Decisões Precisas',
    },
    {
      icon: Truck,
      title: 'Compras, Tendências IA & Markup',
      description:
        'Emissão e recebimento de ordens de compra com cálculo automático de custo unitário, markup, margem de lucro, previsão de ruptura por IA e sincronização de lotes.',
      badge: 'Compras Inteligentes',
    },
    {
      icon: MessageCircle,
      title: 'Catálogo Online Integrado ao WhatsApp',
      description:
        'Link público exclusivo por loja (/store/sua-loja) com suporte a itens unitários e pesáveis (KG), carrinho interativo e pedido formatado direto no WhatsApp.',
      badge: 'Venda Digital',
    },
    {
      icon: UserCheck,
      title: 'Equipe, Política de PIN & 10 Grátis',
      description:
        'Cada loja conta com 10 funcionários grátis, papéis customizados, 47 permissões granulares, reset obrigatório e política de complexidade de PIN.',
      badge: 'Gestão de Equipe',
    },
    {
      icon: FileSignature,
      title: 'Novos Contratos, DOCX/PDF & Google Drive',
      description:
        'Configurador interativo de planos na Landing Page, fila "Novos Contratos" e Gerenciador de Contratos com exportação em HTML, DOCX e PDF sincronizado no Supabase e Google Drive.',
      badge: 'Contratos Digitais',
    },
    {
      icon: CreditCard,
      title: 'Planos SaaS, Grafo de Telas & Financeiro',
      description:
        'Grupos de permissões com valores comerciais, módulos de IA como acréscimo (add-ons), grafo de dependências entre telas, regras de licenças e livro-razão de faturas.',
      badge: 'Monetização SaaS',
    },
    {
      icon: Webhook,
      title: 'API Studio (Postman) & Tokens HBAC',
      description:
        'Conector HTTP externo com importação cURL, mapeamento visual De → Para, simulação Dry-Run e tokens HBAC por loja para agentes de IA e ERPs.',
      badge: 'Integração Aberta',
    },
    {
      icon: Database,
      title: 'Backups Multi-Loja & DB Explorer',
      description:
        'Exporte dumps SQL relacionais com INSERT INTO, pacotes ZIP de imagens com manifesto e JSON completo, além de explorador CRUD dinâmico para o Super Admin.',
      badge: 'Segurança de Dados',
    },
  ]

  const aiSuiteHighlights = [
    {
      code: 'MOD_AI_COPILOT_CHAT',
      title: 'IA Copiloto & Chatbot Executivo da Loja',
      price: '+ R$ 49,90/mês',
      desc: 'Converse com a IA sobre vendas do mês, produtos mais vendidos, margem, rupturas e simulações "E Se?" com dados reais da sua loja.',
    },
    {
      code: 'MOD_AI_SALES_CRM',
      title: 'IA Comercial: Sugestão de Produtos & Cross-Sell',
      price: '+ R$ 39,90/mês',
      desc: 'Avalia o perfil de compra de cada cliente para recomendar produtos ideais, combos no PDV e mensagens prontas para WhatsApp.',
    },
    {
      code: 'MOD_AI_INVENTORY_EXPIRATION',
      title: 'IA de Estoque, Alertas FEFO & Anti-Vencimento',
      price: '+ R$ 39,90/mês',
      desc: 'Avisa proativamente o Administrador da loja quando lotes estão vencendo e sugere campanhas de queima ou remessa para filiais.',
    },
    {
      code: 'MOD_AI_PURCHASING_TRENDS',
      title: 'IA de Tendências de Compras & Reposição',
      price: '+ R$ 39,90/mês',
      desc: 'Identifica tendências de consumo, velocidade de giro (runout em dias) e sugere ordens de compra antes que os campeões de venda acabem.',
    },
    {
      code: 'MOD_AI_BI_INSIGHTS',
      title: 'IA Executiva: Resumos Mensais & Oportunidades BI',
      price: '+ R$ 44,90/mês',
      desc: 'Gera resumos executivos mensais das vendas, avalia os produtos mais lucrativos e traduz os 9 relatórios analíticos em planos de ação.',
    },
  ]

  const platformDeepDive = [
    {
      icon: BookmarkCheck,
      tag: 'Clientes & Visões por Unidade',
      title: 'Acompanhamento de Pedidos por Cliente com Visões Salvas no Banco',
      points: [
        'Visualize todos os pedidos de cada cliente diretamente em /customers com links clicáveis (#PED-...) que filtram pela URL (?customerId=...&orderId=...).',
        'Seleção múltipla de status (Pedidos Abertos, Fechados/Entregues, Cancelados e Status do Cliente) combinada com filtros de data e período.',
        'Salve visões personalizadas no banco de dados individualmente por loja Matriz ou Filial para alternar entre filas operacionais em 1 clique.',
        'Botão "Exportar Visíveis" que exporta exatamente os registros filtrados na tela com o detalhamento completo de itens, pagamentos e data/hora.',
      ],
    },
    {
      icon: FileSpreadsheet,
      tag: 'Relatórios & BI Multi-Loja',
      title: '9 Relatórios de Varejo e Dashboard com Filtros de Período',
      points: [
        'Filtros rápidos por Hoje, Esta Semana, Este Mês, Mês Passado, 90 Dias, Este Ano ou Data Personalizada (De / Até) sincronizados na URL.',
        'Relatório de Clientes com todos os pedidos vinculados e link direto para abrir o pedido na tela de clientes.',
        'Registro de Compras e Vendas com carimbo exato de Data e Hora (DD/MM/YYYY HH:mm) e discriminação completa dos produtos e quantidades.',
        'Dashboard executivo com comparativo Matriz vs. Filiais, evolução mensal de 12 meses e ranking dos produtos mais vendidos.',
      ],
    },
    {
      icon: ShieldCheck,
      tag: 'Governança & SaaS Enterprise',
      title: 'Controle de Alçadas, Filiais, Contratos e Permissões em Tela',
      points: [
        'Baixas de estoque protegidas: somente Aprovadores de Baixa (STOCK_APPROVER) autorizam perdas/avarias dentro do seu limite de alçada financeira.',
        'Árvore hierárquica Matriz → Filiais no Global Admin e em Lojas, com remessa de estoque sem necessidade de venda.',
        'Gerenciador de Contratos completo (HTML, DOCX e PDF) com armazenamento no Supabase e sincronização com o Google Drive do Global Admin.',
        'Central de Backup Multi-Loja (Dump SQL relacional, pacote ZIP de imagens com manifesto e JSON) e Explorador CRUD de Banco de Dados.',
      ],
    },
  ]

  const workflowSteps = [
    {
      step: '01',
      title: 'Catálogo, Fornecedores & Compras',
      desc: 'Cadastre produtos com fotos, SKU e código de barras, ou sincronize via planilha CSV e API Studio. Emita ordens de compra com cálculo de markup.',
    },
    {
      step: '02',
      title: 'Lotes, Validades & Remessa p/ Filiais',
      desc: 'Receba mercadorias com validade por lote, acompanhe alertas de 7/30 dias e transfira produtos da Matriz para Filiais sem precisar registrar venda.',
    },
    {
      step: '03',
      title: 'Vendas no PDV (UN/KG) & WhatsApp',
      desc: 'Atenda no PDV com baixa atômica e pesagem em gramas/quilos, ou receba pedidos montados pelos clientes no Catálogo Público via WhatsApp.',
    },
    {
      step: '04',
      title: 'Copiloto IA, Visões Salvas & BI',
      desc: 'Converse com o Copiloto IA da loja, avalie oportunidades de vendas e vencimentos, analise os 9 relatórios e exporte tudo em detalhes.',
    },
  ]

  const targetSegments = [
    {
      icon: Apple,
      title: 'Hortifrutis & Restaurantes',
      desc: 'Insumos gastronômicos, pesagem fracionada (KG/g), controle rigoroso de validades por lote e ficha de fornecedores.',
    },
    {
      icon: ShoppingBasket,
      title: 'Mercados & Mercearias',
      desc: 'Agilidade na frente de caixa, leitor de código de barras, curva ABC e reposição baseada no giro real de consumo.',
    },
    {
      icon: Wine,
      title: 'Empórios, Carnes & Bebidas',
      desc: 'Rastreabilidade de lotes nobres, controle de perdas com aprovador de baixa e catálogo digital para pedidos rápidos.',
    },
    {
      icon: Building2,
      title: 'Redes, Matrizes & Filiais',
      desc: 'Hierarquia Matriz → Filial, remessa de estoque sem venda, visões salvas por unidade e painel consolidado multi-loja.',
    },
  ]

  const faqs = [
    {
      q: 'Como funciona a Inteligência Artificial (Google Gemini, OpenAI, Claude e Personalizada) na plataforma?',
      a: 'O Super Admin configura as chaves de API criptografadas com pgcrypto no Supabase (/global-admin/ai), tendo o Google Gemini como motor principal padrão e cadeia automática de Fallback (Gemini Principal -> Modelo Fast -> Provedor Secundário -> Motor Analítico Local). Os 5 módulos de IA entram como opcionais/add-ons nos planos das lojas, habilitando o Chatbot Copiloto (/ai-copilot) e análises em tempo real em Vendas, Clientes, Estoque, Validades, Compras e Relatórios.',
    },
    {
      q: 'O que o Copiloto de IA e os cards inteligentes fazem pelo Administrador da loja?',
      a: 'A IA avalia e sugere produtos para clientes com base no histórico de compras, aponta tendências de reposição, resume mensalmente as vendas, destaca os produtos mais vendidos, avisa quando lotes estão próximos do vencimento e responde perguntas estratégicas no Chatbot com Personas configuráveis (CFO Estrategista, Diretor Comercial, Auditor FEFO ou Copiloto Prático) e proteção Anti-Prompt Injection.',
    },
    {
      q: 'Como funciona o acompanhamento de pedidos por cliente e as visões salvas?',
      a: 'Na tela de Clientes (/customers) e nos Relatórios (/reports), você visualiza todos os pedidos feitos por cada cliente com data e hora exatas e links diretos (/customers?customerId=...&orderId=...). É possível selecionar múltiplos status ao mesmo tempo (ex.: Pedidos Abertos, Fechados ou Cancelados) e salvar essas combinações como Visões no banco de dados, isoladas individualmente para cada loja ou filial.',
    },
    {
      q: 'O botão de exportar respeita os filtros aplicados na tela?',
      a: 'Sim! Tanto em Clientes quanto nos 9 Relatórios Analíticos, o botão "Exportar Visíveis" exporta exclusivamente os registros que estão visíveis na tela naquele momento, trazendo o detalhamento completo dos pedidos (data e hora, canal, pagamento, subtotal, descontos e lista detalhada de itens comprados).',
    },
    {
      q: 'Consigo gerenciar filiais e transferir produtos da Matriz sem registrar uma venda?',
      a: 'Sim! As filiais ficam organizadas de forma hierárquica abaixo da Matriz. Você pode enviar lotes do estoque da Matriz diretamente para qualquer Filial sem necessidade de venda — o sistema sincroniza produto, categoria, fotos, lote e saldo automaticamente para venda imediata no PDV da filial.',
    },
    {
      q: 'Como funcionam as licenças de funcionários, a política de PIN e o papel de Aprovador de Baixa?',
      a: 'Cada loja possui 10 funcionários grátis no plano do Admin Loja. Você pode exigir que o colaborador redefina seu PIN no próximo login com regras de complexidade configuráveis. Além disso, somente usuários com credencial de Aprovador de Baixa de Estoque podem autorizar baixas por perda ou avaria.',
    },
    {
      q: 'Como funciona a personalização de planos na Landing Page e o Gerenciador de Contratos?',
      a: 'Você pode escolher um plano base, adicionar módulos extras (incluindo os módulos de Inteligência Artificial) e enviar seu pré-cadastro. O Global Admin recebe a solicitação em "Novos Contratos" (/global-admin/contracts) e gera o contrato personalizado pronto para assinatura em HTML, DOCX e PDF, salvo no Supabase e sincronizado com o Google Drive.',
    },
  ]

  return (
    <div className="space-y-24 py-8 sm:py-14">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide shadow-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Plataforma SaaS Multi-Loja com Inteligência Artificial (Google Gemini), Matriz & Filiais, PDV e BI</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
          Controle seu estoque, <span className="text-primary">domine suas filiais</span> e multiplique vendas com IA.
        </h1>

        <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Gestão completa de produtos, lotes e validades, Copiloto IA & Chatbot da Loja com Google Gemini, sugestão inteligente de produtos para clientes, aprovadores de baixa, remessa para filiais sem venda, PDV com pesagem em KG, 9 relatórios analíticos e catálogo online no WhatsApp.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <a href="#personalizar-plano">
            <Button size="lg" className="h-12 px-8 text-sm sm:text-base font-semibold shadow-lg shadow-primary/25">
              Personalizar Plano & Módulos de IA <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <Link to="/register">
            <Button variant="outline" size="lg" className="h-12 px-7 text-sm sm:text-base font-semibold">
              Criar Conta Gratuita
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="lg" className="h-12 px-6 text-sm sm:text-base font-semibold">
              Acessar Painel
            </Button>
          </Link>
        </div>

        {/* Highlight Pills */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Copiloto IA (Gemini, OpenAI, Claude & Custom)
          </span>
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Dashboard BI por Loja & Resumo Mensal IA
          </span>
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Matriz → Filiais & Remessa Sem Venda
          </span>
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Aprovador de Baixa & 10 Funcionários Grátis
          </span>
          <span className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Contratos Digitais (DOCX/PDF + Google Drive)
          </span>
        </div>
      </section>

      {/* AI Native Suite Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-violet-600/15 via-primary/10 to-surface border border-violet-500/30 p-8 sm:p-12 space-y-8 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-300 text-xs font-bold">
                <Bot className="h-4 w-4" /> Suíte de Inteligência Artificial Multi-Provedor (Add-ons por Loja)
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                IA em Todos os Módulos + Chatbot Copiloto para o Administrador da Loja
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                O Super Admin configura as chaves de API criptografadas no Supabase (tendo o <b>Google Gemini</b> como IA principal padrão, além de suporte a <b>OpenAI</b>, <b>Claude</b> e <b>IA Personalizada</b>). A IA analisa dados reais da loja para sugerir produtos aos clientes, prever tendências de compras, resumir vendas mensais, avisar sobre produtos vencendo e conversar em tempo real com o Administrador.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <a href="#personalizar-plano">
                <Button size="lg" className="font-semibold shadow-md">
                  Adicionar Módulos de IA ao Plano <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {aiSuiteHighlights.map((mod) => (
              <div
                key={mod.code}
                className="p-5 rounded-2xl bg-surface/90 border border-border hover:border-violet-500/50 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-300">
                      ADD-ON IA
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {mod.price}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground leading-snug">{mod.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{mod.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-surface/70 border border-border flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
              <span><b>Context Prompt Injection:</b> métricas reais da loja injetadas em tempo real</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface/70 border border-border flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span><b>Escudo Anti-Injection:</b> bloqueio contra jailbreak e extração de segredos</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface/70 border border-border flex items-center gap-2.5">
              <RefreshCw className="h-4 w-4 text-amber-500 shrink-0" />
              <span><b>Fallback em Cascata:</b> Gemini → Fast → Secundário → Motor Local</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface/70 border border-border flex items-center gap-2.5">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span><b>Personas Configuráveis:</b> CFO, Comercial, Auditor FEFO e Personalizada</span>
            </div>
          </div>
        </div>
      </section>

      {/* Segmentos Atendidos */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Projetado para operações reais de varejo e gastronomia
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            De restaurantes e hortifrutis a redes com múltiplas filiais e controle estrito de estoque.
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

      {/* Main Features Grid (16 Complete Pillars) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            16 Pilares Integrados para Gestão Ponta a Ponta
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Todos os recursos operacionais, Inteligência Artificial nativa, relatórios analíticos, contratos digitais e governança reunidos em uma única plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
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

      {/* Deep-Dive Highlights: Customers Views, Reports Date/Time & Multi-Branch Governance */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Diferenciais Exclusivos para Operações Profissionais
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Recursos avançados pensados para rastreabilidade de pedidos, auditoria de estoque e escalabilidade multi-loja.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {platformDeepDive.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="rounded-3xl bg-surface border border-border p-7 space-y-5 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.tag}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    {item.title}
                  </h3>
                  <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                    {item.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
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
              Um processo simples, rápido e auditável do recebimento da mercadoria até o relatório executivo.
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

      {/* WhatsApp Catalog & Fracionados Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-surface to-background border border-emerald-500/20 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <MessageCircle className="h-3.5 w-3.5" /> Catálogo Público & Venda por Peso (KG)
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Seu Catálogo Digital Pronto para Vender por Unidade ou por Quilo no WhatsApp
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Publique seus produtos com fotos, preços e suporte completo a produtos pesáveis (gramas, quilos ou valor desejado em R$). Seus clientes montam o carrinho no navegador e o pedido chega formatado no WhatsApp da sua loja.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button size="default" className="shadow-md font-semibold">
                  Criar Catálogo da Minha Loja
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="default" className="font-semibold">
                  Conhecer Planos e Módulos
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xl max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Catálogo Online & PDV Fracionado</div>
                <div className="text-[11px] text-muted-foreground">Pedidos com Discriminação Exata</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-xl border border-border/50 space-y-2 font-mono">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                📲 Mensagem de Pedido Recebida:
              </div>
              <div className="text-[11px] leading-relaxed">
                &quot;Olá! Gostaria de fazer o pedido:<br />
                • 2x Arroz Arbóreo Italiano 1kg (R$ 49,80)<br />
                • 0,350 kg Filé de Salmão Fresco (R$ 34,96)<br />
                • 1x Azeite Extra Virgem 500ml (R$ 49,90)<br />
                <b>Total: R$ 134,66</b><br />
                Pagamento: PIX · Entrega imediata&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Plan Customizer & Pre-Registration */}
      <InteractivePlanBuilderSection id="personalizar-plano" />

      {/* Enterprise Architecture & Security Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-border flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Isolamento Multi-Tenant RLS</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Cada loja e filial possui dados isolados por políticas Row Level Security no PostgreSQL e transações atômicas de estoque.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-surface border border-border flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">47 Permissões & Grafo de Telas</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Controle granular de ações e pacotes comerciais com alerta automático de dependências ao ativar ou remover telas.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-surface border border-border flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Backups SQL, ZIP de Fotos & JSON</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Exporte a qualquer momento dumps SQL relacionais, pacotes ZIP com fotos dos produtos e arquivos JSON completos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence & Live Test Suite Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-surface border border-primary/20 p-8 sm:p-12 shadow-xl space-y-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" /> Transparência & Qualidade Homologada
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Galeria Completa de Evidências: 50 Telas & APIs Validadas
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Explore as telas do sistema em resoluções Desktop (1440×900) e Mobile (390×844), incluindo o Dashboard Multi-Loja, os 9 relatórios de varejo e os testes de chamadas REST autenticadas via HBAC.
              </p>
            </div>
            <Link to="/evidence">
              <Button size="lg" className="shadow-lg shadow-primary/25 font-semibold">
                Explorar Painel de Evidências <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Screenshot Mini Grid Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <Link to="/evidence" className="group block rounded-xl overflow-hidden border border-border bg-muted/40 hover:border-primary/50 transition-all shadow-xs">
              <img
                src="/evidence/screenshots/04_dashboard_desktop.png"
                alt="Dashboard Preview"
                className="w-full h-28 object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-2.5 text-center">
                <div className="text-xs font-bold text-foreground">Dashboard Executivo</div>
                <div className="text-[10px] text-muted-foreground">Gráficos por Loja & Produtos</div>
              </div>
            </Link>
            <Link to="/evidence" className="group block rounded-xl overflow-hidden border border-border bg-muted/40 hover:border-primary/50 transition-all shadow-xs">
              <img
                src="/evidence/screenshots/08_sales_pos_desktop.png"
                alt="PDV Preview"
                className="w-full h-28 object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-2.5 text-center">
                <div className="text-xs font-bold text-foreground">Frente de Caixa (PDV)</div>
                <div className="text-[10px] text-muted-foreground">Venda Rápida & Peso KG</div>
              </div>
            </Link>
            <Link to="/evidence" className="group block rounded-xl overflow-hidden border border-border bg-muted/40 hover:border-primary/50 transition-all shadow-xs">
              <img
                src="/evidence/screenshots/14_report_abc_curve_desktop.png"
                alt="Curva ABC Preview"
                className="w-full h-28 object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-2.5 text-center">
                <div className="text-xs font-bold text-foreground">9 Relatórios Analíticos</div>
                <div className="text-[10px] text-muted-foreground">Filtros de Data & Exportação</div>
              </div>
            </Link>
            <Link to="/evidence" className="group block rounded-xl overflow-hidden border border-border bg-muted/40 hover:border-primary/50 transition-all shadow-xs">
              <img
                src="/evidence/screenshots/25_admin_hbac_api_keys_desktop.png"
                alt="API Keys Preview"
                className="w-full h-28 object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-2.5 text-center">
                <div className="text-xs font-bold text-foreground">APIs REST & HBAC</div>
                <div className="text-[10px] text-muted-foreground">API Studio & Tokens por Loja</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Perguntas Frequentes</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Tire suas dúvidas sobre todos os recursos da plataforma</p>
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
            Pronto para elevar a gestão das suas lojas e filiais?
          </h2>
          <p className="text-xs sm:text-sm text-primary-foreground/90 max-w-xl mx-auto leading-relaxed">
            Cadastre sua loja agora mesmo e tenha controle absoluto sobre estoque, validades, filiais, equipe, clientes e relatórios em tempo real.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="font-bold text-primary px-8 h-12 text-sm sm:text-base">
                Criar Conta Gratuita
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="font-bold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 h-12 text-sm sm:text-base">
                Entrar no Sistema
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
