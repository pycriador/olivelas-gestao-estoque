import * as React from 'react'
import { useI18n, type SupportedLocale } from './index'

type LocaleTarget = 'en-US' | 'es-ES'

/**
 * Exact phrase dictionary (normalized lowercase key -> [en-US, es-ES])
 */
const EXACT_PHRASES: Record<string, [string, string]> = {
  // Brand & Layout
  'olivelas gestão': ['Olivelas Management', 'Olivelas Gestión'],
  'estoque & vendas': ['INVENTORY & SALES', 'STOCK Y VENTAS'],
  'copiloto ia da loja': ['Store AI Copilot', 'Copiloto IA de Tienda'],
  'central de ia & chaves api': ['AI Hub & API Keys', 'Central de IA y Claves API'],
  'catálogo público': ['Public Catalog', 'Catálogo Público'],
  'catálogo oficial': ['Official Catalog', 'Catálogo Oficial'],
  'abrir catálogo público': ['Open Public Catalog', 'Abrir Catálogo Público'],
  'temas': ['Themes', 'Temas'],
  'notificações': ['Notifications', 'Notificaciones'],
  'idioma': ['Language', 'Idioma'],
  'matriz': ['HQ', 'Matriz'],
  'filial': ['Branch', 'Sucursal'],
  'loja matriz': ['HQ Store', 'Tienda Matriz'],
  'suas lojas': ['Your Stores', 'Tus Tiendas'],
  'buscar matriz ou filial...': ['Search HQ or branch...', 'Buscar matriz o sucursal...'],
  'nenhuma loja ou filial encontrada.': ['No store or branch found.', 'No se encontró ninguna tienda o sucursal.'],
  '+ gerenciar todas as lojas & filiais': ['+ Manage All Stores & Branches', '+ Gestionar Todas las Tiendas y Sucursales'],
  'administrador global': ['Global Admin', 'Administrador Global'],
  'super admin global': ['Global Super Admin', 'Super Admin Global'],
  'admin da loja': ['Store Admin', 'Admin de Tienda'],
  'administrador da loja': ['Store Administrator', 'Administrador de Tienda'],
  'gerente': ['Manager', 'Gerente'],
  'operador': ['Operator', 'Operador'],
  'vendedor / caixa': ['Cashier / Sales', 'Vendedor / Caja'],
  'estoquista': ['Stock Clerk', 'Almacenista'],
  'visualizador': ['Viewer', 'Visualizador'],

  // Common Buttons & Actions
  'salvar': ['Save', 'Guardar'],
  'salvar alterações': ['Save Changes', 'Guardar Cambios'],
  'salvando...': ['Saving...', 'Guardando...'],
  'salvo!': ['Saved!', '¡Guardado!'],
  'cancelar': ['Cancel', 'Cancelar'],
  'excluir': ['Delete', 'Eliminar'],
  'deletar': ['Delete', 'Eliminar'],
  'editar': ['Edit', 'Editar'],
  'editando': ['Editing', 'Editando'],
  'criar': ['Create', 'Crear'],
  'adicionar': ['Add', 'Agregar'],
  'duplicar': ['Duplicate', 'Duplicar'],
  'confirmar': ['Confirm', 'Confirmar'],
  'voltar': ['Back', 'Volver'],
  'fechar': ['Close', 'Cerrar'],
  'imprimir': ['Print', 'Imprimir'],
  'exportar': ['Export', 'Exportar'],
  'exportar csv': ['Export CSV', 'Exportar CSV'],
  'exportar json': ['Export JSON', 'Exportar JSON'],
  'importar': ['Import', 'Importar'],
  'filtrar': ['Filter', 'Filtrar'],
  'limpar filtros': ['Clear Filters', 'Limpiar Filtros'],
  'limpar': ['Clear', 'Limpiar'],
  'pesquisar...': ['Search...', 'Buscar...'],
  'buscar...': ['Search...', 'Buscar...'],
  'carregando...': ['Loading...', 'Cargando...'],
  'atualizar': ['Refresh', 'Actualizar'],
  'atualizar do banco': ['Refresh from DB', 'Actualizar de BD'],
  'atualizando...': ['Refreshing...', 'Actualizando...'],
  'nenhum registro encontrado': ['No records found', 'No se encontraron registros'],
  'ações': ['Actions', 'Acciones'],
  'status': ['Status', 'Estado'],
  'data': ['Date', 'Fecha'],
  'data / hora': ['Date / Time', 'Fecha / Hora'],
  'total': ['Total', 'Total'],
  'subtotal': ['Subtotal', 'Subtotal'],
  'desconto': ['Discount', 'Descuento'],
  'observações': ['Notes', 'Observaciones'],
  'detalhes': ['Details', 'Detalles'],
  'visualizar': ['View', 'Ver'],
  'ver detalhes': ['View Details', 'Ver Detalles'],
  'ativo': ['Active', 'Activo'],
  'inativo': ['Inactive', 'Inactivo'],
  'sim': ['Yes', 'Sí'],
  'não': ['No', 'No'],
  'todos': ['All', 'Todos'],
  'todas': ['All', 'Todas'],
  'selecionar': ['Select', 'Seleccionar'],
  'selecionar todos': ['Select All', 'Seleccionar Todo'],
  'copiar': ['Copy', 'Copiar'],
  'copiado!': ['Copied!', '¡Copiado!'],
  'enviar': ['Send', 'Enviar'],
  'aplicar': ['Apply', 'Aplicar'],
  'restaurar padrão': ['Restore Default', 'Restaurar Predeterminado'],

  // Dashboard & Analytics
  'painel de controle': ['Dashboard', 'Panel de Control'],
  'vendas hoje': ['Sales Today', 'Ventas Hoy'],
  'vendas no mês': ['Sales This Month', 'Ventas del Mes'],
  'faturamento total': ['Total Revenue', 'Facturación Total'],
  'faturamento no período': ['Period Revenue', 'Facturación del Período'],
  'ticket médio': ['Average Ticket', 'Ticket Promedio'],
  'pedidos pendentes': ['Pending Orders', 'Pedidos Pendientes'],
  'pedidos concluídos': ['Completed Orders', 'Pedidos Completados'],
  'alertas de estoque baixo': ['Low Stock Alerts', 'Alertas de Stock Bajo'],
  'produtos vencendo (30d)': ['Expiring Soon (30d)', 'Por Vencer (30d)'],
  'produtos vencidos': ['Expired Products', 'Productos Vencidos'],
  'clientes ativos': ['Active Customers', 'Clientes Activos'],
  'total de produtos': ['Total Products', 'Total de Productos'],
  'ações rápidas': ['Quick Actions', 'Acciones Rápidas'],
  'nova venda': ['New Sale', 'Nueva Venta'],
  'novo produto': ['New Product', 'Nuevo Producto'],
  'nova compra': ['New Purchase', 'Nueva Compra'],
  'ajuste de estoque': ['Stock Adjustment', 'Ajuste de Stock'],
  'visão geral multi-loja': ['Multi-Store Overview', 'Resumen Multi-Tienda'],
  'lojas ativas': ['Active Stores', 'Tiendas Activas'],
  'total de usuários': ['Total Users', 'Total de Usuarios'],
  'hoje': ['Today', 'Hoy'],
  '7 dias': ['7 Days', '7 Días'],
  '30 dias': ['30 Days', '30 Días'],
  'este mês': ['This Month', 'Este Mes'],
  'esta semana': ['This Week', 'Esta Semana'],
  '12 meses': ['12 Months', '12 Meses'],
  'personalizado': ['Custom', 'Personalizado'],
  'produtos mais vendidos': ['Top Selling Products', 'Productos Más Vendidos'],
  'desempenho mensal': ['Monthly Performance', 'Rendimiento Mensual'],
  'evolução de vendas': ['Sales Evolution', 'Evolución de Ventas'],
  'vendas por canal': ['Sales by Channel', 'Ventas por Canal'],
  'todas as lojas': ['All Stores', 'Todas las Tiendas'],

  // Products & Categories
  'produtos': ['Products', 'Productos'],
  'categorias': ['Categories', 'Categorías'],
  'nova categoria': ['New Category', 'Nueva Categoría'],
  'editar categoria': ['Edit Category', 'Editar Categoría'],
  'cadastrar produto': ['Add Product', 'Registrar Producto'],
  'editar produto': ['Edit Product', 'Editar Producto'],
  'nome do produto': ['Product Name', 'Nombre del Producto'],
  'sku / código': ['SKU / Code', 'SKU / Código'],
  'código de barras / ean': ['Barcode / EAN', 'Código de Barras / EAN'],
  'categoria': ['Category', 'Categoría'],
  'todas as categorias': ['All Categories', 'Todas las Categorías'],
  'marca': ['Brand', 'Marca'],
  'fornecedor': ['Supplier', 'Proveedor'],
  'fornecedores': ['Suppliers', 'Proveedores'],
  'novo fornecedor': ['New Supplier', 'Nuevo Proveedor'],
  'preço de custo': ['Cost Price', 'Precio de Costo'],
  'preço de venda': ['Selling Price', 'Precio de Venta'],
  'margem de lucro': ['Profit Margin', 'Margen de Ganancia'],
  'margem': ['Margin', 'Margen'],
  'estoque atual': ['Current Stock', 'Stock Actual'],
  'estoque mínimo': ['Min Stock', 'Stock Mínimo'],
  'estoque máximo': ['Max Stock', 'Stock Máximo'],
  'unidade': ['Unit', 'Unidad'],
  'peso (kg)': ['Weight (kg)', 'Peso (kg)'],
  'controla lote': ['Batch Control', 'Control de Lote'],
  'controla validade': ['Expiration Control', 'Control de Vencimiento'],
  'imagens do produto': ['Product Images', 'Imágenes del Producto'],
  'enviar imagem': ['Upload Image', 'Subir Imagen'],
  'entrada em lote': ['Bulk Stock Entry', 'Entrada en Lote'],

  // Inventory & Expiration
  'estoque': ['Inventory', 'Inventario'],
  'controle de estoque': ['Inventory Control', 'Control de Inventario'],
  'validades & lotes': ['Batches & Expiry', 'Lotes y Vencimientos'],
  'saldo atual': ['Current Balance', 'Saldo Actual'],
  'movimentações': ['Movements', 'Movimientos'],
  'lotes & validades': ['Batches & Expiry', 'Lotes y Vencimientos'],
  'inventário físico': ['Physical Count', 'Inventario Físico'],
  'nova movimentação': ['New Movement', 'Nuevo Movimiento'],
  'tipo de movimento': ['Movement Type', 'Tipo de Movimiento'],
  'entrada': ['Entry', 'Entrada'],
  'saída': ['Exit', 'Salida'],
  'venda': ['Sale', 'Venta'],
  'devolução': ['Return', 'Devolución'],
  'ajuste': ['Adjustment', 'Ajuste'],
  'perda': ['Loss', 'Pérdida'],
  'avaria': ['Damage', 'Avería'],
  'vencimento': ['Expiration', 'Vencimiento'],
  'transferência': ['Transfer', 'Transferencia'],
  'quantidade': ['Quantity', 'Cantidad'],
  'número do lote': ['Lot Number', 'Número de Lote'],
  'data de fabricação': ['Manufacturing Date', 'Fecha de Fabricación'],
  'data de validade': ['Expiration Date', 'Fecha de Vencimiento'],
  'produto vencido': ['Expired Product', 'Producto Vencido'],
  'vencido': ['Expired', 'Vencido'],
  'vencendo em breve': ['Expiring Soon', 'Por vencer pronto'],
  'no prazo': ['Valid / On Time', 'En Plazo'],

  // Sales (POS) & Orders
  'vendas (pdv)': ['Sales (POS)', 'Ventas (POS)'],
  'pedidos': ['Orders', 'Pedidos'],
  'pedidos e vendas': ['Orders & Sales', 'Pedidos y Ventas'],
  'novo pedido / venda': ['New Order / Sale', 'Nuevo Pedido / Venta'],
  'nº do pedido': ['Order #', 'Nº de Pedido'],
  'canal': ['Channel', 'Canal'],
  'todos os canais': ['All Channels', 'Todos los Canales'],
  'todos os status': ['All Statuses', 'Todos los Estados'],
  'loja física': ['In-Store', 'Tienda Física'],
  'catálogo': ['Catalog', 'Catálogo'],
  'rascunho': ['Draft', 'Borrador'],
  'pendente': ['Pending', 'Pendiente'],
  'confirmado': ['Confirmed', 'Confirmado'],
  'em preparação': ['Processing', 'En Preparación'],
  'pronto': ['Ready', 'Listo'],
  'pronto para envio/retirada': ['Ready for Pickup/Dispatch', 'Listo para Despacho/Retiro'],
  'enviado': ['Shipped', 'Enviado'],
  'entregue': ['Delivered', 'Entregado'],
  'finalizado': ['Completed', 'Finalizado'],
  'cancelado': ['Cancelled', 'Cancelado'],
  'cliente': ['Customer', 'Cliente'],
  'clientes': ['Clientes', 'Clientes'],
  'novo cliente': ['New Customer', 'Nuevo Cliente'],
  'cliente genérico': ['Generic Customer', 'Cliente Genérico'],
  'genérico': ['Generic', 'Genérico'],
  'cadastro de cliente obrigatório': ['Mandatory Customer Registration', 'Registro de Cliente Obligatorio'],
  'cliente genérico ativo': ['Generic Customer Active', 'Cliente Genérico Activo'],
  'com estoque': ['In Stock', 'Con Stock'],
  'zerados': ['Out of Stock', 'Sin Stock'],
  'carrinho': ['Cart', 'Carrito'],
  'meu carrinho': ['My Cart', 'Mi Carrito'],
  'itens do pedido': ['Order Items', 'Artículos del Pedido'],
  'valor total': ['Total Amount', 'Monto Total'],
  'forma de pagamento': ['Payment Method', 'Método de Pago'],
  'status do pagamento': ['Payment Status', 'Estado del Pago'],
  'dinheiro': ['Cash', 'Efectivo'],
  'cartão de crédito': ['Credit Card', 'Tarjeta de Crédito'],
  'cartão de débito': ['Debit Card', 'Tarjeta de Débito'],
  'fiado / crediário': ['Store Credit', 'Crédito de Tienda'],
  'finalizar venda': ['Complete Sale', 'Finalizar Venta'],
  'finalizar pedido': ['Complete Order', 'Finalizar Pedido'],
  'cancelar pedido': ['Cancel Order', 'Cancelar Pedido'],
  'motivo do cancelamento': ['Cancellation Reason', 'Motivo de Cancelación'],
  'estornar estoque ao cancelar': ['Restore stock on cancellation', 'Restaurar stock al cancelar'],
  'personalizar status (apelidos)': ['Customize Statuses (Aliases)', 'Personalizar Estados (Alias)'],
  'editar no pdv': ['Edit in POS', 'Editar en POS'],
  'avisar no whatsapp': ['Notify via WhatsApp', 'Avisar por WhatsApp'],
  'link de rastreio': ['Tracking Link', 'Enlace de Seguimiento'],
  'histórico de atualizações de status (por usuário)': [
    'Status Update History (By User)',
    'Historial de Actualizaciones de Estado (Por Usuario)',
  ],

  // Settings (/settings & tabs)
  'configurações': ['Settings', 'Configuraciones'],
  'dados & endereço': ['Store Info & Address', 'Datos y Dirección'],
  'dados': ['Store Info', 'Datos'],
  'identificação comercial, contatos, whatsapp e localização física': [
    'Commercial details, contacts, WhatsApp and physical address',
    'Identificación comercial, contactos, WhatsApp y ubicación física',
  ],
  'vitrine pública': ['Public Storefront', 'Vitrina Pública'],
  'vitrine': ['Storefront', 'Vitrina'],
  'logo, banner de capa, cores da interface, tema padrão e paginação': [
    'Logo, cover banner, UI colors, default theme and pagination',
    'Logo, banner de portada, colores de interfaz, tema por defecto y paginación',
  ],
  'mensagem whatsapp': ['WhatsApp Message', 'Mensaje WhatsApp'],
  'mensagem 100% personalizada com tags de produtos, preços, total e observações': [
    '100% customizable message with product, price, total and notes tags',
    'Mensaje 100% personalizado con etiquetas de productos, precios, total y notas',
  ],
  'regras pdv (/sales)': ['POS Rules (/sales)', 'Reglas POS (/sales)'],
  'regras pdv': ['POS Rules', 'Reglas POS'],
  'cadastro de cliente obrigatório vs. liberação de 1 cliente genérico': [
    'Mandatory customer registration vs. 1 Generic Customer release',
    'Registro de cliente obligatorio vs. habilitación de 1 Cliente Genérico',
  ],
  'tema do painel': ['Panel Theme', 'Tema del Panel'],
  'tema painel': ['Panel Theme', 'Tema Panel'],
  'aparência visual e paleta de cores do sistema interno': [
    'Visual appearance and color palette of the internal system',
    'Apariencia visual y paleta de colores del sistema interno',
  ],
  'informações da loja': ['Store Information', 'Información de la Tienda'],
  'nome da loja *': ['Store Name *', 'Nombre de la Tienda *'],
  'slug (url pública) *': ['Slug (Public URL) *', 'Slug (URL Pública) *'],
  'cnpj / documento': ['Tax ID / Document', 'Documento Fiscal / CNPJ'],
  'e-mail comercial': ['Business Email', 'Correo Comercial'],
  'telefone fixo': ['Landline Phone', 'Teléfono Fijo'],
  'whatsapp (pedidos)': ['WhatsApp (Orders)', 'WhatsApp (Pedidos)'],
  'descrição da loja (exibida no catálogo)': [
    'Store Description (Shown in Catalog)',
    'Descripción de la Tienda (Mostrada en el Catálogo)',
  ],
  'endereço físico': ['Physical Address', 'Dirección Física'],
  'logradouro e número': ['Street Address & Number', 'Calle y Número'],
  'cidade': ['City', 'Ciudad'],
  'estado (uf)': ['State / Province', 'Estado / Provincia'],
  'novo template': ['New Template', 'Nueva Plantilla'],
  'restaurar sugeridos': ['Restore Presets', 'Restaurar Sugeridos'],
  'fixado na loja': ['Pinned to Store', 'Fijado en Tienda'],
  'fixar na loja': ['Pin to Store', 'Fijar en Tienda'],
  'fixar este template na loja': ['Pin this Template to Store', 'Fijar esta Plantilla en la Tienda'],
  'salvar template': ['Save Template', 'Guardar Plantilla'],
  'fixado como padrão da loja': ['Pinned as Store Default', 'Fijado como Predeterminado'],
  'não fixado no momento': ['Not currently pinned', 'No fijado actualmente'],
  'editando template:': ['Editing Template:', 'Editando Plantilla:'],
  'nome do template *': ['Template Name *', 'Nombre de la Plantilla *'],
  'descrição / finalidade do template': ['Template Description / Purpose', 'Descripción / Propósito de la Plantilla'],
  'prévia em tempo real no whatsapp': ['Live WhatsApp Preview', 'Vista Previa en Tiempo Real de WhatsApp'],
  'simulação com carrinho de exemplo': ['Sample Cart Simulation', 'Simulación con Carrito de Ejemplo'],
  'principais tags do carrinho público (clique para inserir no template)': [
    'Main Public Cart Tags (Click to insert into template)',
    'Principales Etiquetas del Carrito Público (Clic para insertar)',
  ],
  'as tags são substituídas automaticamente pelos dados reais do pedido': [
    'Tags are automatically replaced with real order data',
    'Las etiquetas se reemplazan automáticamente con los datos reales del pedido',
  ],
  'suporta negrito do whatsapp (*texto*) e emojis': [
    'Supports WhatsApp bold (*text*) and emojis',
    'Soporta negrita de WhatsApp (*texto*) y emojis',
  ],
  'templates cadastrados na loja (escolha qual fixar como ativo)': [
    'Registered Store Templates (Choose which one to pin as active)',
    'Plantillas Registradas en la Tienda (Elige cuál fijar como activa)',
  ],
  'liberado': ['Released', 'Habilitado'],
  'bloqueado': ['Blocked', 'Bloqueado'],
}

