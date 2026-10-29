-- ============================================================================
-- MIGRATION 23: FUNCIONÁRIOS, PAPÉIS GRANULARES, APROVADOR DE BAIXA DE ESTOQUE
-- E FILIAIS COM REMESSA/TRANSFERÊNCIA DE ESTOQUE SEM VENDA
-- ============================================================================

-- 1. Adicionar STOCK_APPROVER ao enum user_role_enum
ALTER TYPE public.user_role_enum ADD VALUE IF NOT EXISTS 'STOCK_APPROVER';

-- 2. Adicionar o papel STOCK_APPROVER e as novas permissões granulares no catálogo
INSERT INTO public.roles (code, name, description, is_system)
VALUES (
  'STOCK_APPROVER',
  'Aprovador de Baixa de Estoque',
  'Supervisor autorizado a aprovar baixas de estoque por perda, avaria, vencimento e divergência de contagem',
  TRUE
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO public.permissions (code, name, module, description)
VALUES
  -- Produtos & Catálogo
  ('products.view_cost', 'Ver Preço de Custo e Margem', 'products', 'Permite visualizar preço de custo e margem de lucro dos produtos'),
  ('products.change_price', 'Alterar Preços de Produtos', 'products', 'Permite reajustar preço de venda e preço de custo'),
  ('categories.manage', 'Gerenciar Categorias', 'products', 'Permite criar, editar e excluir categorias de produtos'),
  ('catalog.whatsapp', 'Gerenciar Catálogo WhatsApp', 'products', 'Permite configurar vitrine pública e links de WhatsApp'),
  -- Estoque, Lotes & Aprovação de Baixa
  ('inventory.writeoff_request', 'Solicitar Baixa de Estoque', 'inventory', 'Permite abrir solicitação de baixa de estoque para aprovação'),
  ('inventory.approve_writeoff', 'Aprovador de Baixa de Estoque', 'inventory', 'Autoriza aprovar e efetivar baixas de estoque por perda, quebra, vencimento ou ajuste'),
  ('inventory.batches', 'Gerenciar Lotes e Validades', 'inventory', 'Permite gerenciar lotes, validades e disposições de descarte'),
  ('inventory.cost_centers', 'Gerenciar Centros de Custo', 'inventory', 'Permite configurar centros de custo operacionais de perda'),
  ('inventory.import', 'Importar Planilha de Estoque', 'inventory', 'Permite importar saldos e movimentações via CSV'),
  -- Filiais & Transferências
  ('branches.read', 'Visualizar Filiais', 'branches', 'Permite visualizar filiais vinculadas e histórico de remessas'),
  ('branches.manage', 'Cadastrar e Editar Filiais', 'branches', 'Permite cadastrar novas filiais e editar configurações da rede'),
  ('branches.transfer_send', 'Enviar Estoque para Filial (Sem Venda)', 'branches', 'Permite remeter produtos do estoque para filiais sem necessidade de venda'),
  ('branches.transfer_receive', 'Receber Remessa de Estoque na Filial', 'branches', 'Permite confirmar recebimento de mercadorias transferidas entre unidades'),
  -- Vendas PDV & Pedidos
  ('sales.pos', 'Operar Frente de Caixa (PDV)', 'sales', 'Permite realizar vendas presenciais no PDV'),
  ('sales.apply_discount', 'Aplicar Desconto Manual', 'sales', 'Permite conceder descontos manuais no PDV e pedidos'),
  ('orders.read', 'Visualizar Pedidos', 'sales', 'Permite consultar pedidos recebidos pelo catálogo e WhatsApp'),
  ('orders.manage', 'Gerenciar Status de Pedidos', 'sales', 'Permite aprovar, separar e despachar pedidos'),
  ('orders.delete', 'Excluir Pedidos Cancelados', 'sales', 'Permite remover permanentemente pedidos cancelados'),
  -- Compras
  ('purchase_orders.approve', 'Aprovar Ordem de Compra', 'purchasing', 'Permite autorizar ordens de compra antes do recebimento'),
  -- Clientes
  ('customers.export', 'Exportar Base de Clientes', 'customers', 'Permite exportar lista de clientes em CSV'),
  -- Relatórios
  ('reports.financial', 'Relatórios Financeiros e Margem', 'reports', 'Permite acessar avaliação financeira de estoque e lucro bruto'),
  ('reports.export', 'Exportar Relatórios CSV', 'reports', 'Permite exportar dados analíticos dos relatórios'),
  -- Administração
  ('audit.view', 'Visualizar Auditoria da Loja', 'stores', 'Permite consultar logs de auditoria e rastreabilidade de ações'),
  ('integrations.manage', 'Gerenciar Integrações de API', 'stores', 'Permite configurar conectores externos no API Studio')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    module = EXCLUDED.module,
    description = EXCLUDED.description;

-- Vincular permissões padrão ao papel STOCK_APPROVER
INSERT INTO public.role_permissions (role_code, permission_code)
VALUES
  ('STOCK_APPROVER', 'products.read'),
  ('STOCK_APPROVER', 'products.view_cost'),
  ('STOCK_APPROVER', 'inventory.read'),
  ('STOCK_APPROVER', 'inventory.receive'),
  ('STOCK_APPROVER', 'inventory.adjust'),
  ('STOCK_APPROVER', 'inventory.writeoff'),
  ('STOCK_APPROVER', 'inventory.writeoff_request'),
  ('STOCK_APPROVER', 'inventory.approve_writeoff'),
  ('STOCK_APPROVER', 'inventory.batches'),
  ('STOCK_APPROVER', 'inventory.cost_centers'),
  ('STOCK_APPROVER', 'branches.read'),
  ('STOCK_APPROVER', 'branches.transfer_send'),
  ('STOCK_APPROVER', 'branches.transfer_receive'),
  ('STOCK_APPROVER', 'suppliers.read'),
  ('STOCK_APPROVER', 'purchase_orders.read'),
  ('STOCK_APPROVER', 'purchase_orders.receive'),
  ('STOCK_APPROVER', 'reports.inventory')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Tabela de Papéis Customizados por Loja (store_custom_roles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_role public.user_role_enum DEFAULT 'INVENTORY'::public.user_role_enum NOT NULL,
  permissions TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  can_approve_writeoff BOOLEAN DEFAULT FALSE NOT NULL,
  max_writeoff_value NUMERIC(12,2),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_store_custom_role_code UNIQUE(store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_store_custom_roles_store
  ON public.store_custom_roles(store_id, is_active);

ALTER TABLE public.store_custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store custom roles select: tenant" ON public.store_custom_roles;
CREATE POLICY "Store custom roles select: tenant"
  ON public.store_custom_roles FOR SELECT
  USING (public.has_store_access(store_id) OR public.is_global_admin());

DROP POLICY IF EXISTS "Store custom roles manage: admin" ON public.store_custom_roles;
CREATE POLICY "Store custom roles manage: admin"
  ON public.store_custom_roles FOR ALL
  USING (
    public.is_global_admin() OR
    public.has_store_role(store_id, ARRAY['STORE_ADMIN']::public.user_role_enum[])
  )
  WITH CHECK (
    public.is_global_admin() OR
    public.has_store_role(store_id, ARRAY['STORE_ADMIN']::public.user_role_enum[])
  );

-- ----------------------------------------------------------------------------
-- 4. Evolução da Tabela store_users (Permissões Granulares & Aprovador de Baixa)
-- ----------------------------------------------------------------------------
ALTER TABLE public.store_users
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.store_custom_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS can_approve_writeoff BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS approval_pin TEXT,
  ADD COLUMN IF NOT EXISTS max_writeoff_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS granted_permissions TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  ADD COLUMN IF NOT EXISTS revoked_permissions TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

-- Garantir que STORE_ADMIN e STOCK_APPROVER atuais tenham can_approve_writeoff = TRUE por padrão
UPDATE public.store_users
SET can_approve_writeoff = TRUE
WHERE role::TEXT IN ('STORE_ADMIN', 'STOCK_APPROVER')
  AND NOT ('inventory.approve_writeoff' = ANY(COALESCE(revoked_permissions, '{}'::TEXT[])));

-- ----------------------------------------------------------------------------
-- 5. Função Helper: Verifica se um usuário é Aprovador de Baixa de Estoque
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_user_approve_writeoff(
  p_store_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_global BOOLEAN := FALSE;
  v_su RECORD;
  v_custom_can_approve BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL OR p_store_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT is_global_admin INTO v_is_global
  FROM public.profiles
  WHERE id = p_user_id;

  IF COALESCE(v_is_global, FALSE) THEN
    RETURN TRUE;
  END IF;

  SELECT
    role::TEXT AS role_text,
    is_active,
    can_approve_writeoff,
    custom_role_id,
    COALESCE(granted_permissions, '{}'::TEXT[]) AS granted_perms,
    COALESCE(revoked_permissions, '{}'::TEXT[]) AS revoked_perms
  INTO v_su
  FROM public.store_users
  WHERE store_id = p_store_id
    AND user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND OR NOT COALESCE(v_su.is_active, FALSE) THEN
    RETURN FALSE;
  END IF;

  -- Se foi explicitamente revogada a permissão de aprovar baixa
  IF 'inventory.approve_writeoff' = ANY(v_su.revoked_perms) THEN
    RETURN FALSE;
  END IF;

  -- Verifica se o papel customizado concede aprovação
  IF v_su.custom_role_id IS NOT NULL THEN
    SELECT can_approve_writeoff OR ('inventory.approve_writeoff' = ANY(COALESCE(permissions, '{}'::TEXT[])))
    INTO v_custom_can_approve
    FROM public.store_custom_roles
    WHERE id = v_su.custom_role_id AND is_active = TRUE;
  END IF;

  IF COALESCE(v_su.can_approve_writeoff, FALSE)
     OR v_su.role_text = 'STOCK_APPROVER'
     OR COALESCE(v_custom_can_approve, FALSE)
     OR ('inventory.approve_writeoff' = ANY(v_su.granted_perms))
  THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_approve_writeoff(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Solicitações Pendentes de Baixa de Estoque (stock_writeoff_requests)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_writeoff_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.stock_batches(id) ON DELETE SET NULL,
  lot_number TEXT,
  expiration_date DATE,
  movement_type public.stock_movement_type_enum DEFAULT 'LOSS'::public.stock_movement_type_enum NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12,2),
  reason_code TEXT NOT NULL,
  reason_detail TEXT,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_by_registration TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by_registration TEXT,
  rejection_reason TEXT,
  movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_writeoff_requests_store_status
  ON public.stock_writeoff_requests(store_id, status, created_at DESC);

ALTER TABLE public.stock_writeoff_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Writeoff requests select: tenant" ON public.stock_writeoff_requests;
CREATE POLICY "Writeoff requests select: tenant"
  ON public.stock_writeoff_requests FOR SELECT
  USING (public.has_store_access(store_id) OR public.is_global_admin());

DROP POLICY IF EXISTS "Writeoff requests insert: tenant member" ON public.stock_writeoff_requests;
CREATE POLICY "Writeoff requests insert: tenant member"
  ON public.stock_writeoff_requests FOR INSERT
  WITH CHECK (public.has_store_access(store_id) OR public.is_global_admin());

DROP POLICY IF EXISTS "Writeoff requests update: approver or admin" ON public.stock_writeoff_requests;
CREATE POLICY "Writeoff requests update: approver or admin"
  ON public.stock_writeoff_requests FOR UPDATE
  USING (
    public.is_global_admin() OR
    public.can_user_approve_writeoff(store_id, auth.uid()) OR
    (requested_by = auth.uid() AND status = 'PENDING')
  );

-- ----------------------------------------------------------------------------
-- 7. Atualizar RPC apply_stock_movement com Validação Estrita do Aprovador
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_stock_movement(
  p_product_id UUID,
  p_movement_type public.stock_movement_type_enum,
  p_quantity NUMERIC,
  p_batch_id UUID DEFAULT NULL,
  p_lot_number TEXT DEFAULT NULL,
  p_expiration_date DATE DEFAULT NULL,
  p_unit_cost NUMERIC DEFAULT NULL,
  p_reason_code TEXT DEFAULT NULL,
  p_reason_detail TEXT DEFAULT NULL,
  p_cost_center_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_approved_by UUID DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id UUID;
  v_balance_id UUID;
  v_current NUMERIC;
  v_new NUMERIC;
  v_delta NUMERIC;
  v_movement_id UUID;
  v_batch_id UUID;
  v_batch_qty NUMERIC;
  v_operator UUID := auth.uid();
  v_effective_approver UUID := p_approved_by;
  v_operator_reg TEXT;
  v_approver_reg TEXT;
  v_cost_center_code TEXT;
  v_requires_approval BOOLEAN := FALSE;
  v_max_writeoff NUMERIC;
  v_total_loss_value NUMERIC;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  -- Loja a partir do produto
  SELECT store_id INTO v_store_id
  FROM public.products
  WHERE id = p_product_id AND deleted_at IS NULL;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado.';
  END IF;

  IF NOT (
    public.is_global_admin() OR
    public.has_store_role(
      v_store_id,
      ARRAY['STORE_ADMIN', 'INVENTORY', 'STOCK_APPROVER', 'FINANCE']::public.user_role_enum[]
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para movimentar estoque nesta loja.';
  END IF;

  -- Verificar se o motivo ou tipo de movimento exige aprovação de baixa
  IF p_reason_code IS NOT NULL THEN
    SELECT COALESCE(requires_approval, TRUE) INTO v_requires_approval
    FROM public.loss_reasons
    WHERE code = p_reason_code;
  ELSIF p_movement_type IN ('LOSS', 'DAMAGE', 'EXPIRATION') THEN
    v_requires_approval := TRUE;
  END IF;

  -- Se o movimento exige aprovação de baixa:
  IF v_requires_approval THEN
    -- Caso não tenha enviado p_approved_by, se o próprio operador for Aprovador habilitado, ele mesmo pode constar como aprovador
    IF v_effective_approver IS NULL AND public.can_user_approve_writeoff(v_store_id, v_operator) THEN
      v_effective_approver := v_operator;
    END IF;

    IF v_effective_approver IS NULL THEN
      RAISE EXCEPTION 'Esta baixa de estoque exige autorização de um Aprovador de Baixa de Estoque.';
    END IF;

    -- VALIDAÇÃO ESTRITA: Somente quem é Aprovador de Baixa de Estoque pode autorizar!
    IF NOT public.can_user_approve_writeoff(v_store_id, v_effective_approver) THEN
      RAISE EXCEPTION 'Operação negada: O usuário selecionado não possui o papel ou permissão de Aprovador de Baixa de Estoque.';
    END IF;

    -- Verificar alçada máxima (max_writeoff_value) se configurada para o aprovador
    SELECT max_writeoff_value INTO v_max_writeoff
    FROM public.store_users
    WHERE store_id = v_store_id AND user_id = v_effective_approver
    LIMIT 1;

    v_total_loss_value := p_quantity * COALESCE(p_unit_cost, 0);
    IF v_max_writeoff IS NOT NULL AND v_max_writeoff > 0 AND v_total_loss_value > v_max_writeoff THEN
      RAISE EXCEPTION 'Valor da baixa (R$ %) excede a alçada máxima autorizada para este aprovador (R$ %).',
        ROUND(v_total_loss_value, 2), ROUND(v_max_writeoff, 2);
    END IF;
  ELSIF v_effective_approver IS NOT NULL THEN
    -- Mesmo quando opcional, se um aprovador foi informado, ele precisa ser um aprovador válido
    IF NOT public.can_user_approve_writeoff(v_store_id, v_effective_approver) THEN
      RAISE EXCEPTION 'O usuário informado como aprovador não possui permissão de Aprovador de Baixa de Estoque.';
    END IF;
  END IF;

  -- Sinal conforme o tipo de movimento
  IF p_movement_type IN ('EXIT', 'LOSS', 'DAMAGE', 'EXPIRATION', 'SALE') THEN
    v_delta := -p_quantity;
  ELSIF p_movement_type = 'ADJUSTMENT' THEN
    SELECT quantity INTO v_current
    FROM public.stock_balances
    WHERE store_id = v_store_id AND product_id = p_product_id
    FOR UPDATE;

    v_current := COALESCE(v_current, 0);
    v_delta := p_quantity - v_current;
  ELSE
    v_delta := p_quantity;
  END IF;

  IF v_delta = 0 THEN
    RAISE EXCEPTION 'A quantidade informada não altera o saldo atual.';
  END IF;

  -- Trava e atualiza o saldo
  INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
  VALUES (v_store_id, p_product_id, 0, 0)
  ON CONFLICT (store_id, product_id) DO NOTHING;

  SELECT id, quantity INTO v_balance_id, v_current
  FROM public.stock_balances
  WHERE store_id = v_store_id AND product_id = p_product_id
  FOR UPDATE;

  v_new := v_current + v_delta;

  IF v_new < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente: disponível %, solicitado %.',
      v_current, ABS(v_delta);
  END IF;

  UPDATE public.stock_balances
  SET quantity = v_new, updated_at = NOW()
  WHERE id = v_balance_id;

  -- Lote: usa o informado, cria/mescla por lote+validade, ou ignora
  v_batch_id := p_batch_id;

  IF v_batch_id IS NULL AND p_lot_number IS NOT NULL AND TRIM(p_lot_number) <> '' THEN
    SELECT id INTO v_batch_id
    FROM public.stock_batches
    WHERE store_id = v_store_id
      AND product_id = p_product_id
      AND lot_number = TRIM(p_lot_number)
      AND COALESCE(expiration_date = p_expiration_date, expiration_date IS NULL)
    LIMIT 1;

    IF v_batch_id IS NULL THEN
      INSERT INTO public.stock_batches (
        store_id, product_id, lot_number, quantity, cost_price, expiration_date, status
      )
      VALUES (
        v_store_id, p_product_id, TRIM(p_lot_number), 0, p_unit_cost,
        p_expiration_date,
        CASE
          WHEN p_expiration_date IS NOT NULL AND p_expiration_date < CURRENT_DATE THEN 'EXPIRED'::public.batch_status_enum
          ELSE 'ACTIVE'::public.batch_status_enum
        END
      )
      RETURNING id INTO v_batch_id;
    END IF;
  END IF;

  -- Movimenta o lote
  IF v_batch_id IS NOT NULL THEN
    SELECT quantity INTO v_batch_qty
    FROM public.stock_batches
    WHERE id = v_batch_id AND store_id = v_store_id
    FOR UPDATE;

    v_batch_qty := COALESCE(v_batch_qty, 0);

    UPDATE public.stock_batches
    SET
      quantity = GREATEST(v_batch_qty + v_delta, 0),
      status = CASE
        WHEN GREATEST(v_batch_qty + v_delta, 0) <= 0 THEN 'DEPLETED'::public.batch_status_enum
        WHEN expiration_date IS NOT NULL AND expiration_date < CURRENT_DATE THEN 'EXPIRED'::public.batch_status_enum
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = v_batch_id;
  END IF;

  -- Matrícula do operador e do aprovador
  SELECT employee_registration INTO v_operator_reg
  FROM public.store_users
  WHERE store_id = v_store_id AND user_id = v_operator
  LIMIT 1;

  IF v_effective_approver IS NOT NULL THEN
    SELECT employee_registration INTO v_approver_reg
    FROM public.store_users
    WHERE store_id = v_store_id AND user_id = v_effective_approver
    LIMIT 1;
  END IF;

  -- Snapshot do centro de custo
  IF p_cost_center_id IS NOT NULL THEN
    SELECT code INTO v_cost_center_code
    FROM public.cost_centers
    WHERE id = p_cost_center_id AND store_id = v_store_id;
  END IF;

  INSERT INTO public.stock_movements (
    store_id, product_id, batch_id, movement_type, quantity,
    previous_quantity, new_quantity, unit_cost, reference_id, reference_type,
    notes, user_id, reason_code, reason_detail, cost_center_id, cost_center_code,
    operator_id, operator_registration, approved_by, approved_by_registration, approved_at
  )
  VALUES (
    v_store_id, p_product_id, v_batch_id, p_movement_type, p_quantity,
    v_current, v_new, p_unit_cost, p_reference_id, p_reference_type,
    p_notes, v_operator, p_reason_code, p_reason_detail, p_cost_center_id, v_cost_center_code,
    v_operator, v_operator_reg, v_effective_approver, v_approver_reg,
    CASE WHEN v_effective_approver IS NOT NULL THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stock_movement(
  UUID, public.stock_movement_type_enum, NUMERIC, UUID, TEXT, DATE, NUMERIC,
  TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC: Aprovar ou Rejeitar Solicitação de Baixa Pendente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_stock_writeoff_request(
  p_request_id UUID,
  p_decision TEXT,
  p_approver_pin TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req public.stock_writeoff_requests%ROWTYPE;
  v_reviewer UUID := auth.uid();
  v_reviewer_reg TEXT;
  v_stored_pin TEXT;
  v_movement_id UUID;
BEGIN
  SELECT * INTO v_req
  FROM public.stock_writeoff_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de baixa não encontrada.';
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada (%).', v_req.status;
  END IF;

  IF NOT public.can_user_approve_writeoff(v_req.store_id, v_reviewer) THEN
    RAISE EXCEPTION 'Acesso negado: Somente um Aprovador de Baixa de Estoque pode autorizar ou rejeitar baixas.';
  END IF;

  SELECT employee_registration, approval_pin
  INTO v_reviewer_reg, v_stored_pin
  FROM public.store_users
  WHERE store_id = v_req.store_id AND user_id = v_reviewer
  LIMIT 1;

  IF v_stored_pin IS NOT NULL AND TRIM(v_stored_pin) <> '' AND p_approver_pin IS NOT NULL AND TRIM(p_approver_pin) <> '' THEN
    IF TRIM(v_stored_pin) <> TRIM(p_approver_pin) THEN
      RAISE EXCEPTION 'PIN de autorização do aprovador inválido.';
    END IF;
  END IF;

  IF UPPER(p_decision) = 'APPROVED' THEN
    v_movement_id := public.apply_stock_movement(
      p_product_id => v_req.product_id,
      p_movement_type => v_req.movement_type,
      p_quantity => v_req.quantity,
      p_batch_id => v_req.batch_id,
      p_lot_number => v_req.lot_number,
      p_expiration_date => v_req.expiration_date,
      p_unit_cost => v_req.unit_cost,
      p_reason_code => v_req.reason_code,
      p_reason_detail => v_req.reason_detail,
      p_cost_center_id => v_req.cost_center_id,
      p_notes => COALESCE(v_req.notes, 'Baixa aprovada via fila de supervisão'),
      p_approved_by => v_reviewer,
      p_reference_id => v_req.id::TEXT,
      p_reference_type => 'WRITEOFF_REQUEST'
    );

    UPDATE public.stock_writeoff_requests
    SET status = 'APPROVED',
        reviewed_by = v_reviewer,
        reviewed_by_registration = v_reviewer_reg,
        movement_id = v_movement_id,
        reviewed_at = NOW()
    WHERE id = p_request_id;

    RETURN v_movement_id;
  ELSIF UPPER(p_decision) = 'REJECTED' THEN
    UPDATE public.stock_writeoff_requests
    SET status = 'REJECTED',
        reviewed_by = v_reviewer,
        reviewed_by_registration = v_reviewer_reg,
        rejection_reason = COALESCE(p_rejection_reason, 'Rejeitado pelo aprovador de estoque'),
        reviewed_at = NOW()
    WHERE id = p_request_id;

    RETURN p_request_id;
  ELSE
    RAISE EXCEPTION 'Decisão inválida: informe APPROVED ou REJECTED.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_stock_writeoff_request(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. RPC: Cadastro/Atualização Segura de Funcionário (Sem Deslogar o Admin)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_store_employee(
  p_store_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_role public.user_role_enum DEFAULT 'SELLER'::public.user_role_enum,
  p_job_title TEXT DEFAULT NULL,
  p_employee_registration TEXT DEFAULT NULL,
  p_custom_role_id UUID DEFAULT NULL,
  p_can_approve_writeoff BOOLEAN DEFAULT FALSE,
  p_approval_pin TEXT DEFAULT NULL,
  p_max_writeoff_value NUMERIC DEFAULT NULL,
  p_granted_permissions TEXT[] DEFAULT '{}'::TEXT[],
  p_revoked_permissions TEXT[] DEFAULT '{}'::TEXT[],
  p_is_active BOOLEAN DEFAULT TRUE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_norm_email TEXT := LOWER(TRIM(p_email));
  v_target_user_id UUID;
  v_store_user_id UUID;
  v_encrypted_pw TEXT;
  v_raw_pw TEXT;
BEGIN
  IF v_norm_email IS NULL OR v_norm_email = '' THEN
    RAISE EXCEPTION 'O e-mail do funcionário é obrigatório.';
  END IF;

  IF NOT (
    public.is_global_admin() OR
    public.has_store_role(p_store_id, ARRAY['STORE_ADMIN']::public.user_role_enum[])
  ) THEN
    RAISE EXCEPTION 'Apenas o Administrador da Loja ou Global Admin pode gerenciar funcionários e papéis.';
  END IF;

  -- 1. Verificar se o usuário já existe em profiles ou auth.users
  SELECT id INTO v_target_user_id
  FROM public.profiles
  WHERE LOWER(email) = v_norm_email
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE LOWER(email) = v_norm_email
    LIMIT 1;
  END IF;

  -- 2. Se não existir no auth.users, criar a identidade com segurança sem afetar a sessão atual
  IF v_target_user_id IS NULL THEN
    v_target_user_id := gen_random_uuid();
    v_raw_pw := COALESCE(NULLIF(TRIM(p_password), ''), 'Olivelas@2026');
    v_encrypted_pw := extensions.crypt(v_raw_pw, extensions.gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_target_user_id,
      'authenticated',
      'authenticated',
      v_norm_email,
      v_encrypted_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', COALESCE(NULLIF(TRIM(p_full_name), ''), split_part(v_norm_email, '@', 1)), 'phone', p_phone),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_target_user_id,
      jsonb_build_object('sub', v_target_user_id::TEXT, 'email', v_norm_email, 'email_verified', true),
      'email',
      v_target_user_id::TEXT,
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  ELSIF p_password IS NOT NULL AND TRIM(p_password) <> '' THEN
    -- Atualizar senha caso o admin tenha informado uma nova senha para o funcionário
    v_encrypted_pw := extensions.crypt(TRIM(p_password), extensions.gen_salt('bf'));
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        updated_at = NOW()
    WHERE id = v_target_user_id;
  END IF;

  -- 3. Garantir/atualizar registro em public.profiles
  INSERT INTO public.profiles (id, email, full_name, phone, updated_at)
  VALUES (
    v_target_user_id,
    v_norm_email,
    COALESCE(NULLIF(TRIM(p_full_name), ''), split_part(v_norm_email, '@', 1)),
    NULLIF(TRIM(p_phone), ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = NOW();

  -- 4. Upsert em public.store_users com todas as permissões granulares e flag de aprovador
  INSERT INTO public.store_users (
    store_id,
    user_id,
    role,
    job_title,
    employee_registration,
    custom_role_id,
    can_approve_writeoff,
    approval_pin,
    max_writeoff_value,
    granted_permissions,
    revoked_permissions,
    is_active,
    updated_at
  ) VALUES (
    p_store_id,
    v_target_user_id,
    p_role,
    NULLIF(TRIM(p_job_title), ''),
    NULLIF(TRIM(p_employee_registration), ''),
    p_custom_role_id,
    COALESCE(p_can_approve_writeoff, p_role = 'STOCK_APPROVER'::public.user_role_enum),
    NULLIF(TRIM(p_approval_pin), ''),
    p_max_writeoff_value,
    COALESCE(p_granted_permissions, '{}'::TEXT[]),
    COALESCE(p_revoked_permissions, '{}'::TEXT[]),
    COALESCE(p_is_active, TRUE),
    NOW()
  )
  ON CONFLICT (store_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      job_title = EXCLUDED.job_title,
      employee_registration = EXCLUDED.employee_registration,
      custom_role_id = EXCLUDED.custom_role_id,
      can_approve_writeoff = EXCLUDED.can_approve_writeoff,
      approval_pin = COALESCE(EXCLUDED.approval_pin, public.store_users.approval_pin),
      max_writeoff_value = EXCLUDED.max_writeoff_value,
      granted_permissions = EXCLUDED.granted_permissions,
      revoked_permissions = EXCLUDED.revoked_permissions,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
  RETURNING id INTO v_store_user_id;

  -- 5. Registrar auditoria
  INSERT INTO public.audit_logs (
    store_id, user_id, action, entity, entity_id, after_data
  ) VALUES (
    p_store_id,
    v_caller,
    'STORE_EMPLOYEE_UPSERTED',
    'store_users',
    v_store_user_id::TEXT,
    jsonb_build_object(
      'email', v_norm_email,
      'fullName', p_full_name,
      'role', p_role,
      'jobTitle', p_job_title,
      'employeeRegistration', p_employee_registration,
      'canApproveWriteoff', p_can_approve_writeoff,
      'grantedPermissions', p_granted_permissions,
      'revokedPermissions', p_revoked_permissions
    )
  );

  RETURN v_store_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_store_employee(
  UUID, TEXT, TEXT, TEXT, TEXT, public.user_role_enum, TEXT, TEXT, UUID,
  BOOLEAN, TEXT, NUMERIC, TEXT[], TEXT[], BOOLEAN
) TO authenticated;

-- ----------------------------------------------------------------------------
-- 10. Estrutura de Filiais em public.stores e Transferências Sem Venda
-- ----------------------------------------------------------------------------
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS parent_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_code TEXT,
  ADD COLUMN IF NOT EXISTS is_branch BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS manager_name TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_parent_store
  ON public.stores(parent_store_id);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number TEXT NOT NULL UNIQUE,
  source_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  destination_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'COMPLETED' NOT NULL CHECK (status IN ('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
  total_items INT DEFAULT 0 NOT NULL,
  total_quantity NUMERIC(12,3) DEFAULT 0 NOT NULL,
  total_cost_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
  total_selling_value NUMERIC(12,2) DEFAULT 0 NOT NULL,
  notes TEXT,
  driver_or_carrier TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_source
  ON public.stock_transfers(source_store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_destination
  ON public.stock_transfers(destination_store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  source_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  destination_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit TEXT DEFAULT 'UN' NOT NULL,
  source_batch_id UUID REFERENCES public.stock_batches(id) ON DELETE SET NULL,
  destination_batch_id UUID REFERENCES public.stock_batches(id) ON DELETE SET NULL,
  lot_number TEXT,
  expiration_date DATE,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12,2) DEFAULT 0 NOT NULL,
  selling_price NUMERIC(12,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer
  ON public.stock_transfer_items(transfer_id);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stock transfers select: source or destination" ON public.stock_transfers;
CREATE POLICY "Stock transfers select: source or destination"
  ON public.stock_transfers FOR SELECT
  USING (
    public.is_global_admin() OR
    public.has_store_access(source_store_id) OR
    public.has_store_access(destination_store_id)
  );

DROP POLICY IF EXISTS "Stock transfers insert: source store member" ON public.stock_transfers;
CREATE POLICY "Stock transfers insert: source store member"
  ON public.stock_transfers FOR INSERT
  WITH CHECK (
    public.is_global_admin() OR
    public.has_store_access(source_store_id)
  );

DROP POLICY IF EXISTS "Stock transfer items select: via transfer" ON public.stock_transfer_items;
CREATE POLICY "Stock transfer items select: via transfer"
  ON public.stock_transfer_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_transfers t
      WHERE t.id = stock_transfer_items.transfer_id
        AND (
          public.is_global_admin() OR
          public.has_store_access(t.source_store_id) OR
          public.has_store_access(t.destination_store_id)
        )
    )
  );

-- ----------------------------------------------------------------------------
-- 11. RPC Atômica: Transferir Produtos do Estoque para Filial (Sem Venda)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_stock_transfer_to_branch(
  p_source_store_id UUID,
  p_destination_store_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL,
  p_driver_or_carrier TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_operator UUID := auth.uid();
  v_transfer_id UUID := gen_random_uuid();
  v_transfer_number TEXT;
  v_item JSONB;
  v_src_product public.products%ROWTYPE;
  v_dest_product_id UUID;
  v_dest_category_id UUID;
  v_src_category public.categories%ROWTYPE;
  v_qty NUMERIC(12,3);
  v_src_batch_id UUID;
  v_src_batch public.stock_batches%ROWTYPE;
  v_dest_batch_id UUID;
  v_lot_number TEXT;
  v_exp_date DATE;
  v_unit_cost NUMERIC(12,2);
  v_selling_price NUMERIC(12,2);
  v_src_balance_id UUID;
  v_src_current NUMERIC;
  v_dest_balance_id UUID;
  v_dest_current NUMERIC;
  v_total_items INT := 0;
  v_total_qty NUMERIC(12,3) := 0;
  v_total_cost NUMERIC(12,2) := 0;
  v_total_selling NUMERIC(12,2) := 0;
  v_dest_store_name TEXT;
  v_src_store_name TEXT;
BEGIN
  IF p_source_store_id IS NULL OR p_destination_store_id IS NULL THEN
    RAISE EXCEPTION 'Selecione a unidade de origem e a filial de destino.';
  END IF;

  IF p_source_store_id = p_destination_store_id THEN
    RAISE EXCEPTION 'A filial de destino deve ser diferente da loja de origem.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um produto para transferir para a filial.';
  END IF;

  -- Validar permissão do operador na loja de origem
  IF NOT (
    public.is_global_admin() OR
    public.has_store_role(
      p_source_store_id,
      ARRAY['STORE_ADMIN', 'STOCK_APPROVER', 'INVENTORY']::public.user_role_enum[]
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para transferir produtos do estoque desta unidade.';
  END IF;

  SELECT name INTO v_src_store_name FROM public.stores WHERE id = p_source_store_id;
  SELECT name INTO v_dest_store_name FROM public.stores WHERE id = p_destination_store_id;

  IF v_dest_store_name IS NULL THEN
    RAISE EXCEPTION 'Filial de destino não encontrada.';
  END IF;

  v_transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(v_transfer_id::TEXT FROM 1 FOR 6));

  -- Criar cabeçalho da remessa
  INSERT INTO public.stock_transfers (
    id,
    transfer_number,
    source_store_id,
    destination_store_id,
    status,
    notes,
    driver_or_carrier,
    created_by,
    approved_by,
    received_by,
    created_at,
    completed_at
  ) VALUES (
    v_transfer_id,
    v_transfer_number,
    p_source_store_id,
    p_destination_store_id,
    'COMPLETED',
    COALESCE(p_notes, 'Remessa de estoque para venda na filial ' || v_dest_store_name),
    p_driver_or_carrier,
    v_operator,
    v_operator,
    v_operator,
    NOW(),
    NOW()
  );

  -- Processar cada item da transferência
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantidade de transferência inválida.';
    END IF;

    SELECT * INTO v_src_product
    FROM public.products
    WHERE id = (v_item->>'productId')::UUID
      AND store_id = p_source_store_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto de origem não encontrado no estoque da matriz.';
    END IF;

    v_src_batch_id := NULLIF(v_item->>'batchId', '')::UUID;
    v_lot_number := NULLIF(TRIM(v_item->>'lotNumber'), '');
    v_exp_date := NULLIF(TRIM(v_item->>'expirationDate'), '')::DATE;
    v_unit_cost := COALESCE((v_item->>'unitCost')::NUMERIC, v_src_product.cost_price, 0);
    v_selling_price := COALESCE((v_item->>'sellingPrice')::NUMERIC, v_src_product.selling_price, 0);

    -- Se selecionou lote na origem, buscar dados do lote e abater dele
    IF v_src_batch_id IS NOT NULL THEN
      SELECT * INTO v_src_batch
      FROM public.stock_batches
      WHERE id = v_src_batch_id AND store_id = p_source_store_id
      FOR UPDATE;

      IF FOUND THEN
        v_lot_number := COALESCE(v_lot_number, v_src_batch.lot_number);
        v_exp_date := COALESCE(v_exp_date, v_src_batch.expiration_date);
        v_unit_cost := COALESCE(v_src_batch.cost_price, v_unit_cost);

        IF v_src_batch.quantity < v_qty THEN
          RAISE EXCEPTION 'Saldo insuficiente no lote % do produto % (disponível: %, solicitado: %).',
            v_src_batch.lot_number, v_src_product.name, v_src_batch.quantity, v_qty;
        END IF;

        UPDATE public.stock_batches
        SET quantity = GREATEST(v_src_batch.quantity - v_qty, 0),
            status = CASE
              WHEN GREATEST(v_src_batch.quantity - v_qty, 0) <= 0 THEN 'DEPLETED'::public.batch_status_enum
              ELSE status
            END,
            updated_at = NOW()
        WHERE id = v_src_batch_id;
      END IF;
    END IF;

    -- 1. Deduzir saldo na Loja de Origem (Matriz)
    SELECT id, quantity INTO v_src_balance_id, v_src_current
    FROM public.stock_balances
    WHERE store_id = p_source_store_id AND product_id = v_src_product.id
    FOR UPDATE;

    IF v_src_balance_id IS NULL OR COALESCE(v_src_current, 0) < v_qty THEN
      RAISE EXCEPTION 'Saldo insuficiente na origem para o produto "%" (disponível: %, solicitado: %).',
        v_src_product.name, COALESCE(v_src_current, 0), v_qty;
    END IF;

    UPDATE public.stock_balances
    SET quantity = v_src_current - v_qty,
        updated_at = NOW()
    WHERE id = v_src_balance_id;

    -- Registrar movimento de SAÍDA POR TRANSFERÊNCIA na Origem
    INSERT INTO public.stock_movements (
      store_id, product_id, batch_id, movement_type, quantity,
      previous_quantity, new_quantity, unit_cost, reference_id, reference_type,
      notes, user_id, operator_id, approved_by, approved_at
    ) VALUES (
      p_source_store_id, v_src_product.id, v_src_batch_id, 'TRANSFER'::public.stock_movement_type_enum, v_qty,
      v_src_current, v_src_current - v_qty, v_unit_cost, v_transfer_id::TEXT, 'BRANCH_TRANSFER_OUT',
      'Remessa sem venda (' || v_transfer_number || ') enviada para filial: ' || v_dest_store_name,
      v_operator, v_operator, v_operator, NOW()
    );

    -- 2. Garantir que o produto (e sua categoria + fotos) exista na Filial de Destino
    SELECT id INTO v_dest_product_id
    FROM public.products
    WHERE store_id = p_destination_store_id
      AND LOWER(sku) = LOWER(v_src_product.sku)
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_dest_product_id IS NULL THEN
      v_dest_category_id := NULL;
      IF v_src_product.category_id IS NOT NULL THEN
        SELECT * INTO v_src_category
        FROM public.categories
        WHERE id = v_src_product.category_id;

        IF FOUND THEN
          SELECT id INTO v_dest_category_id
          FROM public.categories
          WHERE store_id = p_destination_store_id
            AND LOWER(slug) = LOWER(v_src_category.slug)
          LIMIT 1;

          IF v_dest_category_id IS NULL THEN
            INSERT INTO public.categories (store_id, name, slug)
            VALUES (p_destination_store_id, v_src_category.name, v_src_category.slug)
            RETURNING id INTO v_dest_category_id;
          END IF;
        END IF;
      END IF;

      INSERT INTO public.products (
        store_id, category_id, name, sku, barcode, ean, description,
        unit, cost_price, selling_price, min_stock, max_stock,
        weight_kg, is_active, is_published_catalog, controls_batch, controls_expiration
      ) VALUES (
        p_destination_store_id,
        v_dest_category_id,
        v_src_product.name,
        v_src_product.sku,
        v_src_product.barcode,
        v_src_product.ean,
        v_src_product.description,
        v_src_product.unit,
        v_unit_cost,
        v_selling_price,
        v_src_product.min_stock,
        v_src_product.max_stock,
        v_src_product.weight_kg,
        TRUE,
        COALESCE(v_src_product.is_published_catalog, TRUE),
        v_src_product.controls_batch,
        v_src_product.controls_expiration
      )
      RETURNING id INTO v_dest_product_id;

      -- Clonar fotos do produto para a filial exibir no PDV e no Catálogo Público
      INSERT INTO public.product_images (
        store_id, product_id, storage_path, public_url, is_primary, display_order
      )
      SELECT
        p_destination_store_id,
        v_dest_product_id,
        storage_path,
        public_url,
        is_primary,
        display_order
      FROM public.product_images
      WHERE product_id = v_src_product.id;
    END IF;

    -- 3. Criar/Atualizar lote na Filial de Destino
    v_dest_batch_id := NULL;
    IF v_lot_number IS NOT NULL AND TRIM(v_lot_number) <> '' THEN
      SELECT id INTO v_dest_batch_id
      FROM public.stock_batches
      WHERE store_id = p_destination_store_id
        AND product_id = v_dest_product_id
        AND lot_number = v_lot_number
      LIMIT 1;

      IF v_dest_batch_id IS NULL THEN
        INSERT INTO public.stock_batches (
          store_id, product_id, lot_number, quantity, cost_price, expiration_date, status
        ) VALUES (
          p_destination_store_id,
          v_dest_product_id,
          v_lot_number,
          v_qty,
          v_unit_cost,
          v_exp_date,
          CASE
            WHEN v_exp_date IS NOT NULL AND v_exp_date < CURRENT_DATE THEN 'EXPIRED'::public.batch_status_enum
            ELSE 'ACTIVE'::public.batch_status_enum
          END
        )
        RETURNING id INTO v_dest_batch_id;
      ELSE
        UPDATE public.stock_batches
        SET quantity = quantity + v_qty,
            cost_price = COALESCE(v_unit_cost, cost_price),
            expiration_date = COALESCE(v_exp_date, expiration_date),
            status = 'ACTIVE'::public.batch_status_enum,
            updated_at = NOW()
        WHERE id = v_dest_batch_id;
      END IF;
    END IF;

    -- 4. Incrementar saldo na Filial de Destino
    INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity)
    VALUES (p_destination_store_id, v_dest_product_id, 0, 0)
    ON CONFLICT (store_id, product_id) DO NOTHING;

    SELECT id, quantity INTO v_dest_balance_id, v_dest_current
    FROM public.stock_balances
    WHERE store_id = p_destination_store_id AND product_id = v_dest_product_id
    FOR UPDATE;

    v_dest_current := COALESCE(v_dest_current, 0);

    UPDATE public.stock_balances
    SET quantity = v_dest_current + v_qty,
        updated_at = NOW()
    WHERE id = v_dest_balance_id;

    -- Registrar movimento de ENTRADA POR TRANSFERÊNCIA na Filial de Destino
    INSERT INTO public.stock_movements (
      store_id, product_id, batch_id, movement_type, quantity,
      previous_quantity, new_quantity, unit_cost, reference_id, reference_type,
      notes, user_id, operator_id, approved_by, approved_at
    ) VALUES (
      p_destination_store_id, v_dest_product_id, v_dest_batch_id, 'TRANSFER'::public.stock_movement_type_enum, v_qty,
      v_dest_current, v_dest_current + v_qty, v_unit_cost, v_transfer_id::TEXT, 'BRANCH_TRANSFER_IN',
      'Recebimento de remessa (' || v_transfer_number || ') enviada por: ' || v_src_store_name,
      v_operator, v_operator, v_operator, NOW()
    );

    -- Inserir item na nota de transferência
    INSERT INTO public.stock_transfer_items (
      transfer_id,
      source_product_id,
      destination_product_id,
      product_sku,
      product_name,
      unit,
      source_batch_id,
      destination_batch_id,
      lot_number,
      expiration_date,
      quantity,
      unit_cost,
      selling_price
    ) VALUES (
      v_transfer_id,
      v_src_product.id,
      v_dest_product_id,
      v_src_product.sku,
      v_src_product.name,
      COALESCE(v_src_product.unit, 'UN'),
      v_src_batch_id,
      v_dest_batch_id,
      v_lot_number,
      v_exp_date,
      v_qty,
      v_unit_cost,
      v_selling_price
    );

    v_total_items := v_total_items + 1;
    v_total_qty := v_total_qty + v_qty;
    v_total_cost := v_total_cost + (v_qty * v_unit_cost);
    v_total_selling := v_total_selling + (v_qty * v_selling_price);
  END LOOP;

  -- Atualizar totais no cabeçalho da remessa
  UPDATE public.stock_transfers
  SET total_items = v_total_items,
      total_quantity = v_total_qty,
      total_cost_value = v_total_cost,
      total_selling_value = v_total_selling
  WHERE id = v_transfer_id;

  -- Registrar auditoria na origem e no destino
  INSERT INTO public.audit_logs (
    store_id, user_id, action, entity, entity_id, after_data
  ) VALUES (
    p_source_store_id,
    v_operator,
    'STOCK_TRANSFER_SENT_TO_BRANCH',
    'stock_transfers',
    v_transfer_id::TEXT,
    jsonb_build_object(
      'transferNumber', v_transfer_number,
      'sourceStoreId', p_source_store_id,
      'destinationStoreId', p_destination_store_id,
      'destinationStoreName', v_dest_store_name,
      'totalItems', v_total_items,
      'totalQuantity', v_total_qty,
      'totalCostValue', v_total_cost
    )
  );

  RETURN v_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_stock_transfer_to_branch(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated;
