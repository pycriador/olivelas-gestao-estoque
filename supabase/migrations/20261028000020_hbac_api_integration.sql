-- =============================================================================
-- MIGRATION: 20261028000020_hbac_api_integration.sql
-- Integração Real de API REST & HBAC (Header-Based Access Control) no PostgREST
--
-- 1. Extração segura de X-HBAC-Token e X-Store-ID dos cabeçalhos HTTP PostgREST
-- 2. Hook de pré-requisição (pgrst.db_pre_request) para validação de token,
--    validade, isolamento de loja, escopos HBAC por rota/método (HTTP 401/403)
--    e atualização de last_used_at
-- 3. Função predicado RLS public.has_hbac_scope(store_id, required_scopes)
-- 4. Fechamento de vazamento em public.api_tokens para role anon
-- 5. Políticas RLS integradas com HBAC para todas as tabelas operacionais
-- 6. Trigger BEFORE INSERT em stock_movements para chamadas REST diretas
-- 7. RPC consolidada public.get_ai_report(p_report, p_store_id) para IAs externas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funções de leitura de cabeçalhos HTTP do PostgREST
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_request_hbac_token()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_headers JSONB;
  v_token TEXT;
BEGIN
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_headers IS NULL THEN
    RETURN NULL;
  END IF;

  v_token := COALESCE(
    NULLIF(BTRIM(v_headers->>'x-hbac-token'), ''),
    NULLIF(BTRIM(v_headers->>'x-api-key'), '')
  );

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_request_hbac_token() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_request_store_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_headers JSONB;
  v_raw TEXT;
BEGIN
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    IF v_headers IS NULL THEN
      RETURN NULL;
    END IF;
    v_raw := NULLIF(BTRIM(v_headers->>'x-store-id'), '');
    IF v_raw IS NULL OR LOWER(v_raw) = 'all' THEN
      RETURN NULL;
    END IF;
    RETURN v_raw::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_request_store_id() TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Predicado RLS de validação de escopo e loja para HBAC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_hbac_scope(
  check_store_id UUID,
  required_scopes TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token TEXT;
  v_req_store_id UUID;
BEGIN
  v_token := public.get_request_hbac_token();
  IF v_token IS NULL THEN
    RETURN FALSE;
  END IF;

  v_req_store_id := public.get_request_store_id();

  -- Se o cabeçalho X-Store-ID foi enviado, a linha consultada/alterada deve pertencer a essa loja
  IF v_req_store_id IS NOT NULL AND check_store_id IS NOT NULL AND v_req_store_id <> check_store_id THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.api_tokens t
    WHERE t.token = v_token
      AND t.is_active = TRUE
      AND (t.expires_at IS NULL OR t.expires_at > NOW())
      AND (t.store_id IS NULL OR check_store_id IS NULL OR t.store_id = check_store_id)
      AND (
        t.scopes ? '*'
        OR EXISTS (
          SELECT 1
          FROM unnest(required_scopes) AS req
          WHERE t.scopes ? req
        )
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_hbac_scope(UUID, TEXT[]) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Hook de pré-requisição do PostgREST (pgrst.db_pre_request)
--    Retorna 401/403 explícitos quando X-HBAC-Token é enviado com token inválido,
--    inativo, expirado, loja incompatível ou sem escopo para o recurso/método.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_hbac_pre_request()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token TEXT;
  v_req_store_id UUID;
  v_path TEXT;
  v_method TEXT;
  v_tok RECORD;
  v_required_scopes TEXT[];
  v_has_scope BOOLEAN := FALSE;
BEGIN
  v_token := public.get_request_hbac_token();

  -- Sem cabeçalho X-HBAC-Token: fluxo normal da SPA (JWT ou catálogo público)
  IF v_token IS NULL THEN
    RETURN;
  END IF;

  SELECT id, token, store_id, scopes, is_active, expires_at, last_used_at
  INTO v_tok
  FROM public.api_tokens
  WHERE token = v_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token HBAC inválido ou não encontrado.'
      USING ERRCODE = '28000',
            DETAIL = 'Verifique o cabeçalho X-HBAC-Token enviado na requisição.';
  END IF;

  IF NOT v_tok.is_active THEN
    RAISE EXCEPTION 'Token HBAC desativado.'
      USING ERRCODE = '42501',
            DETAIL = 'Ative o token no painel de Configuração de API & HBAC.';
  END IF;

  IF v_tok.expires_at IS NOT NULL AND v_tok.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Token HBAC expirado em %.', v_tok.expires_at
      USING ERRCODE = '28000',
            DETAIL = 'Renove a validade do token no painel de Configuração de API & HBAC.';
  END IF;

  v_req_store_id := public.get_request_store_id();
  IF v_req_store_id IS NOT NULL AND v_tok.store_id IS NOT NULL AND v_tok.store_id <> v_req_store_id THEN
    RAISE EXCEPTION 'Acesso negado: este token HBAC é exclusivo da loja % e não pode acessar a loja %.', v_tok.store_id, v_req_store_id
      USING ERRCODE = '42501';
  END IF;

  v_path := COALESCE(current_setting('request.path', true), '');
  v_method := UPPER(COALESCE(current_setting('request.method', true), 'GET'));

  -- Mapeamento de escopos exigidos por endpoint PostgREST e método HTTP
  CASE
    WHEN v_path LIKE '/products%' OR v_path LIKE '/product_images%' OR v_path LIKE '/categories%' OR v_path LIKE '/brands%' OR v_path LIKE '/manufacturers%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'products:read', 'products:write', 'products:delete',
          'inventory:read', 'orders:read', 'orders:write', 'purchases:read',
          'reports:read', 'reports:kpis', 'reports:valuation', 'reports:abc', 'reports:stockouts'
        ];
      ELSIF v_method = 'POST' THEN
        v_required_scopes := ARRAY['products:write'];
      ELSIF v_method IN ('PATCH', 'PUT') THEN
        v_required_scopes := ARRAY['products:write', 'products:delete'];
      ELSIF v_method = 'DELETE' THEN
        v_required_scopes := ARRAY['products:delete'];
      END IF;

    WHEN v_path LIKE '/stock_balances%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'inventory:read', 'inventory:write', 'inventory:adjust',
          'products:read', 'orders:read', 'orders:write',
          'reports:read', 'reports:kpis', 'reports:valuation', 'reports:abc', 'reports:stockouts'
        ];
      ELSE
        v_required_scopes := ARRAY['inventory:write', 'inventory:adjust'];
      END IF;

    WHEN v_path LIKE '/stock_batches%' OR v_path LIKE '/batch_dispositions%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'inventory:read', 'inventory:write', 'inventory:adjust',
          'reports:read', 'reports:kpis', 'reports:losses'
        ];
      ELSE
        v_required_scopes := ARRAY['inventory:write', 'inventory:adjust'];
      END IF;

    WHEN v_path LIKE '/stock_movements%' OR v_path LIKE '/cost_centers%' OR v_path LIKE '/loss_reasons%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'inventory:read', 'inventory:write', 'inventory:adjust',
          'reports:read', 'reports:kpis', 'reports:losses', 'reports:sales',
          'audit:read'
        ];
      ELSE
        v_required_scopes := ARRAY['inventory:write', 'inventory:adjust'];
      END IF;

    WHEN v_path LIKE '/orders%' OR v_path LIKE '/order_items%' OR v_path LIKE '/payments%' OR v_path LIKE '/shipments%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'orders:read', 'orders:write', 'orders:cancel',
          'reports:read', 'reports:kpis', 'reports:sales'
        ];
      ELSIF v_method = 'POST' THEN
        v_required_scopes := ARRAY['orders:write'];
      ELSIF v_method IN ('PATCH', 'PUT', 'DELETE') THEN
        v_required_scopes := ARRAY['orders:write', 'orders:cancel'];
      END IF;

    WHEN v_path LIKE '/purchase_orders%' OR v_path LIKE '/purchase_order_items%' OR v_path LIKE '/suppliers%' OR v_path LIKE '/supplier_contacts%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'purchases:read', 'purchases:write',
          'reports:read', 'reports:purchases'
        ];
      ELSE
        v_required_scopes := ARRAY['purchases:write'];
      END IF;

    WHEN v_path LIKE '/customers%' OR v_path LIKE '/customer_addresses%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'customers:read', 'customers:write',
          'orders:read', 'orders:write',
          'reports:read', 'reports:sales'
        ];
      ELSE
        v_required_scopes := ARRAY['customers:write', 'orders:write'];
      END IF;

    WHEN v_path LIKE '/audit_logs%' OR v_path LIKE '/notifications%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY['audit:read'];
      ELSE
        v_required_scopes := ARRAY['*'];
      END IF;

    WHEN v_path LIKE '/stores%' THEN
      IF v_method IN ('GET', 'HEAD') THEN
        v_required_scopes := ARRAY[
          'products:read', 'products:write', 'inventory:read', 'orders:read',
          'purchases:read', 'customers:read', 'reports:read', 'reports:list',
          'reports:kpis', 'reports:valuation', 'reports:abc', 'reports:stockouts',
          'reports:purchases', 'reports:losses', 'reports:sales', 'audit:read'
        ];
      ELSE
        v_required_scopes := ARRAY['*'];
      END IF;

    WHEN v_path LIKE '/rpc/get_ai_report%' THEN
      v_required_scopes := ARRAY[
        'reports:read', 'reports:list', 'reports:kpis', 'reports:valuation',
        'reports:abc', 'reports:stockouts', 'reports:purchases', 'reports:losses',
        'reports:sales', 'products:read', 'inventory:read', 'orders:read',
        'purchases:read', 'customers:read'
      ];

    ELSE
      v_required_scopes := NULL;
  END CASE;

  IF v_required_scopes IS NOT NULL THEN
    SELECT (
      v_tok.scopes ? '*'
      OR EXISTS (
        SELECT 1
        FROM unnest(v_required_scopes) AS req
        WHERE v_tok.scopes ? req
      )
    ) INTO v_has_scope;

    IF NOT COALESCE(v_has_scope, FALSE) THEN
      RAISE EXCEPTION 'Escopo HBAC insuficiente para % %.', v_method, v_path
        USING ERRCODE = '42501',
              DETAIL = format('Escopos aceitos neste recurso: %s', array_to_string(v_required_scopes, ', '));
    END IF;
  END IF;

  -- Atualiza last_used_at apenas em requisições de escrita ou quando a transação permite
  IF v_method NOT IN ('GET', 'HEAD') THEN
    BEGIN
      UPDATE public.api_tokens
      SET last_used_at = NOW()
      WHERE id = v_tok.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_hbac_pre_request() TO anon, authenticated;

ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.check_hbac_pre_request';
NOTIFY pgrst, 'reload config';