/**
 * Dynamic regex rules for strings with numbers, names, or variables
 */
const DYNAMIC_PATTERNS: Array<{
  regex: RegExp
  en: (...matches: string[]) => string
  es: (...matches: string[]) => string
}> = [
  {
    regex: /^(\d+)\s+templates?\s+cadastrados?$/i,
    en: (_, n) => `${n} ${Number(n) === 1 ? 'registered template' : 'registered templates'}`,
    es: (_, n) => `${n} ${Number(n) === 1 ? 'plantilla registrada' : 'plantillas registradas'}`,
  },
  {
    regex: /^Novo Template #(\d+)$/i,
    en: (_, n) => `New Template #${n}`,
    es: (_, n) => `Nueva Plantilla #${n}`,
  },
  {
    regex: /^Matriz\s*•\s*(\d+)\s*filiais$/i,
    en: (_, n) => `HQ • ${n} branches`,
    es: (_, n) => `Matriz • ${n} sucursales`,
  },
  {
    regex: /^Matrizes & Filiais \((\d+)\)$/i,
    en: (_, n) => `HQs & Branches (${n})`,
    es: (_, n) => `Matrices y Sucursales (${n})`,
  },
  {
    regex: /^Suas Lojas \((\d+)\)$/i,
    en: (_, n) => `Your Stores (${n})`,
    es: (_, n) => `Tus Tiendas (${n})`,
  },
  {
    regex: /^(\d+)\s+redes?$/i,
    en: (_, n) => `${n} ${Number(n) === 1 ? 'network' : 'networks'}`,
    es: (_, n) => `${n} ${Number(n) === 1 ? 'red' : 'redes'}`,
  },
  {
    regex: /^Página\s+(\d+)\s+de\s+(\d+)$/i,
    en: (_, a, b) => `Page ${a} of ${b}`,
    es: (_, a, b) => `Página ${a} de ${b}`,
  },
  {
    regex: /^(\d+)\s*\/\s*pág$/i,
    en: (_, n) => `${n}/page`,
    es: (_, n) => `${n}/pág`,
  },
  {
    regex: /^(\d+)\s+itens?\s+por\s+página$/i,
    en: (_, n) => `${n} items per page`,
    es: (_, n) => `${n} ítems por página`,
  },
  {
    regex: /^Templates de Mensagem WhatsApp da Loja \((.+)\)$/i,
    en: (_, slug) => `Store WhatsApp Message Templates (${slug})`,
    es: (_, slug) => `Plantillas de Mensaje WhatsApp de la Tienda (${slug})`,
  },
  {
    regex: /^Conteúdo da Mensagem \((.+)\)$/i,
    en: (_, name) => `Message Content (${name})`,
    es: (_, name) => `Contenido del Mensaje (${name})`,
  },
]