-- -----------------------------------------------------------------------------
-- 4. Fechar exposição de api_tokens para anon (impede listagem aberta de chaves)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon_read_active_tokens" ON public.api_tokens;

CREATE POLICY "anon_read_own_hbac_token_only" ON public.api_tokens
  FOR SELECT
  TO anon
  USING (
    public.get_request_hbac_token() IS NOT NULL
    AND token = public.get_request_hbac_token()
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Garantir que apenas usuários autenticados possam inserir/atualizar/excluir api_tokens
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.api_tokens FROM anon;

-- -----------------------------------------------------------------------------
-- 5. Trigger em stock_movements para chamadas REST diretas (POST /stock_movements)
--    Preenche previous_quantity / new_quantity e sincroniza stock_balances
--    quando chamado via API sem esses campos.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_before_insert_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev_qty NUMERIC(12, 3) := 0;
  v_new_qty NUMERIC(12, 3) := 0;
  v_abs_qty NUMERIC(12, 3) := 0;
BEGIN
  -- Se já veio preenchido por RPC interna (apply_stock_movement, create_order_with_stock, etc.), mantém
  IF NEW.previous_quantity IS NOT NULL AND NEW.new_quantity IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT quantity INTO v_prev_qty
  FROM public.stock_balances
  WHERE store_id = NEW.store_id
    AND product_id = NEW.product_id
  FOR UPDATE;

  IF v_prev_qty IS NULL THEN
    v_prev_qty := 0;
  END IF;

  v_abs_qty := ABS(COALESCE(NEW.quantity, 0));

  IF NEW.movement_type IN ('ENTRY', 'RETURN') THEN
    v_new_qty := v_prev_qty + v_abs_qty;
  ELSIF NEW.movement_type IN ('EXIT', 'SALE', 'LOSS', 'DAMAGE', 'EXPIRATION', 'TRANSFER') THEN
    v_new_qty := GREATEST(0, v_prev_qty - v_abs_qty);
  ELSE
    v_new_qty := GREATEST(0, v_prev_qty + COALESCE(NEW.quantity, 0));
  END IF;

  NEW.previous_quantity := v_prev_qty;
  NEW.new_quantity := v_new_qty;
  NEW.quantity := v_abs_qty;

  INSERT INTO public.stock_balances (store_id, product_id, quantity, reserved_quantity, updated_at)
  VALUES (NEW.store_id, NEW.product_id, v_new_qty, 0, NOW())
  ON CONFLICT (store_id, product_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_before_insert_stock_movement() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_api_stock_movement_sync ON public.stock_movements;
CREATE TRIGGER trg_api_stock_movement_sync
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_before_insert_stock_movement();

-- -----------------------------------------------------------------------------
-- 6. Atualização de Políticas RLS para Suporte HBAC + Isolamento por Loja
-- -----------------------------------------------------------------------------

-- 6.1. Stores: se X-HBAC-Token estiver presente, restringe à loja do token
DROP POLICY IF EXISTS "Stores select policy" ON public.stores;
DROP POLICY IF EXISTS "Stores select policy: Members or Public active catalog" ON public.stores;

CREATE POLICY "Stores select policy"
  ON public.stores FOR SELECT
  USING (
    CASE
      WHEN public.get_request_hbac_token() IS NOT NULL THEN
        public.has_hbac_scope(
          id,
          ARRAY[
            'products:read', 'products:write', 'inventory:read', 'orders:read',
            'purchases:read', 'customers:read', 'reports:read', 'reports:list',
            'reports:kpis', 'reports:valuation', 'reports:abc', 'reports:stockouts',
            'reports:purchases', 'reports:losses', 'reports:sales', 'audit:read'
          ]
        )
      ELSE
        (
          public.is_global_admin()
          OR (is_active = TRUE AND deleted_at IS NULL)
          OR EXISTS (
            SELECT 1 FROM public.store_users su
            WHERE su.store_id = stores.id AND su.user_id = auth.uid()
          )
        )
    END
  );

-- 6.2. Products: se X-HBAC-Token estiver presente, exige escopo HBAC e isola por store_id
DROP POLICY IF EXISTS "Products select policy" ON public.products;
DROP POLICY IF EXISTS "Products select: tenant member or published catalog" ON public.products;

CREATE POLICY "Products select policy"
  ON public.products FOR SELECT
  USING (
    CASE
      WHEN public.get_request_hbac_token() IS NOT NULL THEN
        public.has_hbac_scope(
          store_id,
          ARRAY[
            'products:read', 'products:write', 'products:delete',
            'inventory:read', 'orders:read', 'orders:write', 'purchases:read',
            'reports:read', 'reports:kpis', 'reports:valuation', 'reports:abc', 'reports:stockouts'
          ]
        )
      ELSE
        (
          (deleted_at IS NULL AND is_published_catalog = TRUE AND is_active = TRUE)
          OR public.has_store_access(store_id)
        )
    END
  );

DROP POLICY IF EXISTS "Products hbac insert policy" ON public.products;
CREATE POLICY "Products hbac insert policy"
  ON public.products FOR INSERT
  WITH CHECK (
    public.has_hbac_scope(store_id, ARRAY['products:write'])
  );

DROP POLICY IF EXISTS "Products hbac update policy" ON public.products;
CREATE POLICY "Products hbac update policy"
  ON public.products FOR UPDATE
  USING (
    public.has_hbac_scope(store_id, ARRAY['products:write', 'products:delete'])
  )
  WITH CHECK (
    public.has_hbac_scope(store_id, ARRAY['products:write', 'products:delete'])
  );

DROP POLICY IF EXISTS "Products hbac delete policy" ON public.products;
CREATE POLICY "Products hbac delete policy"
  ON public.products FOR DELETE
  USING (
    public.has_hbac_scope(store_id, ARRAY['products:delete'])
  );

-- 6.3. Categories, Brands, Manufacturers, Product Images
DROP POLICY IF EXISTS "Categories select policy" ON public.categories;
DROP POLICY IF EXISTS "Categories select: tenant or public" ON public.categories;

CREATE POLICY "Categories select policy"
  ON public.categories FOR SELECT
  USING (
    CASE
      WHEN public.get_request_hbac_token() IS NOT NULL THEN
        public.has_hbac_scope(
          store_id,
          ARRAY[
            'products:read', 'products:write', 'products:delete',
            'inventory:read', 'reports:read', 'reports:kpis',
            'reports:valuation', 'reports:abc', 'reports:stockouts'
          ]
        )
      ELSE
        (public.has_store_access(store_id) OR TRUE)
    END
  );

DROP POLICY IF EXISTS "Categories hbac modify policy" ON public.categories;
CREATE POLICY "Categories hbac modify policy"
  ON public.categories FOR ALL
  USING (public.has_hbac_scope(store_id, ARRAY['products:write']))
  WITH CHECK (public.has_hbac_scope(store_id, ARRAY['products:write']));

-- 6.4. Stock Balances
DROP POLICY IF EXISTS "Stock balances hbac select policy" ON public.stock_balances;
CREATE POLICY "Stock balances hbac select policy"
  ON public.stock_balances FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY[
        'inventory:read', 'inventory:write', 'inventory:adjust',
        'products:read', 'orders:read', 'orders:write',
        'reports:read', 'reports:kpis', 'reports:valuation', 'reports:abc', 'reports:stockouts'
      ]
    )
  );