/**
 * Longest-first phrase & word replacements for composite texts, paragraphs, and labels
 */
const PHRASE_REPLACEMENTS: Array<[RegExp, string, string]> = [
  [/Templates de Mensagem WhatsApp da Loja/gi, 'Store WhatsApp Message Templates', 'Plantillas de Mensaje WhatsApp de la Tienda'],
  [/PersonalizaçãoVisual do Catálogo Público/gi, 'Public Catalog Visual Customization', 'Personalización Visual del Catálogo Público'],
  [/Personalização Visual do Catálogo Público/gi, 'Public Catalog Visual Customization', 'Personalización Visual del Catálogo Público'],
  [/Regras de Cliente no Frente de Caixa — PDV/gi, 'POS Customer Rules — Checkout', 'Reglas de Cliente en Punto de Venta — POS'],
  [/Cadastro de Cliente Obrigatório/gi, 'Mandatory Customer Registration', 'Registro de Cliente Obligatorio'],
  [/Permitir Cliente Genérico/gi, 'Allow Generic Customer', 'Permitir Cliente Genérico'],
  [/Cliente Genérico/gi, 'Generic Customer', 'Cliente Genérico'],
  [/Catálogo Público/gi, 'Public Catalog', 'Catálogo Público'],
  [/Catálogo Oficial/gi, 'Official Catalog', 'Catálogo Oficial'],
  [/Copiloto IA da Loja/gi, 'Store AI Copilot', 'Copiloto IA de Tienda'],
  [/Copiloto de IA/gi, 'AI Copilot', 'Copiloto de IA'],
  [/Atualizar do Banco/gi, 'Refresh from DB', 'Actualizar de BD'],
  [/Salvar Alterações/gi, 'Save Changes', 'Guardar Cambios'],
  [/Salvar Template/gi, 'Save Template', 'Guardar Plantilla'],
  [/Novo Template/gi, 'New Template', 'Nueva Plantilla'],
  [/Fixado na Loja/gi, 'Pinned to Store', 'Fijado en Tienda'],
  [/Fixar na Loja/gi, 'Pin to Store', 'Fijar en Tienda'],
  [/Restaurar Sugeridos/gi, 'Restore Presets', 'Restaurar Sugeridos'],
  [/Prévia em Tempo Real no WhatsApp/gi, 'Live WhatsApp Preview', 'Vista Previa en Tiempo Real de WhatsApp'],
  [/Produtos Mais Vendidos/gi, 'Top Selling Products', 'Productos Más Vendidos'],
  [/Faturamento Total/gi, 'Total Revenue', 'Facturación Total'],
  [/Ticket Médio/gi, 'Average Ticket', 'Ticket Promedio'],
  [/Estoque Baixo/gi, 'Low Stock', 'Stock Bajo'],
  [/Estoque Atual/gi, 'Current Stock', 'Stock Actual'],
  [/Estoque Mínimo/gi, 'Min Stock', 'Stock Mínimo'],
  [/Preço de Custo/gi, 'Cost Price', 'Precio de Costo'],
  [/Preço de Venda/gi, 'Selling Price', 'Precio de Venta'],
  [/Forma de Pagamento/gi, 'Payment Method', 'Método de Pago'],
  [/Observações do Pedido/gi, 'Order Notes', 'Observaciones del Pedido'],
  [/Finalizar Venda/gi, 'Complete Sale', 'Finalizar Venta'],
  [/Finalizar Pedido/gi, 'Complete Order', 'Finalizar Pedido'],
  [/Novo Pedido/gi, 'New Order', 'Nuevo Pedido'],
  [/Novo Produto/gi, 'New Product', 'Nuevo Producto'],
  [/Novo Cliente/gi, 'New Customer', 'Nuevo Cliente'],
  [/Novo Fornecedor/gi, 'New Supplier', 'Nuevo Proveedor'],
  [/Nova Categoria/gi, 'New Category', 'Nueva Categoría'],
  [/Nova Compra/gi, 'New Purchase', 'Nueva Compra'],
  [/Ordens de Compra/gi, 'Purchase Orders', 'Órdenes de Compra'],
  [/Ordem de Compra/gi, 'Purchase Order', 'Orden de Compra'],
  [/Histórico de Atualizações de Status/gi, 'Status Update History', 'Historial de Actualizaciones de Estado'],
  [/Por Usuário/gi, 'By User', 'Por Usuario'],
  [/Frente de Caixa/gi, 'POS Checkout', 'Punto de Venta'],
  [/Carrinho de Venda/gi, 'Sales Cart', 'Carrito de Venta'],
  [/Carrinho vazio/gi, 'Empty cart', 'Carrito vacío'],
  [/Total a Pagar/gi, 'Total Due', 'Total a Pagar'],
  [/Código de Barras/gi, 'Barcode', 'Código de Barras'],
  [/Data de Validade/gi, 'Expiration Date', 'Fecha de Vencimiento'],
  [/Data de Fabricação/gi, 'Manufacturing Date', 'Fecha de Fabricación'],
  [/Número do Lote/gi, 'Lot Number', 'Número de Lote'],
  [/Inventário Físico/gi, 'Physical Inventory', 'Inventario Físico'],
  [/Saldo Atual/gi, 'Current Balance', 'Saldo Actual'],
  [/Nova Movimentação/gi, 'New Movement', 'Nuevo Movimiento'],
  [/Movimentações/gi, 'Movements', 'Movimientos'],
  [/Validades & Lotes/gi, 'Batches & Expiry', 'Lotes y Vencimientos'],
  [/Lotes & Validades/gi, 'Batches & Expiry', 'Lotes y Vencimientos'],
  [/Equipe & Papéis/gi, 'Team & Roles', 'Equipo y Roles'],
  [/Novo Funcionário/gi, 'New Employee', 'Nuevo Empleado'],
  [/Auditoria & Logs/gi, 'Audit & Logs', 'Auditoría y Logs'],
  [/Integrações API/gi, 'API Integrations', 'Integraciones API'],
  [/Lojas & Filiais/gi, 'Stores & Branches', 'Tiendas y Sucursales'],
  [/Dados & Endereço/gi, 'Store Info & Address', 'Datos y Dirección'],
  [/Vitrine Pública/gi, 'Public Storefront', 'Vitrina Pública'],
  [/Mensagem WhatsApp/gi, 'WhatsApp Message', 'Mensaje WhatsApp'],
  [/Regras PDV/gi, 'POS Rules', 'Reglas POS'],
  [/Tema do Painel/gi, 'Panel Theme', 'Tema del Panel'],
  [/Tema Painel/gi, 'Panel Theme', 'Tema Panel'],
  [/Cores da Interface/gi, 'UI Colors', 'Colores de la Interfaz'],
  [/Cor Primária/gi, 'Primary Color', 'Color Primario'],
  [/Cor de Destaque/gi, 'Accent Color', 'Color de Acento'],
  [/Logo da Loja/gi, 'Store Logo', 'Logo de la Tienda'],
  [/Banner de Capa/gi, 'Cover Banner', 'Banner de Portada'],
  [/Enviar do Computador/gi, 'Upload from Computer', 'Subir desde Computadora'],
  [/Horário de Funcionamento/gi, 'Opening Hours', 'Horario de Atención'],
  [/Itens por Página/gi, 'Items per Page', 'Ítems por Página'],
  [/Colunas no Desktop/gi, 'Desktop Columns', 'Columnas en Escritorio'],
  [/Subtítulo da Vitrine/gi, 'Storefront Subtitle', 'Subtítulo de la Vitrina'],
  [/Informações da Loja/gi, 'Store Information', 'Información de la Tienda'],
  [/Endereço Físico/gi, 'Physical Address', 'Dirección Física'],
  [/Logradouro e Número/gi, 'Street Address & Number', 'Calle y Número'],
  [/Nome da Loja/gi, 'Store Name', 'Nombre de la Tienda'],
  [/Descrição da Loja/gi, 'Store Description', 'Descripción de la Tienda'],
  [/Telefone Fixo/gi, 'Landline Phone', 'Teléfono Fijo'],
  [/E-mail Comercial/gi, 'Business Email', 'Correo Comercial'],
  [/Relatórios/gi, 'Reports', 'Reportes'],
  [/Fornecedores/gi, 'Suppliers', 'Proveedores'],
  [/Fornecedor/gi, 'Supplier', 'Proveedor'],
  [/Categorias/gi, 'Categories', 'Categorías'],
  [/Categoria/gi, 'Category', 'Categoría'],
  [/Produtos/gi, 'Products', 'Productos'],
  [/Produto/gi, 'Product', 'Producto'],
  [/Clientes/gi, 'Customers', 'Clientes'],
  [/Cliente/gi, 'Customer', 'Cliente'],
  [/Pedidos/gi, 'Orders', 'Pedidos'],
  [/Pedido/gi, 'Order', 'Pedido'],
  [/Vendas/gi, 'Sales', 'Ventas'],
  [/Venda/gi, 'Sale', 'Venta'],
  [/Compras/gi, 'Purchases', 'Compras'],
  [/Compra/gi, 'Purchase', 'Compra'],
  [/Estoque/gi, 'Inventory', 'Inventario'],
  [/Configurações/gi, 'Settings', 'Configuraciones'],
  [/Notificações/gi, 'Notifications', 'Notificaciones'],
  [/Funcionários/gi, 'Employees', 'Empleados'],
  [/Funcionário/gi, 'Employee', 'Empleado'],
  [/Usuários/gi, 'Users', 'Usuarios'],
  [/Usuário/gi, 'User', 'Usuario'],
  [/Filiais/gi, 'Branches', 'Sucursales'],
  [/Filial/gi, 'Branch', 'Sucursal'],
  [/Matriz/gi, 'HQ', 'Matriz'],
  [/Lojas/gi, 'Stores', 'Tiendas'],
  [/Loja/gi, 'Store', 'Tienda'],
  [/Carrinho/gi, 'Cart', 'Carrito'],
  [/Quantidade/gi, 'Quantity', 'Cantidad'],
  [/Preço/gi, 'Price', 'Precio'],
  [/Preços/gi, 'Prices', 'Precios'],
  [/Desconto/gi, 'Discount', 'Descuento'],
  [/Observações/gi, 'Notes', 'Observaciones'],
  [/Endereço/gi, 'Address', 'Dirección'],
  [/Telefone/gi, 'Phone', 'Teléfono'],
  [/Cidade/gi, 'City', 'Ciudad'],
  [/Estado/gi, 'State', 'Estado'],
  [/Pendente/gi, 'Pending', 'Pendiente'],
  [/Confirmado/gi, 'Confirmed', 'Confirmado'],
  [/Entregue/gi, 'Delivered', 'Entregado'],
  [/Finalizado/gi, 'Completed', 'Finalizado'],
  [/Cancelado/gi, 'Cancelled', 'Cancelado'],
  [/Ativo/gi, 'Active', 'Activo'],
  [/Inativo/gi, 'Inactive', 'Inactivo'],
  [/Obrigatório/gi, 'Mandatory', 'Obligatorio'],
  [/Opcional/gi, 'Optional', 'Opcional'],
  [/Personalizado/gi, 'Custom', 'Personalizado'],
  [/Personalizada/gi, 'Custom', 'Personalizada'],
  [/Padrão/gi, 'Default', 'Predeterminado'],
  [/Pesquisar/gi, 'Search', 'Buscar'],
  [/Buscar/gi, 'Search', 'Buscar'],
  [/Carregando/gi, 'Loading', 'Cargando'],
  [/Salvar/gi, 'Save', 'Guardar'],
  [/Cancelar/gi, 'Cancel', 'Cancelar'],
  [/Editar/gi, 'Edit', 'Editar'],
  [/Excluir/gi, 'Delete', 'Eliminar'],
  [/Deletar/gi, 'Delete', 'Eliminar'],
  [/Criar/gi, 'Create', 'Crear'],
  [/Adicionar/gi, 'Add', 'Agregar'],
  [/Exportar/gi, 'Export', 'Exportar'],
  [/Importar/gi, 'Import', 'Importar'],
  [/Imprimir/gi, 'Print', 'Imprimir'],
  [/Atualizar/gi, 'Refresh', 'Actualizar'],
  [/Fechar/gi, 'Close', 'Cerrar'],
  [/Voltar/gi, 'Back', 'Volver'],
  [/Nenhum/gi, 'No', 'Ningún'],
  [/Nenhuma/gi, 'No', 'Ninguna'],
  [/encontrado/gi, 'found', 'encontrado'],
  [/encontrada/gi, 'found', 'encontrada'],
]

export function translateDomString(raw: string, locale: SupportedLocale): string {
  if (locale === 'pt-BR' || !raw) return raw

  const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!match) return raw
  const [, leading, core, trailing] = match
  if (!core || core.length < 2) return raw

  // Skip pure numbers, currencies, URLs, emails, or template tags
  if (
    /^[\d.,\sR$%+-:/•#()]+$/.test(core) ||
    core.startsWith('http://') ||
    core.startsWith('https://') ||
    core.startsWith('{{') ||
    core.includes('@')
  ) {
    return raw
  }

  const targetIdx = locale === 'en-US' ? 0 : 1
  const lowerKey = core.toLowerCase().replace(/\s+/g, ' ')

  const exact = EXACT_PHRASES[lowerKey]
  if (exact) {
    const translated = exact[targetIdx]
    // Preserve all-uppercase if source was all-uppercase
    if (core === core.toUpperCase() && core !== core.toLowerCase()) {
      return `${leading}${translated.toUpperCase()}${trailing}`
    }
    return `${leading}${translated}${trailing}`
  }

  for (const rule of DYNAMIC_PATTERNS) {
    const m = core.match(rule.regex)
    if (m) {
      const out = locale === 'en-US' ? rule.en(...m) : rule.es(...m)
      return `${leading}${out}${trailing}`
    }
  }

  let composite = core
  let changed = false
  for (const [pattern, enRepl, esRepl] of PHRASE_REPLACEMENTS) {
    const repl = locale === 'en-US' ? enRepl : esRepl
    if (pattern.test(composite)) {
      composite = composite.replace(pattern, repl)
      changed = true
    }
  }

  if (changed) {
    return `${leading}${composite}${trailing}`
  }

  return raw
}