DROP POLICY IF EXISTS "Stock balances hbac modify policy" ON public.stock_balances;
CREATE POLICY "Stock balances hbac modify policy"
  ON public.stock_balances FOR ALL
  USING (
    public.has_hbac_scope(store_id, ARRAY['inventory:write', 'inventory:adjust'])
  )
  WITH CHECK (
    public.has_hbac_scope(store_id, ARRAY['inventory:write', 'inventory:adjust'])
  );

-- 6.5. Stock Batches & Dispositions
DROP POLICY IF EXISTS "Stock batches hbac select policy" ON public.stock_batches;
CREATE POLICY "Stock batches hbac select policy"
  ON public.stock_batches FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY[
        'inventory:read', 'inventory:write', 'inventory:adjust',
        'reports:read', 'reports:kpis', 'reports:losses'
      ]
    )
  );

DROP POLICY IF EXISTS "Stock batches hbac modify policy" ON public.stock_batches;
CREATE POLICY "Stock batches hbac modify policy"
  ON public.stock_batches FOR ALL
  USING (
    public.has_hbac_scope(store_id, ARRAY['inventory:write', 'inventory:adjust'])
  )
  WITH CHECK (
    public.has_hbac_scope(store_id, ARRAY['inventory:write', 'inventory:adjust'])
  );

-- 6.6. Stock Movements, Cost Centers & Loss Reasons
DROP POLICY IF EXISTS "Stock movements hbac select policy" ON public.stock_movements;
CREATE POLICY "Stock movements hbac select policy"
  ON public.stock_movements FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY[
        'inventory:read', 'inventory:write', 'inventory:adjust',
        'reports:read', 'reports:kpis', 'reports:losses', 'reports:sales',
        'audit:read'
      ]
    )
  );

DROP POLICY IF EXISTS "Stock movements hbac insert policy" ON public.stock_movements;
CREATE POLICY "Stock movements hbac insert policy"
  ON public.stock_movements FOR INSERT
  WITH CHECK (
    (
      movement_type IN ('ENTRY', 'RETURN')
      AND public.has_hbac_scope(store_id, ARRAY['inventory:write'])
    )
    OR (
      movement_type IN ('LOSS', 'DAMAGE', 'EXPIRATION', 'ADJUSTMENT', 'EXIT', 'TRANSFER', 'INVENTORY_COUNT')
      AND public.has_hbac_scope(store_id, ARRAY['inventory:adjust', 'inventory:write'])
    )
  );

DROP POLICY IF EXISTS "Cost centers hbac select policy" ON public.cost_centers;
CREATE POLICY "Cost centers hbac select policy"
  ON public.cost_centers FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['inventory:read', 'inventory:write', 'inventory:adjust', 'reports:read', 'reports:losses', 'audit:read']
    )
  );

DROP POLICY IF EXISTS "Loss reasons hbac select policy" ON public.loss_reasons;
CREATE POLICY "Loss reasons hbac select policy"
  ON public.loss_reasons FOR SELECT
  USING (
    public.get_request_hbac_token() IS NOT NULL
  );

-- 6.7. Orders, Order Items, Payments & Shipments
DROP POLICY IF EXISTS "Orders hbac select policy" ON public.orders;
CREATE POLICY "Orders hbac select policy"
  ON public.orders FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['orders:read', 'orders:write', 'orders:cancel', 'reports:read', 'reports:kpis', 'reports:sales']
    )
  );

DROP POLICY IF EXISTS "Orders hbac insert policy" ON public.orders;
CREATE POLICY "Orders hbac insert policy"
  ON public.orders FOR INSERT
  WITH CHECK (
    public.has_hbac_scope(store_id, ARRAY['orders:write'])
  );

DROP POLICY IF EXISTS "Orders hbac update policy" ON public.orders;
CREATE POLICY "Orders hbac update policy"
  ON public.orders FOR UPDATE
  USING (
    public.has_hbac_scope(store_id, ARRAY['orders:write', 'orders:cancel'])
  )
  WITH CHECK (
    public.has_hbac_scope(store_id, ARRAY['orders:write'])
    OR (
      status = 'CANCELLED'::public.order_status_enum
      AND public.has_hbac_scope(store_id, ARRAY['orders:cancel'])
    )
  );

DROP POLICY IF EXISTS "Order items hbac select policy" ON public.order_items;
CREATE POLICY "Order items hbac select policy"
  ON public.order_items FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['orders:read', 'orders:write', 'orders:cancel', 'reports:read', 'reports:kpis', 'reports:sales']
    )
  );

DROP POLICY IF EXISTS "Order items hbac insert policy" ON public.order_items;
CREATE POLICY "Order items hbac insert policy"
  ON public.order_items FOR INSERT
  WITH CHECK (
    public.has_hbac_scope(store_id, ARRAY['orders:write'])
  );

DROP POLICY IF EXISTS "Payments hbac select policy" ON public.payments;
CREATE POLICY "Payments hbac select policy"
  ON public.payments FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['orders:read', 'orders:write', 'orders:cancel', 'reports:read', 'reports:sales']
    )
  );

DROP POLICY IF EXISTS "Payments hbac modify policy" ON public.payments;
CREATE POLICY "Payments hbac modify policy"
  ON public.payments FOR ALL
  USING (public.has_hbac_scope(store_id, ARRAY['orders:write']))
  WITH CHECK (public.has_hbac_scope(store_id, ARRAY['orders:write']));

-- 6.8. Purchase Orders, Items & Suppliers
DROP POLICY IF EXISTS "Purchase orders hbac select policy" ON public.purchase_orders;
CREATE POLICY "Purchase orders hbac select policy"
  ON public.purchase_orders FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['purchases:read', 'purchases:write', 'reports:read', 'reports:purchases']
    )
  );

DROP POLICY IF EXISTS "Purchase orders hbac modify policy" ON public.purchase_orders;
CREATE POLICY "Purchase orders hbac modify policy"
  ON public.purchase_orders FOR ALL
  USING (public.has_hbac_scope(store_id, ARRAY['purchases:write']))
  WITH CHECK (public.has_hbac_scope(store_id, ARRAY['purchases:write']));

DROP POLICY IF EXISTS "Purchase order items hbac select policy" ON public.purchase_order_items;
CREATE POLICY "Purchase order items hbac select policy"
  ON public.purchase_order_items FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['purchases:read', 'purchases:write', 'reports:read', 'reports:purchases']
    )
  );

DROP POLICY IF EXISTS "Purchase order items hbac modify policy" ON public.purchase_order_items;
CREATE POLICY "Purchase order items hbac modify policy"
  ON public.purchase_order_items FOR ALL
  USING (public.has_hbac_scope(store_id, ARRAY['purchases:write']))
  WITH CHECK (public.has_hbac_scope(store_id, ARRAY['purchases:write']));

DROP POLICY IF EXISTS "Suppliers hbac select policy" ON public.suppliers;
CREATE POLICY "Suppliers hbac select policy"
  ON public.suppliers FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['purchases:read', 'purchases:write', 'reports:read', 'reports:purchases']
    )
  );

DROP POLICY IF EXISTS "Suppliers hbac modify policy" ON public.suppliers;
CREATE POLICY "Suppliers hbac modify policy"
  ON public.suppliers FOR ALL
  USING (public.has_hbac_scope(store_id, ARRAY['purchases:write']))
  WITH CHECK (public.has_hbac_scope(store_id, ARRAY['purchases:write']));