const originalTextNodeMap = new WeakMap<Text, string>()
const lastTranslatedTextNodeMap = new WeakMap<Text, string>()
const originalElementAttrMap = new WeakMap<Element, Record<string, string>>()
const lastTranslatedAttrMap = new WeakMap<Element, Record<string, string>>()

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const

function shouldSkipNode(node: Node | null): boolean {
  let curr: Node | null = node
  while (curr && curr instanceof Element) {
    const tag = curr.tagName
    if (
      tag === 'SCRIPT' ||
      tag === 'STYLE' ||
      tag === 'CODE' ||
      tag === 'PRE' ||
      tag === 'TEXTAREA' ||
      curr.getAttribute('data-no-dom-translate') === 'true'
    ) {
      return true
    }
    curr = curr.parentElement
  }
  return false
}

function processTextNode(textNode: Text, locale: SupportedLocale) {
  if (shouldSkipNode(textNode.parentElement)) return
  const currentVal = textNode.nodeValue
  if (!currentVal || !currentVal.trim()) return

  const lastTranslated = lastTranslatedTextNodeMap.get(textNode)
  if (!originalTextNodeMap.has(textNode) || (lastTranslated !== undefined && currentVal !== lastTranslated)) {
    // React updated the text node with a new source string
    originalTextNodeMap.set(textNode, currentVal)
  }

  const sourcePt = originalTextNodeMap.get(textNode) ?? currentVal
  const nextVal = locale === 'pt-BR' ? sourcePt : translateDomString(sourcePt, locale)

  lastTranslatedTextNodeMap.set(textNode, nextVal)
  if (textNode.nodeValue !== nextVal) {
    textNode.nodeValue = nextVal
  }
}