-- 6.9. Customers & Addresses
DROP POLICY IF EXISTS "Customers hbac select policy" ON public.customers;
CREATE POLICY "Customers hbac select policy"
  ON public.customers FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['customers:read', 'customers:write', 'orders:read', 'orders:write', 'reports:read', 'reports:sales']
    )
  );

DROP POLICY IF EXISTS "Customers hbac modify policy" ON public.customers;
CREATE POLICY "Customers hbac modify policy"
  ON public.customers FOR ALL
  USING (public.has_hbac_scope(store_id, ARRAY['customers:write', 'orders:write']))
  WITH CHECK (public.has_hbac_scope(store_id, ARRAY['customers:write', 'orders:write']));

DROP POLICY IF EXISTS "Customer addresses hbac select policy" ON public.customer_addresses;
CREATE POLICY "Customer addresses hbac select policy"
  ON public.customer_addresses FOR SELECT
  USING (
    public.has_hbac_scope(
      store_id,
      ARRAY['customers:read', 'customers:write', 'orders:read', 'orders:write']
    )
  );

DROP POLICY IF EXISTS "Customer addresses hbac modify policy" ON public.customer_addresses;
CREATE POLICY "Customer addresses hbac modify policy"
  ON public.customer_addresses FOR ALL
  USING (public.has_hbac_scope(store_id, ARRAY['customers:write', 'orders:write']))
  WITH CHECK (public.has_hbac_scope(store_id, ARRAY['customers:write', 'orders:write']));

-- 6.10. Audit Logs & Notifications
DROP POLICY IF EXISTS "Audit logs hbac select policy" ON public.audit_logs;
CREATE POLICY "Audit logs hbac select policy"
  ON public.audit_logs FOR SELECT
  USING (
    store_id IS NOT NULL
    AND public.has_hbac_scope(store_id, ARRAY['audit:read'])
  );

DROP POLICY IF EXISTS "Notifications hbac select policy" ON public.notifications;
CREATE POLICY "Notifications hbac select policy"
  ON public.notifications FOR SELECT
  USING (
    store_id IS NOT NULL
    AND public.has_hbac_scope(store_id, ARRAY['audit:read', 'reports:read'])
  );