function processElementAttributes(el: Element, locale: SupportedLocale) {
  if (shouldSkipNode(el)) return
  let origMap = originalElementAttrMap.get(el)
  let lastMap = lastTranslatedAttrMap.get(el)

  for (const attr of TRANSLATABLE_ATTRS) {
    const val = el.getAttribute(attr)
    if (!val || !val.trim()) continue

    if (!origMap) {
      origMap = {}
      originalElementAttrMap.set(el, origMap)
    }
    if (!lastMap) {
      lastMap = {}
      lastTranslatedAttrMap.set(el, lastMap)
    }

    if (origMap[attr] === undefined || (lastMap[attr] !== undefined && val !== lastMap[attr])) {
      origMap[attr] = val
    }

    const sourcePt = origMap[attr]
    const nextVal = locale === 'pt-BR' ? sourcePt : translateDomString(sourcePt, locale)
    lastMap[attr] = nextVal
    if (val !== nextVal) {
      el.setAttribute(attr, nextVal)
    }
  }
}

function translateSubtree(root: Node, locale: SupportedLocale) {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text, locale)
    return
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return
  }

  if (root instanceof Element) {
    if (shouldSkipNode(root)) return
    processElementAttributes(root, locale)
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  )

  let current: Node | null = walker.nextNode()
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      processTextNode(current as Text, locale)
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      processElementAttributes(current as Element, locale)
    }
    current = walker.nextNode()
  }
}

export function DomAutoTranslator() {
  const { locale } = useI18n()

  React.useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return

    document.documentElement.lang = locale
    translateSubtree(document.body, locale)

    let rafId: number | null = null
    const pendingNodes = new Set<Node>()

    const flush = () => {
      rafId = null
      const nodes = Array.from(pendingNodes)
      pendingNodes.clear()
      for (const n of nodes) {
        if (n.isConnected) {
          translateSubtree(n, locale)
        }
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target) {
          pendingNodes.add(m.target)
        } else if (m.type === 'attributes' && m.target) {
          pendingNodes.add(m.target)
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((added) => pendingNodes.add(added))
        }
      }
      if (pendingNodes.size > 0 && rafId === null) {
        rafId = window.requestAnimationFrame(flush)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    })

    return () => {
      observer.disconnect()
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [locale])

  return null
}