-- -----------------------------------------------------------------------------
-- 7. RPC Consolidada de Relatórios Analíticos para IA Externa (get_ai_report)
--    Suporta: list, kpis, valuation, abc, stockouts, demand, customers,
--    capital, purchases, losses, sales.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ai_report(
  p_report TEXT DEFAULT 'kpis',
  p_store_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id UUID;
  v_token TEXT;
  v_report TEXT := LOWER(BTRIM(COALESCE(p_report, 'kpis')));
  v_allowed BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- 1. Resolver store_id: parâmetro -> header X-Store-ID -> store_id do token
  v_store_id := COALESCE(p_store_id, public.get_request_store_id());
  v_token := public.get_request_hbac_token();

  IF v_store_id IS NULL AND v_token IS NOT NULL THEN
    SELECT t.store_id INTO v_store_id
    FROM public.api_tokens t
    WHERE t.token = v_token AND t.is_active = TRUE
    LIMIT 1;
  END IF;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Informe p_store_id ou o cabeçalho X-Store-ID para consultar relatórios.'
      USING ERRCODE = '22023';
  END IF;

  -- 2. Validar permissão (usuário autenticado da loja OU token HBAC com escopo do relatório)
  IF v_report IN ('list', 'catalog') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:list', 'reports:read', 'reports:kpis']);
  ELSIF v_report IN ('kpis', 'retail_summary_kpis') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:kpis', 'reports:read']);
  ELSIF v_report IN ('valuation', 'stock_valuation') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:valuation', 'reports:read']);
  ELSIF v_report IN ('abc', 'abc_curve_pareto') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:abc', 'reports:read']);
  ELSIF v_report IN ('stockouts', 'stockout_replenishment') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:stockouts', 'reports:read']);
  ELSIF v_report IN ('demand', 'demand_purchasing') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:stockouts', 'reports:read']);
  ELSIF v_report IN ('customers', 'customer_ticket_ltv') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['customers:read', 'reports:read']);
  ELSIF v_report IN ('capital', 'capital_investment') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:valuation', 'reports:read']);
  ELSIF v_report IN ('purchases', 'purchasing_history') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:purchases', 'purchases:read', 'reports:read']);
  ELSIF v_report IN ('losses', 'operational_losses') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:losses', 'reports:read']);
  ELSIF v_report IN ('sales', 'sales_performance') THEN
    v_allowed := public.has_store_access(v_store_id)
      OR public.has_hbac_scope(v_store_id, ARRAY['reports:sales', 'orders:read', 'reports:read']);
  ELSE
    RAISE EXCEPTION 'Relatório "%" não reconhecido. Use list, kpis, valuation, abc, stockouts, demand, customers, capital, purchases, losses ou sales.', p_report
      USING ERRCODE = '22023';
  END IF;

  IF NOT COALESCE(v_allowed, FALSE) THEN
    RAISE EXCEPTION 'Escopo HBAC insuficiente para o relatório "%".', v_report
      USING ERRCODE = '42501';
  END IF;

  -- 3. Processamento de cada relatório analítico
  IF v_report IN ('list', 'catalog') THEN
    SELECT jsonb_build_object(
      'storeId', v_store_id,
      'generatedAt', NOW(),
      'reports', jsonb_build_array(
        jsonb_build_object('id', 'retail_summary_kpis', 'alias', 'kpis', 'scope', 'reports:kpis', 'title', 'KPIs Executivos do Varejo'),
        jsonb_build_object('id', 'stock_valuation', 'alias', 'valuation', 'scope', 'reports:valuation', 'title', 'Valorização & Lucro do Estoque'),
        jsonb_build_object('id', 'abc_curve_pareto', 'alias', 'abc', 'scope', 'reports:abc', 'title', 'Curva ABC de Pareto (80/15/5)'),
        jsonb_build_object('id', 'stockout_replenishment', 'alias', 'stockouts', 'scope', 'reports:stockouts', 'title', 'Ruptura & Alerta de Reposição'),
        jsonb_build_object('id', 'demand_purchasing', 'alias', 'demand', 'scope', 'reports:read', 'title', 'Compra Baseada no Consumo (30d)'),
        jsonb_build_object('id', 'customer_ticket_ltv', 'alias', 'customers', 'scope', 'reports:read', 'title', 'Ticket Médio & LTV de Clientes'),
        jsonb_build_object('id', 'capital_investment', 'alias', 'capital', 'scope', 'reports:read', 'title', 'Capital Investido & GMROI por Categoria'),
        jsonb_build_object('id', 'purchasing_history', 'alias', 'purchases', 'scope', 'reports:purchases', 'title', 'Histórico de Compras & Fornecedores'),
        jsonb_build_object('id', 'operational_losses', 'alias', 'losses', 'scope', 'reports:losses', 'title', 'Perdas, Avarias & Baixas Operacionais'),
        jsonb_build_object('id', 'sales_performance', 'alias', 'sales', 'scope', 'reports:sales', 'title', 'Desempenho de Vendas & PDV')
      )
    ) INTO v_result;
    RETURN v_result;

  ELSIF v_report IN ('kpis', 'retail_summary_kpis') THEN
    WITH stock_cte AS (
      SELECT
        COUNT(*)::INT AS total_products,
        COALESCE(SUM(CASE WHEN sb.quantity > 0 THEN sb.quantity ELSE 0 END), 0) AS total_units,
        COALESCE(SUM(CASE WHEN sb.quantity > 0 THEN sb.quantity * p.cost_price ELSE 0 END), 0) AS total_cost,
        COALESCE(SUM(CASE WHEN sb.quantity > 0 THEN sb.quantity * p.selling_price ELSE 0 END), 0) AS total_selling,
        COUNT(*) FILTER (WHERE sb.quantity <= 0)::INT AS stockout_count,
        COUNT(*) FILTER (WHERE sb.quantity > 0 AND sb.quantity <= p.min_stock)::INT AS low_stock_count
      FROM public.stock_balances sb
      JOIN public.products p ON p.id = sb.product_id
      WHERE sb.store_id = v_store_id
        AND p.deleted_at IS NULL
    ),
    sales_cte AS (
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE), 0) AS sales_today,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0) AS sales_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::INT AS orders_month_count
      FROM public.orders
      WHERE store_id = v_store_id
        AND status <> 'CANCELLED'::public.order_status_enum
    ),
    losses_cte AS (
      SELECT
        COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)), 0) AS loss_month
      FROM public.stock_movements
      WHERE store_id = v_store_id
        AND created_at >= date_trunc('month', CURRENT_DATE)
        AND (movement_type IN ('LOSS', 'DAMAGE', 'EXPIRATION') OR reason_code IS NOT NULL)
    ),
    batches_cte AS (
      SELECT
        COUNT(*) FILTER (WHERE expiration_date < CURRENT_DATE)::INT AS expired_count,
        COUNT(*) FILTER (WHERE expiration_date >= CURRENT_DATE AND expiration_date <= CURRENT_DATE + 30)::INT AS expiring_30d_count
      FROM public.stock_batches
      WHERE store_id = v_store_id
        AND quantity > 0
        AND expiration_date IS NOT NULL
    )
    SELECT jsonb_build_object(
      'storeId', v_store_id,
      'totalProducts', s.total_products,
      'totalPhysicalUnits', ROUND(s.total_units, 3),
      'totalCostValue', ROUND(s.total_cost, 2),
      'totalSellingValue', ROUND(s.total_selling, 2),
      'potentialProfit', ROUND(GREATEST(0, s.total_selling - s.total_cost), 2),
      'marginPercent', CASE WHEN s.total_selling > 0 THEN ROUND(((s.total_selling - s.total_cost) / s.total_selling) * 100, 2) ELSE 0 END,
      'salesTodayTotal', ROUND(sl.sales_today, 2),
      'salesMonthTotal', ROUND(sl.sales_month, 2),
      'ordersMonthCount', sl.orders_month_count,
      'totalLossValueMonth', ROUND(l.loss_month, 2),
      'stockoutCount', s.stockout_count,
      'lowStockCount', s.low_stock_count,
      'expiredCount', b.expired_count,
      'expiring30dCount', b.expiring_30d_count
    )
    INTO v_result
    FROM stock_cte s, sales_cte sl, losses_cte l, batches_cte b;
    RETURN v_result;

  ELSIF v_report IN ('valuation', 'stock_valuation') THEN
    SELECT COALESCE(jsonb_agg(item_row ORDER BY (item_row->>'productName') ASC), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSku', p.sku,
        'categoryName', COALESCE(c.name, 'Sem categoria'),
        'unit', p.unit,
        'quantity', sb.quantity,
        'minStock', p.min_stock,
        'costPrice', p.cost_price,
        'sellingPrice', p.selling_price,
        'totalCostValue', ROUND(sb.quantity * p.cost_price, 2),
        'totalSellingValue', ROUND(sb.quantity * p.selling_price, 2),
        'potentialProfit', ROUND(sb.quantity * (p.selling_price - p.cost_price), 2),
        'marginPercent', CASE WHEN p.selling_price > 0 THEN ROUND(((p.selling_price - p.cost_price) / p.selling_price) * 100, 2) ELSE 0 END,
        'status', CASE
          WHEN sb.quantity <= 0 THEN 'OUT_OF_STOCK'
          WHEN sb.quantity <= p.min_stock THEN 'LOW_STOCK'
          ELSE 'NORMAL'
        END
      ) AS item_row
      FROM public.stock_balances sb
      JOIN public.products p ON p.id = sb.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      WHERE sb.store_id = v_store_id
        AND p.deleted_at IS NULL
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('abc', 'abc_curve_pareto') THEN
    SELECT COALESCE(jsonb_agg(abc_row), '[]'::jsonb)
    INTO v_result
    FROM (
      WITH base AS (
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.sku AS product_sku,
          COALESCE(c.name, 'Sem categoria') AS category_name,
          p.unit,
          sb.quantity,
          p.cost_price AS unit_cost,
          p.selling_price AS unit_selling,
          GREATEST(0, CASE WHEN (sb.quantity * p.selling_price) > 0 THEN sb.quantity * p.selling_price ELSE sb.quantity * p.cost_price END) AS total_value
        FROM public.stock_balances sb
        JOIN public.products p ON p.id = sb.product_id
        LEFT JOIN public.categories c ON c.id = p.category_id
        WHERE sb.store_id = v_store_id
          AND p.deleted_at IS NULL
      ),
      totals AS (
        SELECT
          b.*,
          SUM(b.total_value) OVER () AS grand_total,
          SUM(b.total_value) OVER (ORDER BY b.total_value DESC, b.product_name ASC) AS running_sum
        FROM base b
      )
      SELECT jsonb_build_object(
        'productId', t.product_id,
        'productName', t.product_name,
        'productSku', t.product_sku,
        'categoryName', t.category_name,
        'unit', t.unit,
        'quantity', t.quantity,
        'unitCost', t.unit_cost,
        'unitSelling', t.unit_selling,
        'totalValue', ROUND(t.total_value, 2),
        'percentOfTotal', CASE WHEN t.grand_total > 0 THEN ROUND((t.total_value / t.grand_total) * 100, 2) ELSE 0 END,
        'cumulativePercent', CASE WHEN t.grand_total > 0 THEN ROUND((t.running_sum / t.grand_total) * 100, 2) ELSE 0 END,
        'classification', CASE
          WHEN t.grand_total > 0 AND ((t.running_sum / t.grand_total) * 100 <= 80 OR ((t.running_sum - t.total_value) / t.grand_total) * 100 <= 0) THEN 'A'
          WHEN t.grand_total > 0 AND (t.running_sum / t.grand_total) * 100 <= 95 THEN 'B'
          ELSE 'C'
        END
      ) AS abc_row
      FROM totals t
      ORDER BY t.total_value DESC, t.product_name ASC
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('stockouts', 'stockout_replenishment') THEN
    SELECT COALESCE(jsonb_agg(st_row), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSku', p.sku,
        'categoryName', COALESCE(c.name, 'Sem categoria'),
        'unit', p.unit,
        'quantity', sb.quantity,
        'minStock', p.min_stock,
        'deficit', GREATEST(0, p.min_stock - sb.quantity),
        'costPrice', p.cost_price,
        'sellingPrice', p.selling_price,
        'replenishmentCost', ROUND(GREATEST(0, p.min_stock - sb.quantity) * p.cost_price, 2),
        'urgency', CASE WHEN sb.quantity <= 0 THEN 'CRITICAL' ELSE 'WARNING' END
      ) AS st_row
      FROM public.stock_balances sb
      JOIN public.products p ON p.id = sb.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      WHERE sb.store_id = v_store_id
        AND p.deleted_at IS NULL
        AND sb.quantity <= p.min_stock
      ORDER BY (CASE WHEN sb.quantity <= 0 THEN 0 ELSE 1 END), (GREATEST(0, p.min_stock - sb.quantity) * p.cost_price) DESC
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('demand', 'demand_purchasing') THEN
    SELECT COALESCE(jsonb_agg(dm_row), '[]'::jsonb)
    INTO v_result
    FROM (
      WITH sales_30d AS (
        SELECT
          product_id,
          SUM(ABS(quantity)) AS monthly_qty
        FROM public.stock_movements
        WHERE store_id = v_store_id
          AND created_at >= (NOW() - INTERVAL '30 days')
          AND movement_type IN ('SALE', 'EXIT')
        GROUP BY product_id
      ),
      calc AS (
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.sku AS product_sku,
          COALESCE(c.name, 'Sem categoria') AS category_name,
          p.unit,
          sb.quantity AS current_stock,
          p.min_stock,
          COALESCE(s.monthly_qty, 0) AS monthly_sales_qty,
          ROUND(COALESCE(s.monthly_qty, 0) / 30.0, 2) AS daily_consumption,
          CASE
            WHEN COALESCE(s.monthly_qty, 0) > 0 THEN FLOOR(sb.quantity / (s.monthly_qty / 30.0))::INT
            WHEN sb.quantity <= 0 THEN 0
            ELSE 999
          END AS coverage_days,
          GREATEST(p.min_stock, CEIL(COALESCE(s.monthly_qty, 0))) AS target_stock_30d,
          p.cost_price AS unit_cost
        FROM public.stock_balances sb
        JOIN public.products p ON p.id = sb.product_id
        LEFT JOIN public.categories c ON c.id = p.category_id
        LEFT JOIN sales_30d s ON s.product_id = p.id
        WHERE sb.store_id = v_store_id
          AND p.deleted_at IS NULL
      )
      SELECT jsonb_build_object(
        'productId', c.product_id,
        'productName', c.product_name,
        'productSku', c.product_sku,
        'categoryName', c.category_name,
        'unit', c.unit,
        'currentStock', c.current_stock,
        'minStock', c.min_stock,
        'dailyConsumption', c.daily_consumption,
        'monthlySalesQty', c.monthly_sales_qty,
        'stockCoverageDays', c.coverage_days,
        'suggestedPurchaseQty', GREATEST(0, c.target_stock_30d - c.current_stock),
        'unitCost', c.unit_cost,
        'suggestedInvestment', ROUND(GREATEST(0, c.target_stock_30d - c.current_stock) * c.unit_cost, 2),
        'urgency', CASE
          WHEN c.current_stock <= 0 OR c.coverage_days <= 7 THEN 'URGENT'
          WHEN c.coverage_days <= 15 OR c.current_stock <= c.min_stock THEN 'ATTENTION'
          WHEN c.coverage_days > 60 AND c.current_stock > (c.target_stock_30d * 2) THEN 'OVERSTOCK'
          ELSE 'NORMAL'
        END
      ) AS dm_row
      FROM calc c
      ORDER BY (CASE WHEN c.current_stock <= 0 OR c.coverage_days <= 7 THEN 0 ELSE 1 END),
               (GREATEST(0, c.target_stock_30d - c.current_stock) * c.unit_cost) DESC
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('customers', 'customer_ticket_ltv') THEN
    SELECT COALESCE(jsonb_agg(ct_row), '[]'::jsonb)
    INTO v_result
    FROM (
      WITH ord_stats AS (
        SELECT
          customer_id,
          COUNT(*)::INT AS total_orders,
          COALESCE(SUM(total_amount), 0) AS total_spent,
          MAX(created_at) AS last_order_date
        FROM public.orders
        WHERE store_id = v_store_id
          AND status <> 'CANCELLED'::public.order_status_enum
          AND customer_id IS NOT NULL
        GROUP BY customer_id
      )
      SELECT jsonb_build_object(
        'customerId', cu.id,
        'customerName', cu.name,
        'document', cu.document,
        'phone', cu.phone,
        'email', cu.email,
        'status', cu.status,
        'totalOrders', COALESCE(os.total_orders, 0),
        'totalSpent', ROUND(COALESCE(os.total_spent, 0), 2),
        'averageTicket', CASE WHEN COALESCE(os.total_orders, 0) > 0 THEN ROUND(os.total_spent / os.total_orders, 2) ELSE 0 END,
        'lastOrderDate', os.last_order_date,
        'daysSinceLastOrder', CASE WHEN os.last_order_date IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - os.last_order_date))::INT ELSE 999 END,
        'customerSegment', CASE
          WHEN COALESCE(os.total_orders, 0) >= 5 OR COALESCE(os.total_spent, 0) >= 500 THEN 'VIP'
          WHEN COALESCE(os.total_orders, 0) >= 2 AND os.last_order_date >= (NOW() - INTERVAL '45 days') THEN 'FREQUENT'
          WHEN COALESCE(os.total_orders, 0) = 0 OR os.last_order_date < (NOW() - INTERVAL '60 days') THEN 'INACTIVE'
          ELSE 'OCCASIONAL'
        END
      ) AS ct_row
      FROM public.customers cu
      LEFT JOIN ord_stats os ON os.customer_id = cu.id
      WHERE cu.store_id = v_store_id
        AND cu.deleted_at IS NULL
      ORDER BY COALESCE(os.total_spent, 0) DESC, COALESCE(os.total_orders, 0) DESC
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('capital', 'capital_investment') THEN
    SELECT COALESCE(jsonb_agg(cap_row), '[]'::jsonb)
    INTO v_result
    FROM (
      WITH cat_agg AS (
        SELECT
          COALESCE(c.name, 'Outros / Sem Categoria') AS category_name,
          COUNT(*)::INT AS products_count,
          COALESCE(SUM(sb.quantity), 0) AS total_units,
          COALESCE(SUM(sb.quantity * p.cost_price), 0) AS invested_cost,
          COALESCE(SUM(sb.quantity * p.selling_price), 0) AS selling_potential,
          COALESCE(SUM(sb.quantity * (p.selling_price - p.cost_price)), 0) AS potential_profit
        FROM public.stock_balances sb
        JOIN public.products p ON p.id = sb.product_id
        LEFT JOIN public.categories c ON c.id = p.category_id
        WHERE sb.store_id = v_store_id
          AND p.deleted_at IS NULL
        GROUP BY COALESCE(c.name, 'Outros / Sem Categoria')
      ),
      store_tot AS (
        SELECT COALESCE(SUM(invested_cost), 0) AS grand_cost FROM cat_agg
      )
      SELECT jsonb_build_object(
        'categoryName', ca.category_name,
        'productsCount', ca.products_count,
        'totalPhysicalUnits', ROUND(ca.total_units, 3),
        'totalInvestedCost', ROUND(ca.invested_cost, 2),
        'totalSellingPotential', ROUND(ca.selling_potential, 2),
        'potentialProfit', ROUND(ca.potential_profit, 2),
        'marginPercent', CASE WHEN ca.selling_potential > 0 THEN ROUND((ca.potential_profit / ca.selling_potential) * 100, 2) ELSE 0 END,
        'shareOfTotalInvestment', CASE WHEN st.grand_cost > 0 THEN ROUND((ca.invested_cost / st.grand_cost) * 100, 2) ELSE 0 END,
        'gmroi', CASE WHEN ca.invested_cost > 0 THEN ROUND(ca.potential_profit / ca.invested_cost, 2) ELSE 0 END
      ) AS cap_row
      FROM cat_agg ca, store_tot st
      ORDER BY ca.invested_cost DESC
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('purchases', 'purchasing_history') THEN
    SELECT COALESCE(jsonb_agg(po_row), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT jsonb_build_object(
        'id', po.id,
        'orderNumber', po.order_number,
        'supplierName', COALESCE(s.trade_name, s.corporate_name, 'Fornecedor Diversos'),
        'totalCost', ROUND(po.total_amount, 2),
        'status', po.status,
        'issuedAt', po.issued_at,
        'receivedAt', po.received_at,
        'createdAt', po.created_at
      ) AS po_row
      FROM public.purchase_orders po
      LEFT JOIN public.suppliers s ON s.id = po.supplier_id
      WHERE po.store_id = v_store_id
      ORDER BY po.created_at DESC
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('losses', 'operational_losses') THEN
    SELECT COALESCE(jsonb_agg(ls_row), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT jsonb_build_object(
        'id', m.id,
        'movementType', m.movement_type,
        'createdAt', m.created_at,
        'productName', COALESCE(p.name, 'Produto'),
        'productSku', COALESCE(p.sku, ''),
        'quantity', ABS(m.quantity),
        'unitCost', COALESCE(m.unit_cost, p.cost_price, 0),
        'totalLossValue', ROUND(ABS(m.quantity) * COALESCE(m.unit_cost, p.cost_price, 0), 2),
        'reasonCode', m.reason_code,
        'costCenterCode', m.cost_center_code,
        'notes', COALESCE(m.notes, m.reason_detail)
      ) AS ls_row
      FROM public.stock_movements m
      LEFT JOIN public.products p ON p.id = m.product_id
      WHERE m.store_id = v_store_id
        AND (m.movement_type IN ('LOSS', 'DAMAGE', 'EXPIRATION') OR m.reason_code IS NOT NULL)
      ORDER BY m.created_at DESC
    ) sub;
    RETURN v_result;

  ELSIF v_report IN ('sales', 'sales_performance') THEN
    SELECT COALESCE(jsonb_agg(sl_row), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT jsonb_build_object(
        'id', o.id,
        'orderNumber', o.order_number,
        'customerName', COALESCE(c.name, 'Consumidor Final'),
        'channel', o.channel,
        'subtotal', ROUND(o.subtotal, 2),
        'discountAmount', ROUND(o.discount_amount, 2),
        'totalAmount', ROUND(o.total_amount, 2),
        'status', o.status,
        'createdAt', o.created_at
      ) AS sl_row
      FROM public.orders o
      LEFT JOIN public.customers c ON c.id = o.customer_id
      WHERE o.store_id = v_store_id
      ORDER BY o.created_at DESC
    ) sub;
    RETURN v_result;
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_report(TEXT, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
